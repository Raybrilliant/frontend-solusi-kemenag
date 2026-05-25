import type { APIRoute } from 'astro';

/**
 * POST /api/admin/auth/logout
 * Menghapus cookie auth_token
 */
export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('auth_token', { path: '/' });

  return new Response(JSON.stringify({ success: true, message: 'Berhasil logout' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * GET /api/admin/auth/logout — redirect ke login
 */
export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('auth_token', { path: '/' });
  return redirect('/admin/login');
};
