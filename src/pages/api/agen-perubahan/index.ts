import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const SUCCESS_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=180, stale-while-revalidate=300",
};
const ERROR_HEADERS = {
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

export const GET: APIRoute = async ({ url }) => {
  try {
    const params = new URLSearchParams(url.searchParams);
    const qs = params.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/agen-perubahan${qs ? `?${qs}` : ""}`,
    );
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }),
        {
          status: 200,
          headers: ERROR_HEADERS,
        },
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: SUCCESS_HEADERS,
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
      {
        status: 200,
        headers: ERROR_HEADERS,
      },
    );
  }
};
