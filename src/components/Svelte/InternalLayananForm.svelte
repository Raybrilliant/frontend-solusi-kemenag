<script>
    import Icon from "@iconify/svelte";
    let { apiUrl = "/api/internal/services", userRole = "" } = $props();

    const adminRoles = ["super_admin", "admin", "operator", "humas"];
    const hasAdminAccess = $derived(adminRoles.includes(userRole));

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
        {#if toast.type === "success"}
            <Icon icon="mdi:check" width="18" height="18" class="shrink-0" />
        {:else}
            <Icon
                icon="mdi:alert-circle"
                width="18"
                height="18"
                class="shrink-0"
            />
        {/if}
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Tutup notifikasi"
        >
            <Icon icon="mdi:close" width="16" height="16" />
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
            {#if hasAdminAccess}
                <!-- Admin Panel Card -->
                <a
                    href="/admin"
                    class="group block bg-linear-to-br from-green/5 to-green/10 border border-green/20 rounded p-6 hover:border-green/50 hover:shadow-lg hover:shadow-green/5 hover:-translate-y-1 transition-all duration-300 mb-6 max-w-5xl mx-auto"
                >
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 rounded-xl bg-green/15 border border-green/25 flex items-center justify-center shrink-0 group-hover:bg-green/25 transition-colors"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                class="w-6 h-6 text-green"
                                fill="currentColor"
                            >
                                <path
                                    d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
                                />
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-ink text-lg">
                                Panel Admin
                            </h3>
                            <p class="text-sm text-ink/50 leading-relaxed">
                                Kelola layanan, permohonan, dan pengaturan
                                lainnya.
                            </p>
                        </div>
                        <div
                            class="flex items-center gap-1 text-green text-sm font-semibold shrink-0"
                        >
                            <span class="hidden sm:inline">Buka Panel</span>
                            <svg
                                viewBox="0 0 24 24"
                                class="w-4 h-4"
                                fill="currentColor"
                            >
                                <path
                                    d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
                                />
                            </svg>
                        </div>
                    </div>
                </a>
            {/if}

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
                            <Icon
                                icon={svc.icon}
                                width="24"
                                height="24"
                                class="text-green"
                            />
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
                            <Icon icon="mdi:arrow-right" class="w-4 h-4" />
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
                                <Icon
                                    icon={svc.icon}
                                    width="24"
                                    height="24"
                                    class="text-green/60"
                                />
                            </div>
                            <Icon
                                icon="mdi:open-in-new"
                                class="w-4 h-4 text-ink/20 group-hover:text-green/50 transition-colors"
                            />
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
                            <Icon icon="mdi:open-in-new" class="w-4 h-4" />
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
                <Icon icon="mdi:arrow-left" class="w-4 h-4" />
                Kembali ke daftar layanan
            </button>

            <div class="flex items-center gap-3 mb-6">
                <div
                    class="w-12 h-12 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center"
                >
                    <Icon
                        icon={activeService.icon}
                        width="24"
                        height="24"
                        class="text-green"
                    />
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
                            <Icon icon="mdi:send" class="w-4 h-4" />
                            Kirim Pengajuan
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    {/if}
{/if}
