<script>
    let { apiUrl = "/api/internal/services" } = $props();

    // ── Icon paths ───────────────────────────────────────
    const ICONS = {
        "mdi:calendar-clock":
            "M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z",
        "mdi:account-arrow-up":
            "M17 21v-2h-4v-2h4v-2l3 3l-3 3M10 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c2.67 0 8 1.33 8 4v3H2v-3c0-2.67 5.33-4 8-4z",
        "mdi:file-document-multiple-outline":
            "M16 0H8C6.9 0 6 .9 6 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6l-6-6m4 16H8V2h7v5h5v9M4 4v16h16v2H4c-1.1 0-2-.9-2-2V4h2z",
        "mdi:clipboard-check-outline":
            "M19 3h-4.18C14.4 1.84 13.3 1 12 1S9.6 1.84 9.18 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-7 0a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1M7 7h10V5h2v14H5V5h2v2m3.5 9l6-6L15 8.5l-4.5 4.5L8 10.5L6.5 12l4 4z",
    };

    // ── State ────────────────────────────────────────────
    let services = $state([]);
    let externals = $state([]);
    let loading = $state(true);
    let activeService = $state(null);
    let formData = $state({});
    let selectedFile = $state(null);
    let submitting = $state(false);
    let toast = $state(null);

    // ── Fetch dari API ───────────────────────────────────
    $effect(() => {
        Promise.all([
            fetch(apiUrl).then((r) => r.json()),
            fetch("/api/external-services").then((r) => r.json()),
        ])
            .then(([internalRes, externalRes]) => {
                services = internalRes.data ?? internalRes.services ?? [];
                externals = externalRes.data ?? externalRes.externals ?? [];
                loading = false;
            })
            .catch(() => {
                loading = false;
            });
    });

    // ── Helpers ──────────────────────────────────────────
    function selectService(svc) {
        activeService = svc;
        formData = {};
        selectedFile = null;
        svc.fields.forEach((f) => {
            formData[f.name] =
                f.type === "select"
                    ? f.options[0]
                    : f.type === "number"
                      ? 1
                      : "";
        });
    }

    function backToList() {
        activeService = null;
    }

    function handleFile(e) {
        selectedFile = e.target?.files?.[0] ?? null;
    }

    function showToast(type, msg) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 5000);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        submitting = true;
        try {
            await new Promise((r) => setTimeout(r, 1200));
            showToast(
                "success",
                `Pengajuan "${activeService?.title}" berhasil dikirim. Nomor tiket: TK-${Date.now().toString(36).toUpperCase()}`,
            );
            backToList();
        } catch {
            showToast("error", "Gagal mengirim pengajuan. Silakan coba lagi.");
        } finally {
            submitting = false;
        }
    }
</script>

<!-- ── Toast ──────────────────────────────────────────── -->
{#if toast}
    <div
        class="fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:top-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl sm:max-w-sm rounded-xl {toast.type ===
        'success'
            ? 'bg-green text-white'
            : 'bg-red-600 text-white'}"
    >
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="shrink-0"
        >
            {#if toast.type === "success"}
                <path
                    d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                />
            {:else}
                <path
                    d="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10-4.48 10-10S17.52,2 12,2zm1,15h-2v-2h2v2zm0-4h-2V7h2v6z"
                />
            {/if}
        </svg>
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Tutup notifikasi"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
                ><path
                    d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12z"
                /></svg
            >
        </button>
    </div>
{/if}

<!-- ── Loading ────────────────────────────────────────── -->
{#if loading}
    <div class="flex items-center justify-center py-20">
        <div
            class="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin"
        ></div>
    </div>
{:else}
    <!-- ── Service List ────────────────────────────────── -->
    {#if !activeService}
        <div class="space-y-6">
            <!-- Cards -->
            <div
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto"
            >
                {#each services as svc (svc.id)}
                    <button
                        onclick={() => selectService(svc)}
                        class="group text-left bg-white border border-black/8 rounded p-6 hover:border-green/40 hover:shadow-lg hover:shadow-green/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    >
                        <div
                            class="w-12 h-12 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center mb-4 group-hover:bg-green/20 transition-colors"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                                fill="currentColor"
                                class="text-green"
                            >
                                <path d={ICONS[svc.icon]} />
                            </svg>
                        </div>
                        <h3 class="font-bold text-ink text-lg mb-2">
                            {svc.title}
                        </h3>
                        <p class="text-sm text-ink/50 leading-relaxed">
                            {svc.description}
                        </p>
                        <div
                            class="flex items-center gap-1 mt-4 text-green text-sm font-semibold"
                        >
                            <span>Ajukan Sekarang</span>
                            <svg viewBox="0 0 24 24" class="w-4 h-4"
                                ><path
                                    fill="currentColor"
                                    d="M4 11v2h12l-5.5 5.5 1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5 16 11z"
                                /></svg
                            >
                        </div>
                    </button>
                {/each}

                <!-- External service links -->
                {#each externals as svc (svc.id)}
                    <a
                        href={svc.link}
                        target="_blank"
                        rel="noopener"
                        class="group text-left bg-white border border-dashed border-black/10 rounded p-6 hover:border-green/40 hover:shadow-lg hover:shadow-green/5 hover:-translate-y-1 transition-all duration-300"
                    >
                        <div class="flex items-center justify-between mb-4">
                            <div
                                class="w-12 h-12 rounded-xl bg-green/5 border border-green/15 flex items-center justify-center group-hover:bg-green/10 transition-colors"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="24"
                                    height="24"
                                    fill="currentColor"
                                    class="text-green/60"
                                >
                                    <path d={ICONS[svc.icon]} />
                                </svg>
                            </div>
                            <svg
                                viewBox="0 0 24 24"
                                class="w-4 h-4 text-ink/20 group-hover:text-green/50 transition-colors"
                            >
                                <path
                                    fill="currentColor"
                                    d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h5V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-2z"
                                />
                            </svg>
                        </div>
                        <h3 class="font-bold text-ink text-lg mb-2">
                            {svc.title}
                        </h3>
                        <p class="text-sm text-ink/40 leading-relaxed">
                            {svc.description}
                        </p>
                        <div
                            class="flex items-center gap-1 mt-4 text-ink/30 text-sm font-semibold group-hover:text-green/70 transition-colors"
                        >
                            <span>Buka {svc.appsName}</span>
                            <svg viewBox="0 0 24 24" class="w-4 h-4"
                                ><path
                                    fill="currentColor"
                                    d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h5V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-2z"
                                /></svg
                            >
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    {:else}
        <!-- ── Form ────────────────────────────────────────── -->
        <div class="max-w-xl mx-auto">
            <button
                onclick={backToList}
                class="flex items-center gap-1.5 text-sm font-semibold text-ink/40 hover:text-ink transition-colors mb-6 cursor-pointer"
            >
                <svg viewBox="0 0 24 24" class="w-4 h-4"
                    ><path
                        fill="currentColor"
                        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"
                    /></svg
                >
                Kembali ke daftar layanan
            </button>

            <div class="flex items-center gap-3 mb-6">
                <div
                    class="w-12 h-12 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        fill="currentColor"
                        class="text-green"
                    >
                        <path d={ICONS[activeService.icon]} />
                    </svg>
                </div>
                <div>
                    <h2 class="text-xl font-extrabold text-ink">
                        {activeService.title}
                    </h2>
                    <p class="text-sm text-ink/40">
                        {activeService.description}
                    </p>
                </div>
            </div>

            <form
                onsubmit={handleSubmit}
                class="bg-white border border-black/8 rounded p-6 space-y-4"
            >
                {#each activeService.fields as field (field.name)}
                    <div>
                        <label
                            for={`field-${field.name}`}
                            class="block text-[11px] font-bold text-ink/50 uppercase tracking-wider mb-1.5"
                        >
                            {field.label}
                        </label>

                        {#if field.type === "select"}
                            <select
                                id={`field-${field.name}`}
                                bind:value={formData[field.name]}
                                class="w-full border border-black/12 bg-white py-2.5 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green transition-colors"
                            >
                                {#each field.options as opt}
                                    <option value={opt}>{opt}</option>
                                {/each}
                            </select>
                        {:else if field.type === "textarea"}
                            <textarea
                                rows="3"
                                bind:value={formData[field.name]}
                                placeholder="Tulis keterangan..."
                                class="w-full border border-black/12 bg-white py-2.5 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green transition-colors resize-none"
                            ></textarea>
                        {:else if field.type === "file"}
                            <input
                                type="file"
                                onchange={handleFile}
                                class="w-full text-sm text-ink/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-black/10 file:bg-white file:text-xs file:font-semibold file:text-ink/60 hover:file:bg-black/4 file:cursor-pointer file:transition-colors"
                            />
                        {:else if field.type === "number"}
                            <input
                                type="number"
                                min={field.min ?? 1}
                                max={field.max ?? 99}
                                bind:value={formData[field.name]}
                                class="w-full border border-black/12 bg-white py-2.5 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green transition-colors"
                            />
                        {:else if field.type === "date"}
                            <input
                                type="date"
                                bind:value={formData[field.name]}
                                class="w-full border border-black/12 bg-white py-2.5 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green transition-colors"
                            />
                        {:else}
                            <input
                                type="text"
                                bind:value={formData[field.name]}
                                placeholder={field.placeholder ?? ""}
                                class="w-full border border-black/12 bg-white py-2.5 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green transition-colors"
                            />
                        {/if}
                    </div>
                {/each}

                <div class="pt-4 border-t border-black/5">
                    <button
                        type="submit"
                        disabled={submitting}
                        class="w-full bg-green hover:bg-green/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-3 px-4 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        {#if submitting}
                            <div
                                class="w-4 h-4 border-2 border-ink/40 border-t-ink rounded-full animate-spin"
                            ></div>
                            Mengirim...
                        {:else}
                            <svg viewBox="0 0 24 24" class="w-4 h-4"
                                ><path
                                    fill="currentColor"
                                    d="M2 21V3l20 9-20 9zm2-2.5L17.5 12 4 5.5v5l9 1.5-9 1.5z"
                                /></svg
                            >
                            Kirim Pengajuan
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    {/if}
{/if}
