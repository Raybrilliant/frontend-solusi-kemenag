<script>
    import Icon from "@iconify/svelte";

    const WA_NUMBER = "6287838100425";
    const WA_MESSAGE =
        "Halo, saya ingin bertanya mengenai layanan Kementerian Agama Kota Probolinggo.";
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;
    const AI_URL = "https://tanya.kemenagkotaprobolinggo.id/";

    const BASE_SIZE = 16;

    // ── state ──────────────────────────────────────────────
    let a11yOpen = $state(false);
    let contactOpen = $state(false);
    let fontSize = $state(0); // -2 … +4
    let darkMode = $state(false);
    let contrast = $state(false); // high contrast
    let readable = $state(false); // spacing + font
    let underlineLinks = $state(false);
    let bigCursor = $state(false);
    let readingGuide = $state(false);
    let noMotion = $state(false);
    let speaking = $state(false);
    let colorBlind = $state("none"); // none | protanopia | deuteranopia | tritanopia | mono
    let guideEl = $state(null);

    // ── apply helpers ──────────────────────────────────────
    const html = () => document.documentElement;

    // url() filter refs are ignored on the root element in Gecko, and a
    // filter on <body> makes it the containing block for position:fixed —
    // so fixed UI is portaled to <html> to stay viewport-pinned.
    function portal(node) {
        document.documentElement.appendChild(node);
        return {
            destroy() {
                node.remove();
            },
        };
    }

    function save(key, val) {
        localStorage.setItem("a11y-" + key, String(val));
    }

    function applyFontSize(step) {
        html().style.fontSize = `${BASE_SIZE + step}px`;
        save("font", step);
    }
    function applyFilters() {
        html().style.filter = darkMode
            ? "invert(0.9) hue-rotate(180deg)"
            : "";
        document.body.style.filter =
            colorBlind !== "none" ? `url(#cb-${colorBlind})` : "";
    }
    function applyDark(on) {
        html().classList.toggle("a11y-dark", on);
        save("dark", on ? "1" : "0");
    }
    function applyContrast(on) {
        html().classList.toggle("a11y-contrast", on);
        save("contrast", on ? "1" : "0");
    }
    function applyLinks(on) {
        html().classList.toggle("a11y-links", on);
        save("links", on ? "1" : "0");
    }
    function applyCursor(on) {
        html().classList.toggle("a11y-cursor", on);
        save("cursor", on ? "1" : "0");
    }
    function applyGuide(on) {
        html().classList.toggle("a11y-guide", on);
        save("guide", on ? "1" : "0");
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
        save("cb", mode);
        applyFilters();
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
        if (darkMode && contrast) {
            contrast = false;
            applyContrast(false);
        }
        applyDark(darkMode);
        applyFilters();
    }
    function toggleReadable() {
        readable = !readable;
        applyReadable(readable);
    }
    function toggleNoMotion() {
        noMotion = !noMotion;
        applyNoMotion(noMotion);
    }
    function toggleContrast() {
        contrast = !contrast;
        if (contrast && darkMode) {
            darkMode = false;
            applyDark(false);
        }
        applyContrast(contrast);
        applyFilters();
    }
    function toggleLinks() {
        underlineLinks = !underlineLinks;
        applyLinks(underlineLinks);
    }
    function toggleCursor() {
        bigCursor = !bigCursor;
        applyCursor(bigCursor);
    }
    function toggleGuide() {
        readingGuide = !readingGuide;
        applyGuide(readingGuide);
    }
    function onMousemove(e) {
        if (!readingGuide || !guideEl) return;
        guideEl.style.top = `${e.clientY - 30}px`;
    }
    function resetAll() {
        fontSize = 0;
        applyFontSize(0);
        darkMode = false;
        applyDark(false);
        contrast = false;
        applyContrast(false);
        readable = false;
        applyReadable(false);
        underlineLinks = false;
        applyLinks(false);
        bigCursor = false;
        applyCursor(false);
        readingGuide = false;
        applyGuide(false);
        noMotion = false;
        applyNoMotion(false);
        colorBlind = "none";
        applyFilters();
        window.speechSynthesis?.cancel();
        speaking = false;
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
        const c = localStorage.getItem("a11y-contrast") === "1" && !d;
        const r = localStorage.getItem("a11y-readable") === "1";
        const l = localStorage.getItem("a11y-links") === "1";
        const cu = localStorage.getItem("a11y-cursor") === "1";
        const g = localStorage.getItem("a11y-guide") === "1";
        const m = localStorage.getItem("a11y-motion") === "1";
        const cb = localStorage.getItem("a11y-cb") ?? "none";

        fontSize = f;
        if (f) applyFontSize(f);
        darkMode = d;
        if (d) applyDark(true);
        contrast = c;
        if (c) applyContrast(true);
        readable = r;
        if (r) applyReadable(true);
        underlineLinks = l;
        if (l) applyLinks(true);
        bigCursor = cu;
        if (cu) applyCursor(true);
        readingGuide = g;
        if (g) applyGuide(true);
        noMotion = m;
        if (m) applyNoMotion(true);
        colorBlind = cb;
        html().style.filter = d
            ? "invert(0.9) hue-rotate(180deg)"
            : "";
        document.body.style.filter = cb !== "none" ? `url(#cb-${cb})` : "";

        return () => {
            window.speechSynthesis?.cancel();
        };
    });

    function onKeydown(e) {
        if (e.key === "Escape") {
            a11yOpen = false;
            contactOpen = false;
        }
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

<svelte:window onkeydown={onKeydown} onmousemove={onMousemove} />

{#if readingGuide}
    <div
        class="reading-guide"
        bind:this={guideEl}
        use:portal
        style="top: 40vh"
    ></div>
{/if}

<div class="floating-wrap" use:portal>
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

            <!-- 3. Kontras Tinggi -->
            <section class="ps">
                <p class="sl">Kontras Tinggi</p>
                <button
                    onclick={toggleContrast}
                    class="tog-btn {contrast ? 'on' : ''}"
                    aria-pressed={contrast}
                >
                    <Icon icon="mdi:contrast-circle" width="13" height="13" />
                    {contrast ? "Nonaktifkan" : "Aktifkan"} Kontras
                </button>
            </section>

            <div class="divider"></div>

            <!-- 4. Keterbacaan -->
            <section class="ps">
                <p class="sl">Keterbacaan</p>
                <button
                    onclick={toggleReadable}
                    class="tog-btn {readable ? 'on' : ''}"
                    aria-pressed={readable}
                >
                    <Icon
                        icon="mdi:book-open-page-variant"
                        width="13"
                        height="13"
                    />
                    {readable ? "Nonaktifkan" : "Aktifkan"} Spasi & Font
                </button>
                <button
                    onclick={toggleLinks}
                    class="tog-btn {underlineLinks ? 'on' : ''}"
                    aria-pressed={underlineLinks}
                >
                    <Icon icon="mdi:format-underline" width="13" height="13" />
                    {underlineLinks ? "Nonaktifkan" : "Aktifkan"} Garis Bawah
                    Tautan
                </button>
            </section>

            <div class="divider"></div>

            <!-- 5. Panduan Baca -->
            <section class="ps">
                <p class="sl">Panduan Baca</p>
                <button
                    onclick={toggleGuide}
                    class="tog-btn {readingGuide ? 'on' : ''}"
                    aria-pressed={readingGuide}
                >
                    <Icon icon="mdi:ruler" width="13" height="13" />
                    {readingGuide ? "Nonaktifkan" : "Aktifkan"} Garis Bantu
                </button>
            </section>

            <div class="divider"></div>

            <!-- 6. Kursor Besar -->
            <section class="ps">
                <p class="sl">Kursor Besar</p>
                <button
                    onclick={toggleCursor}
                    class="tog-btn {bigCursor ? 'on' : ''}"
                    aria-pressed={bigCursor}
                >
                    <Icon
                        icon="mdi:cursor-default-outline"
                        width="13"
                        height="13"
                    />
                    {bigCursor ? "Nonaktifkan" : "Aktifkan"} Kursor Besar
                </button>
            </section>

            <div class="divider"></div>

            <!-- 7. Kurangi Animasi -->
            <section class="ps">
                <p class="sl">Kurangi Animasi</p>
                <button
                    onclick={toggleNoMotion}
                    class="tog-btn {noMotion ? 'on' : ''}"
                    aria-pressed={noMotion}
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

            <!-- 8. Baca Teks -->
            <section class="ps">
                <p class="sl">Baca Teks</p>
                <button
                    onclick={toggleSpeak}
                    class="tog-btn speak {speaking ? 'on speaking' : ''}"
                    aria-pressed={speaking}
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

            <!-- 9. Buta Warna -->
            <section class="ps">
                <p class="sl">Simulasi Buta Warna</p>
                <div class="cb-grid">
                    {#each CB_OPTS as opt (opt.id)}
                        <button
                            onclick={() => setColorBlind(opt.id)}
                            class="cb-btn {colorBlind === opt.id
                                ? 'active'
                                : ''}"
                            aria-pressed={colorBlind === opt.id}
                            >{opt.label}</button
                        >
                        {/each}
                    </div>
                </section>

                <div class="divider"></div>

                <section class="ps">
                    <button onclick={resetAll} class="reset-btn">
                        <Icon icon="mdi:restore" width="13" height="13" />
                        Reset Semua Pengaturan
                    </button>
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

    <!-- FAB: Hubungi Kami (WA / AI Assistant) -->
    {#if contactOpen}
        <div class="contact-menu" role="menu" aria-label="Pilih cara menghubungi">
            <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                class="contact-item"
                onclick={() => (contactOpen = false)}
            >
                <span class="ci-icon wa"><Icon icon="mdi:whatsapp" width="17" height="17" /></span>
                <span class="ci-text">
                    <strong>WhatsApp Center</strong>
                    <small>Chat langsung dengan petugas</small>
                </span>
            </a>
            <a
                href={AI_URL}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                class="contact-item"
                onclick={() => (contactOpen = false)}
            >
                <span class="ci-icon ai"><Icon icon="mdi:robot-outline" width="17" height="17" /></span>
                <span class="ci-text">
                    <strong>AI Assistant</strong>
                    <small>Tanya jawab otomatis 24 jam</small>
                </span>
            </a>
        </div>
    {/if}

    <button
        onclick={() => (contactOpen = !contactOpen)}
        class="fab wa-fab {contactOpen ? 'open' : ''}"
        aria-label="Pilihan menghubungi: WhatsApp atau AI Assistant"
        aria-expanded={contactOpen}
        title="Hubungi Kami"
    >
        <Icon icon={contactOpen ? "mdi:close" : "mdi:whatsapp"} width="21" height="21" />
    </button>
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
    .fab:nth-of-type(1) {
        animation-delay: 0.05s;
    }
    .fab:nth-of-type(2) {
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
    .wa-fab.open {
        background: #1fba59;
    }

    /* ── Contact menu ── */
    .contact-menu {
        background: white;
        border: 1px solid #e5e7eb;
        width: 230px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        animation: panelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .contact-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        text-decoration: none;
        color: #111827;
        transition: background 0.15s ease;
    }
    .contact-item:hover {
        background: #f3f4f6;
    }

    .ci-icon {
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        color: white;
    }
    .ci-icon.wa {
        background: #25d366;
    }
    .ci-icon.ai {
        background: #4f46e5;
    }

    .ci-text {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
    }
    .ci-text strong {
        font-size: 12px;
        font-weight: 700;
    }
    .ci-text small {
        font-size: 10.5px;
        color: #6b7280;
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
    .tog-btn + .tog-btn {
        margin-top: 5px;
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

    /* Reading guide band */
    .reading-guide {
        position: fixed;
        left: 0;
        right: 0;
        height: 60px;
        background: rgba(255, 235, 59, 0.22);
        border-top: 2px solid rgba(17, 24, 39, 0.6);
        border-bottom: 2px solid rgba(17, 24, 39, 0.6);
        pointer-events: none;
        z-index: 9990;
    }

    /* Reset all */
    .reset-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 7px 10px;
        border: 1px solid #fecaca;
        background: #fef2f2;
        font-size: 11px;
        font-weight: 700;
        color: #b91c1c;
        cursor: pointer;
        transition: all 0.13s;
    }
    .reset-btn:hover {
        background: #fee2e2;
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

    :global(.a11y-links a) {
        text-decoration: underline !important;
    }

    :global(.a11y-cursor),
    :global(.a11y-cursor *) {
        cursor: url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2232%22%20height=%2232%22%20viewBox=%220%200%2032%2032%22%3E%3Cpath%20d=%22M4%202%20L4%2027%20L10.5%2021%20L14.5%2030%20L19%2028%20L15%2019%20L24%2019%20Z%22%20fill=%22white%22%20stroke=%22black%22%20stroke-width=%222%22/%3E%3C/svg%3E') 4 2, auto !important;
    }

    :global(.a11y-contrast) {
        background: #000 !important;
    }
    :global(.a11y-contrast *:not(img):not(video):not(svg):not(path):not(iframe):not(canvas):not(picture):not(source)) {
        background-color: #000 !important;
        color: #ffe600 !important;
        border-color: #ffe600 !important;
        text-shadow: none !important;
        box-shadow: none !important;
    }
    :global(.a11y-contrast a) {
        color: #53d3ff !important;
    }
</style>
