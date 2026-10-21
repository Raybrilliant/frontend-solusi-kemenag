<script>
  import Icon from "@iconify/svelte";
  let { apiUrl } = $props();

  // ── List state ──────────────────────────────────────────────
  let items      = $state([]);
  let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
  let loading    = $state(true);
  let fetchError = $state('');
  let page       = $state(1);

  // ── Panel mode: null | 'create' | 'edit' ────────────────────
  let mode     = $state(/** @type {string|null} */ (null));
  let selected = $state(/** @type {any} */ (null));

  // ── Form fields (maps to backend: judul, isi, link, aktif) ──
  let formJudul = $state('');
  let formIsi   = $state('');
  let formLink  = $state('');
  let formAktif = $state(true);

  // ── Action state ─────────────────────────────────────────────
  let saving        = $state(false);
  let togglingId    = $state(/** @type {number|null} */ (null));
  let deleting      = $state(false);
  let confirmDelete = $state(false);
  let saveError     = $state('');
  let saveSuccess   = $state(false);

  function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Fetch ────────────────────────────────────────────────────
  async function fetchList() {
    loading = true; fetchError = '';
    try {
      const qs  = new URLSearchParams({ page: String(page), limit: '20' });
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
    mode         = 'create';
    selected     = null;
    formJudul    = '';
    formIsi      = '';
    formLink     = '';
    formAktif    = true;
    saveError    = '';
    saveSuccess  = false;
    confirmDelete = false;
  }

  function openEdit(item) {
    mode         = 'edit';
    selected     = item;
    formJudul    = item.judul ?? '';
    formIsi      = item.isi ?? '';
    formLink     = item.link ?? '';
    formAktif    = item.aktif ?? true;
    saveError    = '';
    saveSuccess  = false;
    confirmDelete = false;
  }

  function closePanel() {
    mode = null; selected = null; confirmDelete = false;
  }

  // ── Save (create or update) ──────────────────────────────────
  async function handleSave() {
    if (!formJudul.trim()) {
      saveError = 'Judul pengumuman wajib diisi.';
      return;
    }

    const link = formLink.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      saveError = 'Tautan tidak valid. Gunakan format lengkap, mis. https://...';
      return;
    }

    saving = true; saveError = ''; saveSuccess = false;
    try {
      const body = /** @type {any} */ ({
        judul: formJudul.trim(),
        isi:   formIsi.trim() || null,
        link:  link || null,
        aktif: formAktif,
      });

      const isCreate = mode === 'create';
      const res  = await fetch(isCreate ? apiUrl : `${apiUrl}/${selected.id}`, {
        method:  isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        saveError = json.message ?? 'Gagal menyimpan.';
        return;
      }

      if (isCreate) {
        items      = [json.data, ...items];
        pagination = { ...pagination, total: pagination.total + 1 };
      } else {
        items    = items.map(i => i.id === selected.id ? json.data : i);
        selected = json.data;
      }
      saveSuccess = true;
      setTimeout(() => (saveSuccess = false), 3000);
    } catch (e) { saveError = String(e); }
    finally { saving = false; }
  }

  // ── Toggle aktif/nonaktif ────────────────────────────────────
  async function toggleAktif(item) {
    togglingId = item.id;
    try {
      const res  = await fetch(`${apiUrl}/${item.id}`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) {
        items = items.map(i => i.id === item.id ? json.data : i);
        if (selected?.id === item.id) selected = json.data;
      }
    } catch (e) { fetchError = String(e); }
    finally { togglingId = null; }
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

  $effect(() => { page; fetchList(); });
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
        Tambah Pengumuman
      </button>

      <span class="ml-auto text-sm text-ink/50">Total: {pagination.total} pengumuman</span>
    </div>

    <!-- Table -->
    {#if loading}
      <div class="py-16 text-center text-sm text-ink/40">Memuat...</div>
    {:else if fetchError}
      <div class="py-16 text-center text-sm text-red-500">{fetchError}</div>
    {:else if items.length === 0}
      <div class="py-16 text-center text-sm text-ink/40">Belum ada pengumuman.</div>
    {:else}
      <div class="border bg-white border-ink/10 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-ink/4 border-b border-ink/10">
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Judul</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden lg:table-cell">Isi</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden md:table-cell">Tautan</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Status</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden xl:table-cell">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item (item.id)}
              <tr
                onclick={() => openEdit(item)}
                class="border-b border-ink/5 cursor-pointer hover:bg-green/3 transition-colors {selected?.id === item.id && mode === 'edit' ? 'bg-green/5' : ''}"
              >
                <td class="px-4 py-3 font-medium text-ink max-w-xs">
                  <span class="line-clamp-2 text-sm">{item.judul}</span>
                </td>
                <td class="px-4 py-3 text-ink/55 hidden lg:table-cell max-w-xs">
                  <span class="line-clamp-2 text-xs">{item.isi ?? '—'}</span>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  {#if item.link}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onclick={(e) => e.stopPropagation()}
                      class="inline-flex items-center gap-1 text-[10px] font-bold text-green hover:underline"
                    >
<Icon icon="mdi:link-variant" width="12" height="12" />
                      Tautan
                    </a>
                  {:else}
                    <span class="text-[10px] text-ink/25">—</span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <button
                    onclick={(e) => { e.stopPropagation(); toggleAktif(item); }}
                    disabled={togglingId === item.id}
                    class={`text-[10px] font-bold uppercase px-2 py-1 transition-colors ${item.aktif ? 'bg-green/10 text-green hover:bg-green/20' : 'bg-ink/8 text-ink/40 hover:bg-ink/15'}`}
                    title={item.aktif ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                  >
                    {item.aktif ? 'Aktif' : 'Nonaktif'}
                  </button>
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

  <!-- ── Right: Form panel ───────────────────────────────────── -->
  {#if mode}
    <div class="w-80 xl:w-96 shrink-0 border border-ink/10 bg-white flex flex-col self-start sticky top-4">
      <!-- Panel header -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-ink/8 bg-ink/2">
        <div class="flex-1 min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-ink/40">
            {mode === 'create' ? 'Pengumuman Baru' : 'Edit Pengumuman'}
          </p>
          {#if selected}
            <p class="text-xs font-mono text-ink/50 mt-0.5 truncate">ID {selected.id}</p>
          {/if}
        </div>
        <button
          onclick={closePanel}
          class="w-8 h-8 flex items-center justify-center border border-ink/15 hover:bg-ink/5 transition-colors"
          aria-label="Tutup panel"
        >
<Icon icon="mdi:close" width="12" height="12" />
        </button>
      </div>

      <div class="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <!-- Judul -->
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-judul">
            Judul Pengumuman
            <span class="text-red-400">*</span>
          </label>
          <input
            id="form-judul"
            type="text"
            bind:value={formJudul}
            maxlength="300"
            placeholder="mis. Pendaftaran haji dibuka s.d. 30 November"
            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
          />
        </div>

        <!-- Isi -->
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-isi">Isi Lengkap</label>
          <textarea
            id="form-isi"
            bind:value={formIsi}
            rows="4"
            placeholder="Rincian pengumuman (opsional)"
            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-y"
          ></textarea>
        </div>

        <!-- Link -->
        <div>
          <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="form-link">Tautan Terkait</label>
          <input
            id="form-link"
            type="url"
            bind:value={formLink}
            placeholder="https://drive.google.com/..."
            class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green"
          />
          <p class="text-[10px] text-ink/40 mt-1.5">Opsional. Bila diisi, pengumuman di marquee bisa diklik.</p>
        </div>

        <!-- Status -->
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">Status</p>
          <div class="grid grid-cols-2 border border-ink/20">
            <button
              type="button"
              onclick={() => (formAktif = true)}
              class={`px-3 py-2 text-xs font-bold uppercase transition-colors ${formAktif ? 'bg-green text-white' : 'text-ink/50 hover:bg-ink/5'}`}
            >Aktif</button>
            <button
              type="button"
              onclick={() => (formAktif = false)}
              class={`px-3 py-2 text-xs font-bold uppercase transition-colors ${!formAktif ? 'bg-ink text-white' : 'text-ink/50 hover:bg-ink/5'}`}
            >Nonaktif</button>
          </div>
          <p class="text-[10px] text-ink/40 mt-1.5">Hanya pengumuman aktif yang tampil di pita marquee.</p>
        </div>

        {#if saveError}
          <p class="text-xs text-red-500">{saveError}</p>
        {/if}
        {#if saveSuccess}
          <p class="text-xs text-green font-semibold">Pengumuman tersimpan.</p>
        {/if}

        <button
          onclick={handleSave}
          disabled={saving}
          class="flex items-center justify-center gap-2 bg-green text-white text-xs font-bold uppercase px-4 py-3 hover:bg-green/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Menyimpan...' : (mode === 'create' ? 'Simpan Pengumuman' : 'Perbarui Pengumuman')}
        </button>

        {#if mode === 'edit'}
          <div class="border-t border-ink/8 pt-3">
            {#if !confirmDelete}
              <button
                onclick={() => (confirmDelete = true)}
                class="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 text-xs font-bold uppercase px-4 py-2.5 hover:bg-red-50 transition-colors"
              >
<Icon icon="mdi:delete-outline" width="14" height="14" />
                Hapus Pengumuman
              </button>
            {:else}
              <div class="border border-red-200 p-3 bg-red-50">
                <p class="text-xs text-red-600 font-semibold mb-2">Hapus pengumuman ini? Tindakan tidak dapat dibatalkan.</p>
                <div class="flex gap-2">
                  <button
                    onclick={handleDelete}
                    disabled={deleting}
                    class="flex-1 bg-red-500 text-white text-xs font-bold uppercase px-3 py-2 hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                  <button
                    onclick={() => (confirmDelete = false)}
                    class="flex-1 border border-ink/20 text-ink/60 text-xs font-bold uppercase px-3 py-2 hover:bg-ink/5 transition-colors"
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
