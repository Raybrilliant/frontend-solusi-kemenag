import type { APIRoute } from "astro";
import { getUserFromToken } from "../../../lib/get-user";

const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

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
    return {
      success: false,
      message: `Invalid JSON response (HTTP ${res.status})`,
    };
  }
}

// Proxy: GET /api/v1/categories — operator hanya lihat kategori mereka
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const token = cookies?.get?.("auth_token")?.value;
    const headers = getAuthHeaders(cookies);

    const [user, res] = await Promise.all([
      getUserFromToken(token),
      fetch(`${BACKEND_URL}/api/v1/categories/`, { headers }),
    ]);

    const data = (await safeJson(res)) as any;

    if (!res.ok || data?.success === false) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Operator: filter hanya kategori mereka
    if (
      data.success &&
      data.data &&
      user?.role === "operator" &&
      user.categoryId !== null
    ) {
      data.data = data.data.filter((cat: any) => cat.id === user.categoryId);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Proxy: POST /api/v1/categories
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/categories/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(cookies),
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
