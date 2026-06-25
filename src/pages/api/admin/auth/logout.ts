import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

async function clearSsoSession(cookieHeader: string): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });

    return res.headers.get("set-cookie") ?? "";
  } catch {
    return "";
  }
}

/**
 * POST /api/admin/auth/logout
 * Menghapus cookie auth_token dan sesi SSO backend
 */
export const POST: APIRoute = async ({ cookies, request }) => {
  cookies.delete("auth_token", { path: "/" });

  const headers = new Headers({ "Content-Type": "application/json" });
  const ssoCookie = await clearSsoSession(request.headers.get("cookie") ?? "");
  if (ssoCookie) headers.append("Set-Cookie", ssoCookie);

  return new Response(
    JSON.stringify({ success: true, message: "Berhasil logout" }),
    {
      status: 200,
      headers,
    },
  );
};

/**
 * GET /api/admin/auth/logout — redirect ke portal internal
 */
export const GET: APIRoute = async ({ cookies, request }) => {
  cookies.delete("auth_token", { path: "/" });

  const headers = new Headers({ Location: "/internal" });
  const ssoCookie = await clearSsoSession(request.headers.get("cookie") ?? "");
  if (ssoCookie) headers.append("Set-Cookie", ssoCookie);

  return new Response(null, {
    status: 302,
    headers,
  });
};
