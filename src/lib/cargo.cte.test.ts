import { describe, expect, it } from "vitest";
import {
  allowedNextStatuses,
  buildCteEmail,
  canRequestCte,
  canSelectWith,
  isOverdue,
  statusLabel,
  summarizePallets,
  validateCteSelection,
} from "./cargo";

const today = "2026-11-15";
const now = "2026-11-15T12:00:00";
const base = { status: "impressa", created_at: now, carrier: "Ritmo" };

describe("CT-e manual em lote", () => {
  it("1 carga: DT e Placa sem número", () => {
    const e = buildCteEmail([{ carrier: "Ritmo", plate: "bdd-3g22", dt: "106927853" }], "Bom dia");
    expect(e.body).toContain("DT: 106927853\nPlaca: BDD3G22");
    expect(e.body).not.toContain("DT 1");
  });

  it("2+ cargas: numera a partir de 1", () => {
    const e = buildCteEmail(
      [
        { carrier: "Ghelere", plate: "BDN-4G87", dt: "111" },
        { carrier: "Ghelere", plate: "FED5B87", dt: "222" },
      ],
      "Boa tarde",
    );
    expect(e.subject).toBe("Emissão CTe manual - GHELERE  BDN4G87, FED5B87");
    expect(e.body).toContain("DT 1: 111\nPlaca 1: BDN4G87\n\nDT 2: 222\nPlaca 2: FED5B87");
  });

  it("só no dia da importação e só em impressa", () => {
    expect(canRequestCte(base, today).ok).toBe(true);
    expect(canRequestCte({ ...base, created_at: "2026-11-14T12:00:00" }, today).ok).toBe(false);
    expect(canRequestCte({ ...base, status: "faturado" }, today).ok).toBe(false);
  });

  it("só junta a mesma transportadora", () => {
    expect(canSelectWith({ ...base, carrier: "RITMO" }, [base], today)).toBe(true);
    expect(canSelectWith({ ...base, carrier: "Ghelere" }, [base], today)).toBe(false);
    expect(validateCteSelection([base, { ...base, carrier: "Ghelere" }], today).ok).toBe(false);
  });
});

describe("pendência da virada e pallets", () => {
  it("virou o dia sem finalizar = pendência; de lá só vai para finalizada", () => {
    expect(isOverdue({ status: "impressa", created_at: "2026-11-14T12:00:00" }, today)).toBe(true);
    expect(isOverdue({ status: "finalizada", created_at: "2026-11-14T12:00:00" }, today)).toBe(false);
    expect(allowedNextStatuses("erro_virada")).toEqual(["finalizada"]);
    expect(statusLabel("erro_virada")).toBe("Pendência");
  });

  it("resumo de pallets da placa", () => {
    expect(summarizePallets([{ pallets: 26 }, { pallets: 28 }, { pallets: 24 }]).max).toBe(28);
  });
});
