export type AppProfile = "admin" | "faturamento" | "remessa";
export const INITIAL_ADMIN_EMAIL = "admin@admind.com";
export function isInitialAdminEmail(email: string) {
  return email.trim().toLowerCase() === INITIAL_ADMIN_EMAIL;
}
export function homeFor(profile: AppProfile): "/usuarios" | "/faturamento" | "/remessa" {
  return profile === "admin"
    ? "/usuarios"
    : profile === "faturamento"
      ? "/faturamento"
      : "/remessa";
}
const EXTRA_PATHS: Record<AppProfile, string[]> = {
  admin: [],
  faturamento: ["/clientes"],
  remessa: [],
};

export function canAccess(profile: AppProfile, path: string) {
  if (profile === "admin") return true;
  return path === homeFor(profile) || EXTRA_PATHS[profile].includes(path);
}
