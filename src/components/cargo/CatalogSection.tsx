import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCatalog, fetchCatalog, saveCatalog } from "@/lib/cargo-api";

/** Produtos: ID, descrição e caixas por palete (usado para conferir importações e calcular MB). */
export function CatalogSection() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog });
  const [n, setN] = useState({ code: "", sap_code: "", short_name: "", description: "", boxes_per_pallet: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["catalog"] });
  const run = async (fn: () => Promise<void>) => {
    try { await fn(); await refresh(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-display text-xl font-bold">Produtos</h2>
      <p className="text-xs text-muted-foreground">
        ID cliente = código que vem na planilha da Remessa. Cód. SAP e nome curto aparecem nos cards do Faturamento e na carga MB.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-2">ID cliente</th><th className="p-2">Cód. SAP</th><th className="p-2">Nome curto</th><th className="p-2">Descrição</th><th className="p-2">Cx / palete</th><th /></tr>
          </thead>
          <tbody>
            {data.map((p) => {
              const update = (patch: Partial<{ sap_code: string | null; short_name: string | null; boxes_per_pallet: number }>) =>
                void run(() => saveCatalog({ code: p.code, description: p.description, boxes_per_pallet: Number(p.boxes_per_pallet), sap_code: p.sap_code, short_name: p.short_name, ...patch }, p.id));
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-mono">{p.code}</td>
                  <td className="p-2">
                    <Input defaultValue={p.sap_code ?? ""} className="h-8 w-24 font-mono"
                      onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (p.sap_code ?? null)) update({ sap_code: v }); }} />
                  </td>
                  <td className="p-2">
                    <Input defaultValue={p.short_name ?? ""} className="h-8 w-28"
                      onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (p.short_name ?? null)) update({ short_name: v }); }} />
                  </td>
                  <td className="p-2">{p.description}</td>
                  <td className="p-2">
                    <Input type="number" defaultValue={Number(p.boxes_per_pallet)} className="h-8 w-24"
                      onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(p.boxes_per_pallet)) update({ boxes_per_pallet: v }); }} />
                  </td>
                  <td className="p-2 text-right">
                    <Button size="icon" variant="ghost" aria-label="Remover produto" onClick={() => confirm(`Remover ${p.code}?`) && void run(() => deleteCatalog(p.id))}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t">
              <td className="p-2"><Input placeholder="ID cliente" value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} className="h-8" /></td>
              <td className="p-2"><Input placeholder="SAP" value={n.sap_code} onChange={(e) => setN({ ...n, sap_code: e.target.value })} className="h-8 w-24" /></td>
              <td className="p-2"><Input placeholder="Nome curto" value={n.short_name} onChange={(e) => setN({ ...n, short_name: e.target.value })} className="h-8 w-28" /></td>
              <td className="p-2"><Input placeholder="Descrição" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} className="h-8" /></td>
              <td className="p-2"><Input type="number" placeholder="Cx" value={n.boxes_per_pallet} onChange={(e) => setN({ ...n, boxes_per_pallet: e.target.value })} className="h-8 w-24" /></td>
              <td className="p-2 text-right">
                <Button size="icon" aria-label="Adicionar produto" disabled={!n.code.trim() || !n.description.trim()}
                  onClick={() => void run(async () => {
                    await saveCatalog({ code: n.code.trim().toUpperCase(), sap_code: n.sap_code.trim() || null, short_name: n.short_name.trim() || null, description: n.description.trim(), boxes_per_pallet: Number(n.boxes_per_pallet) || 0 });
                    setN({ code: "", sap_code: "", short_name: "", description: "", boxes_per_pallet: "" });
                  })}>
                  <Plus className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
