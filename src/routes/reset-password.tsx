import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Definir senha — Cargas CocaCola" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setReady(true);
      else
        setTimeout(() => {
          if (active) setReady((r) => r ?? false);
        }, 2000);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const user = await getCurrentUser();
      if (!user) {
        await supabase.auth.signOut();
        throw new Error(
          "Senha definida, mas a conta está sem acesso ou desativada. Consulte o administrador.",
        );
      }
      await navigate({ to: homeFor(user.profile), replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível definir a senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b bg-primary px-6 py-5 text-primary-foreground">
        <Truck className="size-7" />
        <span className="font-display text-2xl font-bold">CARGAS · COCA COLA</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        {ready === false ? (
          <div className="w-full max-w-sm space-y-4">
            <h1 className="font-display text-3xl font-bold">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground">
              Peça um novo convite ao administrador ou use "Esqueci a senha" na tela de login.
            </p>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Ir para o login
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="w-full max-w-sm space-y-5">
            <div>
              <span className="text-sm font-semibold uppercase text-primary">
                Operação de cargas
              </span>
              <h1 className="mt-2 font-display text-4xl font-bold">Definir senha</h1>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !ready} className="w-full">
              <KeyRound className="size-4" />
              {ready === null ? "Validando link…" : busy ? "Aguarde…" : "Salvar senha"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
