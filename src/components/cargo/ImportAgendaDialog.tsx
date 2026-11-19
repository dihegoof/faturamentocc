import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import {
  diffAgendaProducts,
  fmtNum,
  formatPlateLine,
  parseCargoText,
  type ParsedLoad,
} from "@/lib/cargo";
import {
  confirmFromRemessa,
  matchAgendaByDt,
  platePalletAlert,
} from "@/lib/cargo-api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MatchRow {
  load: ParsedLoad;
  /** Carga já criada pela agenda, achada pelo DT. */
  agendaLoadId: string | null;
  diff: string[];
  palletAlert: string | null;
  /** Veio da Remessa e não estava na agenda. */
  outside: boolean;
}

/**
 * Importação da Remessa quando a Sincronização da Agenda está ligada.
 * Casa pelo DT com o que o Faturamento já subiu: completa placa e
 * transportadora, anota divergência e avisa sobre pallets — sem bloquear.
 * Carga que não existe na agenda é criada igual, marcada como fora da agenda.
 */
export function ImportAgendaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const analyze = async () => {
    const { loads, errors } = parseCargoText(text);
    if (errors.length) toast.error(errors[0]!);
    if (!loads.length) {
      setRows([]);
      return;
    }

    const dts = loads.map((l) => l.dt).filter(Boolean);
    const matches = await matchAgendaByDt(dts).catch(() => []);
    const byDt = new Map(matches.map((m) => [m.dt, m]));

    const built: MatchRow[] = [];
    for (const l of loads) {
      const m = byDt.get(l.dt);
      // Divergência de produto: o app não sobrescreve o que a agenda trouxe.
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
      built.push({
        load: l,
        agendaLoadId: m?.load_id ?? null,
        diff,
        palletAlert,
        outside: !m,
      });
    }
    setRows(built);
  };

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    try {
      let confirmed = 0;
      let created = 0;

      for (const r of rows) {
        const l = r.load;
        if (r.agendaLoadId) {
          await confirmFromRemessa(
            l.dt, l.plate, l.carrier, "remessa",
            r.diff.length ? `Divergências: ${r.diff.join("; ")}` : undefined,
          );
          confirmed++;
        } else {
          // Não estava na agenda: cria normalmente e marca em laranja.
          const { data, error } = await supabase
            .from("cargo_loads")
            .insert({
              load_date: l.load_date,
              load_number: l.load_number,
              origin: l.origin,
              destination: l.destination,
              destination_code: l.destination_code || null,
              carrier: l.carrier,
              plate: l.plate,
              dt: l.dt || null,
              pallets: l.pallets,
              status: "pendente",
              source: "texto",
              outside_agenda: true,
              pallet_alert: !!r.palletAlert,
              pallet_alert_text: r.palletAlert,
            })
            .select("id")
            .single();
          if (error) {
            if (error.code === "23505") continue;
            throw error;
          }
          if (l.products.length) {
            await supabase.from("cargo_products").insert(
              l.products.map((p) => ({
                code: p.code, description: p.description, boxes: p.boxes, load_id: data.id,
              })),
            );
          }
          created++;
        }
      }

      toast.success(
        `${confirmed} carga(s) confirmada(s) na agenda · ${created} criada(s) fora da agenda`,
      );
      qc.invalidateQueries({ queryKey: ["loads"] });
      setText("");
      setRows(null);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const alerts = rows?.filter((r) => r.diff.length || r.palletAlert) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Importar cargas — conferência com a agenda
          </DialogTitle>
        </DialogHeader>

        {!rows ? (
          <>
            <p className="text-sm text-muted-foreground">
              Cole as linhas da Remessa. O app procura cada carga pelo <strong>DT</strong> na agenda
              do Faturamento e completa placa e transportadora.
            </p>
            <Textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Insira as cargas…"
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button onClick={analyze} disabled={!text.trim()}>Analisar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm">
              <strong>{rows.length}</strong> carga(s) lida(s) ·{" "}
              <strong>{rows.filter((r) => !r.outside).length}</strong> casaram com a agenda ·{" "}
              <strong>{rows.filter((r) => r.outside).length}</strong> fora da agenda
            </p>

            {alerts.length > 0 && (
              <div className="rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Divergências e avisos de pallets
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {alerts.map((r) => (
                    <li key={r.load.load_number}>
                      Carga {r.load.load_number}
                      {r.palletAlert ? ` · ${r.palletAlert}` : ""}
                      {r.diff.length > 0 && <> · {r.diff.join("; ")}</>}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs">Nada é bloqueado — os avisos ficam registrados.</p>
              </div>
            )}

            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.load.load_number}
                  className={cn(
                    "rounded-md border p-3",
                    r.outside && "border-orange-300 bg-orange-50",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-display text-lg font-bold">Carga {r.load.load_number}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.load.load_date.split("-").reverse().join("/")}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-semibold",
                        r.outside ? "bg-orange-200 text-orange-900" : "bg-muted",
                      )}
                    >
                      {r.outside ? "Fora da agenda" : "Confirmada na agenda"}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {formatPlateLine(r.load, "remessa")}
                    {r.load.dt ? ` · DT ${r.load.dt}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.load.origin} → {r.load.destination_code ? `${r.load.destination_code} ` : ""}
                    {r.load.destination} · {fmtNum(r.load.pallets)} pallets ·{" "}
                    {r.load.products.length} produto(s)
                  </div>
                  {r.diff.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                      {r.diff.map((d) => <li key={d}>• {d}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRows(null)}>Voltar e editar</Button>
              <Button onClick={save} disabled={saving || !rows.length}>
                {saving ? "Gravando…" : "Gravar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
