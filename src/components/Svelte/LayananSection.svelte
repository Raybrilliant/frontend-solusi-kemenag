<script>
    import Icon from "@iconify/svelte";
    import { fly, fade } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    let { services, apiUrl = "/api/layanan" } = $props();

    let layout = $state(/** @type {'grid'|'list'} */ ("grid"));
    let open = $state(false);
    let activeServiceId = $state(null);
    let subServicesByCategory = $state({});
    let loadingCategoryId = $state(null);
    let loadError = $state("");

    const activeService = $derived(
        services.find((s) => s.id === activeServiceId),
    );
    const relatedSubs = $derived(subServicesByCategory[activeServiceId] ?? []);
    const isLoadingActive = $derived(loadingCategoryId === activeServiceId);

    async function loadSubServices(id) {
        if (subServicesByCategory[id]) return;

        loadingCategoryId = id;
        loadError = "";
        try {
            const res = await fetch(`${apiUrl}?categoryId=${id}&limit=30`);
            const json = await res.json();
            subServicesByCategory = {
                ...subServicesByCategory,
                [id]: json?.data ?? [],
            };
        } catch {
            loadError = "Gagal memuat daftar layanan. Silakan coba lagi.";
            subServicesByCategory = {
                ...subServicesByCategory,
                [id]: [],
            };
        } finally {
            loadingCategoryId = null;
        }
    }

    async function openModal(id) {
        activeServiceId = id;
        open = true;
        await loadSubServices(id);
    }
    function closeModal() {
        open = false;
        loadError = "";
    }

    $effect(() => {
        const katId = Number(
            new URLSearchParams(window.location.search).get("kat"),
        );
        if (katId && services.some((s) => s.id === katId)) {
            openModal(katId);
            const url = new URL(window.location.href);
            url.searchParams.delete("kat");
            window.history.replaceState({}, "", url.toString());
        }
    });

    $effect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    });

    function inView(node) {
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    node.querySelectorAll(".card").forEach((card) =>
                        card.classList.add("visible"),
                    );
                    obs.disconnect();
                }
            },
            { threshold: 0.1 },
        );
        obs.observe(node);
        return { destroy: () => obs.disconnect() };
    }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && closeModal()} />

<div class="flex items-center gap-3 md:gap-5 my-5">
    <h3 class="text-base md:text-xl font-semibold uppercase shrink-0">
        Jelajahi Layanan Kami
    </h3>
    <div class="flex-1 h-0.5 bg-green hidden sm:block"></div>
    <div class="flex items-center gap-1 ml-auto sm:ml-0">
        <button
            onclick={() => (layout = "grid")}
            class="p-2 md:p-2.5 border transition-colors {layout === 'grid'
                ? 'bg-green text-cream border-green'
                : 'border-ink/20 hover:bg-ink/5'}"
            aria-label="Tampilan Grid"
        >
            <Icon icon="mdi:view-grid" width="16" height="16" />
        </button>
        <button
            onclick={() => (layout = "list")}
            class="p-2 md:p-2.5 border transition-colors {layout === 'list'
                ? 'bg-green text-cream border-green'
                : 'border-ink/20 hover:bg-ink/5'}"
            aria-label="Tampilan List"
        >
            <Icon icon="mdi:format-list-bulleted" width="16" height="16" />
        </button>
    </div>
</div>

{#key layout}
    <section
        use:inView
        class={layout === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5"
            : "flex flex-col gap-2 md:gap-3"}
        in:fade={{ duration: 200 }}
    >
        {#each services as service, i}
            {#if layout === "grid"}
                <div
                    class="card col-span-1 border border-gray-300 bg-white flex flex-col group cursor-pointer"
                    style="--delay: {i * 90}ms"
                    onclick={() => openModal(service.id)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) =>
                        e.key === "Enter" && openModal(service.id)}
                >
                    <div class="p-3 md:p-5 flex flex-col flex-1">
                        {#if service.iconBody?.includes(":")}
                            <Icon
                                icon={service.iconBody}
                                width="36"
                                height="36"
                                class="mb-2 md:mb-3 md:w-13 md:h-13"
                                style="color:#0F6B44"
                            />
                        {:else}
                            <svg
                                viewBox="0 0 24 24"
                                width="36"
                                height="36"
                                fill="currentColor"
                                class="mb-2 md:mb-3 md:w-13 md:h-13"
                                style="color:#0F6B44"
                            >
                                {@html service.iconBody}
                            </svg>
                        {/if}
                        <h4
                            class="text-[10px] md:text-sm font-semibold mb-1 md:mb-2 opacity-50"
                        >
                            {String(i + 1).padStart(2, "0")}
                        </h4>
                        <h4
                            class="text-sm md:text-base font-semibold mb-1 md:mb-2 uppercase leading-tight"
                        >
                            {service.title}
                        </h4>
                        <p class="text-xs text-gray-600 hidden sm:block">
                            {service.description}
                        </p>
                    </div>
                    <div class="flex items-stretch mt-auto">
                        <p
                            class="lihat-detail flex-1 px-3 md:px-5 py-2 md:py-3 text-[10px] md:text-xs font-bold uppercase flex items-center"
                        >
                            Lihat Detail
                        </p>
                        <div
                            class="bg-yellow px-2 md:px-3 flex items-center border-l border-ink/10"
                        >
                            <span class="block group-hover:hidden"
                                ><Icon
                                    icon="mdi:arrow-right"
                                    width="14"
                                    height="14"
                                /></span
                            >
                            <span class="hidden group-hover:block"
                                ><Icon
                                    icon="mdi:arrow-top-right"
                                    width="14"
                                    height="14"
                                /></span
                            >
                        </div>
                    </div>
                </div>
            {:else}
                <div
                    class="card border border-ink/10 bg-white flex items-center gap-3 md:gap-5 group cursor-pointer hover:border-green/40 transition-colors"
                    style="--delay: {i * 60}ms"
                    onclick={() => openModal(service.id)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) =>
                        e.key === "Enter" && openModal(service.id)}
                >
                    <div
                        class="w-12 md:w-16 h-12 md:h-16 bg-green/8 flex items-center justify-center shrink-0 self-stretch border-r border-ink/8"
                    >
                        {#if service.iconBody?.includes(":")}
                            <Icon
                                icon={service.iconBody}
                                width="22"
                                height="22"
                                style="color:#0F6B44"
                            />
                        {:else}
                            <svg
                                viewBox="0 0 24 24"
                                width="22"
                                height="22"
                                fill="currentColor"
                                style="color:#0F6B44"
                            >
                                {@html service.iconBody}
                            </svg>
                        {/if}
                    </div>
                    <div class="flex-1 py-3 md:py-4 min-w-0">
                        <span
                            class="text-[10px] md:text-xs font-semibold opacity-40"
                            >{String(i + 1).padStart(2, "0")}</span
                        >
                        <h4
                            class="text-sm font-bold uppercase leading-tight mt-0.5"
                        >
                            {service.title}
                        </h4>
                        <p
                            class="text-xs text-gray-500 mt-1 truncate hidden sm:block"
                        >
                            {service.description}
                        </p>
                    </div>
                    <div
                        class="list-action flex items-center shrink-0 self-stretch border-l border-ink/8"
                    >
                        <span
                            class="hidden md:block px-5 text-xs font-bold uppercase whitespace-nowrap"
                            >Lihat Detail</span
                        >
                        <div
                            class="w-10 md:w-12 h-full flex items-center justify-center border-l border-ink/8 bg-yellow"
                        >
                            <span class="block group-hover:hidden"
                                ><Icon
                                    icon="mdi:arrow-right"
                                    width="13"
                                    height="13"
                                /></span
                            >
                            <span class="hidden group-hover:block"
                                ><Icon
                                    icon="mdi:arrow-top-right"
                                    width="13"
                                    height="13"
                                /></span
                            >
                        </div>
                    </div>
                </div>
            {/if}
        {/each}
    </section>
{/key}

{#if open}
    <div
        class="fixed inset-0 z-40 bg-ink/50"
        onclick={closeModal}
        role="presentation"
        transition:fade={{ duration: 250 }}
    ></div>

    <div
        class="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-2xl shadow-2xl max-h-[85vh] md:max-h-[75vh] flex flex-col"
        transition:fly={{ y: 400, duration: 420, easing: cubicOut }}
    >
        <div class="flex justify-center pt-3 pb-1 shrink-0">
            <div class="w-10 h-1 rounded-full bg-ink/20"></div>
        </div>

        {#if activeService}
            <div
                class="px-4 md:px-6 py-3 md:py-4 border-b border-ink/10 flex items-center gap-3 md:gap-4 shrink-0"
            >
                <div
                    class="w-10 h-10 bg-green/10 flex items-center justify-center shrink-0"
                    style="color:#0F6B44"
                >
                    {#if activeService.iconBody?.includes(":")}
                        <Icon
                            icon={activeService.iconBody}
                            width="20"
                            height="20"
                        />
                    {:else}
                        <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="currentColor"
                        >
                            {@html activeService.iconBody}
                        </svg>
                    {/if}
                </div>
                <div class="flex-1 min-w-0">
                    <p
                        class="text-[10px] font-semibold uppercase tracking-widest opacity-50 mb-0.5"
                    >
                        Layanan
                    </p>
                    <h3
                        class="text-sm md:text-base font-bold uppercase leading-tight truncate"
                    >
                        {activeService.title}
                    </h3>
                </div>
                <button
                    onclick={closeModal}
                    class="w-8 h-8 flex items-center justify-center bg-ink/8 hover:bg-ink/15 transition-colors rounded-full shrink-0"
                    aria-label="Tutup"
                >
                    <Icon icon="mdi:close" width="14" height="14" />
                </button>
            </div>
        {/if}

        <div class="overflow-y-auto flex-1 px-4 md:px-6 py-3 md:py-4 space-y-2">
            {#if isLoadingActive}
                <div class="py-10 text-center">
                    <div
                        class="w-8 h-8 mx-auto border-2 border-green border-t-transparent rounded-full animate-spin"
                    ></div>
                    <p class="text-sm opacity-50 mt-3">Memuat layanan...</p>
                </div>
            {:else if loadError}
                <div class="py-10 text-center">
                    <p class="text-sm text-red-500 mb-4">{loadError}</p>
                    <button
                        onclick={() => loadSubServices(activeServiceId)}
                        class="inline-flex items-center gap-2 bg-green text-cream text-xs font-bold uppercase px-5 py-3 hover:bg-yellow hover:text-ink transition-colors cursor-pointer"
                    >
                        Coba Lagi
                    </button>
                </div>
            {:else if relatedSubs.length === 0}
                <div class="py-10 text-center">
                    <p class="text-sm opacity-50 mb-4">
                        Belum ada layanan turunan tersedia.
                    </p>
                </div>
            {:else}
                {#each relatedSubs as sub, i}
                    <a
                        href={`/sublayanan/${sub.id}`}
                        class="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white border border-ink/8 hover:border-green/40 hover:bg-green/3 transition-all cursor-pointer group/item"
                        style="animation: slideUp 0.3s ease {i * 0.06}s both"
                    >
                        <div
                            class="w-9 h-9 md:w-10 md:h-10 bg-green/10 flex items-center justify-center shrink-0"
                            style="color:#0F6B44"
                        >
                            {#if sub.iconBody?.includes(":")}
                                <Icon
                                    icon={sub.iconBody}
                                    width="16"
                                    height="16"
                                />
                            {:else}
                                <svg
                                    viewBox="0 0 24 24"
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                >
                                    {@html sub.iconBody}
                                </svg>
                            {/if}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4
                                class="text-sm md:text-base font-bold uppercase leading-tight mb-1"
                            >
                                {sub.title}
                            </h4>
                            <p class="text-xs text-gray-500 line-clamp-2">
                                {sub.description}
                            </p>
                        </div>
                        <div
                            class="hidden md:flex flex-col items-end gap-1 shrink-0"
                        >
                            <span
                                class="text-[10px] font-bold uppercase px-2 py-1 bg-ink/6"
                                >{sub.progress}</span
                            >
                            <span
                                class="text-[10px] font-bold uppercase px-2 py-1 bg-green/10 text-green"
                                >{sub.cost}</span
                            >
                        </div>
                        <div
                            class="w-8 h-8 bg-yellow flex items-center justify-center shrink-0 group-hover/item:translate-x-0.5 transition-transform"
                        >
                            <Icon
                                icon="mdi:arrow-top-right"
                                width="13"
                                height="13"
                            />
                        </div>
                    </a>
                {/each}
            {/if}
        </div>
    </div>
{/if}

<style>
    .card {
        opacity: 0;
        transform: translateY(20px);
        transition:
            opacity 0.45s ease,
            transform 0.45s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        transition-delay: var(--delay);
    }

    .card:global(.visible) {
        opacity: 1;
        transform: translateY(0);
    }

    .card:hover {
        border-color: rgba(246, 199, 68, 0.55);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    }

    .lihat-detail,
    .list-action {
        background-image: linear-gradient(#f6c744, #f6c744);
        background-repeat: no-repeat;
        background-size: 0% 100%;
        background-position: right center;
        transition:
            background-size 0.28s ease,
            color 0.2s ease;
    }

    .card:hover .lihat-detail,
    .card:hover .list-action {
        background-size: 100% 100%;
        color: #111111;
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(12px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
