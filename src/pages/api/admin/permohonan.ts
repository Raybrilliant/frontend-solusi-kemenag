import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  getAdminUser,
} from "../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Cache per-layanan by ID — TTL 5 menit (SLA settings jarang berubah)
const _layananCache = new Map<number, any>();
const _layananCacheTime = new Map<number, number>();
const LAYANAN_CACHE_TTL = 300_000;

async function fetchLayananById(
  id: number,
  authHeaders: Record<string, string>,
): Promise<any | null> {
  const cached = _layananCache.get(id);
  const cachedTime = _layananCacheTime.get(id);
  if (cached && cachedTime && Date.now() - cachedTime < LAYANAN_CACHE_TTL) {
    return cached;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/layanan/${id}`, {
      headers: authHeaders,
    });
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

function calcSlaRemaining(item: any, svc: any | null): number | null {
  if (item.status !== "Diproses") return null;
  if (!svc) return null;

  const slaDuration = svc.slaDuration ?? svc.sla_duration;
  const slaUnit = svc.slaUnit ?? svc.sla_unit;
  if (!slaDuration || !slaUnit) return null;

  const startTime =
    item.processedAt ??
    item.processed_at ??
    item.submittedAt ??
    item.submitted_at;
  if (!startTime) return null;

  let totalMs = 0;
  if (slaUnit === "menit") totalMs = slaDuration * 60_000;
  else if (slaUnit === "jam") totalMs = slaDuration * 3_600_000;
  else if (slaUnit === "hari") totalMs = slaDuration * 86_400_000;
  else return null;

  const elapsedMs = Date.now() - new Date(startTime).getTime();
  return Math.floor((totalMs - elapsedMs) / 60_000);
}

function permohonanJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const qs = url.searchParams.toString();
    const headers = getAdminAuthHeaders(cookies, request);

    const [user, permRes] = await Promise.all([
      getAdminUser(cookies, request),
      fetch(`${BACKEND_URL}/api/v1/permohonan${qs ? `?${qs}` : ""}`, {
        headers,
      }),
    ]);

    const isOperator = user?.role === "operator" && user.categoryId !== null;

    const data = await permRes.json();

    if (data.success && data.data) {
      // Ambil unique serviceIds dari halaman saat ini saja
      const rawItems: any[] = data.data;
      const serviceIds: number[] = [
        ...new Set(
          rawItems
            .map((item: any) => Number(item.serviceId ?? item.service_id))
            .filter((id: number) => !Number.isNaN(id)),
        ),
      ];

      // Fetch hanya layanan yang dibutuhkan (parallel, cached per-ID)
      const layananResults = await Promise.all(
        serviceIds.map((id) => fetchLayananById(id, headers)),
      );
      const layananMap = new Map<number, any>();
      serviceIds.forEach((id, i) => {
        if (layananResults[i]) layananMap.set(id, layananResults[i]);
      });

      let items = rawItems.map((item: any) => {
        const sid = Number(item.serviceId ?? item.service_id);
        const svc = layananMap.get(sid) ?? null;
        return {
          ...item,
          slaRemaining: calcSlaRemaining(item, svc),
        };
      });

      if (isOperator) {
        items = items.filter(
          (item: any) => item.categoryId === user!.categoryId,
        );
      }

      data.data = items;
    }

    return permohonanJsonResponse(data, permRes.status);
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(cookies, request),
    };
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/permohonan/`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return permohonanJsonResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
