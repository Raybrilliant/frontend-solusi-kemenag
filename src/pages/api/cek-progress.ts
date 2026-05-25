import type { APIRoute } from "astro";
import { transformTrackResponse, transformPengaduanTrackResponse } from "../../lib/track-transform";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ url }) => {
  try {
    const kode = url.searchParams.get("kode")?.trim();
    if (!kode) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Parameter kode diperlukan",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const isPengaduan = kode.toUpperCase().startsWith("ADUAN-");
    const endpoint = isPengaduan
      ? `${BACKEND_URL}/api/v1/pengaduan/track/${encodeURIComponent(kode)}`
      : `${BACKEND_URL}/api/v1/permohonan/track/${encodeURIComponent(kode)}`;

    const res = await fetch(endpoint);
    const raw = await res.json();
    const data = isPengaduan
      ? transformPengaduanTrackResponse(raw)
      : await transformTrackResponse(raw);

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
