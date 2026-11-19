import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadTile } from "@/components/cargo/LoadTile";
import { fetchDeletedLoads, restoreLoad } from "@/lib/cargo-api";
import type { CargoLoad } from "@/lib/cargo";

/** Cabeçalho do dia no mesmo estilo do histórico: "Quinta-Feira, 19/11/2026". */
function dayTitle(iso: string) {
  const d = new Date(iso + "T12:00");
  const wd = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const nice = wd.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("-");
  return `${nice}, ${d.toLocaleDateString("pt-BR")}`;
}

/** Painel do admin: cargas excluídas, em cards agrupados por dia. */
export function DeletedLoadsSection() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["deleted-loads"],
    queryFn: fetchDeletedLoads,
    enabled: open,
  });

  // Agrupa por dia da carga, do mais recente para o mais antigo.
  const days = useMemo(() => {
    const m = new Map<string, CargoLoad[]>();
    for (const l of data) m.set(l.load_date, [...(m.get(l.load_date) ?? []), l]);
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const restore = useMutation({
    mutationFn: (id: string) => restoreLoad(id),
    onSuccess: () => {
      toast.success("Carga restaurada");
      qc.invalidateQueries({ queryKey: ["deleted-loads"] });
      qc.invalidateQueries({ queryKey: ["loads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Cargas excluídas</h2>
          <p className="text-sm text-muted-foreground">Área restrita do administrador.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Trash2 className="mr-1 size-4" /> Ver cargas excluídas
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Cargas excluídas {data.length > 0 && `(${data.length})`}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : days.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma carga excluída.</p>
          ) : (
            <div className="space-y-6">
              {days.map(([day, loads]) => (
                <div key={day}>
                  <h3 className="mb-2 font-display text-xl font-bold">{dayTitle(day)}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {loads.map((l) => (
                      <div key={l.id} className="space-y-1">
                        <LoadTile
                          load={l}
                          profile="faturamento"
                          now={Date.now()}
                          colored={false}
                          onOpen={() => undefined}
                        />
                        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                          <span className="truncate">
                            {l.deleted_at ? new Date(l.deleted_at).toLocaleString("pt-BR") : ""}
                            {l.deleted_by ? ` · ${l.deleted_by}` : ""}
                            {l.delete_reason ? ` · ${l.delete_reason}` : ""}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={restore.isPending}
                            onClick={() => restore.mutate(l.id)}
                          >
                            <RotateCcw className="mr-1 size-3" /> Restaurar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
