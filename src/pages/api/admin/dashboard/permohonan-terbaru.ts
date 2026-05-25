import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Proxy: GET /api/v1/dashboard/permohonan-terbaru
export const GET: APIRoute = async ({ url }) => {
  try {
    const limit = url.searchParams.get("limit") ?? "5";
    const res = await fetch(
      `${BACKEND_URL}/api/v1/dashboard/permohonan-terbaru?limit=${limit}`,
    );
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
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
