import type { APIRoute } from "astro";
import { agenPerubahan } from "../lib/data.js";

const SITE_URL = "https://kemenagkotaprobolinggo.id";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).href;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod?: string) {
  return `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}</url>`;
}

export const GET: APIRoute = async () => {
  const staticRoutes = [
    "/",
    "/portal",
    "/portal/berita",
    "/portal/regulasi",
    "/portal/profil",
    "/portal/ppid",
    "/portal/statistik",
    "/portal/kua",
    "/portal/madrasah",
    "/portal/agen-perubahan",
    "/information",
    "/pengaduan",
    "/check-progress",
    "/survei",
    "/zona-integritas",
  ];

  const urls = new Map<string, string | undefined>();
  for (const route of staticRoutes) {
    urls.set(absoluteUrl(route), undefined);
  }

  for (const agent of agenPerubahan) {
    urls.set(absoluteUrl(`/portal/agen-perubahan/${agent.id}/`), undefined);
  }

  try {
    const [beritaRes, layananRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/berita/?limit=500`),
      fetch(`${BACKEND_URL}/api/v1/layanan/`),
    ]);

    if (beritaRes.ok) {
      const beritaJson = await beritaRes.json();
      for (const item of beritaJson?.data ?? []) {
        if (!item?.slug) continue;
        const lastmod = item.updatedAt ?? item.publishedAt ?? item.createdAt ?? undefined;
        urls.set(absoluteUrl(`/portal/berita/${item.slug}`), lastmod);
      }
    }

    if (layananRes.ok) {
      const layananJson = await layananRes.json();
      for (const item of layananJson?.data ?? []) {
        if (!item?.id) continue;
        urls.set(absoluteUrl(`/sublayanan/${item.id}`), undefined);
      }
    }
  } catch {
    // Fail softly: keep sitemap available with static URLs.
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(urls.entries())
    .map(([loc, lastmod]) => `  ${urlEntry(loc, lastmod)}`)
    .join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
