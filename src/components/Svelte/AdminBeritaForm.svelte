<script>
    import EditorJsNotion from "./EditorJsNotion.svelte";
    import { toUploadProxyUrl } from "../../lib/upload-url";

    let {
        mode = "tambah",
        beritaId = null,
        apiUrl = "/api/admin/berita",
        apiStatusUrl = "/api/admin/berita",
    } = $props();

    let judul = $state("");
    let slug = $state("");
    let ringkasan = $state("");
    let thumbnail = $state("");
    let kategori = $state("umum");
    let status = $state("draft");
    let publishedAt = $state("");
    let thumbnailFile = $state(null);
    let thumbnailUploading = $state(false);
    let content = $state({
        time: Date.now(),
        blocks: [],
        version: "2.31.0",
    });
    let loading = $state(mode === "edit");
    let saving = $state(false);
    let toast = $state(null);

    const isEdit = $derived(mode === "edit" && beritaId);
    const kategoriOptions = ["pendidikan", "bimas", "umum","pengumuman","kua"];

    $effect(() => {
        if (isEdit) {
            fetch(`${apiUrl}/${beritaId}`)
                .then((r) => r.json())
                .then((res) => {
                    const item = res.data ?? res;
                    judul = item.judul ?? "";
                    slug = item.slug ?? "";
                    ringkasan = item.ringkasan ?? "";
                    thumbnail = toUploadProxyUrl(item.thumbnail) || item.thumbnail || "";
                    kategori = item.kategori ?? "berita";
                    status = item.status ?? "draft";
                    publishedAt = toDatetimeLocal(item.publishedAt);
                    content = item.content ?? {
                        time: Date.now(),
                        blocks: [],
                        version: "2.31.0",
                    };
                    loading = false;
                })
                .catch(() => {
                    toast = {
                        type: "error",
                        msg: "Gagal memuat data berita.",
                    };
                    loading = false;
                });
        }
    });

    function toDatetimeLocal(isoStr) {
        if (!isoStr) return "";
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return "";
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function showToast(type, msg) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 4000);
    }

    function slugify(value) {
        return String(value ?? "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    }

    const slugPreview = $derived(slug.trim() || slugify(judul));
    const totalBlocks = $derived(content?.blocks?.length ?? 0);

    function handleEditorChange(nextValue) {
        content = nextValue;
    }

    function formatSize(bytes) {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function handleThumbnailFile(event) {
        const input = event.currentTarget;
        const file = input?.files?.[0] ?? null;
        thumbnailFile = file;
    }

    async function uploadThumbnail() {
        if (!thumbnailFile) {
            showToast("error", "Pilih file thumbnail terlebih dahulu.");
            return;
        }

        thumbnailUploading = true;
        try {
            const fd = new FormData();
            fd.append("file", thumbnailFile);

            const res = await fetch("/api/upload-dokumen", {
                method: "POST",
                body: fd,
            });
            const json = await res.json();

            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? "Gagal mengunggah thumbnail.",
                );
            }

            thumbnail =
                toUploadProxyUrl(
                    json.data?.url,
                    json.data?.nama ?? thumbnailFile.name,
                ) || json.data?.url || "";
            showToast("success", "Thumbnail berhasil diunggah.");
        } catch (err) {
            showToast("error", err.message || "Gagal upload thumbnail.");
        } finally {
            thumbnailUploading = false;
        }
    }

    async function saveBerita(forcedStatus = null) {
        if (!judul.trim()) {
            showToast("error", "Judul berita wajib diisi.");
            return;
        }

        if (!ringkasan.trim()) {
            showToast("error", "Ringkasan berita wajib diisi.");
            return;
        }

        if (!content?.blocks?.length) {
            showToast("error", "Isi berita masih kosong.");
            return;
        }

        saving = true;
        try {
            const nextStatus = forcedStatus ?? status;
            const payload = {
                judul: judul.trim(),
                slug: slug.trim() || undefined,
                ringkasan: ringkasan.trim(),
                thumbnail: thumbnail.trim() || null,
                kategori,
                status: nextStatus,
                content,
                ...(publishedAt ? { publishedAt: new Date(publishedAt).toISOString() } : {}),
            };

            const url = isEdit ? `${apiUrl}/${beritaId}` : apiUrl;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? json.error ?? "Gagal menyimpan berita.",
                );
            }

            status = json.data?.status ?? nextStatus;
            if (!isEdit) {
                const nextId = json.data?.id;
                showToast(
                    "success",
                    nextStatus === "published"
                        ? "Berita berhasil dibuat dan dipublish."
                        : "Draft berita berhasil dibuat.",
                );
                if (nextId) {
                    window.location.href = `/admin/berita/edit?id=${nextId}`;
                    return;
                }
            } else {
                showToast(
                    "success",
                    nextStatus === "published"
                        ? "Berita berhasil diperbarui dan dipublish."
                        : "Berita berhasil disimpan.",
                );
            }
        } catch (err) {
            showToast("error", err.message || "Terjadi kesalahan.");
        } finally {
            saving = false;
        }
    }

    async function changeStatus(nextStatus) {
        if (!beritaId) {
            await saveBerita(nextStatus);
            return;
        }

        const res = await fetch(`${apiStatusUrl}/${beritaId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
        });
        const json = await res.json();

        if (json.success === false) {
            showToast("error", json.message ?? "Gagal mengubah status.");
            return;
        }

        status = json.data?.status ?? nextStatus;
        showToast("success", `Status berita diperbarui menjadi ${nextStatus}.`);
    }
</script>

{#if toast}
    <div
        class={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm rounded ${
            toast.type === "success"
                ? "bg-green text-white"
                : "bg-red-600 text-white"
        }`}
    >
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path
                    d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12z"
                ></path>
            </svg>
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
    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div class="space-y-6">
            <section class="bg-white border border-green/8 p-6 md:p-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="md:col-span-2">
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >
                            Judul Berita
                        </label>
                        <input
                            type="text"
                            bind:value={judul}
                            placeholder="Contoh: Peluncuran Layanan Digital Kemenag"
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        />
                    </div>

                    <div>
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >
                            Slug
                        </label>
                        <!-- <input
                            type="text"
                            bind:value={slug}
                            placeholder="otomatis dari judul bila kosong"
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors font-mono"
                        /> -->
                        <p class="text-sm text-ink/35 mt-1 break-all">
                            Preview: /berita/{slugPreview || "judul-berita"}
                        </p>
                    </div>

                    <div>
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >
                            Kategori
                        </label>
                        <select
                            bind:value={kategori}
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                        >
                            {#each kategoriOptions as item}
                                <option value={item}>{item}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="md:col-span-2">
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >
                            Ringkasan
                        </label>
                        <textarea
                            rows="4"
                            bind:value={ringkasan}
                            placeholder="Ringkasan singkat berita untuk card, list, dan SEO."
                            class="w-full border bg-white/50 border-black/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors resize-none"
                        ></textarea>
                    </div>

                    <div class="md:col-span-2">
                        <label
                            class="block text-xs font-bold text-ink/50 uppercase tracking-wider mb-2"
                        >
                            Thumbnail
                        </label>
                        <div class="space-y-3">
                            <div class="flex flex-col gap-3 md:flex-row">
                                <label
                                    class="flex-1 border-2 border-dashed border-black/10 rounded-xl px-4 py-4 bg-cream/40 hover:border-green/40 transition-colors cursor-pointer"
                                >
                                    <span class="block text-sm font-medium text-ink/75">
                                        {thumbnailFile
                                            ? thumbnailFile.name
                                            : "Pilih file dari komputer"}
                                    </span>
                                    <span class="block text-xs text-ink/40 mt-1">
                                        JPG, JPEG, PNG, PDF sesuai endpoint upload.
                                    </span>
                                    {#if thumbnailFile}
                                        <span class="block text-xs text-ink/35 mt-1">
                                            {formatSize(thumbnailFile.size)}
                                        </span>
                                    {/if}
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,image/*"
                                        class="hidden"
                                        onchange={handleThumbnailFile}
                                    />
                                </label>

                                <button
                                    type="button"
                                    onclick={uploadThumbnail}
                                    disabled={!thumbnailFile || thumbnailUploading}
                                    class="px-5 py-3 bg-ink/6 text-ink text-sm font-semibold hover:bg-ink/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    {thumbnailUploading ? "Uploading..." : "Upload"}
                                </button>
                            </div>

                            <!-- <input
                                type="text"
                                bind:value={thumbnail}
                                placeholder="URL thumbnail hasil upload"
                                class="w-full border bg-white/50 border-black/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                            /> -->
                        </div>
                    </div>
                </div>
            </section>

            <section class="bg-white border border-green/8 p-5 md:p-6">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-lg font-bold text-ink">Konten Berita</h2>
                        <p class="text-sm text-ink/45 mt-1">
                            Editor blok dengan nuansa kerja seperti Notion.
                        </p>
                    </div>
                    <span
                        class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/5 text-ink/55"
                    >
                        {totalBlocks} blok
                    </span>
                </div>

                <EditorJsNotion
                    value={content}
                    onChange={handleEditorChange}
                    placeholder="Tulis isi berita. Gunakan '/' atau tombol plus untuk menambah block."
                />
            </section>
        </div>

        <aside class="space-y-4">
            <section class="bg-white border border-green/8 p-5">
                <p class="text-xs font-bold text-ink/40 uppercase tracking-wider">
                    Status Publikasi
                </p>
                <div class="mt-3 flex items-center gap-2">
                    <span
                        class={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                            status === "published"
                                ? "bg-green/12 text-green"
                                : status === "archived"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-black/6 text-ink/55"
                        }`}
                    >
                        {status}
                    </span>
                    {#if isEdit}
                        <span class="text-xs text-ink/35">ID #{beritaId}</span>
                    {/if}
                </div>

                <div class="mt-4">
                    <label class="block text-[11px] font-bold text-ink/40 uppercase tracking-wider mb-1.5">
                        Tanggal Publish
                    </label>
                    <input
                        type="datetime-local"
                        bind:value={publishedAt}
                        class="w-full border border-black/10 bg-white/50 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors"
                    />
                    <p class="text-[11px] text-ink/35 mt-1 leading-snug">
                        {#if publishedAt}
                            {new Date(publishedAt) > new Date()
                                ? "Dijadwalkan untuk dipublish"
                                : "Tanggal di masa lalu"}
                        {:else}
                            Kosong = waktu saat disimpan
                        {/if}
                    </p>
                </div>

                <div class="mt-4 space-y-2">
                    <button
                        onclick={() => saveBerita("draft")}
                        disabled={saving}
                        class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink/6 text-ink text-sm font-semibold hover:bg-ink/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        Simpan Draft
                    </button>

                    <button
                        onclick={() => saveBerita("published")}
                        disabled={saving}
                        class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green text-white text-sm font-semibold hover:bg-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        {saving ? "Menyimpan..." : "Simpan & Publish"}
                    </button>

                    {#if isEdit}
                        <button
                            onclick={() => changeStatus("archived")}
                            class="w-full flex items-center justify-center gap-2 px-4 py-3 border border-black/10 text-ink/65 text-sm font-semibold hover:bg-black/4 transition-colors cursor-pointer"
                        >
                            Arsipkan
                        </button>
                    {/if}
                </div>

                <a
                    href="/admin/berita"
                    class="mt-3 block text-center px-4 py-3 border border-black/10 text-ink/55 text-sm font-semibold hover:bg-black/4 transition-colors"
                >
                    Kembali ke daftar
                </a>
            </section>

            <section class="bg-white border border-green/8 p-5">
                <p class="text-xs font-bold text-ink/40 uppercase tracking-wider">
                    Ringkasan Data
                </p>
                <dl class="space-y-3 mt-4">
                    <div class="flex items-start justify-between gap-3">
                        <dt class="text-sm text-ink/45">Kategori</dt>
                        <dd class="text-sm font-semibold text-ink capitalize">
                            {kategori}
                        </dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                        <dt class="text-sm text-ink/45">Slug aktif</dt>
                        <dd class="text-sm font-semibold text-ink text-right break-all">
                            {slugPreview || "-"}
                        </dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                        <dt class="text-sm text-ink/45">Panjang ringkasan</dt>
                        <dd class="text-sm font-semibold text-ink">
                            {ringkasan.trim().length} karakter
                        </dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                        <dt class="text-sm text-ink/45">Thumbnail</dt>
                        <dd class="text-sm font-semibold text-ink">
                            {thumbnail.trim() ? "Tersedia" : "Belum ada"}
                        </dd>
                    </div>
                </dl>

                {#if thumbnail.trim()}
                    <div class="mt-4 overflow-hidden rounded-2xl border border-black/8 bg-cream">
                        <img
                            src={thumbnail.trim()}
                            alt={judul || "Thumbnail berita"}
                            class="w-full h-44 object-cover"
                        />
                    </div>
                {/if}
            </section>
        </aside>
    </div>
{/if}
