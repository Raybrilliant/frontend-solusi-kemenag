import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

/**
 * POST /api/internal/auth/login
 *
 * Proxy login ke backend, lalu set httpOnly cookie langsung di response.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success && data.token) {
      // Access token berlaku singkat — ikuti TTL asli dari backend.
      cookies.set("auth_token", data.token, {
        path: "/",
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        maxAge: Number(data.expiresIn) > 0 ? Number(data.expiresIn) : 900,
      });
    }

    const headers = new Headers({ "Content-Type": "application/json" });
    const ssoCookie = res.headers.get("set-cookie");
    if (ssoCookie) headers.append("Set-Cookie", ssoCookie);

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers,
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
