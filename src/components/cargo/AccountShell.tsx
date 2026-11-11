import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, canAccess, homeFor, type AppUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AccountShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const path = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    let current = true;
    getCurrentUser().then((u) => {
      if (!current) return;
      if (!u) {
        void navigate({ to: "/auth", replace: true });
        return;
      }
      if (!canAccess(u.profile, path)) {
        void navigate({ to: homeFor(u.profile), replace: true });
        return;
      }
      setUser(u);
    });
    return () => {
      current = false;
    };
  }, [navigate, path]);
  if (!user || !canAccess(user.profile, path))
    return <p className="p-6 text-muted-foreground">Carregando conta…</p>;
  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b bg-sidebar px-4 py-2 text-sidebar-foreground">
        <span className="font-semibold">{user.display_name || user.email}</span>
        <nav className="flex flex-wrap gap-3 text-sm">
          {(user.profile === "admin" || user.profile === "faturamento") && (
            <Link to="/faturamento">Faturamento</Link>
          )}
          {(user.profile === "admin" || user.profile === "faturamento") && (
            <Link to="/clientes">Clientes</Link>
          )}
          {(user.profile === "admin" || user.profile === "remessa") && (
            <Link to="/remessa">Remessa</Link>
          )}
          {user.profile === "admin" && <Link to="/usuarios">Usuários</Link>}
        </nav>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={logout}>
          <LogOut className="size-4" />
          Sair
        </Button>
      </header>
      {children}
    </div>
  );
}
