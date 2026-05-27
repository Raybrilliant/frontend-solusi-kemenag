import type { APIRoute } from "astro";
import {
  collectUploadFilenames,
  deleteUploadedFiles,
} from "../../../../lib/upload-cleanup";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

function getAuthHeaders(cookies: any): Record<string, string> {
  const token = cookies?.get?.("auth_token")?.value ?? "";
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Invalid JSON (HTTP ${res.status})` };
  }
}

// Proxy: GET /api/v1/regulasi/:id
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/regulasi/${params.id}`,
      { headers: getAuthHeaders(cookies) },
    );
    const data = await safeJson(res);
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Proxy: PUT /api/v1/regulasi/:id
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const body = await request.json();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/regulasi/${params.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(cookies),
        },
        body: JSON.stringify(body),
      },
    );
    const data = await safeJson(res);
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Proxy: DELETE /api/v1/regulasi/:id — also cleans up the PDF file
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const headers = getAuthHeaders(cookies);
    const detailRes = await fetch(
      `${BACKEND_URL}/api/v1/regulasi/${params.id}`,
      { headers },
    );
    const detail = (await safeJson(detailRes)) as any;
    const filenames = detailRes.ok
      ? collectUploadFilenames(detail?.data ?? detail)
      : [];

    const res = await fetch(
      `${BACKEND_URL}/api/v1/regulasi/${params.id}`,
      { method: "DELETE", headers },
    );
    const data = (await safeJson(res)) as any;
    const storageCleanup =
      res.ok && data?.success !== false
        ? await deleteUploadedFiles(filenames, headers)
        : [];

    return new Response(JSON.stringify({ ...data, storageCleanup }), {
      status: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
