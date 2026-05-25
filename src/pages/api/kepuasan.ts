import type { APIRoute } from 'astro';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-XnLQR2igFV_Mj5eJOaeye_nqvTavsBrQhK_OHvYPZ66-SCtbliSkQtmpiwQJ4MfSBKIfPrxdw0ip/pub?gid=1673183934&single=true&output=csv';

const QUARTERS = ['I', 'II', 'III', 'IV'];

type Category = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
const CATEGORIES: Category[] = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false, current = '';
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function detectRatingColumns(dataRows: string[][]): number[] {
  const SAMPLE = Math.min(10, dataRows.length);
  const colCount = Math.max(...dataRows.slice(0, SAMPLE).map(r => r.length));
  const results: number[] = [];

  for (let col = 0; col < colCount; col++) {
    let valid = 0, total = 0;
    for (let row = 0; row < SAMPLE; row++) {
      const raw = dataRows[row][col]?.replace(/"/g, '').trim();
      if (!raw) continue;
      total++;
      const val = parseInt(raw, 10);
      if (!isNaN(val) && val >= 1 && val <= 4 && String(val) === raw) valid++;
    }
    if (total > 0 && valid / total >= 0.5) results.push(col);
  }
  return results;
}

function parseDate(raw: string): Date | null {
  const s = raw.replace(/"/g, '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function classifyAvg(avg: number): Category {
  if (avg >= 3.5) return 'Sangat Baik';
  if (avg >= 2.5) return 'Baik';
  if (avg >= 1.5) return 'Cukup';
  return 'Kurang';
}

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text     = await res.text();
    const allLines = text.trim().split(/\r?\n/).filter(Boolean);
    if (allLines.length < 2) throw new Error('Spreadsheet kosong');

    const headers  = parseCsvLine(allLines[0]).map(h => h.trim().replace(/"/g, '').toLowerCase());
    const dataRows = allLines.slice(1).map(parseCsvLine);

    const tsIdx      = headers.findIndex(h => /timestamp/i.test(h));
    const ratingCols = detectRatingColumns(dataRows);
    if (ratingCols.length === 0) throw new Error('Tidak ada kolom penilaian (1-4) ditemukan');

    const counts: Record<Category, number> = {
      'Sangat Baik': 0, 'Baik': 0, 'Cukup': 0, 'Kurang': 0,
    };
    let total = 0, scoreSum = 0;
    let latestDate: Date | null = null;

    for (const row of dataRows) {
      const ratings = ratingCols
        .map(col => parseInt(row[col]?.replace(/"/g, '').trim() ?? '', 10))
        .filter(v => !isNaN(v) && v >= 1 && v <= 4);

      if (ratings.length === 0) continue;

      const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
      total++;
      scoreSum += avg;
      counts[classifyAvg(avg)]++;

      if (tsIdx >= 0 && row[tsIdx]) {
        const d = parseDate(row[tsIdx]);
        if (d && (!latestDate || d > latestDate)) latestDate = d;
      }
    }

    const score      = total > 0 ? Math.round((scoreSum / total) * 100) / 100 : 0;
    const positifPct = total > 0
      ? Math.round(((counts['Sangat Baik'] + counts['Baik']) / total) * 100)
      : 0;
    const periode = latestDate
      ? `Triwulan ${QUARTERS[Math.ceil((latestDate.getMonth() + 1) / 3) - 1]} ${latestDate.getFullYear()}`
      : '-';

    const breakdown = CATEGORIES.map(label => ({
      label,
      count: counts[label],
      pct:   total > 0 ? Math.round((counts[label] / total) * 100) : 0,
    }));

    return new Response(
      JSON.stringify({ success: true, data: { score, totalResponden: total, positifPct, periode, breakdown } }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
