<script lang="ts">
    import { untrack } from "svelte";
    import Icon from "@iconify/svelte";

    let {
        mode = "tambah",
        testimoniId = null,
        apiUrl = "/api/admin/testimoni",
    } = $props();

    // ── State ──────────────────────────────────────────────
    let url = $state("");
    let title = $state("");
    let username = $state("");
    let aktif = $state(true);
    let urutan = $state(0);
    let loading = $state(untrack(() => mode === "edit"));
    let saving = $state(false);
    let toast = $state<{ type: string; msg: string } | null>(null);
    let fieldErrors = $state<Record<string, string>>({});

    const isEdit = $derived(mode === "edit" && testimoniId);

    // ── Load existing data ─────────────────────────────────
    $effect(() => {
        if (isEdit && testimoniId) {
            fetch(`${apiUrl}/${testimoniId}`)
                .then((r) => r.json())
                .then((res) => {
                    const item = res.data ?? res;
                    url = item.url ?? "";
                    title = item.title ?? "";
                    username = item.username ?? "";
                    aktif = item.aktif ?? true;
                    urutan = item.urutan ?? 0;
                    loading = false;
                })
                .catch(() => {
                    toast = {
                        type: "error",
                        msg: "Gagal memuat data testimoni.",
                    };
                    loading = false;
                });
        } else {
            loading = false;
        }
    });

    // ── Helpers ────────────────────────────────────────────
    function showToast(t: string, msg: string) {
        toast = { type: t, msg };
        setTimeout(() => (toast = null), 4000);
    }

    function extractUsername(videoUrl: string): string {
        const m = videoUrl.match(
            /^https?:\/\/www\.tiktok\.com\/@([^\/]+)\/video\/\d+$/i,
        );
        return m ? m[1] : "";
    }

    function validate(): boolean {
        const errors: Record<string, string> = {};
        const trimmedUrl = url.trim();
        if (!trimmedUrl) errors.url = "URL TikTok wajib diisi.";
        else if (
            !/^https?:\/\/www\.tiktok\.com\/@[^\/]+\/video\/\d+$/i.test(
                trimmedUrl,
            )
        ) {
            errors.url =
                "URL TikTok tidak valid. Format: https://www.tiktok.com/@user/video/1234567890";
        }
        if (!title.trim()) errors.title = "Judul wajib diisi.";
        if (!username.trim()) errors.username = "Username wajib diisi.";
        fieldErrors = errors;
        return Object.keys(errors).length === 0;
    }

    function resetForm() {
        url = "";
        title = "";
        username = "";
        aktif = true;
        urutan = 0;
        fieldErrors = {};
    }

    function redirectToList() {
        window.location.href = "/admin/testimoni";
    }

    // ── Submit ─────────────────────────────────────────────
    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!validate()) return;

        saving = true;
        try {
            const payload: Record<string, any> = {
                url: url.trim(),
                title: title.trim(),
                username: username.trim(),
                aktif,
            };
            if (Number(urutan) > 0) {
                payload.urutan = Number(urutan);
            }

            const urlTarget = isEdit ? `${apiUrl}/${testimoniId}` : apiUrl;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(urlTarget, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? json.error ?? "Gagal menyimpan.",
                );
            }

            showToast(
                "success",
                isEdit
                    ? "Testimoni berhasil diperbarui."
                    : "Testimoni baru berhasil ditambahkan.",
            );

            if (!isEdit) {
                resetForm();
                setTimeout(redirectToList, 800);
            } else {
                setTimeout(redirectToList, 800);
            }
        } catch (err) {
            showToast("error", (err as Error).message || "Terjadi kesalahan.");
        } finally {
            saving = false;
        }
    }

    // ── Auto-fill username dari URL ────────────────────────
    function onUrlBlur() {
        const extracted = extractUsername(url.trim());
        if (extracted && !username.trim()) {
            username = extracted;
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
            <!-- URL TikTok -->
            <div>
                <label
                    for="url"
                    class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                    >URL TikTok</label
                >
                <input
                    id="url"
                    type="url"
                    placeholder="https://www.tiktok.com/@user/video/1234567890"
                    bind:value={url}
                    onblur={onUrlBlur}
                    required
                    class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors {fieldErrors.url
                        ? 'border-red-400 focus:ring-red-400'
                        : ''}"
                />
                {#if fieldErrors.url}
                    <p class="text-[11px] text-red-500 mt-1">
                        {fieldErrors.url}
                    </p>
                {/if}
                <p class="text-[10px] text-ink/30 mt-1">
                    Format yang didukung:
                    https://www.tiktok.com/@username/video/1234567890
                </p>
            </div>

            <!-- Title -->
            <div>
                <label
                    for="title"
                    class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                    >Judul / Keterangan</label
                >
                <input
                    id="title"
                    type="text"
                    placeholder="Contoh: Testimoni KUA Kademangan"
                    bind:value={title}
                    required
                    class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors {fieldErrors.title
                        ? 'border-red-400 focus:ring-red-400'
                        : ''}"
                />
                {#if fieldErrors.title}
                    <p class="text-[11px] text-red-500 mt-1">
                        {fieldErrors.title}
                    </p>
                {/if}
            </div>

            <!-- Username + Urutan -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label
                        for="username"
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >Username TikTok</label
                    >
                    <input
                        id="username"
                        type="text"
                        placeholder="username"
                        bind:value={username}
                        required
                        class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors {fieldErrors.username
                            ? 'border-red-400 focus:ring-red-400'
                            : ''}"
                    />
                    {#if fieldErrors.username}
                        <p class="text-[11px] text-red-500 mt-1">
                            {fieldErrors.username}
                        </p>
                    {/if}
                </div>
                <div>
                    <label
                        for="urutan"
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >Urutan Tampil</label
                    >
                    <input
                        id="urutan"
                        type="number"
                        bind:value={urutan}
                        min="0"
                        class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                    />
                    <p class="text-[10px] text-ink/30 mt-1">
                        Kosongkan untuk otomatis di akhir.
                    </p>
                </div>
            </div>

            <!-- Aktif -->
            <div class="flex items-start gap-3 pt-1">
                <input
                    id="aktif"
                    type="checkbox"
                    bind:checked={aktif}
                    class="mt-1 w-4 h-4 accent-green cursor-pointer"
                />
                <label
                    for="aktif"
                    class="text-sm text-ink/80 cursor-pointer select-none"
                >
                    <span class="font-semibold text-ink"
                        >Tampilkan di halaman publik</span
                    >
                    <span class="block text-[11px] text-ink/40"
                        >Testimoni yang aktif akan muncul di bagian TikTok
                        Videos homepage.</span
                    >
                </label>
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
                    {isEdit ? "Simpan Perubahan" : "Tambah Testimoni"}
                {/if}
            </button>
            {#if !isEdit}
                <button
                    type="button"
                    onclick={resetForm}
                    disabled={saving}
                    class="px-5 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink border border-black/10 hover:bg-black/4 transition-colors cursor-pointer"
                >
                    Reset
                </button>
            {/if}
            <a
                href="/admin/testimoni"
                class="px-5 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink border border-black/10 hover:bg-black/4 transition-colors"
            >
                Batal
            </a>
        </div>
    </form>
{/if}
