import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

function getAuthHeaders(cookies: any): Record<string, string> {
  const token = cookies?.get?.("auth_token")?.value ?? "";
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export const GET: APIRoute = async ({ params }) => {
  const { filename } = params;
  if (!filename) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/upload/${encodeURIComponent(filename)}`,
    );

    if (!res.ok) {
      return new Response("Not Found", { status: res.status });
    }

    const contentType =
      res.headers.get("Content-Type") ?? "application/octet-stream";
    const contentDisposition = res.headers.get("Content-Disposition");

    const headers: Record<string, string> = { "Content-Type": contentType };
    if (contentDisposition) headers["Content-Disposition"] = contentDisposition;

    return new Response(res.body, { status: 200, headers });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const { filename } = params;
  if (!filename) {
    return new Response(
      JSON.stringify({ success: false, message: "Not Found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/upload/${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(cookies),
      },
    );

    const text = await res.text();
    return new Response(text || JSON.stringify({ success: res.ok }), {
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
