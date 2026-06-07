<script lang="ts">
    import Icon from "@iconify/svelte";
    import { kelurahanMap } from "../../lib/data.js";

    let { serviceId } = $props();

    // ── Form state ────────────────────────────────────────
    let nama = $state("");
    let whatsapp = $state("");
    let kecamatan = $state("");
    let kelurahan = $state("");
    let alamat = $state("");
    let keterangan = $state("");
    let files = $state<File[]>([]);

    // ── UI state ──────────────────────────────────────────
    let loading = $state(false);
    let isDragging = $state(false);
    let status = $state<"idle" | "success" | "error">("idle");
    let errorMsg = $state("");
    let uploadProgress = $state<{ current: number; total: number } | null>(
        null,
    );
    let successKode = $state("");
    let copied = $state(false);
    let formEl = $state<HTMLFormElement | null>(null);
    let fileError = $state("");

    const kelurahanOptions = $derived(
        kecamatan ? (kelurahanMap[kecamatan] ?? []) : [],
    );

    $effect(() => {
        if (kecamatan) kelurahan = "";
    });

    // ── File handling ─────────────────────────────────────
    function addFiles(newFiles: FileList | File[]) {
        const valid = Array.from(newFiles).filter((f) => {
            const ok =
                f.size <= 5 * 1024 * 1024 && /\.(pdf|jpe?g|png)$/i.test(f.name);
            return ok;
        });
        files = [...files, ...valid];
    }

    function removeFile(i: number) {
        files = files.filter((_, idx) => idx !== i);
    }

    $effect(() => {
        files.length;
        if (files.length > 0) fileError = "";
    });

    function formatSize(bytes: number) {
        return bytes < 1024 * 1024
            ? `${(bytes / 1024).toFixed(0)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // ── Submit ────────────────────────────────────────────
    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        status = "idle";
        errorMsg = "";
        fileError = "";
        uploadProgress = null;

        if (!formEl?.reportValidity()) {
            return;
        }

        if (files.length === 0) {
            status = "error";
            fileError =
                "Dokumen persyaratan wajib diunggah sebelum permohonan dikirim.";
            return;
        }

        loading = true;

        try {
            // 1. Upload setiap file ke server, dapatkan URL-nya
            const dokumen: {
                nama: string;
                ukuran: number;
                url: string;
                tipe: string;
            }[] = [];

            if (files.length > 0) {
                uploadProgress = { current: 0, total: files.length };
                for (const f of files) {
                    const fd = new FormData();
                    fd.append("file", f);
                    const upRes = await fetch("/api/upload-dokumen", {
                        method: "POST",
                        body: fd,
                    });
                    const upJson = await upRes.json();
                    if (!upJson.success)
                        throw new Error(
                            upJson.message ?? "Gagal mengunggah dokumen.",
                        );
                    dokumen.push({
                        nama: upJson.data.nama,
                        ukuran: upJson.data.ukuran,
                        url: upJson.data.url,
                        tipe: upJson.data.tipe,
                    });
                    uploadProgress = {
                        current: dokumen.length,
                        total: files.length,
                    };
                }
            }

            uploadProgress = null;

            // 2. Submit permohonan dengan URL dokumen hasil upload
            const res = await fetch("/api/permohonan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId: Number(serviceId),
                    applicantName: nama,
                    applicantPhone: whatsapp,
                    kecamatan,
                    kelurahan,
                    alamat,
                    keterangan,
                    dokumen,
                }),
            });
            const json = await res.json();
            if (!json.success)
                throw new Error(json.message ?? "Gagal mengirim permohonan.");
            successKode = json.data?.id ?? json.data?.kode ?? "";
            status = "success";
        } catch (err: any) {
            status = "error";
            errorMsg = err.message || "Terjadi kesalahan. Silakan coba lagi.";
        } finally {
            loading = false;
            uploadProgress = null;
        }
    }

    function copyKode() {
        if (!successKode) return;
        navigator.clipboard.writeText(successKode).then(() => {
            copied = true;
            setTimeout(() => (copied = false), 2000);
        });
    }
</script>

<div class="border border-ink/10 bg-cream shadow-sm">
    <!-- Header -->
    <div class="p-4 md:p-6 pb-4 md:pb-5">
        <div class="flex items-center gap-3 md:gap-4 mb-4">
            <div
                class="w-10 h-10 md:w-12 md:h-12 bg-green flex items-center justify-center shrink-0"
            >
                <Icon
                    icon="mdi:pencil"
                    width="20"
                    height="20"
                    class="text-cream"
                />
            </div>
            <div>
                <h1
                    class="text-xl md:text-2xl font-black uppercase leading-tight"
                >
                    Form Permohonan
                </h1>
                <p class="text-xs md:text-sm opacity-60 mt-0.5">
                    Isi data diri dengan benar. Nomor tiket akan dikirim via
                    WhatsApp setelah submit.
                </p>
                <p class="text-[11px] md:text-xs text-ink/50 mt-1">
                    Kolom dengan <span class="text-red-500 font-bold">*</span>
                    wajib diisi.
                </p>
            </div>
        </div>
        <hr class="border-ink/10" />
    </div>

    <!-- Success state -->
    {#if status === "success"}
        <div class="px-4 md:px-6 pb-6 md:pb-8 flex flex-col gap-5 pt-2">
            <!-- Check icon + heading -->
            <div class="flex flex-col items-center gap-3 py-6 text-center">
                <div
                    class="w-16 h-16 bg-green flex items-center justify-center"
                >
                    <Icon
                        icon="mdi:check-circle"
                        width="36"
                        height="36"
                        class="text-cream"
                    />
                </div>
                <div>
                    <h2 class="text-xl font-bold uppercase mb-1">
                        Permohonan Terkirim!
                    </h2>
                    <p class="text-sm opacity-60">
                        Nomor tiket akan dikirim ke WhatsApp Anda dalam beberapa
                        menit.
                    </p>
                </div>
            </div>

            <!-- Kode tiket -->
            {#if successKode}
                <div class="border border-green/30 bg-green/5 p-4">
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-2"
                    >
                        Nomor Tiket Permohonan
                    </p>
                    <div class="flex items-center gap-3">
                        <p
                            class="flex-1 font-mono font-bold text-lg md:text-xl text-ink break-all"
                        >
                            {successKode}
                        </p>
                        <button
                            onclick={copyKode}
                            class="shrink-0 px-3 py-2 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 transition-colors"
                        >
                            {copied ? "Disalin!" : "Salin"}
                        </button>
                    </div>
                    <p class="text-[11px] text-ink/40 mt-2">
                        Simpan nomor ini untuk memantau status permohonan Anda.
                    </p>
                </div>

                <!-- WA notice -->
                <div
                    class="flex items-start gap-3 bg-yellow/20 border border-yellow/40 p-3"
                >
                    <Icon
                        icon="mdi:alert"
                        width="16"
                        height="16"
                        class="text-yellow-700 shrink-0 mt-0.5"
                    />
                    <p class="text-xs text-yellow-800 leading-relaxed">
                        Jika notifikasi WhatsApp tidak diterima, gunakan nomor
                        tiket di atas untuk memantau status di halaman <strong
                            >Cek Progress</strong
                        >.
                    </p>
                </div>

                <!-- Actions -->
                <div class="flex flex-wrap gap-3">
                    <a
                        href={`/check-progress?kode=${encodeURIComponent(successKode)}`}
                        class="inline-flex items-center gap-2 bg-green text-cream text-xs font-bold uppercase px-5 py-3 hover:bg-green/90 transition-colors"
                    >
                        Pantau Status
                        <Icon
                            icon="mdi:arrow-top-right"
                            width="13"
                            height="13"
                        />
                    </a>
                    <button
                        onclick={() => {
                            status = "idle";
                            successKode = "";
                            nama =
                                whatsapp =
                                kecamatan =
                                kelurahan =
                                alamat =
                                keterangan =
                                    "";
                            files = [];
                        }}
                        class="border border-ink/15 text-sm font-bold uppercase px-5 py-3 hover:bg-ink/5 transition-colors"
                    >
                        Buat Permohonan Baru
                    </button>
                </div>
            {:else}
                <button
                    onclick={() => {
                        status = "idle";
                        nama =
                            whatsapp =
                            kecamatan =
                            kelurahan =
                            alamat =
                            keterangan =
                                "";
                        files = [];
                    }}
                    class="self-center border border-ink/15 text-sm font-bold uppercase px-6 py-3 hover:bg-ink/5 transition-colors"
                >
                    Buat Permohonan Baru
                </button>
            {/if}
        </div>
    {:else}
        <form
            bind:this={formEl}
            onsubmit={handleSubmit}
            class="px-4 md:px-6 pb-4 md:pb-6 flex flex-col gap-4 md:gap-5"
        >
            <!-- Nama -->
            <div class="flex flex-col gap-1.5">
                <label for="nama" class="label"
                    >Nama Lengkap <span class="text-red-500">*</span></label
                >
                <input
                    id="nama"
                    bind:value={nama}
                    type="text"
                    required
                    placeholder="Sesuai KTP"
                    class="field"
                />
            </div>

            <!-- WhatsApp -->
            <div class="flex flex-col gap-1.5">
                <label for="whatsapp" class="label"
                    >Nomor WhatsApp <span class="text-red-500">*</span></label
                >
                <div class="relative">
                    <input
                        id="whatsapp"
                        bind:value={whatsapp}
                        type="tel"
                        required
                        inputmode="numeric"
                        placeholder="08XXXXXXXXXX"
                        class="field pl-10"
                    />
                </div>
                <p class="text-xs opacity-50">
                    Nomor tiket &amp; notifikasi dikirim ke nomor ini
                </p>
            </div>

            <!-- Kecamatan + Kelurahan + Alamat -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div class="flex flex-col gap-1.5">
                    <label for="kecamatan" class="label"
                        >Kecamatan <span class="text-red-500">*</span></label
                    >
                    <div class="relative">
                        <select
                            id="kecamatan"
                            bind:value={kecamatan}
                            required
                            class="field appearance-none pr-8 cursor-pointer"
                        >
                            <option value="" disabled selected
                                >Pilih Kecamatan</option
                            >
                            {#each Object.keys(kelurahanMap) as kec}
                                <option>{kec}</option>
                            {/each}
                        </select>
                        <span
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
                        >
                            <Icon
                                icon="mdi:chevron-down"
                                width="16"
                                height="16"
                            />
                        </span>
                    </div>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="kelurahan" class="label"
                        >Kelurahan <span class="text-red-500">*</span></label
                    >
                    <div class="relative">
                        <select
                            id="kelurahan"
                            bind:value={kelurahan}
                            required
                            disabled={!kecamatan}
                            class="field appearance-none pr-8 cursor-pointer disabled:opacity-40"
                        >
                            <option value="" disabled selected
                                >Pilih Kelurahan</option
                            >
                            {#each kelurahanOptions as kel}
                                <option>{kel}</option>
                            {/each}
                        </select>
                        <span
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
                        >
                            <Icon
                                icon="mdi:chevron-down"
                                width="16"
                                height="16"
                            />
                        </span>
                    </div>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="alamat" class="label"
                        >Alamat Lengkap <span class="text-red-500">*</span
                        ></label
                    >
                    <input
                        id="alamat"
                        bind:value={alamat}
                        type="text"
                        required
                        placeholder="Jl. ... RT/RW ..."
                        class="field"
                    />
                </div>
            </div>

            <!-- Keterangan -->
            <div class="flex flex-col gap-1.5">
                <label for="keterangan" class="label"
                    >Keterangan Tambahan <span class="opacity-40 font-normal"
                        >(Opsional)</span
                    ></label
                >
                <textarea
                    id="keterangan"
                    bind:value={keterangan}
                    rows="4"
                    placeholder="Tuliskan informasi tambahan jika diperlukan..."
                    class="field resize-y min-h-24"
                ></textarea>
            </div>

            <!-- Upload -->
            <div class="flex flex-col gap-1.5">
                <label
                    for="file-upload"
                    class="label flex items-center gap-1.5"
                >
                    <span style="color:#0F6B44"
                        ><Icon
                            icon="mdi:paperclip"
                            width="15"
                            height="15"
                        /></span
                    >
                    Upload Dokumen Persyaratan
                    <span class="text-red-500">*</span>
                </label>

                <label
                    for="file-upload"
                    class="drop-zone border-2 border-dashed bg-white p-5 md:p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                    class:dragging={isDragging}
                    class:drop-zone-error={!!fileError}
                    ondragover={(e) => {
                        e.preventDefault();
                        isDragging = true;
                    }}
                    ondragleave={() => (isDragging = false)}
                    ondrop={(e) => {
                        e.preventDefault();
                        isDragging = false;
                        if (e.dataTransfer?.files.length)
                            addFiles(e.dataTransfer.files);
                    }}
                >
                    <div
                        class="w-12 h-12 bg-green/10 rounded-full flex items-center justify-center"
                        style="color:#0F6B44"
                    >
                        <Icon icon="mdi:cloud-upload" width="24" height="24" />
                    </div>
                    <p class="text-sm font-semibold">
                        Klik atau seret file ke sini
                    </p>
                    <p class="text-xs opacity-50 text-center leading-relaxed">
                        Format: PDF, JPG, PNG — Maks. 5MB per file<br />
                        Anda dapat mengunggah lebih dari satu file
                    </p>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        class="hidden"
                        aria-invalid={fileError ? "true" : "false"}
                        onchange={(e: any) => {
                            if (e.target.files?.length)
                                addFiles(e.target.files);
                        }}
                    />
                </label>

                {#if fileError}
                    <p class="text-xs text-red-600 font-medium">{fileError}</p>
                {/if}

                <p class="text-xs opacity-40">
                    Semua dokumen akan kami jaga kerahasiaannya dan hanya
                    digunakan untuk keperluan layanan.
                </p>

                {#if files.length > 0}
                    <div class="flex flex-col gap-1">
                        {#each files as f, i}
                            <div
                                class="flex items-center gap-2 text-xs py-1.5 px-3 bg-green/8 border border-green/20"
                            >
                                <span style="color:#0F6B44"
                                    ><Icon
                                        icon="mdi:file-document-outline"
                                        width="14"
                                        height="14"
                                    /></span
                                >
                                <span class="flex-1 truncate font-medium"
                                    >{f.name}</span
                                >
                                <span class="opacity-50"
                                    >{formatSize(f.size)}</span
                                >
                                <button
                                    type="button"
                                    onclick={() => removeFile(i)}
                                    class="opacity-40 hover:opacity-100 transition-opacity ml-1"
                                >
                                    <Icon
                                        icon="mdi:close"
                                        width="14"
                                        height="14"
                                    />
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Error -->
            {#if status === "error"}
                <p
                    class="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3"
                >
                    {errorMsg}
                </p>
            {/if}

            <!-- Upload progress -->
            {#if uploadProgress}
                <div class="flex flex-col gap-1.5">
                    <p class="text-xs font-semibold opacity-70">
                        Mengunggah dokumen {uploadProgress.current}/{uploadProgress.total}...
                    </p>
                    <div class="h-1.5 bg-ink/10 overflow-hidden">
                        <div
                            class="h-full bg-green transition-all duration-300"
                            style="width:{(uploadProgress.current /
                                uploadProgress.total) *
                                100}%"
                        ></div>
                    </div>
                </div>
            {/if}

            <!-- Actions -->
            <button
                type="submit"
                disabled={loading}
                class="flex items-center justify-center gap-2 bg-green text-cream font-bold text-sm uppercase py-3 md:py-4 hover:bg-green/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {#if loading}
                    <span class="spinner"></span>
                    {uploadProgress
                        ? `Mengunggah ${uploadProgress.current}/${uploadProgress.total}...`
                        : "Mengirim..."}
                {:else}
                    <Icon
                        icon="mdi:send"
                        width="18"
                        height="18"
                        class="text-cream"
                    />
                    Kirim Permohonan
                {/if}
            </button>
        </form>
    {/if}
</div>

<style>
    .label {
        font-size: 0.875rem;
        font-weight: 600;
    }

    .field {
        width: 100%;
        padding: 0.625rem 0.75rem;
        border: 1px solid rgba(17, 17, 17, 0.15);
        background: white;
        font-size: 0.875rem;
        outline: none;
        transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
    }
    .field:focus {
        border-color: #0f6b44;
        box-shadow: 0 0 0 3px rgba(15, 107, 68, 0.1);
    }
    .field::placeholder {
        opacity: 0.4;
    }

    .drop-zone {
        border-color: rgba(17, 17, 17, 0.2);
    }
    .drop-zone:hover,
    .drop-zone.dragging {
        border-color: rgba(15, 107, 68, 0.5);
        background-color: rgba(15, 107, 68, 0.02);
    }
    .drop-zone-error {
        border-color: rgba(220, 38, 38, 0.55);
        background-color: rgba(254, 242, 242, 0.9);
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(246, 241, 232, 0.3);
        border-top-color: #f6f1e8;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        display: inline-block;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
