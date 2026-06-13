<script lang="ts">
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import Table from "./Table.svelte";

    let { apiUrl = "/api/admin/permohonan" } = $props();

    let data = $state<any[]>([]);
    let loading = $state(true);
    let activeTab = $state("Diproses");
    let selected = $state<any[]>([]);
    let searchTerm = $state("");
    let limit = $state(20);
    let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
    let page = $state(1);

    // Stats dari dashboard (fetch sekali)
    let dashboardStats = $state({
        total: 0,
        diterima: 0,
        diproses: 0,
        selesai: 0,
        ditolak: 0,
    });

    // ── Row range helper ─────────────────────────────────
    const rowInfo = $derived.by(() => {
        if (pagination.total === 0) return "";
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(
            pagination.page * pagination.limit,
            pagination.total,
        );
        return `Menampilkan ${start}–${end} dari ${pagination.total}`;
    });

    $effect(() => {
        fetch("/api/admin/dashboard/stats")
            .then((r) => r.json())
            .then((res) => {
                const d = res.data ?? res;
                dashboardStats.total = d?.total ?? 0;
                dashboardStats.diterima = d.Diterima ?? d.diterima ?? 0;
                dashboardStats.diproses = d.Diproses ?? d.diproses ?? 0;
                dashboardStats.selesai = d.Selesai ?? d.selesai ?? 0;
                dashboardStats.ditolak = d.Ditolak ?? d.ditolak ?? 0;
            })
            .catch((e) => console.error("Gagal fetch dashboard stats:", e));
    });

    // Reset halaman ke 1 saat tab atau search berubah
    $effect(() => {
        activeTab;
        searchTerm;
        page = 1;
    });

    let _debounce: any;

    $effect(() => {
        const tab = activeTab;
        const q = searchTerm;
        const p = page;
        clearTimeout(_debounce);
        _debounce = setTimeout(
            () => {
                loading = true;
                const params = new URLSearchParams();
                params.set("page", String(p));
                params.set("limit", String(limit));
                if (tab !== "semua") params.set("status", tab);
                if (q.trim()) params.set("q", q.trim());
                fetch(`${apiUrl}?${params}`)
                    .then((r) => r.json())
                    .then((res) => {
                        data = res.data ?? [];
                        if (res.pagination) {
                            pagination = res.pagination;
                            limit = res.pagination.limit;
                        }
                        loading = false;
                    })
                    .catch(() => {
                        loading = false;
                    });
            },
            q.trim() ? 300 : 0,
        );
        return () => clearTimeout(_debounce);
    });

    let deleting = $state(false);

    async function deleteSelected() {
        if (!selected.length) return;
        const ids = selected.map((r) => r.id);
        const confirmed = window.confirm(
            `Hapus ${ids.length} permohonan yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
        );
        if (!confirmed) return;

        deleting = true;
        try {
            await Promise.all(
                ids.map((id) =>
                    fetch(`/api/admin/permohonan/${id}`, { method: "DELETE" }),
                ),
            );
            data = data.filter((row) => !ids.includes(row.id));
            selected = [];
        } finally {
            deleting = false;
        }
    }

    const tabCount = $derived({
        semua: dashboardStats.total,
        Diterima: dashboardStats.diterima,
        Diproses: dashboardStats.diproses,
        Selesai: dashboardStats.selesai,
        Ditolak: dashboardStats.ditolak,
    });

    const col = createColumnHelper<any>();
    const columns = [
        col.accessor("id", { header: "ID Permohonan", enableSorting: true }),
        col.accessor("applicantName", {
            header: "Nama Pemohon",
            enableSorting: true,
        }),
        col.accessor("serviceTitle", {
            header: "Layanan",
            enableSorting: true,
        }),
        col.accessor("submittedAt", {
            header: "Tgl. Kirim",
            enableSorting: true,
        }),
        col.accessor("status", { header: "Status", enableSorting: true }),
        col.accessor("slaRemaining", { header: "SLA", enableSorting: true }),
        col.display({ id: "_aksi", header: "Aksi", enableSorting: false }),
    ];

    function formatDate(iso: string) {
        if (!iso) return "-";
        return new Date(iso).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }
    function formatTime(iso: string) {
        if (!iso) return "";
        return (
            new Date(iso).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
            }) + " WIB"
        );
    }
    function statusBadgeClass(status: string) {
        const map: Record<string, string> = {
            Diterima: "badge-diterima",
            Diproses: "badge-proses",
            Selesai: "badge-selesai",
            Ditolak: "badge-ditolak",
        };
        return map[status] ?? "badge-default";
    }

    function formatSlaDuration(totalMinutes: number) {
        if (totalMinutes < 60) return `${totalMinutes}m`;

        const d = Math.floor(totalMinutes / 1440);
        const h = Math.floor((totalMinutes % 1440) / 60);
        const m = totalMinutes % 60;
        const parts = [];

        if (d > 0) parts.push(`${d}h`);
        if (h > 0) parts.push(`${h}j`);
        if (m > 0) parts.push(`${m}m`);

        return parts.join(" ");
    }

    function exportCSV() {
        const headers = [
            "ID",
            "Nama",
            "No HP",
            "Layanan",
            "Tgl Kirim",
            "Status",
        ];
        const body = data.map((r: any) => [
            r.id,
            r.applicantName,
            r.applicantPhone,
            r.serviceTitle,
            r.submittedAt ? formatDate(r.submittedAt) : "",
            r.status,
        ]);
        const csv = [headers, ...body].map((r: any) => r.join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `permohonan-${activeTab}.csv`;
        a.click();
    }

    const tabs = [
        { key: "semua", label: "Semua" },
        { key: "Diterima", label: "Diterima" },
        { key: "Diproses", label: "Diproses" },
        { key: "Selesai", label: "Selesai" },
        { key: "Ditolak", label: "Ditolak" },
    ];
</script>

<div class="flex items-end justify-between border-b border-black/8">
    <div class="flex gap-0">
        {#each tabs as tab}
            <button
                onclick={() => (activeTab = tab.key)}
                class="tab-btn px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer
                {activeTab === tab.key
                    ? 'border-green text-green'
                    : 'border-transparent text-ink/50 hover:text-ink/80'}"
            >
                {tab.label}
                <span
                    class="text-[11px] font-bold px-1.5 py-0.5 rounded-md leading-none
                {activeTab === tab.key
                        ? 'bg-green text-white'
                        : 'bg-black/8 text-ink/50'}"
                >
                    {(
                        tabCount[tab.key as keyof typeof tabCount] ?? 0
                    ).toLocaleString("id-ID")}
                </span>
            </button>
        {/each}
    </div>
    <div class="flex items-center gap-2 pb-3">
        <input
            type="text"
            placeholder="Cari permohonan..."
            bind:value={searchTerm}
            class="border bg-white/50 border-black/10 rounded py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
        />
        <button
            onclick={exportCSV}
            class="flex items-center gap-2 px-4 py-2 bg-green text-white text-sm font-semibold transition-colors cursor-pointer"
        >
            <Icon icon="mdi:download" class="w-4 h-4" /> Export
        </button>
    </div>
</div>

<!-- ── Row info ─────────────────────────────────────────── -->
{#if rowInfo}
    <p class="text-xs text-ink/40 mb-3">{rowInfo}</p>
{/if}

<Table
    {data}
    {columns}
    {loading}
    disablePagination
    enableSelection
    onSelectionChange={(rows: any[]) => (selected = rows)}
    class="bg-white"
>
    {#snippet renderCell(cell: any)}
        {#if cell.column.id === "id"}
            <p class="font-mono text-xs font-bold text-ink leading-tight">
                {cell.getValue()}
            </p>
        {:else if cell.column.id === "applicantName"}
            <div>
                <p class="font-semibold text-ink text-sm leading-tight">
                    {cell.getValue()}
                </p>
                <p class="text-[11px] text-ink/40 mt-0.5">
                    {cell.row.original.applicantPhone}
                </p>
            </div>
        {:else if cell.column.id === "submittedAt"}
            <div>
                <p class="text-sm text-ink leading-tight">
                    {formatDate(cell.getValue())}
                </p>
                <p class="text-[11px] text-ink/40 mt-0.5">
                    {formatTime(cell.getValue())}
                </p>
            </div>
        {:else if cell.column.id === "status"}
            <span class="status-badge {statusBadgeClass(cell.getValue())}"
                >{cell.getValue()}</span
            >
        {:else if cell.column.id === "slaRemaining"}
            {@const sla = cell.getValue()}
            {#if sla === null || sla === undefined}
                <span class="text-xs text-ink/30">–</span>
            {:else if sla <= 0}
                <div class="flex items-center gap-1 text-red-500">
                    <Icon icon="mdi:alert" class="w-3.5 h-3.5 shrink-0" /><span
                        class="text-xs font-semibold">Telat</span
                    >
                </div>
            {:else if sla <= 15}
                <div class="flex items-center gap-1 text-red-500">
                    <Icon
                        icon="mdi:clock-outline"
                        class="w-3.5 h-3.5 shrink-0"
                    /><span class="text-xs font-semibold">{sla}m</span>
                </div>
            {:else if sla <= 30}
                <div class="flex items-center gap-1 text-amber-500">
                    <Icon
                        icon="mdi:clock-outline"
                        class="w-3.5 h-3.5 shrink-0"
                    /><span class="text-xs font-semibold">{sla}m</span>
                </div>
            {:else if sla < 60}
                <div class="flex items-center gap-1 text-ink/55">
                    <Icon
                        icon="mdi:clock-outline"
                        class="w-3.5 h-3.5 shrink-0"
                    /><span class="text-xs font-semibold">{sla}m</span>
                </div>
            {:else}
                <div class="flex items-center gap-1 text-ink/55">
                    <Icon
                        icon="mdi:clock-outline"
                        class="w-3.5 h-3.5 shrink-0"
                    /><span class="text-xs font-semibold"
                        >{formatSlaDuration(sla)}</span
                    >
                </div>
            {/if}
        {:else if cell.column.id === "_aksi"}
            <a
                href={`/admin/permohonan/${cell.row.original.id}`}
                class="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                aria-label="Lihat detail"
            >
                <Icon icon="mdi:eye" class="w-3.5 h-3.5" />
            </a>
        {:else}
            <span class="text-sm text-ink/80">{cell.getValue()}</span>
        {/if}
    {/snippet}
</Table>

<!-- ── Pagination ───────────────────────────────────────── -->
{#if pagination.totalPages > 1}
    <div class="flex items-center gap-2 mt-4">
        <button
            onclick={() => {
                page = Math.max(1, page - 1);
            }}
            disabled={page === 1}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors cursor-pointer"
        >
            ← Prev
        </button>
        <span class="text-xs text-ink/50"
            >Halaman {page} / {pagination.totalPages}</span
        >
        <button
            onclick={() => {
                page = Math.min(pagination.totalPages, page + 1);
            }}
            disabled={page === pagination.totalPages}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors cursor-pointer"
        >
            Next →
        </button>
    </div>
{/if}

{#if selected.length > 0}
    <div
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-ink text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold"
    >
        <span>{selected.length} dipilih</span>
        <div class="w-px h-4 bg-white/20"></div>
        <button
            onclick={() => {}}
            class="hover:text-white/70 transition-colors cursor-pointer"
            >Ekspor</button
        >
        <button
            onclick={deleteSelected}
            disabled={deleting}
            class="hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
            >{deleting ? "Menghapus..." : "Hapus"}</button
        >
        <button
            onclick={() => (selected = [])}
            class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup"
        >
            <Icon icon="mdi:close" class="w-4 h-4" />
        </button>
    </div>
{/if}

<style>
    .status-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
    }
    .badge-diterima {
        background: #dbeafe;
        color: #1e40af;
    }
    .badge-proses {
        background: #fef3c7;
        color: #92400e;
    }
    .badge-selesai {
        background: #d1fae5;
        color: #065f46;
    }
    .badge-ditolak {
        background: #fee2e2;
        color: #991b1b;
    }
    .badge-default {
        background: #f3f4f6;
        color: #374151;
    }
    .tab-btn {
        background: none;
        border: none;
        cursor: pointer;
    }
</style>
