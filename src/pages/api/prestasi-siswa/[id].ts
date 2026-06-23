import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const SUCCESS_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=180, stale-while-revalidate=300",
};
const FALLBACK_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: `Invalid JSON response (HTTP ${res.status})`,
    };
  }
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/prestasi-siswa/${params.id}`);
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: data?.message ?? "Prestasi siswa tidak ditemukan.",
        }),
        {
          status: res.status === 404 ? 404 : 200,
          headers: FALLBACK_HEADERS,
        },
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: SUCCESS_HEADERS,
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Gagal memuat detail prestasi siswa.",
      }),
      {
        status: 200,
        headers: FALLBACK_HEADERS,
      },
    );
  }
};
