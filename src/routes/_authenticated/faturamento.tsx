import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, PackagePlus } from "lucide-react";
import { AccountShell } from "@/components/cargo/AccountShell";
import { AppHeader } from "@/components/cargo/AppHeader";
import { LoadModal } from "@/components/cargo/LoadModal";
import { LoadTile } from "@/components/cargo/LoadTile";
import { HistoryStrip } from "@/components/cargo/HistoryStrip";
import { SearchBox } from "@/components/cargo/SearchBox";
import { ImportMBDialog } from "@/components/cargo/ImportMBDialog";
import { Button } from "@/components/ui/button";
import { useLoadLocks, useLoadsRange, useNow } from "@/hooks/use-loads";
import { getCurrentUser } from "@/lib/auth";
import {
  downloadCSV,
  formatPlateLine,
  matchesSearch,
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
      { name: "description", content: "Busca rápida por DT, placa ou transportadora e processamento das cargas." },
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

function Faturamento() {
  const { data: range = [], isLoading } = useLoadsRange();
  const now = useNow();
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: getCurrentUser });
  const [openId, setOpenId] = useState<string | null>(null);
  const [mb, setMb] = useState(false);
  const [q, setQ] = useState("");
  const locks = useLoadLocks(openId, me?.display_name || me?.email || "Faturamento");
  const today = todayISO();
  const open = range.find((l) => l.id === openId) ?? null;

  const results = useMemo(
    () => (q.trim() ? range.filter((l) => matchesSearch(l, q)) : range.filter((l) => l.load_date === today)),
    [range, q, today],
  );
  const todays = range.filter((l) => l.load_date === today);

  const tile = (l: CargoLoad) => (
    <LoadTile load={l} profile="faturamento" now={now} lockedBy={locks[l.id]} onOpen={() => setOpenId(l.id)} />
  );

  const exportDay = () =>
    downloadCSV(`cargas_${today}.csv`, todays.map((l) => ({
      Data: l.load_date, Carga: l.load_number, Placa: formatPlateLine(l), DT: l.dt,
      Transportadora: l.carrier, "Sigla destino": l.destination_code, Destino: l.destination,
      Pallets: l.pallets, "Ordem produto": l.product_order, "Ordem palete": l.pallet_order,
      Notas: l.invoice_numbers, Status: statusLabel(l.status),
      Saída: l.status === "finalizada" ? (l.has_exit === false ? "Não" : "Sim") : "", Erro: l.corte_reason,
    })));

  const exportLiquidacao = (): void => {
    const done = todays.filter((l) => l.status === "finalizada");
    if (!done.length) {
      toast.info("Nenhuma carga finalizada hoje");
      return;
    }
    downloadCSV(`liquidacao_${today}.csv`, done.map((l) => ({
      Data: l.load_date, Carga: l.load_number, Placa: l.plate, DT: l.dt, Transportadora: l.carrier,
      "Ordem produto": l.product_order, "Ordem palete": l.pallet_order, Notas: l.invoice_numbers,
      Pallets: l.pallets, Saída: l.has_exit === false ? "Não" : "Sim",
      Finalizada: l.finalized_at ? new Date(l.finalized_at).toLocaleString("pt-BR") : "",
      "Tempo total (min)": l.finalized_at ? minutesSince(l.created_at, new Date(l.finalized_at).getTime()) : "",
    })));
  };

  return (
    <div className="min-h-screen">
      <AppHeader profile="faturamento">
        <Button size="sm" variant="secondary" onClick={() => setMb(true)}>
          <PackagePlus className="h-4 w-4" /> Carga MB
        </Button>
        <Button size="sm" variant="secondary" onClick={exportDay}>
          <Download className="h-4 w-4" /> Cargas do dia
        </Button>
        <Button size="sm" variant="secondary" onClick={exportLiquidacao}>
          <Download className="h-4 w-4" /> Liquidação
        </Button>
      </AppHeader>
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
        <SearchBox value={q} onChange={setQ} />
        <section>
          <h2 className="mb-2 font-display text-lg font-bold uppercase">
            {q.trim() ? `Resultados (${results.length})` : `Cargas de hoje (${results.length})`}
          </h2>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando cargas…</p>
          ) : results.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((l) => <div key={l.id}>{tile(l)}</div>)}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              {q.trim() ? "Nenhuma carga encontrada nos últimos 30 dias." : "Nenhuma carga hoje."}
            </p>
          )}
        </section>
        <HistoryStrip title="Histórico — últimos 30 dias" items={range} render={tile} />
      </main>
      <LoadModal load={open} onClose={() => setOpenId(null)} profile="faturamento" />
      <ImportMBDialog open={mb} onOpenChange={setMb} />
    </div>
  );
}
