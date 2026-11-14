import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardPaste, PackagePlus } from "lucide-react";
import { AccountShell } from "@/components/cargo/AccountShell";
import { AppHeader } from "@/components/cargo/AppHeader";
import { LoadModal } from "@/components/cargo/LoadModal";
import { LoadTile } from "@/components/cargo/LoadTile";
import { HistoryStrip } from "@/components/cargo/HistoryStrip";
import { SearchBox } from "@/components/cargo/SearchBox";
import { ImportTextDialog } from "@/components/cargo/ImportTextDialog";
import { ImportMBDialog } from "@/components/cargo/ImportMBDialog";
import { Button } from "@/components/ui/button";
import { useLoadsRange, useNow } from "@/hooks/use-loads";
import { matchesSearch, todayISO } from "@/lib/cargo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/remessa")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Remessa — Cargas CocaCola" },
      { name: "description", content: "Importação de cargas e acompanhamento do dia em tempo real." },
      { property: "og:title", content: "Remessa — Cargas CocaCola" },
      { property: "og:description", content: "Importação e acompanhamento de cargas." },
    ],
  }),
  component: () => (
    <AccountShell>
      <Remessa />
    </AccountShell>
  ),
});

function Remessa() {
  const { data: range = [], days } = useLoadsRange();
  const now = useNow();
  const [date, setDate] = useState(todayISO());
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [importText, setImportText] = useState(false);
  const [mb, setMb] = useState(false);
  const perDay = useMemo(() => {
    const m = new Map<string, number>();
    range.forEach((l) => m.set(l.load_date, (m.get(l.load_date) ?? 0) + 1));
    return m;
  }, [range]);
  const max = Math.max(1, ...perDay.values());
  const searching = !!q.trim();
  const dayLoads = searching
    ? range.filter((l) => matchesSearch(l, q))
    : range.filter((l) => l.load_date === date);
  const open = range.find((l) => l.id === openId) ?? null;

  return (
    <div className="min-h-screen">
      <AppHeader profile="remessa">
        <Button size="sm" variant="secondary" onClick={() => setImportText(true)}>
          <ClipboardPaste className="h-4 w-4" /> Importar cargas
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setMb(true)}>
          <PackagePlus className="h-4 w-4" /> Importar MB
        </Button>
      </AppHeader>
      <main className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
        <SearchBox value={q} onChange={setQ} />
        {!searching && (
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
                  className={cn(
                    "flex w-10 shrink-0 flex-col items-center gap-1 rounded p-1 text-[10px] transition-colors",
                    d === date ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                  title={`${n} carga(s)`}
                >
                  <span className="flex h-12 w-3 items-end rounded-sm bg-muted">
                    <span
                      className={cn("w-full rounded-sm", d === date ? "bg-primary-foreground" : "bg-primary")}
                      style={{ height: `${(n / max) * 100}%` }}
                    />
                  </span>
                  <span className="font-mono">{d.slice(8, 10)}/{d.slice(5, 7)}</span>
                </button>
              );
            })}
          </div>
        </section>
        )}
        <HistoryStrip
          title={
            searching
              ? `Resultados (${dayLoads.length})`
              : `Cargas do dia ${date.slice(8, 10)}/${date.slice(5, 7)} (${dayLoads.length})`
          }
          empty={searching ? "Nenhuma carga encontrada nos últimos 30 dias." : "Nenhuma carga"}
          items={dayLoads}
          render={(l) => <LoadTile load={l} profile="remessa" now={now} onOpen={() => setOpenId(l.id)} />}
        />
      </main>
      <LoadModal load={open} onClose={() => setOpenId(null)} profile="remessa" />
      <ImportTextDialog open={importText} onOpenChange={setImportText} />
      <ImportMBDialog open={mb} onOpenChange={setMb} />
    </div>
  );
}
