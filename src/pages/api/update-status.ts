import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { kode, status, startTime, receivedTime, message, fileUrl } = body;

    if (!kode || !status) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "kode dan status diperlukan",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Map to backend put endpoint
    const backendBody: Record<string, any> = { status };

    if (status === "Ditolak" && message) backendBody.rejectionReason = message;
    if (fileUrl)
      backendBody.outputFile = { nama: `output-${kode}.pdf`, url: fileUrl };

    const res = await fetch(
      `${BACKEND_URL}/api/v1/permohonan/${encodeURIComponent(kode)}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendBody),
      },
    );

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
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
