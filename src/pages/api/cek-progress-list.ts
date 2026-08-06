import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ url }) => {
  try {
    const phone = url.searchParams.get("phone")?.trim();
    if (!phone) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Parameter phone diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(
      `${BACKEND_URL}/api/v1/permohonan/track-by-phone?phone=${encodeURIComponent(phone)}`,
    );
    const raw = await res.json();

    return new Response(JSON.stringify(raw), {
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
