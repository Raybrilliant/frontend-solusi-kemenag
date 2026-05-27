<script>
  let tipe = $state('Layanan');
  let deskripsi = $state('');
  let files = $state(/** @type {File[]} */ ([]));
  let isDragging = $state(false);
  let uploadProgress = $state(/** @type {{current:number,total:number}|null} */ (null));
  let loading = $state(false);
  let error = $state('');
  let result = $state(/** @type {null|{id:string,tipe:string,status:string}} */ (null));
  let copied = $state(false);

  const tipeOptions = ['Layanan', 'Korupsi', 'Lainnya'];

  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(
      f => f.size <= 5 * 1024 * 1024 && /\.(pdf|jpe?g|png)$/i.test(f.name)
    );
    files = [...files, ...valid];
  }

  function removeFile(i) {
    files = files.filter((_, idx) => idx !== i);
  }

  function formatSize(bytes) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!deskripsi.trim()) { error = 'Deskripsi pengaduan wajib diisi.'; return; }
    error = '';
    loading = true;
    uploadProgress = null;
    try {
      // Upload dokumen pendukung jika ada
      const dokumen = [];
      if (files.length > 0) {
        uploadProgress = { current: 0, total: files.length };
        for (const f of files) {
          const fd = new FormData();
          fd.append('file', f);
          const upRes = await fetch('/api/upload-dokumen', { method: 'POST', body: fd });
          const upJson = await upRes.json();
          if (!upJson.success) throw new Error(upJson.message ?? 'Gagal mengunggah dokumen.');
          dokumen.push({ nama: upJson.data.nama, ukuran: upJson.data.ukuran, url: upJson.data.url, tipe: upJson.data.tipe });
          uploadProgress = { current: dokumen.length, total: files.length };
        }
      }
      uploadProgress = null;

      const body = { tipe, deskripsi: deskripsi.trim() };
      if (dokumen.length > 0) body.dokumen = dokumen;

      const res = await fetch('/api/pengaduan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { error = json.message ?? 'Gagal mengirim pengaduan.'; return; }
      result = json.data;
    } catch (err) {
      error = err.message || 'Terjadi kesalahan, coba lagi.';
    } finally {
      loading = false;
      uploadProgress = null;
    }
  }

  function copyId() {
    if (!result?.id) return;
    navigator.clipboard.writeText(result.id).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    });
  }

  function reset() {
    result = null;
    tipe = 'Layanan';
    deskripsi = '';
    files = [];
    error = '';
  }
</script>

{#if result}
  <!-- Success state -->
  <div class="border border-green/30 bg-green/5 p-6 md:p-8 max-w-lg">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 bg-green flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs font-bold uppercase tracking-wide text-green">Pengaduan Terkirim</p>
        <p class="text-sm text-ink/60 mt-0.5">Simpan kode berikut untuk memantau status pengaduan Anda.</p>
      </div>
    </div>

    <div class="bg-white border border-ink/10 p-4 mb-4">
      <p class="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-1">Kode Pengaduan</p>
      <div class="flex items-center gap-3">
        <p class="text-lg md:text-xl font-mono font-bold text-ink flex-1 break-all">{result.id}</p>
        <button
          onclick={copyId}
          class="shrink-0 px-3 py-2 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 transition-colors"
        >
          {copied ? 'Disalin!' : 'Salin'}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mb-5">
      <span class="text-[10px] font-bold uppercase px-2.5 py-1 bg-ink/8 text-ink/60">{result.tipe}</span>
      <span class="text-[10px] font-bold uppercase px-2.5 py-1 bg-yellow text-ink">{result.status}</span>
    </div>

    <div class="flex flex-wrap gap-3">
      <a
        href={`/check-progress?kode=${encodeURIComponent(result.id)}`}
        class="inline-flex items-center gap-2 bg-green text-white text-xs font-bold uppercase px-5 py-3 hover:bg-green/90 transition-colors"
      >
        Pantau Status
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 18L5 16.6 14.6 7H6V5h12v12h-2V8.4z"/></svg>
      </a>
      <button
        onclick={reset}
        class="inline-flex items-center gap-2 border border-ink/20 text-ink text-xs font-bold uppercase px-5 py-3 hover:bg-ink/5 transition-colors"
      >
        Kirim Lagi
      </button>
    </div>
  </div>

{:else}
  <!-- Form -->
  <form onsubmit={handleSubmit} class="max-w-lg flex flex-col gap-5">

    <!-- Tipe -->
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-bold uppercase tracking-wide text-ink/60" for="tipe">
        Jenis Pengaduan <span class="text-red-500">*</span>
      </label>
      <select
        id="tipe"
        bind:value={tipe}
        class="border border-ink/20 bg-white px-4 py-3 text-sm font-medium focus:outline-none focus:border-green transition-colors appearance-none"
      >
        {#each tipeOptions as opt}
          <option value={opt}>{opt}</option>
        {/each}
      </select>
    </div>

    <!-- Deskripsi -->
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-bold uppercase tracking-wide text-ink/60" for="deskripsi">
        Isi Pengaduan <span class="text-red-500">*</span>
      </label>
      <textarea
        id="deskripsi"
        bind:value={deskripsi}
        rows="6"
        placeholder="Jelaskan pengaduan Anda secara detail..."
        class="border border-ink/20 bg-white px-4 py-3 text-sm focus:outline-none focus:border-green transition-colors resize-none"
      ></textarea>
      <p class="text-[11px] text-ink/40">{deskripsi.length} karakter</p>
    </div>

    <!-- Dokumen pendukung (opsional) -->
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-bold uppercase tracking-wide text-ink/60">
        Dokumen Pendukung
        <span class="font-normal opacity-60 normal-case">(opsional, maks. 5 MB/file)</span>
      </label>

      <!-- Drop zone -->
      <label
        class="border-2 border-dashed border-ink/15 flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors hover:border-green/40 hover:bg-green/3 {isDragging ? 'border-green bg-green/5' : ''}"
        ondragover={e => { e.preventDefault(); isDragging = true; }}
        ondragleave={() => isDragging = false}
        ondrop={e => { e.preventDefault(); isDragging = false; if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="text-ink/30">
          <path d="M14,13V17H10V13H7L12,8L17,13M19.35,10.03C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.03C2.34,8.36 0,10.9 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.03Z"/>
        </svg>
        <p class="text-sm font-medium text-ink/50">Klik atau seret file ke sini</p>
        <p class="text-xs text-ink/30">PDF, JPG, PNG — maks. 5 MB per file</p>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          class="hidden"
          onchange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />
      </label>

      <!-- File list -->
      {#if files.length > 0}
        <div class="flex flex-col gap-1 mt-1">
          {#each files as f, i}
            <div class="flex items-center gap-2 bg-white border border-ink/10 px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-green shrink-0">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              <span class="flex-1 truncate text-xs font-medium">{f.name}</span>
              <span class="text-xs text-ink/40 shrink-0">{formatSize(f.size)}</span>
              <button
                type="button"
                onclick={() => removeFile(i)}
                class="shrink-0 w-5 h-5 flex items-center justify-center hover:bg-ink/8 rounded-full transition-colors"
                aria-label="Hapus"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-ink/40">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Upload progress -->
    {#if uploadProgress}
      <div class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold text-ink/60">
          Mengunggah {uploadProgress.current}/{uploadProgress.total} file...
        </p>
        <div class="h-1.5 bg-ink/10 overflow-hidden">
          <div
            class="h-full bg-green transition-all duration-300"
            style="width:{(uploadProgress.current / uploadProgress.total) * 100}%"
          ></div>
        </div>
      </div>
    {/if}

    {#if error}
      <p class="text-sm text-red-500 font-medium">{error}</p>
    {/if}

    <div class="flex items-center gap-3">
      <button
        type="submit"
        disabled={loading}
        class="inline-flex items-center gap-2 bg-green text-white text-xs font-bold uppercase px-6 py-3.5 hover:bg-green/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {#if loading}
          <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Mengirim...
        {:else}
          Kirim Pengaduan
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 18L5 16.6 14.6 7H6V5h12v12h-2V8.4z"/></svg>
        {/if}
      </button>
      <p class="text-[11px] text-ink/40">Pengaduan bersifat anonim</p>
    </div>

    <div class="border-t border-ink/10 pt-4">
      <p class="text-xs text-ink/50">
        Sudah punya kode pengaduan?
        <a href="/check-progress" class="text-green font-semibold hover:underline">Pantau status di sini</a>
      </p>
    </div>
  </form>
{/if}
