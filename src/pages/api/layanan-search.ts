import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const SUCCESS_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
};
const FALLBACK_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: `Invalid JSON response (HTTP ${res.status})`,
    };
  }
}

function toProgress(item: any): string {
  return `${item?.slaDuration ?? 0} ${item?.slaUnit === "menit" ? "Menit" : item?.slaUnit === "jam" ? "Jam" : "Hari"}`;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = url.searchParams.get("limit") ?? "30";

    if (q.length < 3) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: SUCCESS_HEADERS,
      });
    }

    const [categoriesRes, layananRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/categories/?limit=100`),
      fetch(
        `${BACKEND_URL}/api/v1/layanan/?q=${encodeURIComponent(q)}&limit=${limit}`,
      ),
    ]);

    const categoriesJson = await safeJson(categoriesRes);
    const layananJson = await safeJson(layananRes);

    if (!layananRes.ok || layananJson?.success === false) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: FALLBACK_HEADERS,
      });
    }

    const categoryMap = new Map(
      ((categoriesJson?.data ?? []) as any[]).map((item: any) => [
        item.id,
        item,
      ]),
    );

    const items = ((layananJson?.data ?? []) as any[]).map((item: any) => {
      const category = categoryMap.get(item.categoryId);
      return {
        ...item,
        iconBody: item.icon ?? "",
        relatedServiceId: item.categoryId,
        progress: toProgress(item),
        categoryTitle: category?.title ?? "Layanan",
        categoryIconBody: category?.icon ?? "",
      };
    });

    return new Response(JSON.stringify({ success: true, data: items }), {
      status: 200,
      headers: SUCCESS_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: FALLBACK_HEADERS,
    });
  }
};
