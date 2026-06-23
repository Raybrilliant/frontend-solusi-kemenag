<script lang="ts">
    import Icon from "@iconify/svelte";
    import { toUploadProxyUrl } from "../../lib/upload-url";
    import { getPrestasiSiswaMockById } from "../../lib/prestasi-siswa-mock";

    type WinnerForm = {
        id: string;
        nama: string;
        kelas: string;
        madrasah: string;
        prestasi: string;
        foto: string;
        fotoFile: File | null;
        uploading: boolean;
    };

    let {
        mode = "tambah",
        prestasiId = null,
        apiUrl = "/api/admin/prestasi-siswa",
    } = $props();

    let judul = $state("");
    let prestasi = $state("");
    let deskripsi = $state("");
    let tahun = $state(String(new Date().getFullYear()));
    let tingkat = $state("");
    let penyelenggara = $state("");
    let madrasah = $state("");
    let lokasi = $state("");
    let fotoLomba = $state("");
    let fotoLombaFile = $state<File | null>(null);
    let fotoLombaUploading = $state(false);
    let winners = $state<WinnerForm[]>([]);
    let loading = $state(false);
    let saving = $state(false);
    let deleting = $state(false);
    let toast = $state<{ type: string; msg: string } | null>(null);
    let fieldErrors = $state<Record<string, string>>({});
    let usingMock = $state(false);

    const isEdit = $derived(mode === "edit" && prestasiId);

    function showToast(type: string, msg: string) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 4000);
    }

    function createWinner(
        item: Partial<WinnerForm & Record<string, any>> = {},
    ): WinnerForm {
        return {
            id: String(item.id ?? crypto.randomUUID()),
            nama: String(item.nama ?? item.name ?? ""),
            kelas: String(item.kelas ?? item.className ?? ""),
            madrasah: String(item.madrasah ?? item.schoolName ?? ""),
            prestasi: String(item.prestasi ?? item.achievement ?? ""),
            foto: String(item.foto ?? item.photo ?? item.image ?? ""),
            fotoFile: null,
            uploading: false,
        };
    }

    function applyItem(item: any) {
        judul = item?.judul ?? item?.title ?? "";
        prestasi = item?.prestasi ?? item?.achievement ?? "";
        deskripsi = item?.deskripsi ?? item?.description ?? "";
        tahun = String(item?.tahun ?? item?.year ?? new Date().getFullYear());
        tingkat = item?.tingkat ?? item?.level ?? "";
        penyelenggara = item?.penyelenggara ?? item?.organizer ?? "";
        madrasah = item?.madrasah ?? item?.schoolName ?? "";
        lokasi = item?.lokasi ?? item?.location ?? "";
        fotoLomba =
            toUploadProxyUrl(
                item?.fotoLomba ?? item?.thumbnail ?? item?.image ?? "",
            ) ||
            item?.fotoLomba ||
            item?.thumbnail ||
            item?.image ||
            "";
        winners = (
            Array.isArray(item?.pemenang)
                ? item.pemenang
                : Array.isArray(item?.winners)
                  ? item.winners
                  : []
        ).map(createWinner);
    }

    $effect(() => {
        if (!isEdit) {
            if (winners.length === 0) winners = [createWinner()];
            loading = false;
            return;
        }

        fetch(`${apiUrl}/${prestasiId}`)
            .then((r) => r.json())
            .then((res) => {
                const item = res.data ?? res.item ?? res;
                applyItem(item);
                usingMock = false;
                loading = false;
            })
            .catch(() => {
                const item = getPrestasiSiswaMockById(String(prestasiId));
                if (item) {
                    applyItem(item);
                    usingMock = true;
                } else {
                    showToast("error", "Gagal memuat data prestasi siswa.");
                }
                loading = false;
            });
    });

    function validate() {
        const errors: Record<string, string> = {};
        if (!judul.trim()) errors.judul = "Judul lomba wajib diisi.";
        if (!prestasi.trim()) errors.prestasi = "Prestasi wajib diisi.";
        if (!deskripsi.trim())
            errors.deskripsi = "Deskripsi lomba wajib diisi.";
        const tahunStr = String(tahun ?? "").trim();
        if (!tahunStr) errors.tahun = "Tahun wajib diisi.";
        else if (!/^\d{4}$/.test(tahunStr))
            errors.tahun = "Tahun harus 4 digit.";
        if (!tingkat.trim()) errors.tingkat = "Tingkat lomba wajib diisi.";
        if (!penyelenggara.trim())
            errors.penyelenggara = "Penyelenggara wajib diisi.";
        if (!madrasah.trim()) errors.madrasah = "Madrasah wajib diisi.";
        if (!lokasi.trim()) errors.lokasi = "Lokasi wajib diisi.";

        const activeWinners = winners.filter(
            (item) =>
                item.nama.trim() ||
                item.kelas.trim() ||
                item.madrasah.trim() ||
                item.prestasi.trim() ||
                item.foto.trim(),
        );

        if (activeWinners.length === 0)
            errors.pemenang = "Minimal tambahkan 1 pemenang.";
        else {
            const invalidIndex = activeWinners.findIndex(
                (item) =>
                    !item.nama.trim() ||
                    !item.kelas.trim() ||
                    !item.madrasah.trim() ||
                    !item.prestasi.trim(),
            );
            if (invalidIndex !== -1) {
                errors.pemenang = `Data pemenang ke-${invalidIndex + 1} belum lengkap.`;
            }
        }

        fieldErrors = errors;
        return Object.keys(errors).length === 0;
    }

    function handleFotoLombaFile(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        fotoLombaFile = input?.files?.[0] ?? null;
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

    async function uploadFotoLomba() {
        if (!fotoLombaFile) {
            showToast("error", "Pilih file foto lomba terlebih dahulu.");
            return;
        }

        fotoLombaUploading = true;
        try {
            fotoLomba = await uploadFile(fotoLombaFile);
            showToast("success", "Foto lomba berhasil diunggah.");
        } catch (err) {
            showToast(
                "error",
                (err as Error).message || "Gagal upload foto lomba.",
            );
        } finally {
            fotoLombaUploading = false;
        }
    }

    function addWinner() {
        winners = [...winners, createWinner()];
    }

    function removeWinner(id: string) {
        if (winners.length === 1) {
            winners = [createWinner()];
            return;
        }
        winners = winners.filter((item) => item.id !== id);
    }

    function handleWinnerFile(id: string, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input?.files?.[0] ?? null;
        winners = winners.map((item) =>
            item.id === id ? { ...item, fotoFile: file } : item,
        );
    }

    async function uploadWinnerPhoto(id: string) {
        const winner = winners.find((item) => item.id === id);
        if (!winner?.fotoFile) {
            showToast("error", "Pilih file foto pemenang terlebih dahulu.");
            return;
        }

        winners = winners.map((item) =>
            item.id === id ? { ...item, uploading: true } : item,
        );

        try {
            const url = await uploadFile(winner.fotoFile);
            winners = winners.map((item) =>
                item.id === id
                    ? { ...item, foto: url, uploading: false }
                    : item,
            );
            showToast(
                "success",
                `Foto ${winner.nama || "pemenang"} berhasil diunggah.`,
            );
        } catch (err) {
            winners = winners.map((item) =>
                item.id === id ? { ...item, uploading: false } : item,
            );
            showToast(
                "error",
                (err as Error).message || "Gagal upload foto pemenang.",
            );
        }
    }

    function buildPayload() {
        return {
            judul: judul.trim(),
            prestasi: prestasi.trim(),
            deskripsi: deskripsi.trim(),
            tahun: Number(String(tahun ?? "").trim()),
            tingkat: tingkat.trim(),
            penyelenggara: penyelenggara.trim(),
            madrasah: madrasah.trim(),
            lokasi: lokasi.trim(),
            fotoLomba: fotoLomba.trim() || null,
            pemenang: winners
                .filter(
                    (item) =>
                        item.nama.trim() ||
                        item.kelas.trim() ||
                        item.madrasah.trim() ||
                        item.prestasi.trim() ||
                        item.foto.trim(),
                )
                .map((item) => ({
                    id: item.id,
                    nama: item.nama.trim(),
                    kelas: item.kelas.trim(),
                    madrasah: item.madrasah.trim(),
                    prestasi: item.prestasi.trim(),
                    foto: item.foto.trim() || null,
                })),
        };
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        if (!validate()) return;

        saving = true;
        try {
            const payload = buildPayload();
            const url = isEdit ? `${apiUrl}/${prestasiId}` : apiUrl;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? "Gagal menyimpan prestasi siswa.",
                );
            }

            const savedId = json.data?.id ?? prestasiId;
            showToast(
                "success",
                isEdit
                    ? "Prestasi siswa berhasil diperbarui."
                    : "Prestasi siswa berhasil ditambahkan.",
            );

            if (!isEdit && savedId) {
                setTimeout(() => {
                    window.location.href = `/admin/prestasi-siswa/${savedId}`;
                }, 400);
            }
        } catch (err) {
            if (!isEdit) {
                showToast(
                    "success",
                    "Endpoint backend belum tersedia. Form berhasil ditampilkan dalam mode demo.",
                );
                usingMock = true;
            } else {
                showToast(
                    "error",
                    (err as Error).message || "Terjadi kesalahan.",
                );
            }
        } finally {
            saving = false;
        }
    }

    async function handleDelete() {
        if (!prestasiId) return;
        if (!confirm("Hapus data prestasi siswa ini?")) return;

        if (usingMock) {
            showToast("success", "Data mock dihapus pada mode demo.");
            setTimeout(() => {
                window.location.href = "/admin/prestasi-siswa";
            }, 500);
            return;
        }

        deleting = true;
        try {
            const res = await fetch(`${apiUrl}/${prestasiId}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? "Gagal menghapus data prestasi.",
                );
            }
            showToast("success", "Prestasi siswa berhasil dihapus.");
            setTimeout(() => {
                window.location.href = "/admin/prestasi-siswa";
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
    <form onsubmit={handleSubmit} class="space-y-6 max-w-6xl">
        {#if usingMock}
            <div
                class="flex items-start gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
                <Icon
                    icon="mdi:flask-outline"
                    class="w-5 h-5 shrink-0 mt-0.5"
                />
                <div>
                    <p class="font-semibold">Mode demo aktif</p>
                    <p class="text-amber-700/90 mt-1">
                        Data sedang menggunakan fallback mock karena endpoint
                        backend belum tersedia atau gagal diakses.
                    </p>
                </div>
            </div>
        {/if}

        <div
            class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start"
        >
            <div class="space-y-6">
                <section class="bg-white border border-green/8 p-6 md:p-8">
                    <div class="flex items-center justify-between gap-3 mb-6">
                        <div>
                            <h2
                                class="text-lg font-extrabold uppercase tracking-tight text-ink"
                            >
                                Informasi Prestasi
                            </h2>
                            <p class="text-sm text-ink/45 mt-1">
                                Isi data utama lomba dan prestasi yang akan
                                tampil di halaman publik.
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div class="md:col-span-2">
                            <label
                                for="prestasi-judul"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Judul Lomba</label
                            >
                            <input
                                id="prestasi-judul"
                                type="text"
                                bind:value={judul}
                                placeholder="Contoh: Kompetisi Sains Madrasah Tingkat Kota 2026"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.judul ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.judul}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.judul}
                                </p>{/if}
                        </div>

                        <div>
                            <label
                                for="prestasi-nama"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Prestasi</label
                            >
                            <input
                                id="prestasi-nama"
                                type="text"
                                bind:value={prestasi}
                                placeholder="Contoh: Juara 1 Bidang IPA Terpadu"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.prestasi ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.prestasi}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.prestasi}
                                </p>{/if}
                        </div>

                        <div>
                            <label
                                for="prestasi-tahun"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Tahun</label
                            >
                            <input
                                id="prestasi-tahun"
                                type="number"
                                bind:value={tahun}
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
                                for="prestasi-tingkat"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Tingkat</label
                            >
                            <input
                                id="prestasi-tingkat"
                                type="text"
                                bind:value={tingkat}
                                placeholder="Contoh: Tingkat Kota"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.tingkat ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.tingkat}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.tingkat}
                                </p>{/if}
                        </div>

                        <div>
                            <label
                                for="prestasi-penyelenggara"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Penyelenggara</label
                            >
                            <input
                                id="prestasi-penyelenggara"
                                type="text"
                                bind:value={penyelenggara}
                                placeholder="Contoh: Kementerian Agama Kota Probolinggo"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.penyelenggara ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.penyelenggara}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.penyelenggara}
                                </p>{/if}
                        </div>

                        <div>
                            <label
                                for="prestasi-madrasah"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Madrasah</label
                            >
                            <input
                                id="prestasi-madrasah"
                                type="text"
                                bind:value={madrasah}
                                placeholder="Contoh: MTsN Kota Probolinggo"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.madrasah ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.madrasah}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.madrasah}
                                </p>{/if}
                        </div>

                        <div class="md:col-span-2">
                            <label
                                for="prestasi-lokasi"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Lokasi Lomba</label
                            >
                            <input
                                id="prestasi-lokasi"
                                type="text"
                                bind:value={lokasi}
                                placeholder="Contoh: Kota Probolinggo"
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors ${fieldErrors.lokasi ? "border-red-400" : "border-black/10"}`}
                            />
                            {#if fieldErrors.lokasi}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.lokasi}
                                </p>{/if}
                        </div>

                        <div class="md:col-span-2">
                            <label
                                for="prestasi-deskripsi"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Detail / Deskripsi Lomba</label
                            >
                            <textarea
                                id="prestasi-deskripsi"
                                rows="5"
                                bind:value={deskripsi}
                                placeholder="Jelaskan detail lomba, jalannya kompetisi, dan pencapaian siswa..."
                                class={`w-full border bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors resize-y ${fieldErrors.deskripsi ? "border-red-400" : "border-black/10"}`}
                            ></textarea>
                            {#if fieldErrors.deskripsi}<p
                                    class="text-[11px] text-red-500 mt-1"
                                >
                                    {fieldErrors.deskripsi}
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
                                Daftar Pemenang
                            </h2>
                            <p class="text-sm text-ink/45 mt-1">
                                Tambahkan siswa yang memenangkan lomba beserta
                                foto dan informasi pendukungnya.
                            </p>
                        </div>
                        <button
                            type="button"
                            onclick={addWinner}
                            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green text-white hover:bg-green/90 transition-colors cursor-pointer"
                        >
                            <Icon icon="mdi:plus" class="w-4 h-4" />Tambah
                            Pemenang
                        </button>
                    </div>

                    {#if fieldErrors.pemenang}
                        <p class="text-[11px] text-red-500 mb-4">
                            {fieldErrors.pemenang}
                        </p>
                    {/if}

                    <div class="space-y-5">
                        {#each winners as winner, index (winner.id)}
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
                                            Pemenang {index + 1}
                                        </p>
                                        <p class="text-sm text-ink/45 mt-1">
                                            Isi identitas siswa dan capaian pada
                                            lomba.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onclick={() => removeWinner(winner.id)}
                                        class="w-9 h-9 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/45 hover:text-red-500 transition-colors cursor-pointer"
                                        aria-label="Hapus pemenang"
                                    >
                                        <Icon
                                            icon="mdi:delete"
                                            class="w-4 h-4"
                                        />
                                    </button>
                                </div>

                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <div>
                                        <label
                                            for={`winner-nama-${winner.id}`}
                                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                            >Nama Siswa</label
                                        >
                                        <input
                                            id={`winner-nama-${winner.id}`}
                                            type="text"
                                            bind:value={winner.nama}
                                            placeholder="Nama lengkap siswa"
                                            class="w-full border border-black/10 bg-white/70 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for={`winner-kelas-${winner.id}`}
                                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                            >Kelas</label
                                        >
                                        <input
                                            id={`winner-kelas-${winner.id}`}
                                            type="text"
                                            bind:value={winner.kelas}
                                            placeholder="Contoh: IX-A"
                                            class="w-full border border-black/10 bg-white/70 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for={`winner-madrasah-${winner.id}`}
                                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                            >Madrasah</label
                                        >
                                        <input
                                            id={`winner-madrasah-${winner.id}`}
                                            type="text"
                                            bind:value={winner.madrasah}
                                            placeholder="Contoh: MAN 1 Kota Probolinggo"
                                            class="w-full border border-black/10 bg-white/70 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            for={`winner-prestasi-${winner.id}`}
                                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                            >Prestasi Siswa</label
                                        >
                                        <input
                                            id={`winner-prestasi-${winner.id}`}
                                            type="text"
                                            bind:value={winner.prestasi}
                                            placeholder="Contoh: Juara 1"
                                            class="w-full border border-black/10 bg-white/70 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                                        />
                                    </div>
                                    <div class="md:col-span-2">
                                        <label
                                            for={`winner-foto-${winner.id}`}
                                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                            >URL Foto Siswa</label
                                        >
                                        <input
                                            id={`winner-foto-${winner.id}`}
                                            type="text"
                                            bind:value={winner.foto}
                                            placeholder="/api/upload/..."
                                            class="w-full border border-black/10 bg-white/70 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors font-mono"
                                        />
                                    </div>
                                    <div class="md:col-span-2">
                                        <label
                                            for={`winner-upload-${winner.id}`}
                                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                            >Upload Foto Siswa</label
                                        >
                                        <div
                                            class="flex flex-col md:flex-row items-start md:items-center gap-3"
                                        >
                                            <input
                                                id={`winner-upload-${winner.id}`}
                                                type="file"
                                                accept="image/*"
                                                onchange={(event) =>
                                                    handleWinnerFile(
                                                        winner.id,
                                                        event,
                                                    )}
                                                class="w-full text-sm text-ink/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-black/10 file:bg-white file:text-xs file:font-semibold file:text-ink/60 hover:file:bg-black/4 file:cursor-pointer file:transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    uploadWinnerPhoto(
                                                        winner.id,
                                                    )}
                                                disabled={winner.uploading}
                                                class="inline-flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/8 text-sm font-semibold text-ink/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                            >
                                                {#if winner.uploading}
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
                        Foto Lomba
                    </h2>
                    <div class="space-y-4">
                        <div>
                            <label
                                for="foto-lomba-url"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >URL Foto Lomba</label
                            >
                            <input
                                id="foto-lomba-url"
                                type="text"
                                bind:value={fotoLomba}
                                placeholder="/api/upload/..."
                                class="w-full border border-black/10 bg-white/50 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors font-mono"
                            />
                        </div>

                        <div>
                            <label
                                for="foto-lomba-file"
                                class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                                >Upload Foto</label
                            >
                            <input
                                id="foto-lomba-file"
                                type="file"
                                accept="image/*"
                                onchange={handleFotoLombaFile}
                                class="w-full text-sm text-ink/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-black/10 file:bg-white file:text-xs file:font-semibold file:text-ink/60 hover:file:bg-black/4 file:cursor-pointer file:transition-colors"
                            />
                            <button
                                type="button"
                                onclick={uploadFotoLomba}
                                disabled={fotoLombaUploading}
                                class="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/8 text-sm font-semibold text-ink/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                {#if fotoLombaUploading}
                                    <span
                                        class="w-4 h-4 border-2 border-ink/40 border-t-transparent rounded-full animate-spin"
                                    ></span>
                                    Uploading...
                                {:else}
                                    <Icon
                                        icon="mdi:image-plus"
                                        class="w-4 h-4"
                                    />
                                    Upload Foto Lomba
                                {/if}
                            </button>
                        </div>

                        <div
                            class="border border-dashed border-black/10 bg-cream/50 rounded-xl overflow-hidden min-h-52 flex items-center justify-center"
                        >
                            {#if fotoLomba}
                                <img
                                    src={fotoLomba}
                                    alt={judul || "Foto lomba"}
                                    class="w-full h-64 object-cover"
                                />
                            {:else}
                                <div class="text-center px-6 py-8 text-ink/35">
                                    <Icon
                                        icon="mdi:image-outline"
                                        class="w-10 h-10 mx-auto mb-3"
                                    />
                                    <p class="text-sm font-semibold">
                                        Preview foto lomba akan tampil di sini
                                    </p>
                                </div>
                            {/if}
                        </div>
                    </div>
                </section>

                <section class="bg-white border border-green/8 p-6">
                    <h2
                        class="text-lg font-extrabold uppercase tracking-tight text-ink mb-4"
                    >
                        Aksi
                    </h2>
                    <div class="space-y-3">
                        <button
                            type="submit"
                            disabled={saving}
                            class="w-full flex items-center justify-center gap-2 px-5 py-3 bg-green text-white text-sm font-semibold hover:bg-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            {#if saving}
                                <span
                                    class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                                ></span>
                                Menyimpan...
                            {:else}
                                <Icon icon="mdi:content-save" class="w-4 h-4" />
                                {mode === "edit"
                                    ? "Simpan Perubahan"
                                    : "Tambah Prestasi"}
                            {/if}
                        </button>

                        <a
                            href="/admin/prestasi-siswa"
                            class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 border border-black/10 text-sm font-semibold text-ink/55 hover:text-ink hover:bg-black/4 transition-colors"
                        >
                            <Icon icon="mdi:arrow-left" class="w-4 h-4" />
                            Kembali ke daftar
                        </a>

                        {#if mode === "edit"}
                            <button
                                type="button"
                                onclick={handleDelete}
                                disabled={deleting}
                                class="w-full flex items-center justify-center gap-2 px-5 py-3 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                {#if deleting}
                                    <span
                                        class="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"
                                    ></span>
                                    Menghapus...
                                {:else}
                                    <Icon icon="mdi:delete" class="w-4 h-4" />
                                    Hapus Prestasi
                                {/if}
                            </button>
                        {/if}
                    </div>
                </section>
            </aside>
        </div>
    </form>
{/if}
