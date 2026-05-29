<script>
  import Icon from "@iconify/svelte";
  let { apiUrl } = $props();

  // ── List state ──────────────────────────────────────────────
  let items      = $state([]);
  let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
  let loading    = $state(true);
  let fetchError = $state('');
  let page       = $state(1);
  let filterType = $state('');

  // ── Panel mode: null | 'create' | 'edit' ────────────────────
  let mode     = $state(/** @type {string|null} */ (null));
  let selected = $state(/** @type {any} */ (null));

  // ── Form fields (maps to backend: type, label, title, description, fileUrl) ──
  let formType        = $state('PMA');
  let formLabel       = $state('');
  let formTitle       = $state('');
  let formDescription = $state('');
  let pdfFile         = $state(/** @type {File|null} */ (null));
  let existingFileUrl  = $state('');

  // ── Action state ─────────────────────────────────────────────
  let saving        = $state(false);
  let uploading     = $state(false);
  let deleting      = $state(false);
  let confirmDelete = $state(false);
  let saveError     = $state('');
  let saveSuccess   = $state(false);

  const JENIS_LIST = ["UU", "PERPU", "PP", "PERPRES", "INPRES", "PERMEN", "PMA", "KMA", "PERDIRJEN", "SE", "SKB"];

  const JENIS_COLORS = {
    PMA:       'bg-green/10 text-green',
    KMA:       'bg-yellow/40 text-yellow-800',
    PP:        'bg-ink/8 text-ink/60',
    Perpres:   'bg-purple-100 text-purple-700',
    Kepdirjen: 'bg-blue-100 text-blue-700',
    UU:        'bg-pink-100 text-pink-700',
    PERPU:     'bg-orange-100 text-orange-700',
    PERPRES:   'bg-sky-100 text-sky-700',
    INPRES:    'bg-indigo-100 text-indigo-700',
    PERMEN:    'bg-red-100 text-red-700',
    Lainnya:   'bg-ink/5 text-ink/50',
  };

  function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function pdfProxyUrl(url) {
    if (!url) return '';
    const filename = url.split('/').pop();
    return `/api/upload/${encodeURIComponent(filename)}`;
  }

  // ── Fetch ────────────────────────────────────────────────────
  async function fetchList() {
    loading = true; fetchError = '';
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterType) qs.set('type', filterType);
      const res  = await fetch(`${apiUrl}?${qs}`);
      const json = await res.json();
      if (json.success) {
        items      = json.data ?? [];
        pagination = json.pagination ?? pagination;
      } else {
        fetchError = json.message ?? 'Gagal memuat data.';
      }
    } catch (e) { fetchError = String(e); }
    finally { loading = false; }
  }

  // ── Panel helpers ────────────────────────────────────────────
  function openCreate() {
    mode            = 'create';
    selected        = null;
    formType        = 'PMA';
    formLabel       = '';
    formTitle       = '';
    formDescription = '';
    pdfFile         = null;
    existingFileUrl  = '';
    saveError       = '';
    saveSuccess     = false;
    confirmDelete   = false;
  }

  function openEdit(item) {
    mode            = 'edit';
    selected        = item;
    formType        = item.type        ?? 'PMA';
    formLabel       = item.label       ?? '';
    formTitle       = item.title       ?? '';
    formDescription = item.description ?? '';
    pdfFile         = null;
    existingFileUrl  = item.fileUrl    ?? '';
    saveError       = '';
    saveSuccess     = false;
    confirmDelete   = false;
  }

  function closePanel() {
    mode = null; selected = null; confirmDelete = false;
  }

  // ── Save (create or update) ──────────────────────────────────
  async function handleSave() {
    if (!formLabel.trim() || !formTitle.trim()) {
      saveError = 'Nomor dan Judul wajib diisi.';
      return;
    }
    if (mode === 'create' && !pdfFile && !existingFileUrl) {
      saveError = 'Dokumen PDF wajib diunggah.';
      return;
    }
    saving = true; saveError = ''; saveSuccess = false;
    try {
      const body = /** @type {any} */ ({
        type:        formType,
        label:       formLabel.trim(),
        title:       formTitle.trim(),
        description: formDescription.trim(),
        fileUrl:     existingFileUrl,
      });

      // Upload PDF if a new file was selected
      if (pdfFile) {
        uploading = true;
        const fd = new FormData();
        fd.append('file', pdfFile);
        const upRes  = await fetch('/api/upload-dokumen', { method: 'POST', body: fd });
        const upJson = await upRes.json();
        uploading = false;
        if (!upJson.success) { saveError = upJson.message ?? 'Gagal mengunggah PDF.'; saving = false; return; }
        body.fileUrl = upJson.data.url ?? upJson.data.fileUrl ?? '';
      }

      const isCreate = mode === 'create';
      const res  = await fetch(isCreate ? apiUrl : `${apiUrl}/${selected.id}`, {
        method:  isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { saveError = json.message ?? 'Gagal menyimpan.'; return; }

      if (isCreate) {
        items      = [json.data, ...items];
        pagination = { ...pagination, total: pagination.total + 1 };
      } else {
        items    = items.map(i => i.id === selected.id ? json.data : i);
        selected = json.data;
      }

      existingFileUrl = json.data.fileUrl ?? '';
      pdfFile         = null;
      saveSuccess     = true;
      setTimeout(() => (saveSuccess = false), 3000);
    } catch (e) { saveError = String(e); }
    finally { saving = false; uploading = false; }
  }

  // ── Delete ───────────────────────────────────────────────────
  async function handleDelete() {
    deleting = true;
    try {
      const res  = await fetch(`${apiUrl}/${selected.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        items      = items.filter(i => i.id !== selected.id);
        pagination = { ...pagination, total: Math.max(0, pagination.total - 1) };
        closePanel();
      } else {
        saveError = json.message ?? 'Gagal menghapus.';
      }
    } catch (e) { saveError = String(e); }
    finally { deleting = false; }
  }

  $effect(() => { page; filterType; fetchList(); });
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
        Tambah Regulasi
      </button>

      <select
        bind:value={filterType}
        onchange={() => (page = 1)}
        class="border border-ink/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
      >
        <option value="">Semua Jenis</option>
        {#each JENIS_LIST as j}
          <option value={j}>{j}</option>
        {/each}
      </select>

      <span class="ml-auto text-sm text-ink/50">Total: {pagination.total} regulasi</span>
    </div>

    <!-- Table -->
    {#if loading}
      <div class="py-16 text-center text-sm text-ink/40">Memuat...</div>
    {:else if fetchError}
      <div class="py-16 text-center text-sm text-red-500">{fetchError}</div>
    {:else if items.length === 0}
      <div class="py-16 text-center text-sm text-ink/40">Belum ada regulasi.</div>
    {:else}
      <div class="border bg-white border-ink/10 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-ink/4 border-b border-ink/10">
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Nomor</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden sm:table-cell">Jenis</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Judul</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden lg:table-cell">Keterangan</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden md:table-cell">PDF</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden xl:table-cell">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item}
              <tr
                onclick={() => openEdit(item)}
                class="border-b border-ink/5 cursor-pointer hover:bg-green/3 transition-colors {selected?.id === item.id && mode === 'edit' ? 'bg-green/5' : ''}"
              >
                <td class="px-4 py-3 font-mono text-xs text-ink/70 whitespace-nowrap max-w-[160px] truncate">{item.label}</td>
                <td class="px-4 py-3 hidden sm:table-cell">
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 {JENIS_COLORS[item.type] ?? 'bg-ink/8 text-ink/60'}">{item.type}</span>
                </td>
                <td class="px-4 py-3 font-medium text-ink max-w-xs">
                  <span class="line-clamp-2 text-sm">{item.title}</span>
                </td>
                <td class="px-4 py-3 text-ink/55 hidden lg:table-cell max-w-xs">
                  <span class="line-clamp-2 text-xs">{item.description ?? '-'}</span>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  {#if item.fileUrl}
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold text-green">
<Icon icon="mdi:file-document-outline" width="12" height="12" />
                      PDF
                    </span>
                  {:else}
                    <span class="text-[10px] text-ink/25">—</span>
                  {/if}
                </td>
                <td class="px-4 py-3 text-xs text-ink/50 whitespace-nowrap hidden xl:table-cell">{formatDate(item.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if pagination.totalPages > 1}
        <div class="flex items-center gap-2">
          <button
            onclick={() => (page = Math.max(1, page - 1))}
            disabled={page === 1}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors"
          >← Prev</button>
          <span class="text-xs text-ink/50">Halaman {page} / {pagination.totalPages}</span>
          <button
            onclick={() => (page = Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
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
            {mode === 'create' ? 'Tambah Regulasi Baru' : 'Edit Regulasi'}
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

        <!-- Jenis / Type -->
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">Jenis Regulasi</label>
          <div class="flex flex-wrap gap-1.5">
            {#each JENIS_LIST as j}
              <button
                type="button"
                onclick={() => (formType = j)}
                class="px-3 py-1.5 text-[10px] font-bold uppercase border transition-colors {formType === j ? 'bg-green text-white border-green' : 'border-ink/20 text-ink/60 hover:border-green/50'}"
              >{j}</button>
            {/each}
          </div>
        </div>

        <!-- Label (nomor regulasi) -->
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-label">
            Nomor <span class="text-red-400">*</span>
          </label>
          <input
            id="form-label"
            type="text"
            bind:value={formLabel}
            placeholder="Contoh: PMA No. 12 Tahun 2020"
            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
          />
        </div>

        <!-- Title (judul) -->
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-title">
            Judul <span class="text-red-400">*</span>
          </label>
          <input
            id="form-title"
            type="text"
            bind:value={formTitle}
            placeholder="Judul peraturan..."
            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
          />
        </div>

        <!-- Description (keterangan) -->
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-description">Keterangan</label>
          <textarea
            id="form-description"
            bind:value={formDescription}
            rows="3"
            placeholder="Deskripsi singkat regulasi..."
            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
          ></textarea>
        </div>

        <!-- PDF Upload -->
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
          {uploading ? 'Mengunggah PDF...' : saving ? 'Menyimpan...' : mode === 'create' ? 'Simpan Regulasi' : 'Simpan Perubahan'}
        </button>

        <!-- Delete (edit mode only) -->
        {#if mode === 'edit'}
          <div class="border-t border-ink/8 pt-3">
            {#if !confirmDelete}
              <button
                onclick={() => (confirmDelete = true)}
                class="w-full py-2 border border-red-200 text-red-500 text-xs font-bold uppercase hover:bg-red-50 transition-colors"
              >Hapus Regulasi</button>
            {:else}
              <div class="border border-red-200 p-3 bg-red-50">
                <p class="text-xs text-red-600 font-semibold mb-2">Yakin ingin menghapus regulasi ini?</p>
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
