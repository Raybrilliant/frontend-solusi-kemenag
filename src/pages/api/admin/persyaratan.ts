import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Invalid JSON (HTTP ${res.status})` };
  }
}

// Proxy: GET /api/v1/persyaratan?layananId=...
export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const layananId = url.searchParams.get("layananId");
    const qs = layananId ? `?layananId=${layananId}` : "";
    const res = await fetch(`${BACKEND_URL}/api/v1/persyaratan/${qs}`, {
      headers: getAdminAuthHeaders(cookies, request),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await safeJson(res);
    return new Response(JSON.stringify(data), {
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

// Proxy: POST /api/v1/persyaratan
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/persyaratan/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(cookies, request),
      },
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);
    if (!res.ok || (data as any)?.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: (data as any)?.message ?? "Gagal menyimpan persyaratan.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
};
