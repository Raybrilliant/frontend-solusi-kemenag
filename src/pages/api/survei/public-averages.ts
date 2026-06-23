import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const SUCCESS_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
};
const ERROR_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const qs = url.searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/v1/survei/public/averages${qs ? `?${qs}` : ""}`,
      { headers: { Accept: "application/json" } },
    );
    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: SUCCESS_HEADERS,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      { status: 500, headers: ERROR_HEADERS },
    );
  }
};
