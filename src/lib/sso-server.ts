/**
 * Helper SSO sisi server (BFF) untuk Layanan Kemenag.
 *
 * Access token SSO berlaku singkat (default 15 menit). Ketika validasi gagal,
 * helper ini memanggil POST /api/v1/auth/refresh di backend membawa cookie
 * browser; backend membalas dengan Set-Cookie access baru + refresh token
 * yang dirotasi. Hasil rotasi diteruskan ke browser agar sesi tetap sinkron.
 *
 * Catatan: cookie `auth_token` (salinan access token untuk Bearer) ikut
 * diperbarui — kalau tidak, Bearer usang akan selalu 401 di backend
 * (extractAuthToken memprioritaskan header Authorization) dan refresh
 * terpicu ulang pada setiap request.
 */

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const SSO_COOKIE_NAMES = {
  access: process.env.AUTH_COOKIE_NAME ?? "kemenag_sso_session",
  refresh: process.env.AUTH_REFRESH_COOKIE_NAME ?? "kemenag_sso_refresh",
} as const;

export type ParsedSetCookie = {
  name: string;
  value: string;
  attrs: Record<string, string | true>;
};

/** Parse satu header Set-Cookie menjadi komponen untuk Astro cookies.set(). */
export function parseSetCookie(header: string): ParsedSetCookie | null {
  const parts = header.split(";").map((p) => p.trim());
  const [nameValue, ...attrParts] = parts;
  const eq = nameValue.indexOf("=");
  if (eq <= 0) return null;

  const name = nameValue.slice(0, eq).trim();
  const value = nameValue.slice(eq + 1).trim();
  const attrs: Record<string, string | true> = {};

  for (const part of attrParts) {
    const i = part.indexOf("=");
    if (i === -1) {
      attrs[part.toLowerCase()] = true;
    } else {
      attrs[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
    }
  }
  return { name, value, attrs };
}

/** Ambil semua header Set-Cookie dari Response (aman untuk runtime lama). */
export function getSetCookies(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const raw = res.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function jarToMap(jar: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!jar) return map;
  for (const pair of jar.split(";")) {
    const i = pair.indexOf("=");
    if (i === -1) continue;
    map.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
  return map;
}

/**
 * Panggil /auth/refresh di backend membawa cookie browser.
 * Kembalikan cookie jar baru (untuk memanggil backend) beserta daftar
 * Set-Cookie hasil rotasi (untuk diteruskan ke browser).
 * Null jika refresh gagal (sesi benar-benar habis / tidak ada refresh token).
 */
export async function refreshSsoSession(
  cookieHeader: string,
): Promise<{ cookieJar: string; setCookies: ParsedSetCookie[] } | null> {
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const jar = jarToMap(cookieHeader);
    const setCookies: ParsedSetCookie[] = [];

    for (const raw of getSetCookies(res)) {
      const parsed = parseSetCookie(raw);
      if (!parsed) continue;
      // Cookie dihapus backend (Max-Age=0) → keluarkan dari jar.
      if (parsed.attrs["max-age"] === "0") {
        jar.delete(parsed.name);
        continue;
      }
      jar.set(parsed.name, parsed.value);
      setCookies.push(parsed);
    }

    if (setCookies.length === 0) return null;
    const cookieJar = [...jar.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    return { cookieJar, setCookies };
  } catch {
    return null;
  }
}

/**
 * Terapkan cookie hasil rotasi ke browser via Astro cookies API,
 * sekaligus sinkronkan `auth_token` (salinan access token untuk Bearer).
 */
export function applySetCookiesToAstro(
  cookies: {
    set: (
      name: string,
      value: string,
      options?: Record<string, unknown>,
    ) => void;
  },
  setCookies: ParsedSetCookie[],
): void {
  let freshAccessToken: string | null = null;

  for (const c of setCookies) {
    if (c.name === SSO_COOKIE_NAMES.access) freshAccessToken = c.value;

    const sameSiteRaw = c.attrs["samesite"];
    const sameSite =
      sameSiteRaw === "strict" ? "strict" : sameSiteRaw === "none" ? "none" : "lax";

    cookies.set(c.name, c.value, {
      path: typeof c.attrs.path === "string" ? c.attrs.path : "/",
      ...(typeof c.attrs.domain === "string" ? { domain: c.attrs.domain } : {}),
      ...(typeof c.attrs["max-age"] === "string"
        ? { maxAge: Number(c.attrs["max-age"]) }
        : {}),
      httpOnly: true,
      secure: "secure" in c.attrs,
      sameSite,
    });
  }

  if (freshAccessToken) {
    cookies.set("auth_token", freshAccessToken, {
      path: "/",
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
  }
}
