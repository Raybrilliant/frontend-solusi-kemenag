import { getUserFromToken, type AuthUser } from "./get-user";

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
