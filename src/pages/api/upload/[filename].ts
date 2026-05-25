import type { APIRoute } from "astro";

const BACKEND_URL = import.meta.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ params }) => {
  const { filename } = params;
  if (!filename) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/v1/upload/${encodeURIComponent(filename)}`,
    );

    if (!res.ok) {
      return new Response("Not Found", { status: res.status });
    }

    const contentType =
      res.headers.get("Content-Type") ?? "application/octet-stream";
    const contentDisposition = res.headers.get("Content-Disposition");

    const headers: Record<string, string> = { "Content-Type": contentType };
    if (contentDisposition) headers["Content-Disposition"] = contentDisposition;

    return new Response(res.body, { status: 200, headers });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
};
