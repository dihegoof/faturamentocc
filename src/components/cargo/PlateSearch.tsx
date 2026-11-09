import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { searchByPlate } from "@/lib/cargo-api";
import { formatPlateLine, normalizePlate, type CargoLoad } from "@/lib/cargo";
import { StatusBadge } from "./StatusBadge";

export function PlateSearch({ onOpen }: { onOpen: (l: CargoLoad) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const term = normalizePlate(q);
  const { data = [], isFetching } = useQuery({
    queryKey: ["plate", term],
    queryFn: () => searchByPlate(term),
    enabled: open && term.length >= 3,
  });
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (term.length >= 3) setOpen(true);
        }}
        className="relative"
      >
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Histórico por placa"
          className="h-9 w-48 bg-card pl-8 text-foreground"
        />
      </form>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Histórico da placa {term}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 px-4">
            {isFetching && <p className="text-sm text-muted-foreground">Buscando…</p>}
            {!isFetching && !data.length && <p className="text-sm text-muted-foreground">Nenhuma carga encontrada.</p>}
            {data.map((l) => (
              <button
                key={l.id}
                onClick={() => onOpen(l)}
                className="block w-full rounded-md border p-2 text-left hover:bg-muted"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Carga {l.load_number}</span>
                  <StatusBadge status={l.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {l.load_date.split("-").reverse().join("/")} · {formatPlateLine(l)}
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
