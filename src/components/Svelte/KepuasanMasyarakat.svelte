<script>
  let { apiUrl } = $props();

  let data    = $state(null);
  let loading = $state(true);

  // ── Donut chart constants ───────────────────────────────
  const R    = 50;
  const CX   = 64, CY = 64;
  const CIRC = 2 * Math.PI * R;

  // Sangat Baik → Baik → Cukup → Kurang
  const COLORS = ['#0F6B44', '#52A87C', '#F6C744', '#D1D5DB'];

  const segments = $derived(
    data
      ? data.breakdown.map((b, i) => ({
          ...b,
          color : COLORS[i],
          len   : (b.pct / 100) * CIRC,
          // rotation so each segment starts where the previous ended
          rot   : data.breakdown.slice(0, i).reduce((s, x) => s + x.pct, 0) * 3.6 - 90,
        }))
      : []
  );

  function scoreLabel(s) {
    if (s >= 3.5) return 'Sangat Baik';
    if (s >= 2.5) return 'Baik';
    if (s >= 1.5) return 'Cukup';
    return 'Kurang';
  }

  async function load() {
    loading = true;
    try {
      const res = await fetch(apiUrl);
      data      = await res.json();
    } finally {
      loading = false;
    }
  }

  $effect(() => { load(); });
</script>


  <!-- Loading skeleton -->
  {#if loading}
    <div class="flex-1 flex items-center gap-6 animate-pulse">
      <div class="flex-1 space-y-4">
        <div class="h-14 bg-gray-200 rounded w-1/2"></div>
        <div class="flex gap-1">
          {#each [1,2,3,4] as _}
            <div class="w-6 h-6 rounded bg-gray-200"></div>
          {/each}
        </div>
        <div class="h-5 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div class="w-36 h-36 rounded-full bg-gray-200 shrink-0"></div>
    </div>
    <div class="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 animate-pulse">
      {#each [1,2,3] as _}
        <div class="space-y-2">
          <div class="h-3 bg-gray-200 rounded w-3/4"></div>
          <div class="h-5 bg-gray-100 rounded w-1/2"></div>
        </div>
      {/each}
    </div>

  <!-- Error state -->
  {:else if !data || data.error}
    <div class="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      <p class="text-sm">Gagal memuat data. Periksa URL spreadsheet.</p>
    </div>

  <!-- Data loaded -->
  {:else}
    {#key data}
      <div class="flex-1 flex items-center gap-4">

        <!-- Score + Stars -->
        <div class="flex-1">
          <div class="flex items-end gap-2">
            <span class="text-6xl font-bold leading-none">{data.score.toFixed(2)}</span>
            <span class="text-2xl text-gray-400 mb-1 font-medium">/ 4</span>
          </div>

          <!-- Fractional stars -->
          <div class="flex items-center gap-0.5 mt-3">
            {#each [0,1,2,3] as i}
              {@const fill = Math.min(1, Math.max(0, data.score - i))}
              <div class="relative w-6 h-6">
                <svg class="absolute" width="24" height="24" viewBox="0 0 24 24" fill="#E5E7EB">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <div class="absolute overflow-hidden" style="width:{fill*100}%">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#F6C744">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            {/each}
          </div>

          <p class="text-green font-bold text-lg mt-2 uppercase">{scoreLabel(data.score)}</p>
        </div>

        <!-- Donut chart -->
        <div class="shrink-0">
          <svg viewBox="0 0 128 128" class="w-36 h-36" style="overflow:visible">
            <!-- Track -->
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F3F4F6" stroke-width="16"/>

            <!-- Colored segments — draw-in via SMIL animate -->
            {#each segments as seg, i}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                stroke-width="16"
                stroke-dasharray="{seg.len} {CIRC}"
                stroke-linecap="butt"
                transform="rotate({seg.rot} {CX} {CY})"
              >
                <animate
                  attributeName="stroke-dasharray"
                  from="0 {CIRC}"
                  to="{seg.len} {CIRC}"
                  dur="0.45s"
                  begin="{(i * 0.1).toFixed(2)}s"
                  fill="freeze"
                />
              </circle>
            {/each}

            <!-- Center: thumbs up -->
            <g transform="translate(52,52)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#0F6B44">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
            </g>
          </svg>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 mt-5 pt-4 border-t border-gray-100">
        <div class="flex flex-col gap-0.5">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Responden</p>
          <p class="text-2xl font-bold tabular-nums">{data.totalResponden.toLocaleString('id-ID')}</p>
        </div>
        <div class="flex flex-col gap-0.5 border-l border-gray-100 pl-4">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Positif</p>
          <p class="text-2xl font-bold tabular-nums flex items-center gap-0.5 text-green">
            {data.positifPct}%
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14l5-5 5 5z"/>
            </svg>
          </p>
        </div>
        <div class="flex flex-col gap-0.5 border-l border-gray-100 pl-4">
          <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Periode</p>
          <p class="text-base font-bold leading-tight">{data.periode}</p>
        </div>
      </div>
    {/key}
  {/if}
