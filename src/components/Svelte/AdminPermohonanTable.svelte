<script lang="ts">
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import * as XLSX from "xlsx";
    import Table from "./Table.svelte";

    // Portal action: pindahkan node modal ke <body> agar position: fixed aman
    function portal(node: HTMLElement) {
        document.body.appendChild(node);
        return {
            destroy() {
                node.parentNode?.removeChild(node);
            },
        };
    }

    let { apiUrl = "/api/admin/permohonan", userKecamatan = "" } = $props();

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
                if (userKecamatan) params.set("kecamatan", userKecamatan);
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

    // ── Modal Export XLSX ─────────────────────────────────────
    let showExport = $state(false);
    let exportDateFrom = $state("");
    let exportDateTo = $state("");
    let exportTotal = $state<number | null>(null);
    let exportLoading = $state(false);
    let exporting = $state(false);
    let exportError = $state("");

    const exportRangeLabel = $derived.by(() => {
        const fmt = (v: string) =>
            new Date(v + "T00:00:00").toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        if (exportDateFrom && exportDateTo)
            return `${fmt(exportDateFrom)} – ${fmt(exportDateTo)}`;
        if (exportDateFrom) return `sejak ${fmt(exportDateFrom)}`;
        if (exportDateTo) return `sampai ${fmt(exportDateTo)}`;
        return "semua data";
    });

    let _exportDebounce: any;
    // Hitung jumlah data untuk rentang terpilih (preview sebelum export)
    $effect(() => {
        if (!showExport) return;
        const from = exportDateFrom;
        const to = exportDateTo;
        clearTimeout(_exportDebounce);
        _exportDebounce = setTimeout(() => {
            exportLoading = true;
            const params = new URLSearchParams({ page: "1", limit: "1" });
            if (from) params.set("dateFrom", from);
            if (to) params.set("dateTo", to);
            fetch(`/api/admin/permohonan?${params}`)
                .then((r) => r.json())
                .then((res) => {
                    exportTotal = res.pagination?.total ?? 0;
                })
                .catch(() => (exportTotal = null))
                .finally(() => (exportLoading = false));
        }, 250);
    });

    function openExportModal() {
        exportError = "";
        showExport = true;
    }
    function closeExportModal() {
        if (exporting) return;
        showExport = false;
    }

    function completionMinutes(r: any) {
        if (!r.selesaiAt || !r.submittedAt) return 0;
        return Math.max(
            0,
            Math.floor(
                (new Date(r.selesaiAt).getTime() -
                    new Date(r.submittedAt).getTime()) /
                    60000,
            ),
        );
    }

    function absoluteUploadUrl(url: string | null | undefined) {
        if (!url) return "";
        const filename = url.split("/").pop();
        if (!filename) return url;
        return `${window.location.origin}/api/upload/${filename}`;
    }

    async function runExport() {
        exportError = "";
        exporting = true;
        try {
            const params = new URLSearchParams();
            if (exportDateFrom) params.set("dateFrom", exportDateFrom);
            if (exportDateTo) params.set("dateTo", exportDateTo);
            const res = await fetch(`/api/admin/permohonan/export?${params}`);
            const json = await res.json();
            if (json.success === false)
                throw new Error(
                    json.message ?? "Gagal mengambil data export.",
                );
            const rows: any[] = json.data ?? [];

            // Sheet 1: Permohonan
            const permRows: any[][] = [
                [
                    "ID",
                    "Nama Pemohon",
                    "No HP",
                    "Layanan",
                    "Tgl Kirim",
                    "Status",
                    "Tgl Selesai",
                    "Durasi Selesai",
                    "Jumlah Dokumen",
                ],
            ];
            for (const r of rows) {
                permRows.push([
                    r.id,
                    r.applicantName,
                    r.applicantPhone,
                    r.serviceTitle,
                    r.submittedAt
                        ? new Date(r.submittedAt).toLocaleString("id-ID")
                        : "",
                    r.status,
                    r.selesaiAt
                        ? new Date(r.selesaiAt).toLocaleString("id-ID")
                        : "",
                    r.selesaiAt
                        ? formatSlaDuration(completionMinutes(r))
                        : "",
                    (r.dokumen ?? []).length,
                ]);
            }
            const wsPerm = XLSX.utils.aoa_to_sheet(permRows);
            wsPerm["!cols"] = [
                { wch: 16 },
                { wch: 24 },
                { wch: 16 },
                { wch: 28 },
                { wch: 20 },
                { wch: 10 },
                { wch: 20 },
                { wch: 14 },
                { wch: 14 },
            ];

            // Sheet 2: Dokumen (link absolut, klik-able di Excel)
            const docRows: any[][] = [
                [
                    "ID Permohonan",
                    "Nama Pemohon",
                    "Nama Dokumen",
                    "Tipe",
                    "Ukuran (KB)",
                    "Link",
                ],
            ];
            for (const r of rows) {
                for (const d of r.dokumen ?? []) {
                    docRows.push([
                        r.id,
                        r.applicantName,
                        d.nama,
                        d.tipe,
                        Math.round((d.ukuran ?? 0) / 1024),
                        absoluteUploadUrl(d.url),
                    ]);
                }
            }
            const wsDok = XLSX.utils.aoa_to_sheet(docRows);
            wsDok["!cols"] = [
                { wch: 16 },
                { wch: 24 },
                { wch: 32 },
                { wch: 12 },
                { wch: 12 },
                { wch: 48 },
            ];
            for (let i = 1; i < docRows.length; i++) {
                const addr = XLSX.utils.encode_cell({ r: i, c: 5 });
                const cell = wsDok[addr];
                if (cell?.v) cell.l = { Target: String(cell.v) };
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsPerm, "Permohonan");
            if (docRows.length > 1)
                XLSX.utils.book_append_sheet(wb, wsDok, "Dokumen");

            const from = exportDateFrom || "awal";
            const to = exportDateTo || "sekarang";
            XLSX.writeFile(wb, `permohonan_${from}_sd_${to}.xlsx`);
        } catch (e) {
            exportError = e instanceof Error ? e.message : String(e);
        } finally {
            exporting = false;
        }
    }

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

    // Badge durasi penyelesaian: hijau = jauh dari SLA, kuning = mepet SLA,
    // merah = telat (melewati SLA), abu = layanan tanpa SLA
    function completionBadge(c: any) {
        if (c.overSla === true)
            return {
                cls: "bg-red-50 text-red-600",
                icon: "mdi:clock-alert-outline",
                label: `Telat ${formatSlaDuration(c.minutes)}`,
                title: `Melewati SLA (${formatSlaDuration(c.slaMinutes)})`,
            };
        if (c.overSla === false && c.nearSla)
            return {
                cls: "bg-amber-50 text-amber-700",
                icon: "mdi:clock-outline",
                label: formatSlaDuration(c.minutes),
                title: `Mepet SLA (${formatSlaDuration(c.slaMinutes)})`,
            };
        if (c.overSla === false)
            return {
                cls: "bg-green/10 text-green",
                icon: "mdi:check-circle",
                label: formatSlaDuration(c.minutes),
                title: `Dalam SLA (${formatSlaDuration(c.slaMinutes)})`,
            };
        return {
            cls: "bg-black/5 text-ink/50",
            icon: "mdi:check-circle",
            label: formatSlaDuration(c.minutes),
            title: "Durasi sejak dikirim",
        };
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
            onclick={openExportModal}
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
            <div class="flex flex-col items-start gap-1">
                <span
                    class="status-badge {statusBadgeClass(cell.getValue())}"
                    >{cell.getValue()}</span
                >
                {#if cell.getValue() === "Selesai" &&
                    cell.row.original.completion}
                    {@const b = completionBadge(cell.row.original.completion)}
                    <span
                        class={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${b.cls}`}
                        title={b.title}
                    >
                        <Icon
                            icon={b.icon}
                            class="w-3 h-3 shrink-0"
                        />
                        {b.label}
                    </span>
                {/if}
            </div>
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

<svelte:window
    onkeydown={(e) => {
        if (e.key === "Escape" && showExport) closeExportModal();
    }}
/>

<!-- ── Modal Export XLSX ────────────────────────────────── -->
{#if showExport}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
        use:portal
        class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        onclick={(e) => e.target === e.currentTarget && closeExportModal()}
        role="dialog"
        aria-modal="true"
    >
        <div class="bg-white w-full max-w-md shadow-2xl export-modal-in">
            <!-- Header -->
            <div
                class="flex items-center justify-between px-5 py-4 border-b border-black/8"
            >
                <div>
                    <h3 class="text-sm font-bold uppercase tracking-wide">
                        Export Permohonan
                    </h3>
                    <p class="text-[11px] text-ink/40 mt-0.5">
                        Format XLSX · termasuk link dokumen pemohon
                    </p>
                </div>
                <button
                    onclick={closeExportModal}
                    class="text-ink/40 hover:text-ink transition p-1"
                    aria-label="Tutup"
                >
                    <Icon icon="mdi:close" class="w-4 h-4" />
                </button>
            </div>

            <!-- Body -->
            <div class="px-5 py-5 space-y-4">
                <div>
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-2"
                    >
                        Rentang Tanggal Kirim
                    </p>
                    <div class="flex items-center gap-1.5">
                        <input
                            type="date"
                            bind:value={exportDateFrom}
                            max={exportDateTo || undefined}
                            class="flex-1 min-w-0 border border-black/10 bg-white/50 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        />
                        <span class="text-xs text-ink/40 shrink-0">s.d.</span>
                        <input
                            type="date"
                            bind:value={exportDateTo}
                            min={exportDateFrom || undefined}
                            class="flex-1 min-w-0 border border-black/10 bg-white/50 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        />
                    </div>
                    <p class="text-[11px] text-ink/40 mt-1.5">
                        Kosongkan untuk mengekspor semua data.
                    </p>
                </div>

                <div
                    class="bg-ink/3 border border-ink/8 px-4 py-3 flex items-center gap-2.5"
                >
                    <Icon
                        icon="mdi:information-outline"
                        class="w-4 h-4 text-green shrink-0"
                    />
                    {#if exportLoading}
                        <p class="text-xs text-ink/50">Menghitung data...</p>
                    {:else if exportTotal === null}
                        <p class="text-xs text-ink/50">
                            Gagal menghitung jumlah data.
                        </p>
                    {:else}
                        <p class="text-xs text-ink/70">
                            <span class="font-bold"
                                >{exportTotal.toLocaleString("id-ID")}</span
                            >
                            permohonan akan diekspor ({exportRangeLabel})
                        </p>
                    {/if}
                </div>

                {#if exportError}
                    <p class="text-xs text-red-500">{exportError}</p>
                {/if}
            </div>

            <!-- Footer -->
            <div class="border-t border-black/8 px-5 py-4 flex gap-3">
                <button
                    onclick={closeExportModal}
                    class="flex-1 border border-black/10 text-sm font-semibold py-2.5 hover:bg-black/5 transition cursor-pointer"
                >
                    Batal
                </button>
                <button
                    onclick={runExport}
                    disabled={exporting || exportLoading || !exportTotal}
                    class="flex-1 bg-green text-white text-sm font-semibold py-2.5 hover:bg-green/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                    {#if exporting}
                        <Icon icon="mdi:loading" class="w-4 h-4 animate-spin" />
                        Menyiapkan...
                    {:else}
                        <Icon icon="mdi:download" class="w-4 h-4" />
                        Export XLSX
                    {/if}
                </button>
            </div>
        </div>
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
    .export-modal-in {
        animation: exportModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes exportModalIn {
        from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
</style>
