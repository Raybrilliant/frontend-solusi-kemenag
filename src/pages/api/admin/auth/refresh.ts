import type { APIRoute } from "astro";
import {
  applySetCookiesToAstro,
  refreshSsoSession,
} from "../../../../lib/sso-server";

/**
 * POST /api/admin/auth/refresh
 *
 * Perpanjang sesi SSO via refresh cookie. Dipanggil client-side (fetch
 * wrapper di AdminLayout) saat XHR ke /api/admin/* mendapat 401, sebelum
 * request diulang. Cookie hasil rotasi diset kembali ke browser.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const refreshed = await refreshSsoSession(cookieHeader);
  if (!refreshed) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Sesi tidak dapat diperpanjang. Silakan login ulang.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  applySetCookiesToAstro(cookies, refreshed.setCookies);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
