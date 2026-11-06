import "server-only";

import { downloadResponse } from "@/lib/download";

/**
 * A real Excel workbook (.xlsx) for the list exports, with no dependency: one sheet, a bold header row that stays
 * put when you scroll (frozen), numbers kept as numbers (so sums and sorting work), text as inline strings, and
 * column widths fitted to the content. An .xlsx is a ZIP of a few XML files; this writes them "stored" (no
 * compression) — every spreadsheet app opens it. Text that starts like a formula (= + - @) is written as plain
 * text, never evaluated.
 */
/** A cell: text, a number, or an amount (`{ amount }`: a number shown with 2 decimals, e.g. 127.60). */
export type XlsxCell = string | number | { amount: number } | null | undefined;

export function toXlsx(headers: string[], rows: XlsxCell[][], sheetName = "Export"): Uint8Array {
  const all = [headers, ...rows];
  const widths = headers.map((_, c) => Math.min(60, Math.max(8, ...all.map((r) => cellText(r[c]).length + 2))));
  const sheetRows = all
    .map((r, i) => {
      const cells = r
        .map((v, c) => {
          const ref = `${col(c)}${i + 1}`;
          const style = i === 0 ? ' s="1"' : "";
          if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
          if (v && typeof v === "object") return `<c r="${ref}" s="2"><v>${v.amount}</v></c>`;
          const text = String(v ?? "");
          return text === "" ? "" : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${i + 1}">${cells}</row>`;
    })
    .join("");

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${sheetRows}</sheetData>` +
    (rows.length ? `<autoFilter ref="A1:${col(headers.length - 1)}${rows.length + 1}"/>` : "") +
    `</worksheet>`;

  const name = esc(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Export");
  const files: [string, string][] = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
        (rows.length
          ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${name.replace(/'/g, "''")}'!$A$1:$${col(headers.length - 1)}$${rows.length + 1}</definedName></definedNames>`
          : "") +
        `</workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>` +
        `</styleSheet>`,
    ],
    ["xl/worksheets/sheet1.xml", sheet],
  ];
  return zip(files.map(([n, s]) => [n, new TextEncoder().encode(s)]));
}

/** How a cell reads (for column widths). */
const cellText = (v: XlsxCell) => (v && typeof v === "object" ? v.amount.toFixed(2) : String(v ?? ""));

/** Column letters: 0 → A, 25 → Z, 26 → AA. */
function col(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** XML-escape, drop characters XML can't hold, and keep formula-looking text as text (leading apostrophe-free). */
function esc(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Minimal ZIP writer (stored entries) ───────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(entries: [string, Uint8Array][]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const fileName = new TextEncoder().encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, fileName.length, true);
    parts.push(new Uint8Array(local.buffer), fileName, data);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, fileName.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), fileName);
    offset += 30 + fileName.length + data.length;
  }
  const dirSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, dirSize, true);
  end.setUint32(16, offset, true);
  const out = new Uint8Array(offset + dirSize + 22);
  let at = 0;
  for (const p of [...parts, ...central, new Uint8Array(end.buffer)]) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ── From the exports' CSV ─────────────────────────────────────────────────────

/** Parses the exports' own CSV (lib/csv toCsv: BOM, every cell quoted, "" for a quote, CRLF rows). */
function parseCsv(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'; // "" inside quotes is one quote
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * One CSV cell → an Excel cell: plain numbers ("12.34", "-3", "7") become numbers; codes with leading zeros and
 * phone-length digit runs stay text; the CSV's formula guard (a leading ' before = + - @) is dropped — an Excel text cell is never run.
 */
function cellOf(s: string): XlsxCell {
  // Money (exactly 2 decimals, as csvDollars writes it) shows as 127.60; other amounts and counts become numbers;
  // long digit runs (phones, long codes: 9+ digits, no decimals) stay text.
  if (/^-?(0|[1-9]\d{0,14})\.\d\d$/.test(s)) return { amount: Number(s) };
  if (/^-?(0|[1-9]\d{0,7})(\.\d+)?$/.test(s) || /^-?(0|[1-9]\d{0,14})\.\d+$/.test(s)) return Number(s);
  return /^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s;
}

/** The same table as the export's CSV, as an Excel workbook (header row = the CSV's first line). */
export function csvToXlsx(csv: string, sheetName?: string): Uint8Array {
  const [head = [], ...rows] = parseCsv(csv);
  return toXlsx(
    head,
    rows.map((r) => r.map(cellOf)),
    sheetName,
  );
}

/** ?format= of an export route: "pdf", "xlsx" or (default) "csv". */
export const exportFormat = (v: string | null) => (v === "pdf" ? "pdf" : v === "xlsx" ? "xlsx" : "csv");

/** A list export as CSV or Excel — the same rows either way, built once as CSV by the route. */
export function tableDownload(csv: string, name: string, format: "csv" | "xlsx"): Response {
  return format === "xlsx"
    ? downloadResponse(csvToXlsx(csv, name.replace(/^sundry-/, "")), `${name}.xlsx`, "xlsx")
    : downloadResponse(csv, `${name}.csv`, "csv");
}
