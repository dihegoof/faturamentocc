ALTER TABLE public.cte_contacts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'carrier';
ALTER TABLE public.cte_contacts ADD CONSTRAINT cte_contacts_kind_chk CHECK (kind IN ('to_fixed','cc_fixed','carrier'));
COMMENT ON COLUMN public.cte_contacts.always_cc IS 'DEPRECATED: replaced by kind';