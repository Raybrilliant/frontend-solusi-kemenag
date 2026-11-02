import sanitizeHtml from "sanitize-html";

/**
 * Escape total untuk teks polos yang disisipkan ke HTML maupun atribut.
 * Dipakai di mana pun konten eksternal masuk ke markup.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  // Editor.js menyimpan formatting inline (bold/italic/link) langsung di
  // dalam teks. Hanya tag inline aman yang diizinkan — sisanya dibuang.
  allowedTags: [
    "b",
    "i",
    "em",
    "strong",
    "u",
    "s",
    "code",
    "br",
    "a",
    "sup",
    "sub",
    "mark",
  ],
  allowedAttributes: {
    a: ["href", "title"],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    }),
  },
  allowedSchemes: ["http", "https", "mailto"],
};

/**
 * Bersihkan teks berformat dari editor konten sebelum dirender sebagai HTML.
 * Konten berita ditulis humas/admin, tapi tetap disanitasi agar akun yang
 * dibobol tidak bisa menyuntik skrip ke halaman publik.
 */
export function sanitizeRichText(value: unknown): string {
  return sanitizeHtml(String(value ?? ""), RICH_TEXT_OPTIONS);
}
