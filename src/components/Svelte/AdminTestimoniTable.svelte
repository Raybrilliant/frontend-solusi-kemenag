<script>
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import Table from "./Table.svelte";

    let { apiUrl = "/api/admin/testimoni" } = $props();

    let data = $state([]);
    let loading = $state(true);
    let searchTerm = $state("");
    let toast = $state(null);
    let limit = $state(20);
    let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
    let page = $state(1);

    function showToast(type, msg) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 3500);
    }

    // ── Server-side fetch dengan debounce ─────────────────
    let _debounce;

    $effect(() => {
        const q = searchTerm;
        const p = page;
        clearTimeout(_debounce);
        _debounce = setTimeout(
            () => {
                loading = true;
                const params = new URLSearchParams({
                    page: String(p),
                    limit: String(limit),
                });
                if (q.trim()) params.set("q", q.trim());
                fetch(`${apiUrl}?${params}`)
                    .then((r) => r.json())
                    .then((res) => {
                        data = Array.isArray(res) ? res : (res.data ?? []);
                        if (res.pagination) {
                            pagination = res.pagination;
                            limit = res.pagination.limit;
                        }
                        loading = false;
                    })
                    .catch(() => {
                        data = [];
                        loading = false;
                    });
            },
            q.trim() ? 300 : 0,
        );
        return () => clearTimeout(_debounce);
    });

    // ── Reset page ke 1 saat search berubah ────────────────
    $effect(() => {
        searchTerm;
        page = 1;
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

    const col = createColumnHelper();
    const columns = [
        col.accessor("id", { header: "ID", enableSorting: true, size: 64 }),
        col.accessor("url", { header: "URL", enableSorting: true }),
        col.accessor("title", { header: "Judul", enableSorting: true }),
        col.accessor("username", { header: "Username", enableSorting: true }),
        col.accessor("urutan", {
            header: "Urutan",
            enableSorting: true,
            size: 90,
        }),
        col.accessor("aktif", {
            header: "Aktif",
            enableSorting: true,
            size: 80,
        }),
        col.accessor("updatedAt", {
            header: "Update Terakhir",
            enableSorting: true,
        }),
        col.display({
            id: "_aksi",
            header: "Aksi",
            enableSorting: false,
            size: 120,
        }),
    ];

    function formatDate(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "-";
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(d);
    }

    function truncateUrl(url, max = 48) {
        if (!url) return "-";
        return url.length > max ? `${url.slice(0, max)}…` : url;
    }

    async function handleDelete(row) {
        if (!confirm(`Hapus testimoni "${row.title}"?`)) return;
        const res = await fetch(`${apiUrl}/${row.id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success === false) {
            showToast("error", json.message ?? "Gagal menghapus testimoni.");
            return;
        }
        data = data.filter((i) => i.id !== row.id);
        showToast("success", "Testimoni berhasil dihapus.");
        if (data.length === 0 && page > 1) page = page - 1;
    }

    async function handleToggleAktif(row) {
        const next = !row.aktif;
        const label = next ? "mengaktifkan" : "menonaktifkan";
        if (!confirm(`Yakin ingin ${label} "${row.title}"?`)) return;
        const res = await fetch(`${apiUrl}/${row.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aktif: next }),
        });
        const json = await res.json();
        if (json.success === false) {
            showToast("error", json.message ?? "Gagal mengubah status.");
            return;
        }
        data = data.map((i) =>
            i.id === row.id ? { ...i, aktif: next } : i,
        );
        showToast("success", `Testimoni ${next ? "diaktifkan" : "dinonaktifkan"}.`);
    }
</script>

{#if toast}
    <div
        class={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm rounded ${toast.type === "success" ? "bg-green text-white" : "bg-red-600 text-white"}`}
    >
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-colors cursor-pointer"
            ><Icon icon="mdi:close" width="16" height="16" /></button
        >
    </div>
{/if}

<!-- ── Toolbar ─────────────────────────────────────────── -->
<div class="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div class="flex flex-wrap items-center gap-2">
        <input
            type="text"
            placeholder="Cari judul, username, atau URL..."
            class="border bg-white/50 border-black/10 rounded py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors w-72"
            bind:value={searchTerm}
        />
    </div>
    <a
        href="/admin/testimoni/tambah"
        class="flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold border border-black/10 transition-colors hover:bg-green/90"
        ><Icon icon="mdi:plus" class="w-3.5 h-3.5" />Tambah Testimoni</a
    >
</div>

<!-- ── Row info ─────────────────────────────────────────── -->
{#if rowInfo}
    <p class="text-xs text-ink/40 mb-3">{rowInfo}</p>
{/if}

<!-- ── Table ──────────────────────────────────────────── -->
<Table {data} {columns} {loading} disablePagination class="bg-white">
    {#snippet renderCell(cell)}
        {#if cell.column.id === "id"}
            <span class="font-mono text-xs font-bold text-ink/60"
                >#{cell.getValue()}</span
            >
        {:else if cell.column.id === "url"}
            {@const row = cell.row.original}
            <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-green hover:underline break-all"
                title={row.url}
            >
                {truncateUrl(row.url)}
            </a>
        {:else if cell.column.id === "title"}
            <span class="text-sm text-ink font-medium">{cell.getValue()}</span>
        {:else if cell.column.id === "username"}
            <span class="text-xs text-ink/65">@{cell.getValue()}</span>
        {:else if cell.column.id === "urutan"}
            <span class="text-sm text-ink/65">{cell.getValue()}</span>
        {:else if cell.column.id === "aktif"}
            {@const active = cell.getValue()}
            <span
                class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold {active
                    ? 'bg-green/12 text-green'
                    : 'bg-ink/5 text-ink/45'}"
            >
                {active ? "Aktif" : "Nonaktif"}
            </span>
        {:else if cell.column.id === "updatedAt"}
            <span class="text-xs text-ink/55">{formatDate(cell.getValue())}</span>
        {:else if cell.column.id === "_aksi"}
            {@const row = cell.row.original}
            <div class="flex items-center gap-1">
                <a
                    href={`/admin/testimoni/${row.id}`}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                    aria-label="Edit"
                    ><Icon icon="mdi:pencil" class="w-3.5 h-3.5" /></a
                >
                <button
                    onclick={() => handleToggleAktif(row)}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors cursor-pointer"
                    aria-label={row.aktif ? "Nonaktifkan" : "Aktifkan"}
                    ><Icon
                        icon={row.aktif ? "mdi:eye-off" : "mdi:eye"}
                        class="w-3.5 h-3.5"
                    /></button
                >
                <button
                    onclick={() => handleDelete(row)}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/50 hover:text-red-500 transition-colors cursor-pointer"
                    aria-label="Hapus"
                    ><Icon icon="mdi:delete" class="w-3.5 h-3.5" /></button
                >
            </div>
        {/if}
    {/snippet}
</Table>

<!-- ── Pagination ───────────────────────────────────────── -->
{#if pagination.totalPages > 1}
    <div class="flex items-center gap-2 mt-4 mb-4">
        <button
            onclick={() => {
                page = Math.max(1, page - 1);
            }}
            disabled={page === 1}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors cursor-pointer"
            >← Prev</button
        >
        <span class="text-xs text-ink/50"
            >Halaman {page} / {pagination.totalPages}</span
        >
        <button
            onclick={() => {
                page = Math.min(pagination.totalPages, page + 1);
            }}
            disabled={page === pagination.totalPages}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors cursor-pointer"
            >Next →</button
        >
    </div>
{/if}
