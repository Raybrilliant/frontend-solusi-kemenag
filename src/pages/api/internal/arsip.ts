import type { APIRoute, AstroCookies } from "astro";
import { getUserFromToken } from "../../../lib/get-user";
import {
  DRIVE_FOLDER_ID,
  getIndex,
  isDriveConfigured,
  refreshIndex,
  searchDriveFiles,
  type DriveItem,
} from "../../../lib/google-drive";

const DEFAULT_LIMIT = 8;
const PAGE_SIZE = 20;

// Endpoint /api/* dilewati middleware auth, jadi sesi divalidasi di sini (fail-closed).
async function requireSession(
  cookies: AstroCookies,
  cookieHeader: string | null,
): Promise<boolean> {
  const token = cookies.get("auth_token")?.value;
  const user = await getUserFromToken(token, cookieHeader ?? undefined);
  return user !== null;
}

function buildStats(items: DriveItem[]) {
  const nowPrefix = new Date().toISOString().slice(0, 7);
  const countBy = (key: "format" | "jenisSurat") => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item[key], (map.get(item[key]) ?? 0) + 1);
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };

  return {
    total: items.length,
    bulanIni: items.filter(
      (item) => (item.createdTime ?? "").slice(0, 7) === nowPrefix,
    ).length,
    byFormat: countBy("format"),
    byJenisSurat: countBy("jenisSurat"),
  };
}

function filterCacheItems(
  items: DriveItem[],
  format: string,
  jenisSurat: string,
  from: string,
  to: string,
): DriveItem[] {
  return items.filter(
    (item) =>
      (!format || item.format === format) &&
      (!jenisSurat || item.jenisSurat === jenisSurat) &&
      (!from || (item.createdTime ?? "").slice(0, 10) >= from) &&
      (!to || (item.createdTime ?? "").slice(0, 10) <= to),
  );
}

export const GET: APIRoute = async ({ cookies, request, url }) => {
  if (!(await requireSession(cookies, request.headers.get("cookie")))) {
    return new Response(
      JSON.stringify({ success: false, message: "Tidak terautentikasi" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!isDriveConfigured()) {
    return new Response(
      JSON.stringify({
        success: false,
        configured: false,
        message:
          "Google Drive belum dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, dan GOOGLE_DRIVE_FOLDER_ID di .env lalu share folder Arsip Kemenag ke email service account.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const params = url.searchParams;
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const format = params.get("format") ?? "";
  const jenisSurat = params.get("jenis_surat") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const showAll = params.get("all") === "1";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageToken = params.get("page_token") ?? undefined;

  try {
    // refresh=1 → paksa crawl ulang index (bypass cache).
    const index = params.get("refresh") === "1"
      ? await refreshIndex()
      : await getIndex();

    const meta = {
      success: true as const,
      folderName: "Arsip Kemenag",
      folderId: DRIVE_FOLDER_ID,
      stats: buildStats(index.items),
      showAll,
      page,
    };

    // ── Live search: keyword diteruskan ke Drive API ───────────
    // Search + pagination native (pageToken), hanya 1 halaman ditarik.
    if (q) {
      const folderId = jenisSurat
        ? index.folders.find((f) => f.name === jenisSurat)?.id
        : undefined;
      const search = await searchDriveFiles({
        terms: q.split(/\s+/),
        folderId,
        from,
        to,
        format,
        pageSize: showAll ? PAGE_SIZE : DEFAULT_LIMIT,
        pageToken,
      });

      return new Response(
        JSON.stringify({
          ...meta,
          data: search.items,
          nextPageToken: search.nextPageToken,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // ── Cache path: filter & paginasi dari index ───────────────
    const filtered = filterCacheItems(index.items, format, jenisSurat, from, to);
    let data: DriveItem[];
    let pageInfo: Record<string, number> = {};

    if (showAll) {
      const start = (page - 1) * PAGE_SIZE;
      data = filtered.slice(start, start + PAGE_SIZE);
      pageInfo = {
        pageSize: PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
        totalFiltered: filtered.length,
      };
    } else {
      data = filtered.slice(0, DEFAULT_LIMIT);
      pageInfo = { totalFiltered: filtered.length };
    }

    return new Response(JSON.stringify({ ...meta, data, ...pageInfo }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        message: `Gagal mengambil data Drive: ${(e as Error).message}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
};
