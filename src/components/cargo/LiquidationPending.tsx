import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmLiquidation, fetchLiquidationPendings } from "@/lib/cargo-api";

/**
 * Pendências de liquidação. Só quem exportou o arquivo pode confirmar —
 * para os outros aparece "aguardando validação por <usuário>".
 */
export function LiquidationPending({ user }: { user: string }) {
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["liquidation-pendings", user],
    queryFn: () => fetchLiquidationPendings(user),
    refetchInterval: 30000,
  });

  const confirmar = useMutation({
    mutationFn: (id: string) => confirmLiquidation(id, user),
    onSuccess: (n) => {
      toast.success(`${n} carga(s) liquidada(s)`);
      qc.invalidateQueries({ queryKey: ["liquidation-pendings"] });
      qc.invalidateQueries({ queryKey: ["loads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data.length) return null;

  return (
    <section className="space-y-2 rounded-lg border bg-card p-3">
      <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase">
        <Clock className="h-4 w-4" /> Liquidação aguardando validação
      </h2>
      {data.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <div className="font-semibold">
              {p.loads_count} DT(s) · {p.criteria_label ?? "sem critério"}
            </div>
            <div className="text-xs text-muted-foreground">
              Exportado por <strong>{p.exported_by}</strong> em{" "}
              {new Date(p.exported_at).toLocaleString("pt-BR")}
              {p.file_name ? ` · ${p.file_name}` : ""}
            </div>
          </div>

          {p.mine ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={confirmar.isPending}
              onClick={() => confirmar.mutate(p.id)}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Confirmar liquidação
            </Button>
          ) : (
            <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
              aguardando validação por {p.exported_by}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
