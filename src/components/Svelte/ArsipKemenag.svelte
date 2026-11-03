<script>
    import Icon from "@iconify/svelte";

    let { apiUrl = "/api/internal/arsip" } = $props();

    // ── State ────────────────────────────────────────────
    let q = $state("");
    let debouncedQ = $state("");
    let format = $state("");
    let jenisSurat = $state("");
    let fromDate = $state("");
    let toDate = $state("");
    let showAll = $state(false);
    let page = $state(1);
    let showFilters = $state(false);

    let result = $state(null);
    let loading = $state(true);
    let error = $state("");
    let notConfigured = $state(false);

    let searchEl = $state(null);

    const formatIcons = {
        PDF: "mdi:file-pdf-box",
        Word: "mdi:file-word-box",
        Excel: "mdi:file-excel-box",
        PowerPoint: "mdi:file-powerpoint-box",
        Gambar: "mdi:file-image",
        Lainnya: "mdi:file-document-outline",
    };
    const formatColors = {
        PDF: "text-red-500",
        Word: "text-blue-600",
        Excel: "text-emerald-600",
        PowerPoint: "text-orange-500",
        Gambar: "text-purple-500",
        Lainnya: "text-ink/40",
    };

    const stats = $derived(result?.stats ?? null);
    const items = $derived(result?.data ?? []);
    const totalFiltered = $derived(result?.totalFiltered ?? 0);
    const hasQuery = $derived(
        debouncedQ.trim() !== "" || format || jenisSurat || fromDate || toDate,
    );

    // ── Debounce input pencarian (ala Google) ────────────
    let debounceTimer;
    $effect(() => {
        const value = q;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debouncedQ = value;
        }, 300);
        return () => clearTimeout(debounceTimer);
    });

    // ── Fetch setiap state pencarian berubah ─────────────
    async function doFetch(params) {
        loading = true;
        error = "";
        try {
            const res = await fetch(`${apiUrl}?${params}`);
            const data = await res.json();
            if (data.success) {
                result = data;
                notConfigured = false;
            } else {
                error = data.message || "Gagal memuat data.";
                notConfigured = data.configured === false;
            }
        } catch {
            error = "Gagal memuat data.";
        }
        loading = false;
    }

    function buildParams() {
        const params = new URLSearchParams();
        if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
        if (format) params.set("format", format);
        if (jenisSurat) params.set("jenis_surat", jenisSurat);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        if (showAll) {
            params.set("all", "1");
            params.set("page", String(page));
        }
        return params;
    }

    $effect(() => {
        doFetch(buildParams());
    });

    // Muat ulang manual: bypass cache 1 menit di server.
    function refreshData() {
        const params = buildParams();
        params.set("refresh", "1");
        doFetch(params);
    }

    // ── Helpers ──────────────────────────────────────────
    function setJenisSurat(value) {
        jenisSurat = jenisSurat === value ? "" : value;
        page = 1;
    }

    function clearAll() {
        q = "";
        format = "";
        jenisSurat = "";
        fromDate = "";
        toDate = "";
        showAll = false;
        page = 1;
    }

    function toggleLihatSemua() {
        showAll = !showAll;
        page = 1;
    }

    function focusSearch(e) {
        if (e.key === "/" && document.activeElement !== searchEl) {
            e.preventDefault();
            searchEl?.focus();
        }
    }

    function fmtDate(iso) {
        if (!iso) return "—";
        return new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(new Date(iso));
    }

    function fmtSize(size) {
        if (!size) return "—";
        const n = Number(size);
        if (!Number.isFinite(n)) return "—";
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / 1024 / 1024).toFixed(1)} MB`;
    }

    function fileLink(item) {
        return item.webViewLink ?? `https://drive.google.com/file/d/${item.id}/view`;
    }
</script>

<svelte:window onkeydown={focusSearch} />

{#if notConfigured}
    <div class="max-w-2xl mx-auto bg-white border border-amber-300 rounded-xl p-6">
        <div class="flex items-start gap-4">
            <Icon
                icon="mdi:alert-circle-outline"
                class="w-8 h-8 text-amber-500 shrink-0"
            />
            <div class="text-sm text-ink/70 leading-relaxed space-y-2">
                <h3 class="font-bold text-ink">Google Drive belum dikonfigurasi</h3>
                <p>Tambahkan variabel berikut ke file <code class="bg-cream px-1.5 py-0.5 rounded">.env</code> lalu restart server:</p>
                <ul class="list-disc list-inside space-y-1 text-ink/60">
                    <li><code class="bg-cream px-1 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> — email service account</li>
                    <li><code class="bg-cream px-1 rounded">GOOGLE_PRIVATE_KEY</code> — private key service account</li>
                    <li><code class="bg-cream px-1 rounded">GOOGLE_DRIVE_FOLDER_ID</code> — ID folder Arsip Kemenag</li>
                </ul>
                <p>Share folder <strong>Arsip Kemenag</strong> di Google Drive ke email service account dengan peran <strong>Viewer</strong>.</p>
                <p class="text-ink/50">{error}</p>
            </div>
        </div>
    </div>
{:else}
    <div class="max-w-2xl mx-auto">
        <div class="relative">
            <Icon
                icon="mdi:magnify"
                class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/35 pointer-events-none"
            />
            <input
                bind:this={searchEl}
                bind:value={q}
                type="text"
                placeholder="Cari surat atau arsip…  (tekan / untuk fokus)"
                aria-label="Cari surat atau arsip"
                class="w-full bg-white border border-ink/15 rounded-full pl-13 pr-13 py-4 text-sm sm:text-base shadow-sm focus:outline-none focus:border-green focus:shadow-lg focus:shadow-green/5 transition-all placeholder:text-ink/30"
            />
            {#if q}
                <button
                    type="button"
                    onclick={clearAll}
                    aria-label="Bersihkan pencarian"
                    class="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-ink/40 hover:bg-ink/5 hover:text-ink transition-colors"
                >
                    <Icon icon="mdi:close" class="w-5 h-5" />
                </button>
            {/if}
        </div>

        <!-- Quick filter jenis surat (chip statistik) -->
        {#if stats && stats.byJenisSurat.length}
            <div class="flex flex-wrap justify-center gap-2 mt-4">
                {#each stats.byJenisSurat as j (j.name)}
                    <button
                        type="button"
                        onclick={() => setJenisSurat(j.name)}
                        class="flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs font-semibold transition-all {jenisSurat ===
                        j.name
                            ? 'bg-green text-white border-green'
                            : 'bg-white text-ink/60 border-ink/15 hover:border-green/40 hover:text-green'}"
                    >
                        <Icon
                            icon="mdi:file-document-multiple-outline"
                            class="w-3.5 h-3.5"
                        />
                        {j.name}
                        <span class="opacity-60">{j.count}</span>
                    </button>
                {/each}
            </div>
        {/if}

        <div class="flex justify-center mt-4">
            <button
                type="button"
                onclick={() => (showFilters = !showFilters)}
                class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50 hover:text-green transition-colors"
            >
                <Icon icon="mdi:tune" class="w-4 h-4" />
                Filter Lanjutan
                <Icon
                    icon={showFilters ? "mdi:chevron-up" : "mdi:chevron-down"}
                    class="w-4 h-4"
                />
            </button>
        </div>

        {#if showFilters}
            <div
                class="mt-4 bg-white border border-ink/10 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <div>
                    <label
                        for="filter-jenis-surat"
                        class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5"
                        >Jenis Surat</label
                    >
                    <select
                        id="filter-jenis-surat"
                        onchange={(e) => {
                            jenisSurat = e.currentTarget.value;
                            page = 1;
                        }}
                        class="w-full border border-ink/20 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-green"
                    >
                        <option value="">Semua Jenis Surat</option>
                        {#each stats?.byJenisSurat ?? [] as j (j.name)}
                            <option value={j.name} selected={jenisSurat === j.name}
                                >{j.name} ({j.count})</option
                            >
                        {/each}
                    </select>
                </div>
                <div>
                    <label
                        for="filter-format"
                        class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5"
                        >Format File</label
                    >
                    <select
                        id="filter-format"
                        onchange={(e) => {
                            format = e.currentTarget.value;
                            page = 1;
                        }}
                        class="w-full border border-ink/20 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-green"
                    >
                        <option value="">Semua Format</option>
                        {#each stats?.byFormat ?? [] as f (f.name)}
                            {#if f.name !== "PDF"}
                                <option value={f.name} selected={format === f.name}
                                    >{f.name} ({f.count})</option
                                >
                            {/if}
                        {/each}
                    </select>
                </div>
                <div>
                    <label
                        for="filter-from"
                        class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5"
                        >Tanggal Surat Dari</label
                    >
                    <input
                        id="filter-from"
                        type="date"
                        bind:value={fromDate}
                        class="w-full border border-ink/20 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-green"
                    />
                </div>
                <div>
                    <label
                        for="filter-to"
                        class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5"
                        >Tanggal Surat Sampai</label
                    >
                    <input
                        id="filter-to"
                        type="date"
                        bind:value={toDate}
                        class="w-full border border-ink/20 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-green"
                    />
                </div>
                {#if format || jenisSurat || fromDate || toDate}
                    <button
                        type="button"
                        onclick={() => {
                            format = "";
                            jenisSurat = "";
                            fromDate = "";
                            toDate = "";
                            page = 1;
                        }}
                        class="justify-self-start lg:justify-self-end flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                    >
                        <Icon icon="mdi:filter-remove-outline" class="w-4 h-4" />
                        Reset Filter
                    </button>
                {/if}
            </div>
        {/if}
    </div>

    {#if error}
        <div
            class="max-w-2xl mx-auto mt-8 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600 text-center"
        >
            {error}
        </div>
    {:else if loading && !result}
        <div class="flex items-center justify-center py-16">
            <div
                class="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin"
            ></div>
        </div>
    {:else if stats}
        <div
            class="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mt-10"
        >
            <div class="bg-white border border-black/8 rounded p-5">
                <div class="flex items-center gap-2 text-ink/45 mb-2">
                    <Icon icon="mdi:folder-multiple-outline" class="w-4 h-4" />
                    <span
                        class="text-[10px] font-bold uppercase tracking-wider"
                        >Total Arsip</span
                    >
                </div>
                <p class="text-3xl font-extrabold text-ink">{stats.total}</p>
            </div>
            <div class="bg-white border border-black/8 rounded p-5">
                <div class="flex items-center gap-2 text-ink/45 mb-2">
                    <Icon icon="mdi:calendar-month-outline" class="w-4 h-4" />
                    <span
                        class="text-[10px] font-bold uppercase tracking-wider"
                        >Bulan Ini</span
                    >
                </div>
                <p class="text-3xl font-extrabold text-green">
                    {stats.bulanIni}
                </p>
            </div>
            <div class="bg-white border border-black/8 rounded p-5">
                <div class="flex items-center gap-2 text-ink/45 mb-2">
                    <Icon icon="mdi:file-star-outline" class="w-4 h-4" />
                    <span
                        class="text-[10px] font-bold uppercase tracking-wider"
                        >Jenis Surat Terbanyak</span
                    >
                </div>
                <p class="text-xl font-extrabold text-ink truncate">
                    {stats.byJenisSurat[0]?.name ?? "—"}
                </p>
                <p class="text-xs text-ink/40 mt-0.5">
                    {stats.byJenisSurat[0]?.count ?? 0} berkas ·
                    {stats.byJenisSurat.length} jenis
                </p>
            </div>
            <div class="bg-white border border-black/8 rounded p-5">
                <div class="flex items-center gap-2 text-ink/45 mb-2">
                    <Icon icon="mdi:sitemap-outline" class="w-4 h-4" />
                    <span
                        class="text-[10px] font-bold uppercase tracking-wider"
                        >Format Terbanyak</span
                    >
                </div>
                <p class="text-xl font-extrabold text-ink truncate">
                    {stats.byFormat[0]?.name ?? "—"}
                </p>
                <p class="text-xs text-ink/40 mt-0.5">
                    {stats.byFormat[0]?.count ?? 0} berkas · {stats.byFormat.length}
                    format
                </p>
            </div>
        </div>

        <div class="max-w-5xl mx-auto mt-10">
            <div class="flex items-center justify-between gap-3 mb-4">
                {#if hasQuery}
                    <p class="text-sm text-ink/50">
                        ≈ <span class="font-bold text-ink">{totalFiltered}</span>
                        hasil
                        {#if debouncedQ.trim()}
                            untuk
                            <span class="font-semibold text-ink"
                                >"{debouncedQ.trim()}"</span
                            >
                        {/if}
                    </p>
                {:else}
                    <h2 class="text-lg font-bold text-ink">File Terbaru</h2>
                {/if}

                <div class="flex items-center gap-4 shrink-0">
                    <button
                        type="button"
                        onclick={refreshData}
                        title="Muat ulang data dari Google Drive"
                        aria-label="Muat ulang data"
                        class="w-8 h-8 flex items-center justify-center rounded-full border border-ink/15 bg-white text-ink/50 hover:text-green hover:border-green/40 transition-colors"
                    >
                        <Icon
                            icon="mdi:refresh"
                            class={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                        />
                    </button>
                    <button
                        type="button"
                        onclick={toggleLihatSemua}
                        class="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-green hover:text-ink transition-colors"
                    >
                        {showAll ? "Tampilkan Lebih Sedikit" : "Lihat Semua"}
                        <Icon
                            icon={showAll
                                ? "mdi:chevron-up"
                                : "mdi:chevron-right"}
                            class="w-4 h-4"
                        />
                    </button>
                </div>
            </div>

            {#if items.length === 0}
                <div
                    class="bg-white border border-black/8 rounded-xl py-16 text-center"
                >
                    <Icon
                        icon="mdi:file-search-outline"
                        class="w-12 h-12 text-ink/20 mx-auto mb-3"
                    />
                    <p class="font-semibold text-ink">
                        {hasQuery
                            ? "Tidak ada hasil yang cocok"
                            : "Folder masih kosong"}
                    </p>
                    <p class="text-sm text-ink/45 mt-1">
                        {hasQuery
                            ? "Coba kata kunci lain atau longgarkan filter."
                            : "Belum ada berkas di folder Arsip Kemenag."}
                    </p>
                </div>
            {:else}
                <div class="space-y-3">
                    {#each items as item (item.id)}
                        <a
                            href={fileLink(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="group block bg-white border border-black/8 rounded p-5 hover:border-green/40 hover:shadow-lg hover:shadow-green/5 transition-all"
                        >
                            <div class="flex items-start gap-4">
                                <Icon
                                    icon={formatIcons[item.format] ??
                                        formatIcons.Lainnya}
                                    class={`w-8 h-8 shrink-0 mt-0.5 ${formatColors[item.format] ?? formatColors.Lainnya}`}
                                />
                                <div class="flex-1 min-w-0">
                                    <h3
                                        class="font-semibold text-ink truncate group-hover:text-green transition-colors"
                                    >
                                        {item.name}
                                    </h3>
                                    <div
                                        class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-ink/45"
                                    >
                                        <span
                                            class="bg-green/10 text-green font-semibold px-2 py-0.5 rounded-full"
                                            >{item.jenisSurat}</span
                                        >
                                        <span>{item.format}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{fmtDate(item.createdTime)}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{fmtSize(item.size)}</span>
                                    </div>
                                </div>
                                <Icon
                                    icon="mdi:open-in-new"
                                    class="w-4 h-4 mt-1 shrink-0 text-ink/30 group-hover:text-green transition-colors"
                                />
                            </div>
                        </a>
                    {/each}
                </div>

                {#if showAll && result?.totalPages > 1}
                    <div
                        class="flex items-center justify-center gap-3 mt-8 text-sm"
                    >
                        <button
                            type="button"
                            disabled={page <= 1}
                            onclick={() => (page -= 1)}
                            class="flex items-center gap-1 font-semibold text-ink/60 hover:text-green disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            <Icon icon="mdi:chevron-left" class="w-4 h-4" />
                            Sebelumnya
                        </button>
                        <span class="text-ink/50">
                            Halaman
                            <span class="font-bold text-ink">{result.page}</span>
                            dari
                            <span class="font-bold text-ink"
                                >{result.totalPages}</span
                            >
                        </span>
                        <button
                            type="button"
                            disabled={page >= result.totalPages}
                            onclick={() => (page += 1)}
                            class="flex items-center gap-1 font-semibold text-ink/60 hover:text-green disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                            Berikutnya
                            <Icon icon="mdi:chevron-right" class="w-4 h-4" />
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
{/if}
