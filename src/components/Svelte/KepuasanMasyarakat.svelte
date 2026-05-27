<script>
  let { apiUrl = "/api/survei/public-averages?period=12" } = $props();

  const surveyTypes = [
    { value: "SKM", label: "SKM", title: "Kepuasan Masyarakat" },
    { value: "SPKP", label: "SPKP", title: "Persepsi Kualitas Pelayanan" },
    { value: "SPAK", label: "SPAK", title: "Persepsi Anti Korupsi" },
  ];

  const quarters = [
    { value: 1, label: "Triwulan I", months: [0, 1, 2] },
    { value: 2, label: "Triwulan II", months: [3, 4, 5] },
    { value: 3, label: "Triwulan III", months: [6, 7, 8] },
    { value: 4, label: "Triwulan IV", months: [9, 10, 11] },
  ];

  let data = $state([]);
  let loading = $state(true);
  let error = $state("");

  const currentYear = new Date().getFullYear();

  const rowsByType = $derived.by(() => {
    return surveyTypes.map((type) => ({
      ...type,
      quarters: quarters.map((quarter) => {
        const bucket = {
          scoreTotal: 0,
          scoreWeight: 0,
          questionIds: new Set(),
          monthlyRespondents: new Map(),
        };

        for (const item of data) {
          if (item.surveyType !== type.value) continue;

          const monthDate = parseMonth(item.month);
          if (!monthDate || monthDate.getFullYear() !== currentYear) continue;
          if (!quarter.months.includes(monthDate.getMonth())) continue;

          const average = Number(item.average);
          const responseCount = Number(item.responseCount) || 0;
          if (!Number.isFinite(average)) continue;

          bucket.scoreTotal += average * Math.max(responseCount, 1);
          bucket.scoreWeight += Math.max(responseCount, 1);
          if (item.questionId) bucket.questionIds.add(item.questionId);

          const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
          bucket.monthlyRespondents.set(
            monthKey,
            Math.max(bucket.monthlyRespondents.get(monthKey) ?? 0, responseCount),
          );
        }

        const average = bucket.scoreWeight
          ? bucket.scoreTotal / bucket.scoreWeight
          : 0;
        const respondents = Array.from(bucket.monthlyRespondents.values()).reduce(
          (sum, value) => sum + value,
          0,
        );

        return {
          ...quarter,
          average,
          respondents,
          questionCount: bucket.questionIds.size,
          category: scoreCategory(average),
        };
      }),
    }));
  });

  const totalRespondents = $derived(
    quarters.reduce((sum, quarter, index) => {
      const quarterRespondents = rowsByType.map(
        (type) => type.quarters[index]?.respondents ?? 0,
      );
      return sum + Math.max(...quarterRespondents, 0);
    }, 0),
  );

  const overallAverage = $derived.by(() => {
    let scoreTotal = 0;
    let weight = 0;
    for (const type of rowsByType) {
      for (const quarter of type.quarters) {
        if (!quarter.respondents) continue;
        scoreTotal += quarter.average * quarter.respondents;
        weight += quarter.respondents;
      }
    }
    return weight ? scoreTotal / weight : 0;
  });

  function parseMonth(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    const iso = raw.match(/^(\d{4})-(\d{1,2})/);
    if (iso) {
      const date = new Date(Number(iso[1]), Number(iso[2]) - 1, 1);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function scoreCategory(score) {
    if (!score) return "-";
    if (score >= 3.5) return "Sangat Baik";
    if (score >= 2.5) return "Baik";
    if (score >= 1.5) return "Cukup";
    return "Kurang";
  }

  function categoryClass(category) {
    if (category === "Sangat Baik") return "bg-green/10 text-green";
    if (category === "Baik") return "bg-sky-100 text-sky-700";
    if (category === "Cukup") return "bg-amber-100 text-amber-700";
    if (category === "Kurang") return "bg-red-100 text-red-600";
    return "bg-black/6 text-gray-500";
  }

  function formatScore(score) {
    if (!score) return "-";
    return score.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function load() {
    loading = true;
    error = "";
    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message ?? "Gagal memuat data survei.");
      }
      data = Array.isArray(json.data) ? json.data : [];
    } catch (e) {
      error = String(e);
      data = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    load();
  });
</script>

{#if loading}
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-pulse">
    {#each [1, 2, 3] as _}
      <div class="border border-black/10 rounded-lg p-4 space-y-4">
        <div class="h-5 bg-gray-200 rounded w-2/3"></div>
        <div class="grid grid-cols-2 gap-2">
          {#each [1, 2, 3, 4] as _}
            <div class="h-24 bg-gray-100 rounded"></div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{:else if error}
  <div class="py-10 text-center text-sm text-red-500">
    {error}
  </div>
{:else}
  <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="border border-black/10 rounded-lg p-4 bg-white/40">
      <p class="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
        Tahun Berjalan
      </p>
      <p class="text-2xl font-bold mt-1">{currentYear}</p>
    </div>
    <div class="border border-black/10 rounded-lg p-4 bg-white/40">
      <p class="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
        Rata-rata Gabungan
      </p>
      <p class="text-2xl font-bold mt-1">{formatScore(overallAverage)} / 4</p>
    </div>
    <div class="border border-black/10 rounded-lg p-4 bg-white/40">
      <p class="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
        Total Responden
      </p>
      <p class="text-2xl font-bold mt-1">
        {totalRespondents.toLocaleString("id-ID")}
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-3">
    {#each rowsByType as type}
      <article class="border border-black/10 rounded-lg p-4 bg-white/40">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold text-green bg-green/10 rounded-full px-2.5 py-1">
              {type.label}
            </span>
            <h3 class="font-bold text-sm md:text-base mt-2 leading-tight">
              {type.title}
            </h3>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2">
          {#each type.quarters as quarter}
            <div class="border border-black/8 rounded-lg p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-bold uppercase text-gray-500">
                  {quarter.label}
                </p>
                <span
                  class={`rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryClass(quarter.category)}`}
                >
                  {quarter.category}
                </span>
              </div>
              <div class="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p class="text-[10px] uppercase tracking-widest text-gray-400">
                    Nilai
                  </p>
                  <p class="text-2xl font-bold leading-none">
                    {formatScore(quarter.average)}
                  </p>
                </div>
                <p class="text-xs text-gray-400">/ 4</p>
              </div>
              <dl class="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                <div>
                  <dt class="text-[10px] uppercase text-gray-400 font-semibold">
                    Responden
                  </dt>
                  <dd class="text-sm font-bold">
                    {quarter.respondents.toLocaleString("id-ID")}
                  </dd>
                </div>
                <div class="border-l border-gray-100 pl-3">
                  <dt class="text-[10px] uppercase text-gray-400 font-semibold">
                    Indikator
                  </dt>
                  <dd class="text-sm font-bold">
                    {quarter.questionCount.toLocaleString("id-ID")}
                  </dd>
                </div>
              </dl>
            </div>
          {/each}
        </div>
      </article>
    {/each}
  </div>
{/if}
