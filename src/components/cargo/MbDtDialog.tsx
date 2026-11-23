import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
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
    /*
      modal={false}: o Radix, no modo modal, marca o resto da pagina como
      aria-hidden e "bloqueia" os outros dialogs. Como o card da carga fica
      aberto embaixo, isso derrubava o card junto. Fora do modo modal, os dois
      convivem e o overlay proprio abaixo escurece o fundo.
    */
    <Dialog modal={false} open={!!load} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/*
        Montado à mão com Portal + Overlay em z-[300]: o DialogContent do
        projeto fixa z-50 e não aceita classe no overlay, então por ele o
        mini modal abria atrás do card da carga.
      */}
      <DialogPortal container={typeof document !== "undefined" ? document.body : undefined}>
        <DialogOverlay className="z-[300]" />
        <DialogPrimitive.Content
          /*
            modal: o Radix prende o foco aqui dentro. Sem isso, clicar no
            campo dispara o onOpenChange e o modal (e o card de trás) some.
          */
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-[50%] top-[50%] z-[300] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg"
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
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

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>Depois</Button>
            <Button onClick={salvar} disabled={busy || !dt.trim()}>
              {busy ? "Gravando…" : "Informar DT"}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
