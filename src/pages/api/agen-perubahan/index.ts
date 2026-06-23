import type { APIRoute } from "astro";
import { getAgenPerubahanMockList } from "../../../lib/agen-perubahan-mock";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const SUCCESS_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=180, stale-while-revalidate=300",
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

function fallbackList() {
  const data = getAgenPerubahanMockList();
  return {
    success: true,
    data,
    pagination: {
      page: 1,
      limit: data.length || 10,
      total: data.length,
      totalPages: data.length ? 1 : 0,
    },
    mock: true,
  };
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = new URLSearchParams(url.searchParams);
    const qs = params.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/agen-perubahan${qs ? `?${qs}` : ""}`,
    );
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return new Response(JSON.stringify(fallbackList()), {
        status: 200,
        headers: FALLBACK_HEADERS,
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: SUCCESS_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify(fallbackList()), {
      status: 200,
      headers: FALLBACK_HEADERS,
    });
  }
};
