<script lang="ts">
    import Icon from "@iconify/svelte";
    let { permohonan, syarat = [], subService = null } = $props();

    type Toast = { type: "success" | "error"; msg: string };

    // ── Local state ───────────────────────────────────────
    // svelte-ignore state_referenced_locally — intentionally capture initial value
    let current = $state({ ...permohonan });
    // svelte-ignore state_referenced_locally
    let newStatus = $state(permohonan.status);
    // svelte-ignore state_referenced_locally
    let pesanTolak = $state(permohonan.rejectionReason ?? "");
    // svelte-ignore state_referenced_locally
    let pesanSelesai = $state(permohonan.message ?? "");
    let outputFile = $state<File | null>(null);
    let isDragging = $state(false);
    let submitting = $state(false);
    let toast = $state<Toast | null>(null);
    let now = $state(Date.now());

    // Tick every 30s saat dalam proses
    $effect(() => {
        if (current.status === "Diproses") {
            const t = setInterval(() => {
                now = Date.now();
            }, 30_000);
            return () => clearInterval(t);
        }
    });

    // ── SLA kalkulasi ─────────────────────────────────────
    function parseProgressMs(duration: number, unit: string) {
        if (!duration || !unit) return 0;
        if (unit === "menit") return duration * 60_000;
        if (unit === "jam") return duration * 3_600_000;
        if (unit === "hari") return duration * 86_400_000;
        return 0;
    }

    const totalSlaMs = $derived(
        subService?.slaDuration && subService?.slaUnit
            ? parseProgressMs(subService.slaDuration, subService.slaUnit)
            : 0,
    );
    const elapsedMs = $derived(
        now - new Date(current.processedAt ?? current.submittedAt).getTime(),
    );
    const remainMs = $derived(
        totalSlaMs > 0 ? Math.max(0, totalSlaMs - elapsedMs) : 0,
    );
    const isOverdue = $derived(
        current.status === "Diproses" &&
            totalSlaMs > 0 &&
            elapsedMs > totalSlaMs,
    );
    const overdueMs = $derived(isOverdue ? elapsedMs - totalSlaMs : 0);

    function formatDuration(ms: number) {
        if (ms <= 0) return "-";
        const totalMin = Math.floor(ms / 60_000);
        const days = Math.floor(totalMin / 1440);
        const hours = Math.floor((totalMin % 1440) / 60);
        const mins = totalMin % 60;
        if (days > 0) return `${days} hari${hours > 0 ? ` ${hours}j` : ""}`;
        if (hours > 0) return `${hours}j ${mins}m`;
        return `${mins}m`;
    }

    // ── Helpers ───────────────────────────────────────────
    function formatDatetime(iso: string) {
        if (!iso) return "-";
        return new Date(iso).toLocaleString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatSize(bytes: number) {
        if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1_048_576).toFixed(1)} MB`;
    }

    function statusCls(s: string) {
        if (s === "Diproses")
            return "bg-amber-50 text-amber-800 border-amber-200";
        if (s === "Selesai") return "bg-green/10 text-green border-green/30";
        if (s === "Ditolak") return "bg-red-50 text-red-700 border-red-200";
        return "bg-gray-100 text-gray-600 border-gray-200";
    }

    function statusDot(s: string) {
        if (s === "Diproses") return "bg-amber-400";
        if (s === "Selesai") return "bg-green";
        if (s === "Ditolak") return "bg-red-500";
        return "bg-gray-400";
    }

    // ── Download ──────────────────────────────────────────
    function toProxyUrl(url: string): string {
        const filename = url.split("/").pop();
        return filename ? `/api/upload/${filename}` : url;
    }

    function downloadFile(url: string, nama: string) {
        const a = document.createElement("a");
        a.href = toProxyUrl(url);
        a.download = nama;
        a.target = "_blank";
        a.click();
    }

    // ── Output file pick ──────────────────────────────────
    function handleOutputFile(e: Event) {
        const input = e.target as HTMLInputElement | null;
        const drag = e as DragEvent;
        const f = input?.files?.[0] ?? drag?.dataTransfer?.files?.[0];
        if (f) outputFile = f;
    }

    // ── Submit status update ──────────────────────────────
    async function handleSubmit(e: Event) {
        e.preventDefault();
        toast = null;

        if (newStatus === "Selesai" && !pesanSelesai.trim()) {
            toast = {
                type: "error",
                msg: "Mohon isi pesan untuk pemohon terlebih dahulu.",
            };
            return;
        }
        if (newStatus === "Ditolak" && !pesanTolak.trim()) {
            toast = { type: "error", msg: "Mohon isi alasan penolakan." };
            return;
        }

        submitting = true;
        try {
            const body: Record<string, unknown> = {
                status: newStatus,
            };
            if (newStatus === "Ditolak") {
                body.rejectionReason = pesanTolak.trim();
            }
            if (newStatus === "Selesai") {
                body.message = pesanSelesai.trim();
            }
            if (newStatus === "Selesai" && outputFile) {
                const fd = new FormData();
                fd.append("file", outputFile);
                const upRes = await fetch("/api/upload-dokumen", {
                    method: "POST",
                    body: fd,
                });
                const upJson = await upRes.json();
                if (!upJson.success) {
                    throw new Error(
                        upJson.message ?? "Gagal mengunggah dokumen output.",
                    );
                }
                body.outputFile = {
                    nama: upJson.data.nama,
                    url: upJson.data.url,
                };
            }

            const res = await fetch(
                `/api/admin/permohonan/${current.id}/status`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                },
            );

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message ?? "Gagal memperbarui status");
            }

            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message ?? "Gagal memperbarui status");
            }

            // Update local state setelah API berhasil
            current = {
                ...current,
                status: newStatus,
                ...(newStatus === "Ditolak" && {
                    rejectionReason: pesanTolak.trim(),
                }),
                ...(newStatus === "Selesai" && {
                    message: pesanSelesai.trim(),
                }),
                ...(newStatus === "Selesai" && outputFile
                    ? {
                          outputFile: {
                              nama: outputFile.name,
                              url: result.data?.outputFile?.url ?? "#",
                          },
                      }
                    : {}),
            };

            toast = {
                type: "success",
                msg: `Status berhasil diubah menjadi "${newStatus}".`,
            };
            setTimeout(() => {
                toast = null;
            }, 5000);
        } catch (err: unknown) {
            toast = {
                type: "error",
                msg:
                    err instanceof Error
                        ? err.message
                        : "Terjadi kesalahan. Silakan coba lagi.",
            };
        } finally {
            submitting = false;
        }
    }

    const statusOptions = ["Diproses", "Selesai", "Ditolak"];
</script>

<!-- ── Toast ─────────────────────────────────────────── -->
{#if toast}
    <div
        class="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm
    {toast.type === 'success'
            ? 'bg-green text-white'
            : 'bg-red-600 text-white'}"
    >
        {#if toast.type === "success"}
            <Icon icon="mdi:check" width="18" height="18" class="shrink-0" />
        {:else}
            <Icon
                icon="mdi:alert-circle"
                width="18"
                height="18"
                class="shrink-0"
            />
        {/if}
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Tutup notifikasi"
        >
            <Icon icon="mdi:close" width="16" height="16" />
        </button>
    </div>
{/if}

<!-- ── Header ─────────────────────────────────────────── -->
<div class="bg-white border-b border-black/8 px-6 md:px-8 py-5">
    <nav class="flex items-center gap-2 text-xs text-ink/40 mb-4">
        <a href="/admin" class="hover:text-ink transition-colors">Dashboard</a>
        <Icon icon="mdi:chevron-right" width="14" height="14" />
        <a href="/admin/permohonan" class="hover:text-ink transition-colors"
            >Permohonan</a
        >
        <Icon icon="mdi:chevron-right" width="14" height="14" />
        <span class="text-ink font-semibold font-mono">{current.id}</span>
    </nav>

    <div
        class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
    >
        <div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="font-mono text-xs font-bold bg-ink/8 px-2.5 py-1"
                    >{current.id}</span
                >
                <span
                    class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 border {statusCls(
                        current.status,
                    )}"
                >
                    <span
                        class="w-1.5 h-1.5 rounded-full {statusDot(
                            current.status,
                        )}"
                    ></span>
                    {current.status}
                </span>
            </div>
            <h1 class="text-xl md:text-2xl font-bold">
                {current.applicantName}
            </h1>
            <p class="text-sm text-ink/50 mt-1">
                {current.serviceTitle} · Dikirim {formatDatetime(
                    current.submittedAt,
                )}
            </p>
        </div>

        <!-- SLA dinamis -->
        <div
            class="flex items-center gap-3 bg-ink/3 border border-ink/8 px-4 py-3 shrink-0"
        >
            <Icon
                icon="mdi:clock-outline"
                width="18"
                height="18"
                class={isOverdue
                    ? "text-red-500"
                    : current.status !== "Diproses"
                      ? "text-ink/30"
                      : "text-green"}
            />
            <div>
                <p
                    class="text-[10px] font-bold uppercase tracking-widest text-ink/40"
                >
                    {#if current.status === "Selesai"}Selesai
                    {:else if current.status === "Ditolak"}Status
                    {:else if current.status === "Diproses" && isOverdue}Terlambat
                    {:else if current.status === "Diproses"}SLA Tersisa
                    {:else}-
                    {/if}
                </p>
                {#if current.status === "Selesai"}
                    <p class="text-sm font-bold text-green">✓ Selesai</p>
                {:else if current.status === "Ditolak"}
                    <p class="text-sm font-bold text-red-500">Ditolak</p>
                {:else if !subService?.slaDuration}
                    <p class="text-sm font-semibold text-ink/40">-</p>
                {:else if current.status === "Diproses" && isOverdue}
                    <p class="text-lg font-bold text-red-500">
                        +{formatDuration(overdueMs)}
                    </p>
                {:else if current.status === "Diproses"}
                    <p class="text-lg font-bold text-green">
                        {formatDuration(remainMs)}
                    </p>
                {:else}
                    <p class="text-sm font-semibold text-ink/40">-</p>
                {/if}
                {#if subService?.slaDuration && current.status === "Diproses"}
                    <p class="text-[10px] text-ink/40">
                        dari {subService.slaDuration}
                        {subService.slaUnit === "menit"
                            ? "Menit"
                            : subService.slaUnit === "jam"
                              ? "Jam"
                              : "Hari"}
                    </p>
                {/if}
            </div>
        </div>
    </div>
</div>

<!-- ── Main content ───────────────────────────────────── -->
<div class="px-6 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- ── Left column ──────────────────────────────────── -->
    <div class="lg:col-span-2 space-y-5">
        <!-- Informasi Pemohon -->
        <div class="bg-white border border-black/8">
            <div
                class="flex items-center gap-3 px-5 py-4 border-b border-black/8"
            >
                <div
                    class="w-8 h-8 bg-green flex items-center justify-center shrink-0"
                >
                    <Icon
                        icon="mdi:account"
                        width="16"
                        height="16"
                        style="color: white;"
                    />
                </div>
                <h2 class="text-sm font-bold uppercase tracking-wide">
                    Informasi Pemohon
                </h2>
            </div>
            <div
                class="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-black/6"
            >
                <div class="p-5 space-y-4">
                    {@render InfoRow({
                        label: "Nama Lengkap",
                        value: current.applicantName,
                    })}
                    {@render InfoRow({
                        label: "Nomor WhatsApp",
                        value: current.applicantPhone,
                    })}
                </div>
                <div class="p-5 space-y-4">
                    {@render InfoRow({
                        label: "Kecamatan",
                        value: current.kecamatan,
                    })}
                    {@render InfoRow({
                        label: "Kelurahan",
                        value: current.kelurahan,
                    })}
                    {@render InfoRow({
                        label: "Alamat",
                        value: current.alamat,
                    })}
                </div>
            </div>
            {#if current.keterangan}
                <div class="px-5 py-4 border-t border-black/6">
                    <p
                        class="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-1"
                    >
                        Keterangan
                    </p>
                    <p class="text-sm text-ink/80 leading-relaxed">
                        {current.keterangan}
                    </p>
                </div>
            {/if}
        </div>

        <!-- Dokumen Diunggah -->
        <div class="bg-white border border-black/8">
            <div
                class="flex items-center gap-3 px-5 py-4 border-b border-black/8"
            >
                <div
                    class="w-8 h-8 bg-green flex items-center justify-center shrink-0"
                >
                    <Icon
                        icon="mdi:file-document-multiple-outline"
                        width="16"
                        height="16"
                        style="color: white;"
                    />
                </div>
                <h2 class="text-sm font-bold uppercase tracking-wide">
                    Dokumen Diunggah Pemohon
                </h2>
                <span class="ml-auto text-xs font-bold bg-ink/8 px-2 py-0.5"
                    >{current.dokumen?.length ?? 0} file</span
                >
            </div>
            <div class="divide-y divide-black/6">
                {#each current.dokumen ?? [] as doc}
                    <div
                        class="flex items-center gap-4 px-5 py-3.5 hover:bg-ink/2 transition-colors group"
                    >
                        <div
                            class="w-9 h-9 flex items-center justify-center shrink-0 rounded"
                            style="background:{doc.tipe === 'pdf'
                                ? '#FEE2E2'
                                : doc.tipe === 'image'
                                  ? '#DBEAFE'
                                  : '#F3F4F6'}"
                        >
                            {#if doc.tipe === "pdf"}
                                <Icon
                                    icon="mdi:file-pdf-box"
                                    width="16"
                                    height="16"
                                    style="color: #EF4444;"
                                />
                            {:else if doc.tipe === "image"}
                                <Icon
                                    icon="mdi:image"
                                    width="16"
                                    height="16"
                                    style="color: #3B82F6;"
                                />
                            {:else}
                                <Icon
                                    icon="mdi:file-document-outline"
                                    width="16"
                                    height="16"
                                    style="color: #6B7280;"
                                />
                            {/if}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold truncate">
                                {doc.nama}
                            </p>
                            <p class="text-xs text-ink/40 mt-0.5">
                                {formatSize(doc.ukuran)}
                            </p>
                        </div>
                        <button
                            onclick={() => downloadFile(doc.url, doc.nama)}
                            class="flex items-center gap-1.5 text-xs font-bold text-green border border-green/30 px-3 py-1.5 hover:bg-green hover:text-white transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            aria-label="Unduh {doc.nama}"
                        >
                            <Icon icon="mdi:download" width="13" height="13" />
                            Unduh
                        </button>
                    </div>
                {/each}
                {#if !current.dokumen?.length}
                    <p class="px-5 py-8 text-sm text-ink/40 text-center">
                        Tidak ada dokumen yang diunggah.
                    </p>
                {/if}
            </div>
        </div>

        <!-- Persyaratan Dokumen -->
        <div class="bg-white border border-black/8">
            <div
                class="flex items-center gap-3 px-5 py-4 border-b border-black/8"
            >
                <div
                    class="w-8 h-8 bg-green flex items-center justify-center shrink-0"
                >
                    <Icon
                        icon="mdi:clipboard-check-outline"
                        width="16"
                        height="16"
                        style="color: white;"
                    />
                </div>
                <h2 class="text-sm font-bold uppercase tracking-wide">
                    Persyaratan Dokumen
                </h2>
                <span class="ml-auto text-xs font-bold bg-ink/8 px-2 py-0.5">
                    {syarat.filter((s) => s.required || s.wajib).length} wajib
                </span>
            </div>
            {#if syarat.length > 0}
                <ul class="divide-y divide-black/6">
                    {#each syarat as item}
                        <li class="flex items-start gap-3 px-5 py-3 text-sm">
                            <span
                                class="text-[10px] font-bold px-1.5 py-0.5 shrink-0 mt-0.5
                {(item.required ?? item.wajib)
                                    ? 'bg-green text-white'
                                    : 'bg-ink/10 text-ink/50'}"
                            >
                                {(item.required ?? item.wajib)
                                    ? "Wajib"
                                    : "Opsional"}
                            </span>
                            <span class="text-ink/80">{item.label}</span>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="px-5 py-8 text-sm text-ink/40 text-center">
                    Tidak ada persyaratan terdaftar.
                </p>
            {/if}
        </div>

        <!-- Informasi selesai -->
        {#if current.status === "Selesai"}
            <div class="space-y-4">
                {#if current.message}
                    <div class="bg-green/5 border border-green/30 px-5 py-4">
                        <div class="flex items-center gap-2 mb-2">
                            <Icon
                                icon="mdi:message-text-outline"
                                width="16"
                                height="16"
                                class="text-green shrink-0"
                            />
                            <p
                                class="text-xs font-bold uppercase tracking-widest text-green"
                            >
                                Pesan untuk Pemohon
                            </p>
                        </div>
                        <p
                            class="text-sm text-green/80 leading-relaxed whitespace-pre-wrap"
                        >
                            {current.message}
                        </p>
                    </div>
                {/if}

                {#if current.outputFile}
                    <div
                        class="bg-green/5 border border-green/30 px-5 py-4 flex items-center gap-4"
                    >
                        <div
                            class="w-10 h-10 bg-green flex items-center justify-center shrink-0"
                        >
                            <Icon
                                icon="mdi:check"
                                width="18"
                                height="18"
                                style="color: white;"
                            />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p
                                class="text-xs font-bold uppercase tracking-widest text-green mb-0.5"
                            >
                                Dokumen Output Tersedia
                            </p>
                            <p class="text-sm font-semibold truncate">
                                {current.outputFile.nama}
                            </p>
                        </div>
                        <button
                            onclick={() =>
                                downloadFile(
                                    current.outputFile.url,
                                    current.outputFile.nama,
                                )}
                            class="flex items-center gap-2 bg-green text-white text-sm font-bold px-4 py-2 hover:bg-green/90 transition-colors shrink-0"
                        >
                            <Icon icon="mdi:download" width="14" height="14" />
                            Unduh Output
                        </button>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Alasan penolakan (jika ditolak) -->
        {#if current.status === "Ditolak" && current.rejectionReason}
            <div class="bg-red-50 border border-red-200 px-5 py-4">
                <div class="flex items-center gap-2 mb-2">
                    <Icon
                        icon="mdi:alert-circle"
                        width="16"
                        height="16"
                        class="text-red-500 shrink-0"
                    />
                    <p
                        class="text-xs font-bold uppercase tracking-widest text-red-600"
                    >
                        Alasan Penolakan
                    </p>
                </div>
                <p class="text-sm text-red-700 leading-relaxed">
                    {current.rejectionReason}
                </p>
            </div>
        {/if}
    </div>

    <!-- ── Right column (sticky) ────────────────────────── -->
    <div class="space-y-5">
        <div class="sticky top-6 space-y-5">
            <!-- Ubah Status -->
            <div class="bg-white border border-black/8">
                <div
                    class="flex items-center gap-3 px-5 py-4 border-b border-black/8"
                >
                    <div
                        class="w-8 h-8 bg-ink flex items-center justify-center shrink-0"
                    >
                        <Icon
                            icon="mdi:clock-outline"
                            width="16"
                            height="16"
                            style="color: white;"
                        />
                    </div>
                    <h2 class="text-sm font-bold uppercase tracking-wide">
                        Ubah Status
                    </h2>
                </div>

                <form onsubmit={handleSubmit} class="p-5 space-y-4">
                    <!-- Status options — gunakan onchange eksplisit, bukan bind:group -->
                    <div class="space-y-2">
                        {#each statusOptions as opt}
                            <label
                                class="flex items-center gap-3 p-3 border cursor-pointer transition-all select-none
                {newStatus === opt
                                    ? 'border-green bg-green/3'
                                    : 'border-black/10 hover:border-black/20 hover:bg-black/2'}"
                            >
                                <input
                                    type="radio"
                                    name="status-selector"
                                    value={opt}
                                    checked={newStatus === opt}
                                    onchange={() => (newStatus = opt)}
                                    class="sr-only"
                                />
                                <div
                                    class="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all
                  {newStatus === opt
                                        ? 'border-green bg-green'
                                        : 'border-ink/30'}"
                                >
                                    {#if newStatus === opt}
                                        <div
                                            class="w-1.5 h-1.5 rounded-full bg-white"
                                        ></div>
                                    {/if}
                                </div>
                                <span class="text-sm font-semibold flex-1"
                                    >{opt}</span
                                >
                                <span
                                    class="text-[10px] font-bold px-2 py-0.5 border {statusCls(
                                        opt,
                                    )}">{opt}</span
                                >
                            </label>
                        {/each}
                    </div>

                    <!-- Detail selesai (Selesai) -->
                    {#if newStatus === "Selesai"}
                        <div class="space-y-4">
                            <div class="space-y-2">
                                <p
                                    class="text-xs font-bold uppercase tracking-widest text-ink/50"
                                >
                                    Pesan untuk Pemohon <span
                                        class="text-red-500">*</span
                                    >
                                </p>
                                <textarea
                                    bind:value={pesanSelesai}
                                    rows="4"
                                    placeholder="Tulis pesan/catatan penyelesaian yang akan ditampilkan ke pemohon..."
                                    class="w-full px-3 py-2.5 border border-black/15 bg-white text-sm outline-none
                  focus:border-green focus:ring-2 focus:ring-green/10 transition-all resize-y min-h-24"
                                ></textarea>
                                <p class="text-[10px] text-ink/40">
                                    Pesan ini akan ditampilkan ke pemohon saat
                                    mengecek status layanan.
                                </p>
                            </div>

                            <div class="space-y-2">
                                <p
                                    class="text-xs font-bold uppercase tracking-widest text-ink/50"
                                >
                                    Dokumen Output <span class="text-ink/30"
                                        >(Opsional)</span
                                    >
                                </p>
                                <label
                                    class="flex flex-col items-center gap-2 p-5 border-2 border-dashed cursor-pointer transition-colors
                  {isDragging
                                        ? 'border-green bg-green/3'
                                        : 'border-black/20 hover:border-green/50'}"
                                    ondragover={(e) => {
                                        e.preventDefault();
                                        isDragging = true;
                                    }}
                                    ondragleave={() => (isDragging = false)}
                                    ondrop={(e) => {
                                        e.preventDefault();
                                        isDragging = false;
                                        handleOutputFile(e);
                                    }}
                                >
                                    <Icon
                                        icon="mdi:cloud-upload-outline"
                                        width="28"
                                        height="28"
                                        class="text-green"
                                    />
                                    <p
                                        class="text-xs font-semibold text-center"
                                    >
                                        {outputFile
                                            ? outputFile.name
                                            : "Klik atau seret file output di sini"}
                                    </p>
                                    {#if outputFile}
                                        <p class="text-[10px] text-ink/40">
                                            {(outputFile.size / 1024).toFixed(
                                                0,
                                            )} KB
                                        </p>
                                    {:else}
                                        <p class="text-[10px] text-ink/40">
                                            PDF, DOC, JPG — Maks. 10MB
                                        </p>
                                    {/if}
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        class="hidden"
                                        onchange={handleOutputFile}
                                    />
                                </label>
                                {#if outputFile}
                                    <button
                                        type="button"
                                        onclick={() => (outputFile = null)}
                                        class="text-xs text-red-500 hover:underline"
                                    >
                                        Hapus file
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    <!-- Alasan penolakan (Ditolak) -->
                    {#if newStatus === "Ditolak"}
                        <div class="space-y-2">
                            <p
                                class="text-xs font-bold uppercase tracking-widest text-ink/50"
                            >
                                Alasan Penolakan <span class="text-red-500"
                                    >*</span
                                >
                            </p>
                            <textarea
                                bind:value={pesanTolak}
                                rows="4"
                                placeholder="Tulis alasan penolakan yang jelas untuk ditampilkan ke pemohon..."
                                class="w-full px-3 py-2.5 border border-black/15 bg-white text-sm outline-none
                  focus:border-green focus:ring-2 focus:ring-green/10 transition-all resize-y min-h-24"
                            ></textarea>
                            <p class="text-[10px] text-ink/40">
                                Pesan ini akan ditampilkan ke pemohon saat
                                mengecek status.
                            </p>
                        </div>
                    {/if}

                    <!-- Submit -->
                    <button
                        type="submit"
                        disabled={submitting}
                        class="w-full flex items-center justify-center gap-2 bg-green text-white text-sm font-bold py-3
              hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if submitting}
                            <Icon
                                icon="mdi:loading"
                                width="16"
                                height="16"
                                class="animate-spin"
                            />
                            Menyimpan...
                        {:else}
                            <Icon icon="mdi:check" width="15" height="15" />
                            Simpan Perubahan
                        {/if}
                    </button>
                </form>
            </div>

            <!-- Ringkasan -->
            <div class="bg-white border border-black/8">
                <div class="px-5 py-4 border-b border-black/8">
                    <h2
                        class="text-xs font-bold uppercase tracking-widest text-ink/40"
                    >
                        Ringkasan
                    </h2>
                </div>
                <div class="px-5 py-4 space-y-3">
                    {@render RingkasRow({
                        icon: "calendar",
                        label: "Tanggal Kirim",
                        value: formatDatetime(current.submittedAt),
                    })}
                    {@render RingkasRow({
                        icon: "tag",
                        label: "Layanan",
                        value: current.serviceTitle,
                    })}
                    {@render RingkasRow({
                        icon: "clock",
                        label: "SLA",
                        value: subService?.slaDuration
                            ? `${subService.slaDuration} ${subService.slaUnit === "menit" ? "Menit" : subService.slaUnit === "jam" ? "Jam" : "Hari"}`
                            : "-",
                    })}
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ── Snippets ───────────────────────────────────────── -->
{#snippet InfoRow(props: { label: string; value: string })}
    <div>
        <p
            class="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-0.5"
        >
            {props.label}
        </p>
        <p class="text-sm font-semibold">{props.value || "-"}</p>
    </div>
{/snippet}

{#snippet RingkasRow(props: { icon: string; label: string; value: string })}
    <div class="flex items-start gap-2.5">
        <Icon
            icon={props.icon === "calendar"
                ? "mdi:calendar-blank-outline"
                : props.icon === "tag"
                  ? "mdi:tag"
                  : props.icon === "clock"
                    ? "mdi:clock-outline"
                    : "mdi:phone"}
            width="14"
            height="14"
            class="text-ink/30 mt-0.5 shrink-0"
        />
        <div>
            <p class="text-[10px] text-ink/40">{props.label}</p>
            <p class="text-xs font-semibold leading-snug">{props.value}</p>
        </div>
    </div>
{/snippet}

<style>
    @media (hover: none) {
        button[aria-label^="Unduh"] {
            opacity: 1 !important;
        }
    }
</style>
