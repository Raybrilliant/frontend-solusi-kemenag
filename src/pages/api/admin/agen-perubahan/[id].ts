import type { APIRoute } from "astro";
import {
  adminJsonResponse,
  getAdminAuthHeaders,
} from "../../../../lib/admin-api-proxy";
import { getAgenPerubahanMockById } from "../../../../lib/agen-perubahan-mock";

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

export const GET: APIRoute = async ({ params, cookies, request }) => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/agen-perubahan/admin/${params.id}`,
      {
        headers: getAdminAuthHeaders(cookies, request),
      },
    );
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      const mock = getAgenPerubahanMockById(params.id);
      return adminJsonResponse(
        mock
          ? { success: true, data: mock, mock: true }
          : { success: false, message: "Gagal memuat data agen perubahan." },
        200,
      );
    }

    return adminJsonResponse(data, 200);
  } catch (e) {
    const mock = getAgenPerubahanMockById(params.id);
    return adminJsonResponse(
      mock
        ? { success: true, data: mock, mock: true }
        : { success: false, message: String(e) },
      200,
    );
  }
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const text = await request.text();
    if (!text) {
      return adminJsonResponse(
        { success: false, message: "Request body is empty" },
        200,
      );
    }

    const body = JSON.parse(text);
    const res = await fetch(`${BACKEND_URL}/api/v1/agen-perubahan/${params.id}`, {
      method: "PUT",
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
          message: data?.message ?? `Gagal menyimpan (${res.status})`,
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

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/agen-perubahan/${params.id}`, {
      method: "DELETE",
      headers: getAdminAuthHeaders(cookies, request),
    });
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return adminJsonResponse(
        {
          success: false,
          message: data?.message ?? `Gagal menghapus (${res.status})`,
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
