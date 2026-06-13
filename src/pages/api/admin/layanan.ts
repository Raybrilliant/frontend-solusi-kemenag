import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  getAdminUser,
  adminJsonResponse,
} from "../../../lib/admin-api-proxy";

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

// Proxy: GET /api/v1/layanan — operator hanya lihat layanan kategorinya
export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const headers = getAdminAuthHeaders(cookies, request);

    const user = await getAdminUser(cookies, request);
    const isOperator = user?.role === "operator" && user.categoryId !== null;

    // Forward all client params (page, limit, q, etc.) alongside categoryId
    const params = new URLSearchParams();
    if (isOperator) {
      params.set("categoryId", String(user!.categoryId));
    } else {
      const catId = url.searchParams.get("categoryId");
      if (catId) params.set("categoryId", catId);
    }
    // Forward all other params including page, limit, q
    for (const [key, value] of url.searchParams) {
      if (key !== "categoryId") params.set(key, value);
    }

    const qs = params.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/layanan/${qs ? `?${qs}` : ""}`,
      { headers },
    );
    const data = await res.json();
    return adminJsonResponse(data, res.status);
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Proxy: POST /api/v1/layanan
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get("cookie") ?? "";
    const res = await fetch(`${BACKEND_URL}/api/v1/layanan/`, {
      method: "POST",
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
          message:
            (data as any)?.message ??
            (data as any)?.error ??
            `Gagal menyimpan (${res.status})`,
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
