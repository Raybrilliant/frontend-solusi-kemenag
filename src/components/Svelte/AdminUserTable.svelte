<script lang="ts">
    import { createColumnHelper } from "@tanstack/table-core";
    import Table from "./Table.svelte";

    let { apiUrl = "/api/admin/user", apiKategori = "/api/admin/kategori" } =
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
            .then(([userData, katData]) => {
                data = Array.isArray(userData)
                    ? userData
                    : (userData.data ?? []);
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
                      (d.nama &&
                          d.nama
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())) ||
                      (d.nip &&
                          d.nip
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())) ||
                      (d.role &&
                          d.role
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())),
              )
            : data,
    );

    // ── Kolom helper ─────────────────────────────────────
    function getKategoriName(categoryId: number | null | undefined) {
        if (!categoryId) return "–";
        const kat = kategoriList.find((k: any) => k.id === categoryId);
        return kat?.title ?? `#${categoryId}`;
    }

    function roleBadge(role: string) {
        switch (role) {
            case "admin":
                return { cls: "bg-red-50 text-red-700", label: "Admin" };
            case "operator":
                return { cls: "bg-blue-50 text-blue-700", label: "Operator" };
            case "asn":
                return { cls: "bg-purple-50 text-purple-700", label: "ASN" };
            default:
                return { cls: "bg-ink/5 text-ink/50", label: role ?? "–" };
        }
    }

    // ── Columns ──────────────────────────────────────────
    const col = createColumnHelper<any>();
    const columns = [
        col.accessor("id", { header: "ID", enableSorting: true, size: 55 }),
        col.accessor("nama", { header: "Nama", enableSorting: true }),
        col.accessor("nip", { header: "NIP", enableSorting: true }),
        col.accessor("role", {
            header: "Role",
            enableSorting: true,
            size: 100,
        }),
        col.accessor("categoryId", {
            header: "Kategori",
            enableSorting: true,
            size: 160,
        }),
        col.accessor("createdAt", {
            header: "Dibuat",
            enableSorting: true,
            size: 110,
        }),
        col.display({
            id: "_aksi",
            header: "Aksi",
            enableSorting: false,
            size: 110,
        }),
    ];

    // ── Helpers ──────────────────────────────────────────
    function formatDate(dateStr: string | undefined) {
        if (!dateStr) return "–";
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    }

    async function handleDelete(row: any) {
        if (!confirm(`Hapus user "${row.nama || row.nip}"?`)) return;
        await fetch(`${apiUrl}/${row.id}`, { method: "DELETE" });
        data = data.filter((d) => d.id !== row.id);
        selected = selected.filter((s) => s.id !== row.id);
    }

    function deleteSelected() {
        if (!confirm(`Hapus ${selected.length} user terpilih?`)) return;
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

    function quoteCSV(v: any) {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function toCSVRows(rows: any[]) {
        const headers = ["ID", "Nama", "NIP", "Role", "Kategori", "Dibuat"];
        const body = rows.map((r) => [
            r.id,
            r.nama,
            r.nip,
            r.role,
            getKategoriName(r.categoryId),
            formatDate(r.createdAt),
        ]);
        const csv = [headers, ...body]
            .map((row) => row.map(quoteCSV).join(","))
            .join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "users.csv";
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
                placeholder="Cari user..."
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
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5"
                ><path
                    fill="currentColor"
                    d="M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7z"
                /></svg
            >
            Export
        </button>
        <a
            href="/admin/manajemenUser/tambah"
            class="flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold border border-black/10 transition-colors hover:bg-green/90"
        >
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5"
                ><path
                    fill="currentColor"
                    d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"
                /></svg
            >
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
        {:else if cell.column.id === "nama"}
            <div class="flex items-center gap-2.5">
                <div
                    class="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center shrink-0 text-green text-xs font-bold"
                >
                    {String(cell.getValue() ?? "?")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                </div>
                <p class="font-semibold text-ink text-sm leading-tight">
                    {cell.getValue()}
                </p>
            </div>
        {:else if cell.column.id === "nip"}
            <span class="text-xs text-ink/60 font-mono">{cell.getValue()}</span>
        {:else if cell.column.id === "role"}
            {@const role = cell.getValue()}
            {@const badge = roleBadge(role)}
            <span
                class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold {badge.cls}"
                >{badge.label}</span
            >
        {:else if cell.column.id === "categoryId"}
            <span class="text-xs font-medium text-ink/60"
                >{getKategoriName(cell.getValue())}</span
            >
        {:else if cell.column.id === "createdAt"}
            <span class="text-xs text-ink/50"
                >{formatDate(cell.getValue())}</span
            >
        {:else if cell.column.id === "_aksi"}
            {@const row = cell.row.original}
            <div class="flex items-center gap-1">
                <a
                    href={`/admin/manajemenUser/edit?id=${row.id}`}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                    aria-label="Edit"
                >
                    <svg viewBox="0 0 24 24" class="w-3.5 h-3.5"
                        ><path
                            fill="currentColor"
                            d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83l3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75z"
                        /></svg
                    >
                </a>
                <button
                    onclick={() => handleDelete(row)}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/50 hover:text-red-500 transition-colors cursor-pointer"
                    aria-label="Hapus"
                >
                    <svg viewBox="0 0 24 24" class="w-3.5 h-3.5"
                        ><path
                            fill="currentColor"
                            d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"
                        /></svg
                    >
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
            <svg viewBox="0 0 24 24" class="w-4 h-4"
                ><path
                    fill="currentColor"
                    d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"
                /></svg
            >
        </button>
    </div>
{/if}
