<script>
    import Icon from "@iconify/svelte";
    import { fly } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    let { apiUrl = "/api/layanan-search" } = $props();

    let query = $state("");
    let focused = $state(false);
    let rootEl = $state(null);
    let loading = $state(false);
    let results = $state([]);

    const isOpen = $derived(query.trim().length >= 3 && focused);

    let _debounce;
    $effect(() => {
        const q = query.trim();
        clearTimeout(_debounce);

        if (q.length < 3) {
            results = [];
            loading = false;
            return;
        }

        _debounce = setTimeout(async () => {
            loading = true;
            try {
                const res = await fetch(
                    `${apiUrl}?q=${encodeURIComponent(q)}&limit=30`,
                );
                const json = await res.json();
                results = json?.data ?? [];
            } catch {
                results = [];
            } finally {
                loading = false;
            }
        }, 300);

        return () => clearTimeout(_debounce);
    });

    const grouped = $derived.by(() => {
        if (query.trim().length < 3) return [];

        const map = new Map();
        for (const sub of results) {
            if (!map.has(sub.relatedServiceId)) {
                map.set(sub.relatedServiceId, {
                    service: {
                        id: sub.relatedServiceId,
                        title: sub.categoryTitle,
                        iconBody: sub.categoryIconBody,
                    },
                    items: [],
                });
            }
            map.get(sub.relatedServiceId).items.push(sub);
        }
        return [...map.values()];
    });

    const totalFound = $derived(
        grouped.reduce((n, g) => n + g.items.length, 0),
    );

    function highlight(text, q) {
        if (!q || q.length < 3) return text;
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return String(text ?? "").replace(
            new RegExp(`(${safe})`, "gi"),
            '<mark style="background:#F6C744;padding:0 2px;font-style:normal">$1</mark>',
        );
    }

    function close() {
        focused = false;
    }

    function handleWindowClick(e) {
        if (rootEl && !rootEl.contains(e.target)) close();
    }
</script>

<svelte:window
    onclick={handleWindowClick}
    onkeydown={(e) => e.key === "Escape" && close()}
/>

<div
    bind:this={rootEl}
    class="relative md:border-2 md:border-ink md:bg-white/60 md:p-5"
>
    <div class="relative">
        <Icon
            icon="mdi:magnify"
            class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style="opacity:.4"
            width="20"
            height="20"
        />
        <input
            type="text"
            placeholder="Cari layanan... (minimal 3 huruf)"
            bind:value={query}
            onfocus={() => (focused = true)}
            class="w-full pl-12 pr-10 py-4 border-2 border-ink/10 bg-white text-sm outline-none focus:border-green transition-colors"
        />
        {#if query.length > 0}
            <button
                onclick={() => {
                    query = "";
                    focused = true;
                }}
                class="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity"
                style="opacity:.4"
                onmouseenter={(e) => (e.currentTarget.style.opacity = "1")}
                onmouseleave={(e) => (e.currentTarget.style.opacity = ".4")}
                aria-label="Hapus pencarian"
            >
                <Icon icon="mdi:close" width="16" height="16" />
            </button>
        {/if}
    </div>

    {#if isOpen}
        <div
            class="absolute top-full left-0 right-0 z-50 bg-white border border-ink/10 shadow-xl mt-1 max-h-120 overflow-y-auto"
            transition:fly={{ y: -8, duration: 200, easing: cubicOut }}
        >
            {#if loading}
                <div class="px-5 py-10 text-center">
                    <div
                        class="w-8 h-8 mx-auto border-2 border-green border-t-transparent rounded-full animate-spin"
                    ></div>
                    <p class="text-sm opacity-50 mt-3">Mencari layanan...</p>
                </div>
            {:else if grouped.length === 0}
                <div class="px-5 py-10 text-center">
                    <Icon
                        icon="mdi:magnify"
                        class="mx-auto mb-3 opacity-20"
                        width="40"
                        height="40"
                    />
                    <p class="text-sm opacity-50">
                        Tidak ada layanan yang sesuai dengan
                    </p>
                    <p class="text-sm font-semibold mt-0.5">"{query}"</p>
                </div>
            {:else}
                {#each grouped as group}
                    <div
                        class="flex items-center gap-3 px-5 py-2.5 border-b border-ink/8 sticky top-0 bg-ink/3"
                    >
                        {#if group.service}
                            <div
                                style="color:#0F6B44;width:16px;height:16px;display:flex;align-items:center;shrink-0:true"
                            >
                                <Icon
                                    icon={group.service.iconBody ||
                                        "mdi:folder"}
                                    width="16"
                                    height="16"
                                />
                            </div>
                            <span
                                class="text-xs font-black uppercase tracking-wider"
                                style="opacity:.55">{group.service.title}</span
                            >
                        {/if}
                        <span
                            class="ml-auto text-[10px] font-bold px-2 py-0.5"
                            style="background:rgba(15,107,68,.1);color:#0F6B44"
                        >
                            {group.items.length} layanan
                        </span>
                    </div>

                    {#each group.items as sub}
                        <a
                            href={`/sublayanan/${sub.id}`}
                            onclick={close}
                            class="flex items-center gap-4 px-5 py-3.5 border-b border-ink/6 transition-colors group/row"
                            style="background:white"
                            onmouseenter={(e) =>
                                (e.currentTarget.style.background =
                                    "rgba(15,107,68,.03)")}
                            onmouseleave={(e) =>
                                (e.currentTarget.style.background = "white")}
                        >
                            <div
                                class="w-9 h-9 flex items-center justify-center shrink-0"
                                style="background:rgba(15,107,68,.08);color:#0F6B44"
                            >
                                <Icon
                                    icon={sub.iconBody || "mdi:folder"}
                                    width="16"
                                    height="16"
                                />
                            </div>

                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-semibold leading-tight">
                                    {@html highlight(sub.title, query)}
                                </p>
                                <p
                                    class="text-xs mt-0.5 truncate"
                                    style="opacity:.5"
                                >
                                    {@html highlight(sub.description, query)}
                                </p>
                            </div>

                            <div class="flex items-center gap-1.5 shrink-0">
                                <span
                                    class="text-[10px] font-bold uppercase px-2 py-1"
                                    style="background:rgba(17,17,17,.06)"
                                    >{sub.progress}</span
                                >
                                <span
                                    class="text-[10px] font-bold uppercase px-2 py-1"
                                    style="background:rgba(15,107,68,.1);color:#0F6B44"
                                    >{sub.cost}</span
                                >
                                <div
                                    class="w-7 h-7 flex items-center justify-center ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
                                    style="background:#F6C744"
                                >
                                    <Icon
                                        icon="mdi:arrow-top-right"
                                        width="12"
                                        height="12"
                                    />
                                </div>
                            </div>
                        </a>
                    {/each}
                {/each}

                <div
                    class="px-5 py-3 border-t border-ink/8 text-center"
                    style="opacity:.4"
                >
                    <p class="text-xs">
                        {totalFound} layanan ditemukan untuk "{query}"
                    </p>
                </div>
            {/if}
        </div>
    {/if}
</div>
