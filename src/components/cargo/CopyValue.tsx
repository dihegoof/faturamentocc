import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** One-click copy for the key fields (prod. id, description, qty, plate, DT, cliente). */
export function CopyValue({
  value,
  copyText,
  label,
  className,
  strong = true,
}: {
  value: string | number | null | undefined;
  /** What goes to the clipboard when it differs from what is shown. */
  copyText?: string | undefined;
  label?: string;
  className?: string;
  strong?: boolean;
}) {
  const text = value === null || value === undefined || value === "" ? "" : String(value);
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <button
      type="button"
      title={`Copiar ${label ?? text}`}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(copyText ?? text);
        toast.success(`${label ?? "Valor"} copiado`, { duration: 1200 });
      }}
      className={cn(
        "group inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-left transition-colors",
        strong
          ? "bg-primary/10 font-semibold text-foreground ring-1 ring-primary/25 hover:bg-primary/20"
          : "hover:bg-muted",
        className,
      )}
    >
      <span>{text}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-100" />
    </button>
  );
}
