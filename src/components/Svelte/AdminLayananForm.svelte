<script>
    import Icon from "@iconify/svelte";

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
                p.id === id
                    ? {
                          ...p,
                          label: editLabel.trim(),
                          description: editDescription.trim(),
                          required: editRequired,
                      }
                    : p,
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
        <Icon
            icon={toast.type === "success" ? "mdi:check" : "mdi:alert-circle"}
            width="18"
            height="18"
            class="shrink-0"
        />
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
            <Icon icon="mdi:close" width="16" height="16" />
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
                                <Icon
                                    icon={icon.trim()}
                                    class="w-6 h-6 object-contain"
                                />
                            {:else}
                                <Icon
                                    icon="mdi:image-outline"
                                    class="w-5 h-5 text-ink/20"
                                />
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
                            >Link Layanan Eksternal <span class="text-red-400"
                                >*</span
                            ></label
                        >
                        <input
                            type="url"
                            placeholder="https://..."
                            bind:value={externalLink}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors font-mono"
                        />
                        <p class="text-[10px] text-ink/30 mt-1">
                            URL tujuan saat pengguna menekan tombol "Akses
                            Layanan" di halaman publik.
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
                        <Icon icon="mdi:content-save" class="w-4 h-4" />
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
                    <Icon icon="mdi:view-grid" class="w-5 h-5 text-ink/40" />
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
                        <Icon
                            icon="mdi:plus-circle-outline"
                            class="w-10 h-10 text-ink/15 mb-3"
                        />
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
                                <li
                                    class="border border-black/5 overflow-hidden"
                                >
                                    {#if editingId === syarat.id}
                                        <!-- Inline edit mode -->
                                        <div
                                            class="px-3 py-3 bg-green/3 space-y-2"
                                        >
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
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <label
                                                    class="flex items-center gap-1.5 cursor-pointer text-xs text-ink/60"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        bind:checked={
                                                            editRequired
                                                        }
                                                        class="accent-green"
                                                    />
                                                    Wajib
                                                </label>
                                                <div
                                                    class="ml-auto flex gap-1.5"
                                                >
                                                    <button
                                                        onclick={cancelEdit}
                                                        class="px-3 py-1.5 text-xs font-semibold text-ink/50 border border-black/10 hover:bg-ink/5 transition-colors cursor-pointer"
                                                        >Batal</button
                                                    >
                                                    <button
                                                        onclick={() =>
                                                            updatePersyaratan(
                                                                syarat.id,
                                                            )}
                                                        class="px-3 py-1.5 text-xs font-semibold bg-green text-white hover:bg-green/90 transition-colors cursor-pointer"
                                                        >Simpan</button
                                                    >
                                                </div>
                                            </div>
                                        </div>
                                    {:else}
                                        <!-- Display mode -->
                                        <div
                                            class="flex items-center gap-3 px-3 py-2.5 bg-ink/[0.025]"
                                        >
                                            <div
                                                class="w-6 h-6 rounded-full bg-green/10 flex items-center justify-center shrink-0"
                                            >
                                                <Icon
                                                    icon="mdi:check"
                                                    class="w-3.5 h-3.5 text-green"
                                                />
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p
                                                    class="text-sm font-medium text-ink leading-tight truncate"
                                                >
                                                    {syarat.label}
                                                </p>
                                                {#if syarat.description}
                                                    <p
                                                        class="text-[10px] text-ink/40 mt-0.5 truncate"
                                                    >
                                                        {syarat.description}
                                                    </p>
                                                {/if}
                                            </div>
                                            {#if syarat.required}
                                                <span
                                                    class="shrink-0 text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded-full"
                                                    >Wajib</span
                                                >
                                            {:else}
                                                <span
                                                    class="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink/30 bg-ink/5 px-2 py-0.5 rounded-full"
                                                    >Opsional</span
                                                >
                                            {/if}
                                            <button
                                                onclick={() =>
                                                    startEdit(syarat)}
                                                class="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-ink/10 text-ink/25 hover:text-ink/60 transition-colors shrink-0 cursor-pointer"
                                                aria-label="Edit persyaratan"
                                            >
                                                <Icon
                                                    icon="mdi:pencil"
                                                    class="w-3.5 h-3.5"
                                                />
                                            </button>
                                            <button
                                                onclick={() =>
                                                    deletePersyaratan(
                                                        syarat.id,
                                                    )}
                                                class="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-ink/25 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                                                aria-label="Hapus persyaratan"
                                            >
                                                <Icon
                                                    icon="mdi:delete"
                                                    class="w-3.5 h-3.5"
                                                />
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
                            <Icon
                                icon="mdi:card-account-details-outline"
                                class="w-8 h-8 text-ink/15 mb-2"
                            />
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
                                <Icon icon="mdi:plus" class="w-3.5 h-3.5" />
                                Tambah
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
