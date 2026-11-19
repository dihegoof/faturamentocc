import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { CargoLoad } from "@/lib/cargo";
import { diffAgendaProducts } from "@/lib/cargo";

export interface RemessaMatch {
  /** Carga da Remessa que casou com uma da agenda (pelo DT). */
  matched: { load: CargoLoad; diff: string[]; palletAlert: string | null };
  /** Veio da Remessa e não estava na agenda: cria mesmo assim, em laranja. */
  outside: CargoLoad[];
}

/** Revisão da Remessa: o que casou por DT, o que divergiu e o que veio de fora. */
export function RemessaReview({ result }: { result: RemessaMatch }) {
  const alerts = useMemo(() => result.matched.filter((m) => m.diff.length || m.palletAlert), [result]);

  return (
    <div className="space-y-3 text-sm">
      <p>
        <strong>{result.matched.length}</strong> carga(s) casaram com a agenda
        {result.outside.length > 0 && <> · <strong>{result.outside.length}</strong> não estava(m) na agenda</>}
      </p>

      {alerts.length > 0 && (
        <div className="rounded-md border border-amber-400/50 bg-amber-50 p-3 text-amber-900">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Divergências e avisos de pallets
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {alerts.map((m) => (
              <li key={m.load.id}>
                Carga {m.load.load_number}
                {m.palletAlert ? ` · ${m.palletAlert}` : ""}
                {m.diff.length > 0 && <> · {m.diff.join("; ")}</>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.outside.length > 0 && (
        <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-orange-900">
          <div className="mb-1 font-semibold">Cargas fora da agenda</div>
          <ul className="list-disc space-y-1 pl-5">
            {result.outside.map((l) => (
              <li key={l.id}>
                Carga {l.load_number} · DT {l.dt ?? "—"} · {l.plate ?? "sem placa"}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">
            Serão criadas para o Faturamento com a marcação laranja.
          </p>
        </div>
      )}
    </div>
  );
}

export { diffAgendaProducts };
