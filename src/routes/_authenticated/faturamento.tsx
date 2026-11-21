import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, Copy, Download, Mail, Truck } from "lucide-react";
import { AccountShell } from "@/components/cargo/AccountShell";
import { AppHeader } from "@/components/cargo/AppHeader";
import { LoadModal } from "@/components/cargo/LoadModal";
import { LoadTile } from "@/components/cargo/LoadTile";
import { HistoryStrip } from "@/components/cargo/HistoryStrip";
import { SearchBox } from "@/components/cargo/SearchBox";
import { Button } from "@/components/ui/button";
import { PlateHistory } from "@/components/cargo/PlateHistory";
import { AgendaImportDialog } from "@/components/cargo/AgendaImportDialog";
import { ListFilter } from "@/components/cargo/ListFilter";
import { LiquidationDialog } from "@/components/cargo/LiquidationDialog";
import { LiquidationPending } from "@/components/cargo/LiquidationPending";
import { useLoadLocks, useLoadsRange, useNow, useUpdateLoad } from "@/hooks/use-loads";
import { getCurrentUser } from "@/lib/auth";
import { agendaSyncOn, fetchClients, fetchContacts } from "@/lib/cargo-api";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildCteEmail,
  buildDtSwapEmail,
  carrierMatches,
  cteRecipients,
  mailtoHref,
  canSelectWith,
  downloadCSV,
  formatPlateLine,
  applyFilters,
  countsTime,
  importedToday,
  isAgendaLocked,
  isAwaitingRemessa,
  isFutureLoad,
  isOverdue,
  lockReason,
  NO_FILTERS,
  showsInToday,
  sortByReadiness,
  type ListFilters,
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
  const [batch, setBatch] = useState<{ to: string[]; cc: string[]; carrier: string } | null>(null);
  /** E-mail da transportadora escolhido no modal de CT-e. */
  const [cteFrom, setCteFrom] = useState("");
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [liqOpen, setLiqOpen] = useState(false);
  const meName = me?.display_name ?? me?.email ?? "Faturamento";
  /** Filtros do funil. */
  const [filters, setFilters] = useState<ListFilters>(NO_FILTERS);
  /** O botão da agenda só existe quando o sistema está ligado no Painel. */
  const { data: agendaOn = false } = useQuery({ queryKey: ["agenda-sync"], queryFn: agendaSyncOn });
  /** Troca de DT formalizada por e-mail: DT antigo x novo. */
  const [dtSwap, setDtSwap] = useState<{
    oldDt: string;
    newDt: string;
    plate: string | null;
    carrier: string | null;
    load: CargoLoad;
  } | null>(null);
  const locks = useLoadLocks(openId, me?.display_name || me?.email || "Faturamento");
  const today = todayISO();
  const open = range.find((l) => l.id === openId) ?? null;

  const { data: contacts = [] } = useQuery({ queryKey: ["cte-contacts"], queryFn: fetchContacts });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  /** Cargas de hoje: pela data prevista da carga, não pela data de importação. */
  const todays = useMemo(
    () => sortByReadiness(range.filter((l) => showsInToday(l, today)), today),
    [range, today],
  );
  /** Previstas para depois de hoje. */
  const future = useMemo(() => range.filter((l) => isFutureLoad(l, today)), [range, today]);
  /** Cargas de dias anteriores que nunca foram finalizadas: pendência de checagem. */
  /** Pendências: as não finalizadas de dias anteriores MAIS as aguardando Remessa. */
  const pendings = useMemo(
    () => sortByReadiness(
      range.filter((l) => isOverdue(l, today) || isAgendaLocked(l)),
      today,
    ),
    [range, today],
  );
  const selectedLoads = useMemo(
    () => selected.map((id) => range.find((l) => l.id === id)).filter(Boolean) as CargoLoad[],
    [selected, range],
  );
  const carrierOf = (l: CargoLoad) =>
    l.carrier ?? clients.find((c) => c.center_code === (l.destination_code ?? "").toUpperCase())?.name ?? "";

  /** E-mails cadastrados da transportadora das cargas marcadas.
   *  Declarado DEPOIS de selectedLoads e carrierOf de propósito: usa os dois. */
  const carrierEmails = useMemo(
    () => contacts.filter((c) => c.kind === "carrier" && carrierMatches(c.carrier, carrierOf(selectedLoads[0] ?? ({} as CargoLoad)))),
    [contacts, selectedLoads, clients],
  );
  /** Só o que entrou na operação: as aguardando Remessa vivem nas Pendências. */
  const visibleToday = useMemo(
    () => applyFilters([...todays, ...future], filters, today),
    [todays, future, filters, today],
  );
  const results = useMemo(
    () => (q.trim() ? range.filter((l) => matchesSearch(l, q)) : visibleToday),
    [range, q, visibleToday],
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
    const { to } = cteRecipients(contacts, carrier);
    if (!to.length) {
      toast.error(`Nenhum e-mail cadastrado para ${carrier || "esta transportadora"}`);
      return;
    }
    setCteFrom("");
    setBatch({ to, cc: [], carrier });
  };

  /** Monta o e-mail de CT-e com as escolhas do modal e abre no Outlook. */
  const openCteMail = () => {
    if (!batch) return;
    const chosen = cteFrom ? [cteFrom] : carrierEmails.map((c) => c.email);
    const to = [...chosen, ...batch.to.filter((e) => !chosen.includes(e))];
    const { cc } = cteRecipients(contacts, batch.carrier);
    const { subject, body } = buildCteEmail(
      selectedLoads.map((l) => ({ carrier: carrierOf(l), plate: l.plate ?? "", dt: l.dt ?? "" })),
      { carrier: batch.carrier, to },
    );
    window.location.href = mailtoHref(to, cc, subject, body);
    setBatch(null);
    setSelected([]);
  };

  const tile = (l: CargoLoad) => {
    /** Alguém com a carga aberta, ou carga da agenda ainda não liberada. */
    const locked = !!locks[l.id] || isAgendaLocked(l) || isFutureLoad(l, today);
    return (
    <div className="flex items-start gap-1.5">
      <LoadTile
        load={l}
        profile="faturamento"
        now={now}
        lockedBy={locks[l.id]}
        colored={importedToday(l, today)}
        showTime={countsTime(l, today)}
        onOpen={() => { if (!locked) setOpenId(l.id); }}
        className={cn("min-w-0 flex-1", locked && "cursor-not-allowed opacity-55 saturate-50")}
        aria-disabled={locked}
        title={lockReason(l, today) ?? undefined}
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
  };

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
        <Button size="sm" variant="secondary" onClick={() => setLiqOpen(true)}>
          <Download className="h-4 w-4" /> Liquidação
        </Button>
        {agendaOn && (
          <Button size="sm" variant="secondary" onClick={() => setAgendaOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> Importar agenda
          </Button>
        )}
      </AppHeader>
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-6">
        <SearchBox value={q} onChange={setQ} />
        <LiquidationPending user={meName} />
        {(q.trim() || todays.length > 0) && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-display text-lg font-bold uppercase">
                {q.trim() ? `Resultados (${results.length})` : `Cargas de hoje (${visibleToday.length})`}
              </h2>
              {!q.trim() && <ListFilter filters={filters} onChange={setFilters} />}
            </div>
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
              Pendências — verificar ({applyFilters(pendings, filters, today).length})
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Cargas que viraram o dia sem finalizar. Confira o que aconteceu e finalize.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {applyFilters(pendings, filters, today).map((l) => (
                <div key={l.id}>{tile(l)}</div>
              ))}
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
              <p className="mb-3 text-sm text-muted-foreground">
                {selectedLoads.length} carga(s) · {batch.carrier || "sem transportadora"}
              </p>

              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Menção da transportadora <span className="text-destructive">*</span></Label>
                  <select
                    value={cteFrom}
                    onChange={(e) => setCteFrom(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="">
                      {carrierEmails.length ? "Todos da transportadora" : "Nenhum cadastrado"}
                    </option>
                    {carrierEmails.map((c) => (
                      <option key={c.email} value={c.email}>{c.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mb-1 text-sm"><strong>Para:</strong> {(cteFrom ? [cteFrom] : batch.to).join("; ")}</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Torre entra sempre no Para · pessoal fixo entra em Cópia
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBatch(null)}>Cancelar</Button>
                <Button onClick={openCteMail}>Abrir e-mail</Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <LiquidationDialog
        open={liqOpen}
        onOpenChange={setLiqOpen}
        loads={range}
        user={meName}
        initialDate={today}
      />
      <AgendaImportDialog
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        uploadedBy={me?.display_name ?? me?.email ?? undefined}
      />
      {dtSwap && (
        <DtSwapDialog
          key={`${dtSwap.load.id}-${dtSwap.newDt}`}
          swap={dtSwap}
          contacts={contacts}
          onClose={() => setDtSwap(null)}
        />
      )}
      <LoadModal
        load={open}
        onClose={() => setOpenId(null)}
        profile="faturamento"
        loads={range}
        onDtChanged={(info) => setDtSwap(info)}
      />
    </div>
  );
}

/**
 * Troca de DT formalizada por e-mail.
 * O DT novo NÃO está gravado ainda: só é efetivado ao confirmar aqui.
 * Cancelar mantém o DT antigo.
 */
function DtSwapDialog({
  swap,
  contacts,
  onClose,
}: {
  swap: {
    oldDt: string;
    newDt: string;
    plate: string | null;
    carrier: string | null;
    load: CargoLoad;
  };
  contacts: Parameters<typeof cteRecipients>[0];
  onClose: () => void;
}) {
  const update = useUpdateLoad();
  const [mdfe, setMdfe] = useState(false);
  const [motivo, setMotivo] = useState("faturamento inverter SKU");
  const [nfs, setNfs] = useState("");
  const [busy, setBusy] = useState(false);
  /** Vira true depois que o e-mail foi aberto: libera a confirmação da troca. */
  const [mailSent, setMailSent] = useState(false);

  const carrierContacts = useMemo(
    () => contacts.filter((c) => c.kind === "carrier" && carrierMatches(c.carrier, swap.carrier)),
    [contacts, swap.carrier],
  );

  /** Destinatário e cópia, editáveis como no CT-e manual. */
  const auto = useMemo(() => cteRecipients(contacts, swap.carrier ?? ""), [contacts, swap.carrier]);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  /** Menção da 2ª linha: começa no 1º contato da lista. */
  const [fromEmail, setFromEmail] = useState("");

  const toList = useMemo(
    () => (to ? to.split(/[;,\n]/).map((e) => e.trim()).filter(Boolean) : auto.to),
    [to, auto.to],
  );
  const ccList = useMemo(
    () => (cc ? cc.split(/[;,\n]/).map((e) => e.trim()).filter(Boolean) : auto.cc),
    [cc, auto.cc],
  );

  const { subject, body } = buildDtSwapEmail({
    oldDt: swap.oldDt,
    newDt: swap.newDt,
    plate: swap.plate,
    carrier: swap.carrier,
    mdfe,
    motivo,
    nfs,
    mention: fromEmail || carrierContacts[0]?.email || "",
  });

  /** 1º passo: só abre o Outlook. O DT ainda NÃO mudou. */
  const openMail = () => {
    window.location.href = mailtoHref(toList, ccList, subject, body);
    setMailSent(true);
  };

  /** 2º passo: o usuário confirma que disparou o e-mail — só agora o DT muda. */
  const confirmSwap = async () => {
    setBusy(true);
    try {
      await update(
        swap.load,
        { dt: swap.newDt, dt_original: swap.oldDt } as Partial<CargoLoad>,
        "Troca de DT",
        "faturamento",
        `${swap.oldDt || "—"} → ${swap.newDt}`,
      );
      toast.success(`DT alterado: ${swap.oldDt || "—"} → ${swap.newDt}`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`Assunto: ${subject}\n\n${body}`);
      toast.success("Mensagem copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Troca de DT</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-xs">Para <span className="text-destructive">*</span></Label>
          <Textarea
            rows={2}
            value={to || toList.join("; ")}
            onChange={(e) => setTo(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Cc</Label>
          <Textarea
            rows={2}
            value={cc || ccList.join("; ")}
            onChange={(e) => setCc(e.target.value)}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Assunto</Label>
          <Input value={subject} readOnly className="h-9" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={mdfe} onCheckedChange={(v) => setMdfe(v === true)} />
            Esta carga tem MDF-e?
          </label>
          <div className="space-y-1">
            <Label className="text-xs">Menção da transportadora</Label>
            <select
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="">
                {carrierContacts.length ? "1º contato da lista" : "Nenhum cadastrado"}
              </option>
              {carrierContacts.map((c) => (
                <option key={c.email} value={c.email}>{c.email}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notas fiscais <span className="text-destructive">*</span></Label>
            <Input
              value={nfs}
              onChange={(e) => setNfs(e.target.value)}
              placeholder="117254 e 117255-2"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Motivo <span className="text-destructive">*</span></Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-9" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Mensagem</Label>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted p-3 text-sm">
            {body}
          </pre>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <span className="mr-auto text-sm text-muted-foreground">
            {mailSent
              ? `E-mail enviado? Confirmar a troca para ${swap.newDt}`
              : "Abra o e-mail primeiro. A troca só é efetivada depois que você confirmar."}
          </span>
          <Button variant="outline" onClick={copiar} disabled={busy}>
            <Copy className="mr-1 h-4 w-4" /> Copiar mensagem
          </Button>
          <Button variant="outline" onClick={openMail} disabled={busy}>
            <Mail className="mr-1 h-4 w-4" /> Abrir no Outlook
          </Button>
          <Button onClick={confirmSwap} disabled={busy || !mailSent}>
            {busy ? "Alterando…" : "Confirmar que solicitei"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
