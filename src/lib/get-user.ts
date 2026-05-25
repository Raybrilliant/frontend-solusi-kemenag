const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

export type UserRole = "super_admin" | "admin" | "operator" | "asn";

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
): Promise<AuthUser | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.user) return data.user as AuthUser;
    return null;
  } catch {
    return null;
  }
}
