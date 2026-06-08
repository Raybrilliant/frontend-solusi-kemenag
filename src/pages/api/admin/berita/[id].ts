import type { APIRoute } from "astro";
import { getAdminAuthHeaders } from "../../../../lib/admin-api-proxy";
import {
  collectUploadFilenames,
  deleteUploadedFiles,
} from "../../../../lib/upload-cleanup";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

async function safeJson(res: Response): Promise<unknown> {
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
    const res = await fetch(`${BACKEND_URL}/api/v1/berita/admin/${params.id}`, {
      headers: getAdminAuthHeaders(cookies, request),
    });
    const data = await safeJson(res);

    if (!res.ok || (data as any)?.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Gagal memuat data berita.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(
        JSON.stringify({ success: false, message: "Request body is empty" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = JSON.parse(text);
    const res = await fetch(`${BACKEND_URL}/api/v1/berita/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(cookies, request),
      },
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);

    if (!res.ok || (data as any)?.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: (data as any)?.message ?? `Gagal menyimpan (${res.status})`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  try {
    const headers = getAdminAuthHeaders(cookies, request);
    const detailRes = await fetch(
      `${BACKEND_URL}/api/v1/berita/admin/${params.id}`,
      {
        headers,
      },
    );
    const detail = (await safeJson(detailRes)) as any;
    const filenames = detailRes.ok
      ? collectUploadFilenames(detail?.data ?? detail)
      : [];

    const res = await fetch(`${BACKEND_URL}/api/v1/berita/${params.id}`, {
      method: "DELETE",
      headers,
    });
    const data = (await safeJson(res)) as any;

    if (!res.ok || data?.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Gagal menghapus (${res.status})`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const storageCleanup = await deleteUploadedFiles(filenames, headers);

    return new Response(JSON.stringify({ ...data, storageCleanup }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
};
