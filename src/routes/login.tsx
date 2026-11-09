import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: () => {
    const user = getStoredUser();
    if (user) throw redirect({ to: homeFor(user.profile) });
  },
  head: () => ({ meta: [{ title: "Entrar — Cargas CocaCola" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await signIn(username, password);
      toast.success(`Bem-vindo, ${user.display_name || user.username}`);
      navigate({ to: homeFor(user.profile) });
    } catch (err) {
      toast.error((err as { message: string }).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-lg border bg-panel p-6 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
            CC
          </div>
          <h1 className="text-lg font-semibold">Cargas CocaCola</h1>
          <p className="text-xs text-muted-foreground">Entre com seu usuário</p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Usuário</Label>
          <Input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Senha</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-9"
          />
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
