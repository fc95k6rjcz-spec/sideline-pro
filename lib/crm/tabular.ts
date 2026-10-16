// Read research spreadsheets into rows of strings.
//
// CSV/TSV (including a block pasted straight from Google Sheets or Excel)
// and .xlsx. The .xlsx reader is deliberately small and dependency-free:
// an .xlsx file is a zip of XML parts, and DecompressionStream
// ("deflate-raw") is built into browsers and Node 18+. It reads cell
// values (shared strings, inline strings, numbers, booleans) — not
// formulas or formatting, which an import doesn't need.

export type Table = { headers: string[]; rows: string[][] };

// ---------- CSV / TSV ----------

export function detectDelimiter(text: string): "," | "\t" | ";" {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ",": 0, "\t": 0, ";": 0 } as Record<string, number>;
  let q = false;
  for (const ch of first) {
    if (ch === '"') q = !q;
    else if (!q && ch in counts) counts[ch]++;
  }
  if (counts["\t"] >= counts[","] && counts["\t"] >= counts[";"] && counts["\t"] > 0) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

/** RFC 4180-ish: quoted fields, doubled quotes, newlines inside quotes. */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const d = delimiter ?? detectDelimiter(text);
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") inQuotes = true;
    else if (ch === d) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** First non-empty row is the header row; pads/trims rows to its width. */
export function toTable(grid: string[][]): Table {
  const [head = [], ...body] = grid;
  const width = Math.max(head.length, ...body.map((r) => r.length), 0);
  const headers = Array.from({ length: width }, (_, i) => (head[i] ?? "").trim() || `Column ${i + 1}`);
  const rows = body.map((r) => Array.from({ length: width }, (_, i) => (r[i] ?? "").trim()));
  return { headers, rows };
}

// ---------- XLSX ----------

type ZipEntry = { name: string; method: number; compSize: number; offset: number };

function readZipDirectory(buf: Uint8Array): ZipEntry[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // End-of-central-directory record: scan back from the end.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid .xlsx file (zip directory not found)");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    out.push({ name, method, compSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readZipEntry(buf: Uint8Array, e: ZipEntry): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nameLen = dv.getUint16(e.offset + 26, true);
  const extraLen = dv.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const data = buf.slice(start, start + e.compSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error(`Unsupported compression in ${e.name}`);
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

/** All the text runs inside an <si> / <is> element. */
const runText = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export type XlsxSheet = { name: string; grid: string[][] };

export async function readXlsx(input: ArrayBuffer | Uint8Array): Promise<XlsxSheet[]> {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  const entries = readZipDirectory(buf);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const get = async (n: string) => {
    const e = byName.get(n);
    return e ? readZipEntry(buf, e) : null;
  };

  const shared: string[] = [];
  const sst = await get("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(runText(m[1]));

  // Sheet names and their part paths via workbook + rels.
  const wb = (await get("xl/workbook.xml")) ?? "";
  const rels = (await get("xl/_rels/workbook.xml.rels")) ?? "";
  const target = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/\bId="([^"]+)"/)?.[1];
    const t = m[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && t) target.set(id, t.replace(/^\/?(xl\/)?/, "xl/"));
  }
  const sheets: { name: string; path: string }[] = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(m[0].match(/\bname="([^"]*)"/)?.[1] ?? "Sheet");
    const rid = m[0].match(/\br:id="([^"]+)"/)?.[1];
    const path = (rid && target.get(rid)) || "";
    if (path) sheets.push({ name, path });
  }
  if (!sheets.length) {
    for (const e of entries) {
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(e.name)) sheets.push({ name: e.name.replace(/^.*\/|\.xml$/g, ""), path: e.name });
    }
  }

  const out: XlsxSheet[] = [];
  for (const s of sheets) {
    const xml = await get(s.path);
    if (!xml) continue;
    const grid: string[][] = [];
    for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row: string[] = [];
      for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1];
        const inner = cm[2] ?? "";
        const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
        const type = attrs.match(/\bt="([^"]+)"/)?.[1];
        let v = "";
        if (type === "inlineStr") v = runText(inner);
        else {
          const raw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
          if (raw !== undefined) {
            if (type === "s") v = shared[Number(raw)] ?? "";
            else if (type === "b") v = raw === "1" ? "TRUE" : "FALSE";
            else v = decodeXml(raw);
          }
        }
        const idx = ref ? colIndex(ref) : row.length;
        row[idx] = v;
      }
      grid.push(Array.from(row, (c) => c ?? ""));
    }
    out.push({ name: s.name, grid: grid.filter((r) => r.some((c) => c.trim() !== "")) });
  }
  return out;
}

// ---------- CSV out ----------

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v === null || v === undefined ? "" : String(v);
          // Guard against formula injection when the file is opened in Excel,
          // without mangling phone numbers like "+61 2 9981 4400".
          const risky = /^[=@]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s()]+$/.test(s));
          const safe = risky ? `'${s}` : s;
          return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(","),
    )
    .join("\r\n");
}
