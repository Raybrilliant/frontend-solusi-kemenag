// Cascade wilayah Indonesia (idn-area-data via /api/wilayah), dipakai bersama
// oleh FormPermohonan, FormRevisiPermohonan, dan AdminTamuManager.
// Default: Jawa Timur (35) & Kota Probolinggo (35.74).
// ponytail: state dalam satu objek $state agar bisa di-bind langsung (w.provinsi).

export type Area = { code: string; name: string };

const DEFAULT_PROVINSI = "35";
const DEFAULT_KOTA = "35.74";

export function createWilayah() {
    const w = $state({
        provinsi: DEFAULT_PROVINSI, // kode provinsi
        kota: DEFAULT_KOTA, // kode kota/kabupaten
        kecamatan: "", // nama kecamatan
        kelurahan: "", // nama kelurahan
        provincesList: [] as Area[],
        regenciesList: [] as Area[],
        districtsList: [] as Area[],
        villagesList: [] as string[],
        error: "",
    });

    async function fetchJson(url: string): Promise<any> {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    }

    async function loadProvinces() {
        try {
            w.provincesList = await fetchJson("/api/wilayah?level=provinces");
        } catch {
            w.error = "Gagal memuat data provinsi.";
        }
    }
    async function loadRegencies(provinceCode: string) {
        if (!provinceCode) {
            w.regenciesList = [];
            return;
        }
        try {
            w.regenciesList = await fetchJson(
                `/api/wilayah?level=regencies&provinceCode=${provinceCode}`,
            );
        } catch {
            w.error = "Gagal memuat data kota/kabupaten.";
        }
    }
    async function loadDistricts(regencyCode: string) {
        if (!regencyCode) {
            w.districtsList = [];
            return;
        }
        try {
            w.districtsList = await fetchJson(
                `/api/wilayah?level=districts&regencyCode=${regencyCode}`,
            );
        } catch {
            w.error = "Gagal memuat data kecamatan.";
        }
    }
    async function loadVillages(districtCode: string) {
        if (!districtCode) {
            w.villagesList = [];
            return;
        }
        try {
            const list: Area[] = await fetchJson(
                `/api/wilayah?level=villages&districtCode=${districtCode}`,
            );
            w.villagesList = list.map((v) => v.name);
        } catch {
            w.error = "Gagal memuat data kelurahan.";
        }
    }

    /** Muat initial list (provinsi semuanya + regency/district sesuai default). */
    async function init() {
        await loadProvinces();
        await loadRegencies(w.provinsi);
        await loadDistricts(w.kota);
    }

    function onProvinsiChange() {
        w.kota = "";
        w.kecamatan = "";
        w.kelurahan = "";
        w.regenciesList = [];
        w.districtsList = [];
        w.villagesList = [];
        loadRegencies(w.provinsi);
    }
    function onKotaChange() {
        w.kecamatan = "";
        w.kelurahan = "";
        w.villagesList = [];
        loadDistricts(w.kota);
    }
    function onKecamatanChange() {
        w.kelurahan = "";
        const d = w.districtsList.find((x) => x.name === w.kecamatan);
        if (d) loadVillages(d.code);
    }

    /**
     * Prefill dari data tersimpan (semua berupa NAMA wilayah, bisa kosong).
     * Menyelesaikan cascade: nama → kode → muat anak-anaknya.
     */
    async function setFromData(d: {
        provinsi?: string | null;
        kota?: string | null;
        kecamatan?: string | null;
        kelurahan?: string | null;
    }) {
        if (d.provinsi) {
            const p = w.provincesList.find((x) => x.name === d.provinsi);
            if (p) w.provinsi = p.code;
        }
        await loadRegencies(w.provinsi);
        if (d.kota) {
            const r = w.regenciesList.find((x) => x.name === d.kota);
            if (r) w.kota = r.code;
        }
        await loadDistricts(w.kota);
        if (d.kecamatan) {
            w.kecamatan = d.kecamatan;
            const dd = w.districtsList.find((x) => x.name === d.kecamatan);
            if (dd) await loadVillages(dd.code);
        }
        if (d.kelurahan) w.kelurahan = d.kelurahan;
    }

    /** Kembalikan ke default kantor (Jawa Timur / Kota Probolinggo). */
    async function reset() {
        w.provinsi = DEFAULT_PROVINSI;
        w.kota = DEFAULT_KOTA;
        w.kecamatan = "";
        w.kelurahan = "";
        w.error = "";
        await loadRegencies(w.provinsi);
        await loadDistricts(w.kota);
    }

    /** Nama wilayah terpilih (untuk dikirim ke backend, yang menyimpan nama). */
    function provinsiName(): string {
        return w.provincesList.find((p) => p.code === w.provinsi)?.name ?? "";
    }
    function kotaName(): string {
        return w.regenciesList.find((r) => r.code === w.kota)?.name ?? "";
    }

    return {
        w,
        init,
        onProvinsiChange,
        onKotaChange,
        onKecamatanChange,
        setFromData,
        reset,
        provinsiName,
        kotaName,
    };
}
