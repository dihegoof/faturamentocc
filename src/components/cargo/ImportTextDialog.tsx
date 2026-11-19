import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { checkBoxes, diffAgendaProducts, fmtNum, parseCargoText, formatPlateLine, type ParsedLoad } from "@/lib/cargo";
import { agendaSyncOn, confirmFromRemessa, fetchCatalog, importLoads, matchAgendaByDt, platePalletAlert } from "@/lib/cargo-api";
import { supabase } from "@/integrations/supabase/client";

export function ImportTextDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  type ReviewRow = ParsedLoad & {
    duplicate: boolean;
    /** DT da agenda: existe = a Remessa confirma; null = carga nova. */
    agendaLoadId: string | null;
    diff: string[];
    palletAlert: string | null;
  };
  const [review, setReview] = useState<ReviewRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  /** Ligada, "já existe" deixa de ser duplicata e passa a ser casamento. */
  const { data: agendaOn = false } = useQuery({ queryKey: ["agenda-sync"], queryFn: agendaSyncOn });

  const analyze = async () => {
    const { loads, errors } = parseCargoText(text);
    setErrors(errors);
    if (!loads.length) return setReview([]);

    const catalog = await fetchCatalog().catch(() => []);
    loads.forEach((l) =>
      l.warnings.push(
        ...checkBoxes(
          l.products,
          catalog.map((c) => ({ ...c, boxes_per_pallet: Number(c.boxes_per_pallet) })),
        ),
      ),
    );

    // Com a Sincronização da Agenda ligada, o casamento é pelo DT: a carga
    // já existe de propósito, e a Remessa vem completar placa/transportadora.
    if (agendaOn) {
      const dts = loads.map((l) => l.dt).filter(Boolean);
      const matches = await matchAgendaByDt(dts).catch(() => []);
      const byDt = new Map(matches.map((m) => [m.dt, m]));

      const rows: ReviewRow[] = [];
      for (const l of loads) {
        const m = byDt.get(l.dt);
        let diff: string[] = [];
        if (m) {
          const { data: prods } = await supabase
            .from("cargo_products")
            .select("code, boxes")
            .eq("load_id", m.load_id);
          diff = diffAgendaProducts(
            (prods ?? []).map((p) => ({ code: p.code ?? "", boxes: Number(p.boxes ?? 0) })),
            l.products.map((p) => ({ code: p.code, boxes: p.boxes })),
          );
        }
        const palletAlert = l.plate ? await platePalletAlert(l.plate).catch(() => null) : null;
        rows.push({ ...l, duplicate: false, agendaLoadId: m?.load_id ?? null, diff, palletAlert });
      }
      setReview(rows);
      return;
    }

    const { data } = await supabase
      .from("cargo_loads")
      .select("load_date, load_number")
      .in(
        "load_number",
        loads.map((l) => l.load_number),
      );
    const existing = new Set((data ?? []).map((d) => `${d.load_date}|${d.load_number}`));
    setReview(
      loads.map((l) => ({
        ...l,
        duplicate: existing.has(`${l.load_date}|${l.load_number}`),
        agendaLoadId: null,
        diff: [],
        palletAlert: null,
      })),
    );
  };

  const save = async () => {
    if (!review) return;
    setSaving(true);
    try {
      // Fluxo da agenda: confirma as casadas e cria as que vieram de fora.
      if (agendaOn) {
        let confirmed = 0;
        let created = 0;
        for (const r of review) {
          if (r.agendaLoadId) {
            await confirmFromRemessa(
              r.dt, r.plate, r.carrier, "remessa",
              r.diff.length ? `Divergências: ${r.diff.join("; ")}` : undefined,
            );
            confirmed++;
          }
        }
        const novas = review.filter((r) => !r.agendaLoadId);
        if (novas.length) {
          const { inserted } = await importLoads(novas, "texto");
          created = inserted;
        }
        toast.success(
          `${confirmed} carga(s) confirmada(s) na agenda${created ? ` · ${created} criada(s) fora da agenda` : ""}`,
        );
        qc.invalidateQueries({ queryKey: ["loads"] });
        setText("");
        setReview(null);
        onOpenChange(false);
        return;
      }

      const { inserted, skipped } = await importLoads(
        review.filter((l) => !l.duplicate),
        "texto",
      );
      toast.success(
        `${inserted} carga(s) importada(s) como Pendente${skipped.length ? ` · ${skipped.length} duplicada(s) ignorada(s)` : ""}`,
      );
      qc.invalidateQueries({ queryKey: ["loads"] });
      setText("");
      setReview(null);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Importar cargas (colar e-mail / planilha)
          </DialogTitle>
        </DialogHeader>
        {!review ? (
          <>
            <p className="text-sm text-muted-foreground">Insira as cargas — cole as linhas da planilha.</p>
            <Textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Insira as cargas…"
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button onClick={analyze} disabled={!text.trim()}>
                Analisar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {errors.map((e) => (
              <div key={e} className="rounded bg-destructive/10 p-2 text-sm text-destructive">
                {e}
              </div>
            ))}
            <div className="space-y-2">
              {review.map((l) => (
                <div
                  key={l.load_number}
                  className={`rounded-md border p-3 ${l.duplicate ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-display text-lg font-bold">Carga {l.load_number}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {l.load_date.split("-").reverse().join("/")}
                      </span>
                    </div>
                    {agendaOn && l.agendaLoadId && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                        Confirma na agenda
                      </span>
                    )}
                    {agendaOn && !l.agendaLoadId && (
                      <span className="rounded bg-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-900">
                        Fora da agenda — será criada
                      </span>
                    )}
                    {!agendaOn && l.duplicate && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold">
                        Já existe — será ignorada
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {formatPlateLine(l, "remessa")}
                    {l.dt ? ` · DT ${l.dt}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {l.origin} → {l.destination_code ? `${l.destination_code} ` : ""}
                    {l.destination} · {fmtNum(l.pallets)} pallets · {l.products.length} produto(s) ·{" "}
                    {fmtNum(l.products.reduce((s, p) => s + p.boxes, 0))} caixas
                  </div>
                  {l.diff.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs font-semibold text-amber-800">
                      {l.diff.map((d) => <li key={d}>• {d}</li>)}
                    </ul>
                  )}
                  {l.palletAlert && (
                    <p className="mt-1 text-xs font-semibold text-amber-800">• {l.palletAlert}</p>
                  )}
                  {l.warnings.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {l.warnings.map((w) => (
                        <li
                          key={w}
                          className="flex items-center gap-1 text-xs font-semibold text-warning-foreground"
                        >
                          <AlertTriangle className="h-3 w-3 text-warning" /> {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReview(null)}>
                Voltar e editar
              </Button>
              {agendaOn ? (
                <Button onClick={save} disabled={saving || !review.length}>
                  {saving
                    ? "Gravando…"
                    : `Confirmar ${review.filter((l) => l.agendaLoadId).length} e criar ${review.filter((l) => !l.agendaLoadId).length}`}
                </Button>
              ) : (
                <Button onClick={save} disabled={saving || !review.some((l) => !l.duplicate)}>
                  Gravar {review.filter((l) => !l.duplicate).length} carga(s)
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
