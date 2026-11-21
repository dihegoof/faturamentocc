import { BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadTile } from "@/components/cargo/LoadTile";
import { cn } from "@/lib/utils";
import { sortByReadiness, type CargoLoad } from "@/lib/cargo";

/**
 * Botão de histórico (caderno) ao lado do funil: abre as cargas que ainda
 * aguardam sincronia pela Remessa. Só visualização — os cards não abrem.
 */
export function AwaitingButton({
  loads,
  onOpen,
}: {
  loads: CargoLoad[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Cargas aguardando Remessa"
      title="Cargas aguardando Remessa"
      className={cn(
        "relative grid h-8 w-8 place-items-center rounded-md border bg-card transition hover:bg-muted",
        loads.length > 0 && "border-primary text-primary",
      )}
    >
      <BookOpen className="h-4 w-4" />
      {loads.length > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {loads.length}
        </span>
      )}
    </button>
  );
}

/** Modal com as cargas aguardando Remessa, na visualização do histórico. */
export function AwaitingDialog({
  open,
  onOpenChange,
  loads,
  now,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  loads: CargoLoad[];
  now: number;
}) {
  const ordenadas = sortByReadiness(loads);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Aguardando Remessa {loads.length > 0 && `(${loads.length})`}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Cargas que o Faturamento subiu e a Remessa ainda não importou. Elas ficam bloqueadas
          até a sincronia — nada aqui pode ser alterado.
        </p>

        {ordenadas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma carga aguardando sincronia.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ordenadas.map((l) => (
              <LoadTile
                key={l.id}
                load={l}
                profile="faturamento"
                now={now}
                colored
                showTime={false}
                onOpen={() => undefined}
                className="cursor-default opacity-80 hover:translate-y-0"
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
