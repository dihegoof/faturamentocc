import { describe, expect, it } from "vitest";
import { formatPlateLine, parseCargoText, palletsFor, buildCteEmail, cteRecipients, checkBoxes, splitList, joinList, cardTone, cleanDestination, matchesSearch , findCatalog, sapClipboard, plateClipboard, fmtNum, formatElapsed, cteTimer } from "./cargo";

describe("cargo rules", () => {
  it("formats plate line as GHE1B55 ED - 9939 | Transportadora", () => {
    expect(formatPlateLine({ plate: "ghe-1b55", dt: "9939", carrier: "Transportadora" })).toBe(
      "GHE1B55 ED - 9939 | Transportadora",
    );
  });

  it("uses the last 4 DT digits for faturamento and hides the suffix for remessa", () => {
    const load = { plate: "BDD3G22", dt: "106927853", carrier: "Ritmo" };
    expect(formatPlateLine(load, "faturamento")).toBe("BDD3G22 ED - 7853 | Ritmo");
    expect(formatPlateLine(load, "remessa")).toBe("BDD3G22 | Ritmo");
  });

  it("groups product rows by carga and flags divergences", () => {
    const text = [
      "Data\tCarga\tOrigem\tDestino\tTransportadora\tPlaca\tDT\tPallets\tCódigo\tDescrição\tCaixas",
      "09/11/2026\t1001\tJundiaí\tCampinas\tTrans A\tGHE1B55\t9939\t28\t123\tCoca 2L\t300",
      "09/11/2026\t1001\tJundiaí\tCampinas\tTrans A\tABC1234\t9939\t28\t456\tFanta 2L\t120",
    ].join("\n");
    const { loads } = parseCargoText(text);
    expect(loads).toHaveLength(1);
    expect(loads[0]!.products).toHaveLength(2);
    expect(loads[0]!.load_date).toBe("2026-11-09");
    expect(loads[0]!.warnings.some((w) => w.includes("Placa divergente"))).toBe(true);
  });

  it("parses headerless remessa rows with repeated load columns", () => {
    const text = [
      "11/11/2026\t1\tB0AC\tBFBP\tFrancisco Beltrão\t92521\tCRYSTAL 1,5L SEM GÁS 06UN\t1.008\t9\tRitmo\tBDD3G22\t106927853",
      "11/11/2026\t1\tB0AC\tBFBP\tFrancisco Beltrão\t92522\tCRYSTAL 500ML COM GÁS 12UN\t1.344\t8\tRitmo\tBDD3G22\t106927853",
      "11/11/2026\t1\tB0AC\tBFBP\tFrancisco Beltrão\t92536\tCRYSTAL  COPO 310ML  SG 48UN CP .\t60\t1\tRitmo\tBDD3G22\t106927853",
      "11/11/2026\t1\tB0AC\tBFBP\tFrancisco Beltrão\t92581\tCRYSTAL 05L C/2 CP\t896\t8\tRitmo\tBDD3G22\t106927853",
      "11/11/2026\t14\tB0AC\tBFCM\tCD Bauru\t92520\tCRYSTAL 1,5L COM GÁS 06UN\t3.640\t26\tRitmo\tOBL8E22\t106927866",
    ].join("\n");
    const { loads, errors } = parseCargoText(text);
    expect(errors).toEqual([]);
    expect(loads).toHaveLength(2);
    const [fb, bauru] = loads;
    expect(fb).toMatchObject({
      load_date: "2026-11-11",
      load_number: "1",
      origin: "B0AC",
      destination_code: "BFBP",
      destination: "Francisco Beltrão",
      carrier: "Ritmo",
      plate: "BDD3G22",
      dt: "106927853",
      pallets: 26,
    });
    expect(fb!.products.map((p) => p.boxes)).toEqual([1008, 1344, 60, 896]);
    expect(fb!.warnings).toEqual([]);
    expect(bauru).toMatchObject({
      load_number: "14",
      destination_code: "BFCM",
      plate: "OBL8E22",
      dt: "106927866",
      pallets: 26,
    });
    expect(bauru!.products).toMatchObject([
      { code: "92520", description: "CRYSTAL 1,5L COM GÁS 06UN", boxes: 3640 },
    ]);
  });

  it("attaches rows with '-' or blank load columns to the previous carga", () => {
    const text = [
      "11/11/2026\t1\tB0AC\tBFBP\tFrancisco Beltrão\t92521\tCRYSTAL 1,5L SEM GÁS 06UN\t1.008\t9\tRitmo\tBDD3G22\t106927853",
      "-\t-\t-\t-\t-\t92522\tCRYSTAL 500ML COM GÁS 12UN\t1.344\t8\t-\t-\t-",
      "\t\t\t\t\t92581\tCRYSTAL 05L C/2 CP\t896\t8\t\t\t",
      "12/11/2026\t2\tB0AC\tBFDZ\tChapecó\t92527\tCRYSTAL 500ML SEM GÁS 12UN\t3360\t20\tRitmo\tABC1D23\t106932143",
    ].join("\n");
    const { loads } = parseCargoText(text);
    expect(loads).toHaveLength(2);
    expect(loads[0]!.products.map((p) => p.code)).toEqual(["92521", "92522", "92581"]);
    expect(loads[0]!.pallets).toBe(25);
    expect(loads[1]).toMatchObject({
      load_number: "2",
      load_date: "2026-11-12",
      destination_code: "BFDZ",
      pallets: 20,
    });
  });

  it("accepts agenda rows with Horário and Observações columns", () => {
    const text = [
      "Data\tN° da Carga\tOrigem\tDestino\tDestino\tSKU\tDescrição\tCxs Progr. Arred.\tPallets\tTransportador\tHorário\tPlaca\tTransporte\tObservações",
      "12/11/2026\t21\tB0AC\tBFAJ\tCD Juíz de Fora\t92521\tCRYSTAL 1,5L SEM GÁS 06UN\t3136\t28\tRitmo\tDefinir\tBDD3G22\t106932162\tINTERZONAS",
    ].join("\n");
    const { loads } = parseCargoText(text);
    expect(loads).toHaveLength(1);
    expect(loads[0]).toMatchObject({
      load_number: "21",
      plate: "BDD3G22",
      dt: "106932162",
      pallets: 28,
    });
  });

  it("calculates MB pallets from typed boxes", () => {
    expect(palletsFor(196, 98)).toBe(2);
    expect(palletsFor(36, 72)).toBe(0.5);
  });

  it("builds the CT-e manual subject with carrier and plates separated by comma", () => {
    const e = buildCteEmail([{ carrier: "Ghelere", plate: "BDN-4G87", dt: "400106923822" }, { carrier: "Ghelere", plate: "FED5B87", dt: "1" }], "Boa tarde");
    expect(e.subject).toBe("Emissão CTe manual - GHELERE  BDN4G87, FED5B87");
    expect(e.body).toContain("para que a Ghelere siga com a emissão do CT-e manual");
    expect(e.body).toContain("DT: 400106923822\nPlaca: BDN4G87");
    expect(e.body).toContain("[Cole aqui a evidência do Triangulus]");
  });

  it("sends CT-e to Torre + carrier and copies the fixed team", () => {
    const r = cteRecipients([
      { kind: "to_fixed", email: "torre@kof.com", carrier: null },
      { kind: "cc_fixed", email: "fiscal@kof.com", carrier: null },
      { kind: "carrier", email: "a@ritmolog.com.br", carrier: "RITMO" },
      { kind: "carrier", email: "b@ghelere.com.br", carrier: "GHELERE" },
    ], "Ritmo Logística");
    expect(r.to).toEqual(["torre@kof.com", "a@ritmolog.com.br"]);
    expect(r.cc).toEqual(["fiscal@kof.com"]);
  });

  it("flags boxes that don't match pallets × boxes per pallet", () => {
    const cat = [{ code: "92521", description: "x", boxes_per_pallet: 112 }];
    expect(checkBoxes([{ code: "92521", description: "x", boxes: 1008, pallets: 9 }], cat)).toEqual([]);
    expect(checkBoxes([{ code: "92521", description: "x", boxes: 1000, pallets: 9 }], cat)).toHaveLength(1);
  });

  it("keeps NF numbers as unique pills", () => {
    expect(joinList(splitList("123, 456 123"))).toBe("123, 456");
  });

  it("colors finalizada dark green with exit and light green without", () => {
    expect(cardTone({ status: "finalizada", has_exit: true })).toBe("finalizada-com");
    expect(cardTone({ status: "finalizada", has_exit: false })).toBe("finalizada-sem");
    expect(cardTone({ status: "faturado", has_exit: null })).toBe("faturado");
  });
  it("strips SPAL prefix/suffix from destination for remessa", () => {
    expect(cleanDestination("SPAL - CAMPINAS")).toBe("CAMPINAS");
    expect(cleanDestination("Jundiaí SPAL")).toBe("Jundiaí");
  });
  it("finds loads by partial DT, plate ignoring dash, or carrier", () => {
    const l = { dt: "106927853", plate: "BDN4G87", carrier: "Ghelere", load_number: "40512", invoice_numbers: null, destination: null };
    expect(matchesSearch(l, "7853")).toBe(true);
    expect(matchesSearch(l, "bdn-4g")).toBe(true);
    expect(matchesSearch(l, "ghel")).toBe(true);
    expect(matchesSearch(l, "xyz")).toBe(false);
  });
});

describe("v3 helpers", () => {
  const catalog = [
    { code: "92521", sap_code: "92592", short_name: "1,5S/G", description: "Crystal 1,5L SG", boxes_per_pallet: 112 },
    { code: "92877", sap_code: "92877", short_name: "COPO50CX", description: "Copo", boxes_per_pallet: 50 },
  ];
  it("finds catalog by client code or SAP code", () => {
    expect(findCatalog(catalog, "92521")?.sap_code).toBe("92592");
    expect(findCatalog(catalog, "92592")?.code).toBe("92521");
    expect(findCatalog(catalog, "00000")).toBeUndefined();
  });
  it("copies SAP code and boxes as two spreadsheet cells and plate with '  ED'", () => {
    expect(sapClipboard("92592", 2688)).toBe("92592\t2688");
    expect(plateClipboard("bdd-3g22")).toBe("BDD3G22  ED");
  });
  it("formats numbers and elapsed time in pt-BR", () => {
    expect(fmtNum(3600)).toBe("3.600");
    expect(formatElapsed(45_000)).toBe("45s");
    expect(formatElapsed(12 * 60_000)).toBe("12 min");
    expect(formatElapsed(125 * 60_000)).toBe("2h 05min");
  });
  it("CT-e timer restarts from the request made in the current status", () => {
    const w = "2026-11-13T10:00:00.000Z";
    expect(cteTimer({ wait_started_at: w, cte_requested_at: null }).label).toBe("Atualizado há");
    expect(cteTimer({ wait_started_at: w, cte_requested_at: "2026-11-13T10:05:00.000Z" }).label).toBe("Solicitado há");
    expect(cteTimer({ wait_started_at: w, cte_requested_at: "2026-11-13T09:00:00.000Z" }).label).toBe("Atualizado há");
  });
});
