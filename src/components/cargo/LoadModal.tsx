import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, History, Mail, Pencil, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchClientByCenter, fetchLoadDetail, updateLoad } from "@/lib/cargo-api";
import {
  CORTE_REASONS,
  cleanDestination,
  dtSuffix,
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
}: {
  load: CargoLoad | null;
  onClose: () => void;
  profile: Profile;
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
                  <CopyValue value={Number(load.pallets ?? 0)} label="Pallets" />
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
                          <th className="p-2">ID prod.</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2 text-right">Caixas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.products.map((p) => (
                          <tr key={p.id} className="border-t">
                            <td className="p-2 font-mono">
                              <CopyValue value={p.code} label="ID do produto" />
                            </td>
                            <td className="p-2">
                              <CopyValue value={p.description} label="Descrição" />
                            </td>
                            <td className="p-2 text-right font-mono">
                              <CopyValue value={Number(p.boxes)} label="Quantidade" />
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t bg-muted/50 font-semibold">
                          <td className="p-2" colSpan={2}>
                            Total
                          </td>
                          <td className="p-2 text-right font-mono">{totalBoxes}</td>
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
      {fat && <CteDialog load={cteOpen ? load : null} onClose={() => setCteOpen(false)} />}
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
      <CopyValue value={load[field]} label={label} className="font-mono" />
      {editable && (
        <button type="button" title={`Carta de correção — ${label}`} onClick={() => { setValue(load[field] ?? ""); setEditing(true); }} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function OrdersSection({ load }: { load: CargoLoad }) {
  const qc = useQueryClient();
  const [productOrder, setProductOrder] = useState(load.product_order ?? "");
  const [palletOrder, setPalletOrder] = useState(load.pallet_order ?? "");
  const [nf, setNf] = useState(load.invoice_numbers ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    productOrder.trim() !== (load.product_order ?? "") ||
    palletOrder.trim() !== (load.pallet_order ?? "") ||
    nf.trim() !== (load.invoice_numbers ?? "");

  const save = async () => {
    setSaving(true);
    try {
      const patch = {
        product_order: productOrder.trim() || null,
        pallet_order: palletOrder.trim() || null,
        invoice_numbers: nf.trim() || null,
      };
      await updateLoad(load, patch, "Ordens / notas registradas", "faturamento",
        `Produto: ${patch.product_order ?? "—"} · Palete: ${patch.pallet_order ?? "—"} · NF: ${patch.invoice_numbers ?? "—"}`);
      qc.invalidateQueries({ queryKey: ["loads"] });
      qc.invalidateQueries({ queryKey: ["load-detail", load.id] });
      toast.success("Salvo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      {(
        [
          ["Ordem produto", productOrder, setProductOrder],
          ["Ordem palete", palletOrder, setPalletOrder],
          ["Notas (NF)", nf, setNf],
        ] as const
      ).map(([l, v, set]) => (
        <div key={l} className="space-y-1">
          <Label className="text-xs">{l}</Label>
          <Input value={v} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      <Button onClick={save} disabled={saving || !dirty}>
        <Save className="h-4 w-4" /> Salvar
      </Button>
    </section>
  );
}

type Choice = "pendente" | "faturado" | "impressa" | "corte" | "fin-com" | "fin-sem";
const CHOICES: { key: Choice; label: string; tone: string }[] = [
  { key: "pendente", label: "Pendente", tone: "bg-tone-pendente" },
  { key: "faturado", label: "Faturada", tone: "bg-tone-faturado" },
  { key: "impressa", label: "Imp. ag. CT-e", tone: "bg-tone-impressa" },
  { key: "corte", label: "Erro", tone: "bg-tone-corte" },
  { key: "fin-com", label: "Finalizada · com saída", tone: "bg-tone-fin-com text-tone-fin-com-foreground" },
  { key: "fin-sem", label: "Finalizada · sem saída", tone: "bg-tone-fin-sem" },
];

function currentChoice(l: CargoLoad): Choice {
  if (l.status === "finalizada") return l.has_exit === false ? "fin-sem" : "fin-com";
  return l.status as Choice;
}

function StatusSection({ load, onDone }: { load: CargoLoad; onDone: () => void }) {
  const qc = useQueryClient();
  const current = currentChoice(load);
  const [errorMode, setErrorMode] = useState(false);
  const [other, setOther] = useState("");

  const apply = async (c: Choice, reason?: string) => {
    if (c === current && c !== "corte") return;
    const patch: Partial<CargoLoad> =
      c === "fin-com" || c === "fin-sem"
        ? { status: "finalizada", has_exit: c === "fin-com", corte_reason: null }
        : c === "corte"
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
      <h3 className="font-display text-lg font-bold">Status da carga</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
