import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

// Proxy SSE: stream statistik permohonan PPID dari backend apa adanya.
// Backend push hanya saat data berubah, jadi tidak perlu polling di sini.
export const GET: APIRoute = async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/ppid/permohonan/events`);
    if (!res.ok || !res.body) {
      return new Response("stream unavailable", { status: 502 });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response("stream unavailable", { status: 502 });
  }
};
