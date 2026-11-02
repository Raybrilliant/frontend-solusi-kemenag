import type { APIRoute } from "astro";
import { getSetCookies } from "../../../../lib/sso-server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

async function clearSsoSession(cookieHeader: string): Promise<string[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });

    // Backend mengirim lebih dari satu Set-Cookie (access + refresh);
    // ambil masing-masing secara terpisah agar tidak saling menimpa.
    return getSetCookies(res);
  } catch {
    return [];
  }
}

/**
 * GET /api/internal/auth/logout
 * Logout sesungguhnya: hapus cookie auth_token + sesi SSO backend,
 * lalu redirect ke halaman login internal.
 */
export const GET: APIRoute = async ({ cookies, request }) => {
  cookies.delete("auth_token", { path: "/" });

  const headers = new Headers({ Location: "/internal/login" });
  for (const cookie of await clearSsoSession(
    request.headers.get("cookie") ?? "",
  )) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(null, {
    status: 302,
    headers,
  });
};
