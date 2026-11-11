import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppProfile } from "./access";
export { homeFor, canAccess, type AppProfile } from "./access";

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  profile: AppProfile;
  active: boolean;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return null;
  const [profile, role] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id).single(),
  ]);
  if (profile.error || role.error || !profile.data.active) return null;
  return { ...profile.data, profile: role.data.role };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message);
  const user = await getCurrentUser();
  if (!user) {
    await supabase.auth.signOut();
    throw new Error("Conta sem acesso ou desativada. Consulte o administrador.");
  }
  return user;
}

export const usersQuery = queryOptions({
  queryKey: ["accounts"],
  queryFn: async () => {
    const [profiles, roles] = await Promise.all([supabase.from("profiles").select("*").order("display_name"), supabase.from("user_roles").select("user_id,role")]);
    if (profiles.error) throw profiles.error;
    if (roles.error) throw roles.error;
    return profiles.data.map((p) => ({ ...p, profile: roles.data.find((r) => r.user_id === p.id)?.role ?? "remessa" }));
  },
});
