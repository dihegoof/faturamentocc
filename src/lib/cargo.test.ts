import { describe, expect, it } from "vitest";
import { formatPlateLine, parseCargoText, boxesFor, MB_PRODUCTS } from "./cargo";

describe("cargo rules", () => {
  it("formats plate line as GHE1B55 ED - 9939 | Transportadora", () => {
    expect(formatPlateLine({ plate: "ghe-1b55", dt: "9939", carrier: "Transportadora" })).toBe(
      "GHE1B55 ED - 9939 | Transportadora",
    );
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

  it("calculates MB boxes from pallets", () => {
    expect(boxesFor(MB_PRODUCTS[0]!, 2)).toBe(MB_PRODUCTS[0]!.boxesPerPallet * 2);
  });
});
