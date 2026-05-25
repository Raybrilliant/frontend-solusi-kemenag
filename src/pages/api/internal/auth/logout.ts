import type { APIRoute } from 'astro';

/**
 * GET /api/internal/auth/logout
 */
export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('auth_token', { path: '/' });
  return redirect('/internal/login');
};
