import { AlarmClock } from "lucide-react";
import { formatDuration, minutesSince, WAIT_ALERT_MIN } from "@/lib/cargo";
import { cn } from "@/lib/utils";

export function WaitTimer({ since, now, label }: { since: string; now: number; label?: string }) {
  const min = minutesSince(since, now);
  const alert = min >= WAIT_ALERT_MIN;
  return (
    <span
      title={alert ? `Parada há mais de ${WAIT_ALERT_MIN} min` : "Tempo neste status"}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs",
        alert ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      <AlarmClock className="h-3 w-3" />
      {label ? `${label} ` : ""}
      {formatDuration(min)}
    </span>
  );
}
