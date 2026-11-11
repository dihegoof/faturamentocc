import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Mail, Printer, Scissors, Truck, Undo2 } from "lucide-react";
import { AccountShell } from "@/components/cargo/AccountShell";
import { AppHeader } from "@/components/cargo/AppHeader";
import { Board } from "@/components/cargo/Board";
import { LoadDetailDialog } from "@/components/cargo/LoadDetailDialog";
import { CteDialog } from "@/components/cargo/CteDialog";
import { PlateSearch } from "@/components/cargo/PlateSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLoads, useNow } from "@/hooks/use-loads";
import { updateLoad } from "@/lib/cargo-api";
import {
  CORTE_REASONS,
  downloadCSV,
  formatPlateLine,
  minutesSince,
  statusLabel,
  todayISO,
  type CargoLoad,
} from "@/lib/cargo";

export const Route = createFileRoute("/_authenticated/faturamento")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Faturamento — Cargas CocaCola" },
      {
        name: "description",
        content: "Painel operacional de faturamento: faturar, CT-e, corte e finalização de cargas.",
      },
      { property: "og:title", content: "Faturamento — Cargas CocaCola" },
      { property: "og:description", content: "Painel operacional de faturamento de cargas." },
    ],
  }),
  component: () => (
    <AccountShell>
      <Faturamento />
    </AccountShell>
  ),
});

type Pending = { kind: "faturar" | "corte"; load: CargoLoad } | null;

function Faturamento() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const { data: loads = [], isLoading } = useLoads(date);
  const now = useNow();
  const [detail, setDetail] = useState<CargoLoad | null>(null);
  const [cte, setCte] = useState<CargoLoad | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [nf, setNf] = useState("");

  const run = async (
    load: CargoLoad,
    patch: Partial<CargoLoad>,
    event: string,
    details?: string,
  ) => {
    try {
      await updateLoad(load, patch, event, "faturamento", details);
      qc.invalidateQueries({ queryKey: ["loads"] });
      toast.success(event);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const actions = (l: CargoLoad) => {
    const b = (
      label: string,
      icon: React.ReactNode,
      onClick: () => void,
      variant: "default" | "outline" | "destructive" = "outline",
    ) => (
      <Button
        key={label}
        size="sm"
        variant={variant}
        className="h-7 px-2 text-xs"
        onClick={onClick}
      >
        {icon} {label}
      </Button>
    );
    const corte = b("Corte", <Scissors className="h-3 w-3" />, () =>
      setPending({ kind: "corte", load: l }),
    );
    switch (l.status) {
      case "pendente":
        return [
          b(
            "Faturar",
            <FileText className="h-3 w-3" />,
            () => {
              setNf(l.invoice_numbers ?? "");
              setPending({ kind: "faturar", load: l });
            },
            "default",
          ),
          corte,
        ];
      case "faturado":
        return [
          b("CT-e", <Mail className="h-3 w-3" />, () => setCte(l)),
          b(
            "CT-e recebido + impressa",
            <Printer className="h-3 w-3" />,
            () =>
              run(
                l,
                { status: "impressa", cte_received_at: new Date().toISOString() },
                "CT-e recebido e nota impressa",
              ),
            "default",
          ),
          corte,
        ];
      case "impressa":
        return [
          b(
            "Confirmar saída",
            <Truck className="h-3 w-3" />,
            () => run(l, { status: "finalizada" }, "Saída confirmada — carga finalizada"),
            "default",
          ),
          !l.cte_received_at && b("CT-e", <Mail className="h-3 w-3" />, () => setCte(l)),
          corte,
        ];
      case "corte":
        return [
          b(
            "Liberar",
            <Undo2 className="h-3 w-3" />,
            () =>
              run(
                l,
                { status: l.invoice_numbers ? "faturado" : "pendente", corte_reason: null },
                "Impedimento resolvido",
              ),
            "default",
          ),
        ];
      default:
        return null;
    }
  };

  const exportDay = () =>
    downloadCSV(
      `cargas_${date}.csv`,
      loads.map((l) => ({
        Data: l.load_date,
        Carga: l.load_number,
        Placa: formatPlateLine(l),
        DT: l.dt,
        Transportadora: l.carrier,
        Origem: l.origin,
        "Sigla destino": l.destination_code,
        Destino: l.destination,
        Pallets: l.pallets,
        "Ordem produto": l.product_order,
        "Ordem palete": l.pallet_order,
        Notas: l.invoice_numbers,
        Status: statusLabel(l.status),
        Corte: l.corte_reason,
      })),
    );

  const exportLiquidacao = (): void => {
    const done = loads.filter((l) => l.status === "finalizada");
    if (!done.length) {
      toast.info("Nenhuma carga finalizada nesta data");
      return;
    }
    downloadCSV(
      `liquidacao_${date}.csv`,
      done.map((l) => ({
        Data: l.load_date,
        Carga: l.load_number,
        Placa: l.plate,
        DT: l.dt,
        Transportadora: l.carrier,
        "Ordem produto": l.product_order,
        "Ordem palete": l.pallet_order,
        Notas: l.invoice_numbers,
        Pallets: l.pallets,
        Importada: new Date(l.created_at).toLocaleString("pt-BR"),
        Finalizada: l.finalized_at ? new Date(l.finalized_at).toLocaleString("pt-BR") : "",
        "Tempo total (min)": l.finalized_at
          ? minutesSince(l.created_at, new Date(l.finalized_at).getTime())
          : "",
      })),
    );
  };

  return (
    <div className="min-h-screen">
      <AppHeader profile="faturamento">
        <PlateSearch onOpen={setDetail} profile="faturamento" />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-40 bg-card text-foreground"
          aria-label="Data"
        />
        <Button size="sm" variant="secondary" onClick={exportDay}>
          <Download className="h-4 w-4" /> Cargas do dia
        </Button>
        <Button size="sm" variant="secondary" onClick={exportLiquidacao}>
          <Download className="h-4 w-4" /> Liquidação
        </Button>
      </AppHeader>
      <main className="mx-auto max-w-[1500px] p-4 md:p-6">
        {isLoading ? (
          <p className="text-muted-foreground">Carregando cargas…</p>
        ) : (
          <Board
            loads={loads}
            now={now}
            onOpen={setDetail}
            renderActions={actions}
            profile="faturamento"
          />
        )}
      </main>

      <LoadDetailDialog load={detail} onClose={() => setDetail(null)} profile="faturamento" />
      <CteDialog load={cte} onClose={() => setCte(null)} />

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          {pending?.kind === "faturar" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Faturar carga {pending.load.load_number}
                </DialogTitle>
              </DialogHeader>
              <Input
                autoFocus
                placeholder="Números das notas (ex: 123456, 123457)"
                value={nf}
                onChange={(e) => setNf(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={async () => {
                    await run(
                      pending.load,
                      { status: "faturado", invoice_numbers: nf || null },
                      "Carga faturada",
                      nf ? `NF ${nf}` : undefined,
                    );
                    setPending(null);
                  }}
                >
                  Emitir nota e avançar
                </Button>
              </DialogFooter>
            </>
          )}
          {pending?.kind === "corte" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  Registrar corte / impedimento
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                {CORTE_REASONS.map((r) => (
                  <Button
                    key={r}
                    variant="outline"
                    className="justify-start"
                    onClick={async () => {
                      await run(
                        pending.load,
                        { status: "corte", corte_reason: r },
                        "Corte registrado",
                        r,
                      );
                      setPending(null);
                    }}
                  >
                    <Scissors className="h-4 w-4" /> {r}
                  </Button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
