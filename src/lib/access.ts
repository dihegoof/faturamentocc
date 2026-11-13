export type AppProfile = "admin" | "faturamento" | "remessa";
export function homeFor(profile: AppProfile): "/painel" | "/faturamento" | "/remessa" {
  return profile === "admin" ? "/faturamento" : profile === "faturamento" ? "/faturamento" : "/remessa";
}
const EXTRA_PATHS: Record<AppProfile, string[]> = {
  admin: [],
  faturamento: ["/painel"],
  remessa: [],
};

/** Admin can open every screen to test the whole flow without switching accounts. */
export function canAccess(profile: AppProfile, path: string) {
  if (profile === "admin") return true;
  return path === homeFor(profile) || EXTRA_PATHS[profile].includes(path);
}
