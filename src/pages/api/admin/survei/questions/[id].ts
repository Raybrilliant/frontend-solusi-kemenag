import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  jsonProxyResponse,
  missingAdminSessionResponse,
  readBackendJson,
} from "../../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const headers = getAdminAuthHeaders(cookies);
    if (!headers.Authorization) return missingAdminSessionResponse();

    const body = await request.json();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/survei/questions/${params.id}`,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const data = await readBackendJson(res);
    return jsonProxyResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return jsonProxyResponse({ success: false, message: String(e) }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const headers = getAdminAuthHeaders(cookies);
    if (!headers.Authorization) return missingAdminSessionResponse();

    const res = await fetch(
      `${BACKEND_URL}/api/v1/survei/questions/${params.id}`,
      {
        method: "DELETE",
        headers,
      },
    );
    const data = await readBackendJson(res);
    return jsonProxyResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return jsonProxyResponse({ success: false, message: String(e) }, 500);
  }
};
