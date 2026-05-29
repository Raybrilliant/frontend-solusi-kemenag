<script lang="ts">
    import Icon from "@iconify/svelte";
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
                    <Icon icon="mdi:eye-off" class="w-4 h-4" />
                {:else}
                    <Icon icon="mdi:eye" class="w-4 h-4" />
                {/if}
            </button>
        </div>
    </div>

    {#if error}
        <div
            class="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
        >
<Icon icon="mdi:alert-circle" class="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
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
<Icon icon="mdi:loading" class="w-4 h-4 animate-spin" />
            <span>Memverifikasi...</span>
        {:else}
            <span>Masuk ke Portal</span>
<Icon icon="mdi:play" class="w-4 h-4" />
        {/if}
    </button>
</form>

<!-- Back to homepage -->
<a href="/" class="text-sm text-ink/45 mt-1.5">
    <!-- back arrow icon -->
<Icon icon="mdi:arrow-left" class="w-3.5 h-3.5 inline-block -mt-0.5 mr-1" />
    Kembali ke halaman utama
</a>

<div class="mt-8 pt-6 border-t border-black/8 flex items-start gap-2.5">
<Icon icon="mdi:lock-outline" class="w-4 h-4 text-ink/25 shrink-0 mt-0.5" />
    <p class="text-[11px] text-ink/35 leading-relaxed">
        Portal ini khusus untuk ASN Kemenag Kota Probolinggo. Masalah akses?
        Hubungi bagian kepegawaian.
    </p>
</div>
