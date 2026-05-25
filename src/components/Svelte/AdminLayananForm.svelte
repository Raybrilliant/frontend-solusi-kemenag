<script>
    let {
        mode = "tambah",
        layananId = null,
        apiUrl = "/api/admin/layanan",
        apiKategori = "/api/admin/kategori",
        apiPersyaratan = "/api/admin/persyaratan",
    } = $props();

    // ── State (form) ────────────────────────────────────
    let kategoriList = $state([]);
    let icon = $state("");
    let title = $state("");
    let description = $state("");
    let categoryId = $state(0);
    let slaDuration = $state(0);
    let slaUnit = $state("menit");
    let cost = $state("Gratis");
    let type = $state("Online");
    let externalLink = $state("");
    let loading = $state(true);
    let saving = $state(false);
    let toast = $state(null);

    // ── State (persyaratan) ─────────────────────────────
    let persyaratanList = $state([]);
    let persyaratanLoading = $state(false);
    let newSyaratLabel = $state("");
    let newSyaratDescription = $state("");
    let newSyaratRequired = $state(true);

    // ── State (edit persyaratan) ────────────────────────
    let editingId = $state(null);
    let editLabel = $state("");
    let editDescription = $state("");
    let editRequired = $state(false);

    const isEdit = $derived(mode === "edit" && layananId);

    // ── Load kategori & existing data ────────────────────
    $effect(() => {
        fetch(apiKategori)
            .then((r) => r.json())
            .then((res) => {
                kategoriList = Array.isArray(res) ? res : (res.data ?? []);
            });

        if (isEdit) {
            // Load layanan data
            fetch(`${apiUrl}/${layananId}`)
                .then((r) => r.json())
                .then((res) => {
                    const item = res.data ?? res;
                    icon = item.icon ?? "";
                    title = item.title ?? "";
                    description = item.description ?? "";
                    categoryId = item.categoryId ?? 0;
                    slaDuration = item.slaDuration ?? 0;
                    slaUnit = item.slaUnit ?? "menit";
                    cost = item.cost ?? "Gratis";
                    type = item.type ?? "Online";
                    externalLink = item.externalLink ?? "";
                    loading = false;
                })
                .catch(() => {
                    toast = {
                        type: "error",
                        msg: "Gagal memuat data layanan.",
                    };
                    loading = false;
                });

            // Load persyaratan
            loadPersyaratan();
        } else {
            loading = false;
        }
    });

    async function loadPersyaratan() {
        if (!layananId) return;
        persyaratanLoading = true;
        try {
            const res = await fetch(`${apiPersyaratan}?layananId=${layananId}`);
            const json = await res.json();
            persyaratanList = Array.isArray(json) ? json : (json.data ?? []);
        } catch {
            // silent
        } finally {
            persyaratanLoading = false;
        }
    }

    // ── Helpers ──────────────────────────────────────────
    function iconUrl(name) {
        if (!name) return "";
        const [prefix, ico] = name.split(":");
        return `https://api.iconify.design/${prefix}/${ico}.svg`;
    }

    function showToast(t, msg) {
        toast = { type: t, msg };
        setTimeout(() => (toast = null), 4000);
    }

    // ── Submit layanan ───────────────────────────────────
    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim()) {
            showToast("error", "Judul layanan wajib diisi.");
            return;
        }
        if (!categoryId) {
            showToast("error", "Pilih kategori layanan terlebih dahulu.");
            return;
        }

        saving = true;
        try {
            const payload = {
                icon: icon.trim(),
                title: title.trim(),
                description: description.trim(),
                categoryId: Number(categoryId),
                slaDuration: Number(slaDuration) || 0,
                slaUnit,
                cost: cost.trim() || "Gratis",
                type,
                ...(type === "External" && {
                    externalLink: externalLink.trim(),
                }),
            };
            const url = isEdit ? `${apiUrl}/${layananId}` : apiUrl;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || json.success === false)
                throw new Error(
                    json.message ?? json.error ?? "Gagal menyimpan.",
                );

            showToast(
                "success",
                isEdit
                    ? "Layanan berhasil diperbarui."
                    : "Layanan baru berhasil ditambahkan.",
            );

            if (!isEdit) {
                icon = "";
                title = "";
                description = "";
                categoryId = 0;
                slaDuration = 0;
                slaUnit = "menit";
                cost = "Gratis";
                type = "Online";
                externalLink = "";
            }
        } catch (err) {
            showToast("error", err.message || "Terjadi kesalahan.");
        } finally {
            saving = false;
        }
    }

    // ── Persyaratan CRUD ────────────────────────────────
    async function addPersyaratan() {
        const label = newSyaratLabel.trim();
        if (!label) {
            showToast("error", "Nama persyaratan wajib diisi.");
            return;
        }
        try {
            const res = await fetch(apiPersyaratan, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    layananId: Number(layananId),
                    label,
                    description: newSyaratDescription.trim(),
                    required: newSyaratRequired,
                }),
            });
            const json = await res.json();
            if (!res.ok || json.success === false)
                throw new Error(json.message ?? "Gagal menambah persyaratan.");

            newSyaratLabel = "";
            newSyaratDescription = "";
            newSyaratRequired = true;
            await loadPersyaratan();
            showToast("success", "Persyaratan berhasil ditambahkan.");
        } catch (err) {
            showToast("error", err.message || "Terjadi kesalahan.");
        }
    }

    async function deletePersyaratan(id) {
        if (!confirm("Hapus persyaratan ini?")) return;
        try {
            await fetch(`${apiPersyaratan}/${id}`, { method: "DELETE" });
            persyaratanList = persyaratanList.filter((p) => p.id !== id);
            showToast("success", "Persyaratan berhasil dihapus.");
        } catch {
            showToast("error", "Gagal menghapus persyaratan.");
        }
    }

    function startEdit(syarat) {
        editingId = syarat.id;
        editLabel = syarat.label;
        editDescription = syarat.description ?? "";
        editRequired = syarat.required;
    }

    function cancelEdit() {
        editingId = null;
    }

    async function updatePersyaratan(id) {
        if (!editLabel.trim()) {
            showToast("error", "Nama persyaratan wajib diisi.");
            return;
        }
        try {
            const res = await fetch(`${apiPersyaratan}/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label: editLabel.trim(),
                    description: editDescription.trim(),
                    required: editRequired,
                }),
            });
            const json = await res.json();
            if (!res.ok || json.success === false)
                throw new Error(json.message ?? "Gagal memperbarui.");
            persyaratanList = persyaratanList.map((p) =>
                p.id === id ? { ...p, label: editLabel.trim(), description: editDescription.trim(), required: editRequired } : p
            );
            editingId = null;
            showToast("success", "Persyaratan berhasil diperbarui.");
        } catch (err) {
            showToast("error", err.message || "Terjadi kesalahan.");
        }
    }
</script>

<!-- ── Toast ──────────────────────────────────────────── -->
{#if toast}
    <div
        class="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm rounded {toast.type ===
        'success'
            ? 'bg-green text-white'
            : 'bg-red-600 text-white'}"
    >
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="shrink-0"
        >
            {#if toast.type === "success"}
                <path
                    d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                />
            {:else}
                <path
                    d="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10-4.48 10-10S17.52,2 12,2zm1,15h-2v-2h2v2zm0-4h-2V7h2v6z"
                />
            {/if}
        </svg>
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
                ><path
                    d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12z"
                /></svg
            >
        </button>
    </div>
{/if}

<!-- ── Loading ────────────────────────────────────────── -->
{#if loading}
    <div class="flex items-center justify-center py-20">
        <div
            class="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin"
        ></div>
    </div>
{:else}
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <!-- ════════════════════════════════════════════════
             LEFT COL — Form layanan (3/5)
        ════════════════════════════════════════════════════ -->
        <form
            onsubmit={handleSubmit}
            class="lg:col-span-3 bg-white rounded border border-green/8 p-6 md:p-8"
        >
            <div class="space-y-5">
                <!-- Kategori (related) -->
                <div>
                    <label
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >Kategori</label
                    >
                    <select
                        bind:value={categoryId}
                        class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                    >
                        <option value={0}>-- Pilih Kategori --</option>
                        {#each kategoriList as kat (kat.id)}
                            <option value={kat.id}>{kat.title}</option>
                        {/each}
                    </select>
                </div>

                <!-- Icon -->
                <div>
                    <label
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >Ikon</label
                    >
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-xl border border-black/10 bg-cream flex items-center justify-center shrink-0"
                        >
                            {#if icon.trim()}
                                <img
                                    src={iconUrl(icon.trim())}
                                    alt={icon}
                                    class="w-6 h-6 object-contain"
                                />
                            {:else}
                                <svg
                                    viewBox="0 0 24 24"
                                    class="w-5 h-5 text-ink/20"
                                    ><path
                                        fill="currentColor"
                                        d="M4 5h13v7h2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9v-2H4zm16 3l-3.5 4.5L14 9.5L10 15H4l6-8z"
                                    /></svg
                                >
                            {/if}
                        </div>
                        <div class="flex-1">
                            <input
                                type="text"
                                placeholder="mdi:bus"
                                bind:value={icon}
                                class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors font-mono"
                            />
                            <p class="text-[10px] text-ink/30 mt-1">
                                Format: <code>mdi:nama-ikon</code>. Lihat di
                                <a
                                    href="https://icon-sets.iconify.design/mdi/"
                                    target="_blank"
                                    class="text-green hover:underline"
                                    >Iconify MDI</a
                                >.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Title -->
                <div>
                    <label
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >Judul Layanan</label
                    >
                    <input
                        type="text"
                        placeholder="Contoh: Pendaftaran Haji Reguler"
                        bind:value={title}
                        required
                        class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                    />
                </div>

                <!-- Description -->
                <div>
                    <label
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >Deskripsi</label
                    >
                    <textarea
                        rows="3"
                        placeholder="Deskripsi singkat tentang layanan ini..."
                        bind:value={description}
                        class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors resize-none"
                    ></textarea>
                </div>

                <!-- SLA (durasi + unit) + Biaya + Tipe (3-col) -->
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                            >SLA (Durasi)</label
                        >
                        <input
                            type="number"
                            min="1"
                            placeholder="30"
                            bind:value={slaDuration}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                            >Satuan Waktu</label
                        >
                        <select
                            bind:value={slaUnit}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        >
                            <option value="menit">Menit</option>
                            <option value="jam">Jam</option>
                            <option value="hari">Hari</option>
                        </select>
                    </div>
                    <div>
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                            >Biaya</label
                        >
                        <input
                            type="text"
                            placeholder="Gratis"
                            bind:value={cost}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                            >Tipe</label
                        >
                        <select
                            bind:value={type}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        >
                            <option value="Online">Online</option>
                            <option value="External">External</option>
                            <option value="Offline">Offline</option>
                        </select>
                    </div>
                </div>

                {#if type === "External"}
                    <div>
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                            >Link Layanan Eksternal <span class="text-red-400">*</span></label
                        >
                        <input
                            type="url"
                            placeholder="https://..."
                            bind:value={externalLink}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors font-mono"
                        />
                        <p class="text-[10px] text-ink/30 mt-1">
                            URL tujuan saat pengguna menekan tombol "Akses Layanan" di halaman publik.
                        </p>
                    </div>
                {/if}
            </div>

            <!-- ── Actions ──────────────────────────────── -->
            <div
                class="flex items-center gap-3 mt-8 pt-6 border-t border-black/5"
            >
                <button
                    type="submit"
                    disabled={saving}
                    class="flex items-center gap-2 px-5 py-2.5 bg-green text-white text-sm font-semibold hover:bg-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    {#if saving}
                        <div
                            class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                        ></div>
                        Menyimpan...
                    {:else}
                        <svg viewBox="0 0 24 24" class="w-4 h-4"
                            ><path
                                fill="currentColor"
                                d="M15 9H5V5h10m-3 14a3 3 0 0 1-3-3a3 3 0 0 1 3-3a3 3 0 0 1 3 3a3 3 0 0 1-3 3m5-16H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7z"
                            /></svg
                        >
                        {mode === "edit"
                            ? "Simpan Perubahan"
                            : "Tambah Layanan"}
                    {/if}
                </button>
                <a
                    href="/admin/layanan"
                    class="px-5 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink border border-black/10 hover:bg-black/4 transition-colors"
                >
                    Batal
                </a>
            </div>
        </form>

        <!-- ════════════════════════════════════════════════
             RIGHT COL — Persyaratan card (2/5)
        ════════════════════════════════════════════════════ -->
        <div class="lg:col-span-2">
            <div class="bg-white rounded border border-green/8 p-6 md:p-8">
                <div class="flex items-center gap-2 mb-5">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 text-ink/40"
                        ><path
                            fill="currentColor"
                            d="M10 4h4v4h-4zM4 16h4v4H4zm0-8h4v4H4zm12 0h4v4h-4zm-6 4h4v4h-4zm6 4h4v4h-4z"
                        /></svg
                    >
                    <h3
                        class="text-sm font-bold text-ink uppercase tracking-tight"
                    >
                        Persyaratan
                    </h3>
                    {#if persyaratanLoading}
                        <div
                            class="w-4 h-4 border-2 border-green border-t-transparent rounded-full animate-spin ml-auto"
                        ></div>
                    {/if}
                </div>

                {#if !isEdit}
                    <!-- Tambah mode — belum ada layananId -->
                    <div
                        class="flex flex-col items-center justify-center py-10 text-center"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            class="w-10 h-10 text-ink/15 mb-3"
                            ><path
                                fill="currentColor"
                                d="M17 12h-5v5h-2v-5H5v-2h5V5h2v5h5m-5-10A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2z"
                            /></svg
                        >
                        <p
                            class="text-xs text-ink/35 leading-relaxed max-w-[200px]"
                        >
                            Simpan layanan terlebih dahulu untuk menambahkan
                            persyaratan.
                        </p>
                    </div>
                {:else}
                    <!-- Daftar persyaratan -->
                    {#if persyaratanList.length > 0}
                        <ul class="space-y-2 mb-5">
                            {#each persyaratanList as syarat (syarat.id)}
                                <li class="border border-black/5 overflow-hidden">
                                    {#if editingId === syarat.id}
                                        <!-- Inline edit mode -->
                                        <div class="px-3 py-3 bg-green/3 space-y-2">
                                            <input
                                                type="text"
                                                bind:value={editLabel}
                                                placeholder="Nama dokumen"
                                                class="w-full border border-black/10 bg-white rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1"
                                            />
                                            <input
                                                type="text"
                                                bind:value={editDescription}
                                                placeholder="Deskripsi atau link (opsional)"
                                                class="w-full border border-black/10 bg-white rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1"
                                            />
                                            <div class="flex items-center gap-2">
                                                <label class="flex items-center gap-1.5 cursor-pointer text-xs text-ink/60">
                                                    <input type="checkbox" bind:checked={editRequired} class="accent-green" />
                                                    Wajib
                                                </label>
                                                <div class="ml-auto flex gap-1.5">
                                                    <button
                                                        onclick={cancelEdit}
                                                        class="px-3 py-1.5 text-xs font-semibold text-ink/50 border border-black/10 hover:bg-ink/5 transition-colors cursor-pointer"
                                                    >Batal</button>
                                                    <button
                                                        onclick={() => updatePersyaratan(syarat.id)}
                                                        class="px-3 py-1.5 text-xs font-semibold bg-green text-white hover:bg-green/90 transition-colors cursor-pointer"
                                                    >Simpan</button>
                                                </div>
                                            </div>
                                        </div>
                                    {:else}
                                        <!-- Display mode -->
                                        <div class="flex items-center gap-3 px-3 py-2.5 bg-ink/[0.025]">
                                            <div class="w-6 h-6 rounded-full bg-green/10 flex items-center justify-center shrink-0">
                                                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 text-green"
                                                    ><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z" /></svg>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-medium text-ink leading-tight truncate">{syarat.label}</p>
                                                {#if syarat.description}
                                                    <p class="text-[10px] text-ink/40 mt-0.5 truncate">{syarat.description}</p>
                                                {/if}
                                            </div>
                                            {#if syarat.required}
                                                <span class="shrink-0 text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Wajib</span>
                                            {:else}
                                                <span class="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink/30 bg-ink/5 px-2 py-0.5 rounded-full">Opsional</span>
                                            {/if}
                                            <button
                                                onclick={() => startEdit(syarat)}
                                                class="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-ink/10 text-ink/25 hover:text-ink/60 transition-colors shrink-0 cursor-pointer"
                                                aria-label="Edit persyaratan"
                                            >
                                                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5"
                                                    ><path fill="currentColor" d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83l3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75z" /></svg>
                                            </button>
                                            <button
                                                onclick={() => deletePersyaratan(syarat.id)}
                                                class="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-ink/25 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                                                aria-label="Hapus persyaratan"
                                            >
                                                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5"
                                                    ><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z" /></svg>
                                            </button>
                                        </div>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {:else if !persyaratanLoading}
                        <div
                            class="flex flex-col items-center justify-center py-8 text-center"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                class="w-8 h-8 text-ink/15 mb-2"
                                ><path
                                    fill="currentColor"
                                    d="M19 3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2m-7 3c1.09 0 2 .91 2 2s-.91 2-2 2s-2-.91-2-2s.91-2 2-2m4 10H8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z"
                                /></svg
                            >
                            <p class="text-xs text-ink/35">
                                Belum ada persyaratan.
                            </p>
                        </div>
                    {/if}

                    <!-- Form tambah persyaratan -->
                    <div class="pt-4 border-t border-black/5 space-y-2">
                        <label
                            class="block text-[10px] font-bold text-ink/40 uppercase tracking-wider"
                            >Tambah Persyaratan</label
                        >
                        <input
                            type="text"
                            placeholder="Nama dokumen, contoh: Fotokopi KTP"
                            bind:value={newSyaratLabel}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        />
                        <input
                            type="text"
                            placeholder="Deskripsi atau link (opsional), contoh: https://..."
                            bind:value={newSyaratDescription}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        />
                        <div class="flex items-center gap-2">
                            <label
                                class="flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                                <input
                                    type="checkbox"
                                    bind:checked={newSyaratRequired}
                                    class="checkbox checkbox-sm accent-green"
                                />
                                <span
                                    class="text-[10px] font-semibold text-ink/40 uppercase tracking-wider"
                                    >Wajib</span
                                >
                            </label>
                            <button
                                onclick={addPersyaratan}
                                class="ml-auto flex items-center gap-1 px-3 py-2 bg-green text-white text-xs font-semibold hover:bg-green/90 transition-colors cursor-pointer shrink-0"
                            >
                                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5"
                                    ><path
                                        fill="currentColor"
                                        d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"
                                    /></svg
                                >
                                Tambah
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
