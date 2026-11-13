CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  boxes_per_pallet numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_cat_read ON public.products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faturamento') OR public.has_role(auth.uid(),'remessa'));
CREATE POLICY products_cat_write ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faturamento'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faturamento'));
INSERT INTO public.products(code,description,boxes_per_pallet) VALUES
 ('CRY500','Crystal 500ml',98),('CRY1500','Crystal 1,5L',72),('CRYCOPO','Crystal Copo',120),('CRY5L','Crystal 5L',60)
ON CONFLICT DO NOTHING;

ALTER TABLE public.cte_contacts ADD COLUMN IF NOT EXISTS always_cc boolean NOT NULL DEFAULT false;
GRANT UPDATE, DELETE ON public.cte_contacts TO authenticated;
CREATE POLICY contacts_update ON public.cte_contacts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faturamento'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faturamento'));
CREATE POLICY contacts_delete ON public.cte_contacts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faturamento'));