<script lang="ts">
    let { streamUrl = "/api/ppid/stream" } = $props();

    let total = $state<number | null>(null);
    let selesai = $state<number | null>(null);
    let ditolak = $state<number | null>(null);
    let proses = $state<number | null>(null);
    let updatedAt = $state<Date | null>(null);

    // Statistik didorong via SSE (event ppid:stats) — tanpa polling.
    // Backend mengirim state awal saat tersambung dan push ulang saat ada
    // permohonan baru maupun perubahan status oleh admin.
    $effect(() => {
        const es = new EventSource(streamUrl);

        es.addEventListener("ppid:stats", (e) => {
            try {
                const stats = JSON.parse(e.data);
                total = stats.total;
                proses = stats.diproses;
                selesai = stats.selesai;
                ditolak = stats.ditolak;
                updatedAt = new Date();
            } catch {
                // abaikan payload tak valid; koneksi tetap terbuka
            }
        });

        return () => {
            es.close();
        };
    });

    const cards = $derived([
        { label: "Total Permohonan", value: total },
        { label: "Dipenuhi", value: selesai },
        { label: "Ditolak", value: ditolak },
        { label: "Dalam Proses", value: proses },
    ]);
</script>

<div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {#each cards as c (c.label)}
            <div class="bg-cream border border-ink/10 p-5 text-center">
                {#if c.value === null}
                    <div
                        class="h-9 w-16 mx-auto mb-1.5 bg-ink/10 animate-pulse"
                    ></div>
                {:else}
                    <p class="text-3xl font-black text-ink mb-1">
                        {c.value}
                    </p>
                {/if}
                <p
                    class="text-[11px] font-bold uppercase tracking-wider text-ink/40"
                >
                    {c.label}
                </p>
            </div>
        {/each}
    </div>
    <p
        class="mt-4 text-[11px] text-ink/30 text-center flex items-center justify-center gap-1.5"
    >
        <span
            class="inline-block w-1.5 h-1.5 rounded-full bg-green animate-pulse"
        ></span>
        {#if updatedAt}
            Diperbarui realtime ·
            {updatedAt.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })}
        {:else}
            Memuat data statistik...
        {/if}
    </p>
</div>
