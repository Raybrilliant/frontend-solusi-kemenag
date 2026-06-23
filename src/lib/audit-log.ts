type AuditActor = {
  id?: number | string | null;
  nip?: string | null;
  nama?: string | null;
  role?: string | null;
  kecamatan?: string | null;
};

type AuditEntry = {
  actor?: AuditActor | null;
  method: string;
  pathname: string;
  entity: string;
  action: string;
  targetId: string | number | null;
  statusCode: number;
  success: boolean;
  summary: string;
  requestBody?: unknown;
  responseData?: unknown;
  userAgent?: string;
  ip?: string | null;
  timestamp: string;
};

const HIDDEN_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "file",
  "files",
  "lampiran",
  "content",
  "html",
]);

export function isAdminApiMutation(pathname: string, method: string): boolean {
  return (
    pathname.startsWith("/api/admin") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
  );
}

export async function safeParseRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (
    !/(application\/json|text\/plain|application\/.*\+json)/i.test(contentType)
  ) {
    return undefined;
  }

  try {
    const text = await request.clone().text();
    if (!text) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function safeParseResponseBody(
  response: Response,
): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!/application\/json/i.test(contentType)) return undefined;

  try {
    const text = await response.clone().text();
    if (!text) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function sanitizeAuditData(value: unknown): unknown {
  return sanitizeValue(value, 0);
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value == null) return value;
  if (depth > 3) return "[truncated]";

  if (Array.isArray(value)) {
    return value.slice(0, 8).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, current] of Object.entries(obj)) {
      if (HIDDEN_KEYS.has(key)) {
        result[key] = "[hidden]";
        continue;
      }

      if (typeof current === "string" && current.length > 220) {
        result[key] = `${current.slice(0, 220)}…`;
        continue;
      }

      result[key] = sanitizeValue(current, depth + 1);
    }

    return result;
  }

  return value;
}

export function getAuditActor(user: any): AuditActor | null {
  if (!user) return null;
  return {
    id: user.id ?? null,
    nip: user.nip ?? null,
    nama: user.nama ?? null,
    role: user.role ?? null,
    kecamatan: user.kecamatan ?? null,
  };
}

export function buildAuditEntry(input: {
  pathname: string;
  method: string;
  requestBody?: any;
  responseData?: any;
  statusCode: number;
  actor?: AuditActor | null;
  userAgent?: string;
  ip?: string | null;
}): AuditEntry {
  const {
    pathname,
    method,
    requestBody,
    responseData,
    statusCode,
    actor,
    userAgent,
    ip,
  } = input;
  const info = describeAction(pathname, method, requestBody, responseData);
  const success = statusCode < 400 && responseData?.success !== false;

  return {
    actor,
    method,
    pathname,
    entity: info.entity,
    action: info.action,
    targetId: info.targetId,
    statusCode,
    success,
    summary: info.summary,
    requestBody: sanitizeAuditData(requestBody),
    responseData: sanitizeAuditData(pickResponseSummary(responseData)),
    userAgent,
    ip,
    timestamp: new Date().toISOString(),
  };
}

function pickResponseSummary(data: any) {
  if (!data || typeof data !== "object") return data;
  const source = data.data && typeof data.data === "object" ? data.data : data;
  const summary: Record<string, unknown> = {};
  for (const key of [
    "id",
    "status",
    "message",
    "title",
    "nama",
    "kategori",
    "slug",
  ]) {
    if (source[key] != null) summary[key] = source[key];
  }
  if (Object.keys(summary).length === 0 && data.message) {
    summary.message = data.message;
  }
  return summary;
}

function describeAction(
  pathname: string,
  method: string,
  body: any,
  responseData: any,
) {
  const cleanPath = pathname.replace(/^\/api\/admin\/?/, "");
  const segments = cleanPath.split("/").filter(Boolean);
  const entity = normalizeEntity(segments);
  const targetId = findTargetId(segments, responseData);
  const action = normalizeAction(method, segments);
  const summary = buildSummary({
    entity,
    action,
    targetId,
    body,
    responseData,
  });
  return { entity, targetId, action, summary };
}

function normalizeEntity(segments: string[]): string {
  if (segments[0] === "survei" && segments[1] === "questions")
    return "survei_question";
  if (segments[0] === "survei" && segments[1] === "responses")
    return "survei_response";
  return segments[0] ?? "unknown";
}

function findTargetId(
  segments: string[],
  responseData: any,
): string | number | null {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    if (
      seg &&
      seg !== "status" &&
      seg !== "bulk" &&
      !Number.isNaN(Number(seg))
    ) {
      return Number(seg);
    }
  }

  return (
    responseData?.data?.id ??
    responseData?.id ??
    responseData?.data?.insertId ??
    responseData?.insertId ??
    null
  );
}

function normalizeAction(method: string, segments: string[]): string {
  if (segments.includes("status")) return "update_status";
  if (segments.includes("bulk")) return "bulk_action";
  if (method === "POST") return "create";
  if (method === "DELETE") return "delete";
  if (method === "PUT" || method === "PATCH") return "update";
  return method.toLowerCase();
}

function buildSummary(input: {
  entity: string;
  action: string;
  targetId: string | number | null;
  body: any;
  responseData: any;
}): string {
  const { entity, action, targetId, body, responseData } = input;
  const label = entityLabel(entity);
  const resolvedId = targetId ?? body?.id ?? responseData?.data?.id ?? "-";

  if (action === "update_status") {
    const nextStatus =
      body?.status ?? body?.aktif ?? body?.published ?? body?.isPublished;
    if (entity === "permohonan") {
      return `mengubah status permohonan ${resolvedId} menjadi ${String(nextStatus ?? "-")}`;
    }
    if (entity === "berita") {
      return `mengubah status berita ${resolvedId} menjadi ${String(nextStatus ?? "-")}`;
    }
    return `mengubah status ${label} ${resolvedId} menjadi ${String(nextStatus ?? "-")}`;
  }

  if (action === "bulk_action") {
    const ids = Array.isArray(body?.ids)
      ? body.ids.slice(0, 10).join(", ")
      : "-";
    return `menjalankan aksi massal pada ${label}: ${ids}`;
  }

  if (action === "create") {
    return `menambahkan ${label} ${resolvedId}`;
  }

  if (action === "delete") {
    return `menghapus ${label} ${resolvedId}`;
  }

  return `memperbarui ${label} ${resolvedId}`;
}

function entityLabel(entity: string): string {
  const labels: Record<string, string> = {
    user: "user",
    berita: "berita",
    permohonan: "permohonan",
    pengaduan: "aduan",
    kategori: "kategori",
    layanan: "layanan",
    persyaratan: "persyaratan",
    regulasi: "regulasi",
    survei_question: "pertanyaan survei",
    survei_response: "respons survei",
  };

  return labels[entity] ?? entity;
}

export function writeAuditLog(entry: AuditEntry) {
  const actor = entry.actor?.nama ?? entry.actor?.nip ?? "unknown";
  const role = entry.actor?.role ?? "unknown";
  const outcome = entry.success ? "SUCCESS" : "FAILED";
  const ip = entry.ip ?? "unknown-ip";
  const userAgent = compactUserAgent(entry.userAgent);

  console.log(
    `[audit] ${outcome} | ${actor} (${role}) | ${entry.summary} | ${entry.pathname} | ip=${ip} | ua=${userAgent}`,
  );
}

function compactUserAgent(userAgent?: string) {
  if (!userAgent) return "unknown-agent";
  return userAgent.length > 160 ? `${userAgent.slice(0, 160)}…` : userAgent;
}
