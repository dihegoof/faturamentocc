import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser, signOut, canAccess, homeFor, type AppProfile } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: ({ location }) => {
    const user = getStoredUser();
    if (!user) throw redirect({ to: "/login" });
    if (!canAccess(user.profile, location.pathname)) {
      throw redirect({ to: homeFor(user.profile) });
    }
    return { user };
  },
  component: AppShell,
});

const NAV: { to: string; label: string; profiles: AppProfile[] }[] = [
  { to: "/faturamento", label: "Faturamento", profiles: ["faturamento", "admin"] },
  { to: "/remessa", label: "Remessa", profiles: ["remessa", "admin"] },
  { to: "/usuarios", label: "Usuários", profiles: ["admin"] },
];

function AppShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const items = NAV.filter((n) => n.profiles.includes(user.profile));

  function logout() {
    signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center gap-6 bg-sidebar px-4 text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
            CC
          </span>
          <span className="text-sm font-semibold">Cargas CocaCola</span>
        </div>

        <nav className="flex h-full items-stretch gap-1">
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center border-b-2 border-transparent px-3 text-sm hover:text-sidebar-accent-foreground"
              activeProps={{ className: "border-sidebar-primary text-sidebar-accent-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-xs">
          <span>{user.display_name || user.username}</span>
          <Button variant="ghost" size="sm" onClick={logout} className="h-7 gap-1 px-2">
            <LogOut className="size-3.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
