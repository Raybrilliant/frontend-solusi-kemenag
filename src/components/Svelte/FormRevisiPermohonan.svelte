<script>
    import Icon from "@iconify/svelte";
    import { kelurahanMap } from "../../lib/data.js";
    import { toUploadProxyUrl } from "../../lib/upload-url";

    let { id = "", onSuccess } = $props();

    let nama = $state("");
    let whatsapp = $state("");
    let kec = $state("");
    let kel = $state("");
    let almt = $state("");
    let ket = $state("");
    let serviceTitle = $state("");
    let existingDokumen = $state([]);
    let newFiles = $state([]);

    let loading = $state(false);
    let detailLoading = $state(true);
    let fileError = $state("");
    let error = $state("");
    let success = $state(false);

    const kelurahanOptions = $derived(kec ? (kelurahanMap[kec] ?? []) : []);

    $effect(() => {
        if (!id) return;
        detailLoading = true;
        error = "";

        fetch(`/api/permohonan-detail?id=${encodeURIComponent(id)}`)
            .then(async (res) => {
                const json = await safeJson(res);
                if (!json.success || !json.data) {
                    error = json.message ?? "Gagal memuat data permohonan.";
                    return;
                }
                const d = json.data;
                nama = d.applicantName ?? "";
                whatsapp = d.applicantPhone ?? "";
                kec = d.kecamatan ?? "";
                kel = d.kelurahan ?? "";
                almt = d.alamat ?? "";
                ket = "";
                serviceTitle = d.serviceTitle ?? "";
                existingDokumen = (d.dokumen ?? []).map((doc) => ({
                    ...doc,
                    url: toUploadProxyUrl(doc.url),
                }));
            })
            .catch((err) => {
                error = err instanceof Error ? err.message : "Gagal memuat data.";
            })
            .finally(() => {
                detailLoading = false;
            });
    });

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];

    function getFileValidationError(file) {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
            return "Format file harus PDF, JPG, atau PNG.";
        }
        if (file.size > MAX_FILE_SIZE) {
            return "Ukuran file melebihi batas 5MB.";
        }
        return null;
    }

    function addFiles(fileList) {
        const incoming = Array.from(fileList);
        const valid = [];
        const rejected = [];
        for (const file of incoming) {
            const err = getFileValidationError(file);
            if (err) {
                rejected.push({ name: file.name, reason: err });
            } else {
                valid.push(file);
            }
        }
        if (valid.length) {
            newFiles = [...newFiles, ...valid];
            fileError = "";
        }
        if (rejected.length) {
            fileError = rejected.length === 1
                ? "1 file tidak memenuhi syarat."
                : `${rejected.length} file tidak memenuhi syarat.`;
        }
    }

    function removeNewFile(index) {
        newFiles = newFiles.filter((_, i) => i !== index);
    }

    function removeExisting(index) {
        existingDokumen = existingDokumen.filter((_, i) => i !== index);
    }

    function formatSize(bytes) {
        return bytes < 1024 * 1024
            ? `${(bytes / 1024).toFixed(0)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async function safeJson(res) {
        const text = await res.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            throw new Error(
                text.trim()
                    ? `Respons server tidak valid: ${text.slice(0, 200)}`
                    : `Server mengembalikan HTTP ${res.status} tanpa pesan.`,
            );
        }
    }

    async function uploadFiles() {
        const results = [];
        for (const file of newFiles) {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload-dokumen", {
                method: "POST",
                body: fd,
            });
            const json = await safeJson(res);
            if (!json.success) {
                throw new Error(json.message ?? `Gagal upload ${file.name}`);
            }
            results.push({
                nama: json.data.nama,
                ukuran: json.data.ukuran,
                url: json.data.url,
                tipe: json.data.tipe,
            });
        }
        return results;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        error = "";
        fileError = "";
        success = false;

        if (!nama.trim() || !whatsapp.trim() || !kec.trim() || !kel.trim() || !almt.trim()) {
            error = "Nama, nomor HP, kecamatan, kelurahan, dan alamat wajib diisi.";
            return;
        }

        if (existingDokumen.length === 0 && newFiles.length === 0) {
            error = "Dokumen persyaratan wajib ada. Unggah file baru atau pertahankan dokumen lama.";
            return;
        }

        loading = true;
        try {
            const uploaded = newFiles.length > 0 ? await uploadFiles() : [];
            const finalDokumen = [
                ...existingDokumen.map((d) => ({
                    nama: d.nama,
                    ukuran: d.ukuran,
                    url: d.url,
                    tipe: d.tipe,
                })),
                ...uploaded,
            ];

            const res = await fetch("/api/permohonan-revisi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    applicantName: nama,
                    applicantPhone: whatsapp,
                    kecamatan: kec,
                    kelurahan: kel,
                    alamat: almt,
                    keterangan: ket,
                    dokumen: finalDokumen,
                }),
            });

            const json = await safeJson(res);
            if (!res.ok || json.success === false) {
                throw new Error(json.message ?? "Gagal mengajukan revisi.");
            }

            success = true;
            onSuccess?.(json.data?.id ?? id);
        } catch (err) {
            error = err instanceof Error ? err.message : "Terjadi kesalahan.";
        } finally {
            loading = false;
        }
    }
</script>

<div class="mt-6 w-full max-w-2xl border border-yellow/40 bg-yellow/8 p-4 md:p-6 result-enter">
    <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-yellow flex items-center justify-center shrink-0">
            <Icon icon="mdi:file-edit-outline" width="20" height="20" />
        </div>
        <div>
            <h3 class="text-base md:text-lg font-bold">Ajukan Revisi</h3>
            <p class="text-xs text-ink/70">
                {serviceTitle ? `Permohonan — ${serviceTitle}` : "Perbaiki data dan dokumen"}
            </p>
        </div>
    </div>

    {#if detailLoading}
        <div class="py-8 flex items-center justify-center gap-2 text-sm text-ink/60">
            <Icon icon="mdi:loading" class="animate-spin" width="18" height="18" />
            Memuat data...
        </div>
    {:else if success}
        <div class="bg-green/10 border border-green/30 p-4 flex items-start gap-3">
            <Icon icon="mdi:check-circle" class="text-green shrink-0 mt-0.5" width="20" height="20" />
            <div>
                <p class="text-sm font-bold text-green">Revisi Berhasil Diajukan</p>
                <p class="text-xs text-ink/70 mt-0.5">
                    Permohonan Anda kembali ke tahap awal. Silakan pantau statusnya.
                </p>
            </div>
        </div>
    {:else}
        <form onsubmit={handleSubmit} class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label for="rev-nama" class="block text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-1">Nama Lengkap</label>
                    <input id="rev-nama" bind:value={nama} required class="w-full border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green" />
                </div>
                <div class="md:col-span-2">
                    <label for="rev-wa" class="block text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-1">Nomor WhatsApp</label>
                    <input id="rev-wa" bind:value={whatsapp} required class="w-full border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green" />
                </div>
                <div>
                    <label for="rev-kec" class="block text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-1">Kecamatan</label>
                    <select id="rev-kec" bind:value={kec} onchange={() => (kel = "")} required class="w-full border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green">
                        <option value="">Pilih kecamatan</option>
                        {#each Object.keys(kelurahanMap) as k}
                            <option value={k}>{k}</option>
                        {/each}
                    </select>
                </div>
                <div>
                    <label for="rev-kel" class="block text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-1">Kelurahan</label>
                    <select id="rev-kel" bind:value={kel} required disabled={!kec} class="w-full border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green disabled:opacity-50">
                        <option value="">Pilih kelurahan</option>
                        {#each kelurahanOptions as v}
                            <option value={v}>{v}</option>
                        {/each}
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label for="rev-almt" class="block text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-1">Alamat</label>
                    <textarea id="rev-almt" bind:value={almt} required rows="2" class="w-full border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green"></textarea>
                </div>
                <div class="md:col-span-2">
                    <label for="rev-ket" class="block text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-1">Keterangan</label>
                    <textarea id="rev-ket" bind:value={ket} rows="2" class="w-full border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-green"></textarea>
                </div>
            </div>

            <div>
                <label for="rev-files" class="block text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-2">Dokumen Persyaratan</label>

                {#if existingDokumen.length > 0}
                    <div class="space-y-2 mb-3">
                        {#each existingDokumen as doc, index (doc.id ?? doc.url)}
                            <div class="flex items-center justify-between gap-3 p-2 border border-black/8 bg-white text-sm">
                                <div class="min-w-0 flex items-center gap-2">
                                    <Icon icon="mdi:file-document-outline" class="text-ink/40 shrink-0" width="18" height="18" />
                                    <a href={doc.url} target="_blank" class="truncate hover:text-green">{doc.nama}</a>
                                </div>
                                <button type="button" onclick={() => removeExisting(index)} class="text-red-500 hover:text-red-700 shrink-0">
                                    <Icon icon="mdi:trash-can-outline" width="18" height="18" />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if newFiles.length > 0}
                    <div class="space-y-2 mb-3">
                        {#each newFiles as file, index (file.name + file.size)}
                            <div class="flex items-center justify-between gap-3 p-2 border border-black/8 bg-white text-sm">
                                <div class="min-w-0 flex items-center gap-2">
                                    <Icon icon="mdi:file-plus-outline" class="text-green shrink-0" width="18" height="18" />
                                    <span class="truncate">{file.name} ({formatSize(file.size)})</span>
                                </div>
                                <button type="button" onclick={() => removeNewFile(index)} class="text-red-500 hover:text-red-700 shrink-0">
                                    <Icon icon="mdi:trash-can-outline" width="18" height="18" />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}

                <label class="flex items-center justify-center gap-2 w-full border-2 border-dashed border-black/15 bg-white py-3 cursor-pointer hover:border-green hover:bg-green/5 transition-colors">
                    <Icon icon="mdi:upload" width="18" height="18" />
                    <span class="text-xs font-semibold text-ink/70">Tambah file baru</span>
                    <input
                        id="rev-files"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        class="hidden"
                        onchange={(e) => addFiles(e.currentTarget.files)}
                    />
                </label>
                <p class="text-[10px] text-ink/40 mt-1">Format: PDF, JPG, PNG. Maksimal 5MB per file.</p>
            </div>

            {#if fileError}
                <p class="text-xs text-red-600">{fileError}</p>
            {/if}
            {#if error}
                <p class="text-xs text-red-600">{error}</p>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="w-full bg-yellow text-ink text-sm font-bold uppercase py-3 hover:bg-yellow/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {#if loading}
                    <Icon icon="mdi:loading" class="animate-spin" width="18" height="18" />
                {/if}
                {loading ? "Memproses..." : "Kirim Revisi"}
            </button>
        </form>
    {/if}
</div>

<style>
    .result-enter {
        animation: resultSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes resultSlide {
        from {
            opacity: 0;
            transform: translateY(16px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
