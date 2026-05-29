<script>
  import Icon from "@iconify/svelte";
  let { apiUrl } = $props();

  // ── List state ──────────────────────────────────────────
  let items = $state([]);
  let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
  let loading = $state(true);
  let fetchError = $state('');
  let page = $state(1);
  let filterStatus = $state('');
  let filterTipe = $state('');

  // ── Detail state ─────────────────────────────────────────
  let selected = $state(/** @type {any} */ (null));
  let detailLoading = $state(false);
  let newStatus = $state('');
  let message = $state('');
  let outputFile = $state(/** @type {File|null} */ (null));
  let uploading = $state(false);
  let saving = $state(false);
  let saveError = $state('');
  let saveSuccess = $state(false);
  let deleting = $state(false);
  let confirmDelete = $state(false);

  const STATUS_COLORS = {
    Baru:     'bg-blue-100 text-blue-700',
    Diproses: 'bg-yellow-100 text-yellow-700',
    Selesai:  'bg-green-100 text-green-700',
  };

  const TIPE_COLORS = {
    Layanan:    'bg-ink/8 text-ink/70',
    Korupsi:    'bg-red-100 text-red-700',
    'Isi Manual':'bg-purple-100 text-purple-700',
  };

  function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function fetchList() {
    loading = true;
    fetchError = '';
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) qs.set('status', filterStatus);
      if (filterTipe)   qs.set('tipe', filterTipe);
      const res = await fetch(`${apiUrl}?${qs}`);
      const json = await res.json();
      if (json.success) {
        items = json.data ?? [];
        pagination = json.pagination ?? pagination;
      } else {
        fetchError = json.message ?? 'Gagal memuat data.';
      }
    } catch (e) {
      fetchError = String(e);
    } finally {
      loading = false;
    }
  }

  async function openDetail(item) {
    selected = item;
    newStatus = item.status;
    message = '';
    outputFile = null;
    saveError = '';
    saveSuccess = false;
    confirmDelete = false;
    detailLoading = true;
    try {
      const res = await fetch(`${apiUrl}/${item.id}`);
      const json = await res.json();
      if (json.success) {
        selected = json.data;
        newStatus = json.data.status;
        message = json.data.message ?? '';
      }
    } catch {}
    detailLoading = false;
  }

  function closeDetail() {
    selected = null;
    confirmDelete = false;
  }

  async function handleSave() {
    saving = true;
    saveError = '';
    saveSuccess = false;
    try {
      const body = { status: newStatus };
      if (message.trim()) body.message = message.trim();

      // Upload output file jika ada dan status Selesai
      if (newStatus === 'Selesai' && outputFile) {
        uploading = true;
        const fd = new FormData();
        fd.append('file', outputFile);
        const upRes = await fetch('/api/upload-dokumen', { method: 'POST', body: fd });
        const upJson = await upRes.json();
        uploading = false;
        if (!upJson.success) { saveError = upJson.message ?? 'Gagal mengunggah file.'; return; }
        body.outputFile = { nama: upJson.data.nama, url: upJson.data.url };
      }

      const res = await fetch(`${apiUrl}/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { saveError = json.message ?? 'Gagal menyimpan.'; return; }
      selected = json.data;
      newStatus = json.data.status;
      message = json.data.message ?? '';
      outputFile = null;
      saveSuccess = true;
      setTimeout(() => saveSuccess = false, 3000);
      items = items.map(i => i.id === selected.id ? { ...i, status: json.data.status } : i);
    } catch (e) {
      saveError = String(e);
    } finally {
      saving = false;
      uploading = false;
    }
  }

  async function handleDelete() {
    deleting = true;
    try {
      const res = await fetch(`${apiUrl}/${selected.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        items = items.filter(i => i.id !== selected.id);
        closeDetail();
      } else {
        saveError = json.message ?? 'Gagal menghapus.';
      }
    } catch (e) {
      saveError = String(e);
    } finally {
      deleting = false;
    }
  }

  $effect(() => { fetchList(); });

  $effect(() => {
    page; filterStatus; filterTipe;
    fetchList();
  });
</script>

<div class="flex gap-6 min-h-0">

  <!-- ── Left: List ───────────────────────────────────────── -->
  <div class="flex-1 min-w-0 flex flex-col gap-4">

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <select
        bind:value={filterStatus}
        onchange={() => page = 1}
        class="border border-ink/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
      >
        <option value="">Semua Status</option>
        <option value="Baru">Baru</option>
        <option value="Diproses">Diproses</option>
        <option value="Selesai">Selesai</option>
      </select>
      <select
        bind:value={filterTipe}
        onchange={() => page = 1}
        class="border border-ink/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
      >
        <option value="">Semua Tipe</option>
        <option value="Layanan">Layanan</option>
        <option value="Korupsi">Korupsi</option>
        <option value="Isi Manual">Isi Manual</option>
      </select>
      <span class="ml-auto text-sm text-ink/50 self-center">Total: {pagination.total} pengaduan</span>
    </div>

    <!-- Table -->
    {#if loading}
      <div class="py-16 text-center text-sm text-ink/40">Memuat...</div>
    {:else if fetchError}
      <div class="py-16 text-center text-sm text-red-500">{fetchError}</div>
    {:else if items.length === 0}
      <div class="py-16 text-center text-sm text-ink/40">Belum ada pengaduan.</div>
    {:else}
      <div class="border bg-white border-ink/10 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-ink/4 border-b border-ink/10">
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Kode</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Tipe</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden md:table-cell">Deskripsi</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50">Status</th>
              <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink/50 hidden lg:table-cell">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item}
              <tr
                onclick={() => openDetail(item)}
                class="border-b border-ink/5 cursor-pointer hover:bg-green/3 transition-colors {selected?.id === item.id ? 'bg-green/5' : ''}"
              >
                <td class="px-4 py-3 font-mono text-xs text-ink/60 whitespace-nowrap">{item.id.slice(0, 14)}…</td>
                <td class="px-4 py-3">
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 {TIPE_COLORS[item.tipe] ?? 'bg-ink/8 text-ink/60'}">{item.tipe}</span>
                </td>
                <td class="px-4 py-3 text-ink/70 hidden md:table-cell max-w-xs">
                  <span class="line-clamp-2">{item.deskripsi}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 {STATUS_COLORS[item.status] ?? 'bg-ink/8 text-ink/60'}">{item.status}</span>
                </td>
                <td class="px-4 py-3 text-xs text-ink/50 whitespace-nowrap hidden lg:table-cell">{formatDate(item.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if pagination.totalPages > 1}
        <div class="flex items-center gap-2">
          <button
            onclick={() => page = Math.max(1, page - 1)}
            disabled={page === 1}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors"
          >
            ← Prev
          </button>
          <span class="text-xs text-ink/50">Halaman {page} / {pagination.totalPages}</span>
          <button
            onclick={() => page = Math.min(pagination.totalPages, page + 1)}
            disabled={page === pagination.totalPages}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      {/if}
    {/if}
  </div>

  <!-- ── Right: Detail panel ──────────────────────────────── -->
  {#if selected}
    <div class="w-80 xl:w-96 shrink-0 border border-ink/10 bg-white flex flex-col self-start sticky top-4">

      <!-- Header -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-ink/8 bg-ink/2">
        <div class="flex-1 min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-widest text-ink/40">Detail Pengaduan</p>
          <p class="text-xs font-mono text-ink/60 mt-0.5 truncate">{selected.id}</p>
        </div>
        <button
          onclick={closeDetail}
          class="w-7 h-7 flex items-center justify-center hover:bg-ink/8 transition-colors rounded-full"
          aria-label="Tutup"
        >
<Icon icon="mdi:close" width="12" height="12" />
        </button>
      </div>

      {#if detailLoading}
        <div class="p-6 text-center text-sm text-ink/40">Memuat detail...</div>
      {:else}
        <div class="p-5 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-12rem)]">

          <!-- Meta -->
          <div class="flex flex-wrap gap-2">
            <span class="text-[10px] font-bold uppercase px-2.5 py-1 {TIPE_COLORS[selected.tipe] ?? 'bg-ink/8 text-ink/60'}">{selected.tipe}</span>
            <span class="text-[10px] font-bold uppercase px-2.5 py-1 {STATUS_COLORS[selected.status] ?? 'bg-ink/8 text-ink/60'}">{selected.status}</span>
          </div>

          <!-- Tanggal -->
          <div class="text-xs text-ink/50 flex flex-col gap-1">
            <span><strong class="text-ink/70">Diterima:</strong> {formatDateTime(selected.createdAt)}</span>
            {#if selected.processedAt}
              <span><strong class="text-ink/70">Diproses:</strong> {formatDateTime(selected.processedAt)}</span>
            {/if}
          </div>

          <!-- Deskripsi -->
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wide text-ink/40 mb-1">Isi Pengaduan</p>
            <p class="text-sm text-ink/80 leading-relaxed whitespace-pre-wrap">{selected.deskripsi}</p>
          </div>

          <!-- Dokumen pendukung -->
          {#if selected.dokumen?.length}
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wide text-ink/40 mb-2">
                Dokumen Pendukung ({selected.dokumen.length})
              </p>
              <div class="flex flex-col gap-1.5">
                {#each selected.dokumen as dok}
                  {@const filename = dok.url.split('/').pop()}
                  {@const proxyUrl = `/api/upload/${filename}`}
                  <a
                    href={proxyUrl}
                    download={dok.nama}
                    class="flex items-center gap-2.5 bg-ink/3 border border-ink/8 px-3 py-2 hover:bg-green/5 hover:border-green/30 transition-colors group"
                  >
<Icon icon="mdi:file-document-outline" width="14" height="14" class="text-green shrink-0" />
                    <span class="flex-1 text-xs font-medium text-ink/70 truncate group-hover:text-ink">{dok.nama}</span>
                    <span class="text-[10px] text-ink/40 shrink-0">
                      {dok.ukuran < 1024*1024 ? `${(dok.ukuran/1024).toFixed(0)} KB` : `${(dok.ukuran/(1024*1024)).toFixed(1)} MB`}
                    </span>
<Icon icon="mdi:download" width="12" height="12" class="text-ink/30 shrink-0 group-hover:text-green transition-colors" />
                  </a>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Output file yang sudah dikirim -->
          {#if selected.outputFile?.url}
            {@const outFilename = selected.outputFile.url.split('/').pop()}
            <div class="bg-green/5 border border-green/20 p-3 flex items-center gap-2.5">
<Icon icon="mdi:file-document-outline" width="14" height="14" class="text-green shrink-0" />
              <span class="flex-1 text-xs font-medium text-ink/70 truncate">{selected.outputFile.nama}</span>
              <a
                href={`/api/upload/${outFilename}`}
                download={selected.outputFile.nama}
                class="text-[10px] font-bold uppercase text-green hover:underline shrink-0"
              >Unduh</a>
            </div>
          {/if}

          <div class="border-t border-ink/8 pt-4 flex flex-col gap-3">
            <!-- Status -->
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">Ubah Status</label>
              <div class="flex gap-2 flex-wrap">
                {#each ['Baru', 'Diproses', 'Selesai'] as s}
                  <button
                    onclick={() => newStatus = s}
                    class="px-3 py-1.5 text-[10px] font-bold uppercase border transition-colors {newStatus === s ? 'bg-green text-white border-green' : 'border-ink/20 text-ink/60 hover:border-green/50'}"
                  >
                    {s}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Message tindak lanjut -->
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5" for="message-input">
                Pesan Tindak Lanjut
                <span class="font-normal normal-case opacity-60">(ditampilkan ke pelapor)</span>
              </label>
              <textarea
                id="message-input"
                bind:value={message}
                rows="3"
                placeholder="Tulis informasi tindak lanjut yang bisa dilihat pelapor..."
                class="w-full border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:border-green resize-none"
              ></textarea>
            </div>

            <!-- Output file (hanya jika status Selesai) -->
            {#if newStatus === 'Selesai'}
              <div>
                <label class="text-[10px] font-bold uppercase tracking-wide text-ink/50 block mb-1.5">
                  File Output
                  <span class="font-normal normal-case opacity-60">(opsional, maks. 5 MB)</span>
                </label>
                {#if outputFile}
                  <div class="flex items-center gap-2 bg-ink/3 border border-ink/10 px-3 py-2">
<Icon icon="mdi:file-document-outline" width="13" height="13" class="text-green shrink-0" />
                    <span class="flex-1 text-xs font-medium truncate">{outputFile.name}</span>
                    <button
                      type="button"
                      onclick={() => outputFile = null}
                      class="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase shrink-0"
                    >Hapus</button>
                  </div>
                {:else}
                  <label class="flex items-center gap-2 border border-dashed border-ink/20 px-3 py-2.5 cursor-pointer hover:border-green/40 hover:bg-green/3 transition-colors">
<Icon icon="mdi:cloud-upload-outline" width="14" height="14" class="text-ink/30 shrink-0" />
                    <span class="text-xs text-ink/50">Pilih file (PDF, JPG, PNG)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      class="hidden"
                      onchange={e => { const f = e.target.files?.[0]; if (f && f.size <= 5*1024*1024) outputFile = f; e.target.value = ''; }}
                    />
                  </label>
                {/if}
              </div>
            {/if}

            {#if saveError}
              <p class="text-xs text-red-500">{saveError}</p>
            {/if}
            {#if saveSuccess}
              <p class="text-xs text-green font-semibold">Tersimpan.</p>
            {/if}

            <button
              onclick={handleSave}
              disabled={saving}
              class="w-full py-2.5 bg-green text-white text-xs font-bold uppercase hover:bg-green/90 transition-colors disabled:opacity-60"
            >
              {uploading ? 'Mengunggah...' : saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>

            <!-- Delete -->
            {#if !confirmDelete}
              <button
                onclick={() => confirmDelete = true}
                class="w-full py-2 border border-red-200 text-red-500 text-xs font-bold uppercase hover:bg-red-50 transition-colors"
              >
                Hapus Pengaduan
              </button>
            {:else}
              <div class="border border-red-200 p-3 bg-red-50">
                <p class="text-xs text-red-600 font-semibold mb-2">Yakin ingin menghapus pengaduan ini?</p>
                <div class="flex gap-2">
                  <button
                    onclick={handleDelete}
                    disabled={deleting}
                    class="flex-1 py-2 bg-red-500 text-white text-xs font-bold uppercase hover:bg-red-600 transition-colors disabled:opacity-60"
                  >
                    {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                  <button
                    onclick={() => confirmDelete = false}
                    class="flex-1 py-2 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
