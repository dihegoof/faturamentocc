import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SPANS = [3, 5, 15, 30] as const;
const shift = (iso: string, days: number) => {
  const d = new Date(iso + "T12:00");
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

/** Spreadsheet-like history: big date title per day, that day's cards side by side below. */
export function HistoryStrip<T extends { load_date: string; id: string }>({
  title,
  items,
  render,
  empty = "Nenhuma carga",
  today,
  selector = false,
}: {
  title: string;
  items: T[];
  render: (item: T) => ReactNode;
  empty?: string;
  today?: string;
  selector?: boolean;
}) {
  const base = today ?? new Date().toISOString().slice(0, 10);
  const [span, setSpan] = useState<number | null>(5);
  const [from, setFrom] = useState(shift(base, 4));
  const [to, setTo] = useState(base);
  const range = span ? { from: shift(base, span - 1), to: base } : { from, to };
  const groups = useMemo(() => {
    const m = new Map<string, T[]>();
    items
      .filter((i) => !selector || (i.load_date >= range.from && i.load_date <= range.to))
      .forEach((i) => m.set(i.load_date, [...(m.get(i.load_date) ?? []), i]));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items, selector, range.from, range.to]);

  return (
    <section className="rounded-lg border border-border/70 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-display text-lg font-bold uppercase">{title}</h2>
        {selector && (
          <>
            <div className="flex overflow-hidden rounded-md border">
              {SPANS.map((s) => (
                <button key={s} type="button" onClick={() => setSpan(s)}
                  className={cn("px-2.5 py-1 text-xs font-semibold", span === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {s}d
                </button>
              ))}
            </div>
            <input type="date" aria-label="De" value={span ? range.from : from} max={to}
              onChange={(e) => { setSpan(null); setFrom(e.target.value); }} className="h-8 rounded-md border bg-background px-2 text-xs" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" aria-label="Até" value={span ? range.to : to} min={from} max={base}
              onChange={(e) => { setSpan(null); setTo(e.target.value); }} className="h-8 rounded-md border bg-background px-2 text-xs" />
          </>
        )}
      </div>
      <div className="space-y-5">
        {groups.map(([day, list]) => (
          <div key={day}>
            <div className="mb-2 border-b pb-1 font-display text-2xl font-bold capitalize">
              {new Date(day + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
              <span className="ml-2 text-sm font-normal text-muted-foreground">{list.length} carga(s)</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((i) => <div key={i.id}>{render(i)}</div>)}
            </div>
          </div>
        ))}
        {!groups.length && <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}
