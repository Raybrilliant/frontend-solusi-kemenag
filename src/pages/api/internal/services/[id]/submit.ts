import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const POST: APIRoute = async ({ params, request, cookies }) => {
    const { id } = params;
    const token = cookies.get("auth_token")?.value ?? "";
    const cookieHeader = request.headers.get("cookie") ?? "";

    try {
        const body = await request.json();
        const res = await fetch(
            `${BACKEND_URL}/api/v1/internal/services/${id}/submit`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
                },
                body: JSON.stringify(body),
            },
        );

        const data = await res.json().catch(() => ({}));
        return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(
            JSON.stringify({
                success: false,
                message: "Gagal menghubungi server internal.",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};
