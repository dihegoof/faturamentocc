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
import { parseCargoText, formatPlateLine, type ParsedLoad } from "@/lib/cargo";
import { importLoads } from "@/lib/cargo-api";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE = [
  "11/11/2026\t1\tB0AC\tBFBP\tFrancisco Beltrão\t92521\tCRYSTAL 1,5L SEM GÁS 06UN\t1.008\t9\tRitmo\tBDD3G22\t106927853",
  "-\t-\t-\t-\t-\t92522\tCRYSTAL 500ML COM GÁS 12UN\t1.344\t8\t-\t-\t-",
  "11/11/2026\t14\tB0AC\tBFCM\tCD Bauru\t92520\tCRYSTAL 1,5L COM GÁS 06UN\t3.640\t26\tRitmo\tOBL8E22\t106927866",
].join("\n");

export function ImportTextDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [review, setReview] = useState<(ParsedLoad & { duplicate: boolean })[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const analyze = async () => {
    const { loads, errors } = parseCargoText(text);
    setErrors(errors);
    if (!loads.length) return setReview([]);
    const { data } = await supabase
      .from("cargo_loads")
      .select("load_date, load_number")
      .in(
        "load_number",
        loads.map((l) => l.load_number),
      );
    const existing = new Set((data ?? []).map((d) => `${d.load_date}|${d.load_number}`));
    setReview(
      loads.map((l) => ({ ...l, duplicate: existing.has(`${l.load_date}|${l.load_number}`) })),
    );
  };

  const save = async () => {
    if (!review) return;
    setSaving(true);
    try {
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
            <p className="text-sm text-muted-foreground">
              Cole as linhas como vêm da planilha, sem cabeçalho: Data, Nº Carga, Origem, Sigla
              destino, Destino, SKU, Descrição, Caixas, Pallets, Transportadora, Placa, Transporte
              (DT). Uma linha por produto; nas linhas de baixo da mesma carga os dados podem se
              repetir ou vir com "-".
            </p>
            <Textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={SAMPLE}
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setText(SAMPLE)}>
                Usar exemplo
              </Button>
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
                    {l.duplicate && (
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
                    {l.destination} · {l.pallets} pallets · {l.products.length} produto(s) ·{" "}
                    {l.products.reduce((s, p) => s + p.boxes, 0)} caixas
                  </div>
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
              <Button onClick={save} disabled={saving || !review.some((l) => !l.duplicate)}>
                Gravar {review.filter((l) => !l.duplicate).length} carga(s)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
