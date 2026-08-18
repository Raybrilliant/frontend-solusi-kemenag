<script lang="ts">
    import Icon from "@iconify/svelte";
    import { kelurahanMap } from "../../lib/data.js";

    // Portal action: moves node to <body>
    function portal(node: HTMLElement) {
        document.body.appendChild(node);
        return {
            destroy() {
                node.parentNode?.removeChild(node);
            },
        };
    }

    type TamuRow = {
        id: number;
        ticketId: string;
        permohonanId: string | null;
        waNumber: string;
        nama: string;
        kecamatan: string;
        kelurahan: string;
        alamat: string;
        keperluanType: "layanan" | "lainnya";
        layananId: number | null;
        layananTitle: string | null;
        keperluanLainnya: string | null;
        createdAt: string;
    };

    type Stats = {
        today: number;
        thisWeek: number;
        thisMonth: number;
        total: number;
        byKeperluan: { label: string; count: number }[];
        daily: { date: string; count: number; layanan: number; lainnya: number }[];
    };

    let {
        canManage = false,
        canViewStats = false,
        initialStats = null as Stats | null,
    }: {
        canManage?: boolean;
        canViewStats?: boolean;
        initialStats?: Stats | null;
    } = $props();

    // ── State: stats ────────────────────────────────────────────
    let stats = $state<Stats | null>(initialStats);
    let statsLoading = $state(false);

    // ── State: list ─────────────────────────────────────────────
    let list = $state<TamuRow[]>([]);
    let listLoading = $state(false);
    let listError = $state("");
    let page = $state(1);
    let totalPages = $state(1);
    let searchQ = $state("");

    // ── State: modal tambah tamu ────────────────────────────────
    let open = $state(false);
    let step = $state<"form" | "success">("form");
    let waNumber = $state("");
    let nama = $state("");
    let kecamatan = $state("");
    let kelurahan = $state("");
    let alamat = $state("");
    let keperluanType = $state<"layanan" | "lainnya">("layanan");
    let selectedLayananId = $state<number | null>(null);
    let keperluanLainnya = $state("");
    let loading = $state(false);
    let error = $state("");
    let resultTicket = $state("");
    let resultPermohonanTicket = $state<string | null>(null);
    let copied = $state(false);
    let copiedPmh = $state(false);
    let waLooking = $state(false);
    let waFound = $state(false);

    // ── State: layanan dropdown ─────────────────────────────────
    let layananList = $state<any[]>([]);
    let layananLoaded = $state(false);
    let layananSearch = $state("");
    let layananDropdownOpen = $state(false);

    const kelurahanOptions = $derived(
        kecamatan ? (kelurahanMap[kecamatan] ?? []) : [],
    );

    const filteredLayanan = $derived.by(() => {
        const q = layananSearch.trim().toLowerCase();
        const offline = layananList.filter(
            (l) => l.type === "Offline" && l.audience !== "internal",
        );
        if (!q) return offline;
        return offline.filter(
            (l) =>
                l.title.toLowerCase().includes(q) ||
                l.categoryTitle?.toLowerCase().includes(q),
        );
    });

    const groupedLayanan = $derived.by(() => {
        const map: Record<string, any[]> = {};
        for (const l of filteredLayanan) {
            const cat = l.categoryTitle ?? "Lainnya";
            if (!map[cat]) map[cat] = [];
            map[cat].push(l);
        }
        return Object.entries(map);
    });

    const selectedLayanan = $derived(
        layananList.find((l) => l.id === selectedLayananId) ?? null,
    );

    // ── Stats helpers ───────────────────────────────────────────
    const maxDaily = $derived(
        stats ? Math.max(1, ...stats.daily.map((d) => d.count)) : 1,
    );

    const statCards = $derived([
        {
            label: "Hari Ini",
            value: stats?.today ?? 0,
            icon: "mdi:calendar-today",
            color: "bg-green text-white",
        },
        {
            label: "7 Hari",
            value: stats?.thisWeek ?? 0,
            icon: "mdi:calendar-week",
            color: "bg-yellow text-ink",
        },
        {
            label: "Bulan Ini",
            value: stats?.thisMonth ?? 0,
            icon: "mdi:calendar-month",
            color: "bg-ink text-white",
        },
        {
            label: "Total",
            value: stats?.total ?? 0,
            icon: "mdi:account-group",
            color: "bg-cream text-ink border border-ink/10",
        },
    ]);

    function formatDate(iso: string): string {
        const d = new Date(iso + "T00:00:00");
        return d.toLocaleDateString("id-ID", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });
    }

    function formatDateTime(iso: string): string {
        const d = new Date(iso);
        return d.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function keperluanLabel(row: TamuRow): string {
        if (row.keperluanType === "layanan") return row.layananTitle ?? "Layanan";
        return row.keperluanLainnya ?? "Lainnya";
    }

    // ── Fetch stats ─────────────────────────────────────────────
    async function fetchStats() {
        statsLoading = true;
        try {
            const res = await fetch("/api/admin/tamu/stats");
            const json = await res.json();
            if (json.success) stats = json.data;
        } catch {} finally {
            statsLoading = false;
        }
    }

    // ── Fetch list ──────────────────────────────────────────────
    async function fetchList() {
        listLoading = true;
        listError = "";
        try {
            const params = new URLSearchParams();
            if (searchQ.trim()) params.set("q", searchQ.trim());
            params.set("page", String(page));
            params.set("limit", "10");
            const res = await fetch(`/api/admin/tamu?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                list = json.data ?? [];
                totalPages = json.pagination?.totalPages ?? 1;
            } else {
                listError = json.message ?? "Gagal memuat data.";
            }
        } catch {
            listError = "Terjadi kesalahan jaringan.";
        } finally {
            listLoading = false;
        }
    }

    // ── Modal: load layanan ─────────────────────────────────────
    async function loadLayanan() {
        if (layananLoaded) return;
        try {
            const res = await fetch("/api/admin/layanan");
            const json = await res.json();
            layananList = json.data ?? [];
            layananLoaded = true;
        } catch {}
    }

    // ── Modal: WA lookup ────────────────────────────────────────
    let waDebounce: ReturnType<typeof setTimeout> | null = null;

    async function lookupWa() {
        const wa = waNumber.trim();
        if (wa.length < 8) {
            waFound = false;
            return;
        }
        waLooking = true;
        try {
            const res = await fetch(
                `/api/admin/tamu/by-wa?wa=${encodeURIComponent(wa)}`,
            );
            const json = await res.json();
            if (json.success && json.data) {
                nama = json.data.nama ?? "";
                kecamatan = json.data.kecamatan ?? "";
                kelurahan = json.data.kelurahan ?? "";
                alamat = json.data.alamat ?? "";
                waFound = true;
            } else {
                waFound = false;
            }
        } catch {
            waFound = false;
        } finally {
            waLooking = false;
        }
    }

    function onWaInput() {
        waFound = false;
        if (waDebounce) clearTimeout(waDebounce);
        waDebounce = setTimeout(() => lookupWa(), 600);
    }

    // ── Modal: open/close ───────────────────────────────────────
    function resetForm() {
        step = "form";
        waNumber = "";
        nama = "";
        kecamatan = "";
        kelurahan = "";
        alamat = "";
        keperluanType = "layanan";
        selectedLayananId = null;
        keperluanLainnya = "";
        layananSearch = "";
        layananDropdownOpen = false;
        error = "";
        resultTicket = "";
        resultPermohonanTicket = null;
        waFound = false;
    }

    function openModal() {
        resetForm();
        open = true;
        loadLayanan();
    }

    function closeModal() {
        open = false;
    }

    function selectLayanan(l: any) {
        selectedLayananId = l.id;
        layananDropdownOpen = false;
        layananSearch = "";
    }

    function clearLayanan() {
        selectedLayananId = null;
        layananSearch = "";
    }

    // ── Modal: submit ───────────────────────────────────────────
    async function submit() {
        error = "";
        if (!waNumber.trim()) {
            error = "Nomor WA wajib diisi.";
            return;
        }
        if (!nama.trim()) {
            error = "Nama wajib diisi.";
            return;
        }
        if (!kecamatan) {
            error = "Kecamatan wajib dipilih.";
            return;
        }
        if (!kelurahan) {
            error = "Kelurahan wajib dipilih.";
            return;
        }
        if (!alamat.trim()) {
            error = "Alamat wajib diisi.";
            return;
        }
        if (keperluanType === "layanan" && !selectedLayananId) {
            error = "Layanan wajib dipilih.";
            return;
        }
        if (keperluanType === "lainnya" && !keperluanLainnya.trim()) {
            error = "Keperluan lainnya wajib diisi.";
            return;
        }

        loading = true;
        try {
            const res = await fetch("/api/admin/tamu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    waNumber: waNumber.trim(),
                    nama: nama.trim(),
                    kecamatan,
                    kelurahan,
                    alamat: alamat.trim(),
                    keperluanType,
                    layananId: keperluanType === "layanan" ? selectedLayananId : undefined,
                    keperluanLainnya:
                        keperluanType === "lainnya" ? keperluanLainnya.trim() : undefined,
                }),
            });
            const json = await res.json();
            if (json.success) {
                resultTicket = json.data?.ticketId ?? "";
                resultPermohonanTicket = json.data?.permohonanId ?? null;
                step = "success";
                // Refresh stats & list
                fetchStats();
                fetchList();
            } else {
                error = json.message ?? "Gagal menambahkan tamu.";
            }
        } catch {
            error = "Terjadi kesalahan jaringan.";
        } finally {
            loading = false;
        }
    }

    async function copyTicket() {
        try {
            await navigator.clipboard.writeText(resultTicket);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        } catch {}
    }

    async function copyPermohonanTicket() {
        if (!resultPermohonanTicket) return;
        try {
            await navigator.clipboard.writeText(resultPermohonanTicket);
            copiedPmh = true;
            setTimeout(() => (copiedPmh = false), 2000);
        } catch {}
    }

    function onBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) closeModal();
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") closeModal();
    }

    function onSearchInput() {
        page = 1;
        fetchList();
    }

    let searchDebounce: ReturnType<typeof setTimeout> | null = null;
    function onSearchDebounced() {
        if (searchDebounce) clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => onSearchInput(), 400);
    }

    // ── Init ────────────────────────────────────────────────────
    $effect(() => {
        if (canViewStats) fetchList();
    });
</script>

<svelte:window onkeydown={onKeydown} />

<div class="px-8 py-6 space-y-6">
    <!-- ── Stat Cards ────────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {#each statCards as card}
            <div class="flex items-center gap-4 p-5 bg-white border border-black/8">
                <div class="w-12 h-12 {card.color} flex items-center justify-center shrink-0">
                    <Icon icon={card.icon} width="24" height="24" />
                </div>
                <div class="min-w-0">
                    <p class="text-2xl font-black leading-none">
                        {statsLoading ? "…" : card.value}
                    </p>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-ink/40 mt-1">
                        {card.label}
                    </p>
                </div>
            </div>
        {/each}
    </div>

    <!-- ── Chart + Keperluan breakdown ────────────────────────── -->
    <div class="grid lg:grid-cols-3 gap-6">
        <!-- Daily chart -->
        <div class="lg:col-span-2 bg-white border border-black/8 p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-sm font-bold uppercase tracking-tight">
                        Kunjungan 7 Hari Terakhir
                    </h3>
                    <p class="text-xs text-ink/40 mt-0.5">
                        Jumlah tamu per hari
                    </p>
                </div>
                <Icon icon="mdi:chart-bar" width="22" height="22" class="text-green" />
            </div>
            {#if stats && stats.daily.length > 0}
                <div class="flex items-end justify-between gap-2 h-40">
                    {#each stats.daily as d}
                        <div class="flex-1 flex flex-col items-center gap-2 group">
                            <div class="relative w-full flex flex-col justify-end h-full">
                                <!-- Tooltip -->
                                <div class="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-white text-[10px] font-bold px-2 py-1 whitespace-nowrap z-10">
                                    {d.count} tamu
                                </div>
                                <!-- Bar -->
                                <div
                                    class="w-full bg-green/80 group-hover:bg-green transition-colors"
                                    style="height: {(d.count / maxDaily) * 100}%; min-height: {d.count > 0 ? '4px' : '0'};"
                                ></div>
                            </div>
                            <span class="text-[10px] text-ink/50 font-medium whitespace-nowrap">
                                {formatDate(d.date)}
                            </span>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="flex items-center justify-center h-40 text-ink/30 text-sm">
                    Belum ada data kunjungan.
                </div>
            {/if}
        </div>

        <!-- Keperluan breakdown -->
        <div class="bg-white border border-black/8 p-6">
            <div class="flex items-center gap-2 mb-4">
                <Icon icon="mdi:chart-donut" width="20" height="20" class="text-green" />
                <h3 class="text-sm font-bold uppercase tracking-tight">
                    Keperluan Teratas
                </h3>
            </div>
            {#if stats && stats.byKeperluan.length > 0}
                <div class="space-y-3">
                    {#each stats.byKeperluan.slice(0, 6) as item, i}
                        <div>
                            <div class="flex items-center justify-between text-xs mb-1">
                                <span class="font-semibold truncate pr-2">{item.label}</span>
                                <span class="font-bold text-green shrink-0">{item.count}</span>
                            </div>
                            <div class="h-1.5 bg-ink/5">
                                <div
                                    class="h-full bg-green"
                                    style="width: {(item.count / (stats.byKeperluan[0]?.count ?? 1)) * 100}%;"
                                ></div>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="flex items-center justify-center h-32 text-ink/30 text-sm">
                    Belum ada data.
                </div>
            {/if}
        </div>
    </div>

    <!-- ── Tambah Tamu button + Recent list ──────────────────── -->
    <div class="bg-white border border-black/8">
        <div class="flex items-center justify-between px-6 py-4 border-b border-black/8">
            <div>
                <h3 class="text-sm font-bold uppercase tracking-tight">
                    Buku Tamu Terbaru
                </h3>
                <p class="text-xs text-ink/40 mt-0.5">
                    {canManage
                        ? "Daftar tamu yang dicatat oleh petugas."
                        : "Anda dapat melihat statistik kunjungan, namun tidak dapat menambah tamu."}
                </p>
            </div>
            {#if canManage}
                <button
                    type="button"
                    onclick={openModal}
                    class="flex items-center gap-2 bg-green text-white text-sm font-semibold px-4 py-2.5 hover:bg-green/90 transition shrink-0"
                >
                    <Icon icon="mdi:plus" width="16" height="16" />
                    Tambah Tamu
                </button>
            {/if}
        </div>

        <!-- Search -->
        {#if canViewStats}
            <div class="px-6 py-3 border-b border-black/5">
                <div class="relative max-w-sm">
                    <Icon
                        icon="mdi:magnify"
                        class="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30"
                        width="15"
                        height="15"
                    />
                    <input
                        type="text"
                        bind:value={searchQ}
                        oninput={onSearchDebounced}
                        placeholder="Cari nama / WA / tiket..."
                        class="w-full border border-black/10 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition"
                    />
                </div>
            </div>
        {/if}

        <!-- Table -->
        <div class="overflow-x-auto">
            {#if listLoading && list.length === 0}
                <div class="flex items-center justify-center py-16 text-ink/40 text-sm">
                    Memuat data...
                </div>
            {:else if listError}
                <div class="flex items-center justify-center py-16 text-red-500 text-sm">
                    {listError}
                </div>
            {:else if list.length === 0}
                <div class="flex flex-col items-center justify-center py-16 text-ink/30 text-sm gap-2">
                    <Icon icon="mdi:account-off" width="32" height="32" class="text-ink/20" />
                    Belum ada tamu tercatat.
                </div>
            {:else}
                <table class="w-full text-left text-sm">
                    <thead class="bg-cream/50 border-b border-black/8">
                        <tr>
                            <th class="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Tiket Tamu</th>
                            <th class="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">No. Permohonan</th>
                            <th class="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Nama</th>
                            <th class="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">WA</th>
                            <th class="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Keperluan</th>
                            <th class="px-6 py-3 font-bold text-[10px] uppercase tracking-wider">Waktu</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-black/5">
                        {#each list as row (row.id)}
                            <tr class="hover:bg-black/[0.02] transition-colors">
                                <td class="px-6 py-3 font-mono font-bold text-green whitespace-nowrap">
                                    {row.ticketId}
                                </td>
                                <td class="px-6 py-3 font-mono font-semibold text-amber-700 whitespace-nowrap">
                                    {#if row.permohonanId}
                                        {row.permohonanId}
                                    {:else}
                                        <span class="text-ink/20">—</span>
                                    {/if}
                                </td>
                                <td class="px-6 py-3 font-semibold whitespace-nowrap">{row.nama}</td>
                                <td class="px-6 py-3 text-ink/60 whitespace-nowrap">{row.waNumber}</td>
                                <td class="px-6 py-3">
                                    <span class="inline-flex items-center gap-1.5">
                                        {#if row.keperluanType === "layanan"}
                                            <span class="w-2 h-2 bg-green"></span>
                                        {:else}
                                            <span class="w-2 h-2 bg-yellow"></span>
                                        {/if}
                                        <span class="truncate max-w-[200px]">{keperluanLabel(row)}</span>
                                    </span>
                                </td>
                                <td class="px-6 py-3 text-ink/50 text-xs whitespace-nowrap">
                                    {formatDateTime(row.createdAt)}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
            <div class="flex items-center justify-between px-6 py-3 border-t border-black/5">
                <p class="text-xs text-ink/40">
                    Halaman {page} dari {totalPages}
                </p>
                <div class="flex gap-2">
                    <button
                        type="button"
                        onclick={() => { page = Math.max(1, page - 1); fetchList(); }}
                        disabled={page <= 1}
                        class="px-3 py-1.5 border border-black/10 text-xs font-semibold hover:bg-black/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        ← Prev
                    </button>
                    <button
                        type="button"
                        onclick={() => { page = Math.min(totalPages, page + 1); fetchList(); }}
                        disabled={page >= totalPages}
                        class="px-3 py-1.5 border border-black/10 text-xs font-semibold hover:bg-black/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Next →
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

<!-- ── Modal Tambah Tamu ──────────────────────────────────────── -->
{#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        use:portal
        class="modal-backdrop"
        onclick={onBackdropClick}
        role="dialog"
        aria-modal="true"
    >
        <div class="modal-box">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <div>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                        {step === "form" ? "Buku Tamu" : "Selesai"}
                    </p>
                    <h2 class="text-base font-bold uppercase tracking-tight">
                        {step === "form" ? "Tambah Tamu" : "Tamu Tercatat"}
                    </h2>
                </div>
                <button
                    onclick={closeModal}
                    class="text-ink/40 hover:text-ink transition p-1"
                >
                    <Icon icon="mdi:close" width="20" height="20" />
                </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto min-h-0">
                {#if step === "form"}
                    <div class="p-6 space-y-4">
                        <!-- WA Number with lookup -->
                        <div>
                            <label class="label">
                                Nomor WA *
                                {#if waLooking}
                                    <span class="text-green font-normal normal-case tracking-normal ml-1">mencari…</span>
                                {:else if waFound}
                                    <span class="text-green font-normal normal-case tracking-normal ml-1">✓ data ditemukan</span>
                                {/if}
                            </label>
                            <div class="relative">
                                <Icon
                                    icon="mdi:whatsapp"
                                    class="absolute left-3 top-1/2 -translate-y-1/2 text-green"
                                    width="16"
                                    height="16"
                                />
                                <input
                                    type="tel"
                                    bind:value={waNumber}
                                    oninput={onWaInput}
                                    class="inp pl-9"
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                            <p class="text-[11px] text-ink/40 mt-1">
                                Jika tamu pernah hadir, data akan otomatis terisi.
                            </p>
                        </div>

                        <!-- Nama -->
                        <div>
                            <label class="label">Nama *</label>
                            <input
                                type="text"
                                bind:value={nama}
                                class="inp"
                                placeholder="Nama lengkap tamu"
                            />
                        </div>

                        <!-- Kecamatan / Kelurahan -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="label">Kecamatan *</label>
                                <select
                                    bind:value={kecamatan}
                                    onchange={() => (kelurahan = "")}
                                    class="inp bg-white"
                                >
                                    <option value="">Pilih kecamatan</option>
                                    {#each Object.keys(kelurahanMap) as kec}
                                        <option value={kec}>{kec}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class="label">Kelurahan *</label>
                                <select
                                    bind:value={kelurahan}
                                    disabled={!kecamatan}
                                    class="inp bg-white disabled:opacity-50"
                                >
                                    <option value="">Pilih kelurahan</option>
                                    {#each kelurahanOptions as kel}
                                        <option value={kel}>{kel}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <!-- Alamat -->
                        <div>
                            <label class="label">Alamat *</label>
                            <textarea
                                bind:value={alamat}
                                rows="2"
                                class="inp resize-none"
                                placeholder="Alamat lengkap"
                            ></textarea>
                        </div>

                        <!-- Keperluan -->
                        <div>
                            <label class="label">Keperluan *</label>
                            <div class="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onclick={() => (keperluanType = "layanan")}
                                    class="flex-1 px-3 py-2 text-xs font-bold border transition {keperluanType === 'layanan' ? 'bg-green text-white border-green' : 'bg-white text-ink/60 border-black/10 hover:bg-black/5'}"
                                >
                                    <Icon icon="mdi:file-document-outline" width="14" height="14" class="inline mr-1" />
                                    Layanan
                                </button>
                                <button
                                    type="button"
                                    onclick={() => (keperluanType = "lainnya")}
                                    class="flex-1 px-3 py-2 text-xs font-bold border transition {keperluanType === 'lainnya' ? 'bg-green text-white border-green' : 'bg-white text-ink/60 border-black/10 hover:bg-black/5'}"
                                >
                                    <Icon icon="mdi:dots-horizontal" width="14" height="14" class="inline mr-1" />
                                    Lainnya
                                </button>
                            </div>

                            {#if keperluanType === "layanan"}
                                <!-- Searchable dropdown for offline layanan -->
                                <div class="relative">
                                    {#if selectedLayanan}
                                        <div class="flex items-center justify-between border border-green bg-green/5 px-3 py-2.5">
                                            <div class="min-w-0 flex-1">
                                                <p class="text-sm font-semibold truncate">{selectedLayanan.title}</p>
                                                <p class="text-[10px] text-ink/40 truncate">
                                                    {selectedLayanan.categoryTitle ?? ""}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onclick={clearLayanan}
                                                class="text-ink/40 hover:text-red-500 transition shrink-0 ml-2"
                                            >
                                                <Icon icon="mdi:close" width="16" height="16" />
                                            </button>
                                        </div>
                                    {:else}
                                        <button
                                            type="button"
                                            onclick={() => (layananDropdownOpen = !layananDropdownOpen)}
                                            class="w-full flex items-center justify-between border border-black/10 px-3 py-2.5 text-sm text-ink/50 hover:border-green transition"
                                        >
                                            <span>Pilih layanan offline…</span>
                                            <Icon icon="mdi:chevron-down" width="18" height="18" />
                                        </button>
                                    {/if}

                                    {#if layananDropdownOpen && !selectedLayanan}
                                        <div class="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-black/10 shadow-xl max-h-64 overflow-hidden flex flex-col">
                                            <div class="p-2 border-b border-black/5 shrink-0">
                                                <div class="relative">
                                                    <Icon
                                                        icon="mdi:magnify"
                                                        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30"
                                                        width="14"
                                                        height="14"
                                                    />
                                                    <input
                                                        type="text"
                                                        bind:value={layananSearch}
                                                        class="w-full border border-black/10 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green/40"
                                                        placeholder="Cari layanan..."
                                                    />
                                                </div>
                                            </div>
                                            <div class="overflow-y-auto flex-1">
                                                {#if !layananLoaded}
                                                    <div class="py-8 text-center text-ink/30 text-xs">
                                                        Memuat layanan...
                                                    </div>
                                                {:else if groupedLayanan.length === 0}
                                                    <div class="py-8 text-center text-ink/30 text-xs">
                                                        Tidak ditemukan.
                                                    </div>
                                                {:else}
                                                    {#each groupedLayanan as [cat, items]}
                                                        <div>
                                                            <p class="text-[9px] font-extrabold uppercase tracking-widest text-ink/30 px-3 py-1.5 bg-cream/30">
                                                                {cat}
                                                            </p>
                                                            {#each items as l}
                                                                <button
                                                                    type="button"
                                                                    onclick={() => selectLayanan(l)}
                                                                    class="w-full text-left px-3 py-2 text-sm hover:bg-green/5 transition border-b border-black/3"
                                                                >
                                                                    {l.title}
                                                                </button>
                                                            {/each}
                                                        </div>
                                                    {/each}
                                                {/if}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                <p class="text-[11px] text-ink/40 mt-1">
                                    Hanya layanan bersifat <span class="font-semibold">Offline</span> yang ditampilkan.
                                </p>
                            {:else}
                                <textarea
                                    bind:value={keperluanLainnya}
                                    rows="2"
                                    class="inp resize-none"
                                    placeholder="Jelaskan keperluan tamu secara manual..."
                                ></textarea>
                            {/if}
                        </div>

                        {#if error}
                            <p class="text-xs text-red-500 font-medium">{error}</p>
                        {/if}
                    </div>
                {:else}
                    <!-- Success step -->
                    <div class="p-8 flex flex-col items-center text-center gap-4">
                        <div class="w-16 h-16 bg-green flex items-center justify-center">
                            <Icon icon="mdi:check" width="32" height="32" class="text-white" />
                        </div>
                        <div>
                            <p class="font-bold text-lg uppercase tracking-tight">
                                Tamu Tercatat
                            </p>
                            <p class="text-sm text-ink/50 mt-1">
                                Berikan nomor tiket berikut kepada tamu
                            </p>
                        </div>

                        <!-- Tiket Tamu (untuk Survei) -->
                        <div class="w-full bg-green/5 border-2 border-green/30 px-6 py-5">
                            <div class="flex items-center gap-2 mb-1">
                                <Icon icon="mdi:clipboard-check-outline" width="14" height="14" class="text-green" />
                                <p class="text-[10px] font-bold uppercase tracking-widest text-green/60">
                                    Tiket Tamu (untuk Survei)
                                </p>
                            </div>
                            <p class="text-2xl font-black tracking-widest font-mono break-all">
                                {resultTicket}
                            </p>
                        </div>

                        <!-- Tiket Permohonan (untuk Cek Status) -->
                        {#if resultPermohonanTicket}
                            <div class="w-full bg-yellow/5 border-2 border-yellow/30 px-6 py-5">
                                <div class="flex items-center gap-2 mb-1">
                                    <Icon icon="mdi:progress-clock" width="14" height="14" class="text-amber-700" />
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                        No. Permohonan (untuk Cek Status)
                                    </p>
                                </div>
                                <p class="text-2xl font-black tracking-widest font-mono break-all text-amber-700">
                                    {resultPermohonanTicket}
                                </p>
                            </div>
                        {/if}

                        <!-- Action buttons -->
                        <div class="grid grid-cols-2 gap-3 w-full">
                            <button
                                onclick={copyTicket}
                                class="flex items-center justify-center gap-2 border border-green text-green text-sm font-semibold py-2.5 hover:bg-green/5 transition"
                            >
                                {#if copied}
                                    <Icon icon="mdi:check" width="14" height="14" />
                                    Tersalin!
                                {:else}
                                    <Icon icon="mdi:content-copy" width="14" height="14" />
                                    Salin Tiket Tamu
                                {/if}
                            </button>
                            <a
                                href="/survei?ticket={resultTicket}"
                                target="_blank"
                                class="flex items-center justify-center gap-2 bg-green text-white text-sm font-semibold py-2.5 hover:bg-green/90 transition"
                            >
                                <Icon icon="mdi:clipboard-check-outline" width="14" height="14" />
                                Isi Survei
                            </a>
                            {#if resultPermohonanTicket}
                                <button
                                    onclick={copyPermohonanTicket}
                                    class="flex items-center justify-center gap-2 border border-amber-600 text-amber-700 text-sm font-semibold py-2.5 hover:bg-amber-50 transition"
                                >
                                    {#if copiedPmh}
                                        <Icon icon="mdi:check" width="14" height="14" />
                                        Tersalin!
                                    {:else}
                                        <Icon icon="mdi:content-copy" width="14" height="14" />
                                        Salin No. Permohonan
                                    {/if}
                                </button>
                                <a
                                    href="/check-progress?kode={resultPermohonanTicket}"
                                    target="_blank"
                                    class="flex items-center justify-center gap-2 bg-yellow text-ink text-sm font-semibold py-2.5 hover:bg-yellow/80 transition"
                                >
                                    <Icon icon="mdi:progress-clock" width="14" height="14" />
                                    Cek Status
                                </a>
                            {/if}
                        </div>

                        <button
                            onclick={resetForm}
                            class="text-xs text-ink/40 hover:text-ink/60 transition underline"
                        >
                            Tambah tamu lagi
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Footer (form step only) -->
            {#if step === "form"}
                <div class="border-t px-6 py-4 flex gap-3 shrink-0">
                    <button
                        onclick={closeModal}
                        class="flex-1 border text-sm font-semibold py-2.5 hover:bg-black/5 transition"
                    >
                        Batal
                    </button>
                    <button
                        onclick={submit}
                        disabled={loading}
                        class="flex-1 bg-green text-white text-sm font-semibold py-2.5 hover:bg-green/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Menyimpan..." : "Simpan"}
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    @keyframes backdropIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    @keyframes modalIn {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(2px);
        padding: 1rem;
        animation: backdropIn 0.18s ease forwards;
    }
    .modal-box {
        background: white;
        width: 100%;
        max-width: 560px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .label {
        display: block;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #6b7280;
        margin-bottom: 4px;
    }
    .inp {
        width: 100%;
        border: 1px solid #e5e7eb;
        padding: 8px 12px;
        font-size: 14px;
        outline: none;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
    }
    .inp:focus {
        border-color: #16a34a;
        box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
    }
    /* Override padding-left ketika input punya icon di dalamnya */
    .inp.pl-9 {
        padding-left: 2.25rem;
    }
    .inp.pl-10 {
        padding-left: 2.5rem;
    }
</style>
