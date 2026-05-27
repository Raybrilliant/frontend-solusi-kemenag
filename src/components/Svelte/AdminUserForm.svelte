<script lang="ts">
    let {
        mode = "tambah",
        userId = null,
        apiUrl = "/api/admin/user",
        apiKategori = "/api/admin/kategori",
    } = $props();

    // ── State ────────────────────────────────────────────
    let kategoriList = $state<any[]>([]);
    let nama = $state("");
    let nip = $state("");
    let password = $state("");
    let role = $state("operator");
    let categoryId = $state(0);
    let loading = $state(mode === "edit");
    let saving = $state(false);
    let toast = $state<{ type: string; msg: string } | null>(null);
    let fieldErrors = $state<Record<string, string>>({});

    // ── Load kategori & existing data ────────────────────
    $effect(() => {
        // Fetch kategori dropdown
        fetch(apiKategori)
            .then((r) => r.json())
            .then((res) => {
                kategoriList = Array.isArray(res) ? res : (res.data ?? []);
            });

        // Load existing data for edit mode
        if (mode === "edit" && userId) {
            fetch(`${apiUrl}/${userId}`)
                .then((r) => r.json())
                .then((res) => {
                    const item = res.data ?? res;
                    nama = item.nama ?? "";
                    nip = item.nip ?? "";
                    role = item.role ?? "operator";
                    categoryId = item.categoryId ?? 0;
                    loading = false;
                })
                .catch(() => {
                    toast = {
                        type: "error",
                        msg: "Gagal memuat data user.",
                    };
                    loading = false;
                });
        } else {
            loading = false;
        }
    });

    // ── Helpers ──────────────────────────────────────────
    function showToast(t: string, msg: string) {
        toast = { type: t, msg };
        setTimeout(() => (toast = null), 4000);
    }

    function validate(): boolean {
        const errors: Record<string, string> = {};
        if (!nama.trim()) errors.nama = "Nama wajib diisi.";
        if (!nip.trim()) errors.nip = "NIP wajib diisi.";
        else if (!/^\d{18}$/.test(nip.trim()))
            errors.nip = "NIP harus 18 digit angka.";
        if (mode === "tambah" && !password.trim())
            errors.password = "Password wajib diisi.";
        if (mode === "tambah" && password.trim().length < 6)
            errors.password = "Password minimal 6 karakter.";
        fieldErrors = errors;
        return Object.keys(errors).length === 0;
    }

    // ── Submit ───────────────────────────────────────────
    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!validate()) return;

        saving = true;
        try {
            const payload: Record<string, any> = {
                nama: nama.trim(),
                nip: nip.trim(),
                role,
            };
            if (password.trim()) {
                payload.password = password.trim();
            }
            if (categoryId > 0) {
                payload.categoryId = categoryId;
            }

            const isEdit = mode === "edit" && userId;
            const url = isEdit ? `${apiUrl}/${userId}` : apiUrl;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(
                    json.message ?? json.error ?? "Gagal menyimpan.",
                );
            }

            showToast(
                "success",
                isEdit
                    ? "User berhasil diperbarui."
                    : "User baru berhasil ditambahkan.",
            );

            if (!isEdit) {
                // Reset form after successful add
                nama = "";
                nip = "";
                password = "";
                role = "operator";
                categoryId = 0;
            }
        } catch (err) {
            showToast("error", (err as Error).message || "Terjadi kesalahan.");
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
            <!-- Nama -->
            <div>
                <label
                    class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                    >Nama Lengkap</label
                >
                <input
                    type="text"
                    placeholder="Contoh: Ahmad Fauzi"
                    bind:value={nama}
                    required
                    class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors {fieldErrors.nama
                        ? 'border-red-400 focus:ring-red-400'
                        : ''}"
                />
                {#if fieldErrors.nama}
                    <p class="text-[11px] text-red-500 mt-1">
                        {fieldErrors.nama}
                    </p>
                {/if}
            </div>

            <!-- NIP -->
            <div>
                <label
                    class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                    >NIP</label
                >
                <input
                    type="text"
                    placeholder="18 digit NIP"
                    bind:value={nip}
                    required
                    maxlength={18}
                    class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors {fieldErrors.nip
                        ? 'border-red-400 focus:ring-red-400'
                        : ''}"
                />
                {#if fieldErrors.nip}
                    <p class="text-[11px] text-red-500 mt-1">
                        {fieldErrors.nip}
                    </p>
                {/if}
            </div>

            <!-- Password -->
            <div>
                <label
                    class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                >
                    Password
                    {#if mode === "edit"}
                        <span class="font-normal normal-case text-ink/30"
                            >(kosongkan jika tidak diubah)</span
                        >
                    {/if}
                </label>
                <input
                    type="password"
                    placeholder={mode === "tambah"
                        ? "Minimal 6 karakter"
                        : "Biarkan kosong jika tidak diubah"}
                    bind:value={password}
                    class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors {fieldErrors.password
                        ? 'border-red-400 focus:ring-red-400'
                        : ''}"
                />
                {#if fieldErrors.password}
                    <p class="text-[11px] text-red-500 mt-1">
                        {fieldErrors.password}
                    </p>
                {/if}
            </div>

            <!-- Role + Kategori (2-col) -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >Role</label
                    >
                    <select
                        bind:value={role}
                        class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                    >
                        <option value="admin">Admin</option>
                        <option value="humas">Humas</option>
                        <option value="operator">Operator</option>
                        <option value="asn">ASN</option>
                    </select>
                </div>
                <div>
                    <label
                        class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                    >
                        Kategori Layanan
                        <span class="font-normal normal-case text-ink/30"
                            >(opsional)</span
                        >
                    </label>
                    <select
                        bind:value={categoryId}
                        class="w-full border bg-white/50 border-black/10 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                    >
                        <option value={0}>-- Semua Kategori --</option>
                        {#each kategoriList as kat (kat.id)}
                            <option value={kat.id}>{kat.title}</option>
                        {/each}
                    </select>
                    <p class="text-[10px] text-ink/30 mt-1">
                        Batasi akses user hanya pada kategori tertentu.
                    </p>
                </div>
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
                    {mode === "edit" ? "Simpan Perubahan" : "Tambah User"}
                {/if}
            </button>
            <a
                href="/admin/manajemenUser"
                class="px-5 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink border border-black/10 hover:bg-black/4 transition-colors"
            >
                Batal
            </a>
        </div>
    </form>
{/if}
