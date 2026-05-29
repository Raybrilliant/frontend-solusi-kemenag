<script>
    import Icon from "@iconify/svelte";

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
                    <Icon icon="mdi:content-save" class="w-4 h-4" />
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
