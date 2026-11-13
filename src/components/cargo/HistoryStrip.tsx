import { useMemo, type ReactNode, type WheelEvent } from "react";

/** Dark horizontal strip; mouse wheel scrolls sideways through cards grouped by day. */
export function HistoryStrip<T extends { load_date: string; id: string }>({
  title,
  items,
  render,
  empty = "Nenhuma carga",
}: {
  title: string;
  items: T[];
  render: (item: T) => ReactNode;
  empty?: string;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, T[]>();
    items.forEach((i) => m.set(i.load_date, [...(m.get(i.load_date) ?? []), i]));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
  };
  return (
    <section className="rounded-lg bg-secondary p-3 text-secondary-foreground">
      <h2 className="mb-2 px-1 font-display text-lg font-bold uppercase">{title}</h2>
      <div onWheel={onWheel} className="flex gap-4 overflow-x-auto pb-2">
        {groups.map(([day, list]) => (
          <div key={day} className="shrink-0">
            <div className="mb-1.5 px-1 font-mono text-xs opacity-70">
              {new Date(day + "T12:00").toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              })}{" "}
              · {list.length}
            </div>
            <div className="flex gap-2">
              {list.map((i) => (
                <div key={i.id} className="w-64 shrink-0">
                  {render(i)}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!groups.length && <p className="px-1 py-6 text-sm opacity-70">{empty}</p>}
      </div>
    </section>
  );
}
