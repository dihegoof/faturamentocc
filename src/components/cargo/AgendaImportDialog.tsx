import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importAgenda } from "@/lib/cargo-api";
import { parseAgenda, type ParsedAgenda } from "@/lib/cargo";
import { readAgendaSheet } from "@/lib/xlsx-read";

/**
 * Importação da Agenda pelo Faturamento.
 * O upload do arquivo gera as cargas com status "Aguardando Remessa":
 * ficam bloqueadas para todos até a Remessa confirmar placa e transportadora.
 */
export function AgendaImportDialog({
  open,
  onOpenChange,
  uploadedBy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  uploadedBy?: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [loads, setLoads] = useState<ParsedAgenda[] | null>(null);
  /** Progresso da importação: {feito, total}. */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const send = useMutation({
    mutationFn: (p: { loads: ParsedAgenda[]; fileName: string }) =>
      importAgenda(p.loads, {
        fileName: p.fileName,
        uploadedBy,
        onProgress: (done, total) => setProgress({ done, total }),
      }),
    onSuccess: (r) => {
      setProgress(null);
      toast.success(`${r.created} carga(s) criada(s) · ${r.matched} já existia(m)`);
      if (r.warnings.length) toast.warning(`${r.warnings.length} aviso(s) na agenda`);
      qc.invalidateQueries({ queryKey: ["loads"] });
      qc.invalidateQueries({ queryKey: ["agenda-imports"] });
      close();
    },
    onError: (e: Error) => {
      setProgress(null);
      toast.error(e.message);
    },
  });

  function close() {
    onOpenChange(false);
    setFileName("");
    setLoads(null);
    setProgress(null);
  }

  async function onFile(f: File) {
    try {
      setFileName(f.name);
      const rows = await readAgendaSheet(await f.arrayBuffer());
      if (!rows.length) {
        toast.error('A aba "Programação" não foi encontrada neste arquivo');
        return;
      }
      const parsed = parseAgenda(rows);
      if (parsed.errors.length) toast.error(parsed.errors[0]!);
      if (!parsed.loads.length) {
        toast.error("Nenhuma carga reconhecida na agenda");
        setLoads([]);
        return;
      }
      setLoads(parsed.loads);
    } catch (e) {
      toast.error(`Falha ao ler o arquivo: ${(e as Error).message}`);
      setLoads(null);
    }
  }

  const comDt = loads?.filter((l) => l.dt) ?? [];
  const semDt = (loads?.length ?? 0) - comDt.length;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Importar agenda</DialogTitle>
        </DialogHeader>

        {progress ? (
          <div className="space-y-3 py-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Importando cargas…</span>
              <span className="text-muted-foreground">
                {progress.done} / {progress.total} ·{" "}
                {Math.round((progress.done / Math.max(1, progress.total)) * 100)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Não feche esta janela — a importação termina sozinha.
            </p>
          </div>
        ) : !loads ? (
          <>
            <p className="text-sm text-muted-foreground">
              Selecione o arquivo da agenda (.xlsx). O app lê a aba <strong>Programação</strong> e
              cria as cargas aguardando a Remessa definir placa e transportadora.
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              <Upload className="h-8 w-8" />
              <span className="font-semibold">Clique para escolher o arquivo</span>
              <span className="text-xs">.xlsx ou .xls — só a aba Programação é lida</span>
            </button>
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
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              <strong>{fileName}</strong>
              <span className="text-muted-foreground">
                · {loads.length} carga(s) · {comDt.length} com DT
                {semDt > 0 && ` · ${semDt} sem DT (não entram)`}
              </span>
            </div>

            {semDt > 0 && (
              <div className="rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>{semDt} carga(s) sem DT</strong> na agenda — elas não podem ser importadas,
                porque o DT é a chave que liga a carga à Remessa.
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Carga</th>
                  <th className="p-2">DT</th>
                  <th className="p-2">Destino</th>
                  <th className="p-2">Pallets</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((l) => (
                  <tr key={l.load_number} className="border-t">
                    <td className="p-2">{l.load_date.split("-").reverse().join("/")}</td>
                    <td className="p-2">{l.load_number}</td>
                    <td className="p-2 font-mono">
                      {l.dt || <span className="text-destructive">faltando</span>}
                    </td>
                    <td className="p-2">{l.destination || "—"}</td>
                    <td className="p-2">{l.pallets}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button
                disabled={send.isPending || !comDt.length}
                onClick={() => send.mutate({ loads: comDt, fileName })}
              >
                Importar {comDt.length} carga(s)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
