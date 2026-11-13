import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtNum, isValidPlate, normalizePlate, palletsFor, todayISO } from "@/lib/cargo";
import { fetchCatalog, importLoads } from "@/lib/cargo-api";

type Row = { code: string; boxes: string };

/** MB (franquia): Remessa imports without DT; products typed by boxes. Faturamento fills the DT later. */
export function ImportMBDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { data: catalog = [] } = useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog, enabled: open });
  const empty = { load_number: "", plate: "", carrier: "", destination: "", load_date: todayISO() };
  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState<Row[]>([{ code: "", boxes: "" }]);
  const [saving, setSaving] = useState(false);
  const lines = rows.map((r) => {
    const p = catalog.find((c) => c.code === r.code);
    const boxes = Number(r.boxes) || 0;
    return { ...r, product: p, boxes, pallets: p ? palletsFor(boxes, Number(p.boxes_per_pallet)) : 0 };
  });
  const totalBoxes = lines.reduce((s, l) => s + l.boxes, 0);
  const totalPallets = Math.round(lines.reduce((s, l) => s + l.pallets, 0) * 100) / 100;

  const save = async (): Promise<void> => {
    if (!form.load_number || !form.plate) { toast.error("Informe carga e placa"); return; }
    const valid = lines.filter((l) => l.product && l.boxes > 0);
    if (!valid.length) { toast.error("Informe ao menos um produto com caixas"); return; }
    setSaving(true);
    try {
      const { inserted, skipped } = await importLoads([{
        ...form, origin: "MB", destination_code: "", dt: "",
        plate: normalizePlate(form.plate), pallets: totalPallets,
        products: valid.map((l) => ({ code: l.product!.code, description: l.product!.short_name || l.product!.description, boxes: l.boxes })),
        warnings: isValidPlate(form.plate) ? [] : [`Placa fora do padrão: ${normalizePlate(form.plate)}`],
      }], "MB", "remessa");
      if (skipped.length) toast.warning(`Carga ${form.load_number} já existe nesta data`);
      if (inserted) {
        toast.success("Carga MB importada — o Faturamento informa o DT");
        qc.invalidateQueries({ queryKey: ["loads"] });
        setForm(empty); setRows([{ code: "", boxes: "" }]); onOpenChange(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Importar carga MB</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {([["load_number", "Nº Carga"], ["plate", "Placa"], ["carrier", "Transportadora"], ["destination", "Destino"], ["load_date", "Data"]] as const).map(([k, l]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`mb-${k}`}>{l}</Label>
              <Input id={`mb-${k}`} type={k === "load_date" ? "date" : "text"} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">Produto</th><th className="p-2">Caixas</th><th className="p-2 text-right">Paletes</th><th /></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <select aria-label="Produto" value={l.code} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, code: e.target.value } : r)))} className="h-8 w-full rounded-md border bg-background px-2">
                      <option value="">Selecione…</option>
                      {catalog.map((c) => <option key={c.id} value={c.code}>{c.sap_code || c.code} {c.short_name || c.description}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><Input type="number" min={0} aria-label="Caixas" className="h-8 w-28" value={l.boxes || ""} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, boxes: e.target.value } : r)))} /></td>
                  <td className="p-2 text-right font-mono">{l.pallets ? fmtNum(l.pallets) : "—"}</td>
                  <td className="p-2 text-right">
                    <Button size="icon" variant="ghost" aria-label="Remover linha" onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.length === 1}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="p-2"><Button size="sm" variant="ghost" onClick={() => setRows([...rows, { code: "", boxes: "" }])}><Plus className="h-4 w-4" /> Produto</Button></td>
                <td className="p-2 font-mono">{fmtNum(totalBoxes)} cx</td>
                <td className="p-2 text-right font-mono">{fmtNum(totalPallets)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        {!catalog.length && <p className="text-xs text-muted-foreground">Nenhum produto cadastrado — o Painel cadastra os produtos.</p>}
        <DialogFooter><Button onClick={save} disabled={saving}>Gravar carga MB</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
