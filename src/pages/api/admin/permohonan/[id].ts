import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../../lib/admin-api-proxy";
import {
  collectUploadFilenames,
  deleteUploadedFiles,
} from "../../../../lib/upload-cleanup";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Proxy: GET /api/v1/permohonan/:id
export const GET: APIRoute = async ({ params, cookies, request }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/permohonan/${params.id}`, {
      headers: getAdminAuthHeaders(cookies, request),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

// Proxy: PATCH /api/v1/permohonan/:id (partial update)
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(
        JSON.stringify({ success: false, message: "Request body is empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const body = JSON.parse(text);
    const res = await fetch(`${BACKEND_URL}/api/v1/permohonan/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(cookies, request),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

// Proxy: DELETE /api/v1/permohonan/:id
export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  try {
    const headers = getAdminAuthHeaders(cookies, request);
    const detailRes = await fetch(`${BACKEND_URL}/api/v1/permohonan/${params.id}`, {
      headers,
    });
    const detail = await detailRes.json().catch(() => null);
    const filenames = detailRes.ok
      ? collectUploadFilenames(detail?.data ?? detail)
      : [];

    const res = await fetch(`${BACKEND_URL}/api/v1/permohonan/${params.id}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json();
    const storageCleanup =
      res.ok && data?.success !== false
        ? await deleteUploadedFiles(filenames, headers)
        : [];

    return new Response(JSON.stringify({ ...data, storageCleanup }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
