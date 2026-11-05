import { formatDate } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { type HistoryView, historyTable } from './history.js';

// Exports de /historique au-delà du CSV : PDF (tout compte) et Excel .xlsx
// (extra Pro, matrice MATRICE-STATUT-DROITS-CANON.md). Générés dans le
// navigateur à partir de l’historique déjà lisible par le compte.

export type HistoryFormat = 'csv' | 'pdf' | 'xlsx' | 'json';

/** Formats proposés : CSV et PDF pour tout compte, Excel et JSON en plus pour Pro. */
export function historyFormats(plan: string | null): HistoryFormat[] {
  return plan === 'pro' ? ['csv', 'pdf', 'xlsx', 'json'] : ['csv', 'pdf'];
}

export function historyFileName(host: string, format: HistoryFormat): string {
  const safe = host.toLowerCase().replace(/[^a-z0-9.-]+/gu, '-');
  return `audixio-historique-${safe || 'site'}.${format}`;
}

// ---------- JSON (extra Pro : données brutes, notes numériques) ----------

export interface HistoryJson {
  format: 'audixio-historique';
  version: 1;
  site: string;
  generatedAt: string;
  series: { id: string; label: string }[];
  audits: { id: string; at: string; scores: Record<string, number | null> }[];
}

export function historyJson(
  view: HistoryView,
  host: string,
  now = new Date(),
): string {
  const audits = [...view.points]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((point) => ({
      id: point.id,
      at: point.at,
      scores: Object.fromEntries(
        view.series.map((item) => [item.id, point.scores[item.id] ?? null]),
      ),
    }));
  const body: HistoryJson = {
    format: 'audixio-historique',
    version: 1,
    site: host,
    generatedAt: now.toISOString(),
    series: view.series.map((item) => ({ id: item.id, label: item.label })),
    audits,
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

// ---------- PDF (texte, Helvetica, WinAnsi) ----------

const WIN_ANSI: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  '„': 0x84,
  '…': 0x85,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  œ: 0x9c,
  Œ: 0x8c,
};

function ansi(text: string): number[] {
  const out: number[] = [];
  for (const char of text.normalize('NFC')) {
    const code = char.codePointAt(0) ?? 63;
    const mapped = WIN_ANSI[char];
    if (mapped !== undefined) out.push(mapped);
    else if (char === '\u202f' || char === '\u00a0') out.push(0x20);
    else if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) out.push(code);
    else out.push(0x3f);
  }
  return out;
}

/** Chaîne PDF littérale, parenthèses et barres échappées. */
function pdfString(text: string): number[] {
  const out = [0x28];
  for (const byte of ansi(text)) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out.push(0x5c);
    out.push(byte);
  }
  out.push(0x29);
  return out;
}

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 40;
const ROW_H = 18;

function pageStream(
  lines: { x: number; y: number; size: number; bold: boolean; text: string }[],
): number[] {
  const out: number[] = [];
  for (const line of lines) {
    out.push(
      ...ascii(
        `BT /${line.bold ? 'F2' : 'F1'} ${line.size} Tf ${line.x} ${line.y} Td `,
      ),
      ...pdfString(line.text),
      ...ascii(' Tj ET\n'),
    );
  }
  return out;
}

/** PDF A4 paysage : titre, période, tableau date × note globale × domaines. */
export function historyPdf(
  view: HistoryView,
  host: string,
  now = new Date(),
): Uint8Array<ArrayBuffer> {
  const table = historyTable(view.points, view.series);
  const cols = table.columns.length;
  const width = (PAGE_W - MARGIN * 2) / Math.max(1, cols);
  const perPage = Math.floor((PAGE_H - MARGIN * 2 - 90) / ROW_H);
  const chunks: (typeof table.rows)[] = [];
  for (let i = 0; i < table.rows.length; i += perPage)
    chunks.push(table.rows.slice(i, i + perPage));
  if (chunks.length === 0) chunks.push([]);
  const pages = chunks.map((rows, index) => {
    const lines: {
      x: number;
      y: number;
      size: number;
      bold: boolean;
      text: string;
    }[] = [];
    let y = PAGE_H - MARGIN - 10;
    if (index === 0) {
      lines.push({
        x: MARGIN,
        y,
        size: 16,
        bold: true,
        text: t('history.export.title', { host }),
      });
      y -= 22;
      lines.push({ x: MARGIN, y, size: 10, bold: false, text: table.caption });
      y -= 14;
      lines.push({
        x: MARGIN,
        y,
        size: 9,
        bold: false,
        text: t('history.export.made', { date: formatDate(now) }),
      });
      y -= 26;
    }
    table.columns.forEach((column, c) => {
      lines.push({
        x: MARGIN + c * width,
        y,
        size: 9,
        bold: true,
        text: column.label,
      });
    });
    y -= ROW_H;
    for (const row of rows) {
      row.forEach((cell, c) => {
        lines.push({
          x: MARGIN + c * width,
          y,
          size: 9,
          bold: false,
          text: cell.text,
        });
      });
      y -= ROW_H;
    }
    return pageStream(lines);
  });
  // Objets : 1 catalogue, 2 pages, 3-4 polices, puis page + contenu par page.
  const objects: number[][] = [];
  const kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
  objects.push(ascii('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.push(
    ascii(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`),
  );
  objects.push(
    ascii(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    ),
  );
  objects.push(
    ascii(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ),
  );
  pages.forEach((stream, i) => {
    objects.push(
      ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
      ),
    );
    objects.push([
      ...ascii(`<< /Length ${stream.length} >>\nstream\n`),
      ...stream,
      ...ascii('\nendstream'),
    ]);
  });
  const bytes: number[] = ascii('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(bytes.length);
    bytes.push(...ascii(`${i + 1} 0 obj\n`), ...body, ...ascii('\nendobj\n'));
  });
  const xref = bytes.length;
  bytes.push(...ascii(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
  for (const offset of offsets)
    bytes.push(...ascii(`${String(offset).padStart(10, '0')} 00000 n \n`));
  bytes.push(
    ...ascii(
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
    ),
  );
  return Uint8Array.from(bytes);
}

// ---------- Excel .xlsx (SpreadsheetML minimal, zip sans compression) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data)
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

/** Archive zip « stockée » (méthode 0) : suffisante pour un .xlsx. */
export function zipStore(
  files: { name: string; data: Uint8Array }[],
): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const out: number[] = [];
  const central: number[] = [];
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const offset = out.length;
    const common = [
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0x21),
      ...u32(crc),
      ...u32(file.data.length),
      ...u32(file.data.length),
      ...u16(name.length),
    ];
    out.push(...u32(0x04034b50), ...common, ...u16(0), ...name, ...file.data);
    central.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...common,
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...name,
    );
  }
  const start = out.length;
  out.push(
    ...central,
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(central.length),
    ...u32(start),
    ...u16(0),
  );
  return Uint8Array.from(out);
}

function xml(text: string): string {
  return text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');
}

function columnName(index: number): string {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/** Classeur d’une feuille : en-tête, puis une ligne par audit ; notes en nombres. */
export function historyXlsx(view: HistoryView): Uint8Array<ArrayBuffer> {
  const table = historyTable(view.points, view.series);
  const rows = [
    table.columns.map((column) => ({
      text: column.label,
      number: null as number | null,
    })),
    ...table.rows.map((row) =>
      row.map((cell, index) => {
        const value =
          index > 0 && cell.numeric === true ? Number(cell.text) : null;
        return {
          text: cell.text,
          number: Number.isFinite(value) ? value : null,
        };
      }),
    ),
  ];
  const sheetRows = rows
    .map(
      (row, r) =>
        `<row r="${r + 1}">${row
          .map((cell, c) => {
            const ref = `${columnName(c)}${r + 1}`;
            return cell.number !== null
              ? `<c r="${ref}"><v>${cell.number}</v></c>`
              : `<c r="${ref}" t="inlineStr"${r === 0 ? ' s="1"' : ''}><is><t>${xml(cell.text)}</t></is></c>`;
          })
          .join('')}</row>`,
    )
    .join('');
  const sheetName = xml(t('history.export.sheet').slice(0, 31));
  const encoder = new TextEncoder();
  const files = {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  };
  return zipStore(
    Object.entries(files).map(([name, text]) => ({
      name,
      data: encoder.encode(text),
    })),
  );
}
