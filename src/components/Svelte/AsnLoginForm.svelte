<script lang="ts">
    // ── State ──────────────────────────────────────────────────────
    let nip = $state("");
    let password = $state("");
    let showPw = $state(false);
    let loading = $state(false);
    let error = $state("");

    // ── Submit ─────────────────────────────────────────────────────
    async function submit(e: SubmitEvent) {
        e.preventDefault();
        error = "";

        if (!nip.trim() || !password) {
            error = "NIP dan kata sandi wajib diisi.";
            return;
        }

        loading = true;
        try {
            const res = await fetch("/api/internal/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nip: nip.trim(), password }),
            });
            const json = await res.json();

            if (json.success && json.token) {
                // Cookie sudah di-set oleh server login API — langsung redirect
                const params = new URLSearchParams(window.location.search);
                const redirectTo = params.get("redirect") ?? "/internal";
                window.location.href = redirectTo;
            } else {
                error = json.message ?? "NIP atau kata sandi salah.";
            }
        } catch {
            error = "Tidak dapat terhubung ke server. Coba lagi.";
        } finally {
            loading = false;
        }
    }
</script>

<div class="mb-8">
    <h2 class="text-2xl font-extrabold text-ink leading-tight">
        Masuk ke Portal ASN
    </h2>
    <p class="text-[13px] text-ink/45 mt-1.5">
        Gunakan NIP dan kata sandi akun dinas Anda.
    </p>
</div>

<form onsubmit={submit} novalidate class="space-y-4">
    <div class="space-y-1.5">
        <label
            for="nip"
            class="block text-[11px] font-bold uppercase tracking-widest text-ink/45"
            >NIP</label
        >
        <input
            id="nip"
            type="text"
            inputmode="numeric"
            autocomplete="username"
            placeholder="18 digit NIP Anda"
            maxlength="18"
            bind:value={nip}
            disabled={loading}
            class="w-full border border-black/12 bg-white px-4 py-3 text-sm text-ink
            placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-green/30
            focus:border-green transition-colors disabled:opacity-50"
        />
    </div>

    <div class="space-y-1.5">
        <div class="flex items-center justify-between">
            <label
                for="password"
                class="block text-[11px] font-bold uppercase tracking-widest text-ink/45"
                >Kata Sandi</label
            >
            <a
                href="/lupa-sandi"
                class="text-[11px] font-semibold text-green hover:underline"
                >Lupa kata sandi?</a
            >
        </div>
        <div class="relative">
            <input
                id="password"
                type={showPw ? "text" : "password"}
                autocomplete="current-password"
                placeholder="••••••••"
                bind:value={password}
                disabled={loading}
                class="w-full border border-black/12 bg-white px-4 py-3 pr-11 text-sm text-ink
                placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-green/30
                focus:border-green transition-colors disabled:opacity-50"
            />
            <button
                type="button"
                aria-label={showPw
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"}
                onclick={() => (showPw = !showPw)}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors cursor-pointer"
            >
                {#if showPw}
                    <svg viewBox="0 0 24 24" class="w-4 h-4"
                        ><path
                            fill="currentColor"
                            d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3zm-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28l.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5c1.55 0 3.03-.3 4.38-.84l.43.42L19.73 22L21 20.73L3.27 3M12 7a5 5 0 0 1 5 5c0 .64-.13 1.26-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75c-1.73-4.39-6-7.5-11-7.5c-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7z"
                        /></svg
                    >
                {:else}
                    <svg viewBox="0 0 24 24" class="w-4 h-4"
                        ><path
                            fill="currentColor"
                            d="M12 9a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0 0 17.64 0a9.821 9.821 0 0 0-17.64 0"
                        /></svg
                    >
                {/if}
            </button>
        </div>
    </div>

    {#if error}
        <div
            class="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
        >
            <svg
                viewBox="0 0 24 24"
                class="w-4 h-4 text-red-500 shrink-0 mt-0.5"
            >
                <path
                    fill="currentColor"
                    d="M13 13h-2V7h2m0 10h-2v-2h2M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2z"
                />
            </svg>
            <p class="text-[12px] font-medium text-red-700 leading-snug">
                {error}
            </p>
        </div>
    {/if}

    <button
        type="submit"
        disabled={loading}
        class="w-full bg-green hover:bg-green/90 active:scale-[0.98] disabled:opacity-60
        disabled:cursor-not-allowed text-white font-bold text-sm py-3 px-4
        transition-all shadow-sm shadow-green/20 cursor-pointer mt-2
        flex items-center justify-center gap-2 mb-3"
    >
        {#if loading}
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                />
                <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
            </svg>
            <span>Memverifikasi...</span>
        {:else}
            <span>Masuk ke Portal</span>
            <svg viewBox="0 0 24 24" class="w-4 h-4"
                ><path fill="currentColor" d="M8 5v14l11-7z" /></svg
            >
        {/if}
    </button>
</form>

<!-- Back to homepage -->
<a href="/" class="text-sm text-ink/45 mt-1.5">
    <!-- back arrow icon -->
    <svg
        viewBox="0 0 24 24"
        class="w-3.5 h-3.5 inline-block -mt-0.5 mr-1"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
    </svg>
    Kembali ke halaman utama
</a>

<div class="mt-8 pt-6 border-t border-black/8 flex items-start gap-2.5">
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="w-4 h-4 text-ink/25 shrink-0 mt-0.5"
    >
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"
        />
    </svg>
    <p class="text-[11px] text-ink/35 leading-relaxed">
        Portal ini khusus untuk ASN Kemenag Kota Probolinggo. Masalah akses?
        Hubungi bagian kepegawaian.
    </p>
</div>
