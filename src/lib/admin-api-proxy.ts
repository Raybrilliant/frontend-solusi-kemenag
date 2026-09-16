import { getUserFromToken, type AuthUser } from "./get-user";
import {
  SSO_COOKIE_NAMES,
  applySetCookiesToAstro,
  refreshSsoSession,
} from "./sso-server";

export function getAdminAuthHeaders(
  cookies: any,
  request?: Request,
): Record<string, string> {
  const token = cookies?.get?.("auth_token")?.value ?? "";
  const cookieHeader = request?.headers.get("cookie") ?? "";

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  };
}

export function hasAdminSession(headers: Record<string, string>): boolean {
  return Boolean(headers.Authorization || headers.Cookie);
}

export async function getAdminUser(
  cookies: any,
  request?: Request,
): Promise<AuthUser | null> {
  const token = cookies?.get?.("auth_token")?.value;
  const cookieHeader = request?.headers.get("cookie") ?? "";
  return memoizedGetUser(token, cookieHeader);
}

// ── In-memory cache untuk auth/me ──────────────────────
let _userCache: { key: string; user: AuthUser | null; ts: number } | null =
  null;
const USER_CACHE_TTL = 30_000; // 30 detik

async function memoizedGetUser(
  token: string | undefined,
  cookieHeader?: string,
): Promise<AuthUser | null> {
  const key = `${token ?? ""}::${cookieHeader ?? ""}`;
  if (
    _userCache &&
    _userCache.key === key &&
    Date.now() - _userCache.ts < USER_CACHE_TTL
  ) {
    return _userCache.user;
  }
  const user = await getUserFromToken(token, cookieHeader);
  _userCache = { key, user, ts: Date.now() };
  return user;
}

export function missingAdminSessionResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      message: "Sesi admin tidak ditemukan. Silakan login ulang.",
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}

export async function readBackendJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 220);
    return {
      success: false,
      message: snippet
        ? `Backend mengembalikan HTTP ${res.status}: ${snippet}`
        : `Backend mengembalikan HTTP ${res.status} tanpa JSON.`,
    };
  }
}

export function adminJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

export const jsonProxyResponse = adminJsonResponse;

function bearerFromCookieJar(jar: string): string | null {
  const m = jar.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Fetch ke backend dengan silent refresh: bila access token kedaluwarsa
 * (401), rotasi sesi via refresh cookie SSO lalu ulangi request sekali.
 * Cookie hasil rotasi diteruskan ke browser agar sesi tetap sinkron.
 * Tanpa ini, fetch paging dari komponen yang diam > TTL access token (15m)
 * selalu 401 karena refresh hanya terjadi di middleware saat navigasi
 * halaman.
 */
export async function fetchBackendWithRefresh(
  cookies: any,
  request: Request,
  url: string,
  init: { method?: string; body?: string } = {},
): Promise<{ res: Response }> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const method = init.method ?? "GET";

  const doFetch = (headers: Record<string, string>) =>
    fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(init.body ? { body: init.body } : {}),
    });

  let res = await doFetch(getAdminAuthHeaders(cookies, request));

  if (res.status === 401 && cookieHeader) {
    const refreshed = await refreshSsoSession(cookieHeader);
    if (refreshed) {
      applySetCookiesToAstro(cookies, refreshed.setCookies);
      // auth_token di jar masih yang lama (backend hanya men-rotasi cookie
      // SSO) — timpa dengan access token baru supaya Bearer retry valid.
      const freshAccess = refreshed.setCookies.find(
        (c) => c.name === SSO_COOKIE_NAMES.access,
      )?.value;
      const bearer = freshAccess ?? bearerFromCookieJar(refreshed.cookieJar);
      const cookieForRetry =
        freshAccess && /(^|;\s*)auth_token=/.test(refreshed.cookieJar)
          ? refreshed.cookieJar.replace(
              /(^|;\s*)auth_token=[^;]*/,
              `$1auth_token=${encodeURIComponent(freshAccess)}`,
            )
          : refreshed.cookieJar;
      res = await doFetch({
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        Cookie: cookieForRetry,
      });
    }
  }

  return { res };
}
