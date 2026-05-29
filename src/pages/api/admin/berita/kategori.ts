import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

function getAuthHeaders(cookies: any): Record<string, string> {
  const token = cookies?.get?.("auth_token")?.value ?? "";
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// Returns sorted list of unique kategori values from all existing berita
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/berita/admin/list?limit=500`,
      { headers: getAuthHeaders(cookies) },
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
