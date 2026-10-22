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
    let formGrup = $state('profil-kelembagaan');
    let formItemId = $state('');
    let formLabel = $state('');
    let formDesc = $state('');
    let formIcon = $state('mdi:file-document-outline');
    let formPenjelasan = $state('');
    let formProfilLink = $state('');
    let formProfilLinkLabel = $state('');
    let formInfoPublikasi = $state('');
    let formUrutan = $state(1);
    let formAktif = $state(true);
    // Baris repeatable: dokumen {judul,url} & tautan eksternal {label,href,desc}
    let dokumen = $state(/** @type {any[]} */ ([]));
    let tautanEksternal = $state(/** @type {any[]} */ ([]));
    let uploadingRow = $state(-1);

    // ── Action state ─────────────────────────────────────────────
    let saving = $state(false);
    let deleting = $state(false);
    let confirmDelete = $state(false);
    let saveError = $state('');
    let saveSuccess = $state(false);

    const GRUP_LIST = [
        { value: 'profil-kelembagaan', label: 'Profil & Kelembagaan' },
        { value: 'perencanaan-anggaran', label: 'Perencanaan & Penganggaran' },
        { value: 'pelaporan-akuntabilitas', label: 'Pelaporan & Akuntabilitas' },
        { value: 'layanan-publik', label: 'Layanan & Keterbukaan Publik' },
    ];

    const GRUP_COLORS = {
        'profil-kelembagaan': 'bg-sky-100 text-sky-700',
        'perencanaan-anggaran': 'bg-indigo-100 text-indigo-700',
        'pelaporan-akuntabilitas': 'bg-violet-100 text-violet-700',
        'layanan-publik': 'bg-teal-100 text-teal-700',
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
        formGrup = 'profil-kelembagaan';
        formItemId = '';
        formLabel = '';
        formDesc = '';
        formIcon = 'mdi:file-document-outline';
        formPenjelasan = '';
        formProfilLink = '';
        formProfilLinkLabel = '';
        formInfoPublikasi = '';
        formUrutan = 1;
        formAktif = true;
        dokumen = [];
        tautanEksternal = [];
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function openEdit(item) {
        mode = 'edit';
        selected = item;
        formGrup = item.grup ?? 'profil-kelembagaan';
        formItemId = item.itemId ?? '';
        formLabel = item.label ?? '';
        formDesc = item.desc ?? '';
        formIcon = item.icon ?? 'mdi:file-document-outline';
        formPenjelasan = item.penjelasan ?? '';
        formProfilLink = item.profilLink ?? '';
        formProfilLinkLabel = item.profilLinkLabel ?? '';
        formInfoPublikasi = item.infoPublikasi ?? '';
        formUrutan = item.urutan ?? 1;
        formAktif = item.aktif ?? true;
        dokumen = (item.dokumen ?? []).map((d) => ({ judul: d.judul ?? '', url: d.url ?? '' }));
        tautanEksternal = (item.tautanEksternal ?? []).map((t) => ({
            label: t.label ?? '',
            href: t.href ?? '',
            desc: t.desc ?? '',
        }));
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function closePanel() {
        mode = null; selected = null; confirmDelete = false;
    }

    function addDokumen() {
        dokumen = [...dokumen, { judul: '', url: '' }];
    }

    function removeDokumen(i) {
        dokumen = dokumen.filter((_, idx) => idx !== i);
    }

    function addTautan() {
        tautanEksternal = [...tautanEksternal, { label: '', href: '', desc: '' }];
    }

    function removeTautan(i) {
        tautanEksternal = tautanEksternal.filter((_, idx) => idx !== i);
    }

    // Upload PDF untuk satu baris dokumen — alur sama dengan upload regulasi.
    async function handleRowUpload(index, event) {
        const f = event.target.files?.[0];
        event.target.value = '';
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) {
            saveError = 'Ukuran PDF maksimal 10 MB.';
            return;
        }
        uploadingRow = index; saveError = '';
        try {
            const fd = new FormData();
            fd.append('file', f);
            const upRes = await fetch('/api/upload-dokumen', { method: 'POST', body: fd });
            const upJson = await upRes.json();
            if (!upJson.success) {
                saveError = upJson.message ?? 'Gagal mengunggah PDF.';
                return;
            }
            dokumen[index].url = upJson.data.url ?? upJson.data.fileUrl ?? '';
        } catch (e) { saveError = String(e); }
        finally { uploadingRow = -1; }
    }

    // ── Save (create or update) ──────────────────────────────────
    async function handleSave() {
        if (!formLabel.trim() || !formDesc.trim() || !formPenjelasan.trim()) {
            saveError = 'Label, Deskripsi, dan Penjelasan wajib diisi.';
            return;
        }
        if (mode === 'create') {
            if (!formItemId.trim()) {
                saveError = 'Item ID wajib diisi.';
                return;
            }
            if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(formItemId.trim())) {
                saveError = 'Item ID harus slug: huruf kecil/angka dipisah tanda hubung, mis. profil-kelembagaan.';
                return;
            }
        }
        for (const d of dokumen) {
            if ((d.url.trim() && !d.judul.trim()) || (d.judul.trim() && !d.url.trim())) {
                saveError = 'Judul dan URL pada setiap baris dokumen harus lengkap.';
                return;
            }
        }
        for (const t of tautanEksternal) {
            if ((t.href.trim() || t.desc.trim()) && !t.label.trim()) {
                saveError = 'Label wajib diisi pada setiap baris tautan eksternal.';
                return;
            }
            if ((t.label.trim() || t.desc.trim()) && !/^https?:\/\/\S+$/i.test(t.href.trim())) {
                saveError = 'URL tautan eksternal tidak valid. Gunakan format lengkap, mis. https://...';
                return;
            }
        }

        saving = true; saveError = ''; saveSuccess = false;
        try {
            const body = /** @type {any} */ ({
                grup: formGrup,
                label: formLabel.trim(),
                desc: formDesc.trim(),
                icon: formIcon.trim(),
                penjelasan: formPenjelasan.trim(),
                profilLink: formProfilLink.trim() || null,
                profilLinkLabel: formProfilLinkLabel.trim() || null,
                infoPublikasi: formInfoPublikasi.trim() || null,
                dokumen: dokumen
                    .filter((d) => d.judul.trim() && d.url.trim())
                    .map((d) => ({ judul: d.judul.trim(), url: d.url.trim() })),
                tautanEksternal: tautanEksternal
                    .filter((t) => t.label.trim() && t.href.trim())
                    .map((t) => ({ label: t.label.trim(), href: t.href.trim(), desc: t.desc.trim() })),
                aktif: formAktif,
                urutan: Number(formUrutan) || 0,
            });
            if (mode === 'create') body.itemId = formItemId.trim();

            const isCreate = mode === 'create';
            const res = await fetch(isCreate ? apiUrl : `${apiUrl}/${selected.id}`, {
                method: isCreate ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!json.success) {
                // Termasuk penolakan itemId duplikat (HTTP 409) dari backend.
                saveError = json.message ?? 'Gagal menyimpan.';
                return;
            }

            if (isCreate) {
                items = [json.data, ...items];
            } else {
                items = items.map((i) => i.id === selected.id ? json.data : i);
                selected = json.data;
            }
            saveSuccess = true;
            setTimeout(() => (saveSuccess = false), 3000);
        } catch (e) { saveError = String(e); }
        finally { saving = false; }
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
                Tambah Informasi
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

            <span class="ml-auto text-sm text-ink/50">Total: {filteredItems.length} item</span>
        </div>

        <!-- Table -->
        {#if loading}
            <div class="py-16 text-center text-sm text-ink/40">Memuat...</div>
        {:else if fetchError}
            <div class="py-16 text-center text-sm text-red-500">{fetchError}</div>
        {:else if items.length === 0}
            <div class="py-16 text-center text-sm text-ink/40">Belum ada informasi berkala.</div>
        {:else}
            <div class="border bg-white border-ink/10 overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-ink/4 border-b border-ink/10">
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Item</th>
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
                                <td class="px-4 py-3">
                                    <div class="flex items-start gap-2.5">
                                        <span class="text-[10px] font-bold text-ink/40 bg-ink/5 px-1.5 py-0.5 mt-0.5 shrink-0">{item.urutan}</span>
                                        <div class="min-w-0">
                                            <p class="text-sm font-medium text-ink line-clamp-2">{item.label}</p>
                                            <p class="text-[10px] font-mono text-ink/40 mt-0.5 truncate">#{item.itemId}</p>
                                        </div>
                                    </div>
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
                        {mode === 'create' ? 'Tambah Informasi Baru' : 'Edit Informasi'}
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

                <!-- Item ID (hanya saat create; anchor halaman publik) -->
                {#if mode === 'create'}
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-item-id">
                            Item ID <span class="text-red-400">*</span>
                        </label>
                        <input
                            id="form-item-id"
                            type="text"
                            bind:value={formItemId}
                            placeholder="mis. profil-kelembagaan"
                            class="w-full border border-ink/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-green"
                        />
                        <p class="text-[10px] text-ink/40 mt-1.5">
                            Slug anchor halaman publik. Setelah dibuat, Item ID tidak dapat diubah.
                        </p>
                    </div>
                {:else}
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">Item ID</label>
                        <p class="border border-ink/10 bg-ink/2 px-3 py-2 text-sm font-mono text-ink/60">#{formItemId}</p>
                    </div>
                {/if}

                <!-- Label -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-label">
                        Label <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-label"
                        type="text"
                        bind:value={formLabel}
                        placeholder="mis. Dewan Pengarah PPID"
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
                        placeholder="Deskripsi singkat item..."
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
                        placeholder="mdi:file-document-outline"
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
                        placeholder="Penjelasan lengkap item..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
                    ></textarea>
                </div>

                <!-- Tautan profil (opsional) -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-profil-link">Tautan Profil</label>
                    <input
                        id="form-profil-link"
                        type="url"
                        bind:value={formProfilLink}
                        placeholder="https://..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-profil-link-label">Label Tautan Profil</label>
                    <input
                        id="form-profil-link-label"
                        type="text"
                        bind:value={formProfilLinkLabel}
                        placeholder="mis. Lihat profil PPID"
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Info publikasi (opsional) -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-info-publikasi">Info Publikasi</label>
                    <input
                        id="form-info-publikasi"
                        type="text"
                        bind:value={formInfoPublikasi}
                        placeholder="Keterangan publikasi info ini..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>

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

                <!-- Editor baris: dokumen (judul + url + upload PDF) -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50">Dokumen</label>
                        <button
                            type="button"
                            onclick={addDokumen}
                            class="flex items-center gap-1 text-[10px] font-bold uppercase text-green hover:underline"
                        >
                            <Icon icon="mdi:plus" width="12" height="12" />
                            Tambah Baris
                        </button>
                    </div>
                    {#if dokumen.length === 0}
                        <p class="text-[10px] text-ink/30">Belum ada dokumen.</p>
                    {/if}
                    {#each dokumen as dok, i}
                        <div class="border border-ink/10 p-2.5 mb-2 flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold text-ink/30 shrink-0">#{i + 1}</span>
                                <input
                                    type="text"
                                    bind:value={dok.judul}
                                    placeholder="Judul dokumen"
                                    class="flex-1 min-w-0 border border-ink/20 px-2 py-1.5 text-xs focus:outline-none focus:border-green"
                                />
                                <button
                                    type="button"
                                    onclick={() => removeDokumen(i)}
                                    class="text-red-400 hover:text-red-600 shrink-0"
                                    aria-label="Hapus baris dokumen"
                                >
                                    <Icon icon="mdi:trash-can-outline" width="14" height="14" />
                                </button>
                            </div>
                            <div class="flex items-center gap-2">
                                <input
                                    type="text"
                                    bind:value={dok.url}
                                    placeholder="URL PDF atau tautan dokumen"
                                    class="flex-1 min-w-0 border border-ink/20 px-2 py-1.5 text-xs focus:outline-none focus:border-green"
                                />
                                <label class="flex items-center gap-1 border border-ink/20 px-2 py-1.5 text-[10px] font-bold uppercase text-ink/60 cursor-pointer hover:border-green/40 hover:text-green transition-colors shrink-0">
                                    {#if uploadingRow === i}
                                        Mengunggah...
                                    {:else}
                                        <Icon icon="mdi:cloud-upload-outline" width="12" height="12" />
                                        PDF
                                    {/if}
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        class="hidden"
                                        disabled={uploadingRow >= 0}
                                        onchange={(e) => handleRowUpload(i, e)}
                                    />
                                </label>
                            </div>
                            {#if dok.url}
                                <a
                                    href={docUrl(dok.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="inline-flex items-center gap-1 text-[10px] font-bold text-green hover:underline"
                                >
                                    <Icon icon={isExternalUrl(dok.url) ? 'mdi:link-variant' : 'mdi:file-document-outline'} width="12" height="12" />
                                    Lihat dokumen
                                </a>
                            {/if}
                        </div>
                    {/each}
                    <p class="text-[10px] text-ink/40 mt-1">Upload PDF maks. 10 MB per baris.</p>
                </div>

                <!-- Editor baris: tautan eksternal (label + href + desc) -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50">Tautan Eksternal</label>
                        <button
                            type="button"
                            onclick={addTautan}
                            class="flex items-center gap-1 text-[10px] font-bold uppercase text-green hover:underline"
                        >
                            <Icon icon="mdi:plus" width="12" height="12" />
                            Tambah Baris
                        </button>
                    </div>
                    {#if tautanEksternal.length === 0}
                        <p class="text-[10px] text-ink/30">Belum ada tautan eksternal.</p>
                    {/if}
                    {#each tautanEksternal as taut, i}
                        <div class="border border-ink/10 p-2.5 mb-2 flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold text-ink/30 shrink-0">#{i + 1}</span>
                                <input
                                    type="text"
                                    bind:value={taut.label}
                                    placeholder="Label tautan"
                                    class="flex-1 min-w-0 border border-ink/20 px-2 py-1.5 text-xs focus:outline-none focus:border-green"
                                />
                                <button
                                    type="button"
                                    onclick={() => removeTautan(i)}
                                    class="text-red-400 hover:text-red-600 shrink-0"
                                    aria-label="Hapus baris tautan"
                                >
                                    <Icon icon="mdi:trash-can-outline" width="14" height="14" />
                                </button>
                            </div>
                            <input
                                type="text"
                                bind:value={taut.href}
                                placeholder="https://..."
                                class="w-full border border-ink/20 px-2 py-1.5 text-xs focus:outline-none focus:border-green"
                            />
                            <input
                                type="text"
                                bind:value={taut.desc}
                                placeholder="Keterangan singkat (opsional)"
                                class="w-full border border-ink/20 px-2 py-1.5 text-xs focus:outline-none focus:border-green"
                            />
                        </div>
                    {/each}
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
                    disabled={saving || uploadingRow >= 0}
                    class="w-full py-2.5 bg-green text-white text-xs font-bold uppercase hover:bg-green/90 transition-colors disabled:opacity-60"
                >
                    {mode === 'create' ? 'Simpan Informasi' : 'Simpan Perubahan'}
                </button>

                <!-- Delete (edit mode only) -->
                {#if mode === 'edit'}
                    <div class="border-t border-ink/8 pt-3">
                        {#if !confirmDelete}
                            <button
                                onclick={() => (confirmDelete = true)}
                                class="w-full py-2 border border-red-200 text-red-500 text-xs font-bold uppercase hover:bg-red-50 transition-colors"
                            >Hapus Informasi</button>
                        {:else}
                            <div class="border border-red-200 p-3 bg-red-50">
                                <p class="text-xs text-red-600 font-semibold mb-2">Yakin ingin menghapus informasi ini? File PDF terkait juga akan dihapus.</p>
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
