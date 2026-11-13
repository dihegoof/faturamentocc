import { Lock, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cleanDestination,
  cteTimer,
  findCatalog,
  fmtNum,
  formatElapsed,
  formatPlateLine,
  palletsFor,
  sapClipboard,
  statusLabel,
  type CargoLoad,
  type Profile,
} from "@/lib/cargo";
import { fetchCatalog } from "@/lib/cargo-api";
import { cn } from "@/lib/utils";
import { WaitTimer } from "./WaitTimer";
import { toneFor } from "./tones";

export function LoadTile({
  load,
  profile,
  now,
  lockedBy,
  onOpen,
  colored = true,
  className,
}: {
  load: CargoLoad;
  profile: Profile;
  now: number;
  lockedBy?: string | undefined;
  onOpen: () => void;
  colored?: boolean;
  className?: string;
}) {
  const fat = profile === "faturamento";
  const { data: catalog = [] } = useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog, enabled: fat });
  const dest = fat
    ? [load.destination_code, load.destination].filter(Boolean).join(" ")
    : cleanDestination(load.destination);
  const finalLabel =
    load.status === "finalizada"
      ? load.has_exit === false
        ? "Finalizada · sem saída"
        : "Finalizada · com saída"
      : statusLabel(load.status);
  const open = () => {
    if (!lockedBy) onOpen();
  };
  const cte = load.status === "impressa" ? cteTimer(load) : null;

  return (
    <div
      role="button"
      tabIndex={lockedBy ? -1 : 0}
      aria-disabled={!!lockedBy}
      onClick={open}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          open();
        }
      }}
      title={lockedBy ? `Aberta por ${lockedBy}` : undefined}
      className={cn(
        "relative w-full cursor-pointer rounded-lg p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        toneFor(load, colored),
        lockedBy && "cursor-not-allowed opacity-40 grayscale hover:translate-y-0",
        className,
      )}
    >
      <div className="text-lg font-bold leading-tight tracking-tight">{formatPlateLine(load, profile)}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs opacity-80">
        <span>Carga {load.load_number}</span>
        <span className="font-semibold uppercase">{finalLabel}</span>
      </div>
      <div className="mt-1 truncate text-xs opacity-80">{dest || "—"}</div>

      {fat && !!load.cargo_products?.length && (
        <ul className="mt-2 space-y-1 border-t border-current/15 pt-2 text-xs">
          {load.cargo_products.map((p, i) => {
            const c = findCatalog(catalog, p.code);
            const sap = c?.sap_code || p.code || "";
            const boxes = Number(p.boxes ?? 0);
            const pallets = c ? palletsFor(boxes, Number(c.boxes_per_pallet)) : 0;
            return (
              <li key={`${p.code}-${i}`} className="flex items-center gap-2">
                <button
                  type="button"
                  title="Copiar código SAP e caixas"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigator.clipboard.writeText(sapClipboard(sap, boxes));
                    toast.success(`${sap} · ${fmtNum(boxes)} cx copiado`, { duration: 1200 });
                  }}
                  className="rounded bg-background/70 px-1.5 py-0.5 font-mono font-semibold ring-1 ring-current/20 hover:bg-background"
                >
                  {sap || "—"}
                </button>
                <span className="min-w-0 flex-1 truncate">{c?.short_name || p.description}</span>
                <span className="font-semibold">{fmtNum(boxes)} cx</span>
                {pallets > 0 && <span className="opacity-80">{fmtNum(pallets)} pal</span>}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 text-sm font-semibold">{fmtNum(load.pallets)} paletes</div>

      {load.status === "corte" && load.corte_reason && (
        <div className="mt-2 rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">
          {load.corte_reason}
        </div>
      )}
      {cte ? (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded bg-background/70 px-1.5 py-0.5 text-xs font-semibold">
            <Send className="h-3 w-3" />
            {cte.label} {formatElapsed(now - new Date(cte.since).getTime())}
          </span>
        </div>
      ) : (
        load.status !== "finalizada" && (
          <div className="mt-2">
            <WaitTimer since={load.wait_started_at} now={now} />
          </div>
        )
      )}
      {lockedBy && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          <Lock className="h-3 w-3" /> {lockedBy}
        </span>
      )}
    </div>
  );
}
