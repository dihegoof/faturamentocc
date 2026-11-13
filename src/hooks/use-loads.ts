import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchLoadsSince } from "@/lib/cargo-api";
import { todayISO } from "@/lib/cargo";

function useCargoRealtime() {
  const qc = useQueryClient();
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
}

export function last30(): string[] {
  const out: string[] = [];
  const base = new Date(todayISO() + "T12:00");
  for (let i = 0; i < 30; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Loads predicted in the last 30 days (or later) plus everything imported today, kept live. */
export function useLoadsRange() {
  useCargoRealtime();
  const days = useMemo(last30, []);
  const start = days[29] ?? todayISO();
  const query = useQuery({
    queryKey: ["loads", "range", start],
    queryFn: () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      return fetchLoadsSince(start, midnight.toISOString());
    },
  });
  return { ...query, days };
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

/**
 * Shared presence room: each open modal announces its load so other Faturamento
 * screens show it locked until it is closed. Returns loadId -> user name (others only).
 */
export function useLoadLocks(openId: string | null, myName: string) {
  const [locks, setLocks] = useState<Record<string, string>>({});
  const key = useMemo(() => Math.random().toString(36).slice(2), []);
  const ch = useRef<RealtimeChannel | null>(null);
  const state = useRef({ load_id: openId, name: myName });
  state.current = { load_id: openId, name: myName };

  useEffect(() => {
    const channel = supabase.channel("cargo-locks", { config: { presence: { key } } });
    channel.on("presence", { event: "sync" }, () => {
      const st = channel.presenceState<{ load_id: string | null; name: string }>();
      const m: Record<string, string> = {};
      for (const [k, arr] of Object.entries(st)) {
        if (k === key) continue;
        for (const p of arr) if (p.load_id) m[p.load_id] = p.name;
      }
      setLocks(m);
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void channel.track(state.current);
    });
    ch.current = channel;
    return () => {
      ch.current = null;
      supabase.removeChannel(channel);
    };
  }, [key]);

  useEffect(() => {
    void ch.current?.track({ load_id: openId, name: myName });
  }, [openId, myName]);

  return locks;
}
