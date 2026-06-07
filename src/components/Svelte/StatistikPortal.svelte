<script lang="ts">
    import Icon from "@iconify/svelte";
    import { onMount } from "svelte";
    import PortalDonutChart from "./PortalDonutChart.svelte";
    import PortalHorizontalBarChart from "./PortalHorizontalBarChart.svelte";
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
                colIndex: 6,
                colIndex2: 11,
                table: true,
                filterYear: false,
                year,
                visibleCols: [2, 3, 6, 7, 8, 11],
                yearColIndex: 0,
            },
            "Guru DPK": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1831682664&single=true&output=csv",
                colIndex: 4,
                colIndex2: 7,
                table: true,
                filterYear: false,
                year,
                visibleCols: [2, 3, 4, 5, 6, 7],
                yearColIndex: 0,
            },
            "Guru Sertifikat Pendidik": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1662667355&single=true&output=csv",
                colIndex: 10,
                colIndex2: 4,
                table: true,
                filterYear: false,
                year,
                visibleCols: [2, 3, 5, 7, 9],
                yearColIndex: 0,
            },
            "Guru PAI": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=567797176&single=true&output=csv",
                colIndex: 4,
                colIndex2: 3,
                table: true,
                filterYear: false,
                year,
                visibleCols: [2, 3, 4, 5, 6, 7, 8, 9, 10],
                yearColIndex: 0,
            },
            "Lembaga Madrasah": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=486907344&single=true&output=csv",
                colIndex: 3,
                colIndex2: 4,
                table: true,
                filterYear: false,
                year,
                visibleCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15],
                yearColIndex: 0,
            },
            "Pondok Pesantren": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1098987175&single=true&output=csv",
                colIndex: 3,
                colIndex2: 6,
                table: true,
                filterYear: false,
                year,
                visibleCols: [1, 2, 3, 4, 5, 6, 7, 9, 14],
                yearColIndex: 0,
            },
            "Lembaga TPQ dan Madin": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=104225362&single=true&output=csv",
                colIndex: 3,
                colIndex2: 6,
                table: true,
                filterYear: false,
                year,
                visibleCols: [1, 2, 3, 4, 5, 6, 7, 11, 12],
                yearColIndex: 0,
            },
            Zakat: {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=2036535046&single=true&output=csv",
                colIndex: 2,
                colIndex2: 5,
                table: true,
                filterYear: false,
                year,
                visibleCols: [7, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14],
                yearColIndex: 0,
            },
            Wakaf: {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1863825755&single=true&output=csv",
                colIndex: 4,
                colIndex2: 5,
                table: true,
                filterYear: false,
                year,
                visibleCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
                yearColIndex: 0,
            },
            Nikah: {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=1716322140&single=true&output=csv",
                colIndex: 5,
                colIndex2: 6,
                table: false,
                filterYear: false,
                year,
                visibleCols: [],
                yearColIndex: 3,
            },
            "Masjid dan Musholla": {
                url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NxHN7O3OCWAVj8SL3EIytT0GYlj_x7-Anj2HJgo0-m9z2Hub1Vue3td1Q6Hr-HTd2ZpfJ6tfy1Ta/pub?gid=188330066&single=true&output=csv",
                colIndex: 2,
                colIndex2: 5,
                table: true,
                filterYear: false,
                year,
                visibleCols: [1, 2, 3, 4, 5, 6, 7, 8, 11, 13],
                yearColIndex: 0,
            },
        };
        return map[id];
    }

    const DATASET_IDS = [
        "Data Pegawai",
        "Guru DPK",
        "Guru Sertifikat Pendidik",
        "Guru PAI",
        "Lembaga Madrasah",
        "Pondok Pesantren",
        "Lembaga TPQ dan Madin",
        "Zakat",
        "Wakaf",
        "Nikah",
        "Masjid dan Musholla",
    ];

    // ── State ────────────────────────────────────────────────
    let selectedId = $state(DATASET_IDS[0]);
    let loading = $state(false);
    let errorMsg = $state("");
    let headers = $state<string[]>([]); // from CSV row index 2
    let rawRows = $state<string[][]>([]); // from CSV row index 3+
    let searchQuery = $state("");
    let lastUpdate = $state("");

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
                if (inQ && text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else inQ = !inQ;
            } else if (ch === "," && !inQ) {
                current.push(field.trim());
                field = "";
            } else if ((ch === "\n" || ch === "\r") && !inQ) {
                if (ch === "\r" && text[i + 1] === "\n") i++;
                current.push(field.trim());
                field = "";
                if (current.some((c) => c !== "")) result.push(current);
                current = [];
            } else {
                field += ch;
            }
        }
        if (field !== "" || current.length > 0) {
            current.push(field.trim());
            if (current.some((c) => c !== "")) result.push(current);
        }
        return result;
    }

    // ── Load Data ────────────────────────────────────────────
    async function loadData() {
        const cfg = getConfig(selectedId, currentYear);
        if (!cfg?.url) return;

        loading = true;
        errorMsg = "";
        headers = [];
        rawRows = [];
        searchQuery = "";
        lastUpdate = "";

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
            rawRows = parsed.slice(3).filter((r) => r.some((c) => c !== ""));
        } catch {
            errorMsg = "Gagal memuat data. Pastikan koneksi internet tersedia.";
        } finally {
            loading = false;
        }
    }

    // ── Year-filtered rows ───────────────────────────────────
    let filteredRows = $derived.by(() => {
        if (!config) return rawRows;
        if (config.filterYear && config.yearColIndex !== undefined) {
            return rawRows.filter(
                (r) => r[config!.yearColIndex!] === String(config!.year),
            );
        }
        return rawRows;
    });

    // ── Search-filtered rows ─────────────────────────────────
    let searchedRows = $derived.by(() => {
        if (!searchQuery.trim()) return filteredRows;
        const q = searchQuery.toLowerCase();
        return filteredRows.filter((r) =>
            r.some((c) => c.toLowerCase().includes(q)),
        );
    });

    // ── Label column for both charts ─────────────────────────
    // Use the first column in visibleCols (typically the "name" column),
    // falling back to column index 1.
    let labelColIdx = $derived.by(() => {
        if (!config) return 1;
        return config.visibleCols.length > 0 ? config.visibleCols[0] : 1;
    });

    function parseNumericCell(value: string): number | null {
        const cleaned = value.replace(/[^0-9.-]/g, "");
        if (!cleaned || cleaned === "-" || cleaned === ".") return null;
        const parsed = Number.parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function buildChartData(columnIndex: number) {
        if (!config || filteredRows.length === 0) return [];

        const samples = filteredRows
            .map((row) => (row[columnIndex] ?? "").trim())
            .filter(Boolean)
            .slice(0, 25);

        const numericSampleCount = samples.filter(
            (value) => parseNumericCell(value) !== null,
        ).length;
        const useNumericAggregation =
            samples.length > 0 &&
            numericSampleCount >= Math.ceil(samples.length * 0.6);

        const agg = new Map<string, number>();

        for (const row of filteredRows) {
            const columnValue = (row[columnIndex] ?? "").trim();
            if (!columnValue) continue;

            if (useNumericAggregation) {
                const label = (row[labelColIdx] ?? "").trim();
                if (!label) continue;
                const value = parseNumericCell(columnValue) ?? 0;
                if (value <= 0) continue;
                agg.set(label, (agg.get(label) ?? 0) + value);
            } else {
                agg.set(columnValue, (agg.get(columnValue) ?? 0) + 1);
            }
        }

        return [...agg.entries()]
            .map(([label, value]) => ({ label, value }))
            .filter((d) => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 25);
    }

    // ── Chart 1: colIndex ─────────────────────────────────────
    let chart1 = $derived.by(() =>
        config ? buildChartData(config.colIndex) : [],
    );

    // ── Chart 2: colIndex2 ────────────────────────────────────
    let chart2 = $derived.by(() =>
        config ? buildChartData(config.colIndex2) : [],
    );

    let chart1Label = $derived(headers[config?.colIndex ?? 0] ?? "Grafik 1");
    let chart2Label = $derived(headers[config?.colIndex2 ?? 0] ?? "Grafik 2");
    let labelColumnLabel = $derived(headers[labelColIdx] ?? "Label");

    let chart1TopData = $derived(chart1.slice(0, 12));
    let chart2TopData = $derived.by(() => {
        const base = chart2.slice(0, 7);
        const others = chart2
            .slice(7)
            .reduce((sum, item) => sum + item.value, 0);

        return others > 0
            ? [...base, { label: "Lainnya", value: others }]
            : base;
    });

    let chart1Total = $derived(
        chart1.reduce((sum, item) => sum + item.value, 0),
    );
    let chart2Total = $derived(
        chart2.reduce((sum, item) => sum + item.value, 0),
    );

    // ── TanStack columns ─────────────────────────────────────
    let tableColumns = $derived.by(() => {
        if (!config || headers.length === 0) return [];

        const indices =
            config.visibleCols.length > 0
                ? config.visibleCols.filter((i) => i < headers.length)
                : headers.map((_, i) => i);

        const noCol = {
            id: "_no",
            accessorKey: "_no",
            header: "No",
            enableSorting: false,
            size: 48,
        };

        const dataCols = indices.map((i) => ({
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
            row.forEach((val, i) => {
                obj[String(i)] = val;
            });
            return obj;
        }),
    );
</script>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- Dataset tabs                                                -->
<!-- ══════════════════════════════════════════════════════════ -->
<div
    class="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-ink/10 no-scrollbar"
>
    {#each DATASET_IDS as id}
        <button
            type="button"
            onclick={() => {
                selectedId = id;
            }}
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
        <div
            class="w-5 h-5 border-2 border-ink/15 border-t-green rounded-full animate-spin"
        ></div>
        <span class="text-sm text-ink/40 font-medium">Memuat data…</span>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- Error                                                        -->
    <!-- ══════════════════════════════════════════════════════════ -->
{:else if errorMsg}
    <div class="flex flex-col items-center justify-center py-24 text-center">
        <Icon
            icon="mdi:alert-circle"
            width="36"
            height="36"
            class="text-ink/15 mb-3"
        />
        <p class="text-sm font-bold text-ink/30 uppercase tracking-wider mb-3">
            {errorMsg}
        </p>
        <button
            type="button"
            onclick={loadData}
            class="text-xs font-bold text-green hover:underline uppercase tracking-wider"
        >
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
                <Icon
                    icon="mdi:clock-outline"
                    width="11"
                    height="11"
                    class="shrink-0"
                />
                Diperbarui:
                <strong class="text-ink/45 ml-0.5">{lastUpdate}</strong>
            </div>
        {/if}
    </div>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- Two charts side by side                             -->
    <!-- ══════════════════════════════════════════════════ -->
    {#if chart1.length > 0 || chart2.length > 0}
        <div class="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-10">
            <div class="xl:col-span-3">
                <PortalHorizontalBarChart
                    title={chart1Label}
                    data={chart1TopData}
                    total={chart1Total}
                    labelColumn={labelColumnLabel}
                    topLabel={chart1.length === 25
                        ? "Top 12 dari 25"
                        : "Top 12"}
                />
            </div>
            <div class="xl:col-span-2">
                <PortalDonutChart
                    title={chart2Label}
                    data={chart2TopData}
                    total={chart2Total}
                    labelColumn={labelColumnLabel}
                />
            </div>
        </div>
    {/if}

    <!-- ══════════════════════════════════════════════════ -->
    <!-- Table                                               -->
    <!-- ══════════════════════════════════════════════════ -->
    {#if config?.table && tableColumns.length > 0}
        <div class="mb-10">
            <!-- Table header bar -->
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-1 h-5 bg-green shrink-0"></div>
                    <h3
                        class="text-[11px] font-black uppercase tracking-[0.18em] text-green"
                    >
                        Tabel Data
                    </h3>
                    <span class="text-[10px] text-ink/30">
                        {searchedRows.length} / {filteredRows.length} baris
                    </span>
                </div>

                <!-- Search -->
                <div
                    class="flex items-center gap-2 border border-ink/15 bg-cream px-3 py-1.5 focus-within:border-green transition-colors"
                >
                    <Icon
                        icon="mdi:magnify"
                        width="13"
                        height="13"
                        class="text-ink/30 shrink-0"
                    />
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Cari…"
                        class="bg-transparent text-[12px] text-ink outline-none placeholder:text-ink/30 w-36"
                    />
                    {#if searchQuery}
                        <button
                            type="button"
                            onclick={() => {
                                searchQuery = "";
                            }}
                            class="text-ink/30 hover:text-ink transition-colors"
                        >
                            <Icon icon="mdi:close" width="13" height="13" />
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
        <Icon
            icon="mdi:chart-bar"
            width="40"
            height="40"
            class="text-ink/10 mb-4"
        />
        <p class="text-sm font-bold text-ink/25 uppercase tracking-wider">
            Pilih dataset untuk memulai
        </p>
    </div>
{/if}

<style>
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
