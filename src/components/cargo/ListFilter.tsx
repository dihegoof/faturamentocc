import { useEffect, useRef, useState } from "react";
import { Check, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListFilters } from "@/lib/cargo";

/**
 * Funil de filtro da lista: clica, abre uma caixinha e as opções marcadas
 * ganham um check. Mesmo padrão visual dos outros cards do app.
 */
export function ListFilter({
  filters,
  onChange,
}: {
  filters: ListFilters;
  onChange: (f: ListFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const ativos = Number(filters.hideFinalized) + Number(filters.hideFuture);

  const opcoes: { key: keyof ListFilters; label: string }[] = [
    { key: "hideFinalized", label: "Ocultar cargas finalizadas" },
    { key: "hideFuture", label: "Ocultar cargas futuras" },
  ];

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Filtrar lista"
        aria-expanded={open}
        className={cn(
          "relative grid h-8 w-8 place-items-center rounded-md border bg-card transition hover:bg-muted",
          ativos > 0 && "border-primary text-primary",
        )}
      >
        <Filter className="h-4 w-4" />
        {ativos > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {ativos}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-30 w-60 rounded-lg border bg-card p-1 shadow-lg">
          {opcoes.map((o) => {
            const on = filters[o.key];
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => onChange({ ...filters, [o.key]: !on })}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition hover:bg-muted"
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
