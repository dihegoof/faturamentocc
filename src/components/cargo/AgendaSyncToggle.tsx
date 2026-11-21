import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchSettings, setSetting } from "@/lib/cargo-api";

/**
 * Liga/desliga a Sincronização da Agenda.
 * Desligado, o app volta a funcionar como antes desta alteração: a Remessa
 * importa e cria a carga normalmente. Nada é apagado ao desligar.
 */
export function AgendaSyncToggle({ me }: { me?: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data = [] } = useQuery({ queryKey: ["app-settings"], queryFn: fetchSettings });
  const on = data.find((s) => s.key === "agenda_sync")?.value === "on";

  const toggle = useMutation({
    mutationFn: (v: { key: string; value: string }) => setSetting(v.key, v.value, me),
    onSuccess: () => {
      toast.success("Configuração atualizada");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const change = async (key: string, value: string) => {
    setBusy(true);
    try {
      await toggle.mutateAsync({ key, value });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="font-display text-xl font-bold">Configurações do sistema</h2>

      <label className="mt-3 flex items-start gap-2 text-sm">
        <Checkbox
          checked={on}
          disabled={busy}
          onCheckedChange={(v) => void change("agenda_sync", v === true ? "on" : "off")}
        />
        <span>
          <strong>Sincronização da Agenda</strong>
          <span className="block text-muted-foreground">
            Ligada: o Faturamento sobe a agenda e as cargas ficam aguardando a Remessa
            confirmar placa e transportadora. Desligada: o app funciona como antes, com a
            Remessa importando e criando as cargas.
          </span>
        </span>
      </label>
    </section>
  );
}
