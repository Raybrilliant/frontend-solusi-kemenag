import type { APIRoute } from "astro";

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
    "/portal/prestasi-siswa",
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

  try {
    const [beritaRes, layananRes, prestasiRes, agenRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/berita/?limit=500`),
      fetch(`${BACKEND_URL}/api/v1/layanan/`),
      fetch(`${BACKEND_URL}/api/v1/prestasi-siswa/?limit=500`),
      fetch(`${BACKEND_URL}/api/v1/agen-perubahan/?limit=500`),
    ]);

    if (beritaRes.ok) {
      const beritaJson = await beritaRes.json();
      for (const item of beritaJson?.data ?? []) {
        if (!item?.slug) continue;
        const lastmod =
          item.updatedAt ?? item.publishedAt ?? item.createdAt ?? undefined;
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

    if (prestasiRes.ok) {
      const prestasiJson = await prestasiRes.json();
      for (const item of prestasiJson?.data ?? []) {
        if (!item?.id) continue;
        const lastmod =
          item.updatedAt ?? item.updated_at ?? item.createdAt ?? undefined;
        urls.set(absoluteUrl(`/portal/prestasi-siswa/${item.id}`), lastmod);
      }
    }

    if (agenRes.ok) {
      const agenJson = await agenRes.json();
      for (const item of agenJson?.data ?? []) {
        if (!item?.id) continue;
        urls.set(absoluteUrl(`/portal/agen-perubahan/${item.id}`), undefined);
      }
    }
  } catch {
    // Fail softly: keep sitemap available with static URLs.
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(
    urls.entries(),
  )
    .map(([loc, lastmod]) => `  ${urlEntry(loc, lastmod)}`)
    .join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
