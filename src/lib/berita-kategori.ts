// Palette: semua visible, tidak ada bg-ink gelap
const PALETTE = [
    { badge: "bg-green text-white",      accent: "bg-green" },
    { badge: "bg-yellow text-ink",       accent: "bg-yellow" },
    { badge: "bg-blue-500 text-white",   accent: "bg-blue-500" },
    { badge: "bg-purple-500 text-white", accent: "bg-purple-500" },
    { badge: "bg-orange-500 text-white", accent: "bg-orange-500" },
    { badge: "bg-pink-500 text-white",   accent: "bg-pink-500" },
    { badge: "bg-teal-500 text-white",   accent: "bg-teal-500" },
    { badge: "bg-rose-500 text-white",   accent: "bg-rose-500" },
    { badge: "bg-indigo-500 text-white", accent: "bg-indigo-500" },
    { badge: "bg-amber-400 text-ink",    accent: "bg-amber-400" },
    { badge: "bg-cyan-500 text-white",   accent: "bg-cyan-500" },
    { badge: "bg-lime-500 text-ink",     accent: "bg-lime-500" },
];

function hashStr(s: string): number {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return h;
}

export function categoryColor(cat: string): string {
    const idx = hashStr((cat ?? "").toLowerCase()) % PALETTE.length;
    return PALETTE[idx].badge;
}

export function categoryAccent(cat: string): string {
    const idx = hashStr((cat ?? "").toLowerCase()) % PALETTE.length;
    return PALETTE[idx].accent;
}
