import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Mail, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { addContact, fetchContacts, updateLoad } from "@/lib/cargo-api";
import { buildCteEmail, type CargoLoad } from "@/lib/cargo";

export function CteDialog({ load, onClose }: { load: CargoLoad | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
  const [selected, setSelected] = useState<string[]>([]);
  const [newC, setNewC] = useState({ name: "", email: "" });
  const email = load ? buildCteEmail(load) : { subject: "", body: "" };
  const to = contacts.filter((c) => selected.includes(c.id)).map((c) => c.email);

  const markRequested = async () => {
    if (!load) return;
    await updateLoad(load, { cte_requested_at: new Date().toISOString() }, "CT-e manual solicitado", "faturamento", to.join(", ") || undefined);
    qc.invalidateQueries({ queryKey: ["loads"] });
    toast.success("Solicitação registrada — cronômetro de espera iniciado");
    onClose();
  };

  return (
    <Dialog open={!!load} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Solicitar CT-e manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-sm font-semibold">Contatos</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={(v) => setSelected((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                />
                <span>
                  <span className="font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Nome" value={newC.name} onChange={(e) => setNewC({ ...newC, name: e.target.value })} />
            <Input placeholder="E-mail" value={newC.email} onChange={(e) => setNewC({ ...newC, email: e.target.value })} />
            <Button
              variant="outline"
              size="icon"
              aria-label="Adicionar contato"
              onClick={async () => {
                if (!newC.name || !newC.email.includes("@")) { toast.error("Informe nome e e-mail válidos"); return; }
                await addContact(newC);
                setNewC({ name: "", email: "" });
                qc.invalidateQueries({ queryKey: ["contacts"] });
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold">Assunto</div>
          <Input readOnly value={email.subject} />
          <div className="text-sm font-semibold">Mensagem</div>
          <Textarea readOnly rows={11} value={email.body} className="font-mono text-xs" />
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`);
              toast.success("E-mail copiado");
            }}
          >
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${to.join(";")}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}>
              <Mail className="h-4 w-4" /> Abrir no Outlook
            </a>
          </Button>
          <Button onClick={markRequested}>Registrar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
