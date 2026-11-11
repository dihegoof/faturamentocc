import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const inviteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email().transform((s) => s.toLowerCase()), display_name: z.string().trim().min(1).max(100), role: z.enum(["admin", "faturamento", "remessa"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !allowed) throw new Error("Somente o administrador pode criar usuários.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", data.email).maybeSingle();
    if (existing) throw new Error("Este e-mail já possui uma conta.");
    const { error: pendingError } = await supabaseAdmin.from("account_invitations").upsert({ email: data.email, display_name: data.display_name, role: data.role });
    if (pendingError) throw pendingError;
    const { getRequest } = await import("@tanstack/react-start/server");
    const origin = new URL(getRequest().url).origin;
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${origin}/reset-password` });
    if (inviteError) {
      await supabaseAdmin.from("account_invitations").delete().eq("email", data.email);
      throw new Error(inviteError.message);
    }
    return { success: true };
  });