import { describe, expect, it } from "vitest";
import { formatPlateLine, parseCargoText, boxesFor, MB_PRODUCTS } from "./cargo";

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
    expect(bauru!.products).toEqual([
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

  it("calculates MB boxes from pallets", () => {
    expect(boxesFor(MB_PRODUCTS[0]!, 2)).toBe(MB_PRODUCTS[0]!.boxesPerPallet * 2);
  });
});
