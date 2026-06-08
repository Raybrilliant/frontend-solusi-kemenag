import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
  getAdminUser,
} from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Proxy: GET /api/v1/dashboard/stats
// Operator: ambil dari /stats/per-kategori dan filter ke kategori mereka
export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const headers = getAdminAuthHeaders(cookies, request);
    const user = await getAdminUser(cookies, request);
    const isOperator = user?.role === "operator" && user.categoryId !== null;

    if (isOperator) {
      const res = await fetch(
        `${BACKEND_URL}/api/v1/dashboard/stats/per-kategori`,
        { headers },
      );
      const data = await res.json();

      if (data.success && data.data) {
        const entry = data.data.find(
          (item: any) => item.categoryId === user!.categoryId,
        );
        const stats = entry
          ? {
              total: entry.total,
              selesai: entry.selesai,
              ditolak: entry.ditolak,
              tingkatPenyelesaian: entry.tingkatPenyelesaian,
            }
          : { total: 0, selesai: 0, ditolak: 0, tingkatPenyelesaian: 0 };

        return new Response(JSON.stringify({ success: true, data: stats }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Admin / super_admin: gunakan endpoint global
    const res = await fetch(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      headers,
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
