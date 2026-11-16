import { useQuery } from "@tanstack/react-query";
import { fetchPlateHistory } from "@/lib/cargo-api";
import { formatPlateLine, summarizePallets } from "@/lib/cargo";

/**
 * Histórico de pallets da placa: as últimas N cargas e a maior quantidade
 * já levada — serve para saber quanto cada veículo comporta (26, 28, 40…).
 */
export function PlateHistory({ plate, limit = 5 }: { plate: string; limit?: number }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["plate-history", plate, limit],
    queryFn: () => fetchPlateHistory(plate, limit),
    enabled: !!plate,
  });

  if (!plate) return null;
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem cargas anteriores para esta placa.</p>;

  const { max } = summarizePallets(rows);

  return (
    <div className="space-y-2">
      <p className="text-sm">
        <strong>{rows.length}</strong> últimas cargas · capacidade até <strong>{max} plt</strong>
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="p-2">Data</th>
            <th className="p-2">Carga</th>
            <th className="p-2">Pallets</th>
            <th className="p-2">Caixas</th>
            <th className="p-2">Transportadora</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.load_date}-${r.load_number}`} className="border-t">
              <td className="p-2">{r.load_date}</td>
              <td className="p-2">{r.load_number}</td>
              <td className="p-2 font-semibold">{r.pallets}</td>
              <td className="p-2">{r.boxes_total}</td>
              <td className="p-2">{formatPlateLine({ plate, dt: null, carrier: r.carrier })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
