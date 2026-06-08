import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Returns sorted list of unique kategori values from all existing berita
export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/berita/admin/list?limit=500`,
      { headers: getAdminAuthHeaders(cookies, request) },
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const list: any[] = json?.data ?? [];

    const categories = [
      ...new Set(
        list
          .map((b: any) => (b.kategori ?? "").trim().toLowerCase())
          .filter(Boolean),
      ),
    ].sort();

    return new Response(JSON.stringify({ success: true, data: categories }), {
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
