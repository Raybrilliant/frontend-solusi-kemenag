<script>
    import Icon from "@iconify/svelte";
    import { untrack } from "svelte";

    let { apiUrl, periods = ["3 Bulan", "6 Bulan", "1 Tahun"] } = $props();

    let cache = {};
    let period = $state(untrack(() => periods[0] ?? periods[0]));
    let d = $state(null);
    let loading = $state(true);
    let dropOpen = $state(false);

    // ── SVG layout ─────────────────────────────────────────
    const VW = 560,
        VH = 230;
    const pad = { t: 28, r: 52, b: 34, l: 50 };
    const cW = VW - pad.l - pad.r;
    const cH = VH - pad.t - pad.b;

    function niceStep(maxVal) {
        const rough = maxVal / 5;
        const mag = Math.pow(10, Math.floor(Math.log10(rough)));
        const n = rough / mag;
        if (n < 1.5) return mag;
        if (n < 3.5) return 2 * mag;
        if (n < 7.5) return 5 * mag;
        return 10 * mag;
    }

    const masukSeries = $derived(d ? (d.masuk ?? d.total ?? []) : []);
    const selesaiSeries = $derived(d ? (d.selesai ?? []) : []);
    const ditolakSeries = $derived(d ? (d.ditolak ?? d.proses ?? []) : []);
    const n = $derived(d ? d.labels.length : 0);
    const rawMax = $derived(
        d ? Math.max(0, ...masukSeries, ...selesaiSeries, ...ditolakSeries) : 0,
    );
    const step = $derived(rawMax > 0 ? niceStep(rawMax) : 100);
    const yMax = $derived(Math.ceil(rawMax / step) * step + step);
    const yTicks = $derived(
        Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step),
    );

    function xp(i) {
        return pad.l + (i / Math.max(n - 1, 1)) * cW;
    }
    function yp(v) {
        return pad.t + cH * (1 - v / yMax);
    }

    function linePath(arr) {
        return arr
            .map(
                (v, i) =>
                    `${i === 0 ? "M" : "L"}${xp(i).toFixed(1)},${yp(v).toFixed(1)}`,
            )
            .join(" ");
    }
    function areaPath(arr) {
        return `${linePath(arr)} L${xp(n - 1).toFixed(1)},${yp(0).toFixed(1)} L${xp(0).toFixed(1)},${yp(0).toFixed(1)} Z`;
    }

    function fmt(v) {
        if (v === 0) return "0";
        if (v >= 1000) {
            const k = v / 1000;
            return (Number.isInteger(k) ? k : k.toFixed(1)) + "K";
        }
        return String(v);
    }
    function badgeW(v) {
        return Math.max(28, fmt(v).length * 7 + 14);
    }

    // dot delay: mapped so dot at index i appears when the line reaches it
    function dotDelay(i) {
        return (0.05 + (i / Math.max(n - 1, 1)) * 0.65).toFixed(2) + "s";
    }

    const masukLine = $derived(d ? linePath(masukSeries) : "");
    const selesaiLine = $derived(d ? linePath(selesaiSeries) : "");
    const ditolakLine = $derived(d ? linePath(ditolakSeries) : "");
    const masukArea = $derived(d ? areaPath(masukSeries) : "");
    const selesaiArea = $derived(d ? areaPath(selesaiSeries) : "");

    const lastMasuk = $derived(
        d && n > 0 && masukSeries.length
            ? {
                  x: xp(n - 1),
                  y: yp(masukSeries[n - 1]),
                  v: masukSeries[n - 1],
                  bw: badgeW(masukSeries[n - 1]),
              }
            : null,
    );
    const lastSelesai = $derived(
        d && n > 0 && selesaiSeries.length
            ? {
                  x: xp(n - 1),
                  y: yp(selesaiSeries[n - 1]),
                  v: selesaiSeries[n - 1],
                  bw: badgeW(selesaiSeries[n - 1]),
              }
            : null,
    );
    const lastDitolak = $derived(
        d && n > 0 && ditolakSeries.length
            ? {
                  x: xp(n - 1),
                  y: yp(ditolakSeries[n - 1]),
                  v: ditolakSeries[n - 1],
                  bw: badgeW(ditolakSeries[n - 1]),
              }
            : null,
    );

    async function loadPeriod(p) {
        if (cache[p]) {
            d = cache[p];
            loading = false;
            return;
        }
        loading = true;
        try {
            const res = await fetch(
                `${apiUrl}?period=${encodeURIComponent(p)}`,
            );
            const json = await res.json();
            const payload = json.data ?? json;
            cache[p] = payload;
            d = payload;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        loadPeriod(period);
    });
</script>

<div class="border rounded-lg p-5 h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
            <Icon
                icon="mdi:trending-up"
                width="18"
                height="18"
                class="text-green shrink-0"
            />
            <h2 class="font-bold uppercase text-xl tracking-tight">
                Trend Layanan
            </h2>
        </div>

        <!-- Dropdown -->
        <div class="relative text-xs">
            <button
                class="flex items-center gap-1.5 border rounded px-3 py-1.5 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                onclick={() => (dropOpen = !dropOpen)}
                disabled={loading}
            >
                {period}
                {#if loading}
                    <Icon
                        icon="mdi:loading"
                        class="animate-spin"
                        width="11"
                        height="11"
                    />
                {:else}
                    <Icon icon="mdi:chevron-down" width="11" height="11" />
                {/if}
            </button>
            {#if dropOpen}
                <ul
                    class="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-10 min-w-full overflow-hidden"
                >
                    {#each periods as p}
                        <li>
                            <button
                                class="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors {p ===
                                period
                                    ? 'font-semibold text-green'
                                    : 'text-gray-600'}"
                                onclick={() => {
                                    period = p;
                                    dropOpen = false;
                                }}>{p}</button
                            >
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 mb-2 text-xs text-gray-600">
        <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-green inline-block"
            ></span>Layanan Masuk
        </span>
        <span class="flex items-center gap-1.5">
            <span
                class="w-3 h-3 rounded-full inline-block"
                style="background:#52A87C"
            ></span>Selesai
        </span>
        <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-red-400 inline-block"
            ></span>Ditolak
        </span>
    </div>

    <!-- Skeleton (loading) -->
    {#if loading || !d}
        <svg
            viewBox="0 0 {VW} {VH}"
            class="w-full animate-pulse"
            style="overflow:visible"
        >
            {#each [0, 1, 2, 3, 4] as i}
                {@const ty = pad.t + (cH / 4) * i}
                <line
                    x1={pad.l}
                    y1={ty}
                    x2={pad.l + cW}
                    y2={ty}
                    stroke="#e5e7eb"
                    stroke-width="1"
                />
                <rect
                    x={4}
                    y={ty - 6}
                    width={38}
                    height={12}
                    rx="3"
                    fill="#e5e7eb"
                />
            {/each}
            <rect
                x={pad.l}
                y={pad.t + cH * 0.25}
                width={cW}
                height={6}
                rx="3"
                fill="#d1fae5"
            />
            <rect
                x={pad.l}
                y={pad.t + cH * 0.45}
                width={cW}
                height={6}
                rx="3"
                fill="#e5e7eb"
            />
            <rect
                x={pad.l}
                y={pad.t + cH * 0.65}
                width={cW}
                height={6}
                rx="3"
                fill="#fef3c7"
            />
        </svg>

        <!-- Chart — {#key d} forces remount so animations replay on every data change -->
    {:else}
        {#key d}
            <svg
                viewBox="0 0 {VW} {VH}"
                class="w-full"
                style="overflow:visible"
            >
                <defs>
                    <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="0%"
                            stop-color="#0F6B44"
                            stop-opacity="0.18"
                        />
                        <stop
                            offset="100%"
                            stop-color="#0F6B44"
                            stop-opacity="0.02"
                        />
                    </linearGradient>
                    <linearGradient
                        id="grad-selesai"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stop-color="#52A87C"
                            stop-opacity="0.22"
                        />
                        <stop
                            offset="100%"
                            stop-color="#52A87C"
                            stop-opacity="0.03"
                        />
                    </linearGradient>
                </defs>

                <!-- Y-axis grid + labels -->
                {#each yTicks as tick}
                    {@const ty = yp(tick)}
                    <line
                        x1={pad.l}
                        y1={ty}
                        x2={pad.l + cW}
                        y2={ty}
                        stroke="#e5e7eb"
                        stroke-width="1"
                    />
                    <text
                        x={pad.l - 8}
                        y={ty + 4}
                        text-anchor="end"
                        font-size="11"
                        fill="#9ca3af">{fmt(tick)}</text
                    >
                {/each}

                <!-- Area fills — fade in after lines are drawn -->
                <path class="area-anim" d={masukArea} fill="url(#grad-total)" />
                <path
                    class="area-anim"
                    d={selesaiArea}
                    fill="url(#grad-selesai)"
                    style="animation-delay:0.1s"
                />

                <!-- Lines — draw left-to-right via stroke-dashoffset -->
                <path
                    class="line-anim"
                    d={selesaiLine}
                    fill="none"
                    stroke="#52A87C"
                    stroke-width="2"
                    stroke-linejoin="round"
                    pathLength="1"
                />
                <path
                    class="line-anim"
                    d={masukLine}
                    fill="none"
                    stroke="#0F6B44"
                    stroke-width="2.5"
                    stroke-linejoin="round"
                    pathLength="1"
                    style="animation-delay:0.05s"
                />
                <path
                    class="line-anim"
                    d={ditolakLine}
                    fill="none"
                    stroke="#F87171"
                    stroke-width="2"
                    stroke-linejoin="round"
                    pathLength="1"
                    style="animation-delay:0.1s"
                />

                <!-- Selesai dots + labels — pop in as line reaches them -->
                {#each selesaiSeries as v, i}
                    {@const cx = xp(i)}
                    {@const cy = yp(v)}
                    <circle
                        class="dot-anim"
                        {cx}
                        {cy}
                        r="3.5"
                        fill="#52A87C"
                        stroke="white"
                        stroke-width="1.5"
                        style="animation-delay:{dotDelay(i)}"
                    />
                    {#if i < n - 1}
                        <text
                            class="label-anim"
                            x={cx}
                            y={cy - 8}
                            text-anchor="middle"
                            font-size="10"
                            font-weight="600"
                            fill="#52A87C"
                            style="animation-delay:{dotDelay(i)}">{fmt(v)}</text
                        >
                    {/if}
                {/each}

                <!-- Total dots + labels -->
                {#each masukSeries as v, i}
                    {@const cx = xp(i)}
                    {@const cy = yp(v)}
                    <circle
                        class="dot-anim"
                        {cx}
                        {cy}
                        r="4"
                        fill="#0F6B44"
                        stroke="white"
                        stroke-width="1.5"
                        style="animation-delay:{dotDelay(i)}"
                    />
                    {#if i < n - 1}
                        <text
                            class="label-anim"
                            x={cx}
                            y={cy - 9}
                            text-anchor="middle"
                            font-size="10"
                            font-weight="600"
                            fill="#0F6B44"
                            style="animation-delay:{dotDelay(i)}">{fmt(v)}</text
                        >
                    {/if}
                {/each}

                <!-- Ditolak dots + labels -->
                {#each ditolakSeries as v, i}
                    {@const cx = xp(i)}
                    {@const cy = yp(v)}
                    <circle
                        class="dot-anim"
                        {cx}
                        {cy}
                        r="4"
                        fill="#F87171"
                        stroke="white"
                        stroke-width="1.5"
                        style="animation-delay:{dotDelay(i)}"
                    />
                    {#if i < n - 1}
                        <text
                            class="label-anim"
                            x={cx}
                            y={cy - 9}
                            text-anchor="middle"
                            font-size="10"
                            font-weight="600"
                            fill="#DC2626"
                            style="animation-delay:{dotDelay(i)}">{fmt(v)}</text
                        >
                    {/if}
                {/each}

                <!-- Last-point badges — spring pop-in at the very end -->
                {#if lastMasuk}
                    <g
                        class="badge-anim"
                        style="transform-origin:{lastMasuk.x}px {lastMasuk.y -
                            17}px"
                    >
                        <rect
                            x={lastMasuk.x - lastMasuk.bw / 2}
                            y={lastMasuk.y - 26}
                            width={lastMasuk.bw}
                            height={18}
                            rx="4"
                            fill="#0F6B44"
                        />
                        <text
                            x={lastMasuk.x}
                            y={lastMasuk.y - 13}
                            text-anchor="middle"
                            font-size="11"
                            font-weight="700"
                            fill="white">{fmt(lastMasuk.v)}</text
                        >
                    </g>
                {/if}
                {#if lastSelesai}
                    <g
                        class="badge-anim"
                        style="transform-origin:{lastSelesai.x}px {lastSelesai.y -
                            17}px; animation-delay:0.82s"
                    >
                        <rect
                            x={lastSelesai.x - lastSelesai.bw / 2}
                            y={lastSelesai.y - 26}
                            width={lastSelesai.bw}
                            height={18}
                            rx="4"
                            fill="#52A87C"
                        />
                        <text
                            x={lastSelesai.x}
                            y={lastSelesai.y - 13}
                            text-anchor="middle"
                            font-size="11"
                            font-weight="700"
                            fill="white">{fmt(lastSelesai.v)}</text
                        >
                    </g>
                {/if}
                {#if lastDitolak}
                    <g
                        class="badge-anim"
                        style="transform-origin:{lastDitolak.x}px {lastDitolak.y -
                            17}px; animation-delay:0.88s"
                    >
                        <rect
                            x={lastDitolak.x - lastDitolak.bw / 2}
                            y={lastDitolak.y - 26}
                            width={lastDitolak.bw}
                            height={18}
                            rx="4"
                            fill="#F87171"
                        />
                        <text
                            x={lastDitolak.x}
                            y={lastDitolak.y - 13}
                            text-anchor="middle"
                            font-size="11"
                            font-weight="700"
                            fill="white">{fmt(lastDitolak.v)}</text
                        >
                    </g>
                {/if}

                <!-- X-axis labels -->
                {#each d.labels as label, i}
                    <text
                        x={xp(i)}
                        y={VH - 4}
                        text-anchor="middle"
                        font-size="11"
                        fill="#6b7280">{label}</text
                    >
                {/each}
            </svg>
        {/key}
    {/if}
</div>

<style>
    /* ── Lines: draw from left to right ─────────────────── */
    .line-anim {
        stroke-dasharray: 1;
        stroke-dashoffset: 1;
        animation: draw 0.75s ease-out forwards;
    }
    @keyframes draw {
        to {
            stroke-dashoffset: 0;
        }
    }

    /* ── Area fills: fade in after lines finish ──────────── */
    .area-anim {
        opacity: 0;
        animation: fadeIn 0.4s ease-out 0.5s forwards;
    }
    @keyframes fadeIn {
        to {
            opacity: 1;
        }
    }

    /* ── Dots: scale-pop timed to line arrival ───────────── */
    .dot-anim {
        opacity: 0;
        transform: scale(0);
        transform-box: fill-box;
        transform-origin: center;
        animation: dotPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes dotPop {
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    /* ── Value labels: fade-in same timing as dots ────────── */
    .label-anim {
        opacity: 0;
        animation: fadeIn 0.25s ease-out forwards;
    }

    /* ── Badges: spring pop-in at the end ────────────────── */
    .badge-anim {
        opacity: 0;
        transform: scale(0);
        animation: badgePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.78s
            forwards;
    }
    @keyframes badgePop {
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
