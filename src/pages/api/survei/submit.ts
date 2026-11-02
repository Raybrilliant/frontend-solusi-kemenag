import type { APIRoute } from "astro";
import { enforceRateLimit } from "../../../lib/rate-limit";
import { jsonProxyResponse, readBackendJson } from "../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const POST: APIRoute = async ({ request }) => {
  try {
    const limited = enforceRateLimit(request, "submit:survei", 5, 15 * 60_000);
    if (limited) return limited;

    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/survei/submit`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await readBackendJson(res);
    return jsonProxyResponse(data, res.ok ? 201 : res.status);
  } catch (e) {
    return jsonProxyResponse({ success: false, message: String(e) }, 500);
  }
};
