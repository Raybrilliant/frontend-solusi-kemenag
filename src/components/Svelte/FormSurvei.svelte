<script>
    let {
        formBaseUrl = "/api/survei/form",
        submitUrl = "/api/survei/submit",
        initialTicket = "",
    } = $props();

    const surveyTypes = [
        {
            value: "SKM",
            label: "SKM",
            title: "Survei Kepuasan Masyarakat",
            desc: "Nilai pengalaman Anda terhadap hasil layanan yang diterima.",
        },
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
        "SD/sederajat",
        "SMP/sederajat",
        "SMA/sederajat",
        "D1/D2/D3",
        "S1/D4",
        "S2",
        "S3",
        "Lainnya",
    ];

    const pekerjaanOptions = [
        "Pelajar/Mahasiswa",
        "PNS/TNI/Polri",
        "Pegawai Swasta",
        "Wiraswasta",
        "Petani/Nelayan",
        "Ibu Rumah Tangga",
        "Tidak/Belum Bekerja",
        "Lainnya",
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
    let pendidikan = $state("");
    let pendidikanLainnya = $state("");
    let pekerjaan = $state("");
    let pekerjaanLainnya = $state("");

    const currentType = $derived(surveyTypes[activeIndex]);
    const currentForm = $derived(forms[currentType.value] ?? null);
    const currentAnswers = $derived(answers[currentType.value] ?? {});
    const totalQuestions = $derived(currentForm?.questions?.length ?? 0);
    const answeredCount = $derived(
        Object.values(currentAnswers).filter(Boolean).length,
    );
    const isProfileStep = $derived(activeIndex >= surveyTypes.length);

    function normalizeTicket(value) {
        return value.trim().toUpperCase();
    }

    function selectedEducation() {
        return pendidikan === "Lainnya"
            ? pendidikanLainnya.trim()
            : pendidikan.trim();
    }

    function selectedJob() {
        return pekerjaan === "Lainnya"
            ? pekerjaanLainnya.trim()
            : pekerjaan.trim();
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
        if (answeredCount < totalQuestions) {
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
        const edu = selectedEducation();
        const job = selectedJob();

        if (!edu || !job) {
            error = "Pendidikan terakhir dan pekerjaan saat ini wajib diisi.";
            return;
        }

        submitting = true;
        error = "";

        try {
            for (const type of surveyTypes) {
                const form = forms[type.value];
                const answerMap = answers[type.value] ?? {};
                const payload = {
                    surveyType: type.value,
                    ticketId: ticket,
                    pendidikanTerakhir: edu,
                    jenisPekerjaan: job,
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
                        json.message ??
                            `Gagal mengirim survei ${type.value}.`,
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
            <div class="w-14 h-14 bg-green text-white flex items-center justify-center mb-5">
                <svg viewBox="0 0 24 24" class="w-8 h-8" fill="currentColor">
                    <path
                        d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z"
                    ></path>
                </svg>
            </div>
            <h2 class="text-2xl md:text-3xl font-bold uppercase text-ink">
                Terima Kasih
            </h2>
            <p class="text-sm md:text-base text-ink/60 mt-2 max-w-2xl">
                Jawaban SKM, SPKP, dan SPAK untuk tiket {ticket} berhasil
                dikirim. Masukan Anda membantu peningkatan kualitas layanan.
            </p>
            <a
                href="/check-progress"
                class="inline-flex mt-6 bg-green text-white px-5 py-3 text-sm font-bold uppercase hover:bg-green/90 transition-colors"
            >
                Kembali ke Cek Progress
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
                Survei hanya dapat diisi untuk nomor tiket layanan yang statusnya
                sudah selesai.
            </p>
        </section>

        {#if error}
            <div class="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
            </div>
        {/if}

        {#if loading}
            <div class="bg-white border border-black/10 p-10 text-center text-sm text-ink/40">
                Memuat form survei...
            </div>
        {:else if forms.SKM}
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
                                isProfileStep
                                    ? "bg-green/8 text-green border-green/30"
                                    : "bg-white text-ink/35 border-black/10"
                            }`}
                        >
                            <span>4</span>
                            <span>Profil</span>
                        </div>
                    </div>
                </div>

                {#if !isProfileStep}
                    <div class="p-4 md:p-6">
                        <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
                            <div>
                                <p class="text-xs font-bold uppercase tracking-widest text-green">
                                    {currentType.label}
                                </p>
                                <h2 class="text-2xl font-bold uppercase text-ink mt-1">
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
                                            <h3 class="font-semibold text-ink leading-snug">
                                                {question.question}
                                            </h3>
                                            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
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
                                                        <span class="block text-lg font-bold">
                                                            {option.label}
                                                        </span>
                                                        <span class="block text-xs opacity-75">
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

                        <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5">
                            <button
                                type="button"
                                onclick={prevStep}
                                disabled={activeIndex === 0}
                                class="px-4 py-3 border border-black/10 text-sm font-bold uppercase disabled:opacity-40"
                            >
                                Sebelumnya
                            </button>
                            <p class="text-xs text-ink/45">
                                {answeredCount} dari {totalQuestions} pertanyaan
                                terjawab
                            </p>
                            <button
                                type="button"
                                onclick={nextStep}
                                class="px-5 py-3 bg-green text-white text-sm font-bold uppercase hover:bg-green/90 transition-colors"
                            >
                                {activeIndex === surveyTypes.length - 1
                                    ? "Lanjut Profil"
                                    : "Lanjut Survei Berikutnya"}
                            </button>
                        </div>
                    </div>
                {:else}
                    <div class="p-4 md:p-6">
                        <p class="text-xs font-bold uppercase tracking-widest text-green">
                            Langkah Terakhir
                        </p>
                        <h2 class="text-2xl font-bold uppercase text-ink mt-1">
                            Profil Responden
                        </h2>
                        <p class="text-sm text-ink/50 mt-1 max-w-2xl">
                            Pilih pendidikan terakhir dan pekerjaan saat ini
                            sebelum mengirim seluruh survei.
                        </p>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                            <div>
                                <label class="text-sm font-bold text-ink/70">
                                    Pendidikan Terakhir
                                </label>
                                <select
                                    bind:value={pendidikan}
                                    class="mt-2 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                >
                                    <option value="">Pilih pendidikan</option>
                                    {#each pendidikanOptions as option}
                                        <option value={option}>{option}</option>
                                    {/each}
                                </select>
                                {#if pendidikan === "Lainnya"}
                                    <input
                                        bind:value={pendidikanLainnya}
                                        type="text"
                                        placeholder="Tulis pendidikan terakhir"
                                        class="mt-3 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                    />
                                {/if}
                            </div>

                            <div>
                                <label class="text-sm font-bold text-ink/70">
                                    Pekerjaan Saat Ini
                                </label>
                                <select
                                    bind:value={pekerjaan}
                                    class="mt-2 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                >
                                    <option value="">Pilih pekerjaan</option>
                                    {#each pekerjaanOptions as option}
                                        <option value={option}>{option}</option>
                                    {/each}
                                </select>
                                {#if pekerjaan === "Lainnya"}
                                    <input
                                        bind:value={pekerjaanLainnya}
                                        type="text"
                                        placeholder="Tulis pekerjaan saat ini"
                                        class="mt-3 w-full border border-black/10 px-4 py-3 text-sm focus:outline-none focus:border-green"
                                    />
                                {/if}
                            </div>
                        </div>

                        <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5">
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
