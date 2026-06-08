/**
 * Auth Middleware — Proteksi halaman admin & internal
 *
 * Cek token di cookie "auth_token" atau sesi SSO dan validasi ke backend.
 * Redirect ke login jika tidak valid.
 */
import { defineMiddleware } from "astro:middleware";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Halaman yang TIDAK perlu auth (public)
const PUBLIC_PATHS = [
  "/admin/login",
  "/internal/login",
  "/api",
  "/check-progress",
  "/sublayanan",
  "/information",
  "/_astro",
  "/favicon",
  "/logo",
  "/kemenag",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

async function validateToken(
  token: string | undefined,
  cookieHeader: string,
): Promise<{ valid: boolean; user?: any }> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookieHeader) headers.Cookie = cookieHeader;

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();

    // Backend returns { success: true, user: {...} }
    // BUT might also return validation errors if user object is incomplete
    // Check: success === true AND no errors array AND user exists
    if (data.success === true && !data.errors && data.user) {
      return { valid: true, user: data.user };
    }

    // Handle ElysiaJS validation response (has "errors" array)
    if (data.found?.user) {
      console.warn(
        "[middleware] Backend returned validation error, using found user data",
      );
      return { valid: true, user: data.found.user };
    }

    console.log(
      "[middleware] Token validation failed:",
      JSON.stringify(data).slice(0, 200),
    );
    return { valid: false };
  } catch (e) {
    console.error(
      "[middleware] Backend auth validation failed:",
      (e as Error).message,
    );
    return { valid: false };
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, request } = context;

  // Skip public paths
  if (isPublicPath(url.pathname)) {
    return next();
  }

  const isAdminRoute = url.pathname.startsWith("/admin");
  const isInternalRoute = url.pathname.startsWith("/internal");

  // Only protect admin and internal routes
  if (!isAdminRoute && !isInternalRoute) {
    return next();
  }

  const token = cookies.get("auth_token")?.value;
  const cookieHeader = request.headers.get("cookie") ?? "";

  if (!token && !cookieHeader) {
    console.log(
      "[middleware] No auth_token atau cookie sesi — redirecting to login",
    );
    const loginPath = isAdminRoute ? "/admin/login" : "/internal/login";
    const redirectParam = `?redirect=${encodeURIComponent(url.pathname)}`;
    return redirect(`${loginPath}${redirectParam}`);
  }

  // Validate token or SSO session against backend
  const { valid, user } = await validateToken(token, cookieHeader);

  if (!valid) {
    console.log("[middleware] Token invalid — clearing cookie and redirecting");
    cookies.delete("auth_token", { path: "/" });
    const loginPath = isAdminRoute ? "/admin/login" : "/internal/login";
    const redirectParam = `?redirect=${encodeURIComponent(url.pathname)}`;
    return redirect(`${loginPath}${redirectParam}`);
  }

  console.log(`[middleware] Auth OK — user: ${user?.nama} (${user?.role})`);

  // ── Role-based access ─────────────────────────────────

  // Admin routes: hanya role panel admin yang bisa masuk
  if (
    isAdminRoute &&
    !["super_admin", "admin", "operator", "humas"].includes(user?.role)
  ) {
    console.log(
      "[middleware] Non-admin role cannot access admin routes:",
      user?.role,
    );
    return redirect("/admin/login");
  }

  if (isAdminRoute && user?.role === "humas") {
    const allowedHumasPaths = [
      "/admin/berita",
      "/admin/pengaduan",
      "/admin/survei",
      "/admin/profil",
      "/api/admin/auth/logout",
    ];

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return redirect("/admin/berita");
    }

    if (!allowedHumasPaths.some((path) => url.pathname.startsWith(path))) {
      console.log(
        "[middleware] Humas cannot access admin route:",
        url.pathname,
      );
      return redirect("/admin/berita");
    }
  }

  // Internal routes: semua pegawai bisa akses (semua role adalah ASN)
  // Tidak perlu pengecekan role khusus

  // Attach user info to locals for pages/components to use
  context.locals.user = user;
  context.locals.token = token;

  return next();
});
