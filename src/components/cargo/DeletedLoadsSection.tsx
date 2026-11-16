import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchDeletedLoads, restoreLoad } from "@/lib/cargo-api";
import { formatPlateLine, statusLabel } from "@/lib/cargo";

/**
 * Painel do admin: cargas excluídas.
 * A exclusão é superficial — a carga some para a operação, mas continua aqui
 * e nunca sai do banco antes dos 6 meses de retenção.
 */
export function DeletedLoadsSection() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["deleted-loads"],
    queryFn: fetchDeletedLoads,
    enabled: open,
  });

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
          <p className="text-sm text-muted-foreground">
            Exclusão superficial: a carga sai da operação, mas fica guardada e pode ser restaurada.
            Nada é apagado do sistema antes de 6 meses.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Ocultar excluídas" : "Mostrar excluídas"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma carga excluída.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Carga</th>
                  <th className="p-2">Placa</th>
                  <th className="p-2">Transportadora</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Excluída em</th>
                  <th className="p-2">Por</th>
                  <th className="p-2">Motivo</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.load_date}</td>
                    <td className="p-2">{l.load_number}</td>
                    <td className="p-2">{formatPlateLine(l)}</td>
                    <td className="p-2">{l.carrier ?? "—"}</td>
                    <td className="p-2">{statusLabel(l.status)}</td>
                    <td className="p-2">
                      {l.deleted_at ? new Date(l.deleted_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="p-2">{l.deleted_by ?? "—"}</td>
                    <td className="p-2">{l.delete_reason ?? "—"}</td>
                    <td className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={restore.isPending}
                        onClick={() => restore.mutate(l.id)}
                      >
                        Restaurar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
