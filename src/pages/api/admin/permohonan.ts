import type { APIRoute } from "astro";
import { getUserFromToken } from "../../../lib/get-user";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Cache layanan data untuk SLA calculation (slaDuration/slaUnit)
let _layananCache: any[] | null = null;
let _layananCacheTime = 0;

async function getLayananData(authHeaders: Record<string, string>) {
  if (_layananCache && Date.now() - _layananCacheTime < 60_000) {
    return _layananCache;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/layanan/`, {
      headers: authHeaders,
    });
    const json = await res.json();
    _layananCache = json.data ?? [];
    _layananCacheTime = Date.now();
    return _layananCache;
  } catch {
    return _layananCache ?? [];
  }
}

function calcSlaRemaining(
  item: any,
  layananMap: Map<number, any>,
): number | null {
  if (item.status !== "Diproses" || !item.processedAt) return null;
  const svc = layananMap.get(item.serviceId);
  if (!svc?.slaDuration || !svc?.slaUnit) return null;

  let totalMs = 0;
  if (svc.slaUnit === "menit") totalMs = svc.slaDuration * 60_000;
  else if (svc.slaUnit === "jam") totalMs = svc.slaDuration * 3_600_000;
  else if (svc.slaUnit === "hari") totalMs = svc.slaDuration * 86_400_000;

  const elapsedMs = Date.now() - new Date(item.processedAt).getTime();
  return Math.floor((totalMs - elapsedMs) / 60_000);
}

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const token = cookies.get("auth_token")?.value;
    const qs = url.searchParams.toString();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const [user, permRes] = await Promise.all([
      getUserFromToken(token),
      fetch(`${BACKEND_URL}/api/v1/permohonan${qs ? `?${qs}` : ""}`, {
        headers,
      }),
    ]);

    const isOperator = user?.role === "operator" && user.categoryId !== null;

    const data = await permRes.json();

    if (data.success && data.data) {
      const layanan = await getLayananData(headers);
      const layananMap = new Map(layanan.map((s: any) => [s.id, s]));

      // Elysia already includes categoryId on each item; use it directly
      let items = data.data.map((item: any) => ({
        ...item,
        slaRemaining: calcSlaRemaining(item, layananMap),
      }));

      if (isOperator) {
        items = items.filter(
          (item: any) => item.categoryId === user!.categoryId,
        );
      }

      data.data = items;
    }

    return new Response(JSON.stringify(data), {
      status: permRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
