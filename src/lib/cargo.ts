export type CargoStatus = "pendente" | "faturado" | "impressa" | "corte" | "finalizada";

export const STATUSES: { key: CargoStatus; label: string; tone: string }[] = [
  { key: "pendente", label: "Pendente", tone: "status-pendente" },
  { key: "faturado", label: "Faturado", tone: "status-faturado" },
  { key: "impressa", label: "Impressa ag. CT-e", tone: "status-impressa" },
  { key: "corte", label: "Erro", tone: "status-corte" },
  { key: "finalizada", label: "Finalizada", tone: "status-finalizada" },
];

export const statusLabel = (s: string) => STATUSES.find((x) => x.key === s)?.label ?? s;

export const CORTE_REASONS = ["Corte", "Aguardando valor no sistema", "Carga com erro"];

/** Card background tone per status; finalizada splits by whether the truck left. */
export function cardTone(load: Pick<CargoLoad, "status" | "has_exit">): string {
  if (load.status === "finalizada") return load.has_exit === false ? "finalizada-sem" : "finalizada-com";
  return load.status;
}

/** Destination name for Remessa without company prefixes/suffixes such as "SPAL". */
export function cleanDestination(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/\b(SPAL|SOLAR|FEMSA|CCSB|CD|CDD)\b/gi, " ")
    .replace(/^[\s\-–|/.:]+|[\s\-–|/.:]+$/g, "")
    .replace(/\s*[-–|]\s*[-–|]\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const norm = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Search by DT, plate, carrier, carga or NF; matches partial (close) values ignoring punctuation. */
export function matchesSearch(
  load: Pick<CargoLoad, "dt" | "plate" | "carrier" | "load_number" | "invoice_numbers" | "destination">,
  q: string,
): boolean {
  const t = norm(q);
  if (!t) return true;
  return [load.dt, load.plate, load.carrier, load.load_number, load.invoice_numbers, load.destination]
    .some((v) => norm(v).includes(t));
}

export const WAIT_ALERT_MIN = 30;

export type Profile = "faturamento" | "remessa";

export interface CargoLoad {
  id: string;
  load_date: string;
  load_number: string;
  origin: string | null;
  destination: string | null;
  destination_code: string | null;
  carrier: string | null;
  plate: string | null;
  dt: string | null;
  pallets: number | null;
  invoice_numbers: string | null;
  product_order: string | null;
  pallet_order: string | null;
  status: string;
  corte_reason: string | null;
  cte_requested_at: string | null;
  cte_received_at: string | null;
  wait_started_at: string;
  status_changed_at: string;
  finalized_at: string | null;
  source: string | null;
  created_at: string;
  has_exit?: boolean | null;
  plate_original?: string | null;
  dt_original?: string | null;
}

export interface ParsedProduct {
  code: string;
  description: string;
  boxes: number;
  pallets?: number;
}

export interface ParsedLoad {
  load_date: string;
  load_number: string;
  origin: string;
  destination: string;
  destination_code: string;
  carrier: string;
  plate: string;
  dt: string;
  pallets: number;
  products: ParsedProduct[];
  warnings: string[];
}

/** Normalizes a Brazilian plate to e.g. GHE1B55 */
export function normalizePlate(raw: string): string {
  return (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Last 4 digits of the DT (transport number), used as the plate suffix "ED - 7853". */
export function dtSuffix(dt: string | null | undefined): string {
  const digits = (dt ?? "").replace(/\D/g, "");
  return digits ? digits.slice(-4) : "—";
}

/**
 * Plate display pattern. Faturamento: "GHE1B55 ED - 9939 | Transportadora";
 * Remessa sees only "GHE1B55 | Transportadora".
 */
export function formatPlateLine(
  load: Pick<CargoLoad, "plate" | "dt" | "carrier">,
  profile: Profile = "faturamento",
): string {
  const plate = normalizePlate(load.plate ?? "") || "—";
  const carrier = load.carrier || "—";
  if (profile === "remessa") return `${plate} | ${carrier}`;
  return `${plate} ED - ${dtSuffix(load.dt)} | ${carrier}`;
}

/** Finds a Brazilian plate (old or Mercosul) inside a cell, e.g. "BDD3G22 ED" -> "BDD3G22". */
export function extractPlate(raw: string): string {
  return normalizePlate(raw).match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/)?.[0] ?? "";
}

export function isValidPlate(p: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizePlate(p));
}

export function minutesSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function toISODate(raw: string): string {
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [, d = "", mo = "", yr = ""] = m;
    const y = yr.length === 2 ? `20${yr}` : yr;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = s.toLowerCase().match(/^(\d{1,2})[/.\s-]([a-zç]{3})[a-zç]*\.?[/.\s-](\d{2,4})$/);
  if (m) {
    const [, d = "", mon = "", yr = ""] = m;
    const mo = MONTHS.indexOf(mon) + 1;
    if (mo > 0)
      return `${yr.length === 2 ? `20${yr}` : yr}-${String(mo).padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return "";
}

const num = (v: string) => {
  const n = Number(
    String(v ?? "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(n) ? n : 0;
};

const HEADER_MAP: Record<
  string,
  keyof Omit<ParsedLoad, "products" | "warnings"> | "code" | "description" | "boxes"
> = {
  data: "load_date",
  "data prevista": "load_date",
  carga: "load_number",
  "n carga": "load_number",
  "nº carga": "load_number",
  origem: "origin",
  "centro origem": "origin",
  destino: "destination",
  "centro destino": "destination_code",
  "cod destino": "destination_code",
  "código destino": "destination_code",
  transporte: "dt",
  transportadora: "carrier",
  placa: "plate",
  dt: "dt",
  pallets: "pallets",
  paletes: "pallets",
  codigo: "code",
  código: "code",
  cod: "code",
  descricao: "description",
  descrição: "description",
  produto: "description",
  caixas: "boxes",
  cx: "boxes",
  qtd: "boxes",
  quantidade: "boxes",
};

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  if (line.includes("|"))
    return line.split("|").filter((_, i, a) => !(i === 0 && (a[0] ?? "").trim() === ""));
  return line.split(/\s{2,}/);
}

/**
 * Parses pasted e-mail/spreadsheet text; each row is one product line, grouped by
 * Carga number. With a recognizable header row, columns are mapped by name;
 * otherwise rows are read positionally in the Remessa layout (see parsePositionalRows).
 */
export function parseCargoText(
  text: string,
  fallbackDate = todayISO(),
): { loads: ParsedLoad[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim());
  let headerIdx = -1;
  let cols: (keyof typeof HEADER_MAP extends never
    ? never
    : (typeof HEADER_MAP)[string] | undefined)[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = splitRow(lines[i] ?? "").map((c) => c.trim().toLowerCase());
    const mapped = cells.map((c) => HEADER_MAP[c]);
    if (mapped.includes("load_number") && mapped.filter(Boolean).length >= 3) {
      headerIdx = i;
      cols = mapped;
      break;
    }
  }
  if (headerIdx < 0) {
    const loads = parsePositionalRows(lines, fallbackDate);
    if (!loads.length) {
      errors.push(
        "Nenhuma carga reconhecida. Cole as linhas na ordem: Data, Nº Carga, Origem, Sigla destino, Destino, SKU, Descrição, Caixas, Pallets, Transportadora, Placa, Transporte (DT).",
      );
    }
    return { loads, errors };
  }

  const byNumber = new Map<string, ParsedLoad>();
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitRow(lines[i] ?? "").map((c) => c.trim());
    const row: Partial<
      Record<
        | "load_date"
        | "load_number"
        | "origin"
        | "destination"
        | "destination_code"
        | "carrier"
        | "plate"
        | "dt"
        | "pallets"
        | "code"
        | "description"
        | "boxes",
        string
      >
    > = {};
    cols.forEach((k, j) => {
      if (k) row[k] = cells[j] ?? "";
    });
    const loadNumber = (row.load_number || "").trim();
    if (!loadNumber) continue;
    let load = byNumber.get(loadNumber);
    if (!load) {
      load = {
        load_date: toISODate(row.load_date || "") || fallbackDate,
        load_number: loadNumber,
        origin: row.origin || "",
        destination: row.destination || "",
        destination_code: (row.destination_code || "").trim().toUpperCase(),
        carrier: row.carrier || "",
        plate: normalizePlate(row.plate || ""),
        dt: (row.dt || "").replace(/\D/g, ""),
        pallets: num(row.pallets || "0"),
        products: [],
        warnings: [],
      };
      byNumber.set(loadNumber, load);
    } else {
      const check = (field: "origin" | "destination" | "carrier", v?: string) => {
        if (v && load![field] && v !== load![field])
          load!.warnings.push(`${field} divergente: "${load![field]}" x "${v}"`);
      };
      check("origin", row.origin);
      check("destination", row.destination);
      check("carrier", row.carrier);
      const p = normalizePlate(row.plate || "");
      if (p && load.plate && p !== load.plate)
        load.warnings.push(`Placa divergente: ${load.plate} x ${p}`);
      if (row.pallets && num(row.pallets) !== load.pallets)
        load.pallets = Math.max(load.pallets, num(row.pallets));
    }
    if (row.code || row.description) {
      load.products.push({
        code: row.code || "",
        description: row.description || "",
        boxes: num(row.boxes || "0"),
      });
    }
  }

  const loads = [...byNumber.values()];
  loads.forEach(addLoadWarnings);
  return { loads, errors };
}

function addLoadWarnings(l: ParsedLoad) {
  if (!l.plate) l.warnings.push("Placa ausente");
  else if (!isValidPlate(l.plate)) l.warnings.push(`Placa fora do padrão: ${l.plate}`);
  if (!l.dt) l.warnings.push("DT ausente");
  if (!l.carrier) l.warnings.push("Transportadora ausente");
  if (!l.products.length) l.warnings.push("Nenhum produto");
  if (l.products.some((p) => !p.boxes)) l.warnings.push("Produto com 0 caixas");
}

const blank = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t === "-" || t === "—" || /^#N\/?D$/i.test(t) ? "" : t;
};

/**
 * Headerless Remessa layout, one product per row:
 * Data | Nº Carga | Origem | Sigla destino | Destino | SKU | Descrição | Caixas | Pallets | Transportadora | Placa | Transporte (DT)
 * Rows of the same carga may repeat the load columns or leave them blank/"-"
 * (then the product belongs to the previous carga). Pallets are per product and summed.
 */
export function parsePositionalRows(lines: string[], fallbackDate = todayISO()): ParsedLoad[] {
  const byNumber = new Map<string, ParsedLoad>();
  let last: ParsedLoad | undefined;
  for (const line of lines) {
    const raw = splitRow(line);
    if (blank(raw[0]) === "" && toISODate(blank(raw[1])) && raw.length > 12) raw.shift();
    const c = raw.map(blank);
    const [
      date = "",
      loadNumber = "",
      origin = "",
      destCode = "",
      destName = "",
      code = "",
      description = "",
      boxes = "",
      pallets = "",
      carrier = "",
    ] = c;
    const tail = c.slice(10);
    const dtCell = tail.find((v) => /^\d{6,}$/.test(v.replace(/[.\s]/g, ""))) ?? "";
    const plateCell =
      tail.find((v) => extractPlate(v)) ??
      (tail.length <= 2 && tail[0] !== dtCell ? (tail[0] ?? "") : "");
    const plate = extractPlate(plateCell) || normalizePlate(plateCell);
    const dt = dtCell.replace(/\D/g, "");
    const hasProduct = !!(code || description);
    const hasLoadInfo = !!(toISODate(date) || destCode || destName || carrier || plate || dt);

    let load: ParsedLoad | undefined;
    if (loadNumber && /^[\w./-]+$/.test(loadNumber) && (hasProduct || hasLoadInfo)) {
      load = byNumber.get(loadNumber);
      if (!load) {
        load = {
          load_date: toISODate(date) || fallbackDate,
          load_number: loadNumber,
          origin,
          destination: destName,
          destination_code: destCode.toUpperCase(),
          carrier,
          plate,
          dt,
          pallets: 0,
          products: [],
          warnings: [],
        };
        byNumber.set(loadNumber, load);
      } else {
        const fill = (
          field: "origin" | "destination" | "destination_code" | "carrier" | "plate" | "dt",
          v: string,
          label: string,
        ) => {
          if (!v) return;
          if (!load![field]) load![field] = v;
          else if (load![field] !== v && !load!.warnings.some((w) => w.startsWith(label)))
            load!.warnings.push(`${label} divergente: "${load![field]}" x "${v}"`);
        };
        fill("origin", origin, "Origem");
        fill("destination", destName, "Destino");
        fill("destination_code", destCode.toUpperCase(), "Sigla destino");
        fill("carrier", carrier, "Transportadora");
        fill("plate", plate, "Placa");
        fill("dt", dt, "DT");
      }
      last = load;
    } else if (!loadNumber && hasProduct && last) {
      load = last;
    }
    if (!load || !hasProduct) continue;
    load.products.push({
      code: /^\d{1,3}(\.\d{3})+$/.test(code) ? code.replace(/\./g, "") : code,
      description,
      boxes: num(boxes),
      pallets: num(pallets),
    });
    load.pallets += num(pallets);
  }
  const loads = [...byNumber.values()].filter((l) => l.products.length || l.plate || l.dt);
  loads.forEach(addLoadWarnings);
  return loads;
}


function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Neutraliza fórmulas: prefixa com apóstrofo quando começa com = + - @ ou tab/CR
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, unknown>[]): string {
  const columns = Object.keys(rows[0] ?? {});
  return [
    columns.map(csvCell).join(";"),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(";")),
  ].join("\n");
}

export function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob(["\ufeff" + toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** CT-e manual e-mail. Several loads of the same carrier share one e-mail. */
export function buildCteEmail(
  loads: Pick<CargoLoad, "dt" | "plate" | "carrier">[],
  greeting = new Date().getHours() < 12 ? "Bom dia" : "Boa tarde",
) {
  const carrier = loads[0]?.carrier?.trim() || "—";
  const plates = loads.map((l) => normalizePlate(l.plate ?? "") || "—");
  const subject = `Emissão CTe manual - ${carrier.toUpperCase()}  ${plates.join(", ")}`;
  const data = loads.map((l, i) => `DT: ${l.dt ?? "—"}\nPlaca: ${plates[i]}`).join("\n\n");
  const body = [
    `${greeting},`,
    "",
    `Por gentileza nos apoiar com o desacordo do transporte abaixo para que a ${carrier} siga com a emissão do CT-e manual, segue dados abaixo:`,
    "",
    data,
    "",
    "[Cole aqui a evidência do Triangulus]",
  ].join("\n");
  return { subject, body };
}

/** NF / ordem lists are stored as comma-separated text. */
export const splitList = (v: string | null | undefined) =>
  (v ?? "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
export const joinList = (xs: string[]) => (xs.length ? [...new Set(xs)].join(", ") : null);

export interface CatalogProduct {
  code: string;
  description: string;
  boxes_per_pallet: number;
}

/** Compares pasted boxes with pallets × boxes per pallet from the product catalog. */
export function checkBoxes(products: ParsedProduct[], catalog: CatalogProduct[]): string[] {
  const out: string[] = [];
  for (const p of products) {
    const c = catalog.find((x) => x.code.toUpperCase() === p.code.toUpperCase());
    if (!c || !p.pallets || !Number(c.boxes_per_pallet)) continue;
    const expected = Math.round(p.pallets * Number(c.boxes_per_pallet));
    if (expected !== p.boxes) out.push(`${p.code}: ${p.boxes} cx, esperado ${expected} (${p.pallets} pal × ${c.boxes_per_pallet})`);
  }
  return out;
}

/** MB: boxes typed per product → pallets from the catalog. */
export const palletsFor = (boxes: number, perPallet: number) =>
  perPallet > 0 ? Math.round((boxes / perPallet) * 100) / 100 : 0;

/** Contacts registered as e.g. "RITMO" match a load carrier like "Ritmo Logística". */
export function carrierMatches(contactCarrier: string | null | undefined, loadCarrier: string | null | undefined) {
  const n = (v: string | null | undefined) =>
    (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const a = n(contactCarrier), b = n(loadCarrier);
  return !!a && !!b && (b.includes(a) || a.includes(b));
}

/** Para = Torre + transportadora; Cc = cópia fixa do setor. */
export function cteRecipients(
  contacts: { kind: string; email: string; carrier: string | null }[],
  loadCarrier: string | null | undefined,
) {
  return {
    to: contacts.filter((c) => c.kind === "to_fixed" || (c.kind === "carrier" && carrierMatches(c.carrier, loadCarrier))).map((c) => c.email),
    cc: contacts.filter((c) => c.kind === "cc_fixed").map((c) => c.email),
  };
}
