<script lang="ts">
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import Table from "./Table.svelte";

    let { apiUrl = "/api/admin/layanan", apiKategori = "/api/admin/kategori" } =
        $props();

    // ── State ────────────────────────────────────────────
    let data = $state<any[]>([]);
    let kategoriList = $state<any[]>([]);
    let loading = $state(true);
    let selected = $state<any[]>([]);
    let searchTerm = $state("");

    // ── Fetch data & kategori ────────────────────────────
    $effect(() => {
        loading = true;
        Promise.all([
            fetch(apiUrl).then((r) => r.json()),
            fetch(apiKategori).then((r) => r.json()),
        ])
            .then(([layananData, katData]) => {
                data = Array.isArray(layananData)
                    ? layananData
                    : (layananData.data ?? []);
                kategoriList = Array.isArray(katData)
                    ? katData
                    : (katData.data ?? []);
                loading = false;
            })
            .catch(() => {
                loading = false;
            });
    });

    const filtered = $derived(
        searchTerm.trim()
            ? data.filter(
                  (d) =>
                      d.title
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                      d.description
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()),
              )
            : data,
    );

    // ── Kolom helper ─────────────────────────────────────
    function getKategoriName(categoryId: number) {
        const kat = kategoriList.find((k: any) => k.id === categoryId);
        return kat?.title ?? `#${categoryId}`;
    }

    function slaLabel(item: any) {
        const unit =
            item.slaUnit === "menit"
                ? "Menit"
                : item.slaUnit === "jam"
                  ? "Jam"
                  : item.slaUnit === "hari"
                    ? "Hari"
                    : "";
        return `${item.slaDuration} ${unit}`;
    }

    // ── Columns ──────────────────────────────────────────
    const col = createColumnHelper<any>();
    const columns = [
        col.accessor("id", { header: "ID", enableSorting: true, size: 55 }),
        col.accessor("icon", {
            header: "Ikon",
            enableSorting: false,
            size: 60,
        }),
        col.accessor("title", { header: "Layanan", enableSorting: true }),
        col.accessor("categoryId", {
            header: "Kategori",
            enableSorting: true,
            size: 160,
        }),
        col.accessor("slaDuration", {
            header: "SLA",
            enableSorting: true,
            size: 90,
        }),
        col.accessor("type", { header: "Tipe", enableSorting: true, size: 70 }),
        col.accessor("cost", {
            header: "Biaya",
            enableSorting: true,
            size: 70,
        }),
        col.display({
            id: "_aksi",
            header: "Aksi",
            enableSorting: false,
            size: 110,
        }),
    ];

    // ── Helpers ──────────────────────────────────────────

    async function handleDelete(row: any) {
        if (!confirm(`Hapus layanan "${row.title}"?`)) return;
        await fetch(`${apiUrl}/${row.id}`, { method: "DELETE" });
        data = data.filter((d) => d.id !== row.id);
        selected = selected.filter((s) => s.id !== row.id);
    }

    function deleteSelected() {
        if (!confirm(`Hapus ${selected.length} layanan terpilih?`)) return;
        Promise.all(
            selected.map((r) =>
                fetch(`${apiUrl}/${r.id}`, { method: "DELETE" }),
            ),
        ).then(() => {
            const ids = new Set(selected.map((r) => r.id));
            data = data.filter((d) => !ids.has(d.id));
            selected = [];
        });
    }

    function toCSVRows(rows: any[]) {
        const headers = [
            "ID",
            "Ikon",
            "Layanan",
            "Kategori",
            "Deskripsi",
            "SLA",
            "Biaya",
            "Tipe",
        ];
        const body = rows.map((r) => [
            r.id,
            r.icon,
            r.title,
            getKategoriName(r.categoryId),
            r.description,
            slaLabel(r),
            r.cost,
            r.type,
        ]);
        const csv = [headers, ...body].map((row) => row.join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "layanan.csv";
        a.click();
    }

    function exportCSV() {
        toCSVRows(filtered);
    }
    function exportSelected() {
        toCSVRows(selected);
    }
</script>

<!-- ── Toolbar ─────────────────────────────────────────── -->
<div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
        <div class="relative">
            <input
                type="text"
                placeholder="Cari layanan..."
                class="border bg-white/50 border-black/10 rounded py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors w-56"
                bind:value={searchTerm}
            />
        </div>
    </div>
    <div class="flex items-center gap-2">
        <button
            onclick={exportCSV}
            class="flex items-center gap-1.5 px-3 py-2 bg-ink/5 text-ink/60 text-xs font-semibold border border-black/10 hover:bg-ink/10 transition-colors cursor-pointer"
        >
            <Icon icon="mdi:download" class="w-3.5 h-3.5" />
            Export
        </button>
        <a
            href="/admin/layanan/tambah"
            class="flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold border border-black/10 transition-colors hover:bg-green/90"
        >
            <Icon icon="mdi:plus" class="w-3.5 h-3.5" />
            Tambah
        </a>
    </div>
</div>

<!-- ── Table ──────────────────────────────────────────── -->
<Table
    data={filtered}
    {columns}
    {loading}
    enableSelection
    onSelectionChange={(rows: any[]) => (selected = rows)}
    class="bg-white"
>
    {#snippet renderCell(cell: any)}
        {#if cell.column.id === "id"}
            <span class="font-mono text-xs font-bold text-ink/60"
                >{cell.getValue()}</span
            >
        {:else if cell.column.id === "icon"}
            {@const icon = cell.getValue()}
            {#if icon}
                <Icon {icon} class="w-5 h-5 object-contain" />
            {:else}
                <span class="text-xs text-ink/30">–</span>
            {/if}
        {:else if cell.column.id === "title"}
            <div>
                <p class="font-semibold text-ink text-sm leading-tight">
                    {cell.getValue()}
                </p>
                <p
                    class="text-[10px] text-ink/40 mt-0.5 line-clamp-1 max-w-[220px]"
                >
                    {cell.row.original.description}
                </p>
            </div>
        {:else if cell.column.id === "categoryId"}
            <span class="text-xs font-medium text-ink/60"
                >{getKategoriName(cell.getValue())}</span
            >
        {:else if cell.column.id === "slaDuration"}
            <span class="text-xs font-medium text-ink/60"
                >{slaLabel(cell.row.original)}</span
            >
        {:else if cell.column.id === "type"}
            <span
                class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold {cell.getValue() ===
                'Online'
                    ? 'bg-blue-50 text-blue-700'
                    : cell.getValue() === 'Offline'
                      ? 'bg-ink/5 text-ink/50'
                      : 'bg-green/5 text-green/50'}">{cell.getValue()}</span
            >
        {:else if cell.column.id === "cost"}
            <span class="text-xs font-medium text-ink/60"
                >{cell.getValue()}</span
            >
        {:else if cell.column.id === "_aksi"}
            {@const row = cell.row.original}
            <div class="flex items-center gap-1">
                <a
                    href={`/admin/layanan/edit?id=${row.id}`}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                    aria-label="Edit"
                >
                    <Icon icon="mdi:pencil" class="w-3.5 h-3.5" />
                </a>
                <button
                    onclick={() => handleDelete(row)}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/50 hover:text-red-500 transition-colors cursor-pointer"
                    aria-label="Hapus"
                >
                    <Icon icon="mdi:delete" class="w-3.5 h-3.5" />
                </button>
            </div>
        {/if}
    {/snippet}
</Table>

<!-- ── Bulk action bar ─────────────────────────────────── -->
{#if selected.length > 0}
    <div
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-ink text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold"
    >
        <span>{selected.length} dipilih</span>
        <div class="w-px h-4 bg-white/20"></div>
        <button
            onclick={exportSelected}
            class="hover:text-white/70 transition-colors cursor-pointer"
            >Ekspor</button
        >
        <button
            onclick={deleteSelected}
            class="hover:text-red-400 transition-colors cursor-pointer"
            >Hapus</button
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
