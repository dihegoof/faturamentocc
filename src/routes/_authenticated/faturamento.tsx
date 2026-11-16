import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Truck } from "lucide-react";
import { AccountShell } from "@/components/cargo/AccountShell";
import { AppHeader } from "@/components/cargo/AppHeader";
import { LoadModal } from "@/components/cargo/LoadModal";
import { LoadTile } from "@/components/cargo/LoadTile";
import { HistoryStrip } from "@/components/cargo/HistoryStrip";
import { SearchBox } from "@/components/cargo/SearchBox";
import { Button } from "@/components/ui/button";
import { PlateHistory } from "@/components/cargo/PlateHistory";
import { useLoadLocks, useLoadsRange, useNow, useUpdateLoad } from "@/hooks/use-loads";
import { getCurrentUser } from "@/lib/auth";
import { fetchClients, fetchContacts } from "@/lib/cargo-api";
import {
  buildCteEmail,
  canSelectWith,
  cteRecipients,
  downloadCSV,
  formatPlateLine,
  importedToday,
  isOverdue,
  matchesSearch,
  minutesSince,
  statusLabel,
  todayISO,
  validateCteSelection,
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
  const now = useNow(1000);
  const update = useUpdateLoad();
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: getCurrentUser });
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  /** Cargas marcadas no checkbox para entrar no mesmo e-mail de CT-e. */
  const [selected, setSelected] = useState<string[]>([]);
  /** Resultado do último "Solicitar CT-e": destinatários e assunto prontos. */
  const [batch, setBatch] = useState<{ to: string[]; cc: string[]; subject: string; body: string } | null>(null);
  const locks = useLoadLocks(openId, me?.display_name || me?.email || "Faturamento");
  const today = todayISO();
  const open = range.find((l) => l.id === openId) ?? null;

  const { data: contacts = [] } = useQuery({ queryKey: ["cte-contacts"], queryFn: fetchContacts });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const todays = useMemo(() => range.filter((l) => importedToday(l, today)), [range, today]);
  /** Cargas de dias anteriores que nunca foram finalizadas: pendência de checagem. */
  const pendings = useMemo(() => range.filter((l) => isOverdue(l, today)), [range, today]);
  const selectedLoads = useMemo(
    () => selected.map((id) => range.find((l) => l.id === id)).filter(Boolean) as CargoLoad[],
    [selected, range],
  );
  const carrierOf = (l: CargoLoad) =>
    l.carrier ?? clients.find((c) => c.center_code === (l.destination_code ?? "").toUpperCase())?.name ?? "";
  const results = useMemo(
    () => (q.trim() ? range.filter((l) => matchesSearch(l, q)) : todays),
    [range, q, todays],
  );

  const registerExit = (l: CargoLoad) => {
    update(l, { has_exit: true }, "Saída registrada", "faturamento").catch((e: Error) => toast.error(e.message));
    toast.success(`${l.plate ?? `Carga ${l.load_number}`}: saída registrada`);
  };
  const toggleSelect = (l: CargoLoad) => {
    setSelected((prev) => {
      if (prev.includes(l.id)) return prev.filter((id) => id !== l.id);
      const others = selectedLoads.filter((s) => s.id !== l.id);
      if (!canSelectWith(l, others, today)) {
        toast.error("Só é possível juntar cargas da mesma transportadora");
        return prev;
      }
      return [...prev, l.id];
    });
  };

  const requestCte = () => {
    const v = validateCteSelection(selectedLoads, today);
    if (!v.ok) {
      toast.error(v.error ?? "Seleção inválida");
      return;
    }
    const carrier = carrierOf(selectedLoads[0]!);
    const { to, cc } = cteRecipients(contacts, carrier);
    if (!to.length) {
      toast.error(`Nenhum e-mail cadastrado para ${carrier || "esta transportadora"}`);
      return;
    }
    const { subject, body } = buildCteEmail(
      selectedLoads.map((l) => ({ carrier: carrierOf(l), plate: l.plate ?? "", dt: l.dt ?? "" })),
    );
    setBatch({ to, cc, subject, body });
  };

  const confirmCte = async () => {
    if (!batch) return;
    const text = `Para: ${batch.to.join("; ")}\n${batch.cc.length ? `Cópia: ${batch.cc.join("; ")}\n` : ""}Assunto: ${batch.subject}\n\n${batch.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("E-mail copiado — cole no Outlook");
    } catch {
      toast.error("Não foi possível copiar; selecione o texto abaixo");
    }
  };

  const tile = (l: CargoLoad) => (
    <div className="flex items-start gap-1.5">
      <LoadTile
        load={l}
        profile="faturamento"
        now={now}
        lockedBy={locks[l.id]}
        colored={importedToday(l, today)}
        onOpen={() => setOpenId(l.id)}
        className="min-w-0 flex-1"
      />
      {l.status === "impressa" && importedToday(l, today) && (
        <label
          className="mt-1 flex shrink-0 cursor-pointer flex-col items-center gap-0.5 text-[10px] text-muted-foreground"
          title="Marcar para solicitar CT-e em lote"
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-current"
            checked={selected.includes(l.id)}
            onChange={() => toggleSelect(l)}
            aria-label={`Selecionar carga ${l.load_number} para CT-e`}
          />
          CT-e
        </label>
      )}
      {l.status === "finalizada" && l.has_exit === false && (
        <button
          type="button"
          onClick={() => registerExit(l)}
          title="Registrar saída da unidade"
          aria-label={`Registrar saída de ${l.plate ?? l.load_number}`}
          className="mt-1 shrink-0 rounded-full bg-tone-fin-com p-2 text-tone-fin-com-foreground shadow transition hover:scale-110"
        >
          <Truck className="h-4 w-4" />
        </button>
      )}
    </div>
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
    const done = todays.filter((l) => l.status === "finalizada" && l.has_exit !== false);
    if (!done.length) {
      toast.info("Nenhuma carga finalizada com saída hoje");
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
        <Button size="sm" variant="secondary" onClick={exportDay}>
          <Download className="h-4 w-4" /> Cargas do dia
        </Button>
        <Button size="sm" variant="secondary" onClick={exportLiquidacao}>
          <Download className="h-4 w-4" /> Liquidação
        </Button>
      </AppHeader>
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
        <SearchBox value={q} onChange={setQ} />
        {(q.trim() || todays.length > 0) && (
          <section>
            <h2 className="mb-2 font-display text-lg font-bold uppercase">
              {q.trim() ? `Resultados (${results.length})` : `Cargas de hoje (${results.length})`}
            </h2>
            {results.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {results.map((l) => <div key={l.id}>{tile(l)}</div>)}
              </div>
            ) : (
              <p className="py-6 text-center text-muted-foreground">Nenhuma carga encontrada nos últimos 30 dias.</p>
            )}
          </section>
        )}
        {isLoading && <p className="text-muted-foreground">Carregando cargas…</p>}

        {pendings.length > 0 && (
          <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <h2 className="mb-1 font-display text-lg font-bold uppercase text-destructive">
              Pendências — verificar ({pendings.length})
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Cargas que viraram o dia sem finalizar. Confira o que aconteceu e finalize.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {pendings.map((l) => <div key={l.id}>{tile(l)}</div>)}
            </div>
          </section>
        )}

        {!q.trim() && (
          <HistoryStrip title="Histórico de cargas" items={range} render={tile} today={today} selector />
        )}
        {selectedLoads.length > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 backdrop-blur">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3">
              <span className="text-sm">
                <strong>{selectedLoads.length}</strong> carga(s) · {carrierOf(selectedLoads[0]!) || "sem transportadora"}
              </span>
              <Button size="sm" onClick={requestCte}>
                Solicitar CT-e
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Limpar seleção
              </Button>
            </div>
          </div>
        )}

        {batch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-card p-4 shadow-xl">
              <h3 className="mb-2 font-display text-lg font-bold">E-mail de CT-e manual</h3>
              <p className="mb-1 text-sm"><strong>Para:</strong> {batch.to.join("; ")}</p>
              {batch.cc.length > 0 && <p className="mb-1 text-sm"><strong>Cópia:</strong> {batch.cc.join("; ")}</p>}
              <p className="mb-3 text-sm"><strong>Assunto:</strong> {batch.subject}</p>
              <pre className="mb-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted p-3 text-sm">
                {batch.body}
              </pre>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setBatch(null)}>
                  Fechar
                </Button>
                <Button size="sm" onClick={confirmCte}>
                  Copiar e-mail
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <LoadModal load={open} onClose={() => setOpenId(null)} profile="faturamento" loads={range} />
    </div>
  );
}
