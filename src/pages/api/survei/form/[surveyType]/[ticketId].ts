import type { APIRoute } from "astro";
import { jsonProxyResponse, readBackendJson } from "../../../../../lib/admin-api-proxy";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export const GET: APIRoute = async ({ params }) => {
  try {
    const surveyType = params.surveyType ?? "";
    const ticketId = params.ticketId ?? "";
    const res = await fetch(
      `${BACKEND_URL}/api/v1/survei/form/${encodeURIComponent(surveyType)}/${encodeURIComponent(ticketId)}`,
      { headers: { Accept: "application/json" } },
    );
    const data = await readBackendJson(res);
    return jsonProxyResponse(data, res.ok ? 200 : res.status);
  } catch (e) {
    return jsonProxyResponse({ success: false, message: String(e) }, 500);
  }
};
