import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { eraseAllLoads } from "@/lib/cargo-api";

/**
 * Botão escondido do Painel: apaga TODAS as cargas (cargo_loads).
 * Pensado para ambiente de teste — sem confirmação, sem aparência de botão.
 * É um ponto final invisível ao lado do título da seção.
 */
export function EraseAllButton() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function apagar() {
    if (busy) return;
    setBusy(true);
    try {
      const { deleted } = await eraseAllLoads();
      toast.success(`${deleted} carga(s) apagada(s)`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void apagar()}
      disabled={busy}
      tabIndex={-1}
      aria-hidden="true"
      className="ml-0.5 cursor-default select-none border-0 bg-transparent p-0 align-baseline text-inherit opacity-0"
    >
      .
    </button>
  );
}
