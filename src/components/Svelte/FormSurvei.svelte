<script>
    import Icon from "@iconify/svelte";
    import { SvelteSet } from "svelte/reactivity";

    let {
        formBaseUrl = "/api/survei/form",
        submitUrl = "/api/survei/submit",
        initialTicket = "",
    } = $props();

    const surveyTypes = [
        {
            value: "SPKP",
            label: "SPKP",
            title: "Survei Persepsi Kualitas Pelayanan",
            desc: "Nilai kualitas proses, kejelasan, dan kemudahan pelayanan.",
        },
        {
            value: "SPAK",
            label: "SPAK",
            title: "Survei Persepsi Anti Korupsi",
            desc: "Nilai integritas layanan dan bebas dari praktik koruptif.",
        },
    ];

    const pendidikanOptions = [
        { value: 1, label: "Tidak Sekolah" },
        { value: 2, label: "SD/sederajat" },
        { value: 3, label: "SMP/sederajat" },
        { value: 4, label: "SMA/sederajat" },
        { value: 5, label: "D1/D2/D3" },
        { value: 6, label: "D4/S1" },
        { value: 7, label: "S2" },
        { value: 8, label: "S3" },
    ];

    const pekerjaanOptions = [
        { value: 1, label: "ASN (PNS/PPPK)" },
        { value: 2, label: "TNI/POLRI" },
        { value: 3, label: "Swasta" },
        { value: 4, label: "Wiraswasta" },
        { value: 5, label: "Ibu Rumah Tangga" },
        { value: 6, label: "Pelajar/Mahasiswa" },
        { value: 7, label: "Petani/Nelayan" },
        { value: 8, label: "Pekerja Lepas/Freelance" },
        { value: 9, label: "Pensiunan" },
        { value: 10, label: "Tidak Bekerja" },
        { value: 11, label: "Lain-lain" },
    ];

    const disabilitasOptions = [
        { value: 1, label: "Disabilitas Fisik" },
        { value: 2, label: "Disabilitas Intelektual" },
        { value: 3, label: "Disabilitas Mental" },
        { value: 4, label: "Disabilitas Sensory" },
    ];

    const nilaiOptions = [
        { value: 1, label: "1", text: "Tidak baik" },
        { value: 2, label: "2", text: "Kurang baik" },
        { value: 3, label: "3", text: "Baik" },
        { value: 4, label: "4", text: "Sangat baik" },
    ];

    let ticket = $state(initialTicket);
    let activeIndex = $state(0);
    let forms = $state({});
    let answers = $state({});
    let loading = $state(false);
    let submitting = $state(false);
    let error = $state("");
    let success = $state(false);
    let pendidikan = $state(0);
    let usia = $state("");
    let pekerjaan = $state(0);
    let disabilitas = $state(new SvelteSet());
    let kritikSaran = $state("");
    let kepercayaanPusat = $state(0);
    let kepercayaanDaerah = $state(0);

    const currentType = $derived(surveyTypes[activeIndex]);
    const currentForm = $derived(forms[currentType.value] ?? null);
    const currentAnswers = $derived(answers[currentType.value] ?? {});
    const totalQuestions = $derived(currentForm?.questions?.length ?? 0);
    const answeredCount = $derived(
        Object.values(currentAnswers).filter(Boolean).length,
    );
    const isProfileStep = $derived(activeIndex >= surveyTypes.length + 1);
    // Step "Kritik & Kepercayaan" berada tepat sebelum profil.
    const isFeedbackStep = $derived(activeIndex === surveyTypes.length);
    const skalaKepercayaan = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // Tanggal menerima layanan di-derive backend, ditampilkan read-only.
    // Ambil dari form pertama yang dimuat (semua form untuk tiket yang sama punya nilai sama).
    const tanggalMenerimaLayanan = $derived(
        forms["SPKP"]?.tanggalMenerimaLayanan ?? forms["SPAK"]?.tanggalMenerimaLayanan ?? "",
    );

    function normalizeTicket(value) {
        return value.trim().toUpperCase();
    }

    function toggleDisabilitas(value) {
        const next = new SvelteSet(disabilitas);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        disabilitas = next;
    }

    function answerQuestion(questionId, nilai) {
        answers = {
            ...answers,
            [currentType.value]: {
                ...(answers[currentType.value] ?? {}),
                [questionId]: nilai,
            },
        };
    }

    async function loadForms() {
        const nextTicket = normalizeTicket(ticket);
        if (!nextTicket) {
            error = "Nomor tiket wajib diisi.";
            return;
        }

        loading = true;
        error = "";
        success = false;
        forms = {};
        answers = {};
        activeIndex = 0;

        try {
            const loaded = {};
            for (const type of surveyTypes) {
                const res = await fetch(
                    `${formBaseUrl}/${type.value}/${encodeURIComponent(nextTicket)}`,
                );
                const json = await res.json();
                if (json.success === false) {
                    throw new Error(
                        json.message ??
                            `Form survei ${type.value} tidak dapat dimuat.`,
                    );
                }
                loaded[type.value] = {
                    ...json.data,
                    questions: (json.data?.questions ?? []).sort(
                        (a, b) =>
                            (Number(a.sortOrder) || 0) -
                            (Number(b.sortOrder) || 0),
                    ),
                };
            }
            ticket = nextTicket;
            forms = loaded;
        } catch (e) {
            error =
                e?.message ??
                "Form survei tidak dapat dimuat. Pastikan tiket sudah selesai.";
        } finally {
            loading = false;
        }
    }

    function nextStep() {
        if (isFeedbackStep) {
            if (
                !kepercayaanPusat ||
                !kepercayaanDaerah ||
                kepercayaanPusat < 1 ||
                kepercayaanPusat > 10 ||
                kepercayaanDaerah < 1 ||
                kepercayaanDaerah > 10
            ) {
                error = "Skala kepercayaan pusat dan daerah wajib diisi (1-10).";
                return;
            }
        } else if (answeredCount < totalQuestions) {
            error = `Lengkapi semua pertanyaan ${currentType.label} terlebih dahulu.`;
            return;
        }
        error = "";
        activeIndex += 1;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function prevStep() {
        error = "";
        activeIndex = Math.max(0, activeIndex - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function submitAll() {
        const usiaNum = Number(usia);
        if (!pendidikan) {
            error = "Pendidikan terakhir wajib diisi.";
            return;
        }
        if (!usia || !Number.isInteger(usiaNum) || usiaNum < 1 || usiaNum > 120) {
            error = "Usia wajib diisi (angka 1-120).";
            return;
        }
        if (!pekerjaan) {
            error = "Pekerjaan saat ini wajib diisi.";
            return;
        }
        if (
            !kepercayaanPusat ||
            !kepercayaanDaerah ||
            kepercayaanPusat < 1 ||
            kepercayaanPusat > 10 ||
            kepercayaanDaerah < 1 ||
            kepercayaanDaerah > 10
        ) {
            error = "Skala kepercayaan pusat dan daerah wajib diisi (1-10).";
            return;
        }

        const disabilitasStr = [...disabilitas].sort((a, b) => a - b).join(",");
        const kritikSaranTrim = kritikSaran.trim();

        submitting = true;
        error = "";

        try {
            for (const type of surveyTypes) {
                const form = forms[type.value];
                const answerMap = answers[type.value] ?? {};
                const payload = {
                    surveyType: type.value,
                    ticketId: ticket,
                    pendidikanTerakhir: Number(pendidikan),
                    usia: usiaNum,
                    jenisPekerjaan: Number(pekerjaan),
                    disabilitas: disabilitasStr,
                    kritikSaran: kritikSaranTrim,
                    kepercayaanPusat: Number(kepercayaanPusat),
                    kepercayaanDaerah: Number(kepercayaanDaerah),
                    answers: (form?.questions ?? []).map((question) => ({
                        questionId: question.id,
                        nilai: Number(answerMap[question.id]),
                    })),
                };

                const res = await fetch(submitUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const json = await res.json();
                if (json.success === false) {
                    throw new Error(
                        json.message ?? `Gagal mengirim survei ${type.value}.`,
                    );
                }
            }

            success = true;
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            error = e?.message ?? "Gagal mengirim survei.";
        } finally {
            submitting = false;
        }
    }

    $effect(() => {
        if (initialTicket) loadForms();
    });
</script>

<div class="w-full max-w-5xl">
    {#if success}
        <section class="border-2 border-green bg-white p-6 md:p-8">
            <div
                class="w-14 h-14 bg-green text-white flex items-center justify-center mb-5"
            >
                <Icon icon="mdi:check" class="w-8 h-8" />
            </div>
            <h2 class="text-2xl md:text-3xl font-bold uppercase text-ink">
                Terima Kasih
            </h2>
            <p class="text-sm md:text-base text-ink/60 mt-2 max-w-2xl">
                Jawaban SPKP dan SPAK untuk tiket {ticket} berhasil dikirim. Masukan
                Anda membantu peningkatan kualitas layanan.
            </p>
            <a
                href="/check-progress"
                class="inline-flex mt-6 bg-green text-white px-5 py-3 text-sm font-bold uppercase hover:bg-green/90 transition-colors"
            >
                Kembali ke Cek Status
            </a>
        </section>
    {:else}
        <section class="bg-white border border-black/10 p-4 md:p-5 mb-5">
            <form
                onsubmit={(event) => {
                    event.preventDefault();
                    loadForms();
                }}
                class="flex flex-col md:flex-row gap-3"
            >
                <input
                    bind:value={ticket}
                    type="text"
                    placeholder="Masukkan nomor tiket layanan"
                    class="flex-1 border border-black/10 px-4 py-3 text-sm font-semibold focus:outline-none focus:border-green"
                    disabled={loading || submitting}
                />
                <button
                    type="submit"
                    disabled={loading || submitting}
                    class="bg-green text-white px-5 py-3 text-sm font-bold uppercase disabled:opacity-60 hover:bg-green/90 transition-colors"
                >
                    {loading ? "Memuat..." : "Mulai Survei"}
                </button>
            </form>
            <p class="text-xs text-ink/40 mt-3">
                Survei hanya dapat diisi untuk nomor tiket layanan yang
                statusnya sudah selesai.
            </p>
        </section>

        {#if error}
            <div
                class="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
                {error}
            </div>
        {/if}

        {#if loading}
            <div
                class="bg-white border border-black/10 p-10 text-center text-sm text-ink/40"
            >
                Memuat form survei...
            </div>
        {:else if forms[surveyTypes[0]?.value]}
            <section class="bg-white border border-black/10">
                <div class="p-4 md:p-5 border-b border-black/8">
                    <div class="flex flex-wrap items-center gap-2">
                        {#each surveyTypes as type, index}
                            <div
                                class={`flex items-center gap-2 px-3 py-2 border text-xs font-bold uppercase ${
                                    index < activeIndex
                                        ? "bg-green text-white border-green"
                                        : index === activeIndex
                                          ? "bg-green/8 text-green border-green/30"
                                          : "bg-white text-ink/35 border-black/10"
                                }`}
                            >
                                <span>{index + 1}</span>
                                <span>{type.label}</span>
                            </div>
                        {/each}
                        <div
                            class={`flex items-center gap-2 px-3 py-2 border text-xs font-bold uppercase ${
                                isFeedbackStep
                                    ? "bg-green/8 text-green border-green/30"
                                    : activeIndex > surveyTypes.length
                                      ? "bg-green text-white border-green"
                                      : "bg-white text-ink/35 border-black/10"
                            }`}
                        >
                            <span>{surveyTypes.length + 1}</span>
                            <span>Penilaian</span>
                        </div>
                        <div
                            class={`flex items-center gap-2 px-3 py-2 border text-xs font-bold uppercase ${
                                isProfileStep
                                    ? "bg-green/8 text-green border-green/30"
                                    : "bg-white text-ink/35 border-black/10"
                            }`}
                        >
                            <span>{surveyTypes.length + 2}</span>
                            <span>Profil</span>
                        </div>
                    </div>
                </div>

                {#if !isProfileStep && !isFeedbackStep}
                    <div class="p-4 md:p-6">
                        <div
                            class="flex flex-wrap items-start justify-between gap-4 mb-6"
                        >
                            <div>
                                <p
                                    class="text-xs font-bold uppercase tracking-widest text-green"
                                >
                                    {currentType.label}
                                </p>
                                <h2
                                    class="text-2xl font-bold uppercase text-ink mt-1"
                                >
                                    {currentType.title}
                                </h2>
                                <p class="text-sm text-ink/50 mt-1 max-w-2xl">
                                    {currentType.desc}
                                </p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-ink/35">Tiket</p>
                                <p class="font-mono text-sm font-bold text-ink">
                                    {ticket}
                                </p>
                            </div>
                        </div>

                        <div class="space-y-4">
                            {#each currentForm.questions as question, index}
                                <article class="border border-black/8 p-4">
                                    <div class="flex gap-3">
                                        <span
                                            class="w-7 h-7 bg-green/10 text-green text-xs font-bold flex items-center justify-center shrink-0"
                                        >
                                            {index + 1}
                                        </span>
                                        <div class="flex-1">
                                            <h3
                                                class="font-semibold text-ink leading-snug"
                                            >
                                                {question.question}
                                            </h3>
                                            <div
                                                class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4"
                                            >
                                                {#each nilaiOptions as option}
                                                    <button
                                                        type="button"
                                                        onclick={() =>
                                                            answerQuestion(
                                                                question.id,
                                                                option.value,
                                                            )}
                                                        class={`border px-3 py-3 text-left transition-colors ${
                                                            currentAnswers[
                                                                question.id
                                                            ] === option.value
                                                                ? "border-green bg-green text-white"
                                                                : "border-black/10 hover:border-green/40"
                                                        }`}
                                                    >
                                                        <span
                                                            class="block text-lg font-bold"
                                                        >
                                                            {option.label}
                                                        </span>
                                                        <span
                                                            class="block text-xs opacity-75"
                                                        >
                                                            {option.text}
                                                        </span>
                                                    </button>
                                                {/each}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            {/each}
                        </div>

                        <div
                            class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5"
                        >
                            <button
                                type="button"
                                onclick={prevStep}
                                disabled={activeIndex === 0}
                                class="px-4 py-3 border border-black/10 text-sm font-bold uppercase disabled:opacity-40"
                            >
                                Sebelumnya
                            </button>
                            <p class="text-xs text-ink/45">
                                {answeredCount} dari {totalQuestions} pertanyaan terjawab
                            </p>
                            <button
                                type="button"
                                onclick={nextStep}
                                class="px-5 py-3 bg-green text-white text-sm font-bold uppercase hover:bg-green/90 transition-colors"
                            >
                                {activeIndex === surveyTypes.length - 1
                                    ? "Lanjut Penilaian"
                                    : "Lanjut Survei Berikutnya"}
                            </button>
                        </div>
                    </div>
                {:else if isFeedbackStep}
                    <div class="p-4 md:p-6">
                        <p
                            class="text-xs font-bold uppercase tracking-widest text-green"
                        >
                            Penilaian Akhir
                        </p>
                        <h2 class="text-2xl font-bold uppercase text-ink mt-1">
                            Kritik, Saran & Tingkat Kepercayaan
                        </h2>
                        <p class="text-sm text-ink/50 mt-1 max-w-2xl">
                            Sampaikan kritik/saran serta tingkat kepercayaan
                            Anda terhadap pemerintah sebelum melengkapi
                            profil responden.
                        </p>

                        <div class="mt-6 space-y-5">
                            <div>
                                <label
                                    for="kritik-saran"
                                    class="text-sm font-bold text-ink/70"
                                >
                                    Kritik dan Saran
                                    <span class="text-ink/35 font-normal"
                                        >(opsional)</span
                                    >
                                </label>
                                <textarea
                                    id="kritik-saran"
                                    bind:value={kritikSaran}
                                    rows="4"
                                    placeholder="Tulis kritik atau saran untuk layanan ini..."
                                    class="mt-2 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                ></textarea>
                            </div>

                            <div>
                                <p class="text-sm font-bold text-ink/70">
                                    Pada skala 1 sampai 10, di mana 1
                                    berarti tidak percaya sama sekali dan 10
                                    berarti sangat percaya, seberapa besar
                                    tingkat kepercayaan Anda terhadap
                                    pemerintah pusat?
                                </p>
                                <div
                                    class="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-2"
                                >
                                    {#each skalaKepercayaan as nilai}
                                        <button
                                            type="button"
                                            onclick={() =>
                                                (kepercayaanPusat = nilai)}
                                            class={`border py-3 text-sm font-bold transition-colors ${
                                                kepercayaanPusat === nilai
                                                    ? "border-green bg-green text-white"
                                                    : "border-black/10 hover:border-green/40"
                                            }`}
                                        >
                                            {nilai}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            <div>
                                <p class="text-sm font-bold text-ink/70">
                                    Pada skala 1 sampai 10, di mana 1
                                    berarti tidak percaya sama sekali dan 10
                                    berarti sangat percaya, seberapa besar
                                    tingkat kepercayaan Anda terhadap
                                    pemerintah daerah?
                                </p>
                                <div
                                    class="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-2"
                                >
                                    {#each skalaKepercayaan as nilai}
                                        <button
                                            type="button"
                                            onclick={() =>
                                                (kepercayaanDaerah = nilai)}
                                            class={`border py-3 text-sm font-bold transition-colors ${
                                                kepercayaanDaerah === nilai
                                                    ? "border-green bg-green text-white"
                                                    : "border-black/10 hover:border-green/40"
                                            }`}
                                        >
                                            {nilai}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        </div>

                        <div
                            class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5"
                        >
                            <button
                                type="button"
                                onclick={prevStep}
                                class="px-4 py-3 border border-black/10 text-sm font-bold uppercase"
                            >
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                onclick={nextStep}
                                class="px-5 py-3 bg-green text-white text-sm font-bold uppercase hover:bg-green/90 transition-colors"
                            >
                                Lanjut Profil
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="p-4 md:p-6">
                        <p
                            class="text-xs font-bold uppercase tracking-widest text-green"
                        >
                            Langkah Terakhir
                        </p>
                        <h2 class="text-2xl font-bold uppercase text-ink mt-1">
                            Profil Responden
                        </h2>
                        <p class="text-sm text-ink/50 mt-1 max-w-2xl">
                            Lengkapi data berikut sebelum mengirim seluruh
                            survei. Tanggal menerima layanan diambil
                            otomatis dari tanggal layanan selesai.
                        </p>

                        {#if tanggalMenerimaLayanan}
                            <div
                                class="mt-4 border border-green/30 bg-green/5 px-4 py-3"
                            >
                                <p
                                    class="text-[10px] font-bold uppercase tracking-wide text-ink/50"
                                >
                                    Tanggal Menerima Layanan
                                </p>
                                <p class="font-mono text-sm font-bold text-ink">
                                    {tanggalMenerimaLayanan}
                                </p>
                            </div>
                        {/if}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                            <div>
                                <label
                                    for="pendidikan-terakhir"
                                    class="text-sm font-bold text-ink/70"
                                >
                                    Pendidikan Terakhir
                                </label>
                                <select
                                    id="pendidikan-terakhir"
                                    bind:value={pendidikan}
                                    class="mt-2 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                >
                                    <option value={0}>Pilih pendidikan</option>
                                    {#each pendidikanOptions as option}
                                        <option value={option.value}>
                                            {option.value}. {option.label}
                                        </option>
                                    {/each}
                                </select>
                            </div>

                            <div>
                                <label
                                    for="usia"
                                    class="text-sm font-bold text-ink/70"
                                >
                                    Usia
                                </label>
                                <input
                                    id="usia"
                                    type="number"
                                    min="1"
                                    max="120"
                                    bind:value={usia}
                                    placeholder="Usia dalam tahun"
                                    class="mt-2 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                />
                            </div>

                            <div>
                                <label
                                    for="pekerjaan-saat-ini"
                                    class="text-sm font-bold text-ink/70"
                                >
                                    Pekerjaan Saat Ini
                                </label>
                                <select
                                    id="pekerjaan-saat-ini"
                                    bind:value={pekerjaan}
                                    class="mt-2 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                >
                                    <option value={0}>Pilih pekerjaan</option>
                                    {#each pekerjaanOptions as option}
                                        <option value={option.value}>
                                            {option.value}. {option.label}
                                        </option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <div class="mt-6">
                            <p class="text-sm font-bold text-ink/70">
                                Apakah Anda merupakan penyandang disabilitas /
                                pendamping penyandang disabilitas?
                            </p>
                            <p class="text-xs text-ink/45 mt-1">
                                Centang jika ada. Boleh pilih lebih dari satu.
                                Kosongkan jika tidak ada.
                            </p>
                            <div
                                class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2"
                            >
                                {#each disabilitasOptions as option}
                                    <label
                                        class={`flex items-center gap-3 border px-4 py-3 cursor-pointer transition-colors ${
                                            disabilitas.has(option.value)
                                                ? "border-green bg-green/8"
                                                : "border-black/10 hover:border-green/40"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            class="accent-green"
                                            checked={disabilitas.has(
                                                option.value,
                                            )}
                                            onchange={() =>
                                                toggleDisabilitas(option.value)}
                                        />
                                        <span class="text-sm text-ink">
                                            {option.value}. {option.label}
                                        </span>
                                    </label>
                                {/each}
                            </div>
                        </div>

                        <div
                            class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5"
                        >
                            <button
                                type="button"
                                onclick={prevStep}
                                class="px-4 py-3 border border-black/10 text-sm font-bold uppercase"
                            >
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                onclick={submitAll}
                                disabled={submitting}
                                class="px-5 py-3 bg-green text-white text-sm font-bold uppercase disabled:opacity-60 hover:bg-green/90 transition-colors"
                            >
                                {submitting ? "Mengirim..." : "Submit Survei"}
                            </button>
                        </div>
                    </div>
                {/if}
            </section>
        {/if}
    {/if}
</div>
