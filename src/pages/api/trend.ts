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
    const rawPeriod = url.searchParams.get("period") ?? "";
    const periodMap: Record<string, string> = {
      "3 Bulan": "3",
      "6 Bulan": "6",
      "1 Tahun": "12",
    };
    const period = (periodMap[rawPeriod] ?? rawPeriod) || "3";
    const res = await fetch(
      `${BACKEND_URL}/api/v1/dashboard/trend?period=${period}`,
    );
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: SUCCESS_HEADERS,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, message: String(e) }),
      {
        status: 500,
        headers: ERROR_HEADERS,
      },
    );
  }
};
