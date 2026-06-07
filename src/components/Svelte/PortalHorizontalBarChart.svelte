<script lang="ts">
    import Icon from "@iconify/svelte";
    import type { Chart as ChartInstance, ChartConfiguration, TooltipItem } from "chart.js";

    type ChartDatum = {
        label: string;
        value: number;
    };

    interface Props {
        title: string;
        data: ChartDatum[];
        total?: number;
        labelColumn?: string;
        topLabel?: string;
    }

    let {
        title,
        data,
        total = 0,
        labelColumn = "Label",
        topLabel = "Top 12",
    }: Props = $props();

    let canvas = $state<HTMLCanvasElement | null>(null);
    let chart: ChartInstance | null = null;

    let leader = $derived(data[0] ?? null);

    function fmt(n: number): string {
        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} M`;
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} Jt`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)} Rb`;
        return n.toLocaleString("id-ID");
    }

    function tooltipLabel(context: TooltipItem<"bar">) {
        const label = context.label ? `${context.label}: ` : "";
        return `${label}${fmt(Number(context.raw ?? 0))}`;
    }

    $effect(() => {
        const el = canvas;
        const items = data;
        const heading = title;

        if (!el || items.length === 0) {
            chart?.destroy();
            chart = null;
            return;
        }

        let cancelled = false;

        void import("chart.js/auto").then(({ default: Chart }) => {
            if (cancelled) return;
            chart?.destroy();

            const ctx = el.getContext("2d");
            if (!ctx) return;

            const gradient = ctx.createLinearGradient(0, 0, el.width || 640, 0);
            gradient.addColorStop(0, "rgba(15, 107, 68, 0.98)");
            gradient.addColorStop(0.72, "rgba(82, 168, 124, 0.9)");
            gradient.addColorStop(1, "rgba(246, 199, 68, 0.92)");

            const config: ChartConfiguration<"bar"> = {
                type: "bar",
                data: {
                    labels: items.map((item) => item.label),
                    datasets: [
                        {
                            label: heading,
                            data: items.map((item) => item.value),
                            backgroundColor: gradient,
                            borderRadius: 12,
                            borderSkipped: false,
                            maxBarThickness: 24,
                            hoverBackgroundColor: "rgba(15, 107, 68, 0.9)",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y",
                    animation: {
                        duration: 950,
                        easing: "easeOutQuart",
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: "rgba(18, 24, 23, 0.95)",
                            titleColor: "#F8F5EE",
                            bodyColor: "#F8F5EE",
                            displayColors: false,
                            padding: 12,
                            callbacks: {
                                label: tooltipLabel,
                            },
                        },
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                color: "rgba(33, 33, 33, 0.55)",
                                callback: (value) => fmt(Number(value)),
                                font: {
                                    size: 10,
                                },
                            },
                            grid: {
                                color: "rgba(17, 24, 39, 0.08)",
                            },
                            border: {
                                display: false,
                            },
                        },
                        y: {
                            ticks: {
                                color: "rgba(33, 33, 33, 0.78)",
                                font: {
                                    size: 11,
                                    weight: 600,
                                },
                            },
                            grid: {
                                display: false,
                            },
                            border: {
                                display: false,
                            },
                        },
                    },
                },
            };

            chart = new Chart(ctx, config);
        });

        return () => {
            cancelled = true;
            chart?.destroy();
            chart = null;
        };
    });
</script>

<div class="border border-ink/10 bg-white/80 overflow-hidden shadow-[0_16px_40px_rgba(15,107,68,0.08)]">
    <div class="px-5 md:px-6 py-5 border-b border-ink/8 bg-[linear-gradient(180deg,rgba(248,245,238,0.95),rgba(248,245,238,0.78))]">
        <div class="flex items-start justify-between gap-4">
            <div>
                <div class="inline-flex items-center gap-2 rounded-full bg-green/8 border border-green/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-green">
                    <span class="w-2 h-2 rounded-full bg-green"></span>
                    {topLabel}
                </div>
                <h3 class="mt-3 text-base md:text-lg font-black uppercase tracking-tight text-ink">
                    {title}
                </h3>
                <p class="mt-1 text-xs text-ink/45">
                    Peringkat nilai agregat berdasarkan <strong class="text-ink/65">{labelColumn}</strong>
                </p>
            </div>
            <div class="hidden sm:flex items-center justify-center w-11 h-11 rounded-full bg-green/10 text-green shrink-0">
                <Icon icon="mdi:chart-bar" width="22" height="22" />
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div class="border border-ink/8 bg-white/70 px-4 py-3">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-ink/35">Akumulasi</p>
                <p class="mt-1 text-xl font-black text-ink">{fmt(total)}</p>
            </div>
            <div class="border border-ink/8 bg-white/70 px-4 py-3">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-ink/35">Teratas</p>
                {#if leader}
                    <p class="mt-1 text-sm font-bold text-ink truncate" title={leader.label}>{leader.label}</p>
                    <p class="text-xs text-green font-semibold mt-0.5">{fmt(leader.value)}</p>
                {:else}
                    <p class="mt-1 text-sm text-ink/40">Belum ada data</p>
                {/if}
            </div>
        </div>
    </div>

    {#if data.length > 0}
        <div class="p-4 md:p-6">
            <div class="h-[420px]">
                <canvas bind:this={canvas}></canvas>
            </div>
        </div>
    {:else}
        <div class="px-6 py-16 text-center text-ink/35">
            <Icon icon="mdi:chart-bar-off" width="28" height="28" class="mx-auto mb-3" />
            <p class="text-sm font-semibold">Belum ada data grafik</p>
        </div>
    {/if}
</div>
