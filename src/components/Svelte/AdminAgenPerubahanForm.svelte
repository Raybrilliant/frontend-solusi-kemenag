<script lang="ts">
    import Icon from "@iconify/svelte";
    import { toUploadProxyUrl } from "../../lib/upload-url";

    type TujuanItem = {
        id: string;
        text: string;
    };

    type HasilItem = {
        id: string;
        sebelumFoto: string;
        sebelumFotoFile: File | null;
        sebelumUploading: boolean;
        sebelumDeskripsi: string;
        sesudahFoto: string;
        sesudahFotoFile: File | null;
        sesudahUploading: boolean;
        sesudahDeskripsi: string;
    };

    let {
        mode = "tambah",
        agenId = null,
        apiUrl = "/api/admin/agen-perubahan",
    } = $props();

    let nama = $state("");
    let jabatan = $state("");
    let unitKerja = $state("");
    let tahun = $state(String(new Date().getFullYear()));
    let foto = $state("");
    let fotoFile = $state<File | null>(null);
    let fotoUploading = $state(false);
    let inovasi = $state("");
    let deskripsi = $state("");
    let latarBelakang = $state("");
    let tujuan = $state<TujuanItem[]>([]);
    let hasil = $state<HasilItem[]>([]);
    let loading = $state(false);
    let saving = $state(false);
    let deleting = $state(false);
    let toast = $state<{ type: string; msg: string } | null>(null);
    let fieldErrors = $state<Record<string, string>>({});

    const isEdit = $derived(mode === "edit" && agenId);

    function showToast(type: string, msg: string) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 4000);
    }

    function createTujuan(text = ""): TujuanItem {
        return {
            id: crypto.randomUUID(),
            text,
        };
    }

    function createHasil(item: Partial<Record<string, any>> = {}): HasilItem {
        return {
            id: String(item.id ?? crypto.randomUUID()),
            sebelumFoto: String(item.sebelumFoto ?? item?.sebelum?.foto ?? ""),
            sebelumFotoFile: null,
            sebelumUploading: false,
            sebelumDeskripsi: String(
                item.sebelumDeskripsi ?? item?.sebelum?.deskripsi ?? "",
            ),
            sesudahFoto: String(item.sesudahFoto ?? item?.sesudah?.foto ?? ""),
            sesudahFotoFile: null,
            sesudahUploading: false,
            sesudahDeskripsi: String(
                item.sesudahDeskripsi ?? item?.sesudah?.deskripsi ?? "",
            ),
        };
    }

    function applyItem(item: any) {
        nama = item?.nama ?? item?.name ?? "";
        jabatan = item?.jabatan ?? item?.position ?? "";
        unitKerja = item?.unitKerja ?? item?.workUnit ?? "";
        tahun = String(item?.tahun ?? item?.year ?? new Date().getFullYear());
        foto =
            toUploadProxyUrl(item?.foto ?? item?.photo ?? item?.image ?? "") ||
            item?.foto ||
            item?.photo ||
            item?.image ||
            "";
        inovasi = item?.inovasi ?? item?.innovation ?? "";
        deskripsi = item?.deskripsi ?? item?.description ?? "";
        latarBelakang = item?.latarBelakang ?? item?.background ?? "";
        tujuan = (Array.isArray(item?.tujuan) ? item.tujuan : [""]).map(
            (value: unknown) => createTujuan(String(value ?? "")),
        );
        hasil = (Array.isArray(item?.hasil) ? item.hasil : [createHasil()]).map(
            createHasil,
        );
    }

    $effect(() => {
        if (!isEdit) {
            if (tujuan.length === 0) tujuan = [createTujuan()];
            if (hasil.length === 0) hasil = [createHasil()];
            loading = false;
            return;
        }

        fetch(`${apiUrl}/${agenId}`)
            .then((r) => r.json())
            .then((res) => {
                const item = res.data ?? res.item ?? res;
                applyItem(item);
                loading = false;
            })
            .catch(() => {
                showToast("error", "Gagal memuat data agen perubahan.");
                loading = false;
            });
    });

    function validate() {
        const errors: Record<string, string> = {};
        if (!nama.trim()) errors.nama = "Nama agen wajib diisi.";
        if (!jabatan.trim()) errors.jabatan = "Jabatan wajib diisi.";
        if (!unitKerja.trim()) errors.unitKerja = "Unit kerja wajib diisi.";
        const tahunStr = String(tahun ?? "").trim();
        if (!tahunStr) errors.tahun = "Tahun wajib diisi.";
        else if (!/^\d{4}$/.test(tahunStr))
            errors.tahun = "Tahun harus 4 digit.";
        if (!inovasi.trim()) errors.inovasi = "Nama inovasi wajib diisi.";
        if (!deskripsi.trim())
            errors.deskripsi = "Deskripsi inovasi wajib diisi.";
        if (!latarBelakang.trim())
            errors.latarBelakang = "Latar belakang wajib diisi.";

        const activeTujuan = tujuan
            .map((item) => item.text.trim())
            .filter(Boolean);
        if (activeTujuan.length === 0)
            errors.tujuan = "Minimal tambahkan 1 tujuan inovasi.";

        const activeHasil = hasil.filter(
            (item) =>
                item.sebelumFoto.trim() ||
                item.sebelumDeskripsi.trim() ||
                item.sesudahFoto.trim() ||
                item.sesudahDeskripsi.trim(),
        );

        if (activeHasil.length === 0) {
            errors.hasil = "Minimal tambahkan 1 blok before & after.";
        } else {
            const invalidIndex = activeHasil.findIndex(
                (item) =>
                    !item.sebelumDeskripsi.trim() ||
                    !item.sesudahDeskripsi.trim(),
            );
            if (invalidIndex !== -1) {
                errors.hasil = `Deskripsi before/after ke-${invalidIndex + 1} belum lengkap.`;
            }
        }

        fieldErrors = errors;
        return Object.keys(errors).length === 0;
    }

    function handleFotoFile(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        fotoFile = input?.files?.[0] ?? null;
    }

    async function uploadFile(file: File) {
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/upload-dokumen", {
            method: "POST",
            body: fd,
        });
        const json = await res.json();

        if (!res.ok || json.success === false) {
            throw new Error(json.message ?? "Gagal upload file.");
        }

        return (
            toUploadProxyUrl(json.data?.url, json.data?.nama ?? file.name) ||
            json.data?.url ||
            ""
        );
    }

    async function uploadFoto() {
        if (!fotoFile) {
            showToast("error", "Pilih file foto agen terlebih dahulu.");
            return;
        }

        fotoUploading = true;
        try {
            foto = await uploadFile(fotoFile);
            showToast("success", "Foto agen berhasil diunggah.");
        } catch (err) {
            showToast(
                "error",
                (err as Error).message || "Gagal upload foto agen.",
            );
        } finally {
            fotoUploading = false;
        }
    }

    function addTujuan() {
        tujuan = [...tujuan, createTujuan()];
    }

    function removeTujuan(id: string) {
        if (tujuan.length === 1) {
            tujuan = [createTujuan()];
            return;
        }
        tujuan = tujuan.filter((item) => item.id !== id);
    }

    function addHasil() {
        hasil = [...hasil, createHasil()];
    }

    function removeHasil(id: string) {
        if (hasil.length === 1) {
            hasil = [createHasil()];
            return;
        }
        hasil = hasil.filter((item) => item.id !== id);
    }

    function handleHasilFile(
        id: string,
        key: "sebelumFotoFile" | "sesudahFotoFile",
        event: Event,
    ) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input?.files?.[0] ?? null;
        hasil = hasil.map((item) =>
            item.id === id ? { ...item, [key]: file } : item,
        );
    }

    async function uploadHasilFoto(id: string, side: "sebelum" | "sesudah") {
        const item = hasil.find((value) => value.id === id);
        if (!item) return;

        const file =
            side === "sebelum" ? item.sebelumFotoFile : item.sesudahFotoFile;
        if (!file) {
            showToast("error", `Pilih file foto ${side} terlebih dahulu.`);
            return;
        }

        const uploadingKey =
            side === "sebelum" ? "sebelumUploading" : "sesudahUploading";
        const fotoKey = side === "sebelum" ? "sebelumFoto" : "sesudahFoto";

        hasil = hasil.map((value) =>
            value.id === id ? { ...value, [uploadingKey]: true } : value,
        );

        try {
            const url = await uploadFile(file);
            hasil = hasil.map((value) =>
                value.id === id
                    ? { ...value, [fotoKey]: url, [uploadingKey]: false }
                    : value,
            );
            showToast("success", `Foto ${side} berhasil diunggah.`);
        } catch (err) {
            hasil = hasil.map((value) =>
                value.id === id ? { ...value, [uploadingKey]: false } : value,
            );
            showToast(
                "error",
                (err as Error).message || `Gagal upload foto ${side}.`,
            );
        }
    }

    function buildPayload() {
        return {
            nama: nama.trim(),
            jabatan: jabatan.trim(),
            unitKerja: unitKerja.trim(),
            tahun: Number(String(tahun ?? "").trim()),
            foto: foto.trim() || null,
            inovasi: inovasi.trim(),
            deskripsi: deskripsi.trim(),
            latarBelakang: latarBelakang.trim(),
            tujuan: tujuan.map((item) => item.text.trim()).filter(Boolean),
            hasil: hasil
                .filter(
                    (item) =>
                        item.sebelumFoto.trim() ||
                        item.sebelumDeskripsi.trim() ||
                        item.sesudahFoto.trim() ||
                        item.sesudahDeskripsi.trim(),
                )
                .map((item) => ({
                    sebelum: {
                        foto: item.sebelumFoto.trim() || null,
                        deskripsi: item.sebelumDeskripsi.trim(),
                    },
                    sesudah: {
                        foto: item.sesudahFoto.trim() || null,
                        deskripsi: item.sesudahDeskripsi.trim(),
                    },
                })),
        };
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        if (!validate()) return;

        saving = true;
        try {
            const payload = buildPayload();
            const url = isEdit ? `${apiUrl}/${agenId}` : apiUrl;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? "Gagal menyimpan agen perubahan.",
                );
            }

            const savedId = json.data?.id ?? agenId;
            showToast(
                "success",
                isEdit
                    ? "Agen perubahan berhasil diperbarui."
                    : "Agen perubahan berhasil ditambahkan.",
            );

            if (!isEdit && savedId) {
                setTimeout(() => {
                    window.location.href = `/admin/agen-perubahan/${savedId}`;
                }, 400);
            }
        } catch (err) {
            showToast("error", (err as Error).message || "Terjadi kesalahan.");
        } finally {
            saving = false;
        }
    }

    async function handleDelete() {
        if (!agenId) return;
        if (!confirm("Hapus data agen perubahan ini?")) return;

        deleting = true;
        try {
            const res = await fetch(`${apiUrl}/${agenId}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? "Gagal menghapus agen perubahan.",
                );
            }
            showToast("success", "Agen perubahan berhasil dihapus.");
            setTimeout(() => {
                window.location.href = "/admin/agen-perubahan";
            }, 500);
        } catch (err) {
            showToast("error", (err as Error).message || "Terjadi kesalahan.");
        } finally {
            deleting = false;
        }
    }
</script>

{#if toast}
    <div
        class={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm rounded ${toast.type === "success" ? "bg-green text-white" : "bg-red-600 text-white"}`}
    >
        <Icon
            icon={toast.type === "success" ? "mdi:check" : "mdi:alert-circle"}
            width="18"
            height="18"
            class="shrink-0"
        />
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
            <Icon icon="mdi:close" width="16" height="16" />
        </button>
    </div>
{/if}

{#if loading}
    <div class="flex items-center justify-center py-20">
        <div
            class="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin"
        ></div>
    </div>
{:else}
    <form onsubmit={handleSubmit} class="space-y-6 max-w-7xl">
        <div
            class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start"
        >
            <div class="space-y-6">
                <section class="bg-white border border-green/8 p-6 md:p-8">
                    <div class="mb-6">
                        <h2
                            class="text-lg font-extrabold uppercase tracking-tight text-ink"
                        >
                            Profil Agen
                        </h2>
                        <p class="text-sm text-ink/45 mt-1">
                            Isi identitas agen perubahan yang tampil di halaman
                            publik.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Nama Agen</label
                            >
                            <input
                                bind:value={nama}
                                type="text"
                                placeholder="Nama lengkap agen perubahan"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.nama ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.nama}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.nama}
                                </p>{/if}
                        </div>
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Tahun</label
                            >
                            <input
                                bind:value={tahun}
                                type="number"
                                min="2000"
                                max="2100"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.tahun ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.tahun}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.tahun}
                                </p>{/if}
                        </div>
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Jabatan</label
                            >
                            <input
                                bind:value={jabatan}
                                type="text"
                                placeholder="Contoh: Penyuluh Agama Ahli Pertama"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.jabatan ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.jabatan}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.jabatan}
                                </p>{/if}
                        </div>
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Unit Kerja</label
                            >
                            <input
                                bind:value={unitKerja}
                                type="text"
                                placeholder="Contoh: KUA Mayangan Kota Probolinggo"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.unitKerja ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.unitKerja}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.unitKerja}
                                </p>{/if}
                        </div>
                    </div>
                </section>

                <section class="bg-white border border-green/8 p-6 md:p-8">
                    <div class="mb-6">
                        <h2
                            class="text-lg font-extrabold uppercase tracking-tight text-ink"
                        >
                            Informasi Inovasi
                        </h2>
                        <p class="text-sm text-ink/45 mt-1">
                            Data ini akan muncul pada hero, ringkasan, dan isi
                            detail inovasi.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-5">
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Nama Inovasi</label
                            >
                            <input
                                bind:value={inovasi}
                                type="text"
                                placeholder="Contoh: SI CAKEP"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.inovasi ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.inovasi}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.inovasi}
                                </p>{/if}
                        </div>
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Deskripsi Inovasi</label
                            >
                            <textarea
                                bind:value={deskripsi}
                                rows="5"
                                placeholder="Deskripsi singkat inovasi yang tampil di hero detail..."
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors resize-y ${fieldErrors.deskripsi ? "border-red-400" : "border-black/10"}`}
                            ></textarea>
                            {#if fieldErrors.deskripsi}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.deskripsi}
                                </p>{/if}
                        </div>
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Latar Belakang</label
                            >
                            <textarea
                                bind:value={latarBelakang}
                                rows="8"
                                placeholder="Isi latar belakang. Pisahkan paragraf dengan enter baru agar tampil rapi di portal."
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors resize-y ${fieldErrors.latarBelakang ? "border-red-400" : "border-black/10"}`}
                            ></textarea>
                            {#if fieldErrors.latarBelakang}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.latarBelakang}
                                </p>{/if}
                        </div>
                    </div>
                </section>

                <section class="bg-white border border-green/8 p-6 md:p-8">
                    <div class="flex items-center justify-between gap-3 mb-6">
                        <div>
                            <h2
                                class="text-lg font-extrabold uppercase tracking-tight text-ink"
                            >
                                Tujuan Inovasi
                            </h2>
                            <p class="text-sm text-ink/45 mt-1">
                                Tambahkan tujuan-tujuan yang akan tampil sebagai
                                grid pada halaman detail.
                            </p>
                        </div>
                        <button
                            type="button"
                            onclick={addTujuan}
                            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green text-white hover:bg-green/90 transition-colors cursor-pointer"
                        >
                            <Icon icon="mdi:plus" class="w-4 h-4" />Tambah
                            Tujuan
                        </button>
                    </div>

                    {#if fieldErrors.tujuan}<p
                            class="text-[11px] text-red-500 mb-4"
                        >
                            {fieldErrors.tujuan}
                        </p>{/if}

                    <div class="space-y-3">
                        {#each tujuan as item, index (item.id)}
                            <div class="flex items-start gap-3">
                                <div
                                    class="w-9 h-9 shrink-0 flex items-center justify-center bg-green text-white text-xs font-bold rounded-lg mt-1"
                                >
                                    {index + 1}
                                </div>
                                <div class="flex-1">
                                    <textarea
                                        bind:value={item.text}
                                        rows="3"
                                        placeholder="Tuliskan tujuan inovasi..."
                                        class="w-full border border-black/10 bg-white/70 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors resize-y"
                                    ></textarea>
                                </div>
                                <button
                                    type="button"
                                    onclick={() => removeTujuan(item.id)}
                                    class="w-10 h-10 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/45 hover:text-red-500 transition-colors cursor-pointer mt-1"
                                    aria-label="Hapus tujuan"
                                >
                                    <Icon icon="mdi:delete" class="w-4 h-4" />
                                </button>
                            </div>
                        {/each}
                    </div>
                </section>

                <section class="bg-white border border-green/8 p-6 md:p-8">
                    <div class="flex items-center justify-between gap-3 mb-6">
                        <div>
                            <h2
                                class="text-lg font-extrabold uppercase tracking-tight text-ink"
                            >
                                Before &amp; After
                            </h2>
                            <p class="text-sm text-ink/45 mt-1">
                                Isi kondisi sebelum dan sesudah inovasi, lengkap
                                dengan foto pendukung jika ada.
                            </p>
                        </div>
                        <button
                            type="button"
                            onclick={addHasil}
                            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green text-white hover:bg-green/90 transition-colors cursor-pointer"
                        >
                            <Icon icon="mdi:plus" class="w-4 h-4" />Tambah Blok
                        </button>
                    </div>

                    {#if fieldErrors.hasil}<p
                            class="text-[11px] text-red-500 mb-4"
                        >
                            {fieldErrors.hasil}
                        </p>{/if}

                    <div class="space-y-5">
                        {#each hasil as item, index (item.id)}
                            <div
                                class="border border-black/8 bg-cream/60 p-5 rounded-xl"
                            >
                                <div
                                    class="flex items-center justify-between gap-3 mb-4"
                                >
                                    <div>
                                        <p
                                            class="text-xs font-black uppercase tracking-wider text-green/75"
                                        >
                                            Blok {index + 1}
                                        </p>
                                        <p class="text-sm text-ink/45 mt-1">
                                            Perbandingan kondisi sebelum dan
                                            sesudah inovasi.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onclick={() => removeHasil(item.id)}
                                        class="w-9 h-9 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/45 hover:text-red-500 transition-colors cursor-pointer"
                                        aria-label="Hapus blok"
                                    >
                                        <Icon
                                            icon="mdi:delete"
                                            class="w-4 h-4"
                                        />
                                    </button>
                                </div>

                                <div
                                    class="grid grid-cols-1 xl:grid-cols-2 gap-5"
                                >
                                    <div
                                        class="border border-red-200 bg-red-50/60 rounded-xl p-4 space-y-4"
                                    >
                                        <div
                                            class="flex items-center gap-2 text-red-600"
                                        >
                                            <Icon
                                                icon="mdi:history"
                                                class="w-4 h-4"
                                            />
                                            <h3
                                                class="text-sm font-black uppercase tracking-wider"
                                            >
                                                Sebelum Inovasi
                                            </h3>
                                        </div>
                                        <input
                                            bind:value={item.sebelumFoto}
                                            type="text"
                                            placeholder="URL foto sebelum"
                                            class="w-full border border-black/10 bg-white rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors font-mono"
                                        />
                                        <div
                                            class="flex flex-col md:flex-row items-start md:items-center gap-3"
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onchange={(event) =>
                                                    handleHasilFile(
                                                        item.id,
                                                        "sebelumFotoFile",
                                                        event,
                                                    )}
                                                class="w-full text-sm text-ink/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-black/10 file:bg-white file:text-xs file:font-semibold file:text-ink/60 hover:file:bg-black/4 file:cursor-pointer file:transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    uploadHasilFoto(
                                                        item.id,
                                                        "sebelum",
                                                    )}
                                                disabled={item.sebelumUploading}
                                                class="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-black/3 text-sm font-semibold text-ink/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer border border-black/8"
                                            >
                                                {#if item.sebelumUploading}
                                                    <span
                                                        class="w-4 h-4 border-2 border-ink/40 border-t-transparent rounded-full animate-spin"
                                                    ></span>
                                                    Uploading...
                                                {:else}
                                                    <Icon
                                                        icon="mdi:upload"
                                                        class="w-4 h-4"
                                                    />
                                                    Upload Foto
                                                {/if}
                                            </button>
                                        </div>
                                        <textarea
                                            bind:value={item.sebelumDeskripsi}
                                            rows="6"
                                            placeholder="Jelaskan kondisi sebelum inovasi..."
                                            class="w-full border border-black/10 bg-white rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors resize-y"
                                        ></textarea>
                                    </div>

                                    <div
                                        class="border border-green/20 bg-green/5 rounded-xl p-4 space-y-4"
                                    >
                                        <div
                                            class="flex items-center gap-2 text-green"
                                        >
                                            <Icon
                                                icon="mdi:check-circle-outline"
                                                class="w-4 h-4"
                                            />
                                            <h3
                                                class="text-sm font-black uppercase tracking-wider"
                                            >
                                                Sesudah Inovasi
                                            </h3>
                                        </div>
                                        <input
                                            bind:value={item.sesudahFoto}
                                            type="text"
                                            placeholder="URL foto sesudah"
                                            class="w-full border border-black/10 bg-white rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green transition-colors font-mono"
                                        />
                                        <div
                                            class="flex flex-col md:flex-row items-start md:items-center gap-3"
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onchange={(event) =>
                                                    handleHasilFile(
                                                        item.id,
                                                        "sesudahFotoFile",
                                                        event,
                                                    )}
                                                class="w-full text-sm text-ink/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-black/10 file:bg-white file:text-xs file:font-semibold file:text-ink/60 hover:file:bg-black/4 file:cursor-pointer file:transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    uploadHasilFoto(
                                                        item.id,
                                                        "sesudah",
                                                    )}
                                                disabled={item.sesudahUploading}
                                                class="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-black/3 text-sm font-semibold text-ink/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer border border-black/8"
                                            >
                                                {#if item.sesudahUploading}
                                                    <span
                                                        class="w-4 h-4 border-2 border-ink/40 border-t-transparent rounded-full animate-spin"
                                                    ></span>
                                                    Uploading...
                                                {:else}
                                                    <Icon
                                                        icon="mdi:upload"
                                                        class="w-4 h-4"
                                                    />
                                                    Upload Foto
                                                {/if}
                                            </button>
                                        </div>
                                        <textarea
                                            bind:value={item.sesudahDeskripsi}
                                            rows="6"
                                            placeholder="Jelaskan kondisi sesudah inovasi..."
                                            class="w-full border border-black/10 bg-white rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green transition-colors resize-y"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </section>
            </div>

            <aside class="space-y-6 xl:sticky xl:top-6">
                <section class="bg-white border border-green/8 p-6">
                    <h2
                        class="text-lg font-extrabold uppercase tracking-tight text-ink mb-5"
                    >
                        Foto Agen
                    </h2>
                    <div class="space-y-4">
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >URL Foto Agen</label
                            >
                            <input
                                bind:value={foto}
                                type="text"
                                placeholder="/api/upload/..."
                                class="w-full border border-black/10 bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors font-mono"
                            />
                        </div>
                        <div>
                            <label
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Upload Foto</label
                            >
                            <input
                                type="file"
                                accept="image/*"
                                onchange={handleFotoFile}
                                class="w-full text-sm text-ink/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-black/10 file:bg-white file:text-xs file:font-semibold file:text-ink/60 hover:file:bg-black/4 file:cursor-pointer file:transition-colors"
                            />
                            <button
                                type="button"
                                onclick={uploadFoto}
                                disabled={fotoUploading}
                                class="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/8 text-sm font-semibold text-ink/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                {#if fotoUploading}
                                    <span
                                        class="w-4 h-4 border-2 border-ink/40 border-t-transparent rounded-full animate-spin"
                                    ></span>
                                    Uploading...
                                {:else}
                                    <Icon
                                        icon="mdi:image-plus"
                                        class="w-4 h-4"
                                    />
                                    Upload Foto Agen
                                {/if}
                            </button>
                        </div>
                        <div
                            class="border border-dashed border-black/10 bg-cream/50 rounded-xl overflow-hidden min-h-52 flex items-center justify-center"
                        >
                            {#if foto}
                                <img
                                    src={foto}
                                    alt={nama || "Foto agen"}
                                    class="w-full h-72 object-cover"
                                />
                            {:else}
                                <div class="text-center px-6 py-8 text-ink/35">
                                    <Icon
                                        icon="mdi:account-tie"
                                        class="w-10 h-10 mx-auto mb-3"
                                    />
                                    <p
                                        class="text-sm font-semibold uppercase tracking-wider"
                                    >
                                        Preview foto agen
                                    </p>
                                </div>
                            {/if}
                        </div>
                    </div>
                </section>

                <section class="bg-white border border-green/8 p-6">
                    <h2
                        class="text-lg font-extrabold uppercase tracking-tight text-ink mb-5"
                    >
                        Ringkasan Preview
                    </h2>
                    <div class="space-y-4 text-sm text-ink/60">
                        <div>
                            <p
                                class="text-[11px] uppercase tracking-wider font-bold text-ink/35 mb-1"
                            >
                                Agen
                            </p>
                            <p class="font-semibold text-ink">
                                {nama || "Belum diisi"}
                            </p>
                        </div>
                        <div>
                            <p
                                class="text-[11px] uppercase tracking-wider font-bold text-ink/35 mb-1"
                            >
                                Inovasi
                            </p>
                            <p class="font-semibold text-ink">
                                {inovasi || "Belum diisi"}
                            </p>
                        </div>
                        <div>
                            <p
                                class="text-[11px] uppercase tracking-wider font-bold text-ink/35 mb-1"
                            >
                                Jabatan
                            </p>
                            <p class="font-semibold text-ink">
                                {jabatan || "Belum diisi"}
                            </p>
                        </div>
                        <div>
                            <p
                                class="text-[11px] uppercase tracking-wider font-bold text-ink/35 mb-1"
                            >
                                Unit Kerja
                            </p>
                            <p class="font-semibold text-ink">
                                {unitKerja || "Belum diisi"}
                            </p>
                        </div>
                        <div>
                            <p
                                class="text-[11px] uppercase tracking-wider font-bold text-ink/35 mb-1"
                            >
                                Jumlah Tujuan
                            </p>
                            <p class="font-semibold text-ink">
                                {tujuan.filter((item) => item.text.trim())
                                    .length}
                            </p>
                        </div>
                        <div>
                            <p
                                class="text-[11px] uppercase tracking-wider font-bold text-ink/35 mb-1"
                            >
                                Blok Before/After
                            </p>
                            <p class="font-semibold text-ink">
                                {hasil.filter(
                                    (item) =>
                                        item.sebelumDeskripsi.trim() ||
                                        item.sesudahDeskripsi.trim(),
                                ).length}
                            </p>
                        </div>
                    </div>
                </section>

                <section class="bg-white border border-green/8 p-6">
                    <div class="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            class="w-full bg-green hover:bg-green/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-3 px-4 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            {#if saving}
                                <div
                                    class="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"
                                ></div>
                                Menyimpan...
                            {:else}
                                <Icon
                                    icon="mdi:content-save-outline"
                                    class="w-4 h-4"
                                />
                                Simpan Agen Perubahan
                            {/if}
                        </button>

                        {#if isEdit}
                            <button
                                type="button"
                                onclick={handleDelete}
                                disabled={deleting}
                                class="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-3 px-4 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {#if deleting}
                                    <div
                                        class="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"
                                    ></div>
                                    Menghapus...
                                {:else}
                                    <Icon
                                        icon="mdi:delete-outline"
                                        class="w-4 h-4"
                                    />
                                    Hapus Data
                                {/if}
                            </button>
                        {/if}
                    </div>
                </section>
            </aside>
        </div>
    </form>
{/if}
