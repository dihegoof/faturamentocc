import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  deleteClient,
  fetchClients,
  saveClient,
  type Client,
  type ClientInput,
} from "@/lib/cargo-api";


export function ClientsSection() {
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["clients"] });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) =>
      [c.center_code, c.name, c.cnpj, c.customer_code, c.itinerary].some((v) =>
        v?.toLowerCase().includes(t),
      ),
    );
  }, [clients, q]);

  async function remove(c: Client) {
    if (!confirm(`Remover o cliente ${c.name}?`)) return;
    try {
      await deleteClient(c.id);
      toast.success("Cliente removido");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold">Clientes</h2>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por centro, nome, CNPJ, código ou itinerário"
          className="max-w-sm bg-card"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} cliente(s)</span>
        <Button size="sm" className="ml-auto" onClick={() => setEditing("new")}>
          <Plus className="mr-1 size-4" /> Novo cliente
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-2 font-medium">Centro</th>
              <th className="border-b px-3 py-2 font-medium">Cliente</th>
              <th className="border-b px-3 py-2 font-medium">CNPJ</th>
              <th className="border-b px-3 py-2 font-medium">Código cliente</th>
              <th className="border-b px-3 py-2 font-medium">Itinerário</th>
              <th className="border-b px-3 py-2 font-medium">Pallet</th>
              <th className="border-b px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono">
                  {c.center_code || <span className="text-muted-foreground">Venda direta</span>}
                </td>
                <td className="px-3 py-2">
                  {c.name}
                  {c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}
                </td>
                <td className="px-3 py-2 font-mono">{c.cnpj || "—"}</td>
                <td className="px-3 py-2 font-mono">{c.customer_code || "—"}</td>
                <td className="px-3 py-2 font-mono">{c.itinerary || "—"}</td>
                <td className="px-3 py-2">{c.pallet_type || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => setEditing(c)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Remover" onClick={() => remove(c)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ClientDialog
          client={editing === "new" ? undefined : editing}
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

const FIELDS: { key: keyof ClientInput; label: string; placeholder?: string }[] = [
  {
    key: "center_code",
    label: "Centro (sigla)",
    placeholder: "Ex: BFBP — vazio para venda direta",
  },
  { key: "name", label: "Cliente", placeholder: "Ex: SPAL - FRANCISCO BELTRÃO" },
  { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
  { key: "customer_code", label: "Código do cliente", placeholder: "Ex: 7120198855" },
  { key: "itinerary", label: "Itinerário", placeholder: "Ex: BR0960" },
  { key: "pallet_type", label: "Pallet", placeholder: "VENDA / EMPRESTIMO" },
  { key: "notes", label: "Observação" },
];

function ClientDialog({
  client,
  onClose,
  onSaved,
}: {
  client?: Client | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map((f) => [f.key, (client?.[f.key] as string | null | undefined) ?? ""]),
    ),
  );
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const value = (k: string) => form[k]?.trim() || null;
    const name = value("name");
    if (!name) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setBusy(true);
    try {
      await saveClient(
        {
          center_code: value("center_code")?.toUpperCase() ?? null,
          name,
          cnpj: value("cnpj"),
          customer_code: value("customer_code"),
          itinerary: value("itinerary")?.toUpperCase() ?? null,
          pallet_type: value("pallet_type"),
          notes: value("notes"),
        },
        client?.id,
      );
      toast.success(client ? "Cliente atualizado" : "Cliente cadastrado");
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div
              key={f.key}
              className={
                f.key === "name" || f.key === "notes" ? "space-y-1 sm:col-span-2" : "space-y-1"
              }
            >
              <Label htmlFor={`client-${f.key}`} className="text-xs">
                {f.label}
              </Label>
              <Input
                id={`client-${f.key}`}
                value={form[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="h-9"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
