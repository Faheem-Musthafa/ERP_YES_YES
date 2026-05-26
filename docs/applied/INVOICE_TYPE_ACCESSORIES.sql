-- Add 'Accessories' invoice type
-- Date: 2026-05-26
-- Adds 'Accessories' to invoice_type_enum and extends generate_invoice_number
-- to emit the company/godown-specific prefixes:
--   LLP + Calicut  -> CA
--   LLP + Chenakkal -> KA
--   YES YES         -> AY
--   Zekon           -> AZ

ALTER TYPE public.invoice_type_enum ADD VALUE IF NOT EXISTS 'Accessories';

CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_company company_enum,
  p_invoice_type invoice_type_enum,
  p_godown text DEFAULT NULL,
  p_remarks text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_serial text;
  v_fy text;
  v_location text := lower(coalesce(p_godown, ''));
  v_prefix text;
  v_credit_nature text := 'GST';
  v_base text;
  v_next_seq integer;
  v_now date := current_date;
BEGIN
  IF EXTRACT(MONTH FROM v_now) >= 4 THEN
    v_fy := to_char(v_now, 'YY') || to_char((v_now + interval '1 year')::date, 'YY');
  ELSE
    v_fy := to_char((v_now - interval '1 year')::date, 'YY') || to_char(v_now, 'YY');
  END IF;

  v_company_serial := CASE p_company
    WHEN 'LLP' THEN '18'
    WHEN 'YES YES' THEN '96'
    WHEN 'Zekon' THEN '19'
    ELSE '00'
  END;

  IF p_invoice_type = 'Credit Note' THEN
    IF lower(coalesce(p_remarks, '')) LIKE '%not-gst%'
      OR lower(coalesce(p_remarks, '')) LIKE '%type: ngst%'
      OR lower(coalesce(p_remarks, '')) LIKE '%type:ngst%'
    THEN
      v_credit_nature := 'NGST';
    ELSE
      v_credit_nature := 'GST';
    END IF;
  END IF;

  IF p_company = 'LLP' THEN
    v_prefix := CASE p_invoice_type
      WHEN 'GST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KG' ELSE 'CG' END
      WHEN 'NGST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KN' ELSE 'CN' END
      WHEN 'IGST' THEN 'IG'
      WHEN 'Delivery Challan Out' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDO' ELSE 'CDO' END
      WHEN 'Delivery Challan In' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDI' ELSE 'CDI' END
      WHEN 'Stock Transfer' THEN CASE
        WHEN v_location LIKE '%chen-cali%'
          OR v_location LIKE '%chen to cali%'
          OR v_location LIKE '%chenakkal%calicut%'
        THEN 'KM'
        ELSE 'CM'
      END
      WHEN 'Credit Note' THEN CASE
        WHEN v_credit_nature = 'GST' AND v_location LIKE '%chenakkal%' THEN 'KGC'
        WHEN v_credit_nature = 'GST' THEN 'CGC'
        WHEN v_location LIKE '%chenakkal%' THEN 'KNC'
        ELSE 'CNC'
      END
      WHEN 'Accessories' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KA' ELSE 'CA' END
      ELSE 'LLP'
    END;
  ELSIF p_company = 'YES YES' THEN
    v_prefix := CASE p_invoice_type
      WHEN 'GST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KGY' ELSE 'CGY' END
      WHEN 'NGST' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KNY' ELSE 'CNY' END
      WHEN 'IGST' THEN 'IGY'
      WHEN 'Delivery Challan Out' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDO' ELSE 'CDO' END
      WHEN 'Delivery Challan In' THEN CASE WHEN v_location LIKE '%chenakkal%' THEN 'KDI' ELSE 'CDI' END
      WHEN 'Credit Note' THEN CASE WHEN v_credit_nature = 'GST' THEN 'GYC' ELSE 'YNC' END
      WHEN 'Accessories' THEN 'AY'
      ELSE 'YESYES'
    END;
  ELSIF p_company = 'Zekon' THEN
    v_prefix := CASE p_invoice_type
      WHEN 'GST' THEN 'GZ'
      WHEN 'NGST' THEN 'NZ'
      WHEN 'IGST' THEN 'IZ'
      WHEN 'Delivery Challan Out' THEN 'ZDO'
      WHEN 'Delivery Challan In' THEN 'ZDI'
      WHEN 'Credit Note' THEN CASE WHEN v_credit_nature = 'GST' THEN 'GZC' ELSE 'NZC' END
      WHEN 'Accessories' THEN 'AZ'
      ELSE 'ZK'
    END;
  ELSE
    v_prefix := 'INV';
  END IF;

  v_base := v_prefix || v_company_serial || v_fy;

  v_next_seq := public.allocate_invoice_sequence(v_base);

  RETURN v_base || lpad(v_next_seq::text, 4, '0');
END;
$function$;
