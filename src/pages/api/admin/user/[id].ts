import type { APIRoute } from "astro";

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

// Proxy: GET /api/v1/users/:id
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/users/${params.id}`, {
      headers: getAuthHeaders(cookies),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Backend error (${res.status})`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = await safeJson(res);
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

// Proxy: PUT /api/v1/users/:id
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
    const res = await fetch(`${BACKEND_URL}/api/v1/users/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(cookies),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await safeJson(res);
      return new Response(
        JSON.stringify({
          success: false,
          message: (data as any)?.message ?? `Backend error (${res.status})`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = await safeJson(res);
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

// Proxy: DELETE /api/v1/users/:id
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/users/${params.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(cookies),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Backend error (${res.status})`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = await safeJson(res);
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
