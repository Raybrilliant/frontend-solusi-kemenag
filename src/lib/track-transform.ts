const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

export function toUploadProxyUrl(url: string | null | undefined): string | null {
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

let _layananCache: any[] | null = null;
let _layananCacheTime = 0;

async function getLayanan(): Promise<any[]> {
  if (_layananCache && Date.now() - _layananCacheTime < 60_000) {
    return _layananCache;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/layanan/`);
    const json = await res.json();
    _layananCache = json.data ?? [];
    _layananCacheTime = Date.now();
    return _layananCache!;
  } catch {
    return _layananCache ?? [];
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
  let durasiMenit = 0;
  let durasiLabel = "-";

  const layanan = await getLayanan();
  const svc = layanan.find((l: any) => l.title === d.serviceTitle);
  if (svc) {
    durasiMenit = toMinutes(svc.slaDuration, svc.slaUnit);
    durasiLabel = formatSlaLabel(svc.slaDuration, svc.slaUnit);
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
      message: d.rejectionReason ?? null,
      fileUrl: toUploadProxyUrl(d.outputFile?.url),
    },
  };
}
