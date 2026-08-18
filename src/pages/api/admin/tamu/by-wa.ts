import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  readBackendJson,
  adminJsonResponse,
} from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// GET /api/admin/tamu/by-wa?wa=08xxx — cek tamu by WA (auto-fill)
export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const wa = url.searchParams.get("wa") ?? "";
    if (!wa.trim()) {
      return adminJsonResponse({ success: true, data: null }, 200);
    }
    const headers = getAdminAuthHeaders(cookies, request);
    const res = await fetch(
      `${BACKEND_URL}/api/v1/tamu/by-wa?wa=${encodeURIComponent(wa)}`,
      { headers },
    );
    const data = await readBackendJson(res);
    return adminJsonResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return adminJsonResponse({ success: false, message: String(e) }, 500);
  }
};
