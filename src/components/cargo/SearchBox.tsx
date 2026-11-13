import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite DT, placa ou transportadora…"
        className="h-14 rounded-xl bg-card pl-12 text-lg shadow-sm"
      />
    </div>
  );
}
