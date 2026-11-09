import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { STATUSES, type CargoLoad } from "@/lib/cargo";
import { LoadCard } from "./LoadCard";
import { STATUS_BAR } from "./StatusBadge";
import { cn } from "@/lib/utils";

export function Board({
  loads,
  now,
  onOpen,
  renderActions,
}: {
  loads: CargoLoad[];
  now: number;
  onOpen: (l: CargoLoad) => void;
  renderActions?: (l: CargoLoad) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return loads;
    return loads.filter((l) =>
      [l.load_number, l.plate, l.dt, l.carrier, l.destination, l.origin, l.invoice_numbers].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [loads, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca rápida: carga, placa, DT, transportadora…" className="max-w-md bg-card" />
        <div className="flex flex-wrap gap-2 text-xs">
          {STATUSES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-semibold">
              <span className={cn("h-2 w-2 rounded-full", STATUS_BAR[s.key])} />
              {s.label}: {loads.filter((l) => l.status === s.key).length}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {STATUSES.map((s) => {
          const items = filtered.filter((l) => l.status === s.key);
          return (
            <section key={s.key} className="flex min-h-40 flex-col rounded-lg bg-muted/60 p-2">
              <h2 className="mb-2 flex items-center justify-between px-1 font-display text-lg font-bold uppercase">
                <span className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-sm", STATUS_BAR[s.key])} />
                  {s.label}
                </span>
                <span className="rounded bg-card px-2 text-sm">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.map((l) => (
                  <LoadCard key={l.id} load={l} now={now} onOpen={() => onOpen(l)} actions={renderActions?.(l)} />
                ))}
                {!items.length && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nenhuma carga</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
