import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

function getAuthHeaders(cookies: any): Record<string, string> {
  const token = cookies?.get?.("auth_token")?.value ?? "";
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// Proxy: GET /api/v1/permohonan/:id
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/permohonan/${params.id}`, {
      headers: getAuthHeaders(cookies),
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
        ...getAuthHeaders(cookies),
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
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/permohonan/${params.id}`, {
      method: "DELETE",
      headers: getAuthHeaders(cookies),
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
