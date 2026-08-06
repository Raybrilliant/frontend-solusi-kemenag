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
      `${BACKEND_URL}/api/v1/permohonan/last-by-phone?phone=${encodeURIComponent(phone)}`,
    );

    const contentType = res.headers.get("content-type") ?? "";
    const rawText = await res.text();

    let payload: Record<string, unknown>;
    if (contentType.includes("application/json") && rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = {
          success: false,
          message: `Respons backend tidak valid: ${rawText.slice(0, 200)}`,
        };
      }
    } else {
      payload = {
        success: false,
        message:
          rawText.trim() ||
          `Backend mengembalikan HTTP ${res.status} tanpa pesan.`,
      };
    }

    return new Response(JSON.stringify(payload), {
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
