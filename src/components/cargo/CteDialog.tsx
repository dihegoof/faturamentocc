import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchContacts } from "@/lib/cargo-api";
import { useUpdateLoad } from "@/hooks/use-loads";
import { buildCteEmail, carrierMatches, cteRecipients, formatPlateLine, type CargoLoad } from "@/lib/cargo";

/** CT-e manual e-mail. Other "impressa" loads of the same carrier can be added to the same e-mail. */
export function CteDialog({
  loads,
  candidates = [],
  onClose,
}: {
  loads: CargoLoad[] | null;
  candidates?: CargoLoad[];
  onClose: () => void;
}) {
  const update = useUpdateLoad();
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });
  const [extra, setExtra] = useState<string[]>([]);
  const baseIds = (loads ?? []).map((l) => l.id).join(",");
  useEffect(() => setExtra([]), [baseIds]);
  const others = loads?.length
    ? candidates.filter((c) => !loads.some((l) => l.id === c.id) && carrierMatches(c.carrier, loads[0]!.carrier))
    : [];
  const list = [...(loads ?? []), ...others.filter((o) => extra.includes(o.id))];
  const email = list.length ? buildCteEmail(list) : { subject: "", body: "" };
  const { to, cc } = cteRecipients(contacts, list[0]?.carrier);
  const carrierCount = list.length ? to.length - contacts.filter((c) => c.kind === "to_fixed").length : 0;
  const mailto = `mailto:${to.join(";")}?cc=${encodeURIComponent(cc.join(";"))}&subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;

  const markRequested = () => {
    const now = new Date().toISOString();
    Promise.all(
      list.map((l) => update(l, { cte_requested_at: now }, "CT-e manual solicitado", "faturamento", email.subject)),
    ).catch((e: Error) => toast.error(e.message));
    toast.success("Solicitação registrada");
    onClose();
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
          {others.length > 0 && (
            <div className="rounded-md border p-2">
              <div className="mb-1 font-semibold">Juntar outras cargas da {list[0]?.carrier} no mesmo e-mail</div>
              <div className="space-y-1">
                {others.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={extra.includes(o.id)}
                      onCheckedChange={(v) => setExtra((x) => (v ? [...x, o.id] : x.filter((id) => id !== o.id)))}
                    />
                    <span className="font-semibold">{formatPlateLine(o)}</span>
                    <span className="text-muted-foreground">Carga {o.load_number}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
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
          <Button onClick={markRequested}>Confirmar que solicitei</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
