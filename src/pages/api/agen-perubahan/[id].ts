import type { APIRoute } from "astro";
import { getAgenPerubahanMockById } from "../../../lib/agen-perubahan-mock";

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
    const res = await fetch(`${BACKEND_URL}/api/v1/agen-perubahan/${params.id}`);
    const data = await safeJson(res);

    if (!res.ok || data?.success === false) {
      const mock = getAgenPerubahanMockById(params.id);
      return new Response(
        JSON.stringify(
          mock
            ? { success: true, data: mock, mock: true }
            : {
                success: false,
                message: data?.message ?? "Agen perubahan tidak ditemukan.",
              },
        ),
        {
          status: mock ? 200 : res.status === 404 ? 404 : 200,
          headers: FALLBACK_HEADERS,
        },
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: SUCCESS_HEADERS,
    });
  } catch {
    const mock = getAgenPerubahanMockById(params.id);
    return new Response(
      JSON.stringify(
        mock
          ? { success: true, data: mock, mock: true }
          : {
              success: false,
              message: "Gagal memuat detail agen perubahan.",
            },
      ),
      {
        status: mock ? 200 : 200,
        headers: FALLBACK_HEADERS,
      },
    );
  }
};
