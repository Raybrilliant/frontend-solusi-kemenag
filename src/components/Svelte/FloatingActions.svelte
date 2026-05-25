<script>
    const WA_NUMBER = "6281359136007";
    const WA_MESSAGE = "Halo, saya ingin bertanya mengenai layanan Kementerian Agama Kota Probolinggo.";
    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

    const BASE_SIZE = 16;

    // ── state ──────────────────────────────────────────────
    let a11yOpen   = $state(false);
    let fontSize   = $state(0);       // -2 … +4
    let darkMode   = $state(false);
    let readable   = $state(false);   // spacing + font
    let noMotion   = $state(false);
    let speaking   = $state(false);
    let colorBlind = $state("none");  // none | protanopia | deuteranopia | tritanopia | mono

    // ── apply helpers ──────────────────────────────────────
    const html = () => document.documentElement;

    function save(key, val) { localStorage.setItem("a11y-" + key, String(val)); }

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
    function incFont()   { if (fontSize < 4)  { fontSize++;  applyFontSize(fontSize); } }
    function decFont()   { if (fontSize > -2) { fontSize--;  applyFontSize(fontSize); } }
    function resetFont() { fontSize = 0; applyFontSize(0); }

    function toggleDark()     { darkMode   = !darkMode;   applyDark(darkMode); }
    function toggleReadable() { readable   = !readable;   applyReadable(readable); }
    function toggleNoMotion() { noMotion   = !noMotion;   applyNoMotion(noMotion); }

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
        const text = document.querySelector("main")?.innerText
            ?? document.body.innerText;
        const utt = new SpeechSynthesisUtterance(text.slice(0, 5000));
        utt.lang = "id-ID";
        utt.rate = 0.9;
        utt.onend = () => { speaking = false; };
        utt.onerror = () => { speaking = false; };
        window.speechSynthesis.speak(utt);
        speaking = true;
    }

    // ── restore on mount ───────────────────────────────────
    $effect(() => {
        const f  = parseInt(localStorage.getItem("a11y-font") ?? "0", 10);
        const d  = localStorage.getItem("a11y-dark") === "1";
        const r  = localStorage.getItem("a11y-readable") === "1";
        const m  = localStorage.getItem("a11y-motion") === "1";
        const cb = localStorage.getItem("a11y-cb") ?? "none";

        fontSize   = f;  if (f)  applyFontSize(f);
        darkMode   = d;  if (d)  applyDark(true);
        readable   = r;  if (r)  applyReadable(true);
        noMotion   = m;  if (m)  applyNoMotion(true);
        colorBlind = cb; if (cb !== "none") applyColorBlind(cb);

        return () => { window.speechSynthesis?.cancel(); };
    });

    function onKeydown(e) { if (e.key === "Escape") a11yOpen = false; }

    const CB_OPTS = [
        { id: "none",         label: "Normal" },
        { id: "protanopia",   label: "Protanopia" },
        { id: "deuteranopia", label: "Deuteranopia" },
        { id: "tritanopia",   label: "Tritanopia" },
        { id: "mono",         label: "Monokrom" },
    ];
</script>

<!-- SVG color-blind filter definitions (hidden) -->
<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
    <defs>
        <filter id="cb-protanopia">
            <feColorMatrix type="matrix" values="
                0.567 0.433 0     0 0
                0.558 0.442 0     0 0
                0     0.242 0.758 0 0
                0     0     0     1 0"/>
        </filter>
        <filter id="cb-deuteranopia">
            <feColorMatrix type="matrix" values="
                0.625 0.375 0   0 0
                0.700 0.300 0   0 0
                0     0.300 0.7 0 0
                0     0     0   1 0"/>
        </filter>
        <filter id="cb-tritanopia">
            <feColorMatrix type="matrix" values="
                0.95  0.05  0     0 0
                0     0.433 0.567 0 0
                0     0.475 0.525 0 0
                0     0     0     1 0"/>
        </filter>
        <filter id="cb-mono">
            <feColorMatrix type="saturate" values="0"/>
        </filter>
    </defs>
</svg>

<svelte:window onkeydown={onKeydown} />

<div class="floating-wrap">

    <!-- Panel -->
    {#if a11yOpen}
        <div class="a11y-panel" role="dialog" aria-label="Panel Aksesibilitas">

            <div class="panel-header">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>
                Aksesibilitas
            </div>

            <!-- 1. Ukuran Teks -->
            <section class="ps">
                <p class="sl">Ukuran Teks</p>
                <div class="row">
                    <button onclick={decFont}   disabled={fontSize <= -2} class="sz-btn" aria-label="Perkecil"><span style="font-size:11px;font-weight:800;line-height:1">A</span></button>
                    <button onclick={resetFont}                            class="sz-btn mid" aria-label="Reset"><span style="font-size:14px;font-weight:800;line-height:1">A</span></button>
                    <button onclick={incFont}   disabled={fontSize >= 4}  class="sz-btn" aria-label="Perbesar"><span style="font-size:18px;font-weight:800;line-height:1">A</span></button>
                </div>
                {#if fontSize !== 0}<p class="hint">{fontSize > 0 ? "+" : ""}{fontSize}px dari normal</p>{/if}
            </section>

            <div class="divider"></div>

            <!-- 2. Tema -->
            <section class="ps">
                <p class="sl">Tema</p>
                <div class="toggle-row">
                    <button onclick={() => { if (darkMode) toggleDark(); }} class="theme-btn {!darkMode ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg>
                        Terang
                    </button>
                    <button onclick={() => { if (!darkMode) toggleDark(); }} class="theme-btn dark-opt {darkMode ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
                        Gelap
                    </button>
                </div>
            </section>

            <div class="divider"></div>

            <!-- 3. Keterbacaan -->
            <section class="ps">
                <p class="sl">Keterbacaan</p>
                <button onclick={toggleReadable} class="tog-btn {readable ? 'on' : ''}">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1z"/></svg>
                    {readable ? "Nonaktifkan" : "Aktifkan"} Spasi & Font
                </button>
            </section>

            <div class="divider"></div>

            <!-- 4. Kurangi Animasi -->
            <section class="ps">
                <p class="sl">Kurangi Animasi</p>
                <button onclick={toggleNoMotion} class="tog-btn {noMotion ? 'on' : ''}">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M13 2.05v2.02c3.95.49 7 3.85 7 7.93 0 3.21-1.81 6-4.72 7.28L13 17v5h5l-1.22-1.22C19.91 19.07 22 15.76 22 12c0-5.18-3.95-9.45-9-9.95zM11 2.05C5.95 2.55 2 6.82 2 12c0 3.76 2.09 7.07 5.22 8.78L6 22h5V2.05z"/></svg>
                    {noMotion ? "Nonaktifkan" : "Aktifkan"} Pengurangan
                </button>
            </section>

            <div class="divider"></div>

            <!-- 5. Baca Teks -->
            <section class="ps">
                <p class="sl">Baca Teks</p>
                <button onclick={toggleSpeak} class="tog-btn speak {speaking ? 'on speaking' : ''}">
                    {#if speaking}
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
                        Hentikan Pembacaan
                    {:else}
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
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
                            class="cb-btn {colorBlind === opt.id ? 'active' : ''}"
                        >{opt.label}</button>
                    {/each}
                </div>
            </section>

        </div>
    {/if}

    <!-- FAB: Accessibility -->
    <button
        onclick={() => a11yOpen = !a11yOpen}
        class="fab a11y-fab {a11yOpen ? 'open' : ''}"
        aria-label="Panel aksesibilitas"
        aria-expanded={a11yOpen}
        title="Aksesibilitas"
    >
        <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor">
            <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
        </svg>
    </button>

    <!-- FAB: WhatsApp -->
    <a href={waUrl} target="_blank" rel="noopener noreferrer"
       class="fab wa-fab" aria-label="Hubungi WhatsApp Center" title="Hubungi WA Center">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
        </svg>
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
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        text-decoration: none;
        animation: fabIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
    }
    .fab:nth-child(2) { animation-delay: 0.05s; }
    .fab:nth-child(3) { animation-delay: 0.12s; }
    .fab:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }

    .a11y-fab { background: #1f2937; color: white; }
    .a11y-fab.open { background: #111827; transform: rotate(10deg) scale(1.05); }
    .wa-fab { background: #25d366; color: white; }
    .wa-fab:hover { background: #1fba59; }

    /* ── Panel ── */
    .a11y-panel {
        background: white;
        border: 1px solid #e5e7eb;
        padding: 0;
        width: 240px;
        max-height: min(560px, 80vh);
        overflow-y: auto;
        box-shadow: 0 12px 32px rgba(0,0,0,0.15);
        animation: panelIn 0.22s cubic-bezier(0.16,1,0.3,1) both;
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

    .ps { padding: 10px 14px; }
    .sl {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #9ca3af;
        margin-bottom: 7px;
    }
    .divider { height: 1px; background: #f3f4f6; }
    .hint { font-size: 10px; color: #9ca3af; margin-top: 4px; text-align: center; }

    /* Font size row */
    .row { display: flex; gap: 5px; }
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
        transition: border-color 0.13s, background 0.13s;
    }
    .sz-btn:hover:not(:disabled) { border-color: #16a34a; background: #f0fdf4; }
    .sz-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .sz-btn.mid { color: #6b7280; }

    /* Theme toggle */
    .toggle-row { display: flex; gap: 5px; }
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
    .theme-btn:hover { border-color: #374151; }
    .theme-btn.active { background: #f3f4f6; border-color: #374151; }
    .theme-btn.dark-opt.active { background: #111827; border-color: #111827; color: white; }

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
    .tog-btn:hover { border-color: #374151; background: #f9fafb; }
    .tog-btn.on { background: #111827; border-color: #111827; color: white; }
    .tog-btn.speak.on { background: #dc2626; border-color: #dc2626; }

    /* Color blind grid */
    .cb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
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
    .cb-btn:hover { border-color: #374151; }
    .cb-btn.active { background: #1f2937; border-color: #1f2937; color: white; }

    /* ── Animations ── */
    @keyframes fabIn {
        from { opacity: 0; transform: scale(0.7) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes panelIn {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
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
        font-family: 'Trebuchet MS', Arial, sans-serif !important;
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
