<script>
    import {
        tanggalPeriode,
        kategoriWarna,
        kategoriConfig,
    } from "../../lib/ppid-kalender";

    let { items = [] } = $props();

    const BULAN_NAMA = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    // Senin-Minggu
    const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

    const now = new Date();
    let viewYear = $state(now.getFullYear());
    let viewMonth = $state(now.getMonth());
    let selectedDay = $state(/** @type {number|null} */ (null));

    const hariIni = {
        y: now.getFullYear(),
        m: now.getMonth(),
        d: now.getDate(),
    };

    // Precompute tanggal hasil parse untuk tiap entri
    const entri = $derived(
        items.map((it) => /** @type {any} */ ({ ...it, tgl: tanggalPeriode(it.periode) })),
    );

    /** Cocok untuk dot kalender: entri sepanjang bulan ditandai di tanggal 1. */
    function cocokHari(t, y, m, d) {
        return (
            (t.year === null || t.year === y) &&
            (t.month === null || t.month === m) &&
            (t.day === null ? d === 1 : t.day === d)
        );
    }

    /** Cocok untuk panel agenda bulan: cukup bulan (dan tahun) sama. */
    function cocokBulan(t, y, m) {
        return (
            (t.year === null || t.year === y) &&
            (t.month === null || t.month === m)
        );
    }

    function hariPertama(t) {
        return t.tgl.reduce(
            (min, x) => (x.day === null ? min : Math.min(min, x.day)),
            32,
        );
    }

    // ── Grid kalender (Senin-Minggu) ────────────────────────────
    const sel = $derived.by(() => {
        const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Minggu
        const offset = (firstDow + 6) % 7; // offset dari Senin
        const jmlHari = new Date(viewYear, viewMonth + 1, 0).getDate();
        const jmlHariPrev = new Date(viewYear, viewMonth, 0).getDate();

        const cells = [];
        for (let i = offset - 1; i >= 0; i--) {
            cells.push(cellFor(viewYear, viewMonth - 1, jmlHariPrev - i, false));
        }
        for (let d = 1; d <= jmlHari; d++) {
            cells.push(cellFor(viewYear, viewMonth, d, true));
        }
        let next = 1;
        while (cells.length % 7 !== 0 || cells.length < 35) {
            cells.push(cellFor(viewYear, viewMonth + 1, next++, false));
        }
        return cells;
    });

    function cellFor(y, m, d, inMonth) {
        // Normalisasi bulan overflow/underflow
        const dt = new Date(y, m, d);
        const yy = dt.getFullYear();
        const mm = dt.getMonth();
        const agenda = entri.filter((e) =>
            e.tgl.some((t) => cocokHari(t, yy, mm, d)),
        );
        return {
            y: yy, m: mm, d,
            inMonth: inMonth && yy === viewYear && mm === viewMonth,
            isToday: yy === hariIni.y && mm === hariIni.m && d === hariIni.d,
            agenda,
        };
    }

    // ── Panel agenda bulan terpilih ─────────────────────────────
    const agendaBulan = $derived(
        entri
            .filter((e) => e.tgl.some((t) => cocokBulan(t, viewYear, viewMonth)))
            .sort((a, b) => hariPertama(a) - hariPertama(b)),
    );
    const agendaTampil = $derived(
        selectedDay === null
            ? agendaBulan
            : agendaBulan.filter((e) =>
                  e.tgl.some((t) => cocokHari(t, viewYear, viewMonth, selectedDay)),
              ),
    );

    function pilihHari(d) {
        selectedDay = selectedDay === d ? null : d;
    }

    function navigasi(delta) {
        const dt = new Date(viewYear, viewMonth + delta, 1);
        viewYear = dt.getFullYear();
        viewMonth = dt.getMonth();
        selectedDay = null;
    }

    function keBulanIni() {
        viewYear = hariIni.y;
        viewMonth = hariIni.m;
        selectedDay = null;
    }

    function warnaDot(kategori) {
        return kategoriWarna[kategori]?.dot ?? "bg-ink/40";
    }
    function warnaChip(kategori) {
        return kategoriWarna[kategori]?.chip ?? "bg-ink/8 text-ink/60";
    }
    function labelKategori(kategori) {
        return kategoriConfig(kategori)?.label ?? kategori;
    }
</script>

<div class="border border-ink/10 bg-cream">
    <!-- ── Toolbar ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-ink/10 bg-white">
        <div class="flex items-center gap-1">
            <button
                onclick={() => navigasi(-1)}
                aria-label="Bulan sebelumnya"
                class="w-8 h-8 flex items-center justify-center border border-ink/15 text-ink/60 hover:border-green hover:text-green transition-colors"
            >‹</button>
            <button
                onclick={() => navigasi(1)}
                aria-label="Bulan berikutnya"
                class="w-8 h-8 flex items-center justify-center border border-ink/15 text-ink/60 hover:border-green hover:text-green transition-colors"
            >›</button>
        </div>
        <p class="text-sm font-extrabold uppercase tracking-tight text-ink">
            {BULAN_NAMA[viewMonth]} {viewYear}
        </p>
        <button
            onclick={keBulanIni}
            class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-ink/15 text-ink/50 hover:border-green hover:text-green transition-colors"
        >Bulan ini</button>
        <span class="ml-auto text-xs text-ink/40 hidden sm:block">
            {selectedDay === null
                ? "Klik tanggal untuk filter"
                : `Kegiatan tanggal ${selectedDay}`}
        </span>
    </div>

    <!-- ── Legenda ─────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 border-b border-ink/8 text-[10px] font-semibold uppercase tracking-wide text-ink/45">
        {#each Object.keys(kategoriWarna) as kat}
            <span class="inline-flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full {warnaDot(kat)}"></span>
                {labelKategori(kat)}
            </span>
        {/each}
    </div>

    <!-- ── Grid kalender ───────────────────────────────────────── -->
    <div class="bg-ink/5 gap-px grid grid-cols-7">
        {#each HARI as h}
            <div class="bg-ink/4 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-ink/45">
                {h}
            </div>
        {/each}
        {#each sel as c}
            <button
                onclick={() => pilihHari(c.d)}
                aria-pressed={selectedDay === c.d}
                aria-label={`Tanggal ${c.d} ${BULAN_NAMA[c.m]} — ${c.agenda.length} kegiatan`}
                class="relative min-h-[64px] md:min-h-[92px] p-1.5 md:p-2 text-left align-top transition-colors {c.inMonth ? 'bg-white' : 'bg-ink/2'} {selectedDay === c.d ? 'ring-2 ring-inset ring-green' : 'hover:bg-green/4'}"
            >
                <span
                    class="inline-flex items-center justify-center w-6 h-6 text-xs font-bold {c.isToday ? 'bg-green text-white rounded-full' : c.inMonth ? 'text-ink' : 'text-ink/30'}"
                >{c.d}</span>
                <!-- Dots (mobile) -->
                <span class="flex gap-1 mt-1 md:hidden">
                    {#each c.agenda.slice(0, 4) as a}
                        <span class="w-1.5 h-1.5 rounded-full {warnaDot(a.kategori)}"></span>
                    {/each}
                    {#if c.agenda.length > 4}
                        <span class="text-[8px] text-ink/40">+{c.agenda.length - 4}</span>
                    {/if}
                </span>
                <!-- Chips (desktop) -->
                <span class="hidden md:flex flex-col gap-1 mt-1.5">
                    {#each c.agenda.slice(0, 2) as a}
                        <span class="block text-[9px] font-semibold leading-tight px-1 py-0.5 truncate {warnaChip(a.kategori)}">
                            {a.kegiatan}
                        </span>
                    {/each}
                    {#if c.agenda.length > 2}
                        <span class="text-[9px] text-ink/40 pl-1">+{c.agenda.length - 2} lainnya</span>
                    {/if}
                </span>
            </button>
        {/each}
    </div>

    <!-- ── Panel agenda ────────────────────────────────────────── -->
    <div class="border-t border-ink/10 bg-white px-4 py-4">
        <div class="flex items-center gap-2 mb-3">
            <p class="text-xs font-bold uppercase tracking-wider text-ink/60">
                {#if selectedDay === null}
                    Agenda {BULAN_NAMA[viewMonth]} {viewYear}
                {:else}
                    Agenda {selectedDay} {BULAN_NAMA[viewMonth]} {viewYear}
                {/if}
                <span class="text-ink/35 font-semibold">· {agendaTampil.length} kegiatan</span>
            </p>
            {#if selectedDay !== null}
                <button
                    onclick={() => (selectedDay = null)}
                    class="ml-auto text-[10px] font-bold uppercase tracking-wider text-green hover:underline"
                >Tampilkan semua</button>
            {/if}
        </div>

        {#if agendaTampil.length === 0}
            <p class="py-8 text-center text-sm text-ink/35">
                Tidak ada kegiatan terjadwal.
            </p>
        {:else}
            <ul class="flex flex-col divide-y divide-ink/6">
                {#each agendaTampil as a (a.id)}
                    <li class="py-2.5 flex items-start gap-3">
                        <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 {warnaDot(a.kategori)}"></span>
                        <div class="min-w-0">
                            <p class="text-[10px] font-bold uppercase tracking-wide {warnaChip(a.kategori)} inline-block px-1.5 py-0.5">
                                {a.periode}
                            </p>
                            <p class="text-sm font-medium text-ink leading-snug mt-1">
                                {a.kegiatan}
                            </p>
                            {#if a.pihak}
                                <p class="text-xs text-ink/45 mt-0.5">PJ: {a.pihak}</p>
                            {/if}
                            {#if a.keluaran}
                                <p class="text-xs text-ink/45 mt-0.5">Keluaran: {a.keluaran}</p>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>
