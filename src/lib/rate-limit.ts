// ─── Rate limiter in-memory (sliding window) untuk proxy BFF ─────────────────
// Semua traffic publik masuk lewat BFF ini, sehingga pembatasan per-IP hanya
// bisa dilakukan di sini (backend hanya melihat satu IP BFF).
// Cukup untuk deployment single-instance; bila nanti multi-instance,
// ganti dengan penyimpanan bersama (Redis).

const buckets = new Map<string, number[]>();
let lastSweepAt = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweepAt < 60_000) return;
  lastSweepAt = now;
  for (const [key, hits] of buckets) {
    const alive = hits.filter((t) => now - t < windowMs);
    if (alive.length === 0) buckets.delete(key);
    else buckets.set(key, alive);
  }
}

/**
 * IP klien: ambil hop TERAKHIR dari X-Forwarded-For — nilai yang ditambahkan
 * oleh reverse proxy kita. Hop pertama dikontrol klien sehingga bisa
 * dipalsukan untuk menghindari limit.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim());
    const last = hops[hops.length - 1];
    if (last) return last;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now, windowMs);

  const key = `${bucket}:${getClientIp(request)}`;
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Batasi request per bucket (mis. "submit:permohonan") per IP.
 * Mengembalikan Response 429 bila melebihi limit, atau null bila boleh jalan.
 */
export function enforceRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): Response | null {
  const result = rateLimit(request, bucket, limit, windowMs);
  if (result.ok) return null;

  return new Response(
    JSON.stringify({
      success: false,
      message: `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfterSeconds} detik.`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
