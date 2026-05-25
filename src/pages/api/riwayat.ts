import type { APIRoute } from "astro";
import mdiData from "@iconify-json/mdi/icons.json";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

function resolveIconBody(iconName: string): string {
  const key = iconName.includes(":") ? iconName.split(":")[1] : iconName;
  return (mdiData.icons as Record<string, { body: string }>)[key]?.body ?? "";
}

let _layananCache: Record<string, string> | null = null;
let _layananCacheTime = 0;

async function getIconMap(): Promise<Record<string, string>> {
  if (_layananCache && Date.now() - _layananCacheTime < 60_000) {
    return _layananCache;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/layanan/`);
    const json = await res.json();
    const map: Record<string, string> = {};
    for (const l of json.data ?? []) {
      map[l.title] = resolveIconBody(l.icon ?? "");
    }
    _layananCache = map;
    _layananCacheTime = Date.now();
    return map;
  } catch {
    return _layananCache ?? {};
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const status = url.searchParams.get("status");
    const [res, iconMap] = await Promise.all([
      fetch(
        `${BACKEND_URL}/api/v1/dashboard/permohonan-terbaru?limit=5${status ? `&status=${encodeURIComponent(status)}` : ""}`,
      ),
      getIconMap(),
    ]);
    const json = await res.json();

    if (!json.success) {
      return new Response(JSON.stringify(json), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = (json.data ?? []).map((item: any) => ({
      kode: item.id,
      tanggal: new Date(item.submittedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      status: item.status,
      title: item.serviceTitle ?? "",
      iconBody: iconMap[item.serviceTitle ?? ""] ?? "",
    }));

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
