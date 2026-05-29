<script>
    import Icon from "@iconify/svelte";

    let { apiUrl } = $props();

    const tabs = ["Sedang Diproses", "Selesai Terbaru"];
    const tabStatus = {
        "Sedang Diproses": "Diproses",
        "Selesai Terbaru": "Selesai",
    };

    let cache = {};
    let activeTab = $state("Sedang Diproses");
    let items = $state([]);
    let loading = $state(true);

    const statusColor = {
        Diterima: { bg: "#DBEAFE", text: "#1E40AF" },
        Diproses: { bg: "#FEF3C7", text: "#92400E" },
        Selesai: { bg: "#D1FAE5", text: "#065F46" },
        Ditolak: { bg: "#FEE2E2", text: "#991B1B" },
    };

    async function loadTab(tab) {
        const status = tabStatus[tab];
        if (cache[status]) {
            items = cache[status];
            loading = false;
            return;
        }
        loading = true;
        try {
            const res = await fetch(
                `${apiUrl}?status=${encodeURIComponent(status)}`,
            );
            const json = await res.json();
            const payload = json.data ?? [];
            cache[status] = payload;
            items = payload;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        loadTab(activeTab);
    });
</script>

<div class="border rounded-lg overflow-hidden p-5 h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center gap-3 border-b border-gray-100">
        <Icon
            icon="mdi:format-list-bulleted"
            width="24"
            height="24"
            class="text-green shrink-0"
        />
        <h2 class="text-xl font-bold uppercase tracking-tight">
            Layanan Terbaru
        </h2>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-100">
        {#each tabs as tab}
            <button
                class="py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors {activeTab ===
                tab
                    ? 'border-green text-green'
                    : 'border-transparent text-gray-400 hover:text-gray-600'}"
                onclick={() => (activeTab = tab)}
            >
                {tab}
            </button>
        {/each}
    </div>

    <!-- Skeleton -->
    {#if loading}
        <ul class="divide-y divide-gray-100 animate-pulse flex-1">
            {#each [1, 2, 3] as _}
                <li class="flex items-center gap-3 px-5 py-3">
                    <div
                        class="w-10 h-10 rounded-lg bg-gray-200 shrink-0"
                    ></div>
                    <div class="flex-1 space-y-2">
                        <div class="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div class="h-2.5 bg-gray-100 rounded w-1/2"></div>
                    </div>
                    <div class="h-5 w-16 bg-gray-200 rounded shrink-0"></div>
                </li>
            {/each}
        </ul>

        <!-- List -->
    {:else}
        {#key activeTab}
            <ul
                class="divide-y divide-gray-200 bg-white/20 rounded-xl shadow-sm flex-1"
            >
                {#each items as item, i}
                    <li
                        class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer group item-anim"
                        style="animation-delay:{(i * 0.07).toFixed(2)}s"
                    >
                        <!-- Icon -->
                        <div
                            class="w-10 h-10 rounded-lg bg-green flex items-center justify-center shrink-0"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                class="text-white"
                            >
                                {@html item.iconBody}
                            </svg>
                        </div>

                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <p
                                class="text-sm font-semibold leading-tight truncate"
                            >
                                {item.title}
                            </p>
                            <p class="text-xs mt-0.5 text-gray-500">
                                #{item.kode} &nbsp;·&nbsp; {item.tanggal}
                            </p>
                        </div>

                        <!-- Badge -->
                        <span
                            class="text-xs font-semibold px-2.5 py-1 rounded shrink-0"
                            style="background:{(
                                statusColor[item.status] ?? statusColor.Diproses
                            ).bg}; color:{(
                                statusColor[item.status] ?? statusColor.Diproses
                            ).text}"
                        >
                            {item.status}
                        </span>

                        <!-- Chevron -->
                        <Icon
                            icon="mdi:chevron-right"
                            width="14"
                            height="14"
                            class="text-gray-300 shrink-0 group-hover:text-green transition-colors"
                        />
                    </li>
                {/each}

                {#if items.length === 0}
                    <li class="px-5 py-8 text-center text-sm text-gray-400">
                        Tidak ada data.
                    </li>
                {/if}
            </ul>
        {/key}
    {/if}

    <p class="text-sm text-gray-500 text-center mt-2 animate-pulse">
        Hanya 5 layanan terbaru yang ditampilkan.
    </p>
</div>

<style>
    .item-anim {
        opacity: 0;
        transform: translateY(6px);
        animation: slideUp 0.25s ease-out forwards;
    }
    @keyframes slideUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
