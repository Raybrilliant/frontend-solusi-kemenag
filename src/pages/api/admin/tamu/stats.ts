import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  readBackendJson,
  adminJsonResponse,
} from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// GET /api/admin/tamu/stats — statistik untuk dashboard
export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const headers = getAdminAuthHeaders(cookies, request);
    const res = await fetch(`${BACKEND_URL}/api/v1/tamu/stats`, {
      headers,
    });
    const data = await readBackendJson(res);
    return adminJsonResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return adminJsonResponse({ success: false, message: String(e) }, 500);
  }
};
