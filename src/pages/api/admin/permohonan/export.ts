import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Proxy endpoint export permohonan (data + dokumen) untuk XLSX
export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const qs = url.searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/permohonan/export${qs ? `?${qs}` : ""}`,
      { headers: getAdminAuthHeaders(cookies, request) },
    );
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
