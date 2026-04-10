-- ============================================================================
-- COMPANY PROFILE SETTINGS MIGRATION
-- ============================================================================
-- Purpose:
-- 1) Introduce company-specific profile settings for LLP / YES YES / Zekon
-- 2) Backfill YES YES profile from legacy global company_* keys
-- 3) Expose a safe read RPC for non-admin users (billing, reports)
-- ============================================================================

BEGIN;

WITH legacy AS (
  SELECT
    COALESCE(MAX(CASE WHEN key = 'company_name' AND jsonb_typeof(value) = 'string' THEN value #>> '{}' END), 'YES YES') AS company_name,
    COALESCE(MAX(CASE WHEN key = 'company_gstin' AND jsonb_typeof(value) = 'string' THEN value #>> '{}' END), '') AS company_gstin,
    COALESCE(MAX(CASE WHEN key = 'company_address' AND jsonb_typeof(value) = 'string' THEN value #>> '{}' END), '') AS company_address,
    COALESCE(MAX(CASE WHEN key = 'company_phone' AND jsonb_typeof(value) = 'string' THEN value #>> '{}' END), '') AS company_phone,
    COALESCE(MAX(CASE WHEN key = 'company_email' AND jsonb_typeof(value) = 'string' THEN value #>> '{}' END), '') AS company_email
  FROM public.settings
),
default_profiles AS (
  SELECT jsonb_build_object(
    'LLP', jsonb_build_object(
      'company_name', 'LLP',
      'company_gstin', '',
      'company_address', '',
      'company_phone', '',
      'company_email', ''
    ),
    'YES YES', jsonb_build_object(
      'company_name', legacy.company_name,
      'company_gstin', legacy.company_gstin,
      'company_address', legacy.company_address,
      'company_phone', legacy.company_phone,
      'company_email', legacy.company_email
    ),
    'Zekon', jsonb_build_object(
      'company_name', 'Zekon',
      'company_gstin', '',
      'company_address', '',
      'company_phone', '',
      'company_email', ''
    )
  ) AS profiles
  FROM legacy
)
INSERT INTO public.settings (key, value)
SELECT 'company_profiles', profiles
FROM default_profiles
ON CONFLICT (key) DO UPDATE
SET value = CASE
    WHEN jsonb_typeof(public.settings.value) = 'object' THEN
      jsonb_build_object(
        'LLP', (EXCLUDED.value -> 'LLP') || COALESCE(public.settings.value -> 'LLP', '{}'::jsonb),
        'YES YES', (EXCLUDED.value -> 'YES YES') || COALESCE(public.settings.value -> 'YES YES', '{}'::jsonb),
        'Zekon', (EXCLUDED.value -> 'Zekon') || COALESCE(public.settings.value -> 'Zekon', '{}'::jsonb)
      )
    ELSE EXCLUDED.value
  END,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.get_company_profiles()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profiles jsonb;
BEGIN
  IF auth.uid() IS NULL OR current_user_role() IS NULL THEN
    RAISE EXCEPTION 'active authenticated user required';
  END IF;

  SELECT s.value
  INTO v_profiles
  FROM public.settings s
  WHERE s.key = 'company_profiles'
  LIMIT 1;

  IF v_profiles IS NULL OR jsonb_typeof(v_profiles) <> 'object' THEN
    RETURN jsonb_build_object(
      'LLP', jsonb_build_object(
        'company_name', 'LLP',
        'company_gstin', '',
        'company_address', '',
        'company_phone', '',
        'company_email', ''
      ),
      'YES YES', jsonb_build_object(
        'company_name', 'YES YES',
        'company_gstin', '',
        'company_address', '',
        'company_phone', '',
        'company_email', ''
      ),
      'Zekon', jsonb_build_object(
        'company_name', 'Zekon',
        'company_gstin', '',
        'company_address', '',
        'company_phone', '',
        'company_email', ''
      )
    );
  END IF;

  RETURN v_profiles;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_company_profiles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_company_profiles() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_company_profiles() TO authenticated;

COMMIT;
