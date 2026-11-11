import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import type { Profile } from "@/lib/cargo";

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
        <span className="text-sm font-semibold capitalize">{profile}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
