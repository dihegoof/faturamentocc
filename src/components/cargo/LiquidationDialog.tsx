import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  downloadCSV,
  filterLiquidation,
  liquidationLabel,
  pendingLiquidation,
  type CargoLoad,
  type LiquidationCriteria,
} from "@/lib/cargo";
import { registerLiquidationExport } from "@/lib/cargo-api";

type Modo = "pendentes" | "periodo" | "criterio";

/**
 * Liquidação em lote. O arquivo exportado cria uma pendência que só o
 * autor pode confirmar — a confirmação vale para todos os DTs do arquivo.
 */
export function LiquidationDialog({
  open,
  onOpenChange,
  loads,
  user,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  loads: CargoLoad[];
  user: string;
  initialDate?: string;
}) {
  const [modo, setModo] = useState<Modo>("pendentes");
  const [from, setFrom] = useState(initialDate ?? "");
  const [to, setTo] = useState(initialDate ?? "");
  const [productCode, setProductCode] = useState("");
  const [usuario, setUsuario] = useState("");
  const [busy, setBusy] = useState(false);

  const criterios: LiquidationCriteria = useMemo(() => {
    if (modo === "periodo") return { from: from || undefined, to: to || undefined };
    if (modo === "criterio") {
      return {
        from: from || undefined,
        to: to || undefined,
        productCode: productCode.trim() || undefined,
        user: usuario.trim() || undefined,
      };
    }
    return {};
  }, [modo, from, to, productCode, usuario]);

  const elegiveis = useMemo(() => filterLiquidation(loads, criterios), [loads, criterios]);
  const totalPlt = elegiveis.reduce((n, l) => n + Number(l.pallets ?? 0), 0);

  async function exportar() {
    if (!elegiveis.length) {
      toast.info("Nenhuma carga pendente de liquidação com esse critério");
      return;
    }
    setBusy(true);
    try {
      const label = liquidationLabel(criterios);
      const fileName = `liquidacao_${new Date().toISOString().slice(0, 10)}.csv`;

      downloadCSV(
        fileName,
        elegiveis.map((l) => ({
          Data: l.load_date,
          Carga: l.load_number,
          DT: l.dt,
          Placa: l.plate,
          Transportadora: l.carrier,
          Pallets: l.pallets,
          Finalizada: l.finalized_at
            ? new Date(l.finalized_at).toLocaleString("pt-BR")
            : "",
          "Sigla destino": l.destination_code,
          Destino: l.destination,
          Critério: label,
          Exportado: user,
        })),
      );

      // O arquivo baixado vira uma pendência de validação.
      await registerLiquidationExport({
        loadIds: elegiveis.map((l) => l.id),
        exportedBy: user,
        mode: modo,
        criteria: criterios as Record<string, unknown>,
        criteriaLabel: label,
        fileName,
      });

      toast.success(
        `${elegiveis.length} DT(s) exportado(s) — confirme a liquidação para concluir`,
      );
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Liquidação</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">O que exportar</Label>
            <select
              value={modo}
              onChange={(e) => setModo(e.target.value as Modo)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="pendentes">Todos os DTs pendentes de liquidação</option>
              <option value="periodo">DTs pendentes de um período específico</option>
              <option value="criterio">DTs pendentes por critério</option>
            </select>
          </div>

          {modo !== "pendentes" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
              </div>
            </div>
          )}

          {modo === "criterio" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Produto (SKU)</Label>
                <Input
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="Ex: 92521"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Faturado por (usuário)</Label>
                <Input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Nome do faturista"
                  className="h-9"
                />
              </div>
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <strong>{elegiveis.length}</strong> DT(s) pendente(s) · {totalPlt} pallets
            <span className="block text-xs text-muted-foreground">
              {liquidationLabel(criterios)} — só entram cargas finalizadas com saída.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={exportar} disabled={busy || !elegiveis.length}>
            <Download className="mr-1 h-4 w-4" />
            {busy ? "Exportando…" : `Exportar ${elegiveis.length} DT(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
