import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchAgendaImports, importAgenda } from "@/lib/cargo-api";
import { parseAgenda, type ParsedAgenda } from "@/lib/cargo";

/**
 * Upload da agenda do Faturamento. A carga entra como "Aguardando Remessa":
 * fica bloqueada para todos até a Remessa confirmar placa e transportadora.
 */
export function AgendaSection({ uploadedBy }: { uploadedBy?: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ loads: ParsedAgenda[]; fileName: string } | null>(null);

  const { data: imports = [] } = useQuery({
    queryKey: ["agenda-imports"],
    queryFn: () => fetchAgendaImports(20),
    enabled: open,
  });

  const send = useMutation({
    mutationFn: (p: { loads: ParsedAgenda[]; fileName: string }) =>
      importAgenda(p.loads, { fileName: p.fileName, uploadedBy }),
    onSuccess: (r) => {
      toast.success(`${r.created} carga(s) criada(s), ${r.matched} já existia(m)`);
      if (r.warnings.length) toast.warning(`${r.warnings.length} aviso(s) na agenda`);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["agenda-imports"] });
      qc.invalidateQueries({ queryKey: ["loads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(f: File) {
    try {
      const xlsx = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = xlsx.read(buf, { type: "array" });
      const ws = wb.Sheets["Programação"];
      if (!ws) {
        toast.error('A aba "Programação" não existe neste arquivo');
        return;
      }
      const rows = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
      const { loads, errors } = parseAgenda(rows as unknown[][]);
      if (errors.length) toast.error(errors[0]!);
      if (!loads.length) {
        toast.error("Nenhuma carga reconhecida na agenda");
        return;
      }
      setPreview({ loads, fileName: f.name });
    } catch (e) {
      toast.error(`Falha ao ler o arquivo: ${(e as Error).message}`);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Agenda do dia seguinte</h2>
          <p className="text-sm text-muted-foreground">
            Suba a agenda com os DTs. As cargas ficam aguardando a Remessa definir placa e transportadora.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Histórico de envios</Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 size-4" /> Subir agenda
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Revisão antes de gravar */}
      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Revisar agenda</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              <p className="text-sm text-muted-foreground">
                {preview.fileName} · {preview.loads.length} carga(s) ·{" "}
                {preview.loads.reduce((n, l) => n + l.products.length, 0)} linha(s) de produto
              </p>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Carga</th>
                    <th className="p-2">DT</th>
                    <th className="p-2">Destino</th>
                    <th className="p-2">Pallets</th>
                    <th className="p-2">Produtos</th>
                    <th className="p-2">Avisos</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.loads.map((l) => (
                    <tr key={l.load_number} className="border-t">
                      <td className="p-2">{l.load_date}</td>
                      <td className="p-2">{l.load_number}</td>
                      <td className="p-2 font-mono">
                        {l.dt || <span className="text-destructive">faltando</span>}
                      </td>
                      <td className="p-2">{l.destination || "—"}</td>
                      <td className="p-2">{l.pallets}</td>
                      <td className="p-2">{l.products.length}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {l.warnings.join("; ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button>
                <Button
                  disabled={send.isPending}
                  onClick={() => send.mutate({ loads: preview.loads, fileName: preview.fileName })}
                >
                  {send.isPending ? "Subindo…" : `Importar ${preview.loads.length} carga(s)`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Log de envios */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Envios da agenda</DialogTitle>
          </DialogHeader>
          {imports.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum envio registrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Quando</th>
                  <th className="p-2">Quem</th>
                  <th className="p-2">Arquivo</th>
                  <th className="p-2">Cargas</th>
                  <th className="p-2">Novas</th>
                  <th className="p-2">Já existiam</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-2">{new Date(a.uploaded_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2">{a.uploaded_by ?? "—"}</td>
                    <td className="p-2">{a.file_name ?? "—"}</td>
                    <td className="p-2">{a.loads_total}</td>
                    <td className="p-2">{a.created_count}</td>
                    <td className="p-2">{a.matched_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
