import type { APIRoute } from "astro";
import { jsonProxyResponse, readBackendJson } from "../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const POST: APIRoute = async ({ request }) => {
  try {
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
