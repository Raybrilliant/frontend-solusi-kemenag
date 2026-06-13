<script>
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import Table from "./Table.svelte";

    let { apiUrl = "/api/admin/kategori" } = $props();

    // ── State ────────────────────────────────────────────
    let data = $state([]);
    let loading = $state(true);
    let selected = $state([]);
    let searchTerm = $state("");
    let limit = $state(20);
    let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
    let page = $state(1);

    // ── Server-side fetch dengan debounce ────────────────
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
                        loading = false;
                    });
            },
            q.trim() ? 300 : 0,
        );
        return () => clearTimeout(_debounce);
    });

    // ── Reset page ke 1 saat search berubah ─────────────
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

    // ── Columns ──────────────────────────────────────────
    const col = createColumnHelper();
    const columns = [
        col.accessor("id", { header: "ID", enableSorting: true, size: 60 }),
        col.accessor("icon", {
            header: "Ikon",
            enableSorting: false,
            size: 70,
        }),
        col.accessor("title", { header: "Judul", enableSorting: true }),
        col.accessor("description", {
            header: "Deskripsi",
            enableSorting: true,
        }),
        col.display({
            id: "_aksi",
            header: "Aksi",
            enableSorting: false,
            size: 120,
        }),
    ];

    // ── Helpers ──────────────────────────────────────────
    async function handleDelete(row) {
        if (!confirm(`Hapus kategori "${row.title}"?`)) return;
        await fetch(`${apiUrl}/${row.id}`, { method: "DELETE" });
        data = data.filter((d) => d.id !== row.id);
        selected = selected.filter((s) => s.id !== row.id);
        if (data.length === 0 && page > 1) page = page - 1;
    }

    function deleteSelected() {
        if (!confirm(`Hapus ${selected.length} kategori terpilih?`)) return;
        Promise.all(
            selected.map((r) =>
                fetch(`${apiUrl}/${r.id}`, { method: "DELETE" }),
            ),
        ).then(() => {
            const ids = new Set(selected.map((r) => r.id));
            data = data.filter((d) => !ids.has(d.id));
            selected = [];
            if (data.length === 0 && page > 1) page = page - 1;
        });
    }

    function quoteCSV(v) {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? '"' + s.replace(/"/g, '""') + '"'
            : s;
    }
    function toCSV(rows) {
        const headers = ["ID", "Ikon", "Judul", "Deskripsi"];
        const body = rows.map((r) =>
            [r.id, r.icon, r.title, r.description].map(quoteCSV),
        );
        return [headers, ...body].map((r) => r.join(",")).join("\n");
    }
    function downloadCSV(filename, rows) {
        const csv = toCSV(rows);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv]));
        a.download = filename;
        a.click();
    }
    function exportCSV() {
        downloadCSV("kategori.csv", data);
    }
    function exportSelected() {
        downloadCSV("kategori-selected.csv", selected);
    }
</script>

<!-- ── Toolbar ─────────────────────────────────────────── -->
<div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
        <input
            type="text"
            placeholder="Cari kategori..."
            class="border bg-white/50 border-black/10 rounded py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors w-56"
            bind:value={searchTerm}
        />
    </div>
    <div class="flex items-center gap-2">
        <button
            onclick={exportCSV}
            class="flex items-center gap-1.5 px-3 py-2 bg-ink/5 text-ink/60 text-xs font-semibold border border-black/10 hover:bg-ink/10 transition-colors cursor-pointer"
            ><Icon icon="mdi:download" class="w-3.5 h-3.5" />Export</button
        >
        <a
            href="/admin/kategori/tambah"
            class="flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold border border-black/10 transition-colors hover:bg-green/90"
            ><Icon icon="mdi:plus" class="w-3.5 h-3.5" />Tambah</a
        >
    </div>
</div>

<!-- ── Row info ─────────────────────────────────────────── -->
{#if rowInfo}
    <p class="text-xs text-ink/40 mb-3">{rowInfo}</p>
{/if}

<!-- ── Table ──────────────────────────────────────────── -->
<Table
    {data}
    {columns}
    {loading}
    disablePagination
    enableSelection
    onSelectionChange={(rows) => (selected = rows)}
    class="bg-white"
>
    {#snippet renderCell(cell)}
        {#if cell.column.id === "id"}
            <span class="font-mono text-xs font-bold text-ink/60"
                >{cell.getValue()}</span
            >
        {:else if cell.column.id === "icon"}
            {@const icon = cell.getValue()}
            {#if icon}<Icon {icon} class="w-6 h-6 object-contain" />{:else}<span
                    class="text-xs text-ink/30">–</span
                >{/if}
        {:else if cell.column.id === "title"}
            <p class="font-semibold text-ink text-sm leading-tight">
                {cell.getValue()}
            </p>
        {:else if cell.column.id === "description"}
            <p class="text-sm text-ink/60 line-clamp-2 max-w-xs">
                {cell.getValue()}
            </p>
        {:else if cell.column.id === "_aksi"}
            {@const row = cell.row.original}
            <div class="flex items-center gap-1">
                <a
                    href={`/admin/kategori/edit?id=${row.id}`}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                    aria-label="Edit"
                    ><Icon icon="mdi:pencil" class="w-3.5 h-3.5" /></a
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
    <div class="flex items-center gap-2 mt-4">
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

<!-- ── Bulk action bar ─────────────────────────────────── -->
{#if selected.length > 0}
    <div
        class="flex items-center gap-3 mt-4 px-4 py-3 bg-black/5 border border-black/10 rounded"
    >
        <span class="text-xs font-semibold text-ink/70"
            >{selected.length} terpilih</span
        >
        <button
            onclick={exportSelected}
            class="text-xs font-semibold text-ink/50 hover:text-ink transition-colors cursor-pointer"
            >Export terpilih</button
        >
        <button
            onclick={deleteSelected}
            class="ml-auto text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >Hapus terpilih</button
        >
    </div>
{/if}
