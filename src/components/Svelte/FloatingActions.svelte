<script>
    import Icon from "@iconify/svelte";

    const WA_NUMBER = "6281359136007";
    const WA_MESSAGE =
        "Halo, saya ingin bertanya mengenai layanan Kementerian Agama Kota Probolinggo.";
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

    const BASE_SIZE = 16;

    // ── state ──────────────────────────────────────────────
    let a11yOpen = $state(false);
    let fontSize = $state(0); // -2 … +4
    let darkMode = $state(false);
    let readable = $state(false); // spacing + font
    let noMotion = $state(false);
    let speaking = $state(false);
    let colorBlind = $state("none"); // none | protanopia | deuteranopia | tritanopia | mono

    // ── apply helpers ──────────────────────────────────────
    const html = () => document.documentElement;

    function save(key, val) {
        localStorage.setItem("a11y-" + key, String(val));
    }

    function applyFontSize(step) {
        html().style.fontSize = `${BASE_SIZE + step}px`;
        save("font", step);
    }
    function applyDark(on) {
        html().classList.toggle("a11y-dark", on);
        save("dark", on ? "1" : "0");
    }
    function applyReadable(on) {
        html().classList.toggle("a11y-readable", on);
        save("readable", on ? "1" : "0");
    }
    function applyNoMotion(on) {
        html().classList.toggle("a11y-no-motion", on);
        save("motion", on ? "1" : "0");
    }
    function applyColorBlind(mode) {
        document.documentElement.style.filter =
            mode === "none" ? "" : `url(#cb-${mode})`;
        save("cb", mode);
    }

    // ── actions ────────────────────────────────────────────
    function incFont() {
        if (fontSize < 4) {
            fontSize++;
            applyFontSize(fontSize);
        }
    }
    function decFont() {
        if (fontSize > -2) {
            fontSize--;
            applyFontSize(fontSize);
        }
    }
    function resetFont() {
        fontSize = 0;
        applyFontSize(0);
    }

    function toggleDark() {
        darkMode = !darkMode;
        applyDark(darkMode);
    }
    function toggleReadable() {
        readable = !readable;
        applyReadable(readable);
    }
    function toggleNoMotion() {
        noMotion = !noMotion;
        applyNoMotion(noMotion);
    }

    function setColorBlind(mode) {
        colorBlind = mode;
        applyColorBlind(mode);
    }

    // ── text-to-speech ─────────────────────────────────────
    function toggleSpeak() {
        if (!("speechSynthesis" in window)) return;
        if (speaking) {
            window.speechSynthesis.cancel();
            speaking = false;
            return;
        }
        const text =
            document.querySelector("main")?.innerText ??
            document.body.innerText;
        const utt = new SpeechSynthesisUtterance(text.slice(0, 5000));
        utt.lang = "id-ID";
        utt.rate = 0.9;
        utt.onend = () => {
            speaking = false;
        };
        utt.onerror = () => {
            speaking = false;
        };
        window.speechSynthesis.speak(utt);
        speaking = true;
    }

    // ── restore on mount ───────────────────────────────────
    $effect(() => {
        const f = parseInt(localStorage.getItem("a11y-font") ?? "0", 10);
        const d = localStorage.getItem("a11y-dark") === "1";
        const r = localStorage.getItem("a11y-readable") === "1";
        const m = localStorage.getItem("a11y-motion") === "1";
        const cb = localStorage.getItem("a11y-cb") ?? "none";

        fontSize = f;
        if (f) applyFontSize(f);
        darkMode = d;
        if (d) applyDark(true);
        readable = r;
        if (r) applyReadable(true);
        noMotion = m;
        if (m) applyNoMotion(true);
        colorBlind = cb;
        if (cb !== "none") applyColorBlind(cb);

        return () => {
            window.speechSynthesis?.cancel();
        };
    });

    function onKeydown(e) {
        if (e.key === "Escape") a11yOpen = false;
    }

    const CB_OPTS = [
        { id: "none", label: "Normal" },
        { id: "protanopia", label: "Protanopia" },
        { id: "deuteranopia", label: "Deuteranopia" },
        { id: "tritanopia", label: "Tritanopia" },
        { id: "mono", label: "Monokrom" },
    ];
</script>

<!-- SVG color-blind filter definitions (hidden) -->
<svg
    style="position:absolute;width:0;height:0;overflow:hidden"
    aria-hidden="true"
>
    <defs>
        <filter id="cb-protanopia">
            <feColorMatrix
                type="matrix"
                values="
                0.567 0.433 0     0 0
                0.558 0.442 0     0 0
                0     0.242 0.758 0 0
                0     0     0     1 0"
            />
        </filter>
        <filter id="cb-deuteranopia">
            <feColorMatrix
                type="matrix"
                values="
                0.625 0.375 0   0 0
                0.700 0.300 0   0 0
                0     0.300 0.7 0 0
                0     0     0   1 0"
            />
        </filter>
        <filter id="cb-tritanopia">
            <feColorMatrix
                type="matrix"
                values="
                0.95  0.05  0     0 0
                0     0.433 0.567 0 0
                0     0.475 0.525 0 0
                0     0     0     1 0"
            />
        </filter>
        <filter id="cb-mono">
            <feColorMatrix type="saturate" values="0" />
        </filter>
    </defs>
</svg>

<svelte:window onkeydown={onKeydown} />

<div class="floating-wrap">
    <!-- Panel -->
    {#if a11yOpen}
        <div class="a11y-panel" role="dialog" aria-label="Panel Aksesibilitas">
            <div class="panel-header">
                <Icon icon="mdi:accessibility" width="13" height="13" />
                Aksesibilitas
            </div>

            <!-- 1. Ukuran Teks -->
            <section class="ps">
                <p class="sl">Ukuran Teks</p>
                <div class="row">
                    <button
                        onclick={decFont}
                        disabled={fontSize <= -2}
                        class="sz-btn"
                        aria-label="Perkecil"
                        ><span
                            style="font-size:11px;font-weight:800;line-height:1"
                            >A</span
                        ></button
                    >
                    <button
                        onclick={resetFont}
                        class="sz-btn mid"
                        aria-label="Reset"
                        ><span
                            style="font-size:14px;font-weight:800;line-height:1"
                            >A</span
                        ></button
                    >
                    <button
                        onclick={incFont}
                        disabled={fontSize >= 4}
                        class="sz-btn"
                        aria-label="Perbesar"
                        ><span
                            style="font-size:18px;font-weight:800;line-height:1"
                            >A</span
                        ></button
                    >
                </div>
                {#if fontSize !== 0}<p class="hint">
                        {fontSize > 0 ? "+" : ""}{fontSize}px dari normal
                    </p>{/if}
            </section>

            <div class="divider"></div>

            <!-- 2. Tema -->
            <section class="ps">
                <p class="sl">Tema</p>
                <div class="toggle-row">
                    <button
                        onclick={() => {
                            if (darkMode) toggleDark();
                        }}
                        class="theme-btn {!darkMode ? 'active' : ''}"
                    >
                        <Icon
                            icon="mdi:white-balance-sunny"
                            width="13"
                            height="13"
                        />
                        Terang
                    </button>
                    <button
                        onclick={() => {
                            if (!darkMode) toggleDark();
                        }}
                        class="theme-btn dark-opt {darkMode ? 'active' : ''}"
                    >
                        <Icon
                            icon="mdi:moon-waning-crescent"
                            width="13"
                            height="13"
                        />
                        Gelap
                    </button>
                </div>
            </section>

            <div class="divider"></div>

            <!-- 3. Keterbacaan -->
            <section class="ps">
                <p class="sl">Keterbacaan</p>
                <button
                    onclick={toggleReadable}
                    class="tog-btn {readable ? 'on' : ''}"
                >
                    <Icon
                        icon="mdi:book-open-page-variant"
                        width="13"
                        height="13"
                    />
                    {readable ? "Nonaktifkan" : "Aktifkan"} Spasi & Font
                </button>
            </section>

            <div class="divider"></div>

            <!-- 4. Kurangi Animasi -->
            <section class="ps">
                <p class="sl">Kurangi Animasi</p>
                <button
                    onclick={toggleNoMotion}
                    class="tog-btn {noMotion ? 'on' : ''}"
                >
                    <Icon
                        icon="mdi:pause-circle-outline"
                        width="13"
                        height="13"
                    />
                    {noMotion ? "Nonaktifkan" : "Aktifkan"} Pengurangan
                </button>
            </section>

            <div class="divider"></div>

            <!-- 5. Baca Teks -->
            <section class="ps">
                <p class="sl">Baca Teks</p>
                <button
                    onclick={toggleSpeak}
                    class="tog-btn speak {speaking ? 'on speaking' : ''}"
                >
                    {#if speaking}
                        <Icon icon="mdi:stop" width="13" height="13" />
                        Hentikan Pembacaan
                    {:else}
                        <Icon icon="mdi:volume-high" width="13" height="13" />
                        Mulai Baca Halaman
                    {/if}
                </button>
            </section>

            <div class="divider"></div>

            <!-- 6. Buta Warna -->
            <section class="ps">
                <p class="sl">Simulasi Buta Warna</p>
                <div class="cb-grid">
                    {#each CB_OPTS as opt}
                        <button
                            onclick={() => setColorBlind(opt.id)}
                            class="cb-btn {colorBlind === opt.id
                                ? 'active'
                                : ''}">{opt.label}</button
                        >
                    {/each}
                </div>
            </section>
        </div>
    {/if}

    <!-- FAB: Accessibility -->
    <button
        onclick={() => (a11yOpen = !a11yOpen)}
        class="fab a11y-fab {a11yOpen ? 'open' : ''}"
        aria-label="Panel aksesibilitas"
        aria-expanded={a11yOpen}
        title="Aksesibilitas"
    >
        <Icon icon="mdi:accessibility" width="21" height="21" />
    </button>

    <!-- FAB: WhatsApp -->
    <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="fab wa-fab"
        aria-label="Hubungi WhatsApp Center"
        title="Hubungi WA Center"
    >
        <Icon icon="mdi:whatsapp" width="21" height="21" />
    </a>
</div>

<style>
    /* ── Wrap ── */
    .floating-wrap {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        z-index: 900;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.6rem;
    }

    /* ── FABs ── */
    .fab {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
        text-decoration: none;
        animation: fabIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .fab:nth-child(2) {
        animation-delay: 0.05s;
    }
    .fab:nth-child(3) {
        animation-delay: 0.12s;
    }
    .fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
    }

    .a11y-fab {
        background: #1f2937;
        color: white;
    }
    .a11y-fab.open {
        background: #111827;
        transform: rotate(10deg) scale(1.05);
    }
    .wa-fab {
        background: #25d366;
        color: white;
    }
    .wa-fab:hover {
        background: #1fba59;
    }

    /* ── Panel ── */
    .a11y-panel {
        background: white;
        border: 1px solid #e5e7eb;
        padding: 0;
        width: 240px;
        max-height: min(560px, 80vh);
        overflow-y: auto;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        animation: panelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .panel-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 14px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #6b7280;
        border-bottom: 1px solid #f3f4f6;
        background: #f9fafb;
        position: sticky;
        top: 0;
    }

    .ps {
        padding: 10px 14px;
    }
    .sl {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #9ca3af;
        margin-bottom: 7px;
    }
    .divider {
        height: 1px;
        background: #f3f4f6;
    }
    .hint {
        font-size: 10px;
        color: #9ca3af;
        margin-top: 4px;
        text-align: center;
    }

    /* Font size row */
    .row {
        display: flex;
        gap: 5px;
    }
    .sz-btn {
        flex: 1;
        height: 34px;
        border: 1px solid #e5e7eb;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #111827;
        transition:
            border-color 0.13s,
            background 0.13s;
    }
    .sz-btn:hover:not(:disabled) {
        border-color: #16a34a;
        background: #f0fdf4;
    }
    .sz-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
    .sz-btn.mid {
        color: #6b7280;
    }

    /* Theme toggle */
    .toggle-row {
        display: flex;
        gap: 5px;
    }
    .theme-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 7px 6px;
        border: 1px solid #e5e7eb;
        background: white;
        font-size: 11px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.13s;
    }
    .theme-btn:hover {
        border-color: #374151;
    }
    .theme-btn.active {
        background: #f3f4f6;
        border-color: #374151;
    }
    .theme-btn.dark-opt.active {
        background: #111827;
        border-color: #111827;
        color: white;
    }

    /* Toggle buttons */
    .tog-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 10px;
        border: 1px solid #e5e7eb;
        background: white;
        font-size: 11px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.13s;
        text-align: left;
    }
    .tog-btn:hover {
        border-color: #374151;
        background: #f9fafb;
    }
    .tog-btn.on {
        background: #111827;
        border-color: #111827;
        color: white;
    }
    .tog-btn.speak.on {
        background: #dc2626;
        border-color: #dc2626;
    }

    /* Color blind grid */
    .cb-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
    }
    .cb-btn {
        padding: 6px 4px;
        border: 1px solid #e5e7eb;
        background: white;
        font-size: 10px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.13s;
    }
    .cb-btn:hover {
        border-color: #374151;
    }
    .cb-btn.active {
        background: #1f2937;
        border-color: #1f2937;
        color: white;
    }

    /* ── Animations ── */
    @keyframes fabIn {
        from {
            opacity: 0;
            transform: scale(0.7) translateY(8px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    @keyframes panelIn {
        from {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    /* ── Global overrides ── */
    :global(.a11y-dark) {
        filter: invert(0.9) hue-rotate(180deg);
    }
    :global(.a11y-dark img),
    :global(.a11y-dark video),
    :global(.a11y-dark [style*="background-image"]) {
        filter: invert(1) hue-rotate(180deg);
    }

    :global(.a11y-readable) {
        line-height: 1.9 !important;
        letter-spacing: 0.04em !important;
        word-spacing: 0.1em !important;
    }
    :global(.a11y-readable p),
    :global(.a11y-readable li),
    :global(.a11y-readable span),
    :global(.a11y-readable a) {
        font-family: "Trebuchet MS", Arial, sans-serif !important;
        line-height: 1.9 !important;
    }

    :global(.a11y-no-motion *),
    :global(.a11y-no-motion *::before),
    :global(.a11y-no-motion *::after) {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
    }
</style>
