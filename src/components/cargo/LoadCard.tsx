import type { CargoLoad, Profile } from "@/lib/cargo";
import { formatPlateLine } from "@/lib/cargo";
import { STATUS_BAR, StatusBadge } from "./StatusBadge";
import { WaitTimer } from "./WaitTimer";
import { cn } from "@/lib/utils";

export function LoadCard({
  load,
  now,
  onOpen,
  actions,
  profile,
}: {
  load: CargoLoad;
  profile: Profile;
  now: number;
  onOpen: () => void;
  actions?: React.ReactNode;
}) {
  const showTimer = load.status !== "finalizada";
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("absolute inset-y-0 left-0 w-1", STATUS_BAR[load.status])} />
      <button type="button" onClick={onOpen} className="block w-full p-3 pl-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-lg font-bold leading-tight">
              Carga {load.load_number}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {formatPlateLine(load, profile)}
            </div>
          </div>
          {showTimer && <WaitTimer since={load.wait_started_at} now={now} />}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {load.origin || "—"} → {load.destination_code ? `${load.destination_code} ` : ""}
            {load.destination || "—"}
          </span>
          <span>{Number(load.pallets ?? 0)} pallets</span>
          {load.invoice_numbers && <span>NF {load.invoice_numbers}</span>}
          {profile === "faturamento" && load.product_order && (
            <span>Ord. prod. {load.product_order}</span>
          )}
          {profile === "faturamento" && load.pallet_order && (
            <span>Ord. pal. {load.pallet_order}</span>
          )}
        </div>
        {load.status === "corte" && load.corte_reason && (
          <div className="mt-2 rounded bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
            {load.corte_reason}
          </div>
        )}
        {load.cte_requested_at && !load.cte_received_at && (
          <div className="mt-2">
            <WaitTimer since={load.cte_requested_at} now={now} label="CT-e solicitado há" />
          </div>
        )}
      </button>
      {actions && (
        <div className="flex flex-wrap gap-1.5 border-t bg-muted/40 px-3 py-2 pl-4">{actions}</div>
      )}
    </div>
  );
}

export { StatusBadge };
