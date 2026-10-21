<script lang="ts">
    let { apiUrl = "/api/ppid/permohonan" } = $props();

    let total = $state<number | null>(null);

    // ── Statistik realtime ──
    async function loadTotal() {
        try {
            const res = await fetch(`${apiUrl}?page=1&limit=1`);
            if (!res.ok) return;
            const json = await res.json();
            total = json?.pagination?.total ?? null;
        } catch {
            // biarkan nilai terakhir
        }
    }

    $effect(() => {
        loadTotal();
        const t = setInterval(loadTotal, 15000);
        return () => clearInterval(t);
    });
</script>

<section
    id="hero-section"
    class="ppid-hero -mx-4 sm:-mx-8 md:-mx-14 lg:-mx-20 relative overflow-hidden flex flex-col"
>
    <!-- Latar: dot grid + glow hijau (bahasa hero portal) -->
    <div class="hero-dots absolute inset-0 pointer-events-none"></div>
    <div
        class="absolute -bottom-44 -left-44 w-[500px] h-[500px] bg-green/10 rounded-full blur-3xl pointer-events-none"
    ></div>
    <div
        class="absolute -top-24 right-[12%] w-96 h-96 bg-green/8 rounded-full blur-3xl pointer-events-none"
    ></div>

    <div
        class="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-8 md:px-14 lg:px-20 pt-12 pb-14 w-full"
    >
        <!-- Kicker -->
        <p
            class="hero-in flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45"
            style="animation-delay: 0.05s;"
        >
            <span class="w-2.5 h-2.5 bg-green shrink-0"></span>
            Kementerian Agama Kota Probolinggo
        </p>

        <!-- BIG TEXT — brutalis, statis, tanpa interaksi -->
        <h1
            class="hero-rise hero-display text-cream select-none mt-4 sm:mt-6"
            >PPID<span class="text-yellow">.</span></h1
        >

        <!-- Garis brutalis: segmen kuning tebal + hairline -->
        <div
            class="hero-in mt-6 sm:mt-8 flex items-center gap-3"
            style="animation-delay: 0.28s;"
        >
            <div class="h-[3px] bg-yellow w-24 shrink-0"></div>
            <div class="h-px bg-white/15 flex-1"></div>
        </div>

        <!-- Tagline -->
        <p
            class="hero-in mt-5 sm:mt-6 text-xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight leading-[1.08] max-w-4xl"
            style="animation-delay: 0.4s;"
        >
            <span class="text-white/90">Pejabat Pengelola</span>
            <span class="text-white/45">Informasi dan Dokumentasi</span>
        </p>

        <p
            class="hero-in mt-4 sm:mt-5 text-sm sm:text-base text-white/50 leading-relaxed max-w-xl"
            style="animation-delay: 0.52s;"
        >
            Pintu utama keterbukaan informasi publik: ajukan permohonan data,
            telusuri arsip regulasi, dan pantau setiap permohonan secara
            terbuka.
        </p>

        <!-- Aksi + statistik live -->
        <div
            class="hero-in mt-8 sm:mt-10 flex flex-wrap items-center gap-x-7 gap-y-4"
            style="animation-delay: 0.64s;"
        >
            <a
                href="#form-permohonan"
                class="inline-flex items-center gap-2 bg-green text-white px-6 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-yellow hover:text-ink transition-colors"
            >
                Ajukan Permohonan Data
                <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        d="M5 12h12.17l-4.88 4.88L13.7 18.3 20 12l-6.3-6.3-1.41 1.41L17.17 12H5v0z"
                    />
                </svg>
            </a>
            <a
                href="/check-progress"
                class="inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white transition-colors"
            >
                Cek Status Permohonan
                <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path d="M8.4 18 7 16.6 16.6 7H9V5h12v12h-2V8.4z" />
                </svg>
            </a>
            <span
                class="inline-flex items-center gap-2 text-xs font-semibold text-white/45 tabular-nums"
            >
                <span class="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></span>
                <span class="text-green font-bold">{total ?? "—"}</span>
                permohonan diterima · update realtime
            </span>
        </div>
    </div>

    <!-- Petunjuk gulir -->
    <a
        href="#tentang-ppid"
        class="hero-in relative z-10 self-center pb-6 flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors"
        style="animation-delay: 0.78s;"
    >
        <span class="text-[10px] font-bold uppercase tracking-[0.2em]"
            >Gulir</span
        >
        <svg
            class="bounce-arrow"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 16l-6-6h12z" />
        </svg>
    </a>
</section>

<style>
    .ppid-hero {
        background-color: #0a1a0c;
        min-height: calc(100svh - 72px);
    }
    @media (min-width: 1024px) {
        .ppid-hero {
            min-height: calc(100svh - 92px);
        }
    }

    /* Dot grid, sama dengan hero portal */
    .hero-dots {
        background-image: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.14) 1px,
            transparent 1px
        );
        background-size: 28px 28px;
        -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent);
        mask-image: linear-gradient(to bottom, black 55%, transparent);
    }

    /* BIG TEXT brutalis: penuh lebar, rapat, tanpa efek */
    .hero-display {
        font-size: clamp(5.5rem, 26vw, 21rem);
        font-weight: 900;
        line-height: 0.8;
        letter-spacing: -0.05em;
    }

    /* Petunjuk gulir memantul */
    .bounce-arrow {
        animation: bounce-y 1.6s ease-in-out infinite;
    }
    @keyframes bounce-y {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(6px);
        }
    }

    /* ── Entrance ── */
    .hero-in {
        opacity: 0;
        animation: hero-in-keyframe 0.7s cubic-bezier(0.16, 1, 0.3, 1)
            forwards;
    }
    /* h1 tidak pernah fade — hanya naik, agar teks utama selalu terbaca */
    .hero-rise {
        animation: hero-rise-keyframe 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @keyframes hero-in-keyframe {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    @keyframes hero-rise-keyframe {
        from {
            transform: translateY(3.5rem);
        }
        to {
            transform: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .hero-in,
        .hero-rise {
            animation: none;
            opacity: 1;
        }
        .bounce-arrow {
            animation: none;
        }
    }
</style>
