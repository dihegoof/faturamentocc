import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Truck, LogIn, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, signIn, homeFor } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Entrar — Cargas CocaCola" },
    { name: "description", content: "Acesso por e-mail à operação de cargas CocaCola." },
    { property: "og:title", content: "Entrar — Cargas CocaCola" },
    { property: "og:description", content: "Acesso à plataforma operacional de cargas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LoginPage,
});

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasAdmin, setHasAdmin] = useState(true);
  useEffect(() => { void supabase.rpc("platform_has_admin").then(({ data }) => setHasAdmin(data !== false)); }, []);
  useEffect(() => { void getCurrentUser().then((u) => { if (u) void navigate({ to: homeFor(u.profile), replace: true }); }); }, [navigate]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
        setMessage("Confira seu e-mail para confirmar a conta de administrador antes de entrar.");
      } else {
        const user = await signIn(email, password);
        await navigate({ to: homeFor(user.profile), replace: true });
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível acessar."); }
    finally { setBusy(false); }
  }
  function switchMode(next: typeof mode) { setMode(next); setError(""); setMessage(""); }
  return <div className="flex min-h-screen flex-col bg-background">
    <header className="flex items-center gap-3 border-b bg-primary px-6 py-5 text-primary-foreground"><Truck className="size-7" /><span className="font-display text-2xl font-bold">CARGAS · COCA COLA</span></header>
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div><span className="text-sm font-semibold uppercase text-primary">Operação de cargas</span><h1 className="mt-2 font-display text-4xl font-bold">{mode === "signup" ? "Criar administrador" : mode === "forgot" ? "Recuperar senha" : "Entrar na plataforma"}</h1></div>
        <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {mode !== "forgot" && <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-foreground">{message}</p>}
        <Button type="submit" disabled={busy} className="w-full">{mode === "login" ? <LogIn className="size-4" /> : mode === "signup" ? <UserPlus className="size-4" /> : <Mail className="size-4" />}{busy ? "Aguarde…" : mode === "signup" ? "Criar conta de administrador" : mode === "forgot" ? "Enviar link" : "Entrar"}</Button>
        <div className="flex flex-wrap justify-between gap-2">
          {(mode !== "login" || !hasAdmin) && <Button type="button" variant="link" className="px-0" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Primeiro acesso: criar administrador" : "Voltar para entrar"}</Button>}
          {mode === "login" && <Button type="button" variant="link" className="px-0" onClick={() => switchMode("forgot")}>Esqueci a senha</Button>}
        </div>
      </form>
    </main>
  </div>;
}
