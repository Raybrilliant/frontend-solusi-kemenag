<script lang="ts">
    import { onMount } from "svelte";
    import Table from "./Table.svelte";

    type DataConfig = {
        url: string;
        colIndex: number;
        colIndex2: number;
        table: boolean;
        filterYear: boolean;
        year: number;
        visibleCols: number[];
        yearColIndex?: number;
    };

    const currentYear = new Date().getFullYear();

    function getConfig(id: string, year: number): DataConfig | undefined {
        const map: Record<string, DataConfig> = {
            "Data Pegawai": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=108686125&single=true&output=csv",
                colIndex: 11, colIndex2: 6, table: true, filterYear: false,
                year, visibleCols: [2, 3, 6, 7, 8, 11], yearColIndex: 0,
            },
            "Guru DPK": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1831682664&single=true&output=csv",
                colIndex: 7, colIndex2: 3, table: true, filterYear: false,
                year, visibleCols: [2, 3, 4, 5, 6, 7], yearColIndex: 0,
            },
            "Guru Sertifikat Pendidik": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1662667355&single=true&output=csv",
                colIndex: 10, colIndex2: 3, table: true, filterYear: false,
                year, visibleCols: [2, 3, 5, 6, 7, 8, 9], yearColIndex: 0,
            },
            "Lembaga Madrasah": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=486907344&single=true&output=csv",
                colIndex: 3, colIndex2: 4, table: true, filterYear: false,
                year, visibleCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15], yearColIndex: 0,
            },
            "Pondok Pesantren": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1098987175&single=true&output=csv",
                colIndex: 3, colIndex2: 6, table: true, filterYear: false,
                year, visibleCols: [1, 2, 3, 4, 5, 6, 7, 9, 14], yearColIndex: 0,
            },
            "Lembaga TPQ dan Madin": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=104225362&single=true&output=csv",
                colIndex: 3, colIndex2: 6, table: true, filterYear: false,
                year, visibleCols: [1, 2, 3, 4, 5, 6, 7, 11, 12], yearColIndex: 0,
            },
            "Zakat": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=2036535046&single=true&output=csv",
                colIndex: 2, colIndex2: 5, table: true, filterYear: false,
                year, visibleCols: [7, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14], yearColIndex: 0,
            },
            "Wakaf": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1863825755&single=true&output=csv",
                colIndex: 4, colIndex2: 5, table: true, filterYear: false,
                year, visibleCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], yearColIndex: 0,
            },
            "Nikah": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1716322140&single=true&output=csv",
                colIndex: 5, colIndex2: 6, table: false, filterYear: false,
                year, visibleCols: [], yearColIndex: 3,
            },
            "Masjid dan Musholla": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=188330066&single=true&output=csv",
                colIndex: 2, colIndex2: 5, table: true, filterYear: false,
                year, visibleCols: [1, 2, 3, 4, 5, 6, 7, 8, 11, 13], yearColIndex: 0,
            },
        };
        return map[id];
    }

    const DATASET_IDS = [
        "Data Pegawai", "Guru DPK", "Guru Sertifikat Pendidik",
        "Lembaga Madrasah", "Pondok Pesantren", "Lembaga TPQ dan Madin",
        "Zakat", "Wakaf", "Nikah", "Masjid dan Musholla",
    ];

    // ── State ────────────────────────────────────────────────
    let selectedId  = $state(DATASET_IDS[0]);
    let loading     = $state(false);
    let errorMsg    = $state("");
    let headers     = $state<string[]>([]);   // from CSV row index 2
    let rawRows     = $state<string[][]>([]); // from CSV row index 3+
    let searchQuery = $state("");
    let lastUpdate  = $state("");
    let animated    = $state(false);

    let isMounted = false;

    onMount(() => {
        isMounted = true;
        loadData();
    });

    $effect(() => {
        selectedId;
        if (isMounted) loadData();
    });

    // ── Config ───────────────────────────────────────────────
    let config = $derived(getConfig(selectedId, currentYear));

    // ── CSV Parser ───────────────────────────────────────────
    function parseCSV(text: string): string[][] {
        const result: string[][] = [];
        let current: string[] = [];
        let field = "";
        let inQ = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '"') {
                if (inQ && text[i + 1] === '"') { field += '"'; i++; }
                else inQ = !inQ;
            } else if (ch === "," && !inQ) {
                current.push(field.trim());
                field = "";
            } else if ((ch === "\n" || ch === "\r") && !inQ) {
                if (ch === "\r" && text[i + 1] === "\n") i++;
                current.push(field.trim());
                field = "";
                if (current.some(c => c !== "")) result.push(current);
                current = [];
            } else {
                field += ch;
            }
        }
        if (field !== "" || current.length > 0) {
            current.push(field.trim());
            if (current.some(c => c !== "")) result.push(current);
        }
        return result;
    }

    // ── Load Data ────────────────────────────────────────────
    async function loadData() {
        const cfg = getConfig(selectedId, currentYear);
        if (!cfg?.url) return;

        animated    = false;
        loading     = true;
        errorMsg    = "";
        headers     = [];
        rawRows     = [];
        searchQuery = "";
        lastUpdate  = "";

        try {
            const res = await fetch(cfg.url);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const text = await res.text();
            const parsed = parseCSV(text);

            // Row 1  → lastUpdate is at column index 2
            lastUpdate = parsed[1]?.[2]?.trim() ?? "";
            // Row 2  → actual column headers
            headers = parsed[2] ?? [];
            // Row 3+ → data rows
            rawRows = parsed.slice(3).filter(r => r.some(c => c !== ""));
        } catch {
            errorMsg = "Gagal memuat data. Pastikan koneksi internet tersedia.";
        } finally {
            loading = false;
            setTimeout(() => { animated = true; }, 60);
        }
    }

    // ── Year-filtered rows ───────────────────────────────────
    let filteredRows = $derived.by(() => {
        if (!config) return rawRows;
        if (config.filterYear && config.yearColIndex !== undefined) {
            return rawRows.filter(r => r[config!.yearColIndex!] === String(config!.year));
        }
        return rawRows;
    });

    // ── Search-filtered rows ─────────────────────────────────
    let searchedRows = $derived.by(() => {
        if (!searchQuery.trim()) return filteredRows;
        const q = searchQuery.toLowerCase();
        return filteredRows.filter(r => r.some(c => c.toLowerCase().includes(q)));
    });

    // ── Label column for both charts ─────────────────────────
    // Use the first column in visibleCols (typically the "name" column),
    // falling back to column index 1.
    let labelColIdx = $derived.by(() => {
        if (!config) return 1;
        return config.visibleCols.length > 0 ? config.visibleCols[0] : 1;
    });

    // ── Chart 1: colIndex ─────────────────────────────────────
    let chart1 = $derived.by(() => {
        if (!config || filteredRows.length === 0) return [];
        const agg = new Map<string, number>();
        for (const row of filteredRows) {
            const label = (row[labelColIdx] ?? "").trim();
            if (!label) continue;
            const raw   = (row[config.colIndex] ?? "").replace(/[^0-9.-]/g, "");
            const value = parseFloat(raw) || 0;
            agg.set(label, (agg.get(label) ?? 0) + value);
        }
        return [...agg.entries()]
            .map(([label, value]) => ({ label, value }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 25);
    });

    // ── Chart 2: colIndex2 ────────────────────────────────────
    let chart2 = $derived.by(() => {
        if (!config || filteredRows.length === 0) return [];
        const agg = new Map<string, number>();
        for (const row of filteredRows) {
            const label = (row[labelColIdx] ?? "").trim();
            if (!label) continue;
            const raw   = (row[config.colIndex2] ?? "").replace(/[^0-9.-]/g, "");
            const value = parseFloat(raw) || 0;
            agg.set(label, (agg.get(label) ?? 0) + value);
        }
        return [...agg.entries()]
            .map(([label, value]) => ({ label, value }))
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 25);
    });

    let max1 = $derived(Math.max(...chart1.map(d => d.value), 1));
    let max2 = $derived(Math.max(...chart2.map(d => d.value), 1));

    let chart1Label = $derived(headers[config?.colIndex ?? 0]  ?? "Grafik 1");
    let chart2Label = $derived(headers[config?.colIndex2 ?? 0] ?? "Grafik 2");

    // ── TanStack columns ─────────────────────────────────────
    let tableColumns = $derived.by(() => {
        if (!config || headers.length === 0) return [];

        const indices = config.visibleCols.length > 0
            ? config.visibleCols.filter(i => i < headers.length)
            : headers.map((_, i) => i);

        const noCol = {
            id: "_no",
            accessorKey: "_no",
            header: "No",
            enableSorting: false,
            size: 48,
        };

        const dataCols = indices.map(i => ({
            id: String(i),
            accessorKey: String(i),
            header: headers[i] || `Kolom ${i + 1}`,
        }));

        return [noCol, ...dataCols];
    });

    // ── TanStack row objects ─────────────────────────────────
    let tableData = $derived(
        searchedRows.map((row, idx) => {
            const obj: Record<string, string> = { _no: String(idx + 1) };
            row.forEach((val, i) => { obj[String(i)] = val; });
            return obj;
        })
    );

    // ── Number formatter ─────────────────────────────────────
    function fmt(n: number): string {
        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} M`;
        if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)} Jt`;
        if (n >= 1_000)         return `${(n / 1_000).toFixed(1)} Rb`;
        return n.toLocaleString("id-ID");
    }

    function barPct(value: number, max: number): number {
        return animated ? (value / max) * 100 : 0;
    }
</script>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- Dataset tabs                                                -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-ink/10 no-scrollbar">
    {#each DATASET_IDS as id}
        <button
            type="button"
            onclick={() => { selectedId = id; }}
            class={[
                "shrink-0 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border transition-colors whitespace-nowrap",
                selectedId === id
                    ? "bg-ink text-cream border-ink"
                    : "border-ink/15 text-ink/45 hover:border-ink/40 hover:text-ink bg-transparent",
            ].join(" ")}
        >
            {id}
        </button>
    {/each}
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- Loading                                                      -->
<!-- ══════════════════════════════════════════════════════════ -->
{#if loading}
    <div class="flex items-center justify-center py-24 gap-3">
        <div class="w-5 h-5 border-2 border-ink/15 border-t-green rounded-full animate-spin"></div>
        <span class="text-sm text-ink/40 font-medium">Memuat data…</span>
    </div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- Error                                                        -->
<!-- ══════════════════════════════════════════════════════════ -->
{:else if errorMsg}
    <div class="flex flex-col items-center justify-center py-24 text-center">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" class="text-ink/15 mb-3">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p class="text-sm font-bold text-ink/30 uppercase tracking-wider mb-3">{errorMsg}</p>
        <button type="button" onclick={loadData}
                class="text-xs font-bold text-green hover:underline uppercase tracking-wider">
            Coba Lagi
        </button>
    </div>

{:else if headers.length > 0}

    <!-- ── Info bar ─────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-8 text-[11px]">
        <div class="flex items-center gap-2">
            <div class="w-1 h-4 bg-green shrink-0"></div>
            <span class="font-bold uppercase tracking-wider text-ink/50">
                {filteredRows.length} baris data
            </span>
        </div>
        <span class="text-ink/20">·</span>
        <span class="text-ink/35">
            Grafik A: <strong class="text-ink/55">{chart1Label}</strong>
        </span>
        <span class="text-ink/20">·</span>
        <span class="text-ink/35">
            Grafik B: <strong class="text-ink/55">{chart2Label}</strong>
        </span>
        {#if lastUpdate}
            <div class="flex items-center gap-1.5 text-ink/30 ml-auto">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" class="shrink-0">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                </svg>
                Diperbarui: <strong class="text-ink/45 ml-0.5">{lastUpdate}</strong>
            </div>
        {/if}
    </div>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- Two charts side by side                             -->
    <!-- ══════════════════════════════════════════════════ -->
    {#if chart1.length > 0 || chart2.length > 0}
        <!-- <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">

            <!-- Chart 1 -->
            <!-- <div class="border border-ink/10 bg-cream">
                <div class="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-ink/8">
                    <div class="w-2.5 h-2.5 bg-green shrink-0"></div>
                    <h3 class="text-[11px] font-black uppercase tracking-wider text-ink/60 flex-1 truncate">
                        Grafik A — {chart1Label}
                    </h3>
                    {#if chart1.length === 25}
                        <span class="text-[10px] text-ink/25 italic shrink-0">Top 25</span>
                    {/if}
                </div>
                <div class="p-4 space-y-1.5">
                    {#each chart1 as bar, i}
                        {@const pct = barPct(bar.value, max1)}
                        <div class="flex items-center gap-2 group min-w-0">
                            <div class="w-28 sm:w-36 shrink-0 text-right text-[10px] font-medium text-ink/55 truncate leading-tight"
                                 title={bar.label}>
                                {bar.label}
                            </div>
                            <div class="flex-1 min-w-0 relative h-6 bg-ink/[0.04]">
                                <div
                                    class="absolute inset-y-0 left-0 bg-green group-hover:brightness-110 transition-[width,filter]"
                                    style="width:{pct}%; transition-duration:0.55s; transition-timing-function:cubic-bezier(0.16,1,0.3,1); transition-delay:{i * 25}ms;"
                                >
                                    {#if pct > 22}
                                        <span class="absolute inset-y-0 right-1.5 flex items-center text-[9px] font-bold text-white/90">
                                            {fmt(bar.value)}
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            <div class="w-12 shrink-0 text-[10px] font-bold text-ink/40 text-right tabular-nums">
                                {#if pct <= 22}{fmt(bar.value)}{/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div> -->
            <!-- Chart 2 -->
            <!-- <div class="border border-ink/10 bg-cream">
                <div class="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-ink/8">
                    <div class="w-2.5 h-2.5 bg-yellow shrink-0"></div>
                    <h3 class="text-[11px] font-black uppercase tracking-wider text-ink/60 flex-1 truncate">
                        Grafik B — {chart2Label}
                    </h3>
                    {#if chart2.length === 25}
                        <span class="text-[10px] text-ink/25 italic shrink-0">Top 25</span>
                    {/if}
                </div>
                <div class="p-4 space-y-1.5">
                    {#each chart2 as bar, i}
                        {@const pct = barPct(bar.value, max2)}
                        <div class="flex items-center gap-2 group min-w-0">
                            <div class="w-28 sm:w-36 shrink-0 text-right text-[10px] font-medium text-ink/55 truncate leading-tight"
                                 title={bar.label}>
                                {bar.label}
                            </div>
                            <div class="flex-1 min-w-0 relative h-6 bg-ink/[0.04]">
                                <div
                                    class="absolute inset-y-0 left-0 bg-yellow group-hover:brightness-110 transition-[width,filter]"
                                    style="width:{pct}%; transition-duration:0.55s; transition-timing-function:cubic-bezier(0.16,1,0.3,1); transition-delay:{i * 25}ms;"
                                >
                                    {#if pct > 22}
                                        <span class="absolute inset-y-0 right-1.5 flex items-center text-[9px] font-bold text-ink/70">
                                            {fmt(bar.value)}
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            <div class="w-12 shrink-0 text-[10px] font-bold text-ink/40 text-right tabular-nums">
                                {#if pct <= 22}{fmt(bar.value)}{/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

        </div> -->
    {/if} -->

    <!-- ══════════════════════════════════════════════════ -->
    <!-- Table                                               -->
    <!-- ══════════════════════════════════════════════════ -->
    {#if config?.table && tableColumns.length > 0}
        <div class="mb-10">

            <!-- Table header bar -->
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-1 h-5 bg-green shrink-0"></div>
                    <h3 class="text-[11px] font-black uppercase tracking-[0.18em] text-green">
                        Tabel Data
                    </h3>
                    <span class="text-[10px] text-ink/30">
                        {searchedRows.length} / {filteredRows.length} baris
                    </span>
                </div>

                <!-- Search -->
                <div class="flex items-center gap-2 border border-ink/15 bg-cream px-3 py-1.5 focus-within:border-green transition-colors">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                         stroke-width="2" class="text-ink/30 shrink-0">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Cari…"
                        class="bg-transparent text-[12px] text-ink outline-none placeholder:text-ink/30 w-36"
                    />
                    {#if searchQuery}
                        <button type="button" onclick={() => { searchQuery = ""; }}
                                class="text-ink/30 hover:text-ink transition-colors">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    {/if}
                </div>
            </div>

            <!-- TanStack Table -->
            <div class="border bg-white border-ink/10 overflow-hidden">
                <Table
                    data={tableData}
                    columns={tableColumns}
                    loading={false}
                    initialPageSize={10}
                />
            </div>

            <p class="mt-2 text-[10px] text-ink/20 text-right italic">
                Sumber: Google Sheets Kemenag Kota Probolinggo
            </p>
        </div>
    {/if}

{:else if !loading}
    <div class="flex flex-col items-center justify-center py-24 text-center">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" class="text-ink/10 mb-4">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
        <p class="text-sm font-bold text-ink/25 uppercase tracking-wider">Pilih dataset untuk memulai</p>
    </div>
{/if}

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
