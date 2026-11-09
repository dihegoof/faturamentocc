import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppProfile = "admin" | "faturamento" | "remessa";

export interface AppUser {
  id: string;
  username: string;
  display_name: string;
  profile: AppProfile;
  active: boolean;
}

const STORAGE_KEY = "cc_user";

export function getStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

export function storeUser(u: AppUser | null) {
  if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  else localStorage.removeItem(STORAGE_KEY);
}

/** Login simples: confere usuário+senha na tabela app_users. */
export async function signIn(username: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, username, password, display_name, profile, active")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data || data.password !== password) throw new Error("Usuário ou senha inválidos.");
  if (!data.active) throw new Error("Usuário desativado. Peça ao administrador.");

  const user: AppUser = {
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    profile: data.profile as AppProfile,
    active: data.active,
  };
  storeUser(user);
  return user;
}

export function signOut() {
  storeUser(null);
}

export const usersQuery = queryOptions({
  queryKey: ["app_users"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, username, display_name, profile, active")
      .order("username");
    if (error) throw error;
    return data as AppUser[];
  },
});

export function homeFor(profile: AppProfile): string {
  if (profile === "faturamento") return "/app/faturamento";
  if (profile === "remessa") return "/app/remessa";
  return "/app/usuarios";
}

const ACCESS: Record<string, AppProfile[]> = {
  "/app/faturamento": ["faturamento", "admin"],
  "/app/remessa": ["remessa", "admin"],
  "/app/usuarios": ["admin"],
};

export function canAccess(profile: AppProfile, path: string) {
  const allowed = ACCESS[path];
  return !allowed || allowed.includes(profile);
}
