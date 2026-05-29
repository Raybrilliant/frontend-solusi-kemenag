<script>
    import Icon from "@iconify/svelte";

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
        if (!nama.trim()) {
            namaError = "Nama tidak boleh kosong.";
            return;
        }
        namaLoading = true;
        namaSuccess = "";
        namaError = "";
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
        passSuccess = "";
        passError = "";
        if (password.length < 6) {
            passError = "Password minimal 6 karakter.";
            return;
        }
        if (password !== confirmPassword) {
            passError = "Konfirmasi password tidak cocok.";
            return;
        }
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
                password = "";
                confirmPassword = "";
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
            <Icon
                icon="mdi:account"
                width="18"
                height="18"
                class="text-green shrink-0"
            />
            <h2 class="text-base font-bold uppercase tracking-tight">
                Ubah Nama
            </h2>
        </div>

        <div>
            <label
                class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
            >
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
            <Icon
                icon="mdi:lock"
                width="18"
                height="18"
                class="text-green shrink-0"
            />
            <h2 class="text-base font-bold uppercase tracking-tight">
                Ganti Password
            </h2>
        </div>

        <div>
            <label
                class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
            >
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
                    onclick={() => (showPassword = !showPassword)}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    <Icon
                        icon={showPassword ? "mdi:eye" : "mdi:eye-off"}
                        width="16"
                        height="16"
                    />
                </button>
            </div>
        </div>

        <div>
            <label
                class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
            >
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
