import { uploadFilenameFromUrl } from "./upload-url";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export function collectUploadFilenames(value: unknown): string[] {
  const filenames = new Set<string>();

  function visit(node: unknown) {
    const filename = uploadFilenameFromUrl(node);
    if (filename) {
      filenames.add(filename);
      return;
    }

    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    for (const item of Object.values(node as Record<string, unknown>)) {
      visit(item);
    }
  }

  visit(value);
  return [...filenames];
}

export async function deleteUploadedFiles(
  filenames: string[],
  headers: Record<string, string> = {},
) {
  const uniqueFilenames = [...new Set(filenames)].filter(Boolean);

  const results = await Promise.allSettled(
    uniqueFilenames.map(async (filename) => {
      const res = await fetch(
        `${BACKEND_URL}/api/v1/upload/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
          headers,
        },
      );

      return {
        filename,
        ok: res.ok || res.status === 404,
        status: res.status,
      };
    }),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    return {
      filename: uniqueFilenames[index],
      ok: false,
      status: 0,
    };
  });
}
