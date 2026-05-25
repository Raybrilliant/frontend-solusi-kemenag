import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

function getAuthHeaders(cookies: any): Record<string, string> {
  const token = cookies?.get?.("auth_token")?.value ?? "";
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Invalid JSON (HTTP ${res.status})` };
  }
}

// Proxy: GET /api/v1/pengaduan/
export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const qs = url.searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/pengaduan/${qs ? `?${qs}` : ""}`,
      { headers: getAuthHeaders(cookies) },
    );
    const data = await safeJson(res);
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
