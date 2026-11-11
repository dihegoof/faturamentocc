import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Pencil, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { AccountShell } from "@/components/cargo/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { usersQuery, type AppProfile, type AppUser } from "@/lib/auth";
import { deleteAccount, inviteAccount, updateAccount } from "@/lib/accounts.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Cargas CocaCola" }] }),
  component: () => (
    <AccountShell>
      <UsersPage />
    </AccountShell>
  ),
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
  const { data: myId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const update = useServerFn(updateAccount);
  const remove = useServerFn(deleteAccount);
  const [editing, setEditing] = useState<AppUser | "new" | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: usersQuery.queryKey });

  async function toggleActive(u: AppUser) {
    try {
      await update({ data: { id: u.id, active: !u.active } });
      toast.success(u.active ? "Usuário desativado" : "Usuário ativado");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function removeUser(u: AppUser) {
    if (!confirm(`Remover o usuário ${u.email}? Esta ação não pode ser desfeita.`)) return;
    try {
      await remove({ data: { id: u.id } });
      toast.success("Usuário removido");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Usuários</h1>
        <Button size="sm" className="ml-auto" onClick={() => setEditing("new")}>
          <UserPlus className="mr-1 size-4" /> Convidar usuário
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-2 font-medium">E-mail</th>
              <th className="border-b px-3 py-2 font-medium">Nome</th>
              <th className="border-b px-3 py-2 font-medium">Perfil</th>
              <th className="border-b px-3 py-2 font-medium">Situação</th>
              <th className="border-b px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u.id === myId;
              return (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono">
                    {u.email}
                    {isMe && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                  </td>
                  <td className="px-3 py-2">{u.display_name || "—"}</td>
                  <td className="px-3 py-2">{profileLabel(u.profile)}</td>
                  <td className="px-3 py-2">
                    <span className={u.active ? "text-emerald-600" : "text-muted-foreground"}>
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {!isMe && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => setEditing(u)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={u.active ? "Desativar" : "Ativar"}
                          onClick={() => toggleActive(u)}
                        >
                          {u.active ? (
                            <UserX className="size-4" />
                          ) : (
                            <UserCheck className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remover"
                          onClick={() => removeUser(u)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
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
            void refresh();
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
  user?: AppUser | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const invite = useServerFn(inviteAccount);
  const update = useServerFn(updateAccount);
  const [email, setEmail] = useState(user?.email ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [profile, setProfile] = useState<AppProfile>(user?.profile ?? "remessa");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    setBusy(true);
    try {
      if (user) {
        await update({ data: { id: user.id, display_name: displayName.trim(), role: profile } });
        toast.success("Usuário atualizado");
      } else {
        await invite({
          data: { email: email.trim(), display_name: displayName.trim(), role: profile },
        });
        toast.success("Convite enviado por e-mail");
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuário" : "Convidar usuário"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="user-email" className="text-xs">
              E-mail
            </Label>
            <Input
              id="user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
              disabled={!!user}
              autoFocus={!user}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="user-name" className="text-xs">
              Nome
            </Label>
            <Input
              id="user-name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="user-profile" className="text-xs">
              Perfil
            </Label>
            <select
              id="user-profile"
              className="h-9 w-full rounded-md border bg-card px-2 text-sm"
              value={profile}
              onChange={(e) => setProfile(e.target.value as AppProfile)}
            >
              {PROFILES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {!user && (
            <p className="text-xs text-muted-foreground">
              O usuário recebe um e-mail com link para definir a senha.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={busy}>
              {busy ? "Salvando…" : user ? "Salvar" : "Enviar convite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
