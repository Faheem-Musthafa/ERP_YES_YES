-- Admin-only read RPC for invoice_sequences
-- Date: 2026-05-26
-- invoice_sequences has RLS policy `false` for all anon/auth roles, so direct
-- PostgREST SELECT returns nothing. This SECURITY DEFINER RPC exposes the
-- current-FY rows to admin users for the Settings UI.

CREATE OR REPLACE FUNCTION public.get_invoice_sequences_for_fy(p_fy text DEFAULT NULL)
RETURNS TABLE(series_key text, last_seq integer, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fy text := p_fy;
  v_now date := current_date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT has_role(ARRAY['admin']::user_role[]) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  IF v_fy IS NULL THEN
    IF EXTRACT(MONTH FROM v_now) >= 4 THEN
      v_fy := to_char(v_now, 'YY') || to_char((v_now + interval '1 year')::date, 'YY');
    ELSE
      v_fy := to_char((v_now - interval '1 year')::date, 'YY') || to_char(v_now, 'YY');
    END IF;
  END IF;

  RETURN QUERY
  SELECT s.series_key, s.last_seq, s.updated_at
  FROM public.invoice_sequences s
  WHERE right(s.series_key, 4) = v_fy
  ORDER BY s.series_key;
END;
$function$;
