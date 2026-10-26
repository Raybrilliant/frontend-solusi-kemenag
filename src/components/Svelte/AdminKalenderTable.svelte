<script>
    import Icon from "@iconify/svelte";
    let { apiUrl } = $props();

    // ── List state ──────────────────────────────────────────────
    let items = $state([]);
    let loading = $state(true);
    let fetchError = $state('');
    let page = $state(1);
    let filterKategori = $state('');
    const PAGE_SIZE = 20;

    // ── Panel mode: null | 'create' | 'edit' ────────────────────
    let mode = $state(/** @type {string|null} */ (null));
    let selected = $state(/** @type {any} */ (null));

    // ── Form fields (maps to backend) ───────────────────────────
    let formKategori = $state('anggaran-kinerja');
    let formPeriode = $state('');
    let formKegiatan = $state('');
    let formPihak = $state('');
    let formKeluaran = $state('');
    let formUrutan = $state(1);
    let formAktif = $state(true);

    // ── Action state ─────────────────────────────────────────────
    let saving = $state(false);
    let deleting = $state(false);
    let confirmDelete = $state(false);
    let saveError = $state('');
    let saveSuccess = $state(false);

    const KATEGORI_LIST = [
        { value: 'anggaran-kinerja', label: 'Perencanaan, Keuangan & Kinerja' },
        { value: 'layanan-keagamaan', label: 'Layanan Keagamaan' },
        { value: 'pendidikan', label: 'Pendidikan' },
        { value: 'agenda-rutin', label: 'Agenda Rutin Bulanan' },
        { value: 'agenda-tertentu', label: 'Agenda Tanggal Tertentu' },
    ];

    const KATEGORI_COLORS = {
        'anggaran-kinerja': 'bg-sky-100 text-sky-700',
        'layanan-keagamaan': 'bg-teal-100 text-teal-700',
        'pendidikan': 'bg-amber-100 text-amber-700',
        'agenda-rutin': 'bg-violet-100 text-violet-700',
        'agenda-tertentu': 'bg-rose-100 text-rose-700',
    };

    function kategoriLabel(value) {
        return KATEGORI_LIST.find((k) => k.value === value)?.label ?? value;
    }

    // ── Fetch (admin selalu all=1 agar entri nonaktif terlihat) ──
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
        filterKategori ? items.filter((i) => i.kategori === filterKategori) : items,
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
        formKategori = filterKategori || 'anggaran-kinerja';
        formPeriode = '';
        formKegiatan = '';
        formPihak = '';
        formKeluaran = '';
        formUrutan = (items.filter((i) => i.kategori === (filterKategori || 'anggaran-kinerja')).length || 0) + 1;
        formAktif = true;
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function openEdit(item) {
        mode = 'edit';
        selected = item;
        formKategori = item.kategori ?? 'anggaran-kinerja';
        formPeriode = item.periode ?? '';
        formKegiatan = item.kegiatan ?? '';
        formPihak = item.pihak ?? '';
        formKeluaran = item.keluaran ?? '';
        formUrutan = item.urutan ?? 1;
        formAktif = item.aktif ?? true;
        saveError = '';
        saveSuccess = false;
        confirmDelete = false;
    }

    function closePanel() {
        mode = null; selected = null; confirmDelete = false;
    }

    // ── Save (create or update) ──────────────────────────────────
    async function handleSave() {
        if (!formPeriode.trim() || !formKegiatan.trim()) {
            saveError = 'Periode dan Kegiatan wajib diisi.';
            return;
        }

        saving = true; saveError = ''; saveSuccess = false;
        try {
            const body = /** @type {any} */ ({
                kategori: formKategori,
                periode: formPeriode.trim(),
                kegiatan: formKegiatan.trim(),
                pihak: formPihak.trim() || null,
                keluaran: formKeluaran.trim() || null,
                aktif: formAktif,
                urutan: Number(formUrutan) || 0,
            });

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
                items = [...items, json.data];
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
                Tambah Entri
            </button>

            <select
                bind:value={filterKategori}
                class="border border-ink/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
            >
                <option value="">Semua Kategori</option>
                {#each KATEGORI_LIST as k}
                    <option value={k.value}>{k.label}</option>
                {/each}
            </select>

            <span class="ml-auto text-sm text-ink/50">Total: {filteredItems.length} entri</span>
        </div>

        <!-- Table -->
        {#if loading}
            <div class="py-16 text-center text-sm text-ink/40">Memuat...</div>
        {:else if fetchError}
            <div class="py-16 text-center text-sm text-red-500">{fetchError}</div>
        {:else if items.length === 0}
            <div class="py-16 text-center text-sm text-ink/40">Belum ada entri kalender.</div>
        {:else}
            <div class="border bg-white border-ink/10 overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-ink/4 border-b border-ink/10">
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Periode</th>
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Kegiatan</th>
                            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden sm:table-cell">Kategori</th>
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
                                <td class="px-4 py-3 text-ink/70 whitespace-nowrap max-w-[160px]">
                                    <span class="text-xs font-semibold">{item.periode}</span>
                                </td>
                                <td class="px-4 py-3 font-medium text-ink max-w-xs">
                                    <span class="line-clamp-2 text-sm">{item.kegiatan}</span>
                                </td>
                                <td class="px-4 py-3 hidden sm:table-cell">
                                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 {KATEGORI_COLORS[item.kategori] ?? 'bg-ink/8 text-ink/60'}">{kategoriLabel(item.kategori)}</span>
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
                        {mode === 'create' ? 'Tambah Entri Kalender' : 'Edit Entri Kalender'}
                    </p>
                    {#if selected}
                        <p class="text-xs font-mono text-ink/50 mt-0.5 truncate">#{selected.id}</p>
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

                <!-- Kategori -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-kategori">
                        Kategori <span class="text-red-400">*</span>
                    </label>
                    <select
                        id="form-kategori"
                        bind:value={formKategori}
                        class="w-full border border-ink/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
                    >
                        {#each KATEGORI_LIST as k}
                            <option value={k.value}>{k.label}</option>
                        {/each}
                    </select>
                </div>

                <!-- Periode / tanggal -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-periode">
                        Periode / Tanggal <span class="text-red-400">*</span>
                    </label>
                    <input
                        id="form-periode"
                        type="text"
                        bind:value={formPeriode}
                        placeholder="mis. Januari–Februari, 7 Oktober 2026, Minggu pertama setiap bulan"
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                    <p class="text-[10px] text-ink/40 mt-1.5">Teks bebas: bulan, rentang tanggal, atau minggu ke-berapa.</p>
                </div>

                <!-- Kegiatan -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-kegiatan">
                        Kegiatan <span class="text-red-400">*</span>
                    </label>
                    <textarea
                        id="form-kegiatan"
                        bind:value={formKegiatan}
                        rows="3"
                        placeholder="Uraian kegiatan..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
                    ></textarea>
                </div>

                <!-- Pihak (PJ/satker) -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-pihak">
                        Penanggung Jawab / Satker
                    </label>
                    <textarea
                        id="form-pihak"
                        bind:value={formPihak}
                        rows="2"
                        placeholder="mis. Seluruh satker, Kasubbag TU, PPK..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
                    ></textarea>
                    <p class="text-[10px] text-ink/40 mt-1.5">Opsional. Dipakai pada kategori Agenda Rutin &amp; Agenda Tertentu.</p>
                </div>

                <!-- Keluaran / dokumen -->
                <div>
                    <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-keluaran">
                        Dokumen / Eviden / Keluaran
                    </label>
                    <textarea
                        id="form-keluaran"
                        bind:value={formKeluaran}
                        rows="2"
                        placeholder="mis. DIPA, laporan semester, notulen..."
                        class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
                    ></textarea>
                    <p class="text-[10px] text-ink/40 mt-1.5">Opsional. Dipakai pada kategori lain selain Agenda Rutin.</p>
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
                    disabled={saving}
                    class="w-full bg-green text-white text-xs font-bold uppercase py-3 hover:bg-green/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                    {#if saving}
                        <Icon icon="mdi:loading" width="14" height="14" class="animate-spin" />
                        Menyimpan...
                    {:else}
                        <Icon icon="mdi:content-save-outline" width="14" height="14" />
                        {mode === 'create' ? 'Simpan Entri' : 'Perbarui Entri'}
                    {/if}
                </button>

                <!-- Delete button (edit mode) -->
                {#if mode === 'edit'}
                    <div class="border-t border-ink/8 pt-4">
                        {#if !confirmDelete}
                            <button
                                onclick={() => (confirmDelete = true)}
                                class="w-full text-red-500 border border-red-200 text-xs font-bold uppercase py-2.5 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Icon icon="mdi:trash-can-outline" width="14" height="14" />
                                Hapus Entri
                            </button>
                        {:else}
                            <p class="text-xs text-ink/60 mb-2 text-center">Yakin ingin menghapus entri ini?</p>
                            <div class="grid grid-cols-2 gap-2">
                                <button
                                    onclick={() => (confirmDelete = false)}
                                    disabled={deleting}
                                    class="border border-ink/20 text-xs font-bold uppercase py-2.5 hover:bg-ink/5 disabled:opacity-50 transition-colors"
                                >Batal</button>
                                <button
                                    onclick={handleDelete}
                                    disabled={deleting}
                                    class="bg-red-500 text-white text-xs font-bold uppercase py-2.5 hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                                >
                                    {#if deleting}
                                        <Icon icon="mdi:loading" width="12" height="12" class="animate-spin" />
                                    {:else}
                                        Hapus
                                    {/if}
                                </button>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
