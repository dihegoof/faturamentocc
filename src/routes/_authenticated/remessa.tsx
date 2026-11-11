import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardPaste, PackagePlus } from "lucide-react";
import { AccountShell } from "@/components/cargo/AccountShell";
import { AppHeader } from "@/components/cargo/AppHeader";
import { Board } from "@/components/cargo/Board";
import { LoadDetailDialog } from "@/components/cargo/LoadDetailDialog";
import { ImportTextDialog } from "@/components/cargo/ImportTextDialog";
import { ImportMBDialog } from "@/components/cargo/ImportMBDialog";
import { PlateSearch } from "@/components/cargo/PlateSearch";
import { Button } from "@/components/ui/button";
import { useLoads, useNow } from "@/hooks/use-loads";
import { fetchLoadsRange } from "@/lib/cargo-api";
import { minutesSince, formatDuration, todayISO, type CargoLoad } from "@/lib/cargo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/remessa")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Remessa — Cargas CocaCola" },
      { name: "description", content: "Importação de cargas, acompanhamento em tempo real e histórico dos últimos 30 dias." },
      { property: "og:title", content: "Remessa — Cargas CocaCola" },
      { property: "og:description", content: "Importação e acompanhamento de cargas." },
    ],
  }),
  component: () => <AccountShell><Remessa /></AccountShell>,
});

function last30(): string[] {
  const out: string[] = [];
  const base = new Date(todayISO() + "T12:00");
  for (let i = 0; i < 30; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function Remessa() {
  const days = useMemo(last30, []);
  const start = days[29] ?? todayISO();
  const end = days[0] ?? todayISO();
  const [date, setDate] = useState<string>(end);
  const { data: loads = [], isLoading } = useLoads(date);
  const now = useNow();
  const [detail, setDetail] = useState<CargoLoad | null>(null);
  const [importText, setImportText] = useState(false);
  const [importMB, setImportMB] = useState(false);
  const { data: range = [] } = useQuery({
    queryKey: ["loads", "range", start, end],
    queryFn: () => fetchLoadsRange(start, end),
  });
  const perDay = useMemo(() => {
    const m = new Map<string, number>();
    range.forEach((l) => m.set(l.load_date, (m.get(l.load_date) ?? 0) + 1));
    return m;
  }, [range]);
  const max = Math.max(1, ...perDay.values());

  const done = loads.filter((l) => l.finalized_at);
  const avg = done.length ? Math.round(done.reduce((s, l) => s + minutesSince(l.created_at, new Date(l.finalized_at ?? l.created_at).getTime()), 0) / done.length) : 0;
  const pallets = loads.reduce((s, l) => s + Number(l.pallets ?? 0), 0);

  return (
    <div className="min-h-screen">
      <AppHeader profile="remessa">
        <PlateSearch onOpen={setDetail} />
        <Button size="sm" variant="secondary" onClick={() => setImportText(true)}><ClipboardPaste className="h-4 w-4" /> Importar cargas</Button>
        <Button size="sm" variant="secondary" onClick={() => setImportMB(true)}><PackagePlus className="h-4 w-4" /> Carga MB</Button>
      </AppHeader>
      <main className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
        <section className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold uppercase">Histórico — últimos 30 dias</h2>
            <span className="text-xs text-muted-foreground">{range.length} cargas no período</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[...days].reverse().map((d) => {
              const n = perDay.get(d) ?? 0;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={cn("flex w-10 shrink-0 flex-col items-center gap-1 rounded p-1 text-[10px] transition-colors",
                    d === date ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  title={`${n} carga(s)`}
                >
                  <span className="flex h-12 w-3 items-end rounded-sm bg-muted">
                    <span className={cn("w-full rounded-sm", d === date ? "bg-primary-foreground" : "bg-primary")} style={{ height: `${(n / max) * 100}%` }} />
                  </span>
                  <span className="font-mono">{d.slice(8, 10)}/{d.slice(5, 7)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Cargas no dia", loads.length],
            ["Pallets", pallets],
            ["Finalizadas", `${done.length} / ${loads.length}`],
            ["Tempo médio até finalizar", done.length ? formatDuration(avg) : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border bg-card p-3">
              <div className="text-xs uppercase text-muted-foreground">{k}</div>
              <div className="font-display text-3xl font-bold">{v}</div>
            </div>
          ))}
        </section>

        {isLoading ? <p className="text-muted-foreground">Carregando cargas…</p> : (
          <Board loads={loads} now={now} onOpen={setDetail} />
        )}
      </main>
      <LoadDetailDialog load={detail} onClose={() => setDetail(null)} />
      <ImportTextDialog open={importText} onOpenChange={setImportText} />
      <ImportMBDialog open={importMB} onOpenChange={setImportMB} />
    </div>
  );
}
