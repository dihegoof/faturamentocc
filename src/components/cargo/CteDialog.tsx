import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchContacts, updateLoad } from "@/lib/cargo-api";
import { buildCteEmail, cteRecipients, type CargoLoad } from "@/lib/cargo";

export function CteDialog({ loads, onClose }: { loads: CargoLoad[] | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
  const list = loads ?? [];
  const email = list.length ? buildCteEmail(list) : { subject: "", body: "" };
  const { to, cc } = cteRecipients(contacts, list[0]?.carrier);
  const carrierCount = list.length ? to.length - contacts.filter((c) => c.kind === "to_fixed").length : 0;
  const mailto = `mailto:${to.join(";")}?cc=${encodeURIComponent(cc.join(";"))}&subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;

  const markRequested = async () => {
    try {
      const now = new Date().toISOString();
      for (const l of list) await updateLoad(l, { cte_requested_at: now }, "CT-e manual solicitado", "faturamento", email.subject);
      qc.invalidateQueries({ queryKey: ["loads"] });
      toast.success("Solicitação registrada");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={!!loads?.length} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Solicitar CT-e manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-semibold">Para</div>
            <Textarea readOnly rows={2} value={to.join("; ")} className="text-xs" />
            {carrierCount <= 0 && (
              <p className="mt-1 text-xs font-semibold text-destructive">
                Nenhum e-mail cadastrado para "{list[0]?.carrier ?? "—"}". Cadastre no Painel.
              </p>
            )}
          </div>
          <div>
            <div className="font-semibold">Cc</div>
            <Textarea readOnly rows={2} value={cc.join("; ")} className="text-xs" />
          </div>
          <div className="font-semibold">Assunto</div>
          <Input readOnly value={email.subject} />
          <div className="font-semibold">Mensagem</div>
          <Textarea readOnly rows={11} value={email.body} className="font-mono text-xs" />
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(email.body); toast.success("Mensagem copiada"); }}>
            <Copy className="h-4 w-4" /> Copiar mensagem
          </Button>
          <Button variant="outline" asChild>
            <a href={mailto}><Mail className="h-4 w-4" /> Abrir no Outlook</a>
          </Button>
          <Button onClick={markRequested}>Registrar solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
