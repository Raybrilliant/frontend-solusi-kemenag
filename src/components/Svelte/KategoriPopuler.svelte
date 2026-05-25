<script>
    let { apiUrl } = $props();

    let items = $state([]);
    let loading = $state(true);

    const maxCount = $derived(
        items.length ? Math.max(...items.map((i) => i.count)) : 1,
    );

    async function load() {
        loading = true;
        try {
            const res = await fetch(apiUrl);
            const json = await res.json();
            items = json.data ?? [];
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        load();
    });
</script>

{#if loading}
    <div class="space-y-4 mt-3 animate-pulse">
        {#each [1, 2, 3, 4, 5] as _}
            <div class="flex items-center gap-3">
                <div class="w-6 h-3 bg-gray-200 rounded shrink-0"></div>
                <div class="flex-1 h-3 bg-gray-200 rounded"></div>
                <div class="w-10 h-3 bg-gray-200 rounded shrink-0"></div>
            </div>
        {/each}
    </div>
{:else if !items.length}
    <p class="text-sm text-gray-400 mt-3">Tidak ada data.</p>
{:else}
    <ol class="mt-3 space-y-3">
        {#each items as item, i}
            {@const pct = (item.count / maxCount) * 100}
            <li class="flex items-center gap-3 text-sm">
                <span
                    class="text-xs font-bold text-gray-400 w-5 shrink-0 tabular-nums"
                >
                    {String(i + 1).padStart(2, "0")}
                </span>
                <span class="w-32 shrink-0 font-medium truncate"
                    >{item.label}</span
                >
                <div
                    class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"
                >
                    <div
                        class="h-full bg-green rounded-full"
                        style="width:{pct}%; transition: width 0.5s ease {i *
                            0.08}s"
                    ></div>
                </div>
                <span
                    class="text-sm font-bold tabular-nums shrink-0 w-12 text-right"
                >
                    {item.count.toLocaleString("id-ID")}
                </span>
            </li>
        {/each}
    </ol>
{/if}
