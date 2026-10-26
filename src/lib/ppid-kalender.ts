// Konfigurasi kategori Kalender Kegiatan PPID: label tampilan, deskripsi,
// dan header kolom per kategori (mengikuti format dokumen sumber).
export type KalenderKategoriId =
    | "anggaran-kinerja"
    | "layanan-keagamaan"
    | "pendidikan"
    | "agenda-rutin"
    | "agenda-tertentu";

export type KalenderKolomId = "periode" | "kegiatan" | "pihak" | "keluaran";

export type KalenderKategoriConfig = {
    id: KalenderKategoriId;
    label: string;
    desc: string;
    kolom: { id: KalenderKolomId; label: string }[];
};

export const kalenderKategori: KalenderKategoriConfig[] = [
    {
        id: "anggaran-kinerja",
        label: "Perencanaan, Keuangan & Kinerja",
        desc: "Jadwal kegiatan perencanaan, administrasi keuangan, dan pengelolaan kinerja sepanjang tahun.",
        kolom: [
            { id: "periode", label: "Periode" },
            { id: "kegiatan", label: "Kegiatan terperinci" },
            { id: "keluaran", label: "Dokumen/eviden" },
        ],
    },
    {
        id: "layanan-keagamaan",
        label: "Layanan Keagamaan",
        desc: "Jadwal program dan kegiatan layanan keagamaan beserta target keluarannya.",
        kolom: [
            { id: "periode", label: "Periode" },
            { id: "kegiatan", label: "Kegiatan terperinci" },
            { id: "keluaran", label: "Dokumen/eviden" },
        ],
    },
    {
        id: "pendidikan",
        label: "Pendidikan",
        desc: "Jadwal program dan kegiatan pendidikan madrasah sesuai kalender pendidikan.",
        kolom: [
            { id: "periode", label: "Periode" },
            { id: "kegiatan", label: "Kegiatan terperinci" },
            { id: "keluaran", label: "Dokumen/eviden" },
        ],
    },
    {
        id: "agenda-rutin",
        label: "Agenda Rutin Bulanan",
        desc: "Agenda rutin mingguan dan bulanan beserta penanggung jawab utamanya.",
        kolom: [
            { id: "periode", label: "Waktu" },
            { id: "kegiatan", label: "Agenda" },
            { id: "pihak", label: "Penanggung jawab utama" },
        ],
    },
    {
        id: "agenda-tertentu",
        label: "Agenda Tanggal Tertentu",
        desc: "Kegiatan pada tanggal atau periode tertentu beserta satker terkait dan keluarannya.",
        kolom: [
            { id: "periode", label: "Tanggal/periode" },
            { id: "kegiatan", label: "Kegiatan" },
            { id: "pihak", label: "Satker/unsur terkait" },
            { id: "keluaran", label: "Keluaran" },
        ],
    },
];

export type KalenderKegiatan = {
    id: number;
    kategori: string;
    periode: string;
    kegiatan: string;
    pihak: string | null;
    keluaran: string | null;
    aktif: boolean;
    urutan: number;
};

export function kategoriConfig(id: string): KalenderKategoriConfig | undefined {
    return kalenderKategori.find((k) => k.id === id);
}

export function nilaiKolom(
    row: KalenderKegiatan,
    kolom: KalenderKolomId,
): string {
    if (kolom === "periode") return row.periode;
    if (kolom === "kegiatan") return row.kegiatan;
    if (kolom === "pihak") return row.pihak ?? "";
    return row.keluaran ?? "";
}

// ─── Parser periode → tanggal untuk kalender bulanan ─────────────

export type KalenderTanggal = {
    /** null = periodik (berlaku setiap tahun) */
    year: number | null;
    /** null = setiap bulan (mis. "minggu pertama setiap bulan") */
    month: number | null;
    /** null = sepanjang bulan (dot kalender di tanggal 1) */
    day: number | null;
};

const BULAN_IDX = [
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
];

const mMingguDay = { pertama: 1, kedua: 8, ketiga: 15, keempat: 22 };

/**
 * Mengubah teks periode menjadi daftar tanggal yang dipahami kalender.
 * Mendukung: "7 Oktober 2026", "16–17 Oktober 2026", "Oktober 2026",
 * "Oktober–November 2026", "Januari–Februari" (periodik tahunan),
 * "Minggu pertama setiap bulan" (→ tgl 1/8/15/22), "Akhir Maret" (→ tgl 25).
 */
export function tanggalPeriode(periode: string): KalenderTanggal[] {
    const s = periode
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    const thMatch = s.match(/(\d{4})/);
    const tahun = thMatch ? Number(thMatch[1]) : null;

    // Tanggal spesifik: "7 oktober 2026" / "16-17 oktober 2026"
    const mTanggal = s.match(
        /(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([a-z]+)(?:\s+(\d{4}))?/,
    );
    if (mTanggal) {
        const mi = BULAN_IDX.indexOf(mTanggal[3]);
        if (mi >= 0) {
            const y = mTanggal[4] ? Number(mTanggal[4]) : tahun;
            const d1 = Number(mTanggal[1]);
            const d2 = mTanggal[2] ? Number(mTanggal[2]) : d1;
            const out: KalenderTanggal[] = [];
            for (let d = d1; d <= d2 && d - d1 < 10; d++) {
                out.push({ year: y, month: mi, day: d });
            }
            return out;
        }
    }

    // Minggu ke-N setiap bulan → tanggal 1/8/15/22
    const mMinggu = s.match(/minggu\s+(pertama|kedua|ketiga|keempat)/);
    if (mMinggu) {
        const day = { pertama: 1, kedua: 8, ketiga: 15, keempat: 22 }[
            mMinggu[1] as keyof typeof mMingguDay
        ];
        return [{ year: null, month: null, day }];
    }

    // "Akhir <bulan>" → tanggal 25 (awal minggu terakhir)
    const mAkhir = s.match(/akhir\s+([a-z]+)/);
    if (mAkhir) {
        const mi = BULAN_IDX.indexOf(mAkhir[1]);
        if (mi >= 0) return [{ year: tahun, month: mi, day: 25 }];
    }

    // Rentang bulan: "oktober-november 2026" / "januari-februari"
    const bulanIdx: number[] = [];
    for (const part of s.split("-")) {
        const found = BULAN_IDX.findIndex((b) => part.includes(b));
        if (found >= 0) bulanIdx.push(found);
    }
    if (bulanIdx.length > 0) {
        const out: KalenderTanggal[] = [];
        for (let m = bulanIdx[0]; m <= bulanIdx[bulanIdx.length - 1]; m++) {
            out.push({ year: tahun, month: m, day: null });
        }
        return out;
    }

    return [];
}

/** Warna dot/chip per kategori untuk kalender. */
export const kategoriWarna: Record<string, { dot: string; chip: string }> = {
    "anggaran-kinerja": { dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700" },
    "layanan-keagamaan": {
        dot: "bg-teal-500",
        chip: "bg-teal-100 text-teal-700",
    },
    pendidikan: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700" },
    "agenda-rutin": {
        dot: "bg-violet-500",
        chip: "bg-violet-100 text-violet-700",
    },
    "agenda-tertentu": { dot: "bg-rose-500", chip: "bg-rose-100 text-rose-700" },
};
