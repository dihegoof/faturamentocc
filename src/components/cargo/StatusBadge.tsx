import { statusLabel } from "@/lib/cargo";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  pendente: "bg-st-pendente/15 text-st-pendente border-st-pendente/40",
  faturado: "bg-st-faturado/15 text-st-faturado border-st-faturado/40",
  impressa: "bg-st-impressa/15 text-st-impressa border-st-impressa/40",
  corte: "bg-st-corte/15 text-st-corte border-st-corte/40",
  finalizada: "bg-st-finalizada/15 text-st-finalizada border-st-finalizada/40",
};
export const STATUS_BAR: Record<string, string> = {
  pendente: "bg-st-pendente",
  faturado: "bg-st-faturado",
  impressa: "bg-st-impressa",
  corte: "bg-st-corte",
  finalizada: "bg-st-finalizada",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold", TONES[status], className)}>
      {statusLabel(status)}
    </span>
  );
}
