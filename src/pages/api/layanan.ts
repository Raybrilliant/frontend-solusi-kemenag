import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Invalid JSON response (HTTP ${res.status})` };
  }
}

function toProgress(item: any): string {
  return `${item?.slaDuration ?? 0} ${item?.slaUnit === "menit" ? "Menit" : item?.slaUnit === "jam" ? "Jam" : "Hari"}`;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const categoryId = url.searchParams.get("categoryId") ?? "";
    const limit = url.searchParams.get("limit") ?? "30";

    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    params.set("limit", limit);

    const res = await fetch(`${BACKEND_URL}/api/v1/layanan/?${params.toString()}`);
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const items = (data?.data ?? []).map((item: any) => ({
      ...item,
      iconBody: item.icon ?? "",
      relatedServiceId: item.categoryId,
      progress: toProgress(item),
    }));

    return new Response(JSON.stringify({ success: true, data: items }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
