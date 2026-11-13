import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AuthedContext = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: AuthedContext) {
  const { data: allowed, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !allowed) throw new Error("Somente o administrador pode gerenciar usuários.");
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z
          .string()
          .email()
          .transform((s) => s.toLowerCase()),
        password: z.string().min(1).max(72),
        display_name: z.string().trim().min(1).max(100),
        role: z.enum(["admin", "faturamento", "remessa"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (existing) throw new Error("Este e-mail já possui uma conta.");
    // The signup trigger consumes this row to assign name and role.
    const { error: pendingError } = await supabaseAdmin
      .from("account_invitations")
      .upsert({ email: data.email, display_name: data.display_name, role: data.role });
    if (pendingError) throw pendingError;
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) {
      await supabaseAdmin.from("account_invitations").delete().eq("email", data.email);
      throw new Error(
        /password/i.test(error.message) ? "Senha muito curta: use pelo menos 6 caracteres." : error.message,
      );
    }
    return { success: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        display_name: z.string().trim().min(1).max(100).optional(),
        role: z.enum(["admin", "faturamento", "remessa"]).optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId)
      throw new Error("Você não pode alterar a sua própria conta por aqui.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profilePatch: { display_name?: string; active?: boolean } = {};
    if (data.display_name !== undefined) profilePatch.display_name = data.display_name;
    if (data.active !== undefined) profilePatch.active = data.active;
    if (Object.keys(profilePatch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(profilePatch).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    if (data.role) {
      const { error: delError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.id)
        .neq("role", data.role);
      if (delError) throw new Error(delError.message);
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    }
    return { success: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("Você não pode remover a sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
