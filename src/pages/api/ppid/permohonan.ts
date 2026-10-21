import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Proxy publik: GET /api/v1/ppid/permohonan (tabel transparansi, pagination)
export const GET: APIRoute = async ({ url }) => {
  try {
    const qs = url.searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/ppid/permohonan${qs ? `?${qs}` : ""}`,
    );
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Proxy publik: POST /api/v1/ppid/permohonan (pengajuan permohonan data PPID)
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/ppid/permohonan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.text();
    return new Response(data, {
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
