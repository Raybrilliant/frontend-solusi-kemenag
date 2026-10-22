<script>
    import Icon from "@iconify/svelte";
    let { apiUrl } = $props();

    // ── List state ──────────────────────────────────────────────
    let items = $state([]);
    let loading = $state(true);
    let fetchError = $state('');
    let page = $state(1);
    let filterGrup = $state('');
    const PAGE_SIZE = 20;

    // ── Panel mode: null | 'create' | 'edit' ────────────────────
    let mode = $state(/** @type {string|null} */ (null));
    let selected = $state(/** @type {any} */ (null));

    // ── Form fields (maps to backend) ───────────────────────────
    let formGrup = $state('sop-informasi-publik');
    let formNomor = $state('');
    let formLabel = $state('');
    let formJudul = $state('');
    let formDesc = $state('');
    let formIcon = $state('mdi:clipboard-check-outline');
    let formPenjelasan = $state('');
    let formWaktu = $state('');
    let formOutput = $state('');
    // Satu baris textarea = satu entri dasar hukum.
    let formDasar = $state('');
    let langkah = $state(/** @type {any[]} */ ([]));
    // Sumber dokumen: file PDF terunggah ATAU tautan eksternal (Google Drive).
    let docMode = $state('upload');
    let formLink = $state('');
    let pdfFile = $state(/** @type {File|null} */ (null));
    let existingFileUrl = $state('');
    let formUrutan = $state(1);
    let formAktif = $state(true);

    // ── Action state ─────────────────────────────────────────────
    let saving = $state(false);
    let uploading = $state(false);
    let deleting = $state(false);
    let confirmDelete = $state(false);
    let saveError = $state('');
    let saveSuccess = $state(false);

    const GRUP_LIST = [
        { value: 'sop-informasi-publik', label: 'SOP Informasi Publik' },
        { value: 'sop-layanan', label: 'SOP Layanan' },
    ];

    const GRUP_COLORS = {
        'sop-informasi-publik': 'bg-sky-100 text-sky-700',
        'sop-layanan': 'bg-teal-100 text-teal-700',
    };

    function grupLabel(value) {
        return GRUP_LIST.find((g) => g.value === value)?.label ?? value;
    }

    function pdfProxyUrl(url) {
        if (!url) return '';
        const filename = url.split('/').pop();
        return `/api/upload/${encodeURIComponent(filename)}`;
    }

    function isExternalUrl(url) {
        return /^https?:\/\//i.test(url ?? '');
    }

    // Tautan eksternal dibuka langsung; PDF lokal lewat proxy upload.
    function docUrl(url) {
        return isExternalUrl(url) ? url : pdfProxyUrl(url);
    }

    // ── Fetch (admin selalu all=1 agar item nonaktif terlihat) ──
    async function fetchList() {
        loading = true; fetchError = '';
        try {
            const res = await fetch(`${apiUrl}?all=1`);
            const json = await res.json();
            if (json.success) {
                items = json.data ?? [];
            } else {
                fetchError = json.message ?? 'Gagal memuat data.';
            }
        } catch (e) { fetchError = String(e); }
        finally { loading = false; }
    }

    // Pagination & filter dikerjakan di client (endpoint mengirim seluruh data).
    const filteredItems = $derived(
        filterGrup ? items.filter((i) => i.grup === filterGrup) : items,
    );
    const totalPages = $derived(Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE)));
    const currentPage = $derived(Math.min(page, totalPages));
    const pagedItems = $derived(
        filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    );

    // ── Panel helpers ────────────────────────────────────────────
    function openCreate() {
        mode = 'create';
        selected = null;
        formGrup = 'sop-informasi-publik';
        formNomor = '';
        formLabel = '';
        formJudul = '';
        formDesc = '';
        formIcon = 'mdi:clipboard-check-outline';
        formPenjelasan = '';
        formWaktu = '';
        formOutput = '';
        formDasar = '';
        langkah = [];
        docMode = 'upload';
        formLink = '';
        pdfFile = null;
        existingFileUrl = '';
        formUrutan = 1;
        formAktif = true;
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function openEdit(item) {
        mode = 'edit';
        selected = item;
        formGrup = item.grup ?? 'sop-informasi-publik';
        formNomor = item.nomor ?? '';
        formLabel = item.label ?? '';
        formJudul = item.judul ?? '';
        formDesc = item.desc ?? '';
        formIcon = item.icon ?? 'mdi:clipboard-check-outline';
        formPenjelasan = item.penjelasan ?? '';
        formWaktu = item.waktu ?? '';
        formOutput = item.output ?? '';
        formDasar = (item.dasar ?? []).join('\n');
        langkah = (item.langkah ?? []).map((l) => ({ judul: l.judul ?? '', desc: l.desc ?? '' }));
        formUrutan = item.urutan ?? 1;
        formAktif = item.aktif ?? true;
        pdfFile = null;
        if (isExternalUrl(item.fileUrl)) {
            docMode = 'link';
            formLink = item.fileUrl ?? '';
            existingFileUrl = '';
        } else {
            docMode = 'upload';
            formLink = '';
            existingFileUrl = item.fileUrl ?? '';
        }
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function closePanel() {
        mode = null; selected = null; confirmDelete = false;
    }

    function addLangkah() {
        langkah = [...langkah, { judul: '', desc: '' }];
    }

    function removeLangkah(i) {
        langkah = langkah.filter((_, idx) => idx !== i);
    }

    // ── Save (create or update) ──────────────────────────────────
    async function handleSave() {
        if (
            !formNomor.trim() || !formLabel.trim() || !formJudul.trim() ||
            !formDesc.trim() || !formPenjelasan.trim() ||
            !formWaktu.trim() || !formOutput.trim()
        ) {
            saveError = 'Nomor, Label, Judul, Deskripsi, Penjelasan, Waktu, dan Output wajib diisi.';
            return;
        }
        for (const l of langkah) {
            if ((l.judul.trim() || l.desc.trim()) && !l.judul.trim()) {
                saveError = 'Judul wajib diisi pada setiap baris langkah.';
                return;
            }
        }

        // fileUrl opsional: PDF terunggah atau tautan (Google Drive).
        let nextFileUrl = existingFileUrl;
        if (docMode === 'link') {
            const link = formLink.trim();
            if (link && !/^https?:\/\/\S+$/i.test(link)) {
                saveError = 'Tautan tidak valid. Gunakan format lengkap, mis. https://drive.google.com/...';
                return;
            }
            nextFileUrl = link;
        }

        saving = true; saveError = ''; saveSuccess = false;
        try {
            const body = /** @type {any} */ ({
                grup: formGrup,
                nomor: formNomor.trim(),
                label: formLabel.trim(),
                judul: formJudul.trim(),
                desc: formDesc.trim(),
                icon: formIcon.trim(),
                penjelasan: formPenjelasan.trim(),
                waktu: formWaktu.trim(),
                output: formOutput.trim(),
                dasar: formDasar
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean),
                langkah: langkah
                    .filter((l) => l.judul.trim() || l.desc.trim())
                    .map((l) => ({ judul: l.judul.trim(), desc: l.desc.trim() })),
                fileUrl: nextFileUrl || null,
                aktif: formAktif,
                urutan: Number(formUrutan) || 0,
            });

            // Upload PDF if a new file was selected
            if (docMode === 'upload' && pdfFile) {
                uploading = true;
                const fd = new FormData();
                fd.append('file', pdfFile);
                const upRes = await fetch('/api/upload-dokumen', { method: 'POST', body: fd });
                const upJson = await upRes.json();
                uploading = false;
                if (!upJson.success) { saveError = upJson.message ?? 'Gagal mengunggah PDF.'; saving = false; return; }
                body.fileUrl = upJson.data.url ?? upJson.data.fileUrl ?? '';
            }

            const isCreate = mode === 'create';
            const res = await fetch(isCreate ? apiUrl : `${apiUrl}/${selected.id}`, {
                method: isCreate ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!json.success) {
                // Termasuk penolakan duplikat grup+nomor (HTTP 409) dari backend.
                saveError = json.message ?? 'Gagal menyimpan.';
                return;
            }

            if (isCreate) {
                items = [json.data, ...items];
            } else {
                items = items.map((i) => i.id === selected.id ? json.data : i);
                selected = json.data;
            }

            if (isExternalUrl(json.data.fileUrl)) {
                docMode = 'link';
                formLink = json.data.fileUrl ?? '';
                existingFileUrl = '';
            } else {
                docMode = 'upload';
                formLink = '';
                existingFileUrl = json.data.fileUrl ?? '';
            }
            pdfFile = null;
            saveSuccess = true;
            setTimeout(() => (saveSuccess = false), 3000);
        } catch (e) { saveError = String(e); }
        finally { saving = false; uploading = false; }
    }

    // ── Delete ───────────────────────────────────────────────────
    async function handleDelete() {
        deleting = true;
        try {
            const res = await fetch(`${apiUrl}/${selected.id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                items = items.filter((i) => i.id !== selected.id);
                closePanel();
            } else {
                saveError = json.message ?? 'Gagal menghapus.';
            }
        } catch (e) { saveError = String(e); }
        finally { deleting = false; }
    }

    $effect(() => { fetchList(); });
</script>

<div class="flex gap-6 min-h-0">

    <!-- ── Left: Table ─────────────────────────────────────────── -->
    <div class="flex-1 min-w-0 flex flex-col gap-4">

        <!-- Toolbar -->
        <div class="flex flex-wrap items-center gap-3">
            <button
                onclick={openCreate}
                class="flex items-center gap-2 bg-green text-white text-xs font-bold uppercase px-4 py-2.5 hover:bg-green/90 transition-colors"
            >
                <Icon icon="mdi:plus" width="14" height="14" />
                Tambah SOP
            </button>

            <select
                bind:value={filterGrup}
                class="border border-ink/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
            >
                <option value="">Semua Grup</option>
                {#each GRUP_LIST as g}
                    <option value={g.value}>{g.label}</option>
                {/each}
            </select>

            <span class="ml-auto text-sm text-ink/50">Total: {filteredItems.length} SOP</span>
        </div>

        <!-- Table -->
        {#if loading}
            <div class="py-16 text-center text-sm text-ink/40">Memuat...</div>
        {:else if fetchError}
            <div class="py-16 text-center text-sm text-red-500">{fetchError}</div>
        {:else if items.length === 0}
            <div class="py-16 text-center text-sm text-ink/40">Belum ada SOP.</div>
        {:else}
            <div class="border bg-white border-ink/10 overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-ink/4 border-b border-ink/10">
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Nomor</th>
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Judul</th>
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden sm:table-cell">Grup</th>
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden md:table-cell">Status</th>
                            <th class="text-right px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each pagedItems as item}
                            <tr
                                onclick={() => openEdit(item)}
                                class="border-b border-ink/5 cursor-pointer hover:bg-green/3 transition-colors {selected?.id === item.id && mode === 'edit' ? 'bg-green/5' : ''}"
                            >
                                <td class="px-4 py-3 font-mono text-xs text-ink/70 whitespace-nowrap max-w-[140px] truncate">{item.nomor}</td>
                                <td class="px-4 py-3 font-medium text-ink max-w-xs">
                                    <span class="line-clamp-2 text-sm">{item.judul}</span>
                                </td>
                                <td class="px-4 py-3 hidden sm:table-cell">
                                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 {GRUP_COLORS[item.grup] ?? 'bg-ink/8 text-ink/60'}">{grupLabel(item.grup)}</span>
                                </td>
                                <td class="px-4 py-3 hidden md:table-cell">
                                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 {item.aktif ? 'bg-green/10 text-green' : 'bg-ink/8 text-ink/50'}">
                                        {item.aktif ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <button
                                        onclick={(e) => { e.stopPropagation(); openEdit(item); }}
                                        class="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-ink/50 hover:text-green transition-colors"
                                    >
                                        <Icon icon="mdi:pencil-outline" width="12" height="12" />
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Pagination (client-side) -->
            {#if totalPages > 1}
                <div class="flex items-center gap-2">
                    <button
                        onclick={() => (page = Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors"
                    >← Prev</button>
                    <span class="text-xs text-ink/50">Halaman {currentPage} / {totalPages}</span>
                    <button
                        onclick={() => (page = Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors"
                    >Next →</button>
                </div>
            {/if}
        {/if}
    </div>

    <!-- ── Right: Form panel ────────────────────────────────────── -->
    {#if mode}
        <div class="w-80 xl:w-96 shrink-0 border border-ink/10 bg-white flex flex-col self-start sticky top-4">

            <!-- Header -->
            <div class="flex items-center gap-3 px-5 py-4 border-b border-ink/8 bg-ink/2">
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                        {mode === 'create' ? 'Tambah SOP Baru' : 'Edit SOP'}
                    </p>
                    {#if selected}
                        <p class="text-xs font-mono text-ink/50 mt-0.5 truncate">{selected.id}</p>
                    {/if}
                </div>
                <button
                    onclick={closePanel}
                    class="w-7 h-7 flex items-center justify-center hover:bg-ink/8 transition-colors rounded-full"
                    aria-label="Tutup"
                >
                    <Icon icon="mdi:close" width="12" height="12" />
                </button>
            </div>

            <!-- Form body -->
            <div class="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-12rem)]">

                <!-- Grup -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-grup">
                        Grup <span class="text-red-400">*</span>
                    </label>
                    <select
                        id="form-grup"
                        bind:value={formGrup}
                        class="w-full border border-ink/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
                    >
                        {#each GRUP_LIST as g}
                            <option value={g.value}>{g.label}</option>
                        {/each}
                    </select>
                </div>

                <!-- Nomor -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-nomor">
                        Nomor <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-nomor"
                        type="text"
                        bind:value={formNomor}
                        placeholder="mis. SOP-01"
                        class="w-full border border-ink/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Label -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-label">
                        Label <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-label"
                        type="text"
                        bind:value={formLabel}
                        placeholder="mis. Layanan Rekomendasi"
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Judul -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-judul">
                        Judul <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-judul"
                        type="text"
                        bind:value={formJudul}
                        placeholder="Judul lengkap SOP..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Desc -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-desc">
                        Deskripsi <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-desc"
                        type="text"
                        bind:value={formDesc}
                        placeholder="Deskripsi singkat SOP..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Icon (nama ikon mdi) -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-icon">Icon</label>
                    <input
                        id="form-icon"
                        type="text"
                        bind:value={formIcon}
                        placeholder="mdi:clipboard-check-outline"
                        class="w-full border border-ink/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Penjelasan -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-penjelasan">
                        Penjelasan <span class="text-red-400">*</span>
                    </label>
                    <textarea
                        id="form-penjelasan"
                        bind:value={formPenjelasan}
                        rows="4"
                        placeholder="Penjelasan lengkap SOP..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
                    ></textarea>
                </div>

                <!-- Waktu & Output -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-waktu">
                        Waktu Layanan <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-waktu"
                        type="text"
                        bind:value={formWaktu}
                        placeholder="mis. 3 hari kerja"
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-output">
                        Output <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-output"
                        type="text"
                        bind:value={formOutput}
                        placeholder="mis. Berita acara / dokumen layanan"
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Dasar hukum: satu baris = satu entri -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-dasar">Dasar Hukum</label>
                    <textarea
                        id="form-dasar"
                        bind:value={formDasar}
                        rows="3"
                        placeholder={"PPID No. 1 Tahun 2025\nPerma No. 1 Tahun 2011"}
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
                    ></textarea>
                    <p class="text-[10px] text-ink/40 mt-1.5">Satu baris = satu entri dasar hukum.</p>
                </div>

                <!-- Editor baris: langkah (judul + desc) -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50">Langkah</label>
                        <button
                            type="button"
                            onclick={addLangkah}
                            class="flex items-center gap-1 text-[10px] font-bold uppercase text-green hover:underline"
                        >
                            <Icon icon="mdi:plus" width="12" height="12" />
                            Tambah Baris
                        </button>
                    </div>
                    {#if langkah.length === 0}
                        <p class="text-[10px] text-ink/30">Belum ada langkah.</p>
                    {/if}
                    {#each langkah as lhk, i}
                        <div class="border border-ink/10 p-2.5 mb-2 flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold text-ink/30 shrink-0">#{i + 1}</span>
                                <input
                                    type="text"
                                    bind:value={lhk.judul}
                                    placeholder="Judul langkah"
                                    class="flex-1 min-w-0 border border-ink/20 px-2 py-1.5 text-xs focus:outline-none focus:border-green"
                                />
                                <button
                                    type="button"
                                    onclick={() => removeLangkah(i)}
                                    class="text-red-400 hover:text-red-600 shrink-0"
                                    aria-label="Hapus baris langkah"
                                >
                                    <Icon icon="mdi:trash-can-outline" width="14" height="14" />
                                </button>
                            </div>
                            <input
                                type="text"
                                bind:value={lhk.desc}
                                placeholder="Keterangan langkah"
                                class="w-full border border-ink/20 px-2 py-1.5 text-xs focus:outline-none focus:border-green"
                            />
                        </div>
                    {/each}
                </div>

                <!-- Sumber dokumen: upload PDF atau tautan (Google Drive) -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">Sumber Dokumen</label>
                    <div class="grid grid-cols-2 border border-ink/20">
                        <button
                            type="button"
                            onclick={() => (docMode = 'upload')}
                            class="py-1.5 text-[10px] font-bold uppercase transition-colors {docMode === 'upload' ? 'bg-green text-white' : 'text-ink/60 hover:bg-ink/5'}"
                        >Upload PDF</button>
                        <button
                            type="button"
                            onclick={() => (docMode = 'link')}
                            class="py-1.5 text-[10px] font-bold uppercase transition-colors {docMode === 'link' ? 'bg-green text-white border-l border-ink/20' : 'text-ink/60 hover:bg-ink/5 border-l border-ink/20'}"
                        >Tautan (Drive)</button>
                    </div>
                </div>

                {#if docMode === 'link'}
                    <!-- Tautan dokumen (mis. Google Drive) -->
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-link">
                            Tautan Dokumen
                        </label>
                        <input
                            id="form-link"
                            type="url"
                            bind:value={formLink}
                            placeholder="https://drive.google.com/..."
                            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                        />
                        <p class="text-[10px] text-ink/40 mt-1.5">
                            Tempel tautan Google Drive atau layanan lain. Pastikan izin akses "siapa saja yang memiliki link" agar dokumen bisa dibuka publik. Kosongkan jika tidak ada dokumen.
                        </p>
                    </div>
                {:else}
                    <!-- Upload PDF -->
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">
                            Dokumen PDF
                            <span class="font-normal normal-case opacity-60">(maks. 10 MB)</span>
                        </label>

                        <!-- Existing PDF -->
                        {#if existingFileUrl && !pdfFile}
                            <div class="flex items-center gap-2 bg-green/5 border border-green/20 px-3 py-2 mb-2">
                                <Icon icon="mdi:file-document-outline" width="14" height="14" class="text-green shrink-0" />
                                <a
                                    href={pdfProxyUrl(existingFileUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="flex-1 text-xs font-medium text-green truncate hover:underline"
                                >{existingFileUrl.split('/').pop() || 'Lihat PDF'}</a>
                                <button
                                    type="button"
                                    onclick={() => { existingFileUrl = ''; }}
                                    class="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase shrink-0"
                                >Hapus</button>
                            </div>
                        {/if}

                        <!-- New file selected -->
                        {#if pdfFile}
                            <div class="flex items-center gap-2 bg-ink/3 border border-ink/10 px-3 py-2 mb-2">
                                <Icon icon="mdi:file-document-outline" width="13" height="13" class="text-green shrink-0" />
                                <span class="flex-1 text-xs font-medium truncate">{pdfFile.name}</span>
                                <button
                                    type="button"
                                    onclick={() => (pdfFile = null)}
                                    class="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase shrink-0"
                                >Hapus</button>
                            </div>
                        {/if}

                        <!-- Upload zone (hide when new file already chosen) -->
                        {#if !pdfFile}
                            <label class="flex items-center gap-2 border border-dashed border-ink/20 px-3 py-3 cursor-pointer hover:border-green/40 hover:bg-green/3 transition-colors">
                                <Icon icon="mdi:cloud-upload-outline" width="14" height="14" class="text-ink/30 shrink-0" />
                                <span class="text-xs text-ink/50">
                                    {existingFileUrl ? 'Ganti PDF' : 'Pilih file PDF'}
                                </span>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    class="hidden"
                                    onchange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f && f.size <= 10 * 1024 * 1024) pdfFile = f;
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        {/if}
                    </div>
                {/if}

                <!-- Urutan & Status aktif -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-urutan">Urutan</label>
                        <input
                            id="form-urutan"
                            type="number"
                            bind:value={formUrutan}
                            min="0"
                            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                        />
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">Status</label>
                        <label class="flex items-center gap-2 border border-ink/20 px-3 py-2 cursor-pointer">
                            <input type="checkbox" bind:checked={formAktif} class="accent-green" />
                            <span class="text-xs text-ink/60">Aktif</span>
                        </label>
                    </div>
                </div>

                <!-- Feedback -->
                {#if saveError}
                    <p class="text-xs text-red-500">{saveError}</p>
                {/if}
                {#if saveSuccess}
                    <p class="text-xs text-green font-semibold">Tersimpan.</p>
                {/if}

                <!-- Save button -->
                <button
                    onclick={handleSave}
                    disabled={saving}
                    class="w-full py-2.5 bg-green text-white text-xs font-bold uppercase hover:bg-green/90 transition-colors disabled:opacity-60"
                >
                    {uploading ? 'Mengunggah PDF...' : saving ? 'Menyimpan...' : mode === 'create' ? 'Simpan SOP' : 'Simpan Perubahan'}
                </button>

                <!-- Delete (edit mode only) -->
                {#if mode === 'edit'}
                    <div class="border-t border-ink/8 pt-3">
                        {#if !confirmDelete}
                            <button
                                onclick={() => (confirmDelete = true)}
                                class="w-full py-2 border border-red-200 text-red-500 text-xs font-bold uppercase hover:bg-red-50 transition-colors"
                            >Hapus SOP</button>
                        {:else}
                            <div class="border border-red-200 p-3 bg-red-50">
                                <p class="text-xs text-red-600 font-semibold mb-2">Yakin ingin menghapus SOP ini? File PDF terkait juga akan dihapus.</p>
                                <div class="flex gap-2">
                                    <button
                                        onclick={handleDelete}
                                        disabled={deleting}
                                        class="flex-1 py-2 bg-red-500 text-white text-xs font-bold uppercase hover:bg-red-600 transition-colors disabled:opacity-60"
                                    >{deleting ? 'Menghapus...' : 'Ya, Hapus'}</button>
                                    <button
                                        onclick={() => (confirmDelete = false)}
                                        class="flex-1 py-2 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 transition-colors"
                                    >Batal</button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

            </div>
        </div>
    {/if}

</div>
