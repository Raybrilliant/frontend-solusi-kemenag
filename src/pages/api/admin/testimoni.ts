import type { APIRoute } from "astro";
import {
    adminJsonResponse,
    getAdminAuthHeaders,
} from "../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

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

export const GET: APIRoute = async ({ request, cookies }) => {
    try {
        const url = new URL(request.url);
        const qs = url.searchParams.toString();
        const res = await fetch(
            `${BACKEND_URL}/api/v1/testimoni/admin/list${qs ? `?${qs}` : ""}`,
            {
                headers: getAdminAuthHeaders(cookies, request),
            },
        );
        const data = await safeJson(res);

        if (!res.ok || data?.success === false) {
            return adminJsonResponse(
                {
                    success: true,
                    data: [],
                    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
                },
                200,
            );
        }

        return adminJsonResponse(data, 200);
    } catch {
        return adminJsonResponse(
            {
                success: true,
                data: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            },
            200,
        );
    }
};

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const text = await request.text();
        if (!text) {
            return adminJsonResponse(
                { success: false, message: "Request body is empty" },
                200,
            );
        }

        const body = JSON.parse(text);
        const res = await fetch(`${BACKEND_URL}/api/v1/testimoni`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAdminAuthHeaders(cookies, request),
            },
            body: JSON.stringify(body),
        });
        const data = await safeJson(res);

        if (!res.ok || data?.success === false) {
            return adminJsonResponse(
                {
                    success: false,
                    message:
                        data?.message ?? data?.error ?? `Gagal menyimpan (${res.status})`,
                },
                200,
            );
        }

        return adminJsonResponse(data, 200);
    } catch (e) {
        return adminJsonResponse({ success: false, message: String(e) }, 200);
    }
};
