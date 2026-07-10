const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export function toUploadProxyUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const filename = url.split("/").pop();
  if (!filename) return null;
  return `/api/upload/${filename}`;
}

// Generic document icon SVG path used for all permohonan cards
const ICON_BODY =
  '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>';

function toMinutes(duration: number, unit: string): number {
  if (unit === "jam") return duration * 60;
  if (unit === "hari") return duration * 60 * 24;
  return duration; // menit
}

function formatSlaLabel(duration: number, unit: string): string {
  return `${duration} ${unit}`;
}

function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Cache per-layanan by ID — TTL 5 menit (SLA settings jarang berubah)
const _layananCache = new Map<number, any>();
const _layananCacheTime = new Map<number, number>();
const LAYANAN_CACHE_TTL = 300_000;

async function getLayananById(id: number | null | undefined): Promise<any | null> {
  if (!id) return null;
  const cached = _layananCache.get(id);
  const cachedTime = _layananCacheTime.get(id);
  if (cached && cachedTime && Date.now() - cachedTime < LAYANAN_CACHE_TTL) {
    return cached;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/layanan/${id}`);
    if (!res.ok) return cached ?? null;
    const json = await res.json();
    const svc = json.data ?? null;
    if (svc) {
      _layananCache.set(id, svc);
      _layananCacheTime.set(id, Date.now());
    }
    return svc;
  } catch {
    return cached ?? null;
  }
}

// Transforms the raw Elysia /api/v1/pengaduan/track/:id response.
export function transformPengaduanTrackResponse(raw: any): any {
  if (!raw.success || !raw.data) return raw;
  const d = raw.data;
  return {
    success: true,
    data: {
      id: d.id,
      kode: d.id,
      title: d.tipe ?? "Pengaduan",
      description: d.deskripsi ?? "-",
      status: d.status,
      startTime: d.processedAt ?? null,
      receivedTime: d.createdAt ?? null,
      tanggal: formatTanggal(d.createdAt),
      durasiMenit: 0,
      durasiLabel: "-",
      iconBody: ICON_BODY,
      message: d.message ?? null,
      fileUrl: toUploadProxyUrl(d.outputFile?.url),
    },
  };
}

// Transforms the raw Elysia /api/v1/permohonan/track/:id response into the
// shape expected by FormCheckProgress.svelte.
export async function transformTrackResponse(raw: any): Promise<any> {
  if (!raw.success || !raw.data) return raw;

  const d = raw.data;
  const responseMessage =
    typeof raw.message === "string" && raw.message.trim()
      ? raw.message.trim()
      : null;
  let durasiMenit = 0;
  let durasiLabel = "-";

  const layanan = await getLayananById(d.serviceId);
  if (layanan) {
    durasiMenit = toMinutes(layanan.slaDuration, layanan.slaUnit);
    durasiLabel = formatSlaLabel(layanan.slaDuration, layanan.slaUnit);
  }

  return {
    success: true,
    data: {
      id: d.id,
      kode: d.id,
      title: d.serviceTitle,
      description: d.applicantName,
      status: d.status,
      startTime: d.processedAt ?? null,
      receivedTime: d.submittedAt ?? null,
      tanggal: formatTanggal(d.submittedAt),
      durasiMenit,
      durasiLabel,
      iconBody: ICON_BODY,
      message: responseMessage ?? d.rejectionReason ?? d.message ?? null,
      fileUrl: toUploadProxyUrl(d.outputFile?.url),
    },
  };
}
