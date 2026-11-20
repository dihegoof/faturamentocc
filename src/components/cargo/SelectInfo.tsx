import { Info } from "lucide-react";

/**
 * Ícone (i) ao lado do título de uma seção: a explicação longa aparece
 * ao passar o mouse, e o texto visível fica sendo o resumo curto.
 */
export function SectionInfo({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="relative inline-flex" title={detail}>
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" aria-label={detail} />
    </span>
  );
}
