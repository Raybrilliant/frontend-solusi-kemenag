<script>
    let { user } = $props();

    // Nama section
    let nama = $state(user?.nama ?? "");
    let namaLoading = $state(false);
    let namaSuccess = $state("");
    let namaError = $state("");

    // Password section
    let password = $state("");
    let confirmPassword = $state("");
    let showPassword = $state(false);
    let passLoading = $state(false);
    let passSuccess = $state("");
    let passError = $state("");

    async function saveNama() {
        if (!nama.trim()) { namaError = "Nama tidak boleh kosong."; return; }
        namaLoading = true; namaSuccess = ""; namaError = "";
        try {
            const res = await fetch("/api/admin/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nama: nama.trim() }),
            });
            const json = await res.json();
            if (json.success) {
                namaSuccess = "Nama berhasil diperbarui.";
            } else {
                namaError = json.message ?? "Gagal memperbarui nama.";
            }
        } catch {
            namaError = "Terjadi kesalahan jaringan.";
        } finally {
            namaLoading = false;
        }
    }

    async function savePassword() {
        passSuccess = ""; passError = "";
        if (password.length < 6) { passError = "Password minimal 6 karakter."; return; }
        if (password !== confirmPassword) { passError = "Konfirmasi password tidak cocok."; return; }
        passLoading = true;
        try {
            const res = await fetch("/api/admin/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const json = await res.json();
            if (json.success) {
                passSuccess = "Password berhasil diperbarui.";
                password = ""; confirmPassword = "";
            } else {
                passError = json.message ?? "Gagal memperbarui password.";
            }
        } catch {
            passError = "Terjadi kesalahan jaringan.";
        } finally {
            passLoading = false;
        }
    }
</script>

<div class="max-w-lg space-y-6">

    <!-- Nama -->
    <div class="border bg-white/60 p-6 space-y-4">
        <div class="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="text-green shrink-0">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
            <h2 class="text-base font-bold uppercase tracking-tight">Ubah Nama</h2>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Nama Lengkap
            </label>
            <input
                type="text"
                bind:value={nama}
                class="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition"
                placeholder="Masukkan nama lengkap"
            />
        </div>

        {#if namaError}
            <p class="text-xs text-red-500 font-medium">{namaError}</p>
        {/if}
        {#if namaSuccess}
            <p class="text-xs text-green font-medium">{namaSuccess}</p>
        {/if}

        <button
            onclick={saveNama}
            disabled={namaLoading}
            class="w-full bg-green text-white text-sm font-semibold py-2.5 hover:bg-green/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {namaLoading ? "Menyimpan..." : "Simpan Nama"}
        </button>
    </div>

    <!-- Password -->
    <div class="border bg-white/60 p-6 space-y-4">
        <div class="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="text-green shrink-0">
                <path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.4-3.1 3.1-3.1 1.7 0 3.1 1.4 3.1 3.1v2z"/>
            </svg>
            <h2 class="text-base font-bold uppercase tracking-tight">Ganti Password</h2>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Password Baru
            </label>
            <div class="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    bind:value={password}
                    class="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition pr-10"
                    placeholder="Minimal 6 karakter"
                />
                <button
                    type="button"
                    onclick={() => showPassword = !showPassword}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        {#if showPassword}
                            <path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z"/>
                        {:else}
                            <path d="M12 7c2.8 0 5 2.2 5 5 0 .6-.1 1.2-.3 1.8l2.9 2.9c1.5-1.3 2.7-3 3.4-4.7-1.7-4.4-6-7.5-11-7.5-1.4 0-2.7.2-4 .7l2.2 2.2C10.8 7.1 11.4 7 12 7zM2 4.3l2.3 2.3.5.5C3.1 8.4 1.8 10.1 1 12c1.7 4.4 6 7.5 11 7.5 1.6 0 3.1-.3 4.4-.8l.4.4 3 3 1.3-1.3L3.3 3 2 4.3zM7.5 9.8l1.6 1.6c0 .2-.1.4-.1.6 0 1.7 1.3 3 3 3 .2 0 .4 0 .6-.1l1.6 1.6c-.6.3-1.4.5-2.2.5-2.8 0-5-2.2-5-5 0-.8.2-1.6.5-2.2zm4.3-.8l3.2 3.2V12c0-1.7-1.3-3-3-3h-.2z"/>
                        {/if}
                    </svg>
                </button>
            </div>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Konfirmasi Password
            </label>
            <input
                type={showPassword ? "text" : "password"}
                bind:value={confirmPassword}
                class="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition"
                placeholder="Ulangi password baru"
            />
        </div>

        {#if passError}
            <p class="text-xs text-red-500 font-medium">{passError}</p>
        {/if}
        {#if passSuccess}
            <p class="text-xs text-green font-medium">{passSuccess}</p>
        {/if}

        <button
            onclick={savePassword}
            disabled={passLoading}
            class="w-full bg-green text-white text-sm font-semibold py-2.5 hover:bg-green/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {passLoading ? "Menyimpan..." : "Ganti Password"}
        </button>
    </div>

</div>
