import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MB_PRODUCTS, boxesFor, isValidPlate, normalizePlate, todayISO } from "@/lib/cargo";
import { importLoads } from "@/lib/cargo-api";

export function ImportMBDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    load_number: "",
    dt: "",
    plate: "",
    carrier: "",
    origin: "MB",
    destination: "",
    load_date: todayISO(),
  });
  const [pallets, setPallets] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const totalPallets = Object.values(pallets).reduce((s, n) => s + (n || 0), 0);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async (): Promise<void> => {
    if (!form.load_number || !form.plate) {
      toast.error("Informe carga e placa");
      return;
    }
    if (!totalPallets) {
      toast.error("Selecione ao menos um produto");
      return;
    }
    setSaving(true);
    try {
      const products = MB_PRODUCTS.filter((p) => (pallets[p.code] ?? 0) > 0).map((p) => ({
        code: p.code,
        description: p.description,
        boxes: boxesFor(p, pallets[p.code] ?? 0),
      }));
      const warnings = isValidPlate(form.plate)
        ? []
        : [`Placa fora do padrão: ${normalizePlate(form.plate)}`];
      const { inserted, skipped } = await importLoads(
        [
          {
            ...form,
            destination_code: "",
            plate: normalizePlate(form.plate),
            dt: form.dt.replace(/\D/g, ""),
            pallets: totalPallets,
            products,
            warnings,
          },
        ],
        "MB",
        "faturamento",
      );
      if (skipped.length) toast.warning(`Carga ${form.load_number} já existe nesta data`);
      if (inserted) {
        toast.success("Carga MB importada como Pendente");
        qc.invalidateQueries({ queryKey: ["loads"] });
        setForm({ ...form, load_number: "", dt: "", plate: "" });
        setPallets({});
        onOpenChange(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Importação rápida — Carga MB</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {(
            [
              ["load_number", "Nº Carga"],
              ["dt", "DT (opcional)"],
              ["plate", "Placa"],
              ["carrier", "Transportadora"],
              ["destination", "Destino"],
              ["load_date", "Data"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`mb-${k}`}>{l}</Label>
              <Input
                id={`mb-${k}`}
                type={k === "load_date" ? "date" : "text"}
                value={form[k]}
                onChange={set(k)}
              />
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Produto</th>
                <th className="p-2">Cx/pallet</th>
                <th className="p-2">Pallets</th>
                <th className="p-2 text-right">Caixas</th>
              </tr>
            </thead>
            <tbody>
              {MB_PRODUCTS.map((p) => (
                <tr key={p.code} className="border-t">
                  <td className="p-2 font-semibold">{p.description}</td>
                  <td className="p-2 font-mono">{p.boxesPerPallet}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      className="h-8 w-24"
                      aria-label={`Pallets ${p.description}`}
                      value={pallets[p.code] ?? ""}
                      onChange={(e) => setPallets({ ...pallets, [p.code]: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-2 text-right font-mono">{boxesFor(p, pallets[p.code] || 0)}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/50 font-semibold">
                <td className="p-2" colSpan={2}>
                  Total
                </td>
                <td className="p-2 font-mono">{totalPallets}</td>
                <td className="p-2 text-right font-mono">
                  {MB_PRODUCTS.reduce((s, p) => s + boxesFor(p, pallets[p.code] || 0), 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            Gravar carga MB
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
