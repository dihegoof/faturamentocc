import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CargoLoad, CargoStatus, ParsedAgenda, ParsedLoad, Profile } from "./cargo";

export async function fetchLoadsByDate(date: string): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .eq("load_date", date)
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw error;
  return data as CargoLoad[];
}

export async function fetchLoadsRange(from: string, to: string): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .is("deleted_at", null)
    .gte("load_date", from)
    .lte("load_date", to)
    .order("load_date", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data as CargoLoad[];
}

/** Loads predicted from `from` on (future dates included) plus anything imported since `createdSince`. */
export async function fetchLoadsSince(from: string, createdSince: string): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*, cargo_products(code, description, boxes)")
    .is("deleted_at", null)
    .or(`load_date.gte.${from},created_at.gte.${createdSince}`)
    .order("load_date", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data as unknown as CargoLoad[];
}

export async function searchByPlate(plate: string): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .is("deleted_at", null)
    .ilike("plate", `%${plate}%`)
    .order("load_date", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as CargoLoad[];
}

export async function fetchLoadDetail(id: string) {
  const { data: head, error: he } = await supabase
    .from("cargo_loads")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (he) throw he;
  if (!head) throw new Error("Carga excluída ou inexistente.");
  const [products, history] = await Promise.all([
    supabase.from("cargo_products").select("*").eq("load_id", id).order("created_at"),
    supabase.from("cargo_history").select("*").eq("load_id", id).order("created_at"),
  ]);
  if (products.error) throw products.error;
  if (history.error) throw history.error;
  return { products: products.data, history: history.data };
}

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInput = Omit<
  Database["public"]["Tables"]["clients"]["Insert"],
  "id" | "created_at"
>;

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function fetchClientByCenter(centerCode: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("center_code", centerCode.trim().toUpperCase())
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveClient(input: ClientInput, id?: string) {
  const { error } = id
    ? await supabase.from("clients").update(input).eq("id", id)
    : await supabase.from("clients").insert(input);
  if (error) throw error;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchContacts() {
  const { data, error } = await supabase.from("cte_contacts").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function addContact(c: {
  name: string;
  email: string;
  carrier?: string;
  phone?: string;
}) {
  const { error } = await supabase.from("cte_contacts").insert(c);
  if (error) throw error;
}

export async function logEvent(
  load_id: string,
  event: string,
  profile: Profile,
  details?: string,
  from_status?: string,
  to_status?: string,
) {
  await supabase.from("cargo_history").insert({
    load_id,
    event,
    profile,
    details: details ?? null,
    from_status: from_status ?? null,
    to_status: to_status ?? null,
  });
}

export type LoadPatch = Partial<Omit<CargoLoad, "cargo_products">>;

/** Patch actually written: a status change also restarts the timers. */
export function buildLoadPatch(load: CargoLoad, patch: LoadPatch): LoadPatch {
  const full: LoadPatch = { ...patch };
  if (patch.status && patch.status !== load.status) {
    const now = new Date().toISOString();
    full.status_changed_at = now;
    full.wait_started_at = now;
    if (patch.status === "finalizada") full.finalized_at = now;
  }
  return full;
}

export async function updateLoad(
  load: CargoLoad,
  patch: LoadPatch,
  event: string,
  profile: Profile,
  details?: string,
  full: LoadPatch = buildLoadPatch(load, patch),
) {
  const statusChanged = !!patch.status && patch.status !== load.status;
  const { error } = await supabase.from("cargo_loads").update(full).eq("id", load.id);
  if (error) throw error;
  // History is not awaited so the action finishes on the single update round trip.
  void logEvent(
    load.id,
    event,
    profile,
    details,
    statusChanged ? load.status : undefined,
    statusChanged ? (patch.status as CargoStatus) : undefined,
  ).catch(() => undefined);
}

/** Inserts parsed loads, skipping those already present (same date + carga). */
export async function importLoads(loads: ParsedLoad[], source: string, profile: Profile = "remessa") {
  let inserted = 0;
  const skipped: string[] = [];
  for (const l of loads) {
    const { data: existing } = await supabase
      .from("cargo_loads")
      .select("id")
      .eq("load_date", l.load_date)
      .eq("load_number", l.load_number)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) {
      skipped.push(l.load_number);
      continue;
    }
    const { data, error } = await supabase
      .from("cargo_loads")
      .insert({
        load_date: l.load_date,
        load_number: l.load_number,
        origin: l.origin,
        destination: l.destination,
        destination_code: l.destination_code || null,
        carrier: l.carrier,
        plate: l.plate,
        dt: l.dt || null,
        pallets: l.pallets,
        status: "pendente",
        source,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        skipped.push(l.load_number);
        continue;
      }
      throw error;
    }
    if (l.products.length) {
      const { error: pe } = await supabase
        .from("cargo_products")
        .insert(l.products.map((p) => ({ code: p.code, description: p.description, boxes: p.boxes, load_id: data.id })));
      if (pe) throw pe;
    }
    await logEvent(
      data.id,
      "Carga importada",
      profile,
      `Origem: ${source}${l.warnings.length ? ` · Avisos: ${l.warnings.join("; ")}` : ""}`,
      undefined,
      "pendente",
    );
    inserted++;
  }
  return { inserted, skipped };
}

export type CatalogRow = Database["public"]["Tables"]["products"]["Row"];
export async function fetchCatalog(): Promise<CatalogRow[]> {
  const { data, error } = await supabase.from("products").select("*").order("code");
  if (error) throw error;
  return data;
}
export async function saveCatalog(
  p: { code: string; description: string; boxes_per_pallet: number; sap_code?: string | null; short_name?: string | null },
  id?: string,
) {
  const { error } = id
    ? await supabase.from("products").update(p).eq("id", id)
    : await supabase.from("products").insert(p);
  if (error) throw error;
}
export async function deleteCatalog(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export type ContactKind = "to_fixed" | "cc_fixed" | "carrier";
export async function saveContact(c: { kind: ContactKind; email: string; carrier?: string | null }) {
  const name = c.kind === "carrier" ? (c.carrier ?? "").toUpperCase() : c.kind === "to_fixed" ? "Torre" : "Cópia fixa";
  const { error } = await supabase.from("cte_contacts").insert({
    name, kind: c.kind, email: c.email.trim(), carrier: c.kind === "carrier" ? name : null,
  });
  if (error) throw error;
}
export async function deleteContact(id: string) {
  const { error } = await supabase.from("cte_contacts").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Histórico de pallets por placa (últimas N cargas)                   */
/* ------------------------------------------------------------------ */

export async function fetchPlateHistory(plate: string, limit = 5) {
  const { data, error } = await supabase.rpc("plate_pallet_history", {
    p_plate: plate,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as PlatePalletRow[];
}

export type PlatePalletRow = {
  load_date: string;
  load_number: string;
  pallets: number;
  carrier: string | null;
  boxes_total: number;
  products_count: number;
  vehicle_capacity: number;
};

/* ------------------------------------------------------------------ */
/* Exclusão superficial e painel do admin                              */
/* ------------------------------------------------------------------ */

/** Some para a operação; o admin ainda vê em "Cargas excluídas". */
export async function softDeleteLoad(id: string, deletedBy?: string, reason?: string) {
  const { error } = await supabase.rpc("soft_delete_load", {
    p_load_id: id,
    p_deleted_by: deletedBy ?? null,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function restoreLoad(id: string) {
  const { error } = await supabase.rpc("restore_load", { p_load_id: id });
  if (error) throw error;
}

export async function fetchDeletedLoads(): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data as CargoLoad[];
}

/* ------------------------------------------------------------------ */
/* Pendência da virada do dia                                          */
/* ------------------------------------------------------------------ */

/** Cargas que viraram o dia sem finalizar. */
export async function fetchErroVirada(): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .eq("status", "erro_virada")
    .is("deleted_at", null)
    .order("load_date")
    .order("load_number");
  if (error) throw error;
  return data as CargoLoad[];
}

/** Roda a virada manualmente (o job diário faz o mesmo). */
export async function runVirada(date?: string) {
  const { data, error } = await supabase.rpc("virada_do_dia", { p_date: date ?? null });
  if (error) throw error;
  return data as number;
}

/* ------------------------------------------------------------------ */
/* Arquivo morto e retenção de 6 meses                                 */
/* ------------------------------------------------------------------ */

export async function fetchArchiveExports() {
  const { data, error } = await supabase
    .from("archive_exports")
    .select("id, period_start, period_end, loads_count, products_count, history_count, status, exported_at, purge_allowed_at, purged_at")
    .order("period_end", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchPendingArchive() {
  const { data, error } = await supabase
    .from("v_pending_archive")
    .select("*")
    .order("first_date");
  if (error) throw error;
  return data;
}

/** Exporta e compacta um período no arquivo morto virtual. */
export async function archivePeriod(start: string, end: string) {
  const { data, error } = await supabase.rpc("archive_period", { p_start: start, p_end: end });
  if (error) throw error;
  return data as string;
}

/** Só depois de exportado e passada a carência. */
export async function purgeArchived(archiveId: string) {
  const { data, error } = await supabase.rpc("purge_archived", { p_archive_id: archiveId });
  if (error) throw error;
  return data as number;
}

/** O que já pode ser arquivado (mais velho que 6 meses). */
export async function fetchRetentionCutoff(): Promise<string> {
  const { data, error } = await supabase.rpc("retention_cutoff");
  if (error) throw error;
  return data as unknown as string;
}

/* ------------------------------------------------------------------ */
/* Agenda do Faturamento e confirmação da Remessa                      */
/* ------------------------------------------------------------------ */

/** Liga/desliga o fluxo novo. Desligado, o app é o de sempre. */
export async function agendaSyncOn(): Promise<boolean> {
  const { data, error } = await supabase.rpc("agenda_sync_on");
  if (error) throw error;
  return data === true;
}

export async function setSetting(key: string, value: string, by?: string) {
  const { error } = await supabase.rpc("set_setting", {
    p_key: key, p_value: value, p_by: by ?? null,
  });
  if (error) throw error;
}

export async function fetchSettings() {
  const { data, error } = await supabase.from("app_settings").select("*").order("key");
  if (error) throw error;
  return data;
}

/** Log de quem subiu a agenda, quando, e quantas cargas entraram. */
export async function fetchAgendaImports(limit = 30) {
  const { data, error } = await supabase
    .from("agenda_imports")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/**
 * Sobe a agenda do Faturamento. Cria as cargas que ainda não existem, com
 * status 'pendente_remessa' (bloqueadas até a Remessa confirmar).
 * Nada é sobrescrito: carga que já existe é apenas contada.
 */
export async function importAgenda(
  loads: ParsedAgenda[],
  opts: { fileName?: string; uploadedBy?: string; loadDate?: string } = {},
) {
  const productsTotal = loads.reduce((n, l) => n + l.products.length, 0);
  let created = 0;
  let matched = 0;
  const warnings: string[] = [];

  const { data: imp, error: ie } = await supabase
    .from("agenda_imports")
    .insert({
      file_name: opts.fileName ?? null,
      load_date: opts.loadDate ?? null,
      uploaded_by: opts.uploadedBy ?? null,
      loads_total: loads.length,
      products_total: productsTotal,
    })
    .select("id")
    .single();
  if (ie) throw ie;

  for (const l of loads) {
    if (!l.dt) {
      warnings.push(`Carga ${l.load_number}: sem DT, não importada`);
      continue;
    }
    const { data: existing } = await supabase
      .from("cargo_loads")
      .select("id")
      .eq("dt", l.dt)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) {
      matched++;
      continue;
    }

    const { data, error } = await supabase
      .from("cargo_loads")
      .insert({
        load_date: l.load_date,
        load_number: l.load_number,
        origin: l.origin,
        destination: l.destination,
        destination_code: l.destination_code || null,
        dt: l.dt,
        pallets: l.pallets,
        status: "pendente_remessa",
        source: "agenda",
        agenda_import_id: imp.id,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") { matched++; continue; }
      throw error;
    }
    if (l.products.length) {
      const { error: pe } = await supabase.from("cargo_products").insert(
        l.products.map((p) => ({ code: p.code, description: p.description, boxes: p.boxes, load_id: data.id })),
      );
      if (pe) throw pe;
    }
    warnings.push(...l.warnings.map((w) => `Carga ${l.load_number}: ${w}`));
    created++;
  }

  await supabase.from("agenda_imports").update({
    created_count: created, matched_count: matched, warnings,
  }).eq("id", imp.id);

  return { importId: imp.id as string, created, matched, warnings };
}

/** A Remessa confirma: completa placa e transportadora, sem sobrescrever produtos. */
export async function confirmFromRemessa(
  dt: string, plate: string, carrier: string, profile: Profile = "remessa", details?: string,
) {
  const { data, error } = await supabase.rpc("confirm_load_from_remessa", {
    p_dt: dt, p_plate: plate, p_carrier: carrier, p_profile: profile, p_details: details ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchAguardandoRemessa() {
  const { data, error } = await supabase.from("v_aguardando_remessa").select("*").order("load_date");
  if (error) throw error;
  return data;
}

export async function fetchForaDaAgenda() {
  const { data, error } = await supabase.from("v_fora_da_agenda").select("*").order("load_date", { ascending: false });
  if (error) throw error;
  return data as unknown as CargoLoad[];
}

export async function fetchCargasAlerta() {
  const { data, error } = await supabase.from("v_cargas_alerta").select("*").order("load_date", { ascending: false });
  if (error) throw error;
  return data;
}

/** Quais DTs da Remessa já existem no app (casamento por DT). */
export async function matchAgendaByDt(dts: string[]) {
  if (!dts.length) return [];
  const { data, error } = await supabase.rpc("match_agenda_by_dt", { p_dts: dts });
  if (error) throw error;
  return data as { dt: string; load_id: string; confirmed: boolean }[];
}
