import type { APIRoute } from "astro";
import {
    getProvinces,
    getRegencies,
    getDistricts,
    getVillages,
} from "idn-area-data";

// idn-area-data is Node-only (fs.createReadStream), so it must live server-side.
// ponytail: parse each CSV once, group by parent code for O(1) lookups.
// Ceiling: villages map holds ~83k entries in memory (~15MB); fine for a low-traffic form server.
type Area = { code: string; name: string };
type Regency = Area & { provinceCode: string };
type District = Area & { regencyCode: string };
type Village = Area & { districtCode: string };

function groupBy<T>(arr: T[], key: (t: T) => string): Map<string, T[]> {
    const m = new Map<string, T[]>();
    for (const it of arr) {
        const k = key(it);
        const bucket = m.get(k);
        if (bucket) bucket.push(it);
        else m.set(k, [it]);
    }
    return m;
}

let provincesCache: Promise<Area[]> | null = null;
let regencyMapCache: Promise<Map<string, Regency[]>> | null = null;
let districtMapCache: Promise<Map<string, District[]>> | null = null;
let villageMapCache: Promise<Map<string, Village[]>> | null = null;

const provinces = () => (provincesCache ??= getProvinces() as Promise<Area[]>);
const regencyMap = () =>
    (regencyMapCache ??= getRegencies({ transform: true }).then((a) =>
        groupBy(a, (r) => r.provinceCode),
    ));
const districtMap = () =>
    (districtMapCache ??= getDistricts({ transform: true }).then((a) =>
        groupBy(a, (d) => d.regencyCode),
    ));
const villageMap = () =>
    (villageMapCache ??= getVillages({ transform: true }).then((a) =>
        groupBy(a, (v) => v.districtCode),
    ));

const CACHE = "public, max-age=86400";

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": CACHE },
    });
}

export const GET: APIRoute = async ({ url }) => {
    const q = url.searchParams;
    const level = q.get("level");
    try {
        switch (level) {
            case "provinces":
                return json(await provinces());
            case "regencies": {
                const provinceCode = q.get("provinceCode");
                const all = provinceCode
                    ? (await regencyMap()).get(provinceCode) ?? []
                    : Array.from((await regencyMap()).values()).flat();
                return json(all);
            }
            case "districts": {
                const regencyCode = q.get("regencyCode");
                if (!regencyCode) return json([]);
                return json((await districtMap()).get(regencyCode) ?? []);
            }
            case "villages": {
                const districtCode = q.get("districtCode");
                if (!districtCode) return json([]);
                return json((await villageMap()).get(districtCode) ?? []);
            }
            default:
                return json({ success: false, message: "level tidak valid" }, 400);
        }
    } catch (e) {
        return json(
            { success: false, message: e instanceof Error ? e.message : String(e) },
            500,
        );
    }
};
