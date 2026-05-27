export function toUploadProxyUrl(
  url: string | null | undefined,
  fallbackName: string | null | undefined = null,
): string {
  const source = url || fallbackName;
  if (!source) return "";

  if (source.startsWith("data:") || source.startsWith("blob:")) return source;
  if (source.startsWith("/api/upload/")) return source;

  const clean = source.split("?")[0]?.split("#")[0] ?? "";
  const isHttpUrl = /^https?:\/\//i.test(clean);
  const shouldProxy =
    clean.includes("/api/v1/upload/") ||
    clean.startsWith("/upload/") ||
    clean.startsWith("upload/") ||
    (!isHttpUrl && !clean.startsWith("/"));

  if (!shouldProxy) return source;

  let pathname = clean;
  try {
    pathname = new URL(clean, "http://upload.local").pathname;
  } catch {
    pathname = clean;
  }

  const filename = pathname.split("/").filter(Boolean).at(-1);
  return filename ? `/api/upload/${encodeURIComponent(decodeURIComponent(filename))}` : "";
}

export function uploadFilenameFromUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const proxyUrl = toUploadProxyUrl(value);
  if (!proxyUrl.startsWith("/api/upload/")) return null;

  const filename = proxyUrl.split("/").filter(Boolean).at(-1);
  return filename ? decodeURIComponent(filename) : null;
}
