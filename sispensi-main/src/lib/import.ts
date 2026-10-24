/**
 * Helper impor spreadsheet (Excel .xlsx / .csv) untuk fitur Data Master.
 * Mengembalikan baris sebagai objek { header(lowercase): nilai } dari sheet pertama.
 */

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text.trim();
    if (typeof o.result === "string" || typeof o.result === "number") {
      return String(o.result).trim();
    }
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[])
        .map((r) => r.text ?? "")
        .join("")
        .trim();
    }
    if (typeof o.hyperlink === "string") return o.hyperlink.trim();
  }
  return String(v).trim();
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuote = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Ambil nilai pertama yang tidak kosong dari sekumpulan nama kolom (alias). */
export function pickField(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

/** Parse file .csv atau .xlsx menjadi daftar baris (objek header->nilai). */
export async function parseSheet(
  file: File,
): Promise<Record<string, string>[]> {
  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = new TextDecoder().decode(buf);
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) return [];
    const headers = splitCsv(lines[0]).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cols = splitCsv(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (cols[i] ?? "").trim();
      });
      return obj;
    });
  }

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    headers[col] = cellText(cell.value).toLowerCase();
  });

  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    let any = false;
    row.eachCell((cell, col) => {
      const h = headers[col];
      if (!h) return;
      const val = cellText(cell.value);
      obj[h] = val;
      if (val) any = true;
    });
    if (any) rows.push(obj);
  });
  return rows;
}
