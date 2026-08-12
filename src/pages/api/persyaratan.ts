import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: "Invalid JSON response" };
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const layananId = url.searchParams.get("layananId");
    if (!layananId || isNaN(Number(layananId))) {
      return new Response(
        JSON.stringify({ success: false, message: "Parameter layananId diperlukan" }),
        { status: 400, headers: HEADERS },
      );
    }

    const res = await fetch(
      `${BACKEND_URL}/api/v1/persyaratan/?layananId=${encodeURIComponent(layananId)}&limit=200`,
    );
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: HEADERS,
      });
    }

    return new Response(
      JSON.stringify({ success: true, data: data.data ?? [] }),
      { status: 200, headers: HEADERS },
    );
  } catch {
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: HEADERS,
    });
  }
};
