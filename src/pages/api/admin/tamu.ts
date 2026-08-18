import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  readBackendJson,
  adminJsonResponse,
} from "../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// GET /api/admin/tamu — daftar tamu (paginated)
export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const qs = url.searchParams.toString();
    const headers = getAdminAuthHeaders(cookies, request);
    const res = await fetch(
      `${BACKEND_URL}/api/v1/tamu${qs ? `?${qs}` : ""}`,
      { headers },
    );
    const data = await readBackendJson(res);
    return adminJsonResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return adminJsonResponse(
      { success: false, message: String(e) },
      500,
    );
  }
};

// POST /api/admin/tamu — tambah tamu baru
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(cookies, request),
    };
    const body = await request.text();
    const res = await fetch(`${BACKEND_URL}/api/v1/tamu/`, {
      method: "POST",
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
