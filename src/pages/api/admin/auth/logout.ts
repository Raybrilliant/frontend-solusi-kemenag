import type { APIRoute } from "astro";

/**
 * GET /api/admin/auth/logout
 * Kembali ke portal internal TANPA menghapus sesi.
 * Sesi (cookie auth_token + SSO) dipertahankan agar user tetap login
 * saat kembali ke halaman internal. Logout sesungguhnya hanya dilakukan
 * dari halaman internal via /api/internal/auth/logout.
 */
export const GET: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: { Location: "/internal" },
  });
};

/**
 * POST /api/admin/auth/logout
 * Respons sukses tanpa menghapus sesi (konsisten dengan GET).
 */
export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({ success: true, message: "Kembali ke portal internal" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
