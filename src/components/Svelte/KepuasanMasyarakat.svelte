<script>
    import { untrack } from "svelte";

    let {
        apiUrl = "/api/survei/public-averages?period=12",
        initialData = null,
    } = $props();

    const surveyTypes = [
        {
            value: "SPKP",
            label: "SPKP",
            title: "Persepsi Kualitas Pelayanan",
            badgeClass: "bg-sky-100 text-sky-700",
            accentClass: "text-sky-700",
            panelClass: "from-sky-50/80 to-white",
        },
        {
            value: "SPAK",
            label: "SPAK",
            title: "Persepsi Anti Korupsi",
            badgeClass: "bg-amber-100 text-amber-700",
            accentClass: "text-amber-700",
            panelClass: "from-amber-50/80 to-white",
        },
    ];

    const quarters = [
        { value: 1, label: "Triwulan I", months: [0, 1, 2] },
        { value: 2, label: "Triwulan II", months: [3, 4, 5] },
        { value: 3, label: "Triwulan III", months: [6, 7, 8] },
        { value: 4, label: "Triwulan IV", months: [9, 10, 11] },
    ];

    const initialDataValue = untrack(() => initialData);
    const hasInitialData = initialDataValue !== null;
    let data = $state(Array.isArray(initialDataValue) ? initialDataValue : []);
    let loading = $state(!hasInitialData);
    let error = $state("");

    const currentYear = new Date().getFullYear();

    const rowsByType = $derived.by(() => {
        return surveyTypes.map((type) => {
            const quarterRows = quarters.map((quarter) => {
                const bucket = {
                    scoreTotal: 0,
                    scoreWeight: 0,
                    questionIds: new Set(),
                    monthlyRespondents: new Map(),
                };

                for (const item of data) {
                    if (item.surveyType !== type.value) continue;

                    const monthDate = parseMonth(item.month);
                    if (!monthDate || monthDate.getFullYear() !== currentYear)
                        continue;
                    if (!quarter.months.includes(monthDate.getMonth()))
                        continue;

                    const average = Number(item.average);
                    const responseCount = Number(item.responseCount) || 0;
                    if (!Number.isFinite(average)) continue;

                    bucket.scoreTotal += average * Math.max(responseCount, 1);
                    bucket.scoreWeight += Math.max(responseCount, 1);
                    if (item.questionId) {
                        bucket.questionIds.add(item.questionId);
                    }

                    const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
                    bucket.monthlyRespondents.set(
                        monthKey,
                        Math.max(
                            bucket.monthlyRespondents.get(monthKey) ?? 0,
                            responseCount,
                        ),
                    );
                }

                const average = bucket.scoreWeight
                    ? bucket.scoreTotal / bucket.scoreWeight
                    : 0;
                const respondents = Array.from(
                    bucket.monthlyRespondents.values(),
                ).reduce((sum, value) => sum + value, 0);

                return {
                    ...quarter,
                    average,
                    respondents,
                    questionCount: bucket.questionIds.size,
                    category: scoreCategory(average),
                };
            });

            const totalTypeRespondents = quarterRows.reduce(
                (sum, quarter) => sum + quarter.respondents,
                0,
            );
            const weightedScoreTotal = quarterRows.reduce(
                (sum, quarter) => sum + quarter.average * quarter.respondents,
                0,
            );
            const totalIndicators = Math.max(
                ...quarterRows.map((quarter) => quarter.questionCount),
                0,
            );
            const overallTypeAverage = totalTypeRespondents
                ? weightedScoreTotal / totalTypeRespondents
                : 0;

            return {
                ...type,
                quarters: quarterRows,
                totalRespondents: totalTypeRespondents,
                totalIndicators,
                overallAverage: overallTypeAverage,
                overallCategory: scoreCategory(overallTypeAverage),
            };
        });
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
        if (hasInitialData) return;
        load();
    });
</script>

{#if loading}
    <div class="space-y-4 animate-pulse">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div
                class="lg:col-span-2 border border-black/10 rounded-xl p-5 space-y-3"
            >
                <div class="h-4 bg-gray-200 rounded w-32"></div>
                <div class="h-10 bg-gray-200 rounded w-40"></div>
                <div class="h-3 bg-gray-100 rounded w-full"></div>
                <div class="h-3 bg-gray-100 rounded w-4/5"></div>
            </div>
            {#each [1, 2] as _}
                <div class="border border-black/10 rounded-xl p-5 space-y-3">
                    <div class="h-4 bg-gray-200 rounded w-24"></div>
                    <div class="h-10 bg-gray-200 rounded w-28"></div>
                    <div class="h-3 bg-gray-100 rounded w-2/3"></div>
                </div>
            {/each}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {#each [1, 2] as _}
                <div class="border border-black/10 rounded-xl p-5 space-y-4">
                    <div class="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div class="h-8 bg-gray-100 rounded w-2/3"></div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {#each [1, 2, 3, 4] as _}
                            <div class="h-28 bg-gray-100 rounded-xl"></div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
{:else if error}
    <div
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-500"
    >
        {error}
    </div>
{:else}
    <div class="space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div
                class="lg:col-span-2 border border-black/10 rounded-xl p-5 md:p-6 bg-linear-to-br from-green/10 to-white"
            >
                <p
                    class="text-[11px] uppercase tracking-[0.22em] font-semibold text-green"
                >
                    Ringkasan Survei {currentYear}
                </p>
                <div
                    class="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
                >
                    <div>
                        <p class="text-sm text-ink/60 max-w-xl">
                            Rekap nilai layanan publik berdasarkan dua instrumen
                            aktif:
                            <span class="font-semibold text-ink">SPKP</span> dan
                            <span class="font-semibold text-ink">SPAK</span>.
                        </p>
                        <p class="text-3xl md:text-4xl font-bold mt-3 text-ink">
                            {formatScore(overallAverage)}<span
                                class="text-lg md:text-xl text-ink/50"
                            >
                                / 4</span
                            >
                        </p>
                    </div>
                    <span
                        class={`w-fit rounded-full px-3 py-1 text-xs font-bold ${categoryClass(scoreCategory(overallAverage))}`}
                    >
                        {scoreCategory(overallAverage)}
                    </span>
                </div>
            </div>

            <div class="border border-black/10 rounded-xl p-5 bg-white/60">
                <p
                    class="text-[10px] uppercase tracking-widest font-semibold text-gray-400"
                >
                    Total Responden
                </p>
                <p class="text-3xl font-bold mt-2 text-ink">
                    {totalRespondents.toLocaleString("id-ID")}
                </p>
                <p class="text-sm text-ink/55 mt-2">
                    Akumulasi responden unik per triwulan pada tahun berjalan.
                </p>
            </div>

            <div class="border border-black/10 rounded-xl p-5 bg-white/60">
                <p
                    class="text-[10px] uppercase tracking-widest font-semibold text-gray-400"
                >
                    Instrumen Aktif
                </p>
                <p class="text-3xl font-bold mt-2 text-ink">
                    {surveyTypes.length}
                </p>
                <p class="text-sm text-ink/55 mt-2">
                    Fokus pengukuran saat ini pada kualitas pelayanan dan anti
                    korupsi.
                </p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {#each rowsByType as type}
                <article
                    class={`border border-black/10 rounded-xl p-5 md:p-6 bg-linear-to-br ${type.panelClass}`}
                >
                    <div
                        class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                    >
                        <div>
                            <span
                                class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${type.badgeClass}`}
                            >
                                {type.label}
                            </span>
                            <h3
                                class="font-bold text-lg md:text-xl mt-3 text-ink leading-tight"
                            >
                                {type.title}
                            </h3>
                        </div>
                        <div class="md:text-right">
                            <p
                                class="text-[10px] uppercase tracking-widest text-ink/45"
                            >
                                Nilai Rata-rata
                            </p>
                            <p
                                class={`text-3xl font-bold mt-1 ${type.accentClass}`}
                            >
                                {formatScore(type.overallAverage)}
                            </p>
                            <span
                                class={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${categoryClass(type.overallCategory)}`}
                            >
                                {type.overallCategory}
                            </span>
                        </div>
                    </div>

                    <div class="mt-5 grid grid-cols-2 gap-3">
                        <div
                            class="rounded-xl border border-black/8 bg-white/70 p-3"
                        >
                            <p
                                class="text-[10px] uppercase tracking-widest text-ink/45"
                            >
                                Total Responden
                            </p>
                            <p class="mt-2 text-xl font-bold text-ink">
                                {type.totalRespondents.toLocaleString("id-ID")}
                            </p>
                        </div>
                        <div
                            class="rounded-xl border border-black/8 bg-white/70 p-3"
                        >
                            <p
                                class="text-[10px] uppercase tracking-widest text-ink/45"
                            >
                                Indikator Terukur
                            </p>
                            <p class="mt-2 text-xl font-bold text-ink">
                                {type.totalIndicators.toLocaleString("id-ID")}
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {#each type.quarters as quarter}
                            <div
                                class="rounded-xl border border-black/8 bg-white/80 p-4"
                            >
                                <div
                                    class="flex items-center justify-between gap-2"
                                >
                                    <p
                                        class="text-xs font-bold uppercase text-gray-500"
                                    >
                                        {quarter.label}
                                    </p>
                                    <span
                                        class={`rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryClass(quarter.category)}`}
                                    >
                                        {quarter.category}
                                    </span>
                                </div>
                                <div
                                    class="mt-4 flex items-end justify-between gap-3"
                                >
                                    <div>
                                        <p
                                            class="text-[10px] uppercase tracking-widest text-gray-400"
                                        >
                                            Nilai
                                        </p>
                                        <p
                                            class="text-2xl font-bold leading-none text-ink"
                                        >
                                            {formatScore(quarter.average)}
                                        </p>
                                    </div>
                                    <p class="text-xs text-gray-400">/ 4</p>
                                </div>
                                <dl
                                    class="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3"
                                >
                                    <div>
                                        <dt
                                            class="text-[10px] uppercase text-gray-400 font-semibold"
                                        >
                                            Responden
                                        </dt>
                                        <dd class="text-sm font-bold text-ink">
                                            {quarter.respondents.toLocaleString(
                                                "id-ID",
                                            )}
                                        </dd>
                                    </div>
                                    <div class="border-l border-gray-100 pl-3">
                                        <dt
                                            class="text-[10px] uppercase text-gray-400 font-semibold"
                                        >
                                            Indikator
                                        </dt>
                                        <dd class="text-sm font-bold text-ink">
                                            {quarter.questionCount.toLocaleString(
                                                "id-ID",
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        {/each}
                    </div>
                </article>
            {/each}
        </div>
    </div>
{/if}
