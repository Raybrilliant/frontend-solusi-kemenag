import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  jsonProxyResponse,
  readBackendJson,
} from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const text = await request.text();
    if (!text) {
      return jsonProxyResponse(
        { success: false, message: "Request body is empty" },
        200,
      );
    }

    const body = JSON.parse(text);
    const res = await fetch(`${BACKEND_URL}/api/v1/users/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(cookies, request),
      },
      body: JSON.stringify(body),
    });

    const data = await readBackendJson(res);
    if (!res.ok || data?.success === false) {
      const message =
        data?.message ?? data?.error ?? `Backend error (${res.status})`;
      return jsonProxyResponse({ success: false, message, data: data?.data }, 200);
    }

    return jsonProxyResponse(data, 200);
  } catch (error) {
    return jsonProxyResponse(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal memproses bulk user.",
      },
      200,
    );
  }
};
