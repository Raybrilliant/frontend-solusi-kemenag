import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Proxy endpoint export permohonan PPID (data + dokumen) untuk XLSX
export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const params = new URLSearchParams(url.searchParams);
    params.set("source", "ppid");
    const res = await fetch(
      `${BACKEND_URL}/api/v1/permohonan/export?${params.toString()}`,
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
