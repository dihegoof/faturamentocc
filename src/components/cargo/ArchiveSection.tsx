import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  archivePeriod,
  fetchArchiveExports,
  fetchPendingArchive,
  purgeArchived,
} from "@/lib/cargo-api";

/**
 * Retenção e arquivo morto virtual.
 * Regra: nada é apagado antes de 6 meses. Depois disso o período é
 * exportado/compactado e só então o expurgo fica liberado.
 */
export function ArchiveSection() {
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ["pending-archive"],
    queryFn: fetchPendingArchive,
  });
  const { data: exports = [] } = useQuery({
    queryKey: ["archive-exports"],
    queryFn: fetchArchiveExports,
  });

  const archive = useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) => archivePeriod(start, end),
    onSuccess: () => {
      toast.success("Período exportado para o arquivo morto");
      qc.invalidateQueries({ queryKey: ["archive-exports"] });
      qc.invalidateQueries({ queryKey: ["pending-archive"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: (id: string) => purgeArchived(id),
    onSuccess: (n) => {
      toast.success(`${n} carga(s) expurgada(s) após arquivamento`);
      qc.invalidateQueries({ queryKey: ["archive-exports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportAllPending = () => {
    if (!pending.length) {
      toast.info("Nada passou dos 6 meses ainda");
      return;
    }
    const first = pending[0]!.first_date;
    const last = pending[pending.length - 1]!.last_date;
    archive.mutate({ start: first, end: last });
  };

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="font-display text-xl font-bold">Retenção e arquivo morto</h2>
      <p className="text-sm text-muted-foreground">
        Todo o histórico fica no sistema por no mínimo 6 meses. Passado esse prazo, o período é
        baixado e compactado para o arquivo morto virtual — e o expurgo só libera depois.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <h3 className="font-semibold">Prontos para arquivar ({pending.length})</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada passou dos 6 meses.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {pending.map((p) => (
                <li key={p.first_date}>
                  {p.first_date} → {p.last_date} · {p.loads_count} carga(s)
                </li>
              ))}
            </ul>
          )}
          <Button className="mt-2" size="sm" disabled={archive.isPending} onClick={exportAllPending}>
            Exportar e compactar
          </Button>
        </div>

        <div>
          <h3 className="font-semibold">Arquivos gerados ({exports.length})</h3>
          {exports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo gerado ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Período</th>
                  <th className="p-2">Cargas</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Libera expurgo em</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {exports.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-2">{a.period_start} → {a.period_end}</td>
                    <td className="p-2">{a.loads_count}</td>
                    <td className="p-2">{a.status}</td>
                    <td className="p-2">
                      {a.purge_allowed_at ? new Date(a.purge_allowed_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={a.status !== "exportado" || purge.isPending}
                        onClick={() => purge.mutate(a.id)}
                      >
                        Expurgar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
