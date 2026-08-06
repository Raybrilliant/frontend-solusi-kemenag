import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "ID permohonan diperlukan" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Hapus id dari body sebelum diteruskan ke backend
    const { id: _id, ...payload } = body;

    const res = await fetch(
      `${BACKEND_URL}/api/v1/permohonan/${encodeURIComponent(id)}/revisi`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const contentType = res.headers.get("content-type") ?? "";
    const rawText = await res.text();

    let responsePayload: Record<string, unknown>;
    if (contentType.includes("application/json") && rawText) {
      try {
        responsePayload = JSON.parse(rawText);
      } catch {
        responsePayload = {
          success: false,
          message: `Respons backend tidak valid: ${rawText.slice(0, 200)}`,
        };
      }
    } else {
      responsePayload = {
        success: false,
        message:
          rawText.trim() ||
          `Backend mengembalikan HTTP ${res.status} tanpa pesan.`,
      };
    }

    return new Response(JSON.stringify(responsePayload), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[permohonan-revisi] proxy error", e);
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
