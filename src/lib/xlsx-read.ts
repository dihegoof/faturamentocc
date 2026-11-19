/**
 * Leitor de .xlsx sem dependência externa.
 *
 * Um .xlsx é um ZIP com XML dentro. Extraímos só o necessário: o sharedStrings
 * (textos) e a planilha alvo, e devolvemos linhas × colunas como string/Date.
 * Não usamos biblioteca porque ela não está no package.json do projeto.
 */

/** Tabela de strings compartilhadas do arquivo. */
async function readSharedStrings(zip: ZipReader): Promise<string[]> {
  const xml = await zip.readText("xl/sharedStrings.xml");
  if (!xml) return [];
  const out: string[] = [];
  // Cada <si> pode ter vários <t> (rich text): concatenamos.
  const siBlocks = xml.match(/<si\b[\s\S]*?<\/si>/g) ?? [];
  for (const block of siBlocks) {
    const parts = block.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [];
    out.push(
      parts
        .map((p) => decodeXml(p.replace(/<[^>]+>/g, "")))
        .join(""),
    );
  }
  return out;
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** "BC12" -> { c: 54, r: 11 } (0-based). */
function cellRef(ref: string): { c: number; r: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return { c: 0, r: 0 };
  const letters = m[1]!;
  let c = 0;
  for (const ch of letters) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c: c - 1, r: Number(m[2]) - 1 };
}

/** Converte o número de série do Excel em Date. */
function excelDate(serial: number): Date {
  // 1899-12-30 é a base do Excel (com o bug do 1900 embutido).
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
}

interface ZipReader {
  readText(path: string): Promise<string | null>;
  entries(): Promise<string[]>;
}

/** Leitor mínimo de ZIP, suficiente para um .xlsx (sem compressão exótica). */
async function openZip(buf: ArrayBuffer): Promise<ZipReader> {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // Localiza o End Of Central Directory varrendo do fim.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 65558; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Arquivo não é um .xlsx válido (ZIP não encontrado)");

  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);

  const index = new Map<string, { offset: number; comp: number; size: number; method: number }>();
  const names: string[] = [];

  for (let i = 0; i < count; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const comp = view.getUint32(ptr + 20, true);
    const size = view.getUint32(ptr + 24, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOff = view.getUint32(ptr + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    index.set(name, { offset: localOff, comp, size, method });
    names.push(name);
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  // O offset do diretório central aponta para o header local, cujo
  // tamanho variável precisa ser somado antes dos dados.
  async function slice(name: string): Promise<Uint8Array | null> {
    const e = index.get(name);
    if (!e) return null;
    if (view.getUint32(e.offset, true) !== 0x04034b50) return null;
    const nLen = view.getUint16(e.offset + 26, true);
    const xLen = view.getUint16(e.offset + 28, true);
    const start = e.offset + 30 + nLen + xLen;
    const raw = bytes.subarray(start, start + e.comp);

    if (e.method === 0) return raw;
    if (e.method !== 8) throw new Error("Compressão não suportada neste .xlsx");

    // Inflate nativo do navegador.
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([raw]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  return {
    entries: async () => names,
    readText: async (path) => {
      const data = await slice(path);
      return data ? new TextDecoder().decode(data) : null;
    },
  };
}

/**
 * Lê a aba "Programação" e devolve as linhas como array de células.
 * Datas viram Date; número vira number; texto vem resolvido pelo sharedStrings.
 */
export async function readAgendaSheet(buf: ArrayBuffer): Promise<unknown[][]> {
  const zip = await openZip(buf);
  const names = await zip.entries();

  // Descobre qual sheetN.xml é a aba "Programação".
  const wbXml = await zip.readText("xl/workbook.xml");
  const relXml = await zip.readText("xl/_rels/workbook.xml.rels");
  if (!wbXml || !relXml) throw new Error("Estrutura do .xlsx inválida");

  const sheets = [...wbXml.matchAll(/<sheet\b[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"[^>]*\/?>/g)];
  const target = sheets.find(([, name]) => name === "Programação") ?? sheets[0];
  if (!target) throw new Error("Nenhuma aba encontrada no arquivo");

  const relId = target[2]!;
  const rel = new RegExp(`<Relationship\\b[^>]*Id="${relId}"[^>]*Target="([^"]*)"`).exec(relXml);
  let path = rel?.[1] ?? "worksheets/sheet1.xml";
  if (!path.startsWith("xl/")) path = `xl/${path.replace(/^\/?xl\//, "")}`;
  if (!names.includes(path)) throw new Error("Planilha não encontrada no arquivo");

  const sheetXml = await zip.readText(path);
  if (!sheetXml) throw new Error("Não foi possível ler a planilha");

  const shared = await readSharedStrings(zip);
  const rows: unknown[][] = [];

  for (const rowXml of sheetXml.match(/<row\b[\s\S]*?<\/row>/g) ?? []) {
    const row: unknown[] = [];
    for (const cellXml of rowXml.match(/<c\b[\s\S]*?<\/c>|<c\b[^>]*\/>/g) ?? []) {
      const ref = /r="([A-Z]+\d+)"/.exec(cellXml)?.[1];
      const type = /t="([^"]+)"/.exec(cellXml)?.[1] ?? "n";
      const raw = /<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1];
      const inline = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(cellXml)?.[1];

      let value: unknown = null;
      if (type === "s" && raw != null) value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr" && inline != null) value = decodeXml(inline);
      else if (type === "str" && raw != null) value = decodeXml(raw);
      else if (raw != null) {
        const n = Number(raw);
        value = Number.isFinite(n) ? n : decodeXml(raw);
      }

      const col = ref ? cellRef(ref).c : row.length;
      row[col] = value;
    }
    rows.push(row);
  }

  return rows;
}

export { excelDate };
