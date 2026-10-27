<script>
    import Icon from "@iconify/svelte";
    let { apiUrl } = $props();

    // ── List state ──────────────────────────────────────────────
    let items = $state([]);
    let loading = $state(true);
    let fetchError = $state('');
    let page = $state(1);
    const PAGE_SIZE = 20;

    // ── Panel mode: null | 'create' | 'edit' ────────────────────
    let mode = $state(/** @type {string|null} */ (null));
    let selected = $state(/** @type {any} */ (null));

    // ── Form fields (maps to backend) ───────────────────────────
    let formJudul = $state('');
    let formDeskripsi = $state('');
    let formUrl = $state('');
    let formUrutan = $state(1);
    let formAktif = $state(true);
    let uploading = $state(false);

    // ── Action state ─────────────────────────────────────────────
    let saving = $state(false);
    let deleting = $state(false);
    let confirmDelete = $state(false);
    let saveError = $state('');
    let saveSuccess = $state(false);

    function pdfProxyUrl(url) {
        if (!url) return '';
        const filename = url.split('/').pop();
        return `/api/upload/${encodeURIComponent(filename)}`;
    }

    function isExternalUrl(url) {
        return /^https?:\/\//i.test(url ?? '');
    }

    // Tautan eksternal (mis. Google Drive) dibuka langsung; PDF lokal lewat proxy upload.
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

    // Pagination dikerjakan di client (endpoint mengirim seluruh data).
    const totalPages = $derived(Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
    const currentPage = $derived(Math.min(page, totalPages));
    const pagedItems = $derived(
        items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    );

    // ── Panel helpers ────────────────────────────────────────────
    function openCreate() {
        mode = 'create';
        selected = null;
        formJudul = '';
        formDeskripsi = '';
        formUrl = '';
        formUrutan = 1;
        formAktif = true;
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function openEdit(item) {
        mode = 'edit';
        selected = item;
        formJudul = item.judul ?? '';
        formDeskripsi = item.deskripsi ?? '';
        formUrl = item.url ?? '';
        formUrutan = item.urutan ?? 1;
        formAktif = item.aktif ?? true;
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function closePanel() {
        mode = null; selected = null; confirmDelete = false;
    }

    // Upload PDF — alur sama dengan dokumen informasi berkala & regulasi.
    async function handleUpload(event) {
        const f = event.target.files?.[0];
        event.target.value = '';
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) {
            saveError = 'Ukuran PDF maksimal 10 MB.';
            return;
        }
        uploading = true; saveError = '';
        try {
            const fd = new FormData();
            fd.append('file', f);
            const upRes = await fetch('/api/upload-dokumen', { method: 'POST', body: fd });
            const upJson = await upRes.json();
            if (!upJson.success) {
                saveError = upJson.message ?? 'Gagal mengunggah PDF.';
                return;
            }
            formUrl = upJson.data.url ?? upJson.data.fileUrl ?? '';
        } catch (e) { saveError = String(e); }
        finally { uploading = false; }
    }

    // ── Save (create or update) ──────────────────────────────────
    async function handleSave() {
        if (!formJudul.trim()) {
            saveError = 'Judul wajib diisi.';
            return;
        }
        if (formUrl.trim() && !isExternalUrl(formUrl.trim()) && !formUrl.trim().startsWith('/')) {
            saveError = 'URL dokumen tidak valid. Upload PDF atau tempel tautan lengkap, mis. https://drive.google.com/...';
            return;
        }

        saving = true; saveError = ''; saveSuccess = false;
        try {
            const body = {
                judul: formJudul.trim(),
                deskripsi: formDeskripsi.trim() || null,
                url: formUrl.trim() || null,
                aktif: formAktif,
                urutan: Number(formUrutan) || 0,
            };

            const isCreate = mode === 'create';
            const res = await fetch(isCreate ? apiUrl : `${apiUrl}/${selected.id}`, {
                method: isCreate ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!json.success) {
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
                Tambah Dokumen
            </button>

            <span class="ml-auto text-sm text-ink/50">Total: {items.length} dokumen</span>
        </div>

        <!-- Table -->
        {#if loading}
            <div class="py-16 text-center text-sm text-ink/40">Memuat...</div>
        {:else if fetchError}
            <div class="py-16 text-center text-sm text-red-500">{fetchError}</div>
        {:else if items.length === 0}
            <div class="py-16 text-center text-sm text-ink/40">Belum ada informasi dikecualikan.</div>
        {:else}
            <div class="border bg-white border-ink/10 overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-ink/4 border-b border-ink/10">
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Dokumen</th>
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
                                            <p class="text-sm font-medium text-ink line-clamp-2">{item.judul}</p>
                                            {#if item.deskripsi}
                                                <p class="text-[11px] text-ink/40 mt-0.5 line-clamp-1">{item.deskripsi}</p>
                                            {/if}
                                            {#if item.url}
                                                <a
                                                    href={docUrl(item.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onclick={(e) => e.stopPropagation()}
                                                    class="inline-flex items-center gap-1 text-[10px] font-bold text-green hover:underline mt-1"
                                                >
                                                    <Icon icon={isExternalUrl(item.url) ? 'mdi:link-variant' : 'mdi:file-pdf-box'} width="12" height="12" />
                                                    {isExternalUrl(item.url) ? 'Tautan' : 'PDF'}
                                                </a>
                                            {/if}
                                        </div>
                                    </div>
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
                        {mode === 'create' ? 'Tambah Dokumen Baru' : 'Edit Dokumen'}
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

                <!-- Judul -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-judul">
                        Judul <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-judul"
                        type="text"
                        bind:value={formJudul}
                        placeholder="mis. Daftar Informasi Dikecualikan 2026"
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                </div>

                <!-- Deskripsi -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-deskripsi">Deskripsi</label>
                    <textarea
                        id="form-deskripsi"
                        bind:value={formDeskripsi}
                        rows="3"
                        placeholder="Keterangan singkat dokumen (opsional)..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
                    ></textarea>
                </div>

                <!-- Dokumen: upload PDF atau link eksternal -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-url">
                        File PDF / Link Google Drive
                    </label>
                    <div class="flex items-center gap-2">
                        <input
                            id="form-url"
                            type="text"
                            bind:value={formUrl}
                            placeholder="https://drive.google.com/..."
                            class="flex-1 min-w-0 border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                        />
                        <label class="flex items-center gap-1 border border-ink/20 px-3 py-2 text-[10px] font-bold uppercase text-ink/60 cursor-pointer hover:border-green/40 hover:text-green transition-colors shrink-0">
                            {#if uploading}
                                Mengunggah...
                            {:else}
                                <Icon icon="mdi:cloud-upload-outline" width="12" height="12" />
                                PDF
                            {/if}
                            <input
                                type="file"
                                accept=".pdf"
                                class="hidden"
                                disabled={uploading}
                                onchange={handleUpload}
                            />
                        </label>
                    </div>
                    {#if formUrl}
                        <a
                            href={docUrl(formUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1 text-[10px] font-bold text-green hover:underline mt-1.5"
                        >
                            <Icon icon={isExternalUrl(formUrl) ? 'mdi:link-variant' : 'mdi:file-pdf-box'} width="12" height="12" />
                            Lihat dokumen
                        </a>
                    {/if}
                    <p class="text-[10px] text-ink/40 mt-1">Upload PDF maks. 10 MB, atau tempel tautan eksternal (mis. Google Drive).</p>
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
                    disabled={saving || uploading}
                    class="w-full py-2.5 bg-green text-white text-xs font-bold uppercase hover:bg-green/90 transition-colors disabled:opacity-60"
                >
                    {mode === 'create' ? 'Simpan Dokumen' : 'Simpan Perubahan'}
                </button>

                <!-- Delete (edit mode only) -->
                {#if mode === 'edit'}
                    <div class="border-t border-ink/8 pt-3">
                        {#if !confirmDelete}
                            <button
                                onclick={() => (confirmDelete = true)}
                                class="w-full py-2 border border-red-200 text-red-500 text-xs font-bold uppercase hover:bg-red-50 transition-colors"
                            >Hapus Dokumen</button>
                        {:else}
                            <div class="border border-red-200 p-3 bg-red-50">
                                <p class="text-xs text-red-600 font-semibold mb-2">Yakin ingin menghapus dokumen ini? File PDF terkait juga akan dihapus.</p>
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
