import { Lock } from "lucide-react";
import { cleanDestination, formatPlateLine, statusLabel, type CargoLoad, type Profile } from "@/lib/cargo";
import { cn } from "@/lib/utils";
import { WaitTimer } from "./WaitTimer";
import { toneFor } from "./tones";

export function LoadTile({
  load,
  profile,
  now,
  lockedBy,
  onOpen,
  className,
}: {
  load: CargoLoad;
  profile: Profile;
  now: number;
  lockedBy?: string | undefined;
  onOpen: () => void;
  className?: string;
}) {
  const dest =
    profile === "remessa"
      ? cleanDestination(load.destination)
      : [load.destination_code, load.destination].filter(Boolean).join(" ");
  const finalLabel =
    load.status === "finalizada"
      ? load.has_exit === false
        ? "Finalizada · sem saída"
        : "Finalizada · com saída"
      : statusLabel(load.status);
  return (
    <button
      type="button"
      disabled={!!lockedBy}
      onClick={onOpen}
      title={lockedBy ? `Aberta por ${lockedBy}` : undefined}
      className={cn(
        "relative w-full rounded-lg p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        toneFor(load),
        lockedBy && "cursor-not-allowed opacity-40 grayscale hover:translate-y-0",
        className,
      )}
    >
      <div className="font-mono text-sm font-semibold leading-tight">
        {formatPlateLine(load, profile)}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs opacity-80">
        <span>Carga {load.load_number}</span>
        <span className="font-semibold uppercase">{finalLabel}</span>
      </div>
      <div className="mt-1 truncate text-xs opacity-80">
        {dest || "—"} · {Number(load.pallets ?? 0)} pallets
      </div>
      {load.status === "corte" && load.corte_reason && (
        <div className="mt-2 rounded bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">
          {load.corte_reason}
        </div>
      )}
      {load.status !== "finalizada" && (
        <div className="mt-2">
          <WaitTimer since={load.wait_started_at} now={now} />
        </div>
      )}
      {lockedBy && (
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          <Lock className="h-3 w-3" /> {lockedBy}
        </span>
      )}
    </button>
  );
}
