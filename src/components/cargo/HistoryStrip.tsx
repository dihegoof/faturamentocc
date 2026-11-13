import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const SPANS = [3, 5, 15, 30] as const;
const shift = (iso: string, days: number) => {
  const d = new Date(iso + "T12:00");
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};
const toISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** History by predicted day: big date title per day, that day's cards side by side with horizontal scroll. */
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
  const [span, setSpan] = useState<string>("5");
  const [picked, setPicked] = useState<DateRange | undefined>();
  const custom = span === "custom" && picked?.from;
  const range = custom
    ? { from: toISO(picked.from!), to: toISO(picked.to ?? picked.from!) }
    : { from: shift(base, Number(span === "custom" ? 5 : span) - 1), to: "9999-12-31" };
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
            <Select value={span} onValueChange={setSpan}>
              <SelectTrigger className="h-8 w-40 text-xs" aria-label="Período">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPANS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Últimos {s} dias
                  </SelectItem>
                ))}
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarDays className="h-4 w-4" />
                  {custom ? `${br(range.from)} até ${br(range.to)}` : "Data início e fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  locale={ptBR}
                  numberOfMonths={2}
                  selected={picked}
                  onSelect={(r) => {
                    setPicked(r);
                    setSpan(r?.from ? "custom" : "5");
                  }}
                />
              </PopoverContent>
            </Popover>
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
            <div className="flex gap-3 overflow-x-auto pb-3">
              {list.map((i) => (
                <div key={i.id} className="w-80 shrink-0">
                  {render(i)}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!groups.length && <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}
