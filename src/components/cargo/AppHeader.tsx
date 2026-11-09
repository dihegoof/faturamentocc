import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import type { Profile } from "@/lib/cargo";
import { cn } from "@/lib/utils";

export function AppHeader({ profile, children }: { profile: Profile; children?: React.ReactNode }) {
  return (
    <header className="bg-hero text-primary-foreground">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary-foreground/15">
            <Truck className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-bold uppercase tracking-wide">Cargas · CocaCola</span>
        </Link>
        <nav className="flex rounded-md bg-primary-foreground/10 p-1 text-sm font-semibold">
          {(["faturamento", "remessa"] as const).map((p) => (
            <Link
              key={p}
              to={p === "faturamento" ? "/faturamento" : "/remessa"}
              className={cn(
                "rounded px-3 py-1.5 capitalize transition-colors",
                profile === p ? "bg-primary-foreground text-primary" : "hover:bg-primary-foreground/10",
              )}
            >
              {p}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
