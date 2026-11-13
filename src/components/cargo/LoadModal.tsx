import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, History, Mail, Pencil, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCatalog, fetchClientByCenter, fetchLoadDetail, updateLoad } from "@/lib/cargo-api";
import {
  CORTE_REASONS,
  cleanDestination,
  dtSuffix,
  findCatalog,
  fmtNum,
  joinList,
  palletsFor,
  plateClipboard,
  sapClipboard,
  splitList,
  normalizePlate,
  statusLabel,
  type CargoLoad,
  type Profile,
} from "@/lib/cargo";
import { cn } from "@/lib/utils";
import { CopyValue } from "./CopyValue";
import { CteDialog } from "./CteDialog";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function LoadModal({
  load,
  onClose,
  profile,
  loads = [],
}: {
  load: CargoLoad | null;
  onClose: () => void;
  profile: Profile;
  loads?: CargoLoad[];
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [cteOpen, setCteOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["load-detail", load?.id],
    queryFn: () => fetchLoadDetail(load!.id),
    enabled: !!load,
  });
  const centerCode = load?.destination_code ?? "";
  const { data: client } = useQuery({
    queryKey: ["client-by-center", centerCode],
    queryFn: () => fetchClientByCenter(centerCode),
    enabled: !!centerCode,
  });
  const fat = profile === "faturamento";
  const { data: catalog = [] } = useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog, enabled: fat });
  const totalBoxes = data?.products.reduce((s, p) => s + Number(p.boxes ?? 0), 0) ?? 0;

  return (
    <>
      <Dialog open={!!load} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          {load && (
            <>
              <DialogHeader>
                <DialogTitle className="rounded-md bg-secondary px-3 py-2.5 font-mono text-base font-semibold text-secondary-foreground">
                  <TitleLine load={load} profile={profile} />
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Carga {load.load_number}</span>·
                <span>{new Date(load.load_date + "T12:00").toLocaleDateString("pt-BR")}</span>·
                <span>
                  {fat
                    ? [load.destination_code, load.destination].filter(Boolean).join(" ")
                    : cleanDestination(load.destination)}
                </span>
                <div className="ml-auto flex gap-2">
                  {fat && (
                    <Button size="sm" variant="outline" onClick={() => setCteOpen(true)}>
                      <Mail className="h-4 w-4" /> CT-e
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
                    <History className="h-4 w-4" /> Ações
                  </Button>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <Field label="Placa">
                  <Correctable load={load} field="plate" editable={fat} />
                </Field>
                {fat && (
                  <Field label="DT">
                    <Correctable load={load} field="dt" editable={fat} />
                  </Field>
                )}
                <Field label="Cód. cliente">
                  <CopyValue value={client?.customer_code} label="Código do cliente" />
                </Field>
                <Field label="Pallets">
                  <CopyValue value={fmtNum(load.pallets)} label="Pallets" />
                </Field>
                <Field label="Transportadora">{load.carrier || "—"}</Field>
                <Field label="Origem">{load.origin || "—"}</Field>
                <Field label="Notas">{load.invoice_numbers || "—"}</Field>
                {client && <Field label="Cliente">{client.name}</Field>}
              </dl>

              <section>
                <h3 className="mb-2 font-display text-lg font-bold">Produtos</h3>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                ) : data?.products.length ? (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="p-2">{fat ? "Cód. SAP" : "ID prod."}</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2 text-right">Caixas</th>
                          <th className="p-2 text-right">Paletes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.products.map((p) => {
                          const c = findCatalog(catalog, p.code);
                          const sap = (fat && c?.sap_code) || p.code || "";
                          const boxes = Number(p.boxes ?? 0);
                          const pallets = c ? palletsFor(boxes, Number(c.boxes_per_pallet)) : 0;
                          return (
                            <tr key={p.id} className="border-t">
                              <td className="p-2 font-mono">
                                {fat ? (
                                  <CopyValue value={sap} copyText={sapClipboard(sap, boxes)} label="Código SAP e caixas" />
                                ) : (
                                  <CopyValue value={p.code} label="ID do produto" />
                                )}
                              </td>
                              <td className="p-2">
                                <CopyValue value={(fat && c?.short_name) || p.description} label="Descrição" strong={false} />
                              </td>
                              <td className="p-2 text-right font-mono">
                                <CopyValue value={fmtNum(boxes)} copyText={String(boxes)} label="Quantidade" />
                              </td>
                              <td className="p-2 text-right font-mono">{pallets ? fmtNum(pallets) : "—"}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t bg-muted/50 font-semibold">
                          <td className="p-2" colSpan={2}>
                            Total
                          </td>
                          <td className="p-2 text-right font-mono">{fmtNum(totalBoxes)}</td>
                          <td className="p-2 text-right font-mono">{fmtNum(load.pallets)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem produtos cadastrados.</p>
                )}
              </section>

              {fat && <OrdersSection key={`o-${load.id}`} load={load} />}

              {fat ? (
                <StatusSection key={`s-${load.id}`} load={load} onDone={onClose} />
              ) : (
                load.status === "corte" &&
                load.corte_reason && (
                  <div className="rounded-md bg-destructive px-3 py-2 font-semibold text-destructive-foreground">
                    Erro: {load.corte_reason}
                  </div>
                )
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={logOpen && !!load} onOpenChange={setLogOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Ações — carga {load?.load_number}</DialogTitle>
          </DialogHeader>
          <ol className="relative space-y-3 border-l-2 border-primary/30 pl-4">
            {data?.history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full bg-primary" />
                <div className="text-sm font-semibold">
                  {h.event}
                  {h.to_status && (
                    <span className="font-normal text-muted-foreground"> → {statusLabel(h.to_status)}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmt(h.created_at)} · {h.profile}
                  {h.details ? ` · ${h.details}` : ""}
                </div>
              </li>
            ))}
            {!data?.history.length && <p className="text-sm text-muted-foreground">Sem ações.</p>}
          </ol>
        </DialogContent>
      </Dialog>
      {fat && (
        <CteDialog
          loads={cteOpen && load ? [load] : null}
          candidates={loads.filter((l) => l.status === "impressa")}
          onClose={() => setCteOpen(false)}
        />
      )}
    </>
  );
}

function TitleLine({ load, profile }: { load: CargoLoad; profile: Profile }) {
  const plate = normalizePlate(load.plate ?? "") || "—";
  const oldPlate = load.plate_original && load.plate_original !== load.plate ? load.plate_original : null;
  const oldDt = load.dt_original && load.dt_original !== load.dt ? load.dt_original : null;
  return (
    <span>
      {oldPlate && <s className="mr-1 opacity-50">{normalizePlate(oldPlate)}</s>}
      {plate}
      {profile === "faturamento" && (
        <>
          {" ED - "}
          {oldDt && <s className="mr-1 opacity-50">{dtSuffix(oldDt)}</s>}
          {dtSuffix(load.dt)}
        </>
      )}
      {" | "}
      {load.carrier || "—"}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2">
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}

/** Carta de correção: the old value stays struck through next to the corrected one. */
function Correctable({
  load,
  field,
  editable,
}: {
  load: CargoLoad;
  field: "plate" | "dt";
  editable: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(load[field] ?? "");
  const origKey = field === "plate" ? "plate_original" : "dt_original";
  const original = load[origKey];
  const label = field === "plate" ? "Placa" : "DT";

  const save = async () => {
    const next = field === "plate" ? normalizePlate(value) : value.replace(/\D/g, "");
    if (!next || next === load[field]) return setEditing(false);
    try {
      await updateLoad(
        load,
        { [field]: next, [origKey]: original ?? load[field] } as Partial<CargoLoad>,
        `Carta de correção — ${label}`,
        "faturamento",
        `${load[field] || "—"} → ${next}`,
      );
      qc.invalidateQueries({ queryKey: ["loads"] });
      qc.invalidateQueries({ queryKey: ["load-detail", load.id] });
      toast.success(`${label} corrigido`);
      setEditing(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (editing)
    return (
      <span className="flex items-center gap-1">
        <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} className="h-7 px-1.5 font-mono text-xs" onKeyDown={(e) => e.key === "Enter" && void save()} />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save} aria-label="Salvar correção"><Check className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)} aria-label="Cancelar"><X className="h-4 w-4" /></Button>
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-1">
      {original && original !== load[field] && (
        <s className="font-mono text-xs text-muted-foreground">{original}</s>
      )}
      <CopyValue
        value={load[field]}
        copyText={field === "plate" ? plateClipboard(load.plate) : undefined}
        label={label}
        className="font-mono"
      />
      {editable && (
        <button type="button" title={`Carta de correção — ${label}`} onClick={() => { setValue(load[field] ?? ""); setEditing(true); }} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/** Pills: type or paste, Enter / comma / leaving the field adds it and saves right away. */
function PillInput({ label, value, onSave }: { label: string; value: string | null; onSave: (v: string | null) => Promise<void> }) {
  const items = splitList(value);
  const [draft, setDraft] = useState("");
  const commit = async (next: string[]) => {
    try { await onSave(joinList(next)); } catch (e) { toast.error((e as Error).message); }
  };
  const add = () => {
    const extra = splitList(draft);
    setDraft("");
    if (extra.some((x) => !items.includes(x))) void commit([...items, ...extra]);
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border bg-background px-1.5 py-1">
        {items.map((it) => (
          <span key={it} className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold">
            {it}
            <button type="button" aria-label={`Remover ${it}`} onClick={() => void commit(items.filter((x) => x !== it))}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          onPaste={(e) => { e.preventDefault(); const t = e.clipboardData.getData("text"); const extra = splitList(t); if (extra.length) void commit([...items, ...extra.filter((x) => !items.includes(x))]); }}
          onBlur={add}
          className="min-w-16 flex-1 bg-transparent px-1 text-sm outline-none"
          aria-label={label}
        />
      </div>
    </div>
  );
}

function OrdersSection({ load }: { load: CargoLoad }) {
  const qc = useQueryClient();
  const save = (field: "product_order" | "pallet_order" | "invoice_numbers", label: string) => async (v: string | null) => {
    if (v === (load[field] ?? null)) return;
    await updateLoad(load, { [field]: v } as Partial<CargoLoad>, `${label} atualizada`, "faturamento", v ?? "—");
    qc.invalidateQueries({ queryKey: ["loads"] });
    qc.invalidateQueries({ queryKey: ["load-detail", load.id] });
  };
  return (
    <section className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
      <PillInput label="Ordem produto" value={load.product_order} onSave={save("product_order", "Ordem produto")} />
      <PillInput label="Ordem palete" value={load.pallet_order} onSave={save("pallet_order", "Ordem palete")} />
      <PillInput label="Notas (NF) — opcional" value={load.invoice_numbers} onSave={save("invoice_numbers", "Notas")} />
    </section>
  );
}

type Choice = "pendente" | "faturado" | "impressa" | "corte" | "finalizada";
const CHOICES: { key: Choice; label: string; tone: string }[] = [
  { key: "pendente", label: "Pendente", tone: "bg-tone-pendente" },
  { key: "faturado", label: "Faturada", tone: "bg-tone-faturado" },
  { key: "impressa", label: "Imp. ag. CT-e", tone: "bg-tone-impressa" },
  { key: "corte", label: "Erro", tone: "bg-tone-corte" },
  { key: "finalizada", label: "Finalizada", tone: "bg-tone-fin-com text-tone-fin-com-foreground" },
];

const currentChoice = (l: CargoLoad) => l.status as Choice;

function StatusSection({ load, onDone }: { load: CargoLoad; onDone: () => void }) {
  const qc = useQueryClient();
  const current = currentChoice(load);
  const [errorMode, setErrorMode] = useState(false);
  const [other, setOther] = useState("");

  const setExit = async (exit: boolean) => {
    if (load.status === "finalizada" && load.has_exit === exit) return;
    try {
      await updateLoad(load, { status: "finalizada", has_exit: exit, corte_reason: null },
        exit ? "Finalizada — com saída" : "Finalizada — sem saída", "faturamento");
      qc.invalidateQueries({ queryKey: ["loads"] });
      toast.success(`Carga ${load.load_number}: finalizada ${exit ? "com" : "sem"} saída`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const apply = async (c: Choice, reason?: string) => {
    if (c === current && c !== "corte") return;
    if (c === "finalizada") return setExit(false);
    const patch: Partial<CargoLoad> =
      c === "corte"
          ? { status: "corte", corte_reason: reason ?? null }
          : { status: c, corte_reason: null, has_exit: null };
    if (c === "impressa" && !load.cte_received_at) patch.cte_received_at = new Date().toISOString();
    const label = CHOICES.find((x) => x.key === c)?.label ?? c;
    try {
      await updateLoad(load, patch, `Status: ${label}`, "faturamento", reason);
      qc.invalidateQueries({ queryKey: ["loads"] });
      toast.success(`Carga ${load.load_number}: ${label}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="space-y-2 border-t pt-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CHOICES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => (c.key === "corte" ? setErrorMode(true) : void apply(c.key))}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-semibold transition",
              c.tone,
              current === c.key ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100",
            )}
          >
            {current === c.key && <Check className="mr-1 inline h-4 w-4" />}
            {c.label}
          </button>
        ))}
      </div>
      {current === "finalizada" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
          <span className="font-semibold">Saiu da unidade?</span>
          {([[true, "Com saída"], [false, "Sem saída"]] as const).map(([v, l]) => (
            <button key={l} type="button" onClick={() => void setExit(v)}
              className={cn("rounded-md px-3 py-1.5 font-semibold", v ? "bg-tone-fin-com text-tone-fin-com-foreground" : "bg-tone-fin-sem",
                (load.has_exit === true) === v ? "ring-2 ring-foreground" : "opacity-60 hover:opacity-100")}>
              {(load.has_exit === true) === v && <Check className="mr-1 inline h-4 w-4" />}{l}
            </button>
          ))}
          <span className="text-xs text-muted-foreground">Só “com saída” entra na liquidação.</span>
        </div>
      )}
      {errorMode && (
        <div className="space-y-2 rounded-md border border-destructive/40 p-3">
          <p className="text-sm font-semibold">Motivo do erro (aparece para a Remessa):</p>
          <div className="flex flex-wrap gap-2">
            {CORTE_REASONS.map((r) => (
              <Button key={r} size="sm" variant="outline" onClick={() => apply("corte", r)}>
                {r}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Outro motivo…" value={other} onChange={(e) => setOther(e.target.value)} />
            <Button disabled={!other.trim()} onClick={() => apply("corte", other.trim())}>
              Marcar erro
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
