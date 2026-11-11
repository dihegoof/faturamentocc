import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchClientByCenter, fetchLoadDetail, updateLoad } from "@/lib/cargo-api";
import { formatPlateLine, statusLabel, type CargoLoad, type Profile } from "@/lib/cargo";
import { StatusBadge } from "./StatusBadge";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function LoadDetailDialog({
  load,
  onClose,
  profile,
}: {
  load: CargoLoad | null;
  onClose: () => void;
  profile: Profile;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["load-detail", load?.id],
    queryFn: () => fetchLoadDetail(load!.id),
    enabled: !!load,
  });
  const centerCode = load?.destination_code ?? "";
  const { data: client } = useQuery({
    queryKey: ["client-by-center", centerCode],
    queryFn: () => fetchClientByCenter(centerCode),
    enabled: !!centerCode,
  });
  const totalBoxes = data?.products.reduce((s, p) => s + Number(p.boxes ?? 0), 0) ?? 0;

  return (
    <Dialog open={!!load} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {load && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-3 font-display text-2xl">
                Espelho da Carga {load.load_number} <StatusBadge status={load.status} />
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-md bg-secondary px-3 py-2 font-mono text-sm text-secondary-foreground">
              {formatPlateLine(load, profile)}
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              {[
                ["Data prevista", new Date(load.load_date + "T12:00").toLocaleDateString("pt-BR")],
                ["DT motorista", load.dt || "—"],
                ["Centro origem", load.origin || "—"],
                [
                  "Centro destino",
                  [load.destination_code, load.destination].filter(Boolean).join(" · ") || "—",
                ],
                ["Transportadora", load.carrier || "—"],
                ["Pallets", String(Number(load.pallets ?? 0))],
                ["Notas", load.invoice_numbers || "—"],
                ["Corte", load.corte_reason || "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border p-2">
                  <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <section className="rounded-md border p-3">
              <h3 className="mb-2 font-display text-lg font-bold">Cliente</h3>
              {client ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
                  {[
                    ["Cliente", client.name],
                    ["CNPJ", client.cnpj || "—"],
                    ["Código do cliente", client.customer_code || "—"],
                    ["Itinerário", client.itinerary || "—"],
                    ["Pallet", client.pallet_type || "—"],
                    ["Observação", client.notes || "—"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase text-muted-foreground">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {centerCode
                    ? `Nenhum cliente cadastrado para o centro ${centerCode}.`
                    : "Carga sem sigla de destino."}
                </p>
              )}
            </section>

            <OrdersSection key={load.id} load={load} editable={profile === "faturamento"} />

            <section>
              <h3 className="mb-2 font-display text-lg font-bold">Produtos</h3>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : data?.products.length ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2">Código</th>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-right">Caixas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-2 font-mono">{p.code}</td>
                          <td className="p-2">{p.description}</td>
                          <td className="p-2 text-right font-mono">{Number(p.boxes)}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-muted/50 font-semibold">
                        <td className="p-2" colSpan={2}>
                          Total
                        </td>
                        <td className="p-2 text-right font-mono">{totalBoxes}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem produtos cadastrados.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 font-display text-lg font-bold">Linha do tempo</h3>
              <ol className="relative space-y-3 border-l-2 border-primary/30 pl-4">
                {data?.history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full bg-primary" />
                    <div className="text-sm font-semibold">
                      {h.event}
                      {h.to_status && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          → {statusLabel(h.to_status)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fmt(h.created_at)} · {h.profile}
                      {h.details ? ` · ${h.details}` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrdersSection({ load, editable }: { load: CargoLoad; editable: boolean }) {
  const qc = useQueryClient();
  const [productOrder, setProductOrder] = useState(load.product_order ?? "");
  const [palletOrder, setPalletOrder] = useState(load.pallet_order ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    productOrder.trim() !== (load.product_order ?? "") ||
    palletOrder.trim() !== (load.pallet_order ?? "");

  const save = async () => {
    setSaving(true);
    try {
      const product_order = productOrder.trim() || null;
      const pallet_order = palletOrder.trim() || null;
      await updateLoad(
        load,
        { product_order, pallet_order },
        "Ordens registradas",
        "faturamento",
        `Produto: ${product_order ?? "—"} · Palete: ${pallet_order ?? "—"}`,
      );
      load.product_order = product_order;
      load.pallet_order = pallet_order;
      qc.invalidateQueries({ queryKey: ["loads"] });
      qc.invalidateQueries({ queryKey: ["load-detail", load.id] });
      toast.success("Ordens salvas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-md border p-3">
      <h3 className="mb-2 font-display text-lg font-bold">Ordens SAP</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="product-order" className="text-xs">
            Ordem produto
          </Label>
          <Input
            id="product-order"
            inputMode="numeric"
            value={productOrder}
            onChange={(e) => setProductOrder(e.target.value)}
            readOnly={!editable}
            placeholder="Ex: 4059533679"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pallet-order" className="text-xs">
            Ordem palete
          </Label>
          <Input
            id="pallet-order"
            inputMode="numeric"
            value={palletOrder}
            onChange={(e) => setPalletOrder(e.target.value)}
            readOnly={!editable}
            placeholder="Ex: 4063076235"
          />
        </div>
        {editable && (
          <Button onClick={save} disabled={saving || !dirty}>
            <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar ordens"}
          </Button>
        )}
      </div>
    </section>
  );
}
