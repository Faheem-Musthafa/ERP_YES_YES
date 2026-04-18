-- Fix: Unsupported master setting key: Godowns
-- This makes master-setting key validation backward compatible.
-- It accepts both Godowns/godowns (and case variants) and maps to the
-- canonical key present in settings.

CREATE OR REPLACE FUNCTION public.assert_master_setting_key(p_key text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_input text := lower(coalesce(btrim(p_key), ''));
  v_has_pascal boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.settings WHERE key = 'Godowns') INTO v_has_pascal;

  IF v_input = 'godowns' THEN
    IF v_has_pascal THEN
      RETURN 'Godowns';
    END IF;
    RETURN 'godowns';
  ELSIF v_input = 'districts' THEN
    RETURN 'districts';
  ELSIF v_input = 'vehicle_types' THEN
    RETURN 'vehicle_types';
  END IF;

  RAISE EXCEPTION 'Unsupported master setting key: %', p_key;
END;
$function$;
