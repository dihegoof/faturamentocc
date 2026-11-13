import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteContact, fetchContacts, saveContact, type ContactKind } from "@/lib/cargo-api";

/** E-mails usados na solicitação de CT-e manual: Para fixo, cópia fixa e por transportadora. */
export function ContactsSection() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
  const groups = useMemo(() => {
    const m = new Map<string, typeof data>();
    for (const c of data) {
      const k = c.kind === "to_fixed" ? "Para (fixo)" : c.kind === "cc_fixed" ? "Cópia (fixo)" : (c.carrier ?? "—").toUpperCase();
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return [...m.entries()].sort((a, b) => (a[0].includes("fixo") ? -1 : b[0].includes("fixo") ? 1 : a[0].localeCompare(b[0])));
  }, [data]);
  const [kind, setKind] = useState<ContactKind>("carrier");
  const [carrier, setCarrier] = useState("");
  const [email, setEmail] = useState("");
  const run = async (fn: () => Promise<void>) => {
    try { await fn(); await qc.invalidateQueries({ queryKey: ["contacts"] }); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-display text-xl font-bold">E-mails para CT-e manual</h2>
      <div className="flex flex-wrap gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as ContactKind)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="carrier">Transportadora</option>
          <option value="to_fixed">Para (fixo)</option>
          <option value="cc_fixed">Cópia (fixo)</option>
        </select>
        {kind === "carrier" && <Input placeholder="Transportadora" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-44" />}
        <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-64" />
        <Button disabled={!email.includes("@") || (kind === "carrier" && !carrier.trim())}
          onClick={() => void run(async () => { await saveContact({ kind, email, carrier }); setEmail(""); })}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([g, list]) => (
          <div key={g} className="rounded-md border p-2">
            <div className="mb-1 text-sm font-semibold">{g} <span className="font-normal text-muted-foreground">· {list.length}</span></div>
            <div className="flex flex-wrap gap-1">
              {list.map((c) => (
                <span key={c.id} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {c.email}
                  <button type="button" aria-label={`Remover ${c.email}`} onClick={() => void run(() => deleteContact(c.id))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
