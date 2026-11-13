import { cardTone, type CargoLoad } from "@/lib/cargo";

export const TONE_CLASS: Record<string, string> = {
  pendente: "bg-tone-pendente text-foreground",
  faturado: "bg-tone-faturado text-foreground",
  impressa: "bg-tone-impressa text-foreground",
  corte: "bg-tone-corte text-foreground ring-2 ring-destructive/50",
  "finalizada-com": "bg-tone-fin-com text-tone-fin-com-foreground",
  "finalizada-sem": "bg-tone-fin-sem text-foreground",
};

export const NEUTRAL_TONE = "bg-card text-card-foreground ring-1 ring-border";

/** Only cards imported today are colored; older ones stay neutral unless they have an error. */
export const toneFor = (l: Pick<CargoLoad, "status" | "has_exit">, colored = true) =>
  colored || l.status === "corte" ? (TONE_CLASS[cardTone(l)] ?? TONE_CLASS["pendente"]) : NEUTRAL_TONE;
