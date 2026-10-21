<script lang="ts">
    let {
        apiUrl = "/api/ppid/permohonan",
        perPage = 8,
    } = $props();

    type Row = {
        id: string;
        namaPemohon: string;
        jenisData: string | null;
        tanggalPermohonan: string;
        tanggalDiselesaikan: string | null;
        status: string;
    };

    let rows = $state<Row[]>([]);
    let page = $state(1);
    let totalPages = $state(1);
    let total = $state(0);
    let loading = $state(true);
    let error = $state(false);
    let reqId = 0;

    const statusBadge: Record<string, string> = {
        Diterima: "bg-blue-50 text-blue-700 border-blue-200",
        Diproses: "bg-yellow/20 text-yellow-800 border-yellow/50",
        Selesai: "bg-green/10 text-green border-green/30",
        Ditolak: "bg-red-50 text-red-700 border-red-200",
    };

    function formatTanggal(iso: string | null | undefined): string {
        if (!iso) return "-";
        return new Date(iso).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    async function load(p: number) {
        const id = ++reqId;
        loading = true;
        error = false;
        try {
            const res = await fetch(
                `${apiUrl}?page=${p}&limit=${perPage}`,
            );
            if (!res.ok) throw new Error("gagal memuat data");
            const json = await res.json();
            if (id !== reqId) return;
            rows = json.data ?? [];
            total = json.pagination?.total ?? rows.length;
            totalPages = Math.max(1, json.pagination?.totalPages ?? 1);
            page = p;
        } catch {
            if (id === reqId) error = true;
        } finally {
            if (id === reqId) loading = false;
        }
    }

    $effect(() => {
        load(1);
    });
</script>

<div>
    <div
        class="overflow-x-auto border border-ink/10 bg-cream transition-opacity {loading
            ? 'opacity-60'
            : ''}"
    >
        <table class="w-full text-sm min-w-[720px]">
            <thead>
                <tr class="bg-ink/5 border-b border-ink/10">
                    <th
                        class="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink/50 whitespace-nowrap"
                    >
                        Nama Pemohon
                    </th>
                    <th
                        class="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink/50 whitespace-nowrap"
                    >
                        Jenis Permohonan
                    </th>
                    <th
                        class="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink/50 whitespace-nowrap"
                    >
                        Tanggal Permohonan
                    </th>
                    <th
                        class="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink/50 whitespace-nowrap"
                    >
                        Tanggal Diselesaikan
                    </th>
                    <th
                        class="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink/50 whitespace-nowrap"
                    >
                        Status
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each rows as r (r.id)}
                    <tr class="border-b border-ink/5 last:border-0">
                        <td
                            class="px-4 py-3 font-medium text-ink whitespace-nowrap"
                        >
                            {r.namaPemohon}
                        </td>
                        <td class="px-4 py-3 text-ink/70">
                            {r.jenisData ?? "-"}
                        </td>
                        <td
                            class="px-4 py-3 text-ink/60 whitespace-nowrap"
                        >
                            {formatTanggal(r.tanggalPermohonan)}
                        </td>
                        <td
                            class="px-4 py-3 text-ink/60 whitespace-nowrap"
                        >
                            {formatTanggal(r.tanggalDiselesaikan)}
                        </td>
                        <td class="px-4 py-3">
                            <span
                                class={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 border ${statusBadge[r.status] ?? "bg-ink/5 text-ink/60 border-ink/10"}`}
                            >
                                {r.status}
                            </span>
                        </td>
                    </tr>
                {/each}
                {#if loading && rows.length === 0}
                    {#each Array(4) as _, i (i)}
                        <tr class="border-b border-ink/5 last:border-0">
                            {#each Array(5) as _, j (j)}
                                <td class="px-4 py-3">
                                    <div
                                        class="h-3.5 bg-ink/10 animate-pulse {j === 0 ? 'w-24' : 'w-16'}"
                                    ></div>
                                </td>
                            {/each}
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
        {#if !loading && !error && rows.length === 0}
            <p class="px-4 py-10 text-center text-sm text-ink/40">
                Belum ada permohonan data yang diajukan.
            </p>
        {/if}
        {#if error}
            <div class="px-4 py-10 text-center">
                <p class="text-sm text-ink/50 mb-3">
                    Gagal memuat data permohonan.
                </p>
                <button
                    onclick={() => load(page)}
                    class="text-xs font-bold uppercase tracking-wide bg-ink text-white px-4 py-2 hover:bg-ink/80 transition-colors"
                >
                    Coba Lagi
                </button>
            </div>
        {/if}
    </div>

    {#if !error && totalPages > 1}
        <div class="flex items-center justify-between gap-3 mt-4">
            <p class="text-xs text-ink/50">
                Halaman {page} dari {totalPages} · {total} permohonan
            </p>
            <div class="flex gap-2">
                <button
                    onclick={() => load(page - 1)}
                    disabled={loading || page <= 1}
                    class="text-xs font-bold uppercase tracking-wide border border-ink/15 bg-cream px-3 py-1.5 hover:border-green transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                    &lsaquo; Sebelumnya
                </button>
                <button
                    onclick={() => load(page + 1)}
                    disabled={loading || page >= totalPages}
                    class="text-xs font-bold uppercase tracking-wide border border-ink/15 bg-cream px-3 py-1.5 hover:border-green transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                    Berikutnya &rsaquo;
                </button>
            </div>
        </div>
    {/if}
</div>
