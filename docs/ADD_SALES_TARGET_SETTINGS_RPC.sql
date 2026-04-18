-- Expose sales target settings via SECURITY DEFINER RPC so sales users can read
-- target values without direct SELECT access on settings table.

-- Ensure keys exist with safe defaults.
INSERT INTO public.settings (key, value)
VALUES
  ('default_sales_monthly_target', to_jsonb(500000)),
  ('sales_monthly_targets_by_user', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_sales_target_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_default_target jsonb;
  v_target_map jsonb;
BEGIN
  IF auth.uid() IS NULL OR current_user_role() IS NULL THEN
    RAISE EXCEPTION 'active authenticated user required';
  END IF;

  SELECT value INTO v_default_target
  FROM public.settings
  WHERE key = 'default_sales_monthly_target'
  LIMIT 1;

  SELECT value INTO v_target_map
  FROM public.settings
  WHERE key = 'sales_monthly_targets_by_user'
  LIMIT 1;

  RETURN jsonb_build_object(
    'default_sales_monthly_target',
      CASE
        WHEN jsonb_typeof(v_default_target) = 'number' THEN v_default_target
        ELSE to_jsonb(500000)
      END,
    'sales_monthly_targets_by_user',
      CASE
        WHEN jsonb_typeof(v_target_map) = 'object' THEN v_target_map
        ELSE '{}'::jsonb
      END
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sales_target_settings() TO authenticated;
