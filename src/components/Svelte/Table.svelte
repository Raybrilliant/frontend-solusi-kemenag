<script>
    import Icon from "@iconify/svelte";
    import { untrack } from "svelte";
    import {
        createTable,
        getCoreRowModel,
        getSortedRowModel,
        getPaginationRowModel,
    } from "@tanstack/table-core";

    /**
     * Props:
     *   data              — array of row objects
     *   columns           — TanStack ColumnDef array (from createColumnHelper)
     *   loading           — show skeleton while true
     *   initialPageSize   — default rows per page (10)
     *   enableSelection   — prepend checkbox column and track selected rows
     *   onSelectionChange — callback(selectedRows[]) fired on selection change
     *   renderCell        — Svelte 5 snippet for custom cell content
     *   class             — extra CSS classes on the wrapper
     */
    let {
        data = [],
        columns = [],
        loading = false,
        initialPageSize = 10,
        enableSelection = false,
        onSelectionChange,
        renderCell,
        class: extraClass = "",
    } = $props();

    // ── Mutable table state (owned by this component) ────────────────
    let sorting = $state([]);
    let pagination = $state({
        pageIndex: 0,
        pageSize: untrack(() => initialPageSize),
    });
    let rowSelection = $state({});

    // ── Row model factories — stable references ───────────────────────
    const coreModel = getCoreRowModel();
    const sortedModel = getSortedRowModel();
    const paginatedModel = getPaginationRowModel();

    // ── Prepend selection column when enableSelection is on ──────────
    const allColumns = $derived(
        enableSelection
            ? [
                  { id: "_select", header: "", enableSorting: false, size: 40 },
                  ...columns,
              ]
            : columns,
    );

    // ── Recreate the table whenever any reactive input changes ────────
    // Two-step init: first build a bare table to get initialState (which
    // contains all feature defaults like columnPinning, columnVisibility,
    // etc.), then overlay our controlled state on top. This avoids the
    // `table.getState().columnPinning is undefined` crash that happens
    // when state only contains the fields we explicitly manage.
    const table = $derived.by(() => {
        const base = createTable({
            data,
            columns: allColumns,
            getCoreRowModel: coreModel,
            getSortedRowModel: sortedModel,
            getPaginationRowModel: paginatedModel,
            enableRowSelection: enableSelection,
            renderFallbackValue: null,
        });

        base.setOptions((prev) => ({
            ...prev,
            state: {
                ...base.initialState, // all feature defaults (columnPinning, etc.)
                sorting,
                pagination,
                ...(enableSelection ? { rowSelection } : {}),
            },
            onSortingChange: (u) => {
                sorting = typeof u === "function" ? u(sorting) : u;
            },
            onPaginationChange: (u) => {
                pagination = typeof u === "function" ? u(pagination) : u;
            },
            onRowSelectionChange: (u) => {
                rowSelection = typeof u === "function" ? u(rowSelection) : u;
            },
        }));

        return base;
    });

    // Notify parent when selection changes
    $effect(() => {
        if (enableSelection && onSelectionChange) {
            onSelectionChange(
                table.getSelectedRowModel().rows.map((r) => r.original),
            );
        }
    });

    // ── Helpers ──────────────────────────────────────────────────────
    const PAGE_SIZES = [10, 20, 50, 100];

    function headerLabel(header) {
        const h = header.column.columnDef.header;
        if (typeof h === "string") return h;
        if (typeof h === "function") return h(header.getContext()) ?? "";
        return "";
    }

    function pageNumbers(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
        if (current >= total - 3)
            return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
        return [1, "…", current - 1, current, current + 1, "…", total];
    }
</script>

<div class="flex flex-col gap-0 {extraClass}">
    <!-- ── Table ────────────────────────────────────────────────── -->
    <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
            <!-- Head -->
            <thead>
                {#each table.getHeaderGroups() as headerGroup}
                    <tr class="border-b border-black/8 bg-black/2">
                        {#each headerGroup.headers as header}
                            {#if header.column.id === "_select"}
                                <th class="w-10 px-3 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        class="checkbox"
                                        checked={table.getIsAllPageRowsSelected()}
                                        indeterminate={table.getIsSomePageRowsSelected()}
                                        onchange={table.getToggleAllPageRowsSelectedHandler()}
                                        aria-label="Pilih semua baris"
                                    />
                                </th>
                            {:else}
                                <th
                                    class="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wider text-ink/40
                    {header.column.getCanSort()
                                        ? 'cursor-pointer select-none hover:text-ink/70'
                                        : ''}"
                                    onclick={header.column.getCanSort()
                                        ? () => header.column.toggleSorting()
                                        : undefined}
                                >
                                    {#if !header.isPlaceholder}
                                        <div class="flex items-center gap-1">
                                            <span>{headerLabel(header)}</span>
                                            {#if header.column.getCanSort()}
                                                <span
                                                    class="inline-flex flex-col gap-px ml-0.5"
                                                >
                                                    {#if header.column.getIsSorted() === "asc"}
                                                        <Icon
                                                            icon="mdi:arrow-up"
                                                            class="w-3.5 h-3.5 text-green"
                                                        />
                                                    {:else if header.column.getIsSorted() === "desc"}
                                                        <Icon
                                                            icon="mdi:arrow-down"
                                                            class="w-3.5 h-3.5 text-green"
                                                        />
                                                    {:else}
                                                        <Icon
                                                            icon="mdi:swap-vertical"
                                                            class="w-3.5 h-3.5 text-ink/25"
                                                        />
                                                    {/if}
                                                </span>
                                            {/if}
                                        </div>
                                    {/if}
                                </th>
                            {/if}
                        {/each}
                    </tr>
                {/each}
            </thead>

            <!-- Body -->
            <tbody>
                {#if loading}
                    {#each Array(initialPageSize) as _}
                        <tr class="border-b border-black/5">
                            {#each allColumns as _}
                                <td class="px-4 py-3">
                                    <div
                                        class="h-4 bg-black/6 rounded-md animate-pulse"
                                        style="width: {60 +
                                            Math.random() * 30}%"
                                    ></div>
                                </td>
                            {/each}
                        </tr>
                    {/each}
                {:else if table.getRowModel().rows.length === 0}
                    <tr>
                        <td
                            colspan={allColumns.length}
                            class="px-4 py-16 text-center text-ink/35 text-sm"
                        >
                            <Icon
                                icon="mdi:calendar-blank-outline"
                                class="w-10 h-10 mx-auto mb-3 text-ink/20"
                            />
                            Tidak ada data untuk ditampilkan
                        </td>
                    </tr>
                {:else}
                    {#each table.getRowModel().rows as row}
                        <tr
                            class="border-b border-black/5 hover:bg-black/[0.018] transition-colors"
                        >
                            {#each row.getVisibleCells() as cell}
                                {#if cell.column.id === "_select"}
                                    <td class="w-10 px-3 py-3">
                                        <input
                                            type="checkbox"
                                            class="checkbox"
                                            checked={row.getIsSelected()}
                                            disabled={!row.getCanSelect()}
                                            onchange={row.getToggleSelectedHandler()}
                                            aria-label="Pilih baris"
                                        />
                                    </td>
                                {:else if renderCell}
                                    <td class="px-4 py-3 text-ink/80">
                                        {@render renderCell(cell)}
                                    </td>
                                {:else}
                                    <td class="px-4 py-3 text-ink/80">
                                        {String(cell.getValue() ?? "")}
                                    </td>
                                {/if}
                            {/each}
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>

    <!-- ── Pagination ────────────────────────────────────────────── -->
    {#if !loading}
        {@const pageIndex = table.getState().pagination.pageIndex}
        {@const pageCount = table.getPageCount()}
        {@const currentPage = pageIndex + 1}
        {@const pageSize = table.getState().pagination.pageSize}
        {@const from = pageIndex * pageSize + 1}
        {@const to = Math.min(from + pageSize - 1, table.getRowCount())}
        {@const total = table.getRowCount()}

        <div
            class="flex items-center justify-between px-4 py-3 border-t border-black/8 flex-wrap gap-3"
        >
            <!-- Info + page size -->
            <div class="flex items-center gap-3 text-xs text-ink/45">
                <span>
                    {from.toLocaleString("id-ID")}–{to.toLocaleString("id-ID")} dari
                    {total.toLocaleString("id-ID")} baris
                </span>
                <div class="flex items-center gap-1.5">
                    <span>Tampilkan</span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onchange={(e) =>
                            table.setPageSize(Number(e.currentTarget.value))}
                        class="border border-black/10 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-green cursor-pointer"
                    >
                        {#each PAGE_SIZES as size}
                            <option value={size}>{size}</option>
                        {/each}
                    </select>
                    <span>baris</span>
                </div>
            </div>

            <!-- Page buttons -->
            {#if pageCount > 1}
                <div class="flex items-center gap-1">
                    <button
                        onclick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="Halaman sebelumnya"
                        class="w-8 h-8 flex items-center justify-center rounded-lg border border-black/10
              hover:bg-black/4 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        <Icon icon="mdi:chevron-left" class="w-4 h-4" />
                    </button>

                    {#each pageNumbers(currentPage, pageCount) as p}
                        {#if p === "…"}
                            <span
                                class="w-8 h-8 flex items-center justify-center text-xs text-ink/30"
                                >…</span
                            >
                        {:else}
                            <button
                                onclick={() =>
                                    table.setPageIndex(Number(p) - 1)}
                                class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer
                  {currentPage === p
                                    ? 'bg-green text-white shadow-sm'
                                    : 'hover:bg-black/4 text-ink/60 border border-black/10'}"
                            >
                                {p}
                            </button>
                        {/if}
                    {/each}

                    <button
                        onclick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        aria-label="Halaman berikutnya"
                        class="w-8 h-8 flex items-center justify-center rounded-lg border border-black/10
              hover:bg-black/4 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        <Icon icon="mdi:chevron-right" class="w-4 h-4" />
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .checkbox {
        width: 15px;
        height: 15px;
        border-radius: 4px;
        border: 1.5px solid #ccc;
        accent-color: var(--color-green, #0f6b44);
        cursor: pointer;
    }
</style>
