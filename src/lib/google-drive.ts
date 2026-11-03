/**
 * Google Drive API client (server-side, tanpa dependency tambahan).
 *
 * Auth: Service Account — JWT RS256 ditukar dengan OAuth2 access token,
 * token di-cache in-memory sampai mendekati kedaluwarsa.
 * Listing: traversal rekursif dari folder "Arsip Kemenag" (maks. 3 level
 * subfolder), hasil di-cache 5 menit agar search/filter tidak menembus
 * API Drive pada setiap ketikan.
 *
 * Env yang dibutuhkan:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL — email service account
 *   GOOGLE_PRIVATE_KEY           — private key (format PEM, \n aman)
 *   GOOGLE_DRIVE_FOLDER_ID       — ID folder "Arsip Kemenag" di Drive
 * Folder harus di-share (Viewer) ke email service account.
 */
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const MAX_DEPTH = 3;
const CACHE_TTL_MS = 60 * 1000;

// Env baca runtime (process.env, untuk Docker/production) dulu, lalu fallback ke
// import.meta.env — Astro dev TIDAK memasukkan isi .env ke process.env.
const env = (key: string): string =>
  process.env[key] ?? import.meta.env[key] ?? "";

const CLIENT_EMAIL = env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const PRIVATE_KEY = env("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
// Bersihkan ID dari sisa parameter URL (mis. "...?hl=ID" hasil copy link browser).
export const DRIVE_FOLDER_ID = env("GOOGLE_DRIVE_FOLDER_ID").split("?")[0].trim();

export function isDriveConfigured(): boolean {
  return Boolean(CLIENT_EMAIL && PRIVATE_KEY && DRIVE_FOLDER_ID);
}

// ── OAuth2 token via JWT assertion ───────────────────────────────

let tokenCache: { token: string; expiresAt: number } | null = null;

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: CLIENT_EMAIL,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(PRIVATE_KEY).toString("base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Google OAuth gagal (HTTP ${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

// ── Listing rekursif ─────────────────────────────────────────────

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  size: string | null;
  createdTime: string | null;
  jenisSurat: string;
  format: string;
}

interface DriveFileRaw {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
}

export function deriveFormat(mimeType: string, name: string): string {
  const mt = mimeType.toLowerCase();
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (mt.includes("pdf") || ext === "pdf") return "PDF";
  if (
    mt.includes("word") ||
    mt.includes("officedocument.wordprocessingml") ||
    ["doc", "docx", "rtf", "odt"].includes(ext)
  )
    return "Word";
  if (
    mt.includes("spreadsheet") ||
    mt.includes("excel") ||
    ["xls", "xlsx", "csv", "ods"].includes(ext)
  )
    return "Excel";
  if (
    mt.includes("presentation") ||
    mt.includes("powerpoint") ||
    ["ppt", "pptx", "odp"].includes(ext)
  )
    return "PowerPoint";
  if (mt.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return "Gambar";
  return "Lainnya";
}

async function listChildren(
  folderId: string,
  accessToken: string,
): Promise<{ files: DriveFileRaw[] }> {
  const files: DriveFileRaw[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: "1000",
      fields:
        "nextPageToken, files(id,name,mimeType,webViewLink,size,createdTime)",
      orderBy: "createdTime desc",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${FILES_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Drive API gagal (HTTP ${res.status}): ${text.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as {
      files?: DriveFileRaw[];
      nextPageToken?: string;
    };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { files };
}

async function collectItems(
  folderId: string,
  jenisSurat: string,
  depth: number,
  accessToken: string,
  out: DriveItem[],
): Promise<void> {
  if (depth > MAX_DEPTH) return;

  const { files } = await listChildren(folderId, accessToken);
  for (const f of files) {
    if (f.mimeType === "application/vnd.google-apps.folder") {
      await collectItems(f.id, f.name, depth + 1, accessToken, out);
    } else {
      out.push({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        webViewLink: f.webViewLink ?? null,
        size: f.size ?? null,
        createdTime: f.createdTime ?? null,
        jenisSurat,
        format: deriveFormat(f.mimeType, f.name),
      });
    }
  }
}

let listCache: { items: DriveItem[]; fetchedAt: number } | null = null;
let inflight: Promise<DriveItem[]> | null = null;

export function clearListCache(): void {
  listCache = null;
}

export async function listArsipFiles(): Promise<DriveItem[]> {
  if (listCache && Date.now() - listCache.fetchedAt < CACHE_TTL_MS) {
    return listCache.items;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const accessToken = await getAccessToken();
    const items: DriveItem[] = [];
    await collectItems(DRIVE_FOLDER_ID, "Umum", 0, accessToken, items);
    items.sort(
      (a, b) =>
        (b.createdTime ?? "").localeCompare(a.createdTime ?? "") ||
        a.name.localeCompare(b.name),
    );
    listCache = { items, fetchedAt: Date.now() };
    return items;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
