import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

/**
 * POST /api/admin/auth/login
 *
 * Login, set cookie, lalu redirect ke halaman admin.
 * Form HTML langsung submit ke sini.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success && data.token) {
      // Set cookie
      cookies.set("auth_token", data.token, {
        path: "/",
        httpOnly: true,
        secure: false, // false in dev mode
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
      });

      // Return success — frontend will handle redirect
      return new Response(
        JSON.stringify({ success: true, token: data.token, user: data.user }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

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
