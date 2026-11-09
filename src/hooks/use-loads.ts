import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchLoadsByDate } from "@/lib/cargo-api";

export function useLoads(date: string) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["loads", date], queryFn: () => fetchLoadsByDate(date) });

  useEffect(() => {
    const channel = supabase
      .channel(`loads-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cargo_loads" }, () => {
        qc.invalidateQueries({ queryKey: ["loads"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cargo_history" }, () => {
        qc.invalidateQueries({ queryKey: ["load-detail"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

/** Re-renders every 30s so wait timers stay current. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
