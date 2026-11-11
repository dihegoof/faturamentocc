import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { CargoLoad, CargoStatus, ParsedLoad, Profile } from "./cargo";

export async function fetchLoadsByDate(date: string): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .eq("load_date", date)
    .order("created_at");
  if (error) throw error;
  return data as CargoLoad[];
}

export async function fetchLoadsRange(from: string, to: string): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .gte("load_date", from)
    .lte("load_date", to)
    .order("load_date", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data as CargoLoad[];
}

export async function searchByPlate(plate: string): Promise<CargoLoad[]> {
  const { data, error } = await supabase
    .from("cargo_loads")
    .select("*")
    .ilike("plate", `%${plate}%`)
    .order("load_date", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as CargoLoad[];
}

export async function fetchLoadDetail(id: string) {
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

export async function updateLoad(
  load: CargoLoad,
  patch: Partial<CargoLoad>,
  event: string,
  profile: Profile,
  details?: string,
) {
  const statusChanged = patch.status && patch.status !== load.status;
  const now = new Date().toISOString();
  const full: Partial<CargoLoad> = { ...patch };
  if (statusChanged) {
    full.status_changed_at = now;
    full.wait_started_at = now;
    if (patch.status === "finalizada") full.finalized_at = now;
  }
  const { error } = await supabase.from("cargo_loads").update(full).eq("id", load.id);
  if (error) throw error;
  await logEvent(
    load.id,
    event,
    profile,
    details,
    statusChanged ? load.status : undefined,
    statusChanged ? (patch.status as CargoStatus) : undefined,
  );
}

/** Inserts parsed loads, skipping those already present (same date + carga). */
export async function importLoads(loads: ParsedLoad[], source: string) {
  let inserted = 0;
  const skipped: string[] = [];
  for (const l of loads) {
    const { data: existing } = await supabase
      .from("cargo_loads")
      .select("id")
      .eq("load_date", l.load_date)
      .eq("load_number", l.load_number)
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
        dt: l.dt,
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
        .insert(l.products.map((p) => ({ ...p, load_id: data.id })));
      if (pe) throw pe;
    }
    await logEvent(
      data.id,
      "Carga importada",
      "remessa",
      `Origem: ${source}${l.warnings.length ? ` · Avisos: ${l.warnings.join("; ")}` : ""}`,
      undefined,
      "pendente",
    );
    inserted++;
  }
  return { inserted, skipped };
}
