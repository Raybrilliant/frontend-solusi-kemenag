<script lang="ts">
    let { permohonan, syarat = [], subService = null } = $props();

    type Toast = { type: "success" | "error"; msg: string };

    // ── Local state ───────────────────────────────────────
    // svelte-ignore state_referenced_locally — intentionally capture initial value
    let current = $state({ ...permohonan });
    // svelte-ignore state_referenced_locally
    let newStatus = $state(permohonan.status);
    // svelte-ignore state_referenced_locally
    let pesanTolak = $state(permohonan.rejectionReason ?? "");
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

        if (newStatus === "Selesai" && !outputFile) {
            toast = {
                type: "error",
                msg: "Mohon unggah dokumen output terlebih dahulu.",
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
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="shrink-0"
        >
            {#if toast.type === "success"}
                <path
                    d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                />
            {:else}
                <path
                    d="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10-4.48 10-10S17.52,2 12,2zm1,15h-2v-2h2v2zm0-4h-2V7h2v6z"
                />
            {/if}
        </svg>
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Tutup notifikasi"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path
                    d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                />
            </svg>
        </button>
    </div>
{/if}

<!-- ── Header ─────────────────────────────────────────── -->
<div class="bg-white border-b border-black/8 px-6 md:px-8 py-5">
    <nav class="flex items-center gap-2 text-xs text-ink/40 mb-4">
        <a href="/admin" class="hover:text-ink transition-colors">Dashboard</a>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
            ><path
                d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
            /></svg
        >
        <a href="/admin/permohonan" class="hover:text-ink transition-colors"
            >Permohonan</a
        >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
            ><path
                d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
            /></svg
        >
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
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                class={isOverdue
                    ? "text-red-500"
                    : current.status !== "Diproses"
                      ? "text-ink/30"
                      : "text-green"}
            >
                <path
                    d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"
                />
            </svg>
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
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="white"
                    >
                        <path
                            d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"
                        />
                    </svg>
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
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="white"
                    >
                        <path
                            d="M16,1H4C2.9,1 2,1.9 2,3V17H4V3H16V1M15,5H8C6.9,5 6.01,5.9 6.01,7L6,21C6,22.1 6.89,23 7.99,23H19C20.1,23 21,22.1 21,21V11L15,5M19,21H8V7H14V12H19V21Z"
                        />
                    </svg>
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
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="#EF4444"
                                >
                                    <path
                                        d="M19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M9.5,11.5C9.5,12.3 8.8,13 8,13H7V15H5.5V9H8C8.8,9 9.5,9.7 9.5,10.5V11.5M14.5,13.5C14.5,14.3 13.8,15 13,15H10.5V9H13C13.8,9 14.5,9.7 14.5,10.5V13.5M18.5,10.5H17V11.5H18.5V13H17V15H15.5V9H18.5V10.5M12,10.5H12V13.5H12V10.5M7,10.5H8V11.5H7V10.5Z"
                                    />
                                </svg>
                            {:else if doc.tipe === "image"}
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="#3B82F6"
                                >
                                    <path
                                        d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"
                                    />
                                </svg>
                            {:else}
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="#6B7280"
                                >
                                    <path
                                        d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                                    />
                                </svg>
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
                            <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path
                                    d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"
                                />
                            </svg>
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
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="white"
                    >
                        <path
                            d="M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3Z"
                        />
                    </svg>
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

        <!-- Output dokumen (jika selesai) -->
        {#if current.status === "Selesai" && current.outputFile}
            <div
                class="bg-green/5 border border-green/30 px-5 py-4 flex items-center gap-4"
            >
                <div
                    class="w-10 h-10 bg-green flex items-center justify-center shrink-0"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="white"
                    >
                        <path
                            d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                        />
                    </svg>
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
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                    </svg>
                    Unduh Output
                </button>
            </div>
        {/if}

        <!-- Alasan penolakan (jika ditolak) -->
        {#if current.status === "Ditolak" && current.rejectionReason}
            <div class="bg-red-50 border border-red-200 px-5 py-4">
                <div class="flex items-center gap-2 mb-2">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="text-red-500 shrink-0"
                    >
                        <path
                            d="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10-4.48 10-10S17.52,2 12,2zm1,15h-2v-2h2v2zm0-4h-2V7h2v6z"
                        />
                    </svg>
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
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="white"
                        >
                            <path
                                d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"
                            />
                        </svg>
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

                    <!-- Upload output (Selesai) -->
                    {#if newStatus === "Selesai"}
                        <div class="space-y-2">
                            <p
                                class="text-xs font-bold uppercase tracking-widest text-ink/50"
                            >
                                Dokumen Output <span class="text-red-500"
                                    >*</span
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
                                <svg
                                    width="28"
                                    height="28"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    class="text-green"
                                >
                                    <path
                                        d="M14,13V17H10V13H7L12,8L17,13M19.35,10.03C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.03C2.34,8.36 0,10.9 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.03Z"
                                    />
                                </svg>
                                <p class="text-xs font-semibold text-center">
                                    {outputFile
                                        ? outputFile.name
                                        : "Klik atau seret file output di sini"}
                                </p>
                                {#if outputFile}
                                    <p class="text-[10px] text-ink/40">
                                        {(outputFile.size / 1024).toFixed(0)} KB
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
                            <svg
                                class="animate-spin"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                            >
                                <path
                                    d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                                />
                            </svg>
                            Menyimpan...
                        {:else}
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path
                                    d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                                />
                            </svg>
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
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="text-ink/30 mt-0.5 shrink-0"
        >
            {#if props.icon === "calendar"}
                <path
                    d="M19,3H18V1H16V3H8V1H6V3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H19C20.1,21 21,20.1 21,19V5C21,3.9 20.1,3 19,3M19,19H5V8H19V19Z"
                />
            {:else if props.icon === "tag"}
                <path
                    d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.77 12.45,22 13,22C13.55,22 14.05,21.77 14.41,21.41L21.41,14.41C21.78,14.05 22,13.55 22,13C22,12.44 21.77,11.94 21.41,11.58Z"
                />
            {:else if props.icon === "clock"}
                <path
                    d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"
                />
            {:else if props.icon === "phone"}
                <path
                    d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"
                />
            {/if}
        </svg>
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
