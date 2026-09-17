import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/prestasi-siswa/admin/madrasah`,
      {
        headers: getAdminAuthHeaders(cookies, request),
      },
    );
    const text = await res.text();
    return new Response(text || "{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, data: [], message: String(e) }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
};
