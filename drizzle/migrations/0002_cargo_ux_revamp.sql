ALTER TABLE public.cargo_loads ADD COLUMN IF NOT EXISTS has_exit boolean, ADD COLUMN IF NOT EXISTS plate_original text, ADD COLUMN IF NOT EXISTS dt_original text;

DROP POLICY IF EXISTS loads_import ON public.cargo_loads;
CREATE POLICY loads_import ON public.cargo_loads FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'remessa') OR has_role(auth.uid(),'faturamento'));
DROP POLICY IF EXISTS products_import ON public.cargo_products;
CREATE POLICY products_import ON public.cargo_products FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'remessa') OR has_role(auth.uid(),'faturamento'));

CREATE OR REPLACE FUNCTION public.platform_has_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') $$;
GRANT EXECUTE ON FUNCTION public.platform_has_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_platform_account()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE invitation public.account_invitations; assigned_role public.app_role; assigned_name text; BEGIN
SELECT * INTO invitation FROM public.account_invitations WHERE email=lower(NEW.email) FOR UPDATE;
IF invitation.email IS NOT NULL THEN assigned_role:=invitation.role; assigned_name:=invitation.display_name;
ELSIF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') THEN assigned_role:='admin'; assigned_name:='Administrador';
ELSE RAISE EXCEPTION 'Cadastro disponível somente pelo administrador'; END IF;
INSERT INTO public.profiles(id,email,display_name) VALUES(NEW.id,lower(NEW.email),assigned_name);
INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,assigned_role);
DELETE FROM public.account_invitations WHERE email=lower(NEW.email);
RETURN NEW; END $function$;