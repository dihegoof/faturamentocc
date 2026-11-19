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
  const [kind, setKind] = useState<ContactKind>("carrier");
  const [carrier, setCarrier] = useState("");
  const [email, setEmail] = useState("");
  /** Qual grupo aparece: "to_fixed", "cc_fixed" ou o nome de uma transportadora. */
  const [view, setView] = useState<string>("to_fixed");

  const carriers = useMemo(
    () => [...new Set(data.filter((c) => c.kind === "carrier").map((c) => (c.carrier ?? "").toUpperCase()))]
      .filter(Boolean)
      .sort(),
    [data],
  );

  /** Só o que foi selecionado — o div não cresce com a lista inteira. */
  const visible = useMemo(() => {
    if (view === "to_fixed" || view === "cc_fixed")
      return data.filter((c) => c.kind === view);
    return data.filter((c) => c.kind === "carrier" && (c.carrier ?? "").toUpperCase() === view);
  }, [data, view]);
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Ver:</span>
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="to_fixed">Para (fixo)</option>
          <option value="cc_fixed">Cópia (fixo)</option>
          {carriers.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{visible.length} e-mail(s)</span>
      </div>

      <div className="rounded-md border p-2">
        {visible.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Nenhum e-mail neste grupo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visible.map((c) => (
              <span key={c.id} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                {c.email}
                <button type="button" aria-label={`Remover ${c.email}`} onClick={() => void run(() => deleteContact(c.id))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
