<script>
    import Icon from "@iconify/svelte";

    let {
        apiUrl = "/api/cek-progress",
        streamUrl = "/api/cek-progress-stream",
    } = $props();

    let query = $state("");
    let loading = $state(false);
    let data = $state(null);
    let error = $state("");
    let now = $state(Date.now());
    let activeKode = $state("");
    let connected = $state(false);

    const isPengaduan = $derived(
        typeof data?.kode === "string" && data.kode.startsWith("ADUAN-"),
    );

    const elapsed = $derived(
        data?.startTime
            ? Math.floor((now - new Date(data.startTime).getTime()) / 1000)
            : 0,
    );
    const totalSec = $derived(data ? data.durasiMenit * 60 : 1);
    const remainSec = $derived(Math.max(0, totalSec - elapsed));
    const pct = $derived(data?.startTime ? (remainSec / totalSec) * 100 : 0);
    const overtime = $derived(
        data?.status === "Diproses" && !!data?.startTime && elapsed > totalSec,
    );
    const overtimeSec = $derived(Math.max(0, elapsed - totalSec));

    const barColor = $derived(
        data?.status === "Selesai"
            ? "#0F6B44"
            : pct > 50
              ? "#0F6B44"
              : pct > 20
                ? "#F6C744"
                : "#EF4444",
    );

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function formatCountdown(sec) {
        if (sec >= 86400) {
            const d = Math.floor(sec / 86400);
            const h = Math.floor((sec % 86400) / 3600);
            return `${d} hari ${pad(h)} jam`;
        }
        if (sec >= 3600) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            return `${pad(h)}:${pad(m)}:${pad(s)}`;
        }
        return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
    }

    function formatOvertime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        if (m >= 60) {
            const h = Math.floor(m / 60);
            return `${h} jam ${m % 60} menit`;
        }
        return `${m} menit ${pad(s)} detik`;
    }

    function formatDatetime(iso) {
        if (!iso) return "-";
        const d = new Date(iso);
        return d.toLocaleString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // Live countdown ticker
    $effect(() => {
        if (data?.status === "Diproses") {
            const t = setInterval(() => {
                now = Date.now();
            }, 1000);
            return () => clearInterval(t);
        }
    });

    // SSE stream — reconnects whenever activeKode changes
    $effect(() => {
        if (!activeKode) return;
        connected = false;

        const es = new EventSource(
            `${streamUrl}?kode=${encodeURIComponent(activeKode)}`,
        );

        es.onopen = () => {
            connected = true;
        };
        es.onerror = () => {
            connected = false;
        };
        es.onmessage = (e) => {
            connected = true;
            try {
                const json = JSON.parse(e.data);
                if (!json.error) {
                    data = json;
                    now = Date.now();
                }
            } catch {}
        };

        return () => {
            es.close();
            connected = false;
        };
    });

    async function search(e) {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;
        loading = true;
        error = "";
        data = null;
        try {
            const res = await fetch(`${apiUrl}?kode=${encodeURIComponent(q)}`);
            const json = await res.json();
            if (!json.success) {
                error = json.message ?? "Terjadi kesalahan";
            } else {
                const payload = json.data ?? json;
                data = payload;
                now = Date.now();
                activeKode = payload.id ?? payload.kode ?? "";
            }
        } finally {
            loading = false;
        }
    }

    function reset() {
        data = null;
        error = "";
        query = "";
        activeKode = "";
    }
</script>

<!-- ── Search form ── -->
<form
    onsubmit={search}
    class="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-xl"
>
    <div class="flex-1 relative">
        <Icon
            icon="mdi:magnify"
            class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            width="18"
            height="18"
        />
        <input
            bind:value={query}
            type="text"
            placeholder="Masukkan nomor tiket, contoh: HJ-2405-00125"
            class="w-full pl-11 pr-4 py-3 sm:py-3.5 border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green/30 focus:border-green transition-all"
        />
    </div>
    <button
        type="submit"
        disabled={loading}
        class="w-full sm:w-auto px-6 py-3 sm:py-3.5 bg-green text-white text-sm font-semibold uppercase hover:bg-green/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2"
    >
        {#if loading}
            <Icon
                icon="mdi:loading"
                class="animate-spin"
                width="18"
                height="18"
            />
        {/if}
        Cek Status
    </button>
</form>

<!-- ── Error ── -->
{#if error}
    <div
        class="mt-6 flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100 max-w-xl result-enter"
    >
        <Icon
            icon="mdi:alert-circle"
            class="shrink-0 text-red-400 mt-0.5"
            width="18"
            height="18"
        />
        <div>
            <p class="text-sm font-semibold text-red-700">
                Tiket Tidak Ditemukan
            </p>
            <p class="text-sm text-red-600 mt-0.5">{error}</p>
        </div>
    </div>
{/if}

<!-- ── Skeleton ── -->
{#if loading}
    <div
        class="mt-6 w-full max-w-2xl rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse"
    >
        <div class="p-6 flex gap-4">
            <div class="w-14 h-14 rounded-xl bg-gray-200 shrink-0"></div>
            <div class="flex-1 space-y-3">
                <div class="h-5 bg-gray-200 rounded w-2/3"></div>
                <div class="h-3.5 bg-gray-100 rounded w-1/2"></div>
                <div class="h-3 bg-gray-100 rounded w-1/3"></div>
            </div>
            <div class="w-20 h-7 bg-gray-200 rounded-full shrink-0"></div>
        </div>
        <div class="px-6 pb-6 space-y-3">
            <div class="h-3 bg-gray-100 rounded w-1/4"></div>
            <div class="h-4 bg-gray-200 rounded-full w-full"></div>
            <div class="h-3 bg-gray-100 rounded w-1/3"></div>
        </div>
    </div>
{/if}

<!-- ── Result card ── -->
{#if data}
    {#if isPengaduan}
        <!-- ═══════════════════════════════════════════════════
             PENGADUAN CARD
        ════════════════════════════════════════════════════ -->
        {@const aduanSteps = [
            { key: "Baru", label: "Diterima" },
            { key: "Diproses", label: "Diproses" },
            { key: "Selesai", label: "Selesai" },
        ]}
        {@const aduanActiveIdx =
            data.status === "Selesai" ? 2 : data.status === "Diproses" ? 1 : 0}
        <div
            class={`mt-6 w-full max-w-2xl border-2 bg-white shadow-sm overflow-hidden result-enter
            ${data.status === "Selesai" ? "border-green" : data.status === "Diproses" ? "border-yellow" : "border-blue-500"}`}
        >
            <!-- Header -->
            <div
                class="p-4 md:p-6 flex items-start gap-3 md:gap-4 border-b border-gray-100"
            >
                <div
                    class={`w-11 h-11 md:w-14 md:h-14 flex items-center justify-center shrink-0
                    ${data.status === "Selesai" ? "bg-green" : data.status === "Diproses" ? "bg-yellow" : "bg-blue-100"}`}
                >
                    <!-- megaphone / alert icon -->
                    <Icon
                        icon="mdi:bullhorn-variant"
                        width="22"
                        height="22"
                        class={data.status === "Selesai"
                            ? "text-white"
                            : data.status === "Diproses"
                              ? "text-ink"
                              : "text-blue-600"}
                    />
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-0.5">
                        <p
                            class="text-[10px] font-bold uppercase tracking-widest text-gray-400"
                        >
                            Pengaduan #{data.kode}
                        </p>
                        <span
                            class="text-[10px] font-bold uppercase px-2 py-0.5 bg-ink/8 text-ink/60"
                        >
                            {data.title}
                        </span>
                    </div>
                    <h3 class="text-base md:text-lg font-bold leading-snug">
                        Laporan Pengaduan Masyarakat
                    </h3>
                    <!-- <p class="text-xs md:text-sm text-gray-500 mt-0.5 line-clamp-2">{data.description}</p> -->
                </div>
                <!-- Status badge -->
                <span
                    class={`text-xs font-bold px-3 py-1.5 shrink-0
                    ${data.status === "Selesai" ? "bg-green/10 text-green" : data.status === "Diproses" ? "bg-yellow/40 text-yellow-800" : "bg-blue-100 text-blue-700"}`}
                >
                    {data.status === "Selesai"
                        ? "✓ Selesai"
                        : data.status === "Diproses"
                          ? "⟳ Diproses"
                          : "◉ Diterima"}
                </span>
            </div>

            <!-- Step tracker -->
            <div class="px-4 md:px-6 pt-4 md:pt-5 pb-1">
                <div class="flex items-center">
                    {#each aduanSteps as step, i}
                        {@const done = i < aduanActiveIdx}
                        {@const active = i === aduanActiveIdx}
                        <div
                            class="flex flex-col items-center gap-1.5 shrink-0"
                        >
                            <div
                                class={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                ${done ? "bg-green border-green text-white" : active ? "bg-white border-blue-500 text-blue-600 ring-4 ring-blue-100" : "bg-white border-gray-200 text-gray-300"}`}
                            >
                                {#if done}
                                    <Icon
                                        icon="mdi:check"
                                        width="14"
                                        height="14"
                                    />
                                {:else if active && step.key === "Baru"}
                                    <span
                                        class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse block"
                                    ></span>
                                {:else}
                                    {i + 1}
                                {/if}
                            </div>
                            <span
                                class={`text-[10px] font-semibold ${done ? "text-green" : active ? "text-gray-700" : "text-gray-300"}`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {#if i < aduanSteps.length - 1}
                            <div
                                class={`flex-1 h-0.5 mx-2 mb-4 ${i < aduanActiveIdx ? "bg-green" : "bg-gray-200"}`}
                            ></div>
                        {/if}
                    {/each}
                </div>
            </div>

            <!-- Status info block -->
            <div class="px-4 md:px-6 py-4 md:py-5">
                {#if data.status === "Baru"}
                    <div
                        class="bg-blue-50 border border-blue-100 p-4 flex gap-3"
                    >
                        <div
                            class="shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center"
                        >
                            <Icon
                                icon="mdi:clock-outline"
                                width="18"
                                height="18"
                                class="text-blue-500"
                            />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-blue-800">
                                Pengaduan Diterima
                            </p>
                            <p
                                class="text-xs text-blue-600 mt-1 leading-relaxed"
                            >
                                Pengaduan Anda telah diterima dan akan segera
                                ditindaklanjuti oleh petugas.
                            </p>
                            {#if data.receivedTime}
                                <p class="text-xs text-blue-400 mt-2">
                                    Diterima pada: <span class="font-semibold"
                                        >{formatDatetime(
                                            data.receivedTime,
                                        )}</span
                                    >
                                </p>
                            {/if}
                        </div>
                    </div>
                {:else if data.status === "Diproses"}
                    <div
                        class="bg-yellow/20 border border-yellow/50 p-4 flex gap-3"
                    >
                        <div
                            class="shrink-0 w-9 h-9 rounded-full bg-yellow/40 flex items-center justify-center"
                        >
                            <Icon
                                icon="mdi:information-outline"
                                width="18"
                                height="18"
                                class="text-yellow-700"
                            />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-yellow-800">
                                Sedang Ditindaklanjuti
                            </p>
                            <p
                                class="text-xs text-yellow-700 mt-1 leading-relaxed"
                            >
                                Pengaduan Anda sedang dalam proses penanganan
                                oleh petugas terkait.
                            </p>
                            {#if data.startTime}
                                <p class="text-xs text-yellow-600 mt-2">
                                    Mulai diproses: <span class="font-semibold"
                                        >{formatDatetime(data.startTime)}</span
                                    >
                                </p>
                            {/if}
                        </div>
                    </div>
                {:else}
                    <!-- Selesai -->
                    <div
                        class="bg-green/8 border border-green/20 p-4 flex gap-3"
                    >
                        <div
                            class="shrink-0 w-9 h-9 rounded-full bg-green flex items-center justify-center"
                        >
                            <Icon
                                icon="mdi:check"
                                width="18"
                                height="18"
                                class="text-white"
                            />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-green">
                                Pengaduan Telah Selesai
                            </p>
                            <p
                                class="text-xs text-green/70 mt-1 leading-relaxed"
                            >
                                Pengaduan Anda telah selesai ditindaklanjuti.
                                Terima kasih atas partisipasi Anda.
                            </p>
                        </div>
                    </div>
                {/if}

                <!-- Catatan admin -->
                {#if data.message && data.status === "Selesai"}
                    <div class="mt-4 p-4 bg-yellow/15 border border-yellow/40">
                        <div class="flex items-center gap-2 mb-2">
                            <Icon
                                icon="mdi:message-text-outline"
                                width="14"
                                height="14"
                                class="text-yellow-700 shrink-0"
                            />
                            <p
                                class="text-[10px] font-bold uppercase tracking-widest text-yellow-800"
                            >
                                Tindakan Instansi
                            </p>
                        </div>
                        <p
                            class="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap"
                        >
                            {data.message}
                        </p>
                    </div>
                {/if}

                <!-- Deskripsi lengkap -->
                <div class="mt-4 p-4 bg-gray-50 border border-gray-100">
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2"
                    >
                        Isi Pengaduan
                    </p>
                    <p
                        class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                    >
                        {data.description}
                    </p>
                </div>
            </div>

            <!-- Meta row -->
            <div
                class="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 bg-gray-50/60"
            >
                <div>
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5"
                    >
                        Tanggal Masuk
                    </p>
                    <p class="text-xs md:text-sm font-semibold">
                        {data.tanggal}
                    </p>
                </div>
                <div class="sm:border-l sm:border-gray-200 sm:pl-4">
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5"
                    >
                        {data.status === "Baru"
                            ? "Waktu Diterima"
                            : "Waktu Mulai Proses"}
                    </p>
                    <p class="text-xs md:text-sm font-semibold">
                        {data.status === "Baru"
                            ? formatDatetime(data.receivedTime)
                            : formatDatetime(data.startTime)}
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div
                class="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 flex items-center justify-between gap-3"
            >
                <button
                    onclick={reset}
                    class="text-sm text-gray-400 hover:text-gray-700 font-medium flex items-center gap-1.5 transition-colors"
                >
                    <Icon icon="mdi:arrow-left" width="14" height="14" />
                    Cari tiket lain
                </button>
                {#if data.status === "Selesai" && data.fileUrl}
                    <a
                        href={data.fileUrl}
                        download
                        class="inline-flex items-center gap-2 px-5 py-2.5 bg-green text-white text-sm font-bold hover:bg-green/90 active:scale-95 transition-all"
                    >
                        <Icon icon="mdi:download" width="16" height="16" />
                        Unduh Dokumen
                    </a>
                {:else}
                    <a
                        href="/pengaduan"
                        class="text-xs text-green font-semibold hover:underline"
                    >
                        Kirim pengaduan baru →
                    </a>
                {/if}
            </div>
        </div>
    {:else}
        <!-- ═══════════════════════════════════════════════════
             PERMOHONAN CARD (existing)
        ════════════════════════════════════════════════════ -->
        <div
            class={`mt-6 w-full max-w-2xl rounded ${data.status === "Ditolak" ? "border-red-700" : data.status === "Diterima" ? "border-blue-700" : "border-green"} border-2 bg-white shadow-sm overflow-hidden result-enter`}
        >
            <!-- Header -->
            <div
                class="p-4 md:p-6 flex items-start gap-3 md:gap-4 border-b border-gray-100"
            >
                <div
                    class="w-11 h-11 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0
            {data.status === 'Ditolak'
                        ? 'bg-red-100'
                        : data.status === 'Diterima'
                          ? 'bg-blue-100'
                          : 'bg-green'}"
                >
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class={data.status === "Ditolak"
                            ? "text-red-400"
                            : data.status === "Diterima"
                              ? "text-blue-500"
                              : "text-white"}
                    >
                        {@html data.iconBody}
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5"
                    >
                        #{data.kode}
                    </p>
                    <h3 class="text-base md:text-lg font-bold leading-snug">
                        {data.title}
                    </h3>
                    <p class="text-xs md:text-sm text-gray-500 mt-0.5">
                        {data.description}
                    </p>
                </div>
                <!-- Status badge -->
                <div class="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                        class="text-xs font-bold px-3 py-1.5 rounded-full
            {data.status === 'Selesai'
                            ? 'bg-green/10 text-green'
                            : data.status === 'Ditolak'
                              ? 'bg-red-100 text-red-600'
                              : data.status === 'Diterima'
                                ? 'bg-blue-100 text-blue-700'
                                : overtime
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-yellow/30 text-yellow-800'}"
                    >
                        {data.status === "Selesai"
                            ? "✓ Selesai"
                            : data.status === "Ditolak"
                              ? "✕ Ditolak"
                              : data.status === "Diterima"
                                ? "◉ Diterima"
                                : overtime
                                  ? "⚠ Terlambat"
                                  : "⟳ Diproses"}
                    </span>
                </div>
            </div>

            <!-- Step tracker (semua status kecuali Ditolak) -->
            {#if data.status !== "Ditolak"}
                {@const steps = [
                    { key: "Diterima", label: "Diterima" },
                    { key: "Diproses", label: "Diproses" },
                    { key: "Selesai", label: "Selesai" },
                ]}
                {@const activeIdx =
                    data.status === "Selesai"
                        ? 2
                        : data.status === "Diproses"
                          ? 1
                          : 0}
                <div class="px-4 md:px-6 pt-4 md:pt-5 pb-1">
                    <div class="flex items-center">
                        {#each steps as step, i}
                            {@const done = i < activeIdx}
                            {@const active = i === activeIdx}
                            {@const isOvertime =
                                active && overtime && step.key === "Diproses"}
                            <div
                                class="flex flex-col items-center gap-1.5 shrink-0"
                            >
                                <div
                                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    {done
                                        ? 'bg-green border-green text-white'
                                        : isOvertime
                                          ? 'bg-orange-500 border-orange-500 text-white'
                                          : active
                                            ? 'bg-white border-green text-green ring-4 ring-green/10'
                                            : 'bg-white border-gray-200 text-gray-300'}"
                                >
                                    {#if done}
                                        <Icon
                                            icon="mdi:check"
                                            width="14"
                                            height="14"
                                        />
                                    {:else if isOvertime}
                                        <Icon
                                            icon="mdi:alert"
                                            width="14"
                                            height="14"
                                        />
                                    {:else if active && step.key === "Diterima"}
                                        <span
                                            class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse block"
                                        ></span>
                                    {:else}
                                        {i + 1}
                                    {/if}
                                </div>
                                <span
                                    class="text-[10px] font-semibold
                    {done
                                        ? 'text-green'
                                        : active
                                          ? 'text-gray-700'
                                          : 'text-gray-300'}"
                                >
                                    {step.label}
                                </span>
                            </div>
                            {#if i < steps.length - 1}
                                <div
                                    class="flex-1 h-0.5 mx-2 mb-4
                    {i < activeIdx ? 'bg-green' : 'bg-gray-200'}"
                                ></div>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Progress section -->
            <div class="px-4 md:px-6 py-4 md:py-5">
                {#if data.status === "Diterima"}
                    <div
                        class="rounded-lg bg-blue-50 border border-blue-100 p-4 flex gap-3"
                    >
                        <div
                            class="shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center"
                        >
                            <Icon
                                icon="mdi:clock-outline"
                                width="18"
                                height="18"
                                class="text-blue-500"
                            />
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-blue-800">
                                Berkas Diterima — Menunggu Antrian
                            </p>
                            <p
                                class="text-xs text-blue-600 mt-1 leading-relaxed"
                            >
                                Berkas Anda telah diterima oleh petugas.
                                <span class="font-semibold"
                                    >Countdown layanan akan dimulai</span
                                >
                                saat petugas mulai memproses permohonan Anda.
                            </p>
                            {#if data.receivedTime}
                                <p class="text-xs text-blue-400 mt-2">
                                    Diterima pada: <span class="font-semibold"
                                        >{formatDatetime(
                                            data.receivedTime,
                                        )}</span
                                    >
                                </p>
                            {/if}
                        </div>
                    </div>
                    <div class="mt-4 h-3 bg-gray-100 overflow-hidden">
                        <div class="h-full w-0 bg-blue-300"></div>
                    </div>
                    <p class="text-xs text-gray-400 mt-1.5">
                        Estimasi durasi layanan: <span
                            class="font-semibold text-gray-600"
                            >{data.durasiLabel}</span
                        >
                    </p>
                {:else if data.status === "Ditolak"}
                    <div
                        class="rounded-lg bg-red-50 border border-red-200 p-4 flex gap-3"
                    >
                        <div
                            class="shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center"
                        >
                            <Icon
                                icon="mdi:close"
                                width="18"
                                height="18"
                                class="text-red-500"
                            />
                        </div>
                        <div>
                            <p class="text-sm font-bold text-red-700">
                                Permohonan Ditolak
                            </p>
                            {#if data.message}
                                <p
                                    class="text-sm text-red-600 mt-1 leading-relaxed"
                                >
                                    <span class="font-semibold"
                                        >Alasan:
                                    </span>{data.message}
                                </p>
                            {/if}
                            <p class="text-xs text-red-400 mt-2">
                                Hubungi petugas atau ajukan kembali permohonan
                                dengan melengkapi persyaratan yang diminta.
                            </p>
                        </div>
                    </div>
                {:else if data.status === "Selesai"}
                    <div class="flex items-center gap-3 mb-3">
                        <Icon
                            icon="mdi:check-circle"
                            width="18"
                            height="18"
                            style="color:#0F6B44"
                        />
                        <span class="text-sm font-semibold text-green"
                            >Layanan telah selesai diproses</span
                        >
                    </div>
                    <div class="h-3 bg-green/20 overflow-hidden">
                        <div class="h-full bg-green" style="width:100%"></div>
                    </div>
                {:else if overtime}
                    <div class="flex items-center justify-between mb-2">
                        <span
                            class="text-xs font-bold uppercase tracking-widest text-red-500"
                            >Melewati Batas Waktu</span
                        >
                        <span class="text-xs text-red-500 font-semibold"
                            >+{formatOvertime(overtimeSec)}</span
                        >
                    </div>
                    <div class="h-3 bg-red-100 overflow-hidden">
                        <div class="h-full bg-red-500" style="width:100%"></div>
                    </div>
                    <div
                        class="mt-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex gap-2.5"
                    >
                        <Icon
                            icon="mdi:alert"
                            class="shrink-0 text-amber-500 mt-0.5"
                            width="16"
                            height="16"
                        />
                        <p class="text-xs text-amber-800 leading-relaxed">
                            <span class="font-bold">Hak Kompensasi: </span>
                            Layanan Anda melewati estimasi waktu. Anda berhak mengajukan
                            kompensasi sesuai standar pelayanan yang berlaku. Hubungi
                            petugas untuk informasi lebih lanjut.
                        </p>
                    </div>
                {:else}
                    <div class="flex items-center justify-between mb-2">
                        <span
                            class="text-xs font-bold uppercase tracking-widest text-gray-400"
                            >Sisa Waktu Layanan</span
                        >
                        <span
                            class="text-xl md:text-2xl font-bold tabular-nums"
                            style="color:{barColor}"
                        >
                            {formatCountdown(remainSec)}
                        </span>
                    </div>
                    <div class="h-3 bg-gray-100 overflow-hidden">
                        <div
                            class="h-full transition-all duration-1000"
                            style="width:{pct}%; background-color:{barColor}"
                        ></div>
                    </div>
                    <p class="text-xs text-gray-400 mt-1.5">
                        Estimasi selesai dalam <span
                            class="font-semibold text-gray-600"
                            >{data.durasiLabel}</span
                        > sejak pendaftaran
                    </p>
                {/if}
            </div>

            <!-- Meta row -->
            <div
                class="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 bg-gray-50/60"
            >
                <div>
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5"
                    >
                        Tanggal Masuk
                    </p>
                    <p class="text-xs md:text-sm font-semibold">
                        {data.tanggal}
                    </p>
                </div>
                <div class="sm:border-l sm:border-gray-200 sm:pl-4">
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5"
                    >
                        {data.status === "Diterima"
                            ? "Waktu Diterima"
                            : "Waktu Mulai Proses"}
                    </p>
                    <p class="text-xs md:text-sm font-semibold">
                        {data.status === "Diterima"
                            ? formatDatetime(data.receivedTime)
                            : formatDatetime(data.startTime)}
                    </p>
                </div>
                <div class="sm:border-l sm:border-gray-200 sm:pl-4">
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5"
                    >
                        Estimasi Durasi
                    </p>
                    <p class="text-xs md:text-sm font-semibold">
                        {data.durasiLabel}
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div
                class="px-4 md:px-6 py-3 md:py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3"
            >
                <button
                    onclick={reset}
                    class="text-sm text-gray-400 hover:text-gray-700 font-medium flex items-center gap-1.5 transition-colors"
                >
                    <Icon icon="mdi:arrow-left" width="14" height="14" />
                    Cari tiket lain
                </button>

                {#if data.status === "Selesai"}
                    <div class="flex flex-wrap items-center gap-2">
                        <a
                            href={`/survei?ticket=${encodeURIComponent(data.kode)}`}
                            class="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow text-ink text-sm font-bold hover:bg-yellow/90 active:scale-95 transition-all"
                        >
                            <Icon
                                icon="mdi:clipboard-text-outline"
                                width="16"
                                height="16"
                            />
                            Isi Survei
                        </a>
                        {#if data.fileUrl}
                            <a
                                href={data.fileUrl}
                                download
                                class="inline-flex items-center gap-2 px-5 py-2.5 bg-green text-white text-sm font-bold hover:bg-green/90 active:scale-95 transition-all"
                            >
                                <Icon
                                    icon="mdi:download"
                                    width="16"
                                    height="16"
                                />
                                Unduh Dokumen
                            </a>
                        {/if}
                    </div>
                {:else if data.status === "Diproses"}
                    <p class="text-xs text-gray-400">
                        Dokumen tersedia setelah layanan selesai
                    </p>
                {/if}
            </div>
        </div>
    {/if}
{/if}

<style>
    .result-enter {
        animation: resultSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes resultSlide {
        from {
            opacity: 0;
            transform: translateY(16px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
