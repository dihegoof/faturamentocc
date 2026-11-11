import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStoredUser, usersQuery, type AppProfile, type AppUser } from "@/lib/auth";

export const Route = createFileRoute("/usuarios")({
  ssr: false,
  beforeLoad: () => {
    const user = getStoredUser();
    if (!user) throw redirect({ to: "/auth" });
    if (user.profile !== "admin") throw redirect({ to: "/faturamento" });
  },
  head: () => ({ meta: [{ title: "Usuários — Cargas CocaCola" }] }),
  component: UsersPage,
});

const PROFILES: { value: AppProfile; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "faturamento", label: "Faturamento" },
  { value: "remessa", label: "Remessa" },
];

const profileLabel = (p: string) => PROFILES.find((x) => x.value === p)?.label ?? p;

function UsersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery(usersQuery);
  const [editing, setEditing] = useState<AppUser | "new" | null>(null);

  async function toggleActive(u: AppUser) {
    const { error } = await supabase.from("app_users").update({ active: !u.active }).eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success(u.active ? "Usuário desativado" : "Usuário ativado");
    qc.invalidateQueries({ queryKey: ["app_users"] });
  }

  async function remove(u: AppUser) {
    if (!confirm(`Remover o usuário ${u.username}?`)) return;
    const { error } = await supabase.from("app_users").delete().eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Usuário removido");
    qc.invalidateQueries({ queryKey: ["app_users"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/faturamento">
            <ArrowLeft className="mr-1 size-4" /> Voltar
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Usuários</h1>
        <Button size="sm" className="ml-auto" onClick={() => setEditing("new")}>
          <Plus className="mr-1 size-4" /> Novo usuário
        </Button>
      </div>

      <div className="rounded-md border bg-panel">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-2 font-medium">Usuário</th>
              <th className="border-b px-3 py-2 font-medium">Nome</th>
              <th className="border-b px-3 py-2 font-medium">Perfil</th>
              <th className="border-b px-3 py-2 font-medium">Situação</th>
              <th className="border-b px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono">{u.username}</td>
                <td className="px-3 py-2">{u.display_name || "—"}</td>
                <td className="px-3 py-2">{profileLabel(u.profile)}</td>
                <td className="px-3 py-2">
                  <span className={u.active ? "text-emerald-600" : "text-muted-foreground"}>
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditing(u)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={u.active ? "Desativar" : "Ativar"}
                      onClick={() => toggleActive(u)}
                    >
                      {u.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" title="Remover" onClick={() => remove(u)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserDialog
          user={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["app_users"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user?: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<AppProfile>(user?.profile ?? "remessa");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!u) { toast.error("Informe o usuário."); return; }
    if (!user && !password) { toast.error("Informe a senha."); return; }

    setBusy(true);
    try {
      if (user) {
        const patch: Record<string, unknown> = { username: u, display_name: displayName, profile };
        if (password) patch.password = password;
        const { error } = await supabase.from("app_users").update(patch).eq("id", user.id);
        if (error) throw error;
        toast.success("Usuário atualizado");
      } else {
        const { error } = await supabase
          .from("app_users")
          .insert({ username: u, password, display_name: displayName, profile });
        if (error) throw error;
        toast.success("Usuário criado");
      }
      onSaved();
    } catch (err) {
      toast.error((err as { message: string }).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Usuário (login)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="h-9" autoFocus />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Senha {user && <span className="text-muted-foreground">(deixe vazio para não alterar)</span>}
            </Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9"
              placeholder={user ? "••••" : ""}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Perfil</Label>
            <select
              className="h-9 w-full rounded-md border bg-panel px-2 text-sm"
              value={profile}
              onChange={(e) => setProfile(e.target.value as AppProfile)}
            >
              {PROFILES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
