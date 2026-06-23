import type { APIRoute } from "astro";
import {
  adminJsonResponse,
  getAdminAuthHeaders,
} from "../../../lib/admin-api-proxy";
import { getAgenPerubahanMockList } from "../../../lib/agen-perubahan-mock";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: `Invalid JSON response (HTTP ${res.status})`,
    };
  }
}

function mockListResponse() {
  const data = getAgenPerubahanMockList();
  return {
    success: true,
    data,
    pagination: {
      page: 1,
      limit: data.length || 10,
      total: data.length,
      totalPages: data.length ? 1 : 0,
    },
    mock: true,
  };
}

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const qs = url.searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/agen-perubahan/admin/list${qs ? `?${qs}` : ""}`,
      {
        headers: getAdminAuthHeaders(cookies, request),
      },
    );
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return adminJsonResponse(mockListResponse(), 200);
    }

    return adminJsonResponse(data, 200);
  } catch {
    return adminJsonResponse(mockListResponse(), 200);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const text = await request.text();
    if (!text) {
      return adminJsonResponse(
        { success: false, message: "Request body is empty" },
        200,
      );
    }

    const body = JSON.parse(text);
    const res = await fetch(`${BACKEND_URL}/api/v1/agen-perubahan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(cookies, request),
      },
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return adminJsonResponse(
        {
          success: false,
          message:
            data?.message ?? data?.error ?? `Gagal menyimpan (${res.status})`,
        },
        200,
      );
    }

    return adminJsonResponse(data, 200);
  } catch (e) {
    return adminJsonResponse(
      { success: false, message: String(e) },
      200,
    );
  }
};
