<script>
    import Icon from "@iconify/svelte";
    // Portal action: moves node to <body> so fixed positioning is never
    // trapped inside a CSS transform stacking context from parent elements.
    function portal(node) {
        document.body.appendChild(node);
        return { destroy() { node.parentNode?.removeChild(node); } };
    }

    const kelurahanMap = {
        Mayangan: ["Mayangan", "Mangunharjo", "Jati", "Sukabumi", "Wiroborang"],
        Kanigaran: ["Kanigaran", "Tisnonegaran", "Kebonsari Kulon", "Kebonsari Wetan", "Sukoharjo", "Curahgrinting"],
        Wonoasih: ["Wonoasih", "Jrebeng Kidul", "Pakistaji", "Kedunggaleng", "Kedungasem", "Sumbertaman"],
        Kedopok: ["Kedopok", "Jrebeng Wetan", "Jrebeng Lor", "Kareng Lor", "Sumber Wetan", "Triwung Lor"],
        Kademangan: ["Kademangan", "Ketapang", "Triwung Kidul", "Pilang", "Pohsangit Kidul", "Pohsangit Lor"],
    };

    let { onSuccess } = $props();

    let open = $state(false);
    let step = $state(1);

    let layananList = $state([]);
    let layananLoaded = $state(false);
    let search = $state("");

    let selectedLayanan = $state(null);

    let applicantName = $state("");
    let applicantPhone = $state("");
    let kecamatan = $state("");
    let kelurahan = $state("");
    let alamat = $state("");
    let keterangan = $state("");

    let loading = $state(false);
    let error = $state("");
    let resultKode = $state("");
    let copied = $state(false);

    const kelurahanOptions = $derived(kecamatan ? (kelurahanMap[kecamatan] ?? []) : []);

    const filteredLayanan = $derived.by(() => {
        const q = search.trim().toLowerCase();
        const offline = layananList.filter(l => l.type === "Offline");
        if (!q) return offline;
        return offline.filter(l => l.title.toLowerCase().includes(q) || l.categoryTitle?.toLowerCase().includes(q));
    });

    const grouped = $derived.by(() => {
        const map = {};
        for (const l of filteredLayanan) {
            if (!map[l.categoryTitle]) map[l.categoryTitle] = [];
            map[l.categoryTitle].push(l);
        }
        return Object.entries(map);
    });

    async function loadLayanan() {
        if (layananLoaded) return;
        try {
            const res = await fetch("/api/admin/layanan");
            const json = await res.json();
            layananList = json.data ?? [];
            layananLoaded = true;
        } catch {}
    }

    function reset() {
        step = 1;
        selectedLayanan = null;
        applicantName = applicantPhone = kecamatan = kelurahan = alamat = keterangan = "";
        error = "";
        resultKode = "";
        search = "";
    }

    function openModal() {
        reset();
        open = true;
        loadLayanan();
    }

    function closeModal() {
        open = false;
    }

    function selectLayanan(l) {
        selectedLayanan = l;
        step = 2;
    }

    function backToStep1() {
        step = 1;
        error = "";
    }

    async function submit() {
        error = "";
        if (!applicantName.trim()) { error = "Nama pemohon wajib diisi."; return; }
        if (!applicantPhone.trim()) { error = "Nomor HP wajib diisi."; return; }
        if (!kecamatan) { error = "Kecamatan wajib dipilih."; return; }
        if (!kelurahan) { error = "Kelurahan wajib dipilih."; return; }
        if (!alamat.trim()) { error = "Alamat wajib diisi."; return; }

        loading = true;
        try {
            const res = await fetch("/api/admin/permohonan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId: selectedLayanan.id,
                    applicantName: applicantName.trim(),
                    applicantPhone: applicantPhone.trim(),
                    kecamatan,
                    kelurahan,
                    alamat: alamat.trim(),
                    keterangan: keterangan.trim() || undefined,
                }),
            });
            const json = await res.json();
            if (json.success || json.data?.id || json.id) {
                resultKode = json.data?.id ?? json.id ?? "";
                step = 3;
                onSuccess?.();
            } else {
                error = json.message ?? "Gagal menambahkan permohonan.";
            }
        } catch {
            error = "Terjadi kesalahan jaringan.";
        } finally {
            loading = false;
        }
    }

    async function copyKode() {
        try {
            await navigator.clipboard.writeText(resultKode);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        } catch {}
    }

    function onBackdropClick(e) {
        if (e.target === e.currentTarget) closeModal();
    }

    function onKeydown(e) {
        if (e.key === "Escape") closeModal();
    }
</script>

<!-- Trigger button -->
<button
    onclick={openModal}
    class="flex items-center gap-2 bg-green text-white text-sm font-semibold px-4 py-2.5 hover:bg-green/90 transition shrink-0"
>
<Icon icon="mdi:plus" width="16" height="16" />
    Tambah Permohonan
</button>

<!-- Modal — rendered via style block to avoid transform containment issues -->
{#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        use:portal
        class="modal-backdrop"
        onclick={onBackdropClick}
        onkeydown={onKeydown}
        role="dialog"
        aria-modal="true"
    >
        <div class="modal-box">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <div>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {step === 1 ? "Langkah 1 dari 2" : step === 2 ? "Langkah 2 dari 2" : "Selesai"}
                    </p>
                    <h2 class="text-base font-bold uppercase tracking-tight">
                        {step === 1 ? "Pilih Layanan" : step === 2 ? "Data Pemohon" : "Permohonan Dibuat"}
                    </h2>
                </div>
                <button onclick={closeModal} class="text-gray-400 hover:text-gray-700 transition p-1">
<Icon icon="mdi:close" width="20" height="20" />
                </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto min-h-0">

                <!-- STEP 1: Pilih Layanan -->
                {#if step === 1}
                    <!-- Search -->
                    <div class="px-4 pt-4 pb-2">
                        <div class="relative">
<Icon icon="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" />
                            <input
                                type="text"
                                bind:value={search}
                                placeholder="Cari layanan..."
                                class="w-full border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition"
                            />
                        </div>
                    </div>

                    {#if !layananLoaded}
                        <div class="flex items-center justify-center py-16 text-gray-400 text-sm">Memuat layanan...</div>
                    {:else if grouped.length === 0}
                        <div class="flex flex-col items-center justify-center py-16 text-gray-400 text-sm gap-2">
<Icon icon="mdi:magnify" width="32" height="32" class="text-gray-300" />
                            Layanan tidak ditemukan
                        </div>
                    {:else}
                        <div class="px-4 pb-4 space-y-3">
                            {#each grouped as [cat, items]}
                                <div>
                                    <p class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 py-2">{cat}</p>
                                    <div class="space-y-1">
                                        {#each items as l}
                                            <button
                                                onclick={() => selectLayanan(l)}
                                                class="w-full flex items-center gap-3 px-4 py-3 border hover:border-green hover:bg-green/5 transition text-left group"
                                            >
                                                <div class="w-8 h-8 bg-green/10 flex items-center justify-center shrink-0 group-hover:bg-green/20 transition">
<Icon icon="mdi:file-document-outline" width="15" height="15" class="text-green" />
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <p class="text-sm font-semibold leading-tight">{l.title}</p>
                                                    <p class="text-xs text-gray-400 mt-0.5">SLA {l.slaDuration} {l.slaUnit} · {l.cost}</p>
                                                </div>
<Icon icon="mdi:chevron-right" width="14" height="14" class="text-gray-300 group-hover:text-green shrink-0 transition" />
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}

                <!-- STEP 2: Data Pemohon -->
                {:else if step === 2}
                    <div class="p-6 space-y-4">
                        <div class="flex items-center gap-3 bg-green/5 border border-green/20 px-4 py-3">
                            <div class="w-8 h-8 bg-green flex items-center justify-center shrink-0">
<Icon icon="mdi:file-document-outline" width="15" height="15" class="text-white" />
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-[10px] text-green font-bold uppercase tracking-wide">Layanan Dipilih</p>
                                <p class="text-sm font-semibold">{selectedLayanan?.title}</p>
                            </div>
                            <button onclick={backToStep1} class="text-xs text-green font-semibold hover:underline shrink-0">Ganti</button>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="col-span-2">
                                <label class="label">Nama Pemohon *</label>
                                <input type="text" bind:value={applicantName} class="inp" placeholder="Nama lengkap" />
                            </div>
                            <div class="col-span-2">
                                <label class="label">No. HP *</label>
                                <input type="tel" bind:value={applicantPhone} class="inp" placeholder="08xxxxxxxxxx" />
                            </div>
                            <div>
                                <label class="label">Kecamatan *</label>
                                <select bind:value={kecamatan} onchange={() => (kelurahan = "")} class="inp bg-white">
                                    <option value="">Pilih kecamatan</option>
                                    {#each Object.keys(kelurahanMap) as kec}
                                        <option value={kec}>{kec}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class="label">Kelurahan *</label>
                                <select bind:value={kelurahan} disabled={!kecamatan} class="inp bg-white disabled:opacity-50">
                                    <option value="">Pilih kelurahan</option>
                                    {#each kelurahanOptions as kel}
                                        <option value={kel}>{kel}</option>
                                    {/each}
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label class="label">Alamat *</label>
                                <textarea bind:value={alamat} rows="2" class="inp resize-none" placeholder="Alamat lengkap"></textarea>
                            </div>
                            <div class="col-span-2">
                                <label class="label">Keterangan <span class="font-normal text-gray-400">(opsional)</span></label>
                                <textarea bind:value={keterangan} rows="2" class="inp resize-none" placeholder="Keterangan tambahan"></textarea>
                            </div>
                        </div>

                        {#if error}
                            <p class="text-xs text-red-500 font-medium">{error}</p>
                        {/if}
                    </div>

                <!-- STEP 3: Sukses -->
                {:else}
                    <div class="p-8 flex flex-col items-center text-center gap-4">
                        <div class="w-14 h-14 bg-green flex items-center justify-center">
<Icon icon="mdi:check" width="28" height="28" class="text-white" />
                        </div>
                        <div>
                            <p class="font-bold text-lg uppercase tracking-tight">Permohonan Dibuat</p>
                            <p class="text-sm text-gray-500 mt-1">Berikan nomor tiket berikut kepada pemohon</p>
                        </div>

                        <div class="w-full bg-green/5 border-2 border-green/30 px-6 py-5">
                            <p class="text-[10px] font-bold uppercase tracking-widest text-green/60 mb-1">Nomor Tiket</p>
                            <p class="text-2xl font-black tracking-widest font-mono">{resultKode}</p>
                        </div>

                        <div class="flex gap-3 w-full">
                            <button
                                onclick={copyKode}
                                class="flex-1 flex items-center justify-center gap-2 border border-green text-green text-sm font-semibold py-2.5 hover:bg-green/5 transition"
                            >
                                {#if copied}
<Icon icon="mdi:check" width="14" height="14" />
                                    Tersalin!
                                {:else}
<Icon icon="mdi:content-copy" width="14" height="14" />
                                    Salin Kode
                                {/if}
                            </button>
                            <a
                                href="/check-progress?kode={resultKode}"
                                target="_blank"
                                class="flex-1 flex items-center justify-center gap-2 bg-green text-white text-sm font-semibold py-2.5 hover:bg-green/90 transition"
                            >
<Icon icon="mdi:eye" width="14" height="14" />
                                Cek Status
                            </a>
                        </div>

                        <button onclick={reset} class="text-xs text-gray-400 hover:text-gray-600 transition underline">
                            Buat permohonan lagi
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Footer step 2 -->
            {#if step === 2}
                <div class="border-t px-6 py-4 flex gap-3 shrink-0">
                    <button onclick={backToStep1} class="flex-1 border text-sm font-semibold py-2.5 hover:bg-gray-50 transition">
                        ← Kembali
                    </button>
                    <button
                        onclick={submit}
                        disabled={loading}
                        class="flex-1 bg-green text-white text-sm font-semibold py-2.5 hover:bg-green/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Memproses..." : "Buat Permohonan"}
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    @keyframes backdropIn {
        from { opacity: 0; }
        to   { opacity: 1; }
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
        max-width: 520px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
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
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    .inp:focus {
        border-color: #16a34a;
        box-shadow: 0 0 0 2px rgba(22,163,74,0.15);
    }
</style>
