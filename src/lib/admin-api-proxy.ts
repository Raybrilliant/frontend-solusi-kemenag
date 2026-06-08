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
  return getUserFromToken(token, cookieHeader);
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

export function jsonProxyResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
