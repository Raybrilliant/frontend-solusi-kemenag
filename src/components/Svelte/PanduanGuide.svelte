<script lang="ts">
    import { onMount } from "svelte";
    import Icon from "@iconify/svelte";

    // ── Tipe ────────────────────────────────────────────────────
    type Persyaratan = {
        id: number;
        layananId: number;
        label: string;
        description?: string;
        required?: boolean;
        wajib?: boolean;
    };

    type Layanan = {
        id: number;
        title: string;
        description?: string;
        icon?: string;
        slaDuration?: number;
        slaUnit?: string;
        cost?: string;
        type?: string;
        externalLink?: string;
        persyaratan: Persyaratan[];
    };

    type Kategori = {
        id: number;
        title: string;
        description?: string;
        icon?: string;
        layanan: Layanan[];
    };

    // ── Props ───────────────────────────────────────────────────
    let {
        services = [],
        youtubeVideoId = "",
    }: { services: Kategori[]; youtubeVideoId?: string } = $props();

    // ── Fallback data (muncul saat backend belum tersedia / dev) ─
    const FALLBACK_SERVICES: Kategori[] = [
        {
            id: 1,
            title: "Layanan Haji dan Umrah",
            description: "Layanan terkait pendaftaran dan keberangkatan haji serta umrah.",
            icon: "mdi:account",
            layanan: [
                {
                    id: 1,
                    title: "Pendaftaran Haji Reguler",
                    description: "Daftar antrian keberangkatan haji reguler.",
                    icon: "mdi:bus",
                    slaDuration: 30,
                    slaUnit: "menit",
                    cost: "Gratis",
                    type: "Online",
                    persyaratan: [
                        { id: 1, layananId: 1, label: "Fotokopi KTP pemohon", required: true },
                        { id: 2, layananId: 1, label: "Fotokopi Kartu Keluarga (KK)", required: true },
                        { id: 3, layananId: 1, label: "Fotokopi buku tabungan haji", required: true },
                        { id: 4, layananId: 1, label: "Pas foto terbaru ukuran 3x4 (2 lembar)", required: true },
                    ],
                },
                {
                    id: 2,
                    title: "Pendaftaran Umrah",
                    description: "Verifikasi dan validasi data umrah.",
                    icon: "mdi:airplane",
                    slaDuration: 60,
                    slaUnit: "menit",
                    cost: "Gratis",
                    type: "Online",
                    persyaratan: [
                        { id: 5, layananId: 2, label: "Fotokopi paspor yang masih berlaku", required: true },
                        { id: 6, layananId: 2, label: "Fotokopi KTP pemohon", required: true },
                        { id: 7, layananId: 2, label: "Bukti pembayaran biaya umrah", required: true },
                        { id: 8, layananId: 2, label: "Surat keterangan sehat dari dokter", required: false },
                    ],
                },
            ],
        },
        {
            id: 2,
            title: "Layanan Pernikahan",
            description: "Layanan pencatatan dan pengelolaan administrasi pernikahan.",
            icon: "mdi:heart",
            layanan: [
                {
                    id: 10,
                    title: "Pendaftaran Nikah",
                    description: "Pendaftaran pernikahan dan jadwal khutbah nikah.",
                    icon: "mdi:ring",
                    slaDuration: 1,
                    slaUnit: "hari",
                    cost: "Gratis",
                    type: "Online",
                    persyaratan: [
                        { id: 20, layananId: 10, label: "KTP calon suami & istri", required: true },
                        { id: 21, layananId: 10, label: "Kartu Keluarga", required: true },
                        { id: 22, layananId: 10, label: "Surat pengantar dari KUA", required: true },
                    ],
                },
            ],
        },
        {
            id: 3,
            title: "Layanan Madrasah dan Pendidikan",
            description: "Layanan akreditasi, izin pendirian, dan sertifikasi guru madrasah.",
            icon: "mdi:school",
            layanan: [
                {
                    id: 4,
                    title: "Akreditasi Madrasah",
                    description: "Pengajuan akreditasi madrasah secara online.",
                    icon: "mdi:certificate",
                    slaDuration: 7,
                    slaUnit: "hari",
                    cost: "Gratis",
                    type: "Online",
                    persyaratan: [
                        { id: 30, layananId: 4, label: "Surat permohonan akreditasi", required: true },
                        { id: 31, layananId: 4, label: "Dokumen profil madrasah", required: true },
                        { id: 32, layananId: 4, label: "Laporan evaluasi diri madrasah (EDM)", required: true },
                        { id: 33, layananId: 4, label: "SK pendirian madrasah", required: true },
                    ],
                },
            ],
        },
    ];

    const displayServices = $derived(services.length > 0 ? services : FALLBACK_SERVICES);

    // ── Konfigurasi video ───────────────────────────────────────
    const YOUTUBE_THUMB = youtubeVideoId
        ? `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`
        : "";

    // ── State ───────────────────────────────────────────────────
    let playVideo = $state(false);
    let activeSection = $state("");
    let tocOpen = $state(false);
    let progress = $state(0);
    let showBackToTop = $state(false);
    let searchQuery = $state("");
    let openCategories = $state<Record<number, boolean>>({});
    let openServices = $state<Record<number, boolean>>({});
    let requirementsCache = $state<Record<number, Persyaratan[]>>({});
    let loadingRequirements = $state<Record<number, boolean>>({});
    let slaFilter = $state<"all" | "Sangat Cepat" | "Cepat" | "Standar" | "Proses Panjang">("all");

    // ── Daftar isi ──────────────────────────────────────────────
    const tocItems = [
        { id: "video-tutorial", label: "Video Panduan" },
        { id: "apa-itu-solusi", label: "Apa itu SOLUSI?" },
        { id: "syarat-layanan", label: "Syarat Layanan" },
        { id: "cara-penggunaan", label: "Cara Penggunaan" },
        { id: "sla", label: "Standar Waktu Layanan (SLA)" },
        { id: "kompensasi", label: "Kompensasi Keterlambatan" },
        { id: "faq", label: "Pertanyaan Umum" },
    ];

    // ── Data langkah tutorial ───────────────────────────────────
    const steps = [
        {
            icon: "mdi:magnify",
            title: "Cari Layanan",
            desc: "Gunakan kotak pencarian di beranda atau telusuri kategori layanan yang tersedia.",
        },
        {
            icon: "mdi:file-document-edit",
            title: "Isi Formulir",
            desc: "Klik layanan yang dibutuhkan, baca persyaratannya, lalu lengkapi formulir permohonan.",
        },
        {
            icon: "mdi:paperclip",
            title: "Unggah Dokumen",
            desc: "Upload dokumen persyaratan dalam format PDF/JPG/PNG sesuai ketentuan.",
        },
        {
            icon: "mdi:send-check",
            title: "Kirim Permohonan",
            desc: "Periksa kembali data Anda, lalu kirim. Anda akan mendapat nomor tiket otomatis.",
        },
        {
            icon: "mdi:progress-clock",
            title: "Pantau Status",
            desc: "Gunakan menu Cek Status untuk melihat perkembangan permohonan secara real-time.",
        },
    ];

    // ── FAQ ─────────────────────────────────────────────────────
    const faqs = [
        {
            q: "Bagaimana jika dokumen persyaratan belum lengkap?",
            a: "Anda tetap bisa mengajukan permohonan, namun petugas akan meminta kelengkapan dokumen melalui fitur revisi sebelum proses dilanjutkan.",
        },
        {
            q: "Apakah layanan di SOLUSI dikenakan biaya?",
            a: "Sebagian besar layanan Kemenag bersifat gratis. Informasi biaya (jika ada) tercantum pada detail masing-masing layanan.",
        },
        {
            q: "Berapa lama waktu penyelesaian layanan?",
            a: "Setiap layanan memiliki Standar Waktu Layanan (SLA) yang bisa Anda lihat pada tabel SLA di halaman ini.",
        },
        {
            q: "Bagaimana proses kompensasi keterlambatan?",
            a: "Jika layanan melebihi batas SLA, petugas Kemenag Kota Probolinggo akan secara otomatis menghubungi Anda. Tidak perlu mengajukan kompensasi secara manual.",
        },
    ];

    // ── Helpers ─────────────────────────────────────────────────
    function formatSla(duration?: number, unit?: string): string {
        if (!duration || duration <= 0) return "Sesuai ketentuan";
        const u = unit?.toLowerCase() ?? "menit";
        const label =
            u === "menit" ? "Menit" : u === "jam" ? "Jam" : u === "hari" ? "Hari" : unit;
        return `${duration} ${label}`;
    }

    function slaType(duration?: number, unit?: string): string {
        if (!duration || duration <= 0) return "-";
        const u = unit?.toLowerCase() ?? "";
        const totalMinutes =
            u === "menit" ? duration : u === "jam" ? duration * 60 : duration * 60 * 24;
        if (totalMinutes <= 60) return "Sangat Cepat";
        if (totalMinutes <= 1440) return "Cepat";
        if (totalMinutes <= 4320) return "Standar";
        return "Proses Panjang";
    }

    function requirementsFor(layanan: Layanan): Persyaratan[] {
        return requirementsCache[layanan.id] ?? layanan.persyaratan ?? [];
    }

    async function loadRequirements(layananId: number) {
        if (requirementsCache[layananId] || loadingRequirements[layananId]) return;
        loadingRequirements[layananId] = true;
        try {
            const res = await fetch(`/api/persyaratan?layananId=${layananId}`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                requirementsCache[layananId] = json.data;
            } else {
                requirementsCache[layananId] = [];
            }
        } catch {
            requirementsCache[layananId] = [];
        } finally {
            loadingRequirements[layananId] = false;
        }
    }

    // ── Filter layanan ──────────────────────────────────────────
    let filteredServices = $derived(
        displayServices
            .map((cat) => ({
                ...cat,
                layanan: cat.layanan.filter(
                    (l) =>
                        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (l.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                        requirementsFor(l).some((s) =>
                            s.label.toLowerCase().includes(searchQuery.toLowerCase()),
                        ),
                ),
            }))
            .filter((cat) => cat.layanan.length > 0),
    );

    // ── Flat SLA list ───────────────────────────────────────────
    let slaList = $derived(
        displayServices
            .flatMap((cat) =>
                cat.layanan.map((l) => ({
                    category: cat.title,
                    service: l.title,
                    duration: l.slaDuration,
                    unit: l.slaUnit,
                    time: formatSla(l.slaDuration, l.slaUnit),
                    type: slaType(l.slaDuration, l.slaUnit),
                })),
            )
            .filter((l) => l.duration && l.duration > 0)
            .sort((a, b) => {
                const ua = a.unit?.toLowerCase() ?? "";
                const ub = b.unit?.toLowerCase() ?? "";
                const toMin = (d: number, u: string) =>
                    u === "menit" ? d : u === "jam" ? d * 60 : d * 60 * 24;
                return toMin(a.duration ?? 0, ua) - toMin(b.duration ?? 0, ub);
            }),
    );

    let filteredSlaList = $derived(
        slaFilter === "all" ? slaList : slaList.filter((l) => l.type === slaFilter),
    );

    const slaFilterOptions: { key: typeof slaFilter; label: string; activeClass: string }[] = [
        { key: "all", label: "Semua", activeClass: "bg-green text-cream" },
        { key: "Sangat Cepat", label: "Sangat Cepat", activeClass: "bg-emerald-100 text-emerald-700" },
        { key: "Cepat", label: "Cepat", activeClass: "bg-green/10 text-green" },
        { key: "Standar", label: "Standar", activeClass: "bg-yellow/20 text-amber-700" },
        { key: "Proses Panjang", label: "Proses Panjang", activeClass: "bg-rose-100 text-rose-700" },
    ];

    // ── Scroll spy + progress ───────────────────────────────────
    function onScroll() {
        const sections = tocItems.map((i) => document.getElementById(i.id));
        const scrollY = window.scrollY + 120;
        let current = "";
        for (const s of sections) {
            if (s && s.offsetTop <= scrollY) current = s.id;
        }
        activeSection = current || tocItems[0].id;

        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        progress = docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0;
        showBackToTop = window.scrollY > 300;
    }

    function scrollToId(id: string) {
        const el = document.getElementById(id);
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: "smooth" });
        activeSection = id;
        tocOpen = false;
    }

    function toggleCategory(id: number) {
        const wasOpen = openCategories[id];
        openCategories = {};
        openServices = {};
        if (!wasOpen) {
            openCategories[id] = true;
        }
    }

    async function toggleService(id: number) {
        const wasOpen = openServices[id];
        openServices = {};
        if (!wasOpen) {
            openServices[id] = true;
            await loadRequirements(id);
        }
    }

    function backToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /** Svelte action: reveal saat elemen masuk viewport */
    function reveal(
        node: HTMLElement,
        options: {
            direction?: "up" | "down" | "left" | "right" | "scale";
            distance?: number;
            delay?: number;
            duration?: number;
            threshold?: number;
            rootMargin?: string;
        } = {},
    ) {
        const direction = options.direction ?? "up";
        const distance = options.distance ?? 28;
        const delay = options.delay ?? 0;
        const duration = options.duration ?? 700;
        const easing = "cubic-bezier(0.16, 1, 0.3, 1)";

        node.style.opacity = "0";
        node.style.willChange = "opacity, transform";
        node.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`;

        const transforms: Record<string, string> = {
            up: `translateY(${distance}px)`,
            down: `translateY(-${distance}px)`,
            left: `translateX(-${distance}px)`,
            right: `translateX(${distance}px)`,
            scale: "scale(0.96)",
        };
        node.style.transform = transforms[direction] ?? transforms.up;

        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    node.style.opacity = "1";
                    node.style.transform = "none";
                    node.style.willChange = "auto";
                    obs.disconnect();
                }
            },
            { threshold: options.threshold ?? 0.1, rootMargin: options.rootMargin ?? "0px 0px -60px 0px" },
        );
        obs.observe(node);
        return {
            destroy() {
                obs.disconnect();
            },
        };
    }

    onMount(() => {
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    });
</script>

<!-- ── Progress bar ───────────────────────────────────────────── -->
<div
    class="fixed top-0 left-0 h-1 bg-yellow z-[60] transition-all duration-150"
    style="width: {progress}%"
    aria-hidden="true"
></div>

<!-- ── Back to top ────────────────────────────────────────────── -->
{#if showBackToTop}
    <button
        type="button"
        onclick={backToTop}
        class="fixed bottom-6 left-6 z-[70] hidden lg:flex w-12 h-12 bg-green text-cream border border-cream/30 shadow-2xl items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-ink"
        aria-label="Kembali ke atas"
    >
        <Icon icon="mdi:arrow-up" width="24" height="24" />
    </button>
{/if}

<!-- ── Mobile TOC toggle ──────────────────────────────────────── -->
<button
    type="button"
    onclick={() => (tocOpen = !tocOpen)}
    class="fixed bottom-6 left-6 z-50 lg:hidden w-12 h-12 bg-yellow text-ink shadow-xl flex items-center justify-center transition-transform hover:scale-110"
    aria-label="Daftar isi"
    aria-expanded={tocOpen}
>
    <Icon icon={tocOpen ? "mdi:close" : "mdi:table-of-contents"} width="22" height="22" />
</button>

<!-- ── Hero ───────────────────────────────────────────────────── -->
<section class="relative pt-24 pb-20 md:pt-28 md:pb-24 overflow-hidden -mx-4 sm:-mx-8 md:-mx-14 lg:-mx-20 -mt-16 lg:-mt-20">
    <div
        class="absolute -top-10 right-0 w-[30rem] h-[30rem] bg-green/8 blur-3xl pointer-events-none animate-float"
    ></div>
    <div
        class="absolute top-1/4 left-0 w-[34rem] h-[34rem] bg-yellow/15 blur-3xl pointer-events-none animate-float"
        style="animation-delay: -3s;"
    ></div>
    <div
        class="absolute bottom-0 left-1/4 w-[28rem] h-[28rem] bg-green/5 blur-2xl pointer-events-none animate-pulse-glow"
    ></div>

    <div class="relative max-w-4xl mx-auto text-center px-4 sm:px-8 md:px-14 lg:px-20">
        <div
            class="inline-flex items-center gap-2 px-4 py-2 bg-white/60 border border-green/10 text-xs font-bold uppercase tracking-wider text-green mb-5 animate-fade-in-down"
        >
            <Icon icon="mdi:book-open-variant" width="16" height="16" />
            Panduan Pengguna
        </div>
        <h1
            class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-5 animate-fade-in-up"
            style="animation-delay: 0.1s;"
        >
            <span class="text-green">SOLUSI</span> Lebih Mudah
            <br />
            <span class="text-ink">Hanya Dalam Beberapa Langkah</span>
        </h1>
        <p
            class="text-base md:text-lg text-ink/65 max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
            style="animation-delay: 0.2s;"
        >
            Temukan cara mengajukan layanan, syarat yang dibutuhkan, standar waktu penyelesaian,
            serta hak kompensasi jika layanan melebihi batas waktu.
        </p>

        <div
            class="flex flex-wrap justify-center gap-3 mt-8 animate-fade-in-up"
            style="animation-delay: 0.3s;"
        >
            <button
                type="button"
                onclick={() => scrollToId("syarat-layanan")}
                class="group inline-flex items-center gap-2 bg-green text-cream px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-ink transition-colors shadow-lg shadow-green/20 hover:-translate-y-0.5"
            >
                Lihat Syarat
                <Icon
                    icon="mdi:arrow-down"
                    width="18"
                    height="18"
                    class="group-hover:translate-y-1 transition-transform"
                />
            </button>
            <button
                type="button"
                onclick={() => scrollToId("video-tutorial")}
                class="group inline-flex items-center gap-2 bg-yellow text-ink px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-yellow/80 transition-colors shadow-lg shadow-yellow/20 hover:-translate-y-0.5"
            >
                <Icon icon="mdi:play-circle" width="20" height="20" />
                Tonton Video
            </button>
        </div>
    </div>
</section>

<!-- ── Sticky TOC (desktop) ───────────────────────────────────── -->
<nav
    class="hidden lg:block sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-y border-ink/8 py-3 mb-10"
>
    <div class="max-w-6xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span class="text-xs font-bold uppercase tracking-wider text-ink/40 shrink-0 mr-2"
            >Daftar Isi</span
        >
        {#each tocItems as item}
            <button
                type="button"
                onclick={() => scrollToId(item.id)}
                class="shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-transparent transition-all {activeSection === item.id ? 'bg-green text-cream shadow-md' : 'text-ink/60 hover:text-ink hover:bg-white/50'}"
                aria-current={activeSection === item.id ? "true" : "false"}
            >
                {item.label}
            </button>
        {/each}
    </div>
</nav>

<!-- ── Mobile TOC drawer ──────────────────────────────────────── -->
<div
    class="lg:hidden fixed inset-0 z-[55] bg-ink/40 backdrop-blur-sm transition-opacity {tocOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
    onclick={() => (tocOpen = false)}
    role="dialog"
    aria-label="Daftar isi"
    aria-hidden={!tocOpen}
></div>
<div
    class="lg:hidden fixed bottom-20 left-6 right-6 z-[55] bg-cream shadow-2xl p-5 transition-all duration-300 {tocOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}"
>
    <p class="text-xs font-bold uppercase tracking-wider text-ink/40 mb-3">Daftar Isi</p>
    <div class="grid gap-2">
        {#each tocItems as item}
            <button
                type="button"
                onclick={() => scrollToId(item.id)}
                class="text-left px-4 py-3 text-sm font-semibold transition-colors {activeSection === item.id ? 'bg-green text-cream' : 'bg-white/50 text-ink hover:bg-white'}"
            >
                {item.label}
            </button>
        {/each}
    </div>
</div>

<main class="max-w-6xl mx-auto px-4 pb-24 space-y-20 md:space-y-28">
    <!-- ── Video Tutorial ───────────────────────────────────────── -->
    <section id="video-tutorial" class="scroll-mt-28 mt-8 md:mt-0" use:reveal>
        <div class="text-center max-w-2xl mx-auto mb-8">
            <h2 class="text-3xl md:text-4xl font-bold mb-3">Video Panduan Penggunaan</h2>
            <p class="text-ink/65">
                Tonton video singkat berikut untuk memahami alur penggunaan aplikasi SOLUSI dari
                awal hingga selesai.
            </p>
        </div>

        <div class="max-w-3xl mx-auto">
            <div
                class="relative overflow-hidden shadow-2xl bg-ink aspect-video group"
            >
                {#if playVideo && youtubeVideoId}
                    <iframe
                        src="https://www.youtube.com/embed/{youtubeVideoId}?autoplay=1&rel=0"
                        title="Video Panduan SOLUSI"
                        class="absolute inset-0 w-full h-full"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                    ></iframe>
                {:else}
                    {#if YOUTUBE_THUMB}
                        <img
                            src={YOUTUBE_THUMB}
                            alt="Thumbnail video panduan SOLUSI"
                            class="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        />
                    {:else}
                        <div
                            class="w-full h-full flex items-center justify-center bg-gradient-to-br from-green to-emerald-800 text-cream"
                        >
                            <div class="text-center px-6">
                                <Icon icon="mdi:play-circle" width="64" height="64" class="mx-auto mb-3 opacity-80" />
                                <p class="font-bold text-lg">Video Panduan SOLUSI</p>
                                <p class="text-sm opacity-70">Silakan atur ID video YouTube</p>
                            </div>
                        </div>
                    {/if}
                    <button
                        type="button"
                        onclick={() => (playVideo = true)}
                        class="absolute inset-0 flex items-center justify-center group cursor-pointer"
                        aria-label="Putar video panduan"
                    >
                        <span
                            class="w-20 h-20 bg-yellow text-ink flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform"
                        >
                            <Icon icon="mdi:play" width="36" height="36" class="ml-1" />
                        </span>
                    </button>
                {/if}
            </div>
            <p class="text-center text-xs text-ink/40 mt-4">
                Klik tombol play untuk menonton video tutorial resmi SOLUSI.
            </p>
        </div>
    </section>

    <!-- ── Apa itu SOLUSI ─────────────────────────────────────── -->
    <section id="apa-itu-solusi" class="scroll-mt-28" use:reveal>
        <div class="grid md:grid-cols-2 gap-10 items-center">
            <div class="space-y-5">
                <div
                    class="inline-flex items-center gap-2 text-green font-bold text-sm uppercase tracking-wider"
                >
                    <span class="w-8 h-[2px] bg-green"></span>
                    Tentang SOLUSI
                </div>
                <h2 class="text-3xl md:text-4xl font-bold leading-tight">
                    Sistem Online Layanan
                    <span class="text-green">Unggul Terintegrasi</span>
                </h2>
                <p class="text-ink/70 leading-relaxed">
                    <strong class="text-ink">SOLUSI</strong> adalah portal layanan publik Kantor
                    Kementerian Agama Kota Probolinggo yang mengintegrasikan berbagai jenis
                    permohonan layanan ke dalam satu sistem digital. Dengan SOLUSI, masyarakat
                    dapat mengajukan layanan kapan saja dan di mana saja tanpa perlu datang ke
                    kantor secara berulang.
                </p>
                <ul class="grid gap-3">
                    {#each ["Akses 24/7 dari perangkat apa pun", "Transparansi status & waktu pengerjaan", "Pengurangan birokrasi & antrean", "Notifikasi otomatis setiap perubahan status"] as fitur, i}
                        <li
                            class="flex items-start gap-3 p-3 bg-white/50 border border-ink/6 hover:bg-white hover:border-green/20 transition-all"
                            use:reveal={{ delay: i * 100 }}
                        >
                            <span
                                class="w-6 h-6 bg-green/10 text-green flex items-center justify-center shrink-0 mt-0.5"
                            >
                                <Icon icon="mdi:check" width="14" height="14" />
                            </span>
                            <span class="text-sm font-medium text-ink/80">{fitur}</span>
                        </li>
                    {/each}
                </ul>
            </div>
            <div class="relative">
                <div
                    class="absolute inset-0 bg-green rotate-3 opacity-10 scale-95"
                ></div>
                <div
                    class="relative bg-white border border-ink/8 p-6 md:p-8 shadow-xl"
                    use:reveal={{ direction: "scale" }}
                >
                    <div class="grid grid-cols-2 gap-4">
                        {#each [{ icon: "mdi:clock-fast", label: "Cepat", val: "Proses" }, { icon: "mdi:shield-check", label: "Aman", val: "Terverifikasi" }, { icon: "mdi:cellphone-check", label: "Mudah", val: "Online" }, { icon: "mdi:account-voice", label: "Transparan", val: "Terbuka" }] as card, i}
                            <div
                                class="group p-4 md:p-5 bg-cream border border-ink/6 hover:border-green/30 hover:bg-green/5 transition-all text-center"
                                use:reveal={{ direction: "scale", delay: i * 100 }}
                            >
                                <div
                                    class="w-12 h-12 mx-auto bg-green text-cream flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                                >
                                    <Icon icon={card.icon} width="24" height="24" />
                                </div>
                                <p class="text-xs text-ink/50 uppercase tracking-wider font-bold">
                                    {card.label}
                                </p>
                                <p class="text-lg font-bold text-ink">{card.val}</p>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ── Syarat Layanan ───────────────────────────────────────── -->
    <section id="syarat-layanan" class="scroll-mt-28" use:reveal>
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
                <h2 class="text-3xl md:text-4xl font-bold mb-2">Syarat & Ketentuan Layanan</h2>
                <p class="text-ink/65">
                    Pilih kategori dan layanan untuk melihat dokumen yang perlu dipersiapkan.
                </p>
            </div>
            <div class="relative md:w-80">
                <Icon
                    icon="mdi:magnify"
                    width="20"
                    height="20"
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
                />
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Cari layanan / syarat..."
                    class="w-full pl-10 pr-4 py-3 bg-white border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:border-transparent"
                />
            </div>
        </div>

        {#if services.length === 0}
            <div
                class="mb-6 p-4 bg-yellow/10 border border-yellow/20 text-sm text-ink/80"
            >
                <div class="flex items-start gap-3">
                    <Icon icon="mdi:information-outline" width="20" height="20" class="text-yellow-600 shrink-0 mt-0.5" />
                    <p>
                        Backend belum mengirimkan data layanan. Di bawah ini ditampilkan contoh data
                        agar Anda bisa melihat tampilan panduan. Saat backend aktif, data asli akan
                        otomatis menggantinya.
                    </p>
                </div>
            </div>
        {/if}

        {#if filteredServices.length === 0}
            <div class="text-center py-16 bg-white/50 border border-ink/8">
                <Icon icon="mdi:file-search" width="48" height="48" class="mx-auto text-ink/30 mb-3" />
                <p class="text-ink/60 font-medium">Tidak ditemukan layanan yang cocok.</p>
                {#if searchQuery}
                    <button
                        type="button"
                        onclick={() => (searchQuery = "")}
                        class="mt-3 text-sm font-bold text-green hover:underline"
                    >
                        Reset pencarian
                    </button>
                {/if}
            </div>
        {:else}
            <div class="space-y-5">
                {#each filteredServices as category, ci (category.id)}
                    <div
                        class="bg-white border border-ink/8 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        use:reveal={{ delay: ci * 80 }}
                    >
                        <button
                            type="button"
                            onclick={() => toggleCategory(category.id)}
                            class="w-full flex items-center justify-between p-5 text-left hover:bg-black/[0.02] transition-colors"
                        >
                            <div class="flex items-center gap-4">
                                <span
                                    class="w-12 h-12 bg-green/10 text-green flex items-center justify-center shrink-0"
                                >
                                    {#if category.icon?.trim().includes(":")}
                                        <Icon icon={category.icon.trim()} width="24" height="24" />
                                    {:else if category.icon?.trim()}
                                        <svg
                                            viewBox="0 0 24 24"
                                            width="24"
                                            height="24"
                                            fill="currentColor"
                                        >
                                            {@html category.icon.trim()}
                                        </svg>
                                    {:else}
                                        <Icon icon="mdi:folder" width="24" height="24" />
                                    {/if}
                                </span>
                                <div>
                                    <h3 class="text-lg font-bold text-ink">{category.title}</h3>
                                    <p class="text-xs text-ink/50 font-medium">
                                        {category.layanan.length} layanan tersedia
                                    </p>
                                </div>
                            </div>
                            <Icon
                                icon="mdi:chevron-down"
                                width="24"
                                height="24"
                                class="text-ink/40 transition-transform {openCategories[category.id] ? 'rotate-180' : ''}"
                            />
                        </button>

                        <div
                            class="grid transition-all duration-300 {openCategories[category.id] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}"
                        >
                            <div class="overflow-hidden">
                                <div class="p-5 pt-0 border-t border-ink/6">
                                    <div class="grid md:grid-cols-2 gap-4 pt-4">
                                        {#each category.layanan as layanan (layanan.id)}
                                            <div
                                                class="border border-ink/6 overflow-hidden bg-cream/30 hover:bg-cream/60 transition-colors"
                                            >
                                                <button
                                                    type="button"
                                                    onclick={() => toggleService(layanan.id)}
                                                    class="w-full flex items-center justify-between p-4 text-left"
                                                >
                                                    <div class="flex items-center gap-3 min-w-0">
                                                        {#if layanan.icon?.trim().includes(":")}
                                                            <Icon
                                                                icon={layanan.icon.trim()}
                                                                width="20"
                                                                height="20"
                                                                class="text-green shrink-0"
                                                            />
                                                        {:else if layanan.icon?.trim()}
                                                            <svg
                                                                viewBox="0 0 24 24"
                                                                width="20"
                                                                height="20"
                                                                fill="currentColor"
                                                                class="text-green shrink-0"
                                                            >
                                                                {@html layanan.icon.trim()}
                                                            </svg>
                                                        {:else}
                                                            <Icon
                                                                icon="mdi:file-document"
                                                                width="20"
                                                                height="20"
                                                                class="text-green shrink-0"
                                                            />
                                                        {/if}
                                                        <span class="font-bold text-sm md:text-base truncate"
                                                            >{layanan.title}</span
                                                        >
                                                    </div>
                                                    <Icon
                                                        icon="mdi:chevron-down"
                                                        width="22"
                                                        height="22"
                                                        class="text-ink/40 transition-transform shrink-0 {openServices[ layanan.id ] ? 'rotate-180' : ''}"
                                                    />
                                                </button>

                                                <div
                                                    class="grid transition-all duration-300 {openServices[ layanan.id ] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}"
                                                >
                                                    <div class="overflow-hidden">
                                                        <div class="px-4 pb-4 pt-0">
                                                            {#if layanan.description}
                                                                <p class="text-sm text-ink/70 mb-3">
                                                                    {layanan.description}
                                                                </p>
                                                            {/if}
                                                            {#if loadingRequirements[layanan.id]}
                                                                <div class="flex items-center gap-2 text-sm text-ink/50 py-2">
                                                                    <span
                                                                        class="w-4 h-4 border-2 border-green/30 border-t-green animate-spin"
                                                                    ></span>
                                                                    Memuat persyaratan...
                                                                </div>
                                                            {:else if requirementsFor(layanan).length > 0}
                                                                <ul class="space-y-2">
                                                                    {#each requirementsFor(layanan) as syarat}
                                                                        <li
                                                                            class="flex items-start gap-3 text-sm"
                                                                        >
                                                                            <span
                                                                                class="mt-0.5 shrink-0 w-5 h-5 {(syarat.required ?? syarat.wajib) ? 'bg-green text-cream' : 'bg-ink/10 text-ink/50'} flex items-center justify-center text-[10px] font-bold"
                                                                            >
                                                                                {(syarat.required ??
                                                                                    syarat.wajib)
                                                                                    ? "W"
                                                                                    : "O"}
                                                                            </span>
                                                                            <span class="text-ink/80">
                                                                                {syarat.label}
                                                                                {#if syarat.description}
                                                                                    <span
                                                                                        class="block text-xs text-ink/50 mt-0.5"
                                                                                        >{syarat.description}</span
                                                                                    >
                                                                                {/if}
                                                                            </span>
                                                                        </li>
                                                                    {/each}
                                                                </ul>
                                                            {:else}
                                                                <p class="text-sm text-ink/40 italic">
                                                                    Belum ada persyaratan terdaftar
                                                                    untuk layanan ini.
                                                                </p>
                                                            {/if}

                                                            <div
                                                                class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-ink/6"
                                                            >
                                                                <span
                                                                    class="inline-flex items-center gap-1 text-xs font-medium text-ink/60 bg-white border border-ink/8 px-2.5 py-1"
                                                                >
                                                                    <Icon
                                                                        icon="mdi:cash-check"
                                                                        width="14"
                                                                        height="14"
                                                                    />
                                                                    {layanan.cost ?? "Gratis"}
                                                                </span>
                                                                <span
                                                                    class="inline-flex items-center gap-1 text-xs font-medium text-ink/60 bg-white border border-ink/8 px-2.5 py-1"
                                                                >
                                                                    <Icon
                                                                        icon="mdi:clock-outline"
                                                                        width="14"
                                                                        height="14"
                                                                    />
                                                                    SLA: {formatSla(
                                                                        layanan.slaDuration,
                                                                        layanan.slaUnit,
                                                                    )}
                                                                </span>
                                                                {#if layanan.type === "External" && layanan.externalLink}
                                                                    <a
                                                                        href={layanan.externalLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        class="inline-flex items-center gap-1 text-xs font-bold text-green bg-green/5 border border-green/10 px-2.5 py-1 hover:bg-green/10 transition-colors"
                                                                    >
                                                                        <Icon
                                                                            icon="mdi:open-in-new"
                                                                            width="14"
                                                                            height="14"
                                                                        />
                                                                        Akses Eksternal
                                                                    </a>
                                                                {/if}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </section>

    <!-- ── Cara Penggunaan ──────────────────────────────────────── -->
    <section id="cara-penggunaan" class="scroll-mt-28" use:reveal>
        <div class="text-center max-w-2xl mx-auto mb-14">
            <div
                class="inline-flex items-center gap-2 text-green font-bold text-sm uppercase tracking-wider mb-3"
            >
                <span class="w-8 h-[2px] bg-green"></span>
                Tutorial
            </div>
            <h2 class="text-3xl md:text-4xl font-bold mb-3">Cara Menggunakan SOLUSI</h2>
            <p class="text-ink/65">
                Ikuti 5 langkah sederhana berikut untuk mengajukan layanan melalui SOLUSI.
            </p>
        </div>

        <div class="relative max-w-4xl mx-auto">
            <!-- timeline line -->
            <div
                class="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-green/15 -translate-x-1/2"
            ></div>

            <div class="space-y-12 md:space-y-16">
                {#each steps as step, i}
                    <div
                        class="relative grid md:grid-cols-2 gap-6 md:gap-12 items-center"
                        use:reveal={{ delay: i * 100 }}
                    >
                        <!-- content -->
                        <div
                            class="pl-20 md:pl-0 {i % 2 === 0 ? 'md:order-1 md:text-right md:pr-14' : 'md:order-2 md:text-left md:pl-14'}"
                        >
                            <div class="inline-flex items-center gap-2 mb-2">
                                <span
                                    class="w-7 h-7 bg-green text-cream text-xs font-bold flex items-center justify-center"
                                >
                                    {i + 1}
                                </span>
                                <span
                                    class="text-xs font-bold uppercase tracking-wider text-ink/40"
                                    >Langkah {i + 1}</span
                                >
                            </div>
                            <h3 class="text-xl md:text-2xl font-bold mb-2">{step.title}</h3>
                            <p class="text-ink/65 text-sm md:text-base leading-relaxed">
                                {step.desc}
                            </p>
                        </div>

                        <!-- center icon -->
                        <div
                            class="absolute left-8 md:left-1/2 top-0 -translate-x-1/2 w-12 h-12 bg-yellow text-ink flex items-center justify-center shadow-lg z-10"
                        >
                            <Icon icon={step.icon} width="24" height="24" />
                        </div>

                        <!-- visual card -->
                        <div
                            class="hidden md:block {i % 2 === 0 ? 'md:order-2 md:pl-14' : 'md:order-1 md:pr-14'}"
                        >
                            <div
                                class="h-28 bg-gradient-to-br {i % 2 === 0 ? 'from-green/10 to-green/5' : 'from-yellow/20 to-yellow/5'} border border-ink/6 flex items-center justify-center hover:scale-[1.02] transition-transform"
                            >
                                <Icon
                                    icon={step.icon}
                                    width="48"
                                    height="48"
                                    class="text-green/30"
                                />
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- ── SLA ──────────────────────────────────────────────────── -->
    <section id="sla" class="scroll-mt-28">
        <div class="grid lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1">
                <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                    Standar Waktu Layanan
                    <span class="text-green">(SLA)</span>
                </h2>
                <p class="text-ink/65 text-sm leading-relaxed mb-6">
                    SLA adalah komitmen waktu penyelesaian layanan yang dihitung sejak dokumen
                    lengkap diterima. Waktu di luar jam kerja, hari libur, dan masa revisi dokumen
                    tidak dihitung.
                </p>
                <div class="p-5 bg-green/5 border border-green/10">
                    <div class="flex items-center gap-3 mb-2">
                        <Icon
                            icon="mdi:information-outline"
                            width="22"
                            height="22"
                            class="text-green"
                        />
                        <span class="font-bold text-sm">Catatan Penting</span>
                    </div>
                    <p class="text-xs text-ink/70 leading-relaxed">
                        Lama penyelesaian dapat berbeda jika layanan memerlukan verifikasi lintas
                        instansi atau pengambilan data ke lapangan.
                    </p>
                </div>
            </div>

            <div class="lg:col-span-2">
                {#if slaList.length === 0}
                    <div class="text-center py-14 bg-white/50 border border-ink/8">
                        <Icon
                            icon="mdi:timer-off"
                            width="48"
                            height="48"
                            class="mx-auto text-ink/30 mb-3"
                        />
                        <p class="text-ink/60 font-medium">Data SLA belum tersedia.</p>
                    </div>
                {:else}
                    <!-- Filter SLA -->
                    <div class="flex flex-wrap gap-2 mb-4">
                        {#each slaFilterOptions as opt}
                            <button
                                type="button"
                                onclick={() => (slaFilter = opt.key)}
                                class="px-3 py-1.5 text-xs font-bold border border-ink/8 transition-colors {slaFilter === opt.key ? opt.activeClass : 'bg-white text-ink/70 hover:bg-black/[0.02]'}"
                            >
                                {opt.label}
                                {#if opt.key !== 'all'}
                                    <span class="ml-1 opacity-70">
                                        ({slaList.filter((l) => l.type === opt.key).length})
                                    </span>
                                {:else}
                                    <span class="ml-1 opacity-70">({slaList.length})</span>
                                {/if}
                            </button>
                        {/each}
                    </div>

                    {#if filteredSlaList.length === 0}
                        <div class="text-center py-10 bg-white/50 border border-ink/8">
                            <p class="text-ink/60 font-medium text-sm">
                                Tidak ada layanan dengan kategori SLA ini.
                            </p>
                        </div>
                    {:else}
                        <!-- Desktop table -->
                        <div class="hidden md:block bg-white border border-ink/8 overflow-hidden shadow-sm">
                            <div class="overflow-x-auto">
                                <table class="min-w-[540px] w-full text-left text-sm">
                                    <thead class="bg-cream border-b border-ink/8">
                                        <tr>
                                            <th
                                                class="px-5 py-3 font-bold text-xs uppercase tracking-wider"
                                                >Layanan</th
                                            >
                                            <th
                                                class="px-5 py-3 font-bold text-xs uppercase tracking-wider"
                                                >Kategori</th
                                            >
                                            <th
                                                class="px-5 py-3 font-bold text-xs uppercase tracking-wider"
                                                >Waktu</th
                                            >
                                            <th
                                                class="px-5 py-3 font-bold text-xs uppercase tracking-wider"
                                                >Kategori SLA</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-ink/6">
                                        {#each filteredSlaList as item}
                                            <tr class="hover:bg-black/[0.02] transition-colors">
                                                <td class="px-5 py-3.5 font-semibold text-ink"
                                                    >{item.service}</td
                                                >
                                                <td class="px-5 py-3.5 text-ink/60">{item.category}</td>
                                                <td class="px-5 py-3.5">
                                                    <span
                                                        class="inline-flex items-center gap-1 font-bold text-green bg-green/8 px-2 py-1 whitespace-nowrap"
                                                    >
                                                        <Icon
                                                            icon="mdi:clock-outline"
                                                            width="14"
                                                            height="14"
                                                        />
                                                        {item.time}
                                                    </span>
                                                </td>
                                                <td class="px-5 py-3.5">
                                                    <span
                                                        class="inline-flex items-center px-2 py-1 text-xs font-bold whitespace-nowrap {item.type === 'Sangat Cepat' ? 'bg-emerald-100 text-emerald-700' : item.type === 'Cepat' ? 'bg-green/10 text-green' : item.type === 'Standar' ? 'bg-yellow/20 text-amber-700' : 'bg-rose-100 text-rose-700'}"
                                                    >
                                                        {item.type}
                                                    </span>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Mobile cards -->
                        <div class="block md:hidden space-y-3">
                            {#each filteredSlaList as item}
                                <div class="bg-white border border-ink/8 p-4 shadow-sm">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0">
                                            <p class="font-semibold text-sm text-ink leading-tight">
                                                {item.service}
                                            </p>
                                            <p class="text-xs text-ink/60 mt-0.5">{item.category}</p>
                                        </div>
                                        <span
                                            class="inline-flex items-center gap-1 font-bold text-green bg-green/8 px-2 py-1 text-xs whitespace-nowrap shrink-0"
                                        >
                                            <Icon icon="mdi:clock-outline" width="12" height="12" />
                                            {item.time}
                                        </span>
                                    </div>
                                    <div class="mt-3">
                                        <span
                                            class="inline-flex items-center px-2 py-1 text-xs font-bold whitespace-nowrap {item.type === 'Sangat Cepat' ? 'bg-emerald-100 text-emerald-700' : item.type === 'Cepat' ? 'bg-green/10 text-green' : item.type === 'Standar' ? 'bg-yellow/20 text-amber-700' : 'bg-rose-100 text-rose-700'}"
                                        >
                                            {item.type}
                                        </span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </section>

    <!-- ── Kompensasi ───────────────────────────────────────────── -->
    <section id="kompensasi" class="scroll-mt-28" use:reveal>
        <div class="text-center max-w-2xl mx-auto mb-10">
            <h2 class="text-3xl md:text-4xl font-bold mb-3">Kompensasi Keterlambatan</h2>
            <p class="text-ink/65">
                Jika layanan Anda belum selesai melebihi batas SLA, Anda berhak mendapatkan
                kompensasi sesuai ketentuan berikut.
            </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {#each [
                { icon: "mdi:account-alert", title: "Lapor Otomatis", desc: "Sistem mendeteksi keterlambatan dan menandai tiket Anda secara otomatis." },
                { icon: "mdi:gift", title: "Gift", desc: "Sebagai bentuk kompensasi, pengguna akan mendapatkan gift/hadiah khusus." },
                { icon: "mdi:priority-high", title: "Prioritas", desc: "Permohonan akan diproses secara prioritas oleh petugas terkait." },
            ] as item, i}
                <div
                    class="group p-6 bg-white border border-ink/8 hover:border-green/30 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    use:reveal={{ direction: "scale", delay: i * 100 }}
                >
                    <div
                        class="w-14 h-14 bg-yellow/20 text-ink flex items-center justify-center mb-4 group-hover:bg-green group-hover:text-cream transition-colors"
                    >
                        <Icon icon={item.icon} width="28" height="28" />
                    </div>
                    <h3 class="text-lg font-bold mb-2">{item.title}</h3>
                    <p class="text-sm text-ink/65 leading-relaxed">{item.desc}</p>
                </div>
            {/each}
        </div>

        <div
            class="mt-8 p-6 md:p-8 bg-gradient-to-br from-green to-emerald-800 text-cream shadow-xl relative overflow-hidden"
            use:reveal
        >
            <div class="absolute -right-10 -top-10 w-48 h-48 bg-white/10 blur-2xl">
            </div>
            <div class="relative flex items-start gap-4">
                <div
                    class="w-12 h-12 bg-yellow text-ink flex items-center justify-center shrink-0"
                >
                    <Icon icon="mdi:bell-ring" width="24" height="24" />
                </div>
                <div>
                    <h3 class="text-xl md:text-2xl font-bold mb-2">
                        Tidak Perlu Mengajukan Kompensasi
                    </h3>
                    <p class="text-sm text-cream/90 leading-relaxed">
                        Jika layanan Anda melebihi batas waktu SLA, petugas kami akan secara
                        otomatis menghubungi Anda. Tidak ada proses pengajuan manual — kompensasi
                        akan diproses dan disampaikan langsung oleh pihak Kemenag Kota Probolinggo.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- ── FAQ ──────────────────────────────────────────────────── -->
    <section id="faq" class="scroll-mt-28" use:reveal>
        <div class="text-center max-w-2xl mx-auto mb-10">
            <h2 class="text-3xl md:text-4xl font-bold mb-3">Pertanyaan Umum</h2>
            <p class="text-ink/65">Temukan jawaban cepat seputar penggunaan SOLUSI.</p>
        </div>

        <div class="max-w-3xl mx-auto space-y-4">
            {#each faqs as faq, i}
                <div
                    class="bg-white border border-ink/8 overflow-hidden"
                    use:reveal={{ delay: i * 100 }}
                >
                    <details class="group">
                        <summary
                            class="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-black/[0.02] transition-colors"
                        >
                            <span class="font-bold text-ink pr-4">{faq.q}</span>
                            <span
                                class="w-8 h-8 bg-green/10 text-green flex items-center justify-center shrink-0 group-open:rotate-180 transition-transform"
                            >
                                <Icon icon="mdi:chevron-down" width="20" height="20" />
                            </span>
                        </summary>
                        <div class="px-5 pb-5 text-sm text-ink/70 leading-relaxed">
                            {faq.a}
                        </div>
                    </details>
                </div>
            {/each}
        </div>
    </section>

    <!-- ── CTA ──────────────────────────────────────────────────── -->
    <section class="text-center pt-8" use:reveal={{ direction: "scale" }}>
        <div
            class="inline-block p-8 md:p-12 bg-white border border-ink/8 shadow-xl max-w-3xl"
        >
            <h2 class="text-2xl md:text-3xl font-bold mb-3">Siap Mengajukan Layanan?</h2>
            <p class="text-ink/65 mb-6">
                Akses berbagai layanan Kemenag Kota Probolinggo dengan cepat, mudah, dan transparan.
            </p>
            <div class="flex flex-wrap justify-center gap-3">
                <a
                    href="/"
                    class="inline-flex items-center gap-2 bg-green text-cream px-6 py-3 font-bold uppercase tracking-wider text-sm hover:bg-ink transition-colors"
                >
                    <Icon icon="mdi:rocket-launch" width="18" height="18" />
                    Mulai Ajukan
                </a>
                <a
                    href="/check-progress"
                    class="inline-flex items-center gap-2 bg-yellow text-ink px-6 py-3 font-bold uppercase tracking-wider text-sm hover:bg-yellow/80 transition-colors"
                >
                    <Icon icon="mdi:progress-clock" width="18" height="18" />
                    Cek Status
                </a>
            </div>
        </div>
    </section>
</main>

<style>
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(24px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-16px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    @keyframes float {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-18px);
        }
    }
    @keyframes pulse-glow {
        0%,
        100% {
            opacity: 0.35;
            transform: scale(1);
        }
        50% {
            opacity: 0.65;
            transform: scale(1.08);
        }
    }

    .animate-fade-in-up {
        animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .animate-fade-in-down {
        animation: fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .animate-float {
        animation: float 6s ease-in-out infinite;
    }
    .animate-pulse-glow {
        animation: pulse-glow 5s ease-in-out infinite;
    }

    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    details > summary::-webkit-details-marker {
        display: none;
    }
</style>
