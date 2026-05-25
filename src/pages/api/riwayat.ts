import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ url }) => {
  try {
    const status = url.searchParams.get("status");
    const limit = url.searchParams.get("limit") ?? "5";
    const res = await fetch(
      `${BACKEND_URL}/api/v1/dashboard/permohonan-terbaru?limit=${limit}${status ? `&status=${status}` : ""}`,
    );
    const json = await res.json();

    if (!json.success) {
      return new Response(JSON.stringify(json), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Enrich with icon bodies for the frontend display
    const data = (json.data ?? []).map((item: any) => ({
      kode: item.id,
      tanggal: new Date(item.submittedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      status: item.status,
      title: item.serviceTitle ?? "",
      iconBody: "", // Frontend should resolve icon from layanan data
    }));

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
