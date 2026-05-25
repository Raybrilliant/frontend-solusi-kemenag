import type { APIRoute } from "astro";
import { transformTrackResponse, transformPengaduanTrackResponse } from "../../lib/track-transform";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ url }) => {
  const kode = url.searchParams.get("kode")?.trim().toUpperCase();

  if (!kode) {
    return new Response(
      'data: {"success":false,"message":"missing_kode"}\n\n',
      {
        status: 400,
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const enqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const isPengaduan = kode.startsWith("ADUAN-");

      const fetchTrack = async () => {
        try {
          const endpoint = isPengaduan
            ? `${BACKEND_URL}/api/v1/pengaduan/track/${encodeURIComponent(kode)}`
            : `${BACKEND_URL}/api/v1/permohonan/track/${encodeURIComponent(kode)}`;
          const res = await fetch(endpoint);
          const raw = await res.json();
          const transformed = isPengaduan
            ? transformPengaduanTrackResponse(raw)
            : await transformTrackResponse(raw);
          if (transformed.success && transformed.data) {
            enqueue(`data: ${JSON.stringify(transformed.data)}\n\n`);
          }
        } catch {}
      };

      const heartbeat = setInterval(() => enqueue(": ping\n\n"), 20_000);

      // 10s fallback poll — keeps running as safety net even after SSE connects
      let pollInterval = setInterval(fetchTrack, 10_000);

      const closeAll = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch {}
      };

      setTimeout(closeAll, 5 * 60 * 1000);

      // Send initial data immediately
      fetchTrack();

      // Connect to Elysia SSE for real-time push
      (async () => {
        try {
          const elysiaRes = await fetch(
            `${BACKEND_URL}/api/v1/permohonan/events`,
          );
          if (!elysiaRes.ok || !elysiaRes.body) return;

          // SSE connected — keep polling as safety net for status transitions
          // that the backend SSE might not emit

          const reader = elysiaRes.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";

          while (!closed) {
            const { done, value } = await reader.read();
            if (done) break;

            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";

            let evName = "";
            let evData = "";
            for (const line of lines) {
              if (line.startsWith("event:")) evName = line.slice(6).trim();
              else if (line.startsWith("data:")) evData = line.slice(5).trim();
              else if (line === "" && evData) {
                if (
                  evName === "permohonan:status" ||
                  evName === "permohonan:updated"
                ) {
                  await fetchTrack();
                }
                evName = "";
                evData = "";
              }
            }
          }

          reader.cancel();
        } catch {
          // Elysia SSE unavailable — polling fallback continues
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
