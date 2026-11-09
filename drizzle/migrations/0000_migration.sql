CREATE TABLE public.cargo_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_date date NOT NULL DEFAULT current_date,
  load_number text NOT NULL,
  origin text,
  destination text,
  carrier text,
  plate text,
  dt text,
  pallets numeric DEFAULT 0,
  invoice_numbers text,
  status text NOT NULL DEFAULT 'pendente',
  corte_reason text,
  cte_requested_at timestamptz,
  cte_received_at timestamptz,
  wait_started_at timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  source text DEFAULT 'texto',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (load_date, load_number)
);
CREATE TABLE public.cargo_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES public.cargo_loads(id) ON DELETE CASCADE,
  code text,
  description text,
  boxes numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cargo_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES public.cargo_loads(id) ON DELETE CASCADE,
  event text NOT NULL,
  details text,
  profile text,
  from_status text,
  to_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cte_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  carrier text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.cargo_products(load_id);
CREATE INDEX ON public.cargo_history(load_id);
CREATE INDEX ON public.cargo_loads(load_date);
CREATE INDEX ON public.cargo_loads(plate);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargo_loads, public.cargo_products, public.cargo_history, public.cte_contacts TO anon, authenticated;
GRANT ALL ON public.cargo_loads, public.cargo_products, public.cargo_history, public.cte_contacts TO service_role;

ALTER TABLE public.cargo_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cte_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops all loads" ON public.cargo_loads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ops all products" ON public.cargo_products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ops all history" ON public.cargo_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ops all contacts" ON public.cte_contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.cargo_loads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cargo_history;

INSERT INTO public.cte_contacts (name, email, carrier, phone) VALUES
('Central CT-e Triangulus', 'cte@triangulus.com.br', 'Triangulus', '(11) 4000-0000'),
('Faturamento Transportes', 'faturamento@transportadora.com.br', 'Geral', NULL);