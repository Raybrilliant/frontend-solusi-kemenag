/**
 * Google Drive API client (server-side, tanpa dependency tambahan).
 *
 * Auth: Service Account — JWT RS256 ditukar dengan OAuth2 access token,
 * token di-cache in-memory sampai mendekati kedaluwarsa.
 *
 * Dua jalur data:
 *  1. Index (crawl paralel seluruh tree, cache 10 menit, stale-while-revalidate,
 *     pre-warm saat module load) — untuk statistik, daftar jenis surat, dan
 *     tampilan tanpa keyword. Load awal tidak menunggu crawl ulang.
 *  2. Live search (searchDriveFiles) — keyword diteruskan ke Drive API sebagai
 *     `name contains` dengan pagination native pageToken; hanya 1 halaman yang
 *     ditarik per request. Hasil dijaga tetap dalam tree Arsip (tree-guard
 *     memakai folder id set dari index).
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
const INDEX_TTL_MS = 10 * 60 * 1000;

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

// ── Tipe & util ──────────────────────────────────────────────────

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
  parents?: string[];
}

interface FolderInfo {
  id: string;
  name: string;
}

export interface DriveIndex {
  items: DriveItem[];
  folders: FolderInfo[];
  folderNameById: Map<string, string>;
  folderIds: Set<string>;
  crawledAt: number;
}

function toDriveItem(
  f: DriveFileRaw,
  jenisSurat: string,
  folderNameById: Map<string, string>,
): DriveItem {
  const parent = f.parents?.[0];
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink ?? null,
    size: f.size ?? null,
    createdTime: f.createdTime ?? null,
    jenisSurat: (parent && folderNameById.get(parent)) ?? jenisSurat,
    format: deriveFormat(f.mimeType, f.name),
  };
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
): Promise<DriveFileRaw[]> {
  const files: DriveFileRaw[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: "1000",
      fields:
        "nextPageToken, files(id,name,mimeType,webViewLink,size,createdTime,parents)",
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

  return files;
}

// ── Index: crawl paralel seluruh tree ────────────────────────────

interface CrawlOut {
  items: DriveItem[];
  folders: FolderInfo[];
}

async function crawlFolder(
  folderId: string,
  jenisSurat: string,
  depth: number,
  accessToken: string,
  out: CrawlOut,
  folderNameById: Map<string, string>,
): Promise<void> {
  if (depth > MAX_DEPTH) return;

  const children = await listChildren(folderId, accessToken);
  const subfolders = children.filter(
    (f) => f.mimeType === "application/vnd.google-apps.folder",
  );

  for (const f of children) {
    if (f.mimeType === "application/vnd.google-apps.folder") {
      out.folders.push({ id: f.id, name: f.name });
      folderNameById.set(f.id, f.name);
    } else {
      out.items.push(toDriveItem(f, jenisSurat, folderNameById));
    }
  }

  // Crawl subfolder secara paralel, bukan berurutan.
  await Promise.all(
    subfolders.map((sf) =>
      crawlFolder(sf.id, sf.name, depth + 1, accessToken, out, folderNameById),
    ),
  );
}

async function buildIndex(): Promise<DriveIndex> {
  const accessToken = await getAccessToken();
  const out: CrawlOut = { items: [], folders: [] };
  const folderNameById = new Map<string, string>();

  await crawlFolder(DRIVE_FOLDER_ID, "Umum", 0, accessToken, out, folderNameById);

  out.items.sort(
    (a, b) =>
      (b.createdTime ?? "").localeCompare(a.createdTime ?? "") ||
      a.name.localeCompare(b.name),
  );

  return {
    items: out.items,
    folders: out.folders,
    folderNameById,
    folderIds: new Set([DRIVE_FOLDER_ID, ...out.folders.map((f) => f.id)]),
    crawledAt: Date.now(),
  };
}

let indexCache: DriveIndex | null = null;
let inflight: Promise<DriveIndex> | null = null;

export async function getIndex(): Promise<DriveIndex> {
  if (indexCache && Date.now() - indexCache.crawledAt < INDEX_TTL_MS) {
    return indexCache;
  }

  // Cache belum ada → crawl harus selesai dulu (blocking).
  if (!indexCache) {
    inflight ??= buildIndex().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  // Cache kedaluwarsa → sajikan data stale seketika, refresh di background.
  inflight ??= buildIndex()
    .then((idx) => {
      indexCache = idx;
      return idx;
    })
    .finally(() => {
      inflight = null;
    });
  inflight.catch(() => {});
  return indexCache;
}

export async function refreshIndex(): Promise<DriveIndex> {
  indexCache = null;
  const idx = await buildIndex();
  indexCache = idx;
  return idx;
}

// Pre-warm: crawl saat module pertama kali dimuat, tidak menunggu request.
if (isDriveConfigured()) {
  getIndex().catch(() => {});
}

// ── Live search (server-side via Drive API) ──────────────────────

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export interface SearchOpts {
  terms: string[];
  folderId?: string;
  from?: string;
  to?: string;
  format?: string;
  pageSize: number;
  pageToken?: string;
}

export interface SearchResult {
  items: DriveItem[];
  nextPageToken: string | null;
}

export async function searchDriveFiles(
  opts: SearchOpts,
): Promise<SearchResult> {
  const index = await getIndex();

  const clauses: string[] = [
    "trashed = false",
    "mimeType != 'application/vnd.google-apps.folder'",
  ];
  for (const term of opts.terms) {
    clauses.push(`name contains '${escapeDriveQuery(term)}'`);
  }
  if (opts.folderId) clauses.push(`'${opts.folderId}' in parents`);
  if (opts.from) clauses.push(`createdTime >= '${opts.from}T00:00:00'`);
  if (opts.to) clauses.push(`createdTime <= '${opts.to}T23:59:59'`);
  // Filter format yang bisa diterjemahkan Drive-native; sisanya difilter pasca-query.
  if (opts.format === "PDF") clauses.push("mimeType = 'application/pdf'");

  const params = new URLSearchParams({
    q: clauses.join(" and "),
    orderBy: "createdTime desc",
    pageSize: String(opts.pageSize),
    fields:
      "nextPageToken, files(id,name,mimeType,webViewLink,size,createdTime,parents)",
  });
  if (opts.pageToken) params.set("pageToken", opts.pageToken);

  const res = await fetch(`${FILES_URL}?${params}`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
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

  // Tree-guard: buang file di luar arbor Arsip Kemenag (mis. file lain yang
  // ke-share ke service account), lalu anotasi jenis surat dari nama folder induk.
  let items = (data.files ?? [])
    .filter((f) => (f.parents ?? []).some((p) => index.folderIds.has(p)))
    .map((f) => toDriveItem(f, "Umum", index.folderNameById));

  if (opts.format && opts.format !== "PDF") {
    items = items.filter((it) => it.format === opts.format);
  }

  return { items, nextPageToken: data.nextPageToken ?? null };
}
