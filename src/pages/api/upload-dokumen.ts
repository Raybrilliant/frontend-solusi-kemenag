import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const token = cookies.get("auth_token")?.value;

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND_URL}/api/v1/upload/dokumen`, {
      method: "POST",
      headers,
      body: formData,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.text();

    let payload: Record<string, unknown>;

    if (contentType.includes("application/json")) {
      payload = raw ? JSON.parse(raw) : {};
    } else {
      payload = {
        success: res.ok,
        message: raw || (res.ok ? "Upload berhasil." : "Gagal upload dokumen."),
      };
    }

    return new Response(JSON.stringify(payload), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        message: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
