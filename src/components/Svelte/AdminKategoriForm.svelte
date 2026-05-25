<script>
    let {
        mode = "tambah",
        kategoriId = null,
        apiUrl = "/api/admin/kategori",
    } = $props();

    // ── State ────────────────────────────────────────────
    let icon = $state("");
    let title = $state("");
    let description = $state("");
    let loading = $state(mode === "edit");
    let saving = $state(false);
    let toast = $state(null);

    // ── Load existing data for edit mode ─────────────────
    $effect(() => {
        if (mode === "edit" && kategoriId) {
            fetch(`${apiUrl}/${kategoriId}`)
                .then((r) => r.json())
                .then((res) => {
                    const item = res.data ?? res;
                    icon = item.icon ?? "";
                    title = item.title ?? "";
                    description = item.description ?? "";
                    loading = false;
                })
                .catch(() => {
                    toast = {
                        type: "error",
                        msg: "Gagal memuat data kategori.",
                    };
                    loading = false;
                });
        }
    });

    // ── Helpers ──────────────────────────────────────────
    function iconUrl(name) {
        if (!name) return "";
        const [prefix, ico] = name.split(":");
        return `https://api.iconify.design/${prefix}/${ico}.svg`;
    }

    function showToast(type, msg) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 4000);
    }

    // ── Submit ───────────────────────────────────────────
    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim()) {
            showToast("error", "Judul kategori wajib diisi.");
            return;
        }

        saving = true;
        try {
            const payload = {
                icon: icon.trim(),
                title: title.trim(),
                description: description.trim(),
            };
            const isEdit = mode === "edit" && kategoriId;
            const url = isEdit ? `${apiUrl}/${kategoriId}` : apiUrl;
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
                    ? "Kategori berhasil diperbarui."
                    : "Kategori baru berhasil ditambahkan.",
            );

            if (!isEdit) {
                // Reset form after successful add
                icon = "";
                title = "";
                description = "";
            }
        } catch (err) {
            showToast("error", err.message || "Terjadi kesalahan.");
        } finally {
            saving = false;
        }
    }
</script>

<!-- ── Toast ──────────────────────────────────────────── -->
{#if toast}
    <div
        class="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm rounded
    {toast.type === 'success'
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
    <!-- ── Form ────────────────────────────────────────── -->
    <form
        onsubmit={handleSubmit}
        class="bg-white border border-green/8 p-6 md:p-8 max-w-2xl"
    >
        <div class="space-y-5">
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
                            <svg viewBox="0 0 24 24" class="w-5 h-5 text-ink/20"
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
                            placeholder="mdi:account"
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
                    >Judul Kategori</label
                >
                <input
                    type="text"
                    placeholder="Contoh: Layanan Haji dan Umrah"
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
                    placeholder="Deskripsi singkat tentang kategori layanan ini..."
                    bind:value={description}
                    class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors resize-none"
                ></textarea>
            </div>
        </div>

        <!-- ── Actions ──────────────────────────────────── -->
        <div class="flex items-center gap-3 mt-8 pt-6 border-t border-black/5">
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
                    {mode === "edit" ? "Simpan Perubahan" : "Tambah Kategori"}
                {/if}
            </button>
            <a
                href="/admin/kategori"
                class="px-5 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink border border-black/10 hover:bg-black/4 transition-colors"
            >
                Batal
            </a>
        </div>
    </form>
{/if}
