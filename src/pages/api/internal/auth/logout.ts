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
 * GET /api/internal/auth/logout
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
