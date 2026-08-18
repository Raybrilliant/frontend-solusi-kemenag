import type { APIRoute } from "astro";
import {
  getAdminAuthHeaders,
} from "../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// GET /api/admin/tamu/export-pdf?month=1&year=2026 — stream PDF dari backend
export const GET: APIRoute = async ({ url, cookies, request }) => {
  try {
    const qs = url.searchParams.toString();
    const headers = getAdminAuthHeaders(cookies, request);
    const res = await fetch(
      `${BACKEND_URL}/api/v1/tamu/export-pdf${qs ? `?${qs}` : ""}`,
      { headers },
    );

    if (!res.ok) {
      // Backend error: kembalikan JSON agar frontend bisa baca message
      const raw = await res.text();
      let payload: Record<string, unknown>;
      try {
        payload = raw ? JSON.parse(raw) : { success: false };
      } catch {
        payload = { success: false, message: raw || "Gagal export PDF." };
      }
      return new Response(JSON.stringify(payload), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = res.headers.get("content-type") ?? "application/pdf";
    const contentDisposition = res.headers.get("content-disposition") ?? "";
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
