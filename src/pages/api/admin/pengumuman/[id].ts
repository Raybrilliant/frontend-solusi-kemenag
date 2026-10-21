import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../../lib/admin-api-proxy";

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

// Proxy: PUT /api/v1/pengumuman/:id
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const body = await request.json();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/pengumuman/${params.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(cookies, request),
        },
        body: JSON.stringify(body),
      },
    );
    const data = await safeJson(res);
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Proxy: PATCH /api/v1/pengumuman/:id — toggle aktif/nonaktif
export const PATCH: APIRoute = async ({ params, cookies, request }) => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/pengumuman/${params.id}`,
      {
        method: "PATCH",
        headers: getAdminAuthHeaders(cookies, request),
      },
    );
    const data = await safeJson(res);
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Proxy: DELETE /api/v1/pengumuman/:id
export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/pengumuman/${params.id}`,
      {
        method: "DELETE",
        headers: getAdminAuthHeaders(cookies, request),
      },
    );
    const data = await safeJson(res);
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
