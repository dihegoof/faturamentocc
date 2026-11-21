import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setMbDt } from "@/lib/cargo-api";
import type { CargoLoad } from "@/lib/cargo";

/**
 * Mini modal que abre sobre o card de uma carga MB: a Remessa importou sem
 * DT (é o Faturamento que informa). Só aparece uma vez, enquanto o DT
 * estiver vazio.
 */
export function MbDtDialog({
  load,
  user,
  onClose,
}: {
  load: CargoLoad | null;
  user: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [dt, setDt] = useState("");
  const [busy, setBusy] = useState(false);

  const salvar = async () => {
    if (!load) return;
    const limpo = dt.replace(/\D/g, "");
    if (!limpo) {
      toast.error("Informe o DT da carga");
      return;
    }
    setBusy(true);
    try {
      await setMbDt(load.id, limpo, user);
      toast.success(`DT ${limpo} informado na carga ${load.load_number}`);
      qc.invalidateQueries({ queryKey: ["loads"] });
      qc.invalidateQueries({ queryKey: ["load-detail", load.id] });
      setDt("");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!load} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Informar DT</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          A carga <strong>{load?.load_number}</strong>
          {load?.plate ? ` · ${load.plate}` : ""} é MB e veio sem DT — a Remessa
          importa a placa e a transportadora, e o DT é informado aqui.
        </p>

        <div className="space-y-1">
          <Label htmlFor="mb-dt" className="text-xs">
            DT <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mb-dt"
            autoFocus
            value={dt}
            onChange={(e) => setDt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void salvar(); }}
            placeholder="Ex: 106960668"
            className="h-9 font-mono"
          />
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          O DT fica gravado na carga. Para alterar depois, use a troca de DT no card.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Depois</Button>
          <Button onClick={salvar} disabled={busy || !dt.trim()}>
            {busy ? "Gravando…" : "Informar DT"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
