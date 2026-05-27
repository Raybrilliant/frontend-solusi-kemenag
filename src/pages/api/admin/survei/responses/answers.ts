import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  jsonProxyResponse,
  missingAdminSessionResponse,
  readBackendJson,
} from "../../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const headers = getAdminAuthHeaders(cookies);
    if (!headers.Authorization) return missingAdminSessionResponse();

    const qs = url.searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/survei/responses/answers${qs ? `?${qs}` : ""}`,
      { headers },
    );
    const data = await readBackendJson(res);
    return jsonProxyResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return jsonProxyResponse({ success: false, message: String(e) }, 500);
  }
};
