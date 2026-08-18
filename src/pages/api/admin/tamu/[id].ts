import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  readBackendJson,
  adminJsonResponse,
} from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// PATCH /api/admin/tamu/:id — update foto_url / asal_instansi tamu
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const id = encodeURIComponent(params.id ?? "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(cookies, request),
    };
    const body = await request.text();
    const res = await fetch(`${BACKEND_URL}/api/v1/tamu/${id}`, {
      method: "PATCH",
      headers,
      body,
    });
    const data = await readBackendJson(res);
    return adminJsonResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return adminJsonResponse(
      { success: false, message: String(e) },
      500,
    );
  }
};

// DELETE /api/admin/tamu/:id — hapus tamu + file foto
export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  try {
    const id = encodeURIComponent(params.id ?? "");
    const headers = getAdminAuthHeaders(cookies, request);
    const res = await fetch(`${BACKEND_URL}/api/v1/tamu/${id}`, {
      method: "DELETE",
      headers,
    });
    const data = await readBackendJson(res);
    return adminJsonResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return adminJsonResponse(
      { success: false, message: String(e) },
      500,
    );
  }
};
