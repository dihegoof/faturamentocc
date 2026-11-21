import { cardTone, type CargoLoad } from "@/lib/cargo";

/**
 * Uma classe por tom de card. O tom vem do cardTone(), que traduz o status.
 *
 * As duas de conclusão ("concluida": finalizada com saída E liquidada) usam
 * o MESMO tom — o que muda entre elas é só o rótulo e a data no card.
 */
export const TONE_CLASS: Record<string, string> = {
  pendente: "bg-tone-pendente text-foreground",
  faturado: "bg-tone-faturado text-foreground",
  impressa: "bg-tone-impressa text-foreground",
  corte: "bg-tone-corte text-foreground ring-2 ring-destructive/50",
  concluida: "bg-tone-fin-com text-tone-fin-com-foreground",
  "finalizada-sem": "bg-tone-fin-sem text-foreground",
  // Carga que ainda aguarda a Remessa: sem cor de status, só apagada.
  pendente_remessa: "bg-card text-muted-foreground ring-1 ring-border",
  erro_virada: "bg-tone-corte text-foreground ring-2 ring-destructive/50",
};

export const NEUTRAL_TONE = "bg-card text-card-foreground ring-1 ring-border";

/**
 * A cor segue SEMPRE o status da carga — não importa se ela entrou hoje
 * ou semana passada. O parâmetro `colored` continua aceito para não quebrar
 * as chamadas existentes, mas deixou de ser um filtro.
 */
export const toneFor = (
  l: Pick<CargoLoad, "status" | "has_exit" | "liquidated_at">,
  _colored = true,
): string => TONE_CLASS[cardTone(l)] ?? TONE_CLASS["pendente"]!;
