const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export type UserRole = "super_admin" | "admin" | "operator" | "humas" | "asn";

export interface AuthUser {
  id: number;
  nip: string;
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  categoryId: number | null;
}

export async function getUserFromToken(
  token: string | undefined,
  cookieHeader?: string,
): Promise<AuthUser | null> {
  if (!token && !cookieHeader) return null;
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookieHeader) headers.Cookie = cookieHeader;

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers,
    });
    const data = await res.json();
    if (data.success && data.user) return data.user as AuthUser;
    return null;
  } catch {
    return null;
  }
}
