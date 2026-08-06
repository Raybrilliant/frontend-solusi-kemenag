<script>
    import Icon from "@iconify/svelte";
    let { apiUrl = "/api/internal/services", userRole = "" } = $props();

    const adminRoles = ["super_admin", "admin", "operator", "humas", "satker"];
    const hasAdminAccess = $derived(adminRoles.includes(userRole));

    // ── State ────────────────────────────────────────────
    let services = $state([]);
    let externals = $state([]);
    let loading = $state(true);

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

</script>

<!-- ── Loading ────────────────────────────────────────── -->
{#if loading}
    <div class="flex items-center justify-center py-20">
        <div
            class="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin"
        ></div>
    </div>
{:else}
    <!-- ── Service List ────────────────────────────────── -->
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
                        <h3 class="font-bold text-ink text-lg">Panel Admin</h3>
                        <p class="text-sm text-ink/50 leading-relaxed">
                            Kelola layanan, permohonan, dan pengaturan lainnya.
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
                <a
                    href={`/sublayanan/${svc.id}`}
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
                </a>
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
{/if}
