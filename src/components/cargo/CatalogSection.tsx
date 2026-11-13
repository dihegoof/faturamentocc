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
  const [n, setN] = useState({ code: "", description: "", boxes_per_pallet: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["catalog"] });
  const run = async (fn: () => Promise<void>) => {
    try { await fn(); await refresh(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-display text-xl font-bold">Produtos</h2>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-2">ID</th><th className="p-2">Descrição</th><th className="p-2">Cx / palete</th><th /></tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-mono">{p.code}</td>
                <td className="p-2">{p.description}</td>
                <td className="p-2">
                  <Input type="number" defaultValue={Number(p.boxes_per_pallet)} className="h-8 w-24"
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(p.boxes_per_pallet)) void run(() => saveCatalog({ code: p.code, description: p.description, boxes_per_pallet: v }, p.id)); }} />
                </td>
                <td className="p-2 text-right">
                  <Button size="icon" variant="ghost" aria-label="Remover produto" onClick={() => confirm(`Remover ${p.code}?`) && void run(() => deleteCatalog(p.id))}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            <tr className="border-t">
              <td className="p-2"><Input placeholder="ID" value={n.code} onChange={(e) => setN({ ...n, code: e.target.value })} className="h-8" /></td>
              <td className="p-2"><Input placeholder="Descrição" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} className="h-8" /></td>
              <td className="p-2"><Input type="number" placeholder="Cx" value={n.boxes_per_pallet} onChange={(e) => setN({ ...n, boxes_per_pallet: e.target.value })} className="h-8 w-24" /></td>
              <td className="p-2 text-right">
                <Button size="icon" aria-label="Adicionar produto" disabled={!n.code.trim() || !n.description.trim()}
                  onClick={() => void run(async () => { await saveCatalog({ code: n.code.trim().toUpperCase(), description: n.description.trim(), boxes_per_pallet: Number(n.boxes_per_pallet) || 0 }); setN({ code: "", description: "", boxes_per_pallet: "" }); })}>
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
