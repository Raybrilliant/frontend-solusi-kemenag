<script>
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import Table from "./Table.svelte";

    let { apiUrl = "/api/admin/berita", apiStatusUrl = "/api/admin/berita" } =
        $props();

    let data = $state([]);
    let loading = $state(true);
    let searchTerm = $state("");
    let statusFilter = $state("all");
    let categoryFilter = $state("all");
    let toast = $state(null);
    let limit = $state(20);
    let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
    let page = $state(1);

    const categories = ["pendidikan", "bimas", "umum", "pengumuman", "kua"];

    function showToast(type, msg) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 3500);
    }

    // ── Server-side fetch dengan debounce ────────────────
    let _debounce;

    $effect(() => {
        const q = searchTerm;
        const s = statusFilter;
        const c = categoryFilter;
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
                if (s !== "all") params.set("status", s);
                if (c !== "all") params.set("kategori", c);
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

    // ── Reset page ke 1 saat filter berubah ─────────────
    $effect(() => {
        searchTerm;
        statusFilter;
        categoryFilter;
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
        col.accessor("judul", { header: "Judul", enableSorting: true }),
        col.accessor("kategori", { header: "Kategori", enableSorting: true }),
        col.accessor("status", { header: "Status", enableSorting: true }),
        col.accessor("views", { header: "Views", enableSorting: true }),
        col.accessor("publishedAt", { header: "Publish", enableSorting: true }),
        col.accessor("updatedAt", {
            header: "Update Terakhir",
            enableSorting: true,
        }),
        col.display({
            id: "_aksi",
            header: "Aksi",
            enableSorting: false,
            size: 170,
        }),
    ];

    function formatDate(value) {
        if (!value) return "Belum";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "Belum";
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(d);
    }
    function statusClass(s) {
        if (s === "published") return "bg-green/12 text-green";
        if (s === "archived") return "bg-amber-100 text-amber-700";
        return "bg-black/6 text-ink/55";
    }
    function categoryClass(k) {
        if (k === "pengumuman") return "bg-sky-100 text-sky-700";
        if (k === "pendidikan") return "bg-fuchsia-100 text-fuchsia-700";
        if (k === "umum") return "bg-ink/5 text-ink/50";
        if (k === "bimas") return "bg-blue-100 text-blue-700";
        if (k === "informasi") return "bg-amber-100 text-amber-700";
        return "bg-green/12 text-green";
    }

    async function handleDelete(row) {
        if (!confirm(`Hapus berita "${row.judul}"?`)) return;
        const res = await fetch(`${apiUrl}/${row.id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success === false) {
            showToast("error", json.message ?? "Gagal menghapus berita.");
            return;
        }
        data = data.filter((i) => i.id !== row.id);
        showToast("success", "Berita berhasil dihapus.");
        if (data.length === 0 && page > 1) page = page - 1;
    }

    async function handleStatus(row, nextStatus) {
        const label =
            nextStatus === "published"
                ? "publish"
                : nextStatus === "archived"
                  ? "arsipkan"
                  : "jadikan draft";
        if (!confirm(`Yakin ingin ${label} "${row.judul}"?`)) return;
        const res = await fetch(`${apiStatusUrl}/${row.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
        });
        const json = await res.json();
        if (json.success === false) {
            showToast("error", json.message ?? "Gagal mengubah status.");
            return;
        }
        const next = json.data ?? {};
        data = data.map((i) =>
            i.id === row.id ? { ...i, ...next, status: nextStatus } : i,
        );
        showToast("success", `Status berita diperbarui menjadi ${nextStatus}.`);
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
            placeholder="Cari judul, slug, ringkasan..."
            class="border bg-white/50 border-black/10 rounded py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors w-72"
            bind:value={searchTerm}
        />
        <select
            bind:value={statusFilter}
            class="border bg-white/50 border-black/10 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
        >
            <option value="all">Semua status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
        </select>
        <select
            bind:value={categoryFilter}
            class="border bg-white/50 border-black/10 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
        >
            <option value="all">Semua kategori</option>
            {#each categories as k}<option value={k}>{k}</option>{/each}
        </select>
    </div>
    <a
        href="/admin/berita/tambah"
        class="flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold border border-black/10 transition-colors hover:bg-green/90"
        ><Icon icon="mdi:plus" class="w-3.5 h-3.5" />Tambah Berita</a
    >
</div>

<!-- ── Row info ─────────────────────────────────────────── -->
{#if rowInfo}
    <p class="text-xs text-ink/40 mb-3">{rowInfo}</p>
{/if}

<!-- ── Table ──────────────────────────────────────────── -->
<Table {data} {columns} {loading} class="bg-white">
    {#snippet renderCell(cell)}
        {#if cell.column.id === "id"}
            <span class="font-mono text-xs font-bold text-ink/60"
                >#{cell.getValue()}</span
            >
        {:else if cell.column.id === "judul"}
            {@const row = cell.row.original}
            <div class="min-w-0">
                <p class="font-semibold text-ink text-sm leading-tight">
                    {row.judul}
                </p>
                <p class="text-xs text-ink/35 mt-1 truncate">/{row.slug}</p>
                <p class="text-xs text-ink/45 mt-1 line-clamp-2 max-w-sm">
                    {row.ringkasan}
                </p>
            </div>
        {:else if cell.column.id === "kategori"}
            <span
                class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize {categoryClass(
                    cell.getValue(),
                )}">{cell.getValue()}</span
            >
        {:else if cell.column.id === "status"}
            <span
                class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize {statusClass(
                    cell.getValue(),
                )}">{cell.getValue()}</span
            >
        {:else if cell.column.id === "views"}
            <span class="text-sm text-ink/65"
                >{Number(cell.getValue() ?? 0).toLocaleString("id-ID")}</span
            >
        {:else if cell.column.id === "publishedAt" || cell.column.id === "updatedAt"}
            <span class="text-xs text-ink/55"
                >{formatDate(cell.getValue())}</span
            >
        {:else if cell.column.id === "_aksi"}
            {@const row = cell.row.original}
            <div class="flex items-center gap-1">
                <a
                    href={`/admin/berita/edit?id=${row.id}`}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                    aria-label="Edit"
                    ><Icon icon="mdi:pencil" class="w-3.5 h-3.5" /></a
                >
                {#if row.status !== "published"}
                    <button
                        onclick={() => handleStatus(row, "published")}
                        class="w-7 h-7 flex items-center justify-center rounded-lg border border-green/20 hover:bg-green/10 text-green/60 hover:text-green transition-colors cursor-pointer"
                        aria-label="Publish"
                        ><Icon icon="mdi:eye" class="w-3.5 h-3.5" /></button
                    >
                {:else}
                    <button
                        onclick={() => handleStatus(row, "archived")}
                        class="w-7 h-7 flex items-center justify-center rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors cursor-pointer"
                        aria-label="Arsipkan"
                        ><Icon icon="mdi:archive" class="w-3.5 h-3.5" /></button
                    >
                {/if}
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
