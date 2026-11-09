export type CargoStatus = "pendente" | "faturado" | "impressa" | "corte" | "finalizada";

export const STATUSES: { key: CargoStatus; label: string; tone: string }[] = [
  { key: "pendente", label: "Pendente", tone: "status-pendente" },
  { key: "faturado", label: "Faturado", tone: "status-faturado" },
  { key: "impressa", label: "Impressa ag. CT-e", tone: "status-impressa" },
  { key: "corte", label: "Corte", tone: "status-corte" },
  { key: "finalizada", label: "Finalizada", tone: "status-finalizada" },
];

export const statusLabel = (s: string) => STATUSES.find((x) => x.key === s)?.label ?? s;

export const CORTE_REASONS = ["Aguardando valor no sistema", "Carga com erro"];

export const WAIT_ALERT_MIN = 30;

export type Profile = "faturamento" | "remessa";

export interface CargoLoad {
  id: string;
  load_date: string;
  load_number: string;
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  plate: string | null;
  dt: string | null;
  pallets: number | null;
  invoice_numbers: string | null;
  status: string;
  corte_reason: string | null;
  cte_requested_at: string | null;
  cte_received_at: string | null;
  wait_started_at: string;
  status_changed_at: string;
  finalized_at: string | null;
  source: string | null;
  created_at: string;
}

export interface ParsedProduct {
  code: string;
  description: string;
  boxes: number;
}

export interface ParsedLoad {
  load_date: string;
  load_number: string;
  origin: string;
  destination: string;
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

/** Plate display pattern: "GHE1B55 ED - 9939 | Transportadora" */
export function formatPlateLine(load: Pick<CargoLoad, "plate" | "dt" | "carrier">): string {
  const plate = normalizePlate(load.plate ?? "") || "—";
  const dt = load.dt ? `ED - ${load.dt}` : "ED - —";
  return `${plate} ${dt} | ${load.carrier || "—"}`;
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

function toISODate(raw: string): string {
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [, d = "", mo = "", yr = ""] = m;
    const y = yr.length === 2 ? `20${yr}` : yr;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return "";
}

const num = (v: string) => {
  const n = Number(String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const HEADER_MAP: Record<string, keyof Omit<ParsedLoad, "products" | "warnings"> | "code" | "description" | "boxes"> = {
  data: "load_date",
  "data prevista": "load_date",
  carga: "load_number",
  "n carga": "load_number",
  "nº carga": "load_number",
  origem: "origin",
  "centro origem": "origin",
  destino: "destination",
  "centro destino": "destination",
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
  if (line.includes("|")) return line.split("|").filter((_, i, a) => !(i === 0 && (a[0] ?? "").trim() === ""));
  return line.split(/\s{2,}/);
}

/**
 * Parses pasted e-mail/spreadsheet text. Requires a header row with the known
 * columns; each row is one product line, grouped by Carga number.
 */
export function parseCargoText(text: string, fallbackDate = todayISO()): { loads: ParsedLoad[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  let headerIdx = -1;
  let cols: (keyof typeof HEADER_MAP extends never ? never : (typeof HEADER_MAP)[string] | undefined)[] = [];
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
    errors.push("Cabeçalho não encontrado. Inclua colunas como Data, Carga, Origem, Destino, Transportadora, Placa, DT, Pallets, Código, Descrição, Caixas.");
    return { loads: [], errors };
  }

  const byNumber = new Map<string, ParsedLoad>();
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitRow(lines[i] ?? "").map((c) => c.trim());
    const row: Partial<Record<"load_date" | "load_number" | "origin" | "destination" | "carrier" | "plate" | "dt" | "pallets" | "code" | "description" | "boxes", string>> = {};
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
        if (v && load![field] && v !== load![field]) load!.warnings.push(`${field} divergente: "${load![field]}" x "${v}"`);
      };
      check("origin", row.origin);
      check("destination", row.destination);
      check("carrier", row.carrier);
      const p = normalizePlate(row.plate || "");
      if (p && load.plate && p !== load.plate) load.warnings.push(`Placa divergente: ${load.plate} x ${p}`);
      if (row.pallets && num(row.pallets) !== load.pallets) load.pallets = Math.max(load.pallets, num(row.pallets));
    }
    if (row.code || row.description) {
      load.products.push({ code: row.code || "", description: row.description || "", boxes: num(row.boxes || "0") });
    }
  }

  for (const l of byNumber.values()) {
    if (!l.plate) l.warnings.push("Placa ausente");
    else if (!isValidPlate(l.plate)) l.warnings.push(`Placa fora do padrão: ${l.plate}`);
    if (!l.dt) l.warnings.push("DT ausente");
    if (!l.carrier) l.warnings.push("Transportadora ausente");
    if (!l.products.length) l.warnings.push("Nenhum produto");
    if (l.products.some((p) => !p.boxes)) l.warnings.push("Produto com 0 caixas");
  }
  return { loads: [...byNumber.values()], errors };
}

export interface MBProduct {
  code: string;
  description: string;
  boxesPerPallet: number;
}

export const MB_PRODUCTS: MBProduct[] = [
  { code: "CRY500", description: "Crystal 500ml", boxesPerPallet: 98 },
  { code: "CRY1500", description: "Crystal 1,5L", boxesPerPallet: 72 },
  { code: "CRYCOPO", description: "Crystal Copo", boxesPerPallet: 120 },
  { code: "CRY5L", description: "Crystal 5L", boxesPerPallet: 60 },
];

export const boxesFor = (p: MBProduct, pallets: number) => Math.round(p.boxesPerPallet * pallets);

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] ?? {});
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(";"))].join("\n");
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

export function buildCteEmail(load: Pick<CargoLoad, "dt" | "plate" | "carrier" | "load_number" | "origin" | "destination">) {
  const subject = `Solicitação de CT-e — DT ${load.dt ?? "—"} | Placa ${normalizePlate(load.plate ?? "")}`;
  const body = [
    "Prezados, bom dia/boa tarde.",
    "",
    "Solicitamos a emissão do CT-e para a carga abaixo:",
    "",
    `• Carga: ${load.load_number}`,
    `• DT: ${load.dt ?? "—"}`,
    `• Placa: ${normalizePlate(load.plate ?? "")}`,
    `• Transportadora: ${load.carrier ?? "—"}`,
    `• Origem/Destino: ${load.origin ?? "—"} → ${load.destination ?? "—"}`,
    "",
    "Lembrete: favor lançar o CT-e no Triangulus assim que emitido.",
    "",
    "O veículo está aguardando liberação. Obrigado.",
  ].join("\n");
  return { subject, body };
}
