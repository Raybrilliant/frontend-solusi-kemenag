export function getAdminAuthHeaders(cookies: any): Record<string, string> {
  const token = cookies?.get?.("auth_token")?.value ?? "";
  if (!token) return {};
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
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
