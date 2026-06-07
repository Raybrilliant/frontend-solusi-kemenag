<script lang="ts">
    import Icon from "@iconify/svelte";
    import type {
        Chart as ChartInstance,
        ChartConfiguration,
        TooltipItem,
    } from "chart.js";

    type ChartDatum = {
        label: string;
        value: number;
    };

    interface Props {
        title: string;
        data: ChartDatum[];
        total?: number;
        labelColumn?: string;
    }

    let { title, data, total = 0, labelColumn = "Label" }: Props = $props();

    const palette = [
        "#0F6B44",
        "#2F8A63",
        "#52A87C",
        "#78BF97",
        "#F6C744",
        "#E6B83B",
        "#D9A227",
        "#1E4134",
    ];

    let canvas = $state<HTMLCanvasElement | null>(null);
    let chart: ChartInstance | null = null;

    let leader = $derived(data[0] ?? null);
    let topThree = $derived(data.slice(0, 3));

    function fmt(n: number): string {
        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} M`;
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} Jt`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)} Rb`;
        return n.toLocaleString("id-ID");
    }

    function pct(value: number, base: number): string {
        if (!base) return "0%";
        return `${((value / base) * 100).toFixed(1)}%`;
    }

    function tooltipLabel(context: TooltipItem<"doughnut">) {
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

            const config: ChartConfiguration<"doughnut"> = {
                type: "doughnut",
                data: {
                    labels: items.map((item) => item.label),
                    datasets: [
                        {
                            label: heading,
                            data: items.map((item) => item.value),
                            backgroundColor: items.map(
                                (_, index) => palette[index % palette.length],
                            ),
                            borderColor: "#F8F5EE",
                            borderWidth: 3,
                            hoverOffset: 8,
                            spacing: 3,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "66%",
                    animation: {
                        duration: 1000,
                        easing: "easeOutQuart",
                    },
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                usePointStyle: true,
                                pointStyle: "circle",
                                boxWidth: 10,
                                boxHeight: 10,
                                color: "rgba(33, 33, 33, 0.72)",
                                padding: 18,
                                font: {
                                    size: 11,
                                    weight: 600,
                                },
                            },
                        },
                        tooltip: {
                            backgroundColor: "rgba(18, 24, 23, 0.95)",
                            titleColor: "#F8F5EE",
                            bodyColor: "#F8F5EE",
                            padding: 12,
                            callbacks: {
                                label: tooltipLabel,
                                afterLabel: (context) =>
                                    `Porsi: ${pct(Number(context.raw ?? 0), total)}`,
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

<div
    class="border border-ink/10 bg-white/80 overflow-hidden shadow-[0_16px_40px_rgba(246,199,68,0.08)]"
>
    <div
        class="px-5 md:px-6 py-5 border-b border-ink/8 bg-[linear-gradient(180deg,rgba(248,245,238,0.95),rgba(248,245,238,0.78))]"
    >
        <div class="flex items-start justify-between gap-4">
            <div>
                <div
                    class="inline-flex items-center gap-2 rounded-full bg-yellow/20 border border-yellow/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-ink"
                >
                    <span class="w-2 h-2 rounded-full bg-yellow"></span>
                    Distribusi
                </div>
                <h3
                    class="mt-3 text-base md:text-lg font-black uppercase tracking-tight text-ink"
                >
                    {title}
                </h3>
                <p class="mt-1 text-xs text-ink/45">
                    Sebaran komposisi nilai berdasarkan <strong
                        class="text-ink/65">{labelColumn}</strong
                    >
                </p>
            </div>
            <div
                class="hidden sm:flex items-center justify-center w-11 h-11 rounded-full bg-yellow/25 text-ink shrink-0"
            >
                <Icon icon="mdi:chart-donut" width="22" height="22" />
            </div>
        </div>
    </div>

    {#if data.length > 0}
        <div class="p-4 md:p-6">
            <div class="relative h-90">
                <canvas bind:this={canvas}></canvas>
                <div
                    class="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                    <div
                        class="rounded-full bg-white/92 border border-ink/8 px-4 py-3 text-center shadow-sm"
                    >
                        <p
                            class="text-[10px] font-black uppercase tracking-[0.18em] text-ink/35"
                        >
                            Total
                        </p>
                        <p class="mt-1 text-lg font-black text-ink">
                            {fmt(total)}
                        </p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                {#each topThree as item, index}
                    <div class="border border-ink/8 bg-white/70 px-4 py-3">
                        <div class="flex items-center gap-2 mb-2">
                            <span
                                class="w-2.5 h-2.5 rounded-full"
                                style={`background:${palette[index % palette.length]}`}
                            ></span>
                            <p
                                class="text-[10px] font-black uppercase tracking-[0.18em] text-ink/35"
                            >
                                Peringkat {index + 1}
                            </p>
                        </div>
                        <p
                            class="text-sm font-bold text-ink truncate"
                            title={item.label}
                        >
                            {item.label}
                        </p>
                        <p class="text-xs text-ink/45 mt-0.5">
                            {fmt(item.value)} · {pct(item.value, total)}
                        </p>
                    </div>
                {/each}
            </div>

            {#if leader}
                <div
                    class="mt-4 rounded-sm border border-green/10 bg-green/6 px-4 py-3 text-sm text-ink/70"
                >
                    <span
                        class="font-black uppercase tracking-[0.16em] text-[10px] text-green"
                        >Sorotan</span
                    >
                    <p class="mt-1 leading-relaxed">
                        <strong class="text-ink">{leader.label}</strong> menjadi
                        kontributor terbesar pada
                        <strong class="text-ink">{title}</strong>
                        dengan porsi
                        <strong class="text-green"
                            >{pct(leader.value, total)}</strong
                        >.
                    </p>
                </div>
            {/if}
        </div>
    {:else}
        <div class="px-6 py-16 text-center text-ink/35">
            <Icon
                icon="mdi:chart-donut-variant"
                width="28"
                height="28"
                class="mx-auto mb-3"
            />
            <p class="text-sm font-semibold">Belum ada data distribusi</p>
        </div>
    {/if}
</div>
