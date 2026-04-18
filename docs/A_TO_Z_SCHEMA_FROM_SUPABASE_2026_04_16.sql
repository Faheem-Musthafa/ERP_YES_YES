-- ============================================================================
-- LIVE SUPABASE SCHEMA EXPORT (A-Z) 
-- ============================================================================
-- Source project: ruwkgubpowdshpucmqxc (ERP)
-- Generated on: 2026-04-16
-- Generated via MCP schema introspection (tables, constraints, indexes,
-- functions, triggers, RLS policies, grants, enums, sequences)
-- ============================================================================

BEGIN;

-- Schemas and extensions
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS graphql;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

SET search_path TO public;

-- Enums
DO $$ BEGIN CREATE TYPE public.collection_status_enum AS ENUM ('Pending', 'Collected', 'Overdue', 'Voided'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.company_enum AS ENUM ('LLP', 'YES YES', 'Zekon'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.delivery_status_enum AS ENUM ('Pending', 'In Transit', 'Delivered', 'Failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.grn_status_enum AS ENUM ('Pending', 'Verified', 'Completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.invoice_type_enum AS ENUM ('GST', 'NGST', 'IGST', 'Delivery Challan Out', 'Delivery Challan In', 'Stock Transfer', 'Credit Note'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.order_status_enum AS ENUM ('Pending', 'Approved', 'Rejected', 'Billed', 'Delivered'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_mode_enum AS ENUM ('Cash', 'Cheque', 'UPI', 'Bank Transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.po_status_enum AS ENUM ('Draft', 'Pending', 'Approved', 'Received', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.stock_adjustment_type_enum AS ENUM ('Addition', 'Subtraction'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.supplier_status_enum AS ENUM ('Active', 'Inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('admin', 'sales', 'accounts', 'inventory', 'procurement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequences
CREATE SEQUENCE IF NOT EXISTS public.delivery_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.grn_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS public.po_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;

-- Tables
CREATE TABLE IF NOT EXISTS public.billing_reversal_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  invoice_number text,
  company company_enum NOT NULL,
  request_reason text NOT NULL,
  admin_review_note text,
  status text DEFAULT 'Pending'::text NOT NULL,
  requested_by uuid NOT NULL,
  approved_by uuid,
  rejected_by uuid,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  restored_at timestamp with time zone,
  restored_by uuid
);
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  order_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  collected_date date,
  status collection_status_enum DEFAULT 'Pending'::collection_status_enum NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  place text,
  location text,
  pincode text,
  gst_pan text,
  opening_balance numeric(12,2) DEFAULT 0 NOT NULL,
  assigned_to uuid,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  restored_at timestamp with time zone,
  restored_by uuid
);
CREATE TABLE IF NOT EXISTS public.data_recovery_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  entity_label text NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  actor_name text,
  reason text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  delivery_number text NOT NULL,
  order_id uuid NOT NULL,
  initiated_by uuid,
  initiated_by_name text,
  delivery_agent_id uuid,
  driver_name text,
  vehicle_number text,
  status delivery_status_enum DEFAULT 'Pending'::delivery_status_enum NOT NULL,
  failure_reason text,
  dispatched_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.delivery_agents (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  vehicle_number text,
  vehicle_type text,
  vehicle_type_other text,
  phone text,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  restored_at timestamp with time zone,
  restored_by uuid
);
CREATE TABLE IF NOT EXISTS public.grn (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  grn_number text NOT NULL,
  po_id uuid,
  supplier_id uuid,
  received_by uuid,
  received_date date DEFAULT CURRENT_DATE NOT NULL,
  remarks text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.grn_items (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  grn_id uuid NOT NULL,
  purchase_order_id uuid,
  product_id uuid NOT NULL,
  expected_qty integer DEFAULT 0 NOT NULL,
  received_qty integer DEFAULT 0 NOT NULL,
  damaged_qty integer DEFAULT 0 NOT NULL,
  location text,
  status grn_status_enum DEFAULT 'Pending'::grn_status_enum NOT NULL,
  received_date date,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  dealer_price numeric(12,2) NOT NULL,
  discount_pct numeric(5,2) DEFAULT 0 NOT NULL,
  amount numeric(12,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  order_number text NOT NULL,
  company company_enum NOT NULL,
  invoice_type invoice_type_enum NOT NULL,
  invoice_number text,
  customer_id uuid,
  Godown text,
  site_address text NOT NULL,
  remarks text,
  delivery_date date,
  subtotal numeric(12,2) DEFAULT 0 NOT NULL,
  total_discount numeric(12,2) DEFAULT 0 NOT NULL,
  grand_total numeric(12,2) DEFAULT 0 NOT NULL,
  status order_status_enum DEFAULT 'Pending'::order_status_enum NOT NULL,
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  billed_by uuid,
  billed_at timestamp with time zone,
  taxable_amount numeric(12,2) DEFAULT 0 NOT NULL,
  cgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
  sgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
  igst_amount numeric(12,2) DEFAULT 0 NOT NULL,
  tax_amount numeric(12,2) DEFAULT 0 NOT NULL,
  invoice_pdf_generated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.po_items (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  po_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  amount numeric(12,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.product_stock_locations (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  product_id uuid NOT NULL,
  location text NOT NULL,
  stock_qty integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  brand_id uuid,
  sub_category_id uuid,
  sku text NOT NULL,
  mrp numeric(12,2) DEFAULT 0 NOT NULL,
  dealer_price numeric(12,2) DEFAULT 0 NOT NULL,
  stock_qty integer DEFAULT 0 NOT NULL,
  location text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  restored_at timestamp with time zone,
  restored_by uuid
);
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  po_number text NOT NULL,
  supplier_id uuid NOT NULL,
  status po_status_enum DEFAULT 'Draft'::po_status_enum NOT NULL,
  total_amount numeric(12,2) DEFAULT 0 NOT NULL,
  created_by uuid,
  expected_delivery_date date,
  delivered_at timestamp with time zone,
  approved_by uuid,
  approved_at timestamp with time zone,
  remarks text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  receipt_number text NOT NULL,
  order_id uuid,
  amount numeric(12,2) NOT NULL,
  payment_mode payment_mode_enum NOT NULL,
  payment_status text DEFAULT 'Completed'::text,
  bounce_reason text,
  recorded_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  customer_id uuid,
  company text,
  brand text,
  received_date date,
  cheque_number text,
  cheque_date date,
  on_account_of text
);
CREATE TABLE IF NOT EXISTS public.rpc_idempotency_keys (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  function_name text NOT NULL,
  idempotency_key text NOT NULL,
  result_text text,
  result_uuid uuid,
  result_bool boolean,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  key text NOT NULL,
  value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  type stock_adjustment_type_enum NOT NULL,
  reason text NOT NULL,
  location text,
  adjusted_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  movement_type text NOT NULL,
  reference_type text,
  reference_id uuid,
  location text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  product_id uuid NOT NULL,
  from_location text NOT NULL,
  to_location text NOT NULL,
  quantity integer NOT NULL,
  reason text,
  transferred_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  status supplier_status_enum DEFAULT 'Active'::supplier_status_enum NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  employee_id text,
  full_name text NOT NULL,
  email text NOT NULL,
  role user_role DEFAULT 'sales'::user_role NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  must_change_password boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  restored_at timestamp with time zone,
  restored_by uuid
);

-- Constraints
ALTER TABLE public.billing_reversal_requests ADD CONSTRAINT billing_reversal_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.billing_reversal_requests ADD CONSTRAINT billing_reversal_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.billing_reversal_requests ADD CONSTRAINT billing_reversal_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id);
ALTER TABLE public.billing_reversal_requests ADD CONSTRAINT billing_reversal_requests_status_check CHECK (status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text]));
ALTER TABLE public.billing_reversal_requests ADD CONSTRAINT billing_reversal_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE public.billing_reversal_requests ADD CONSTRAINT billing_reversal_requests_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES users(id);
ALTER TABLE public.brands ADD CONSTRAINT brands_name_key UNIQUE (name);
ALTER TABLE public.brands ADD CONSTRAINT brands_pkey PRIMARY KEY (id);
ALTER TABLE public.collections ADD CONSTRAINT collections_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.collections ADD CONSTRAINT collections_pkey PRIMARY KEY (id);
ALTER TABLE public.collections ADD CONSTRAINT collections_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.collections ADD CONSTRAINT collections_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE public.customers ADD CONSTRAINT customers_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.data_recovery_events ADD CONSTRAINT data_recovery_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.data_recovery_events ADD CONSTRAINT data_recovery_events_pkey PRIMARY KEY (id);
ALTER TABLE public.data_recovery_events ADD CONSTRAINT data_recovery_events_action_check CHECK (action = ANY (ARRAY['archived'::text, 'restored'::text, 'voided'::text, 'reversed'::text]));
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_delivery_agent_id_fkey FOREIGN KEY (delivery_agent_id) REFERENCES delivery_agents(id) ON DELETE SET NULL;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_delivery_number_key UNIQUE (delivery_number);
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.delivery_agents ADD CONSTRAINT delivery_agents_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.delivery_agents ADD CONSTRAINT delivery_agents_pkey PRIMARY KEY (id);
ALTER TABLE public.grn ADD CONSTRAINT grn_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.grn ADD CONSTRAINT grn_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.grn ADD CONSTRAINT grn_grn_number_key UNIQUE (grn_number);
ALTER TABLE public.grn ADD CONSTRAINT grn_pkey PRIMARY KEY (id);
ALTER TABLE public.grn ADD CONSTRAINT grn_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_pkey PRIMARY KEY (id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_received_qty_check CHECK (received_qty >= 0);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_damaged_qty_check CHECK (damaged_qty >= 0);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES grn(id) ON DELETE CASCADE;
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_discount_pct_check CHECK (discount_pct >= 0::numeric AND discount_pct <= 100::numeric);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);
ALTER TABLE public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE public.orders ADD CONSTRAINT orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_billed_by_fkey FOREIGN KEY (billed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.po_items ADD CONSTRAINT po_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE public.po_items ADD CONSTRAINT po_items_pkey PRIMARY KEY (id);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_quantity_check CHECK (quantity > 0);
ALTER TABLE public.product_stock_locations ADD CONSTRAINT product_stock_locations_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE public.product_stock_locations ADD CONSTRAINT product_stock_locations_pkey PRIMARY KEY (id);
ALTER TABLE public.product_stock_locations ADD CONSTRAINT product_stock_locations_product_id_location_key UNIQUE (product_id, location);
ALTER TABLE public.product_stock_locations ADD CONSTRAINT product_stock_locations_stock_qty_check CHECK (stock_qty >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id);
ALTER TABLE public.products ADD CONSTRAINT products_sku_key UNIQUE (sku);
ALTER TABLE public.products ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT;
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_amount_check CHECK (amount > 0::numeric);
ALTER TABLE public.receipts ADD CONSTRAINT receipts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE public.receipts ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);
ALTER TABLE public.receipts ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);
ALTER TABLE public.receipts ADD CONSTRAINT receipts_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.rpc_idempotency_keys ADD CONSTRAINT rpc_idempotency_keys_function_name_idempotency_key_key UNIQUE (function_name, idempotency_key);
ALTER TABLE public.rpc_idempotency_keys ADD CONSTRAINT rpc_idempotency_keys_pkey PRIMARY KEY (id);
ALTER TABLE public.settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);
ALTER TABLE public.settings ADD CONSTRAINT settings_key_key UNIQUE (key);
ALTER TABLE public.stock_adjustments ADD CONSTRAINT stock_adjustments_quantity_check CHECK (quantity > 0);
ALTER TABLE public.stock_adjustments ADD CONSTRAINT stock_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.stock_adjustments ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);
ALTER TABLE public.stock_adjustments ADD CONSTRAINT stock_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_transferred_by_fkey FOREIGN KEY (transferred_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.stock_transfers ADD CONSTRAINT different_locations CHECK (from_location <> to_location);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;
ALTER TABLE public.stock_transfers ADD CONSTRAINT stock_transfers_quantity_check CHECK (quantity > 0);
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Functions
CREATE OR REPLACE FUNCTION public.approve_billing_reversal(p_request_id uuid, p_admin_user_id uuid, p_admin_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor UUID := COALESCE(p_admin_user_id, auth.uid());
  v_request RECORD;
  v_order RECORD;
  v_item RECORD;
  v_location text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'admin_user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only admin can approve billing reversal';
  END IF;

  SELECT *
  INTO v_request
  FROM public.billing_reversal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reversal request not found';
  END IF;

  IF v_request.status <> 'Pending' THEN
    RETURN FALSE;
  END IF;

  SELECT o.id, o.order_number, o.status, o.Godown, o.billed_by, o.invoice_number
  INTO v_order
  FROM public.orders o
  WHERE o.id = v_request.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found for reversal';
  END IF;
  IF v_order.status <> 'Billed' THEN
    RAISE EXCEPTION 'Order must be in Billed status to reverse';
  END IF;

  v_location := validate_master_setting_option(
    'Godowns',
    COALESCE(NULLIF(BTRIM(v_order.Godown), ''), default_master_setting_option('Godowns')),
    'billing reversal location',
    true
  );

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id
  LOOP
    INSERT INTO public.product_stock_locations (product_id, location, stock_qty)
    VALUES (v_item.product_id, v_location, 0)
    ON CONFLICT (product_id, location) DO NOTHING;

    UPDATE public.product_stock_locations
    SET stock_qty = stock_qty + v_item.quantity,
        updated_at = NOW()
    WHERE product_id = v_item.product_id
      AND location = v_location;

    INSERT INTO public.stock_movements (
      product_id,
      quantity,
      movement_type,
      reference_type,
      reference_id,
      location,
      created_by
    )
    VALUES (
      v_item.product_id,
      v_item.quantity,
      'order_unbilled',
      'billing_reversal',
      p_request_id,
      v_location,
      v_actor
    );
  END LOOP;

  UPDATE public.receipts
  SET payment_status = 'Voided',
      bounce_reason = CASE
        WHEN COALESCE(TRIM(p_admin_note), '') = '' THEN bounce_reason
        ELSE CONCAT('Voided during billing reversal: ', TRIM(p_admin_note))
      END
  WHERE order_id = v_order.id
    AND COALESCE(payment_status, '') <> 'Voided';

  UPDATE public.collections
  SET status = 'Voided',
      updated_at = NOW()
  WHERE order_id = v_order.id
    AND status <> 'Voided';

  INSERT INTO public.data_recovery_events (
    entity_table,
    entity_id,
    entity_label,
    action,
    actor_id,
    reason,
    metadata
  )
  VALUES
    (
      'orders',
      v_order.id,
      v_order.order_number,
      'reversed',
      v_actor,
      NULLIF(TRIM(p_admin_note), ''),
      jsonb_build_object('request_id', p_request_id, 'invoice_number', v_order.invoice_number)
    );

  UPDATE public.orders
  SET status = 'Pending',
      approved_by = NULL,
      approved_at = NULL,
      invoice_number = NULL,
      billed_by = NULL,
      billed_at = NULL,
      invoice_pdf_generated_at = NULL,
      remarks = CASE
        WHEN COALESCE(TRIM(p_admin_note), '') = '' THEN COALESCE(remarks, '')
        ELSE CONCAT(COALESCE(NULLIF(remarks, ''), ''), CASE WHEN COALESCE(NULLIF(remarks, ''), '') = '' THEN '' ELSE ' | ' END, 'Reversal approved: ', TRIM(p_admin_note))
      END,
      updated_at = NOW()
  WHERE id = v_order.id;

  UPDATE public.billing_reversal_requests
  SET status = 'Approved',
      admin_review_note = NULLIF(TRIM(p_admin_note), ''),
      approved_by = v_actor,
      approved_at = NOW(),
      rejected_by = NULL,
      rejected_at = NULL,
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$function$
CREATE OR REPLACE FUNCTION public.approve_order(p_order_id uuid, p_approved_by uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE orders
    SET status = 'Approved',
        approved_by = p_approved_by,
        approved_at = NOW()
    WHERE id = p_order_id AND status = 'Pending';
    
    RETURN FOUND;
END;
$function$
CREATE OR REPLACE FUNCTION public.approve_order_atomic(p_order_id uuid, p_approved_by uuid, p_items jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total_discount numeric := 0;
  v_grand_total numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_approved_by <> auth.uid() THEN
    RAISE EXCEPTION 'approved_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to approve order';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Approved items payload is required';
  END IF;

  PERFORM 1
  FROM orders
  WHERE id = p_order_id AND status = 'Pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not Pending';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE order_items
    SET dealer_price = (v_item->>'dealer_price')::numeric,
        discount_pct = (v_item->>'discount_pct')::numeric,
        amount = (v_item->>'amount')::numeric
    WHERE id = (v_item->>'id')::uuid
      AND order_id = p_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid order item in approval payload';
    END IF;
  END LOOP;

  SELECT
    COALESCE(SUM(quantity * dealer_price), 0),
    COALESCE(SUM(quantity * dealer_price * discount_pct / 100), 0),
    COALESCE(SUM(amount), 0)
  INTO v_subtotal, v_total_discount, v_grand_total
  FROM order_items
  WHERE order_id = p_order_id;

  UPDATE orders
  SET status = 'Approved',
      approved_by = p_approved_by,
      approved_at = NOW(),
      subtotal = v_subtotal,
      total_discount = v_total_discount,
      grand_total = v_grand_total,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$function$
CREATE OR REPLACE FUNCTION public.assert_master_setting_key(p_key text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF p_key NOT IN ('Godowns', 'districts', 'vehicle_types') THEN
    RAISE EXCEPTION 'Unsupported master setting key: %', p_key;
  END IF;
  RETURN p_key;
END;
$function$
CREATE OR REPLACE FUNCTION public.bill_order(p_order_id uuid, p_billed_by uuid, p_invoice_number text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'Approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or not in Approved status';
    END IF;
    
    -- Deduct stock for each item
    FOR v_item IN 
        SELECT oi.product_id, oi.quantity 
        FROM order_items oi 
        WHERE oi.order_id = p_order_id
    LOOP
        -- Deduct from order's Godown location
        UPDATE product_stock_locations
        SET stock_qty = GREATEST(0, stock_qty - v_item.quantity), updated_at = NOW()
        WHERE product_id = v_item.product_id AND location = v_order.Godown;
        
        -- Log movement
        INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
        VALUES (v_item.product_id, -v_item.quantity, 'order_billed', 'orders', p_order_id, v_order.Godown, p_billed_by);
    END LOOP;
    
    -- Update order status
    UPDATE orders
    SET status = 'Billed',
        billed_by = p_billed_by,
        billed_at = NOW(),
        invoice_number = COALESCE(p_invoice_number, invoice_number)
    WHERE id = p_order_id;
    
    RETURN TRUE;
END;
$function$
CREATE OR REPLACE FUNCTION public.bill_order_atomic(p_order_id uuid, p_billed_by uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order record;
  v_item record;
  v_invoice_number text;
  v_current_stock integer;
  v_actor uuid := COALESCE(p_billed_by, auth.uid());
  v_location text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'billed_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to bill order';
  END IF;

  SELECT id, order_number, company, Godown, status, invoice_number
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status <> 'Approved' THEN
    IF v_order.status IN ('Billed', 'Delivered') THEN
      RETURN v_order.invoice_number;
    END IF;
    RAISE EXCEPTION 'Order must be Approved to bill. Current status: %', v_order.status;
  END IF;

  v_location := validate_master_setting_option(
    'Godowns',
    COALESCE(NULLIF(BTRIM(v_order.Godown), ''), default_master_setting_option('Godowns')),
    'order Godown',
    true
  );

  v_invoice_number := COALESCE(v_order.invoice_number, generate_invoice_number(v_order.company));

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT stock_qty
    INTO v_current_stock
    FROM product_stock_locations
    WHERE product_id = v_item.product_id
      AND location = v_location
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      INSERT INTO product_stock_locations (product_id, location, stock_qty)
      VALUES (v_item.product_id, v_location, 0)
      ON CONFLICT (product_id, location) DO NOTHING;
      v_current_stock := 0;
    END IF;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % at % (available %, required %)',
        v_item.product_id,
        v_location,
        v_current_stock,
        v_item.quantity;
    END IF;

    UPDATE product_stock_locations
    SET stock_qty = stock_qty - v_item.quantity,
        updated_at = NOW()
    WHERE product_id = v_item.product_id
      AND location = v_location;

    INSERT INTO stock_movements (
      product_id,
      quantity,
      movement_type,
      reference_type,
      reference_id,
      location,
      created_by
    )
    VALUES (
      v_item.product_id,
      -v_item.quantity,
      'order_billed',
      'orders',
      p_order_id,
      v_location,
      v_actor
    );
  END LOOP;

  UPDATE orders
  SET status = 'Billed',
      invoice_number = v_invoice_number,
      billed_by = v_actor,
      billed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_invoice_number;
END;
$function$
CREATE OR REPLACE FUNCTION public.bill_order_idempotent(p_order_id uuid, p_billed_by uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice TEXT;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('bill_order_idempotent:' || p_idempotency_key));

    SELECT result_text INTO v_invoice
    FROM rpc_idempotency_keys
    WHERE function_name = 'bill_order_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_invoice;
    END IF;
  END IF;

  v_invoice := bill_order_atomic(p_order_id, p_billed_by);

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_text)
    VALUES ('bill_order_idempotent', p_idempotency_key, v_invoice)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_invoice;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_customer(p_name text, p_phone text, p_address text, p_place text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_pincode text DEFAULT NULL::text, p_gst_pan text DEFAULT NULL::text, p_opening_balance numeric DEFAULT 0, p_assigned_to uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_location text;
BEGIN
  v_location := validate_master_setting_option('districts', p_location, 'district', false);

  INSERT INTO customers (
    name,
    phone,
    address,
    place,
    location,
    pincode,
    gst_pan,
    opening_balance,
    assigned_to
  )
  VALUES (
    p_name,
    p_phone,
    p_address,
    p_place,
    v_location,
    p_pincode,
    p_gst_pan,
    p_opening_balance,
    p_assigned_to
  )
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_delivery(p_order_id uuid, p_agent_id uuid DEFAULT NULL::uuid, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_delivery_id UUID;
    v_delivery_number TEXT;
    v_agent RECORD;
BEGIN
    -- Generate delivery number
    v_delivery_number := generate_delivery_number();
    
    -- Get agent details if provided
    IF p_agent_id IS NOT NULL THEN
        SELECT name, vehicle_number INTO v_agent
        FROM delivery_agents WHERE id = p_agent_id;
    END IF;
    
    -- Create delivery
    INSERT INTO deliveries (
        delivery_number, order_id, delivery_agent_id,
        driver_name, vehicle_number, status, created_by
    )
    VALUES (
        v_delivery_number, p_order_id, p_agent_id,
        v_agent.name, v_agent.vehicle_number, 'Pending', p_created_by
    )
    RETURNING id INTO v_delivery_id;
    
    RETURN v_delivery_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_delivery(p_order_id uuid, p_agent_id uuid DEFAULT NULL::uuid, p_initiated_by uuid DEFAULT NULL::uuid, p_initiated_by_name text DEFAULT NULL::text, p_driver_name text DEFAULT NULL::text, p_vehicle_number text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery_id uuid;
  v_delivery_number text;
  v_agent record;
  v_actor uuid := COALESCE(p_created_by, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to create delivery';
  END IF;

  v_delivery_number := generate_delivery_number();

  IF p_agent_id IS NOT NULL THEN
    SELECT name, vehicle_number
    INTO v_agent
    FROM delivery_agents
    WHERE id = p_agent_id;
  END IF;

  INSERT INTO deliveries (
    delivery_number,
    order_id,
    initiated_by,
    initiated_by_name,
    delivery_agent_id,
    driver_name,
    vehicle_number,
    status,
    created_by
  )
  VALUES (
    v_delivery_number,
    p_order_id,
    p_initiated_by,
    p_initiated_by_name,
    p_agent_id,
    COALESCE(NULLIF(TRIM(p_driver_name), ''), v_agent.name),
    COALESCE(NULLIF(TRIM(p_vehicle_number), ''), v_agent.vehicle_number),
    'Pending',
    v_actor
  )
  RETURNING id INTO v_delivery_id;

  RETURN v_delivery_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_delivery_idempotent(p_order_id uuid, p_agent_id uuid DEFAULT NULL::uuid, p_initiated_by uuid DEFAULT NULL::uuid, p_initiated_by_name text DEFAULT NULL::text, p_driver_name text DEFAULT NULL::text, p_vehicle_number text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery_id UUID;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('create_delivery_idempotent:' || p_idempotency_key));

    SELECT result_uuid INTO v_delivery_id
    FROM rpc_idempotency_keys
    WHERE function_name = 'create_delivery_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_delivery_id;
    END IF;
  END IF;

  v_delivery_id := create_delivery(
    p_order_id,
    p_agent_id,
    p_initiated_by,
    p_initiated_by_name,
    p_driver_name,
    p_vehicle_number,
    p_created_by
  );

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_uuid)
    VALUES ('create_delivery_idempotent', p_idempotency_key, v_delivery_id)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_delivery_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_grn(p_items jsonb, p_po_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid, p_received_by uuid DEFAULT NULL::uuid, p_remarks text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grn_id uuid;
  v_grn_number text;
  v_item jsonb;
  v_net_qty integer;
  v_actor uuid := COALESCE(p_received_by, auth.uid());
  v_item_location text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'received_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['procurement', 'inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to create GRN';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one GRN item is required';
  END IF;

  v_grn_number := generate_grn_number();

  INSERT INTO grn (grn_number, po_id, supplier_id, received_by, remarks)
  VALUES (v_grn_number, p_po_id, p_supplier_id, v_actor, p_remarks)
  RETURNING id INTO v_grn_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_location := validate_master_setting_option('Godowns', v_item->>'location', 'GRN location', true);
    v_net_qty := (v_item->>'received_qty')::integer - COALESCE((v_item->>'damaged_qty')::integer, 0);

    IF v_net_qty < 0 THEN
      RAISE EXCEPTION 'Net GRN quantity cannot be negative';
    END IF;

    INSERT INTO grn_items (
      grn_id,
      purchase_order_id,
      product_id,
      expected_qty,
      received_qty,
      damaged_qty,
      location,
      status,
      received_date
    )
    VALUES (
      v_grn_id,
      p_po_id,
      (v_item->>'product_id')::uuid,
      COALESCE((v_item->>'expected_qty')::integer, 0),
      (v_item->>'received_qty')::integer,
      COALESCE((v_item->>'damaged_qty')::integer, 0),
      v_item_location,
      'Completed',
      CURRENT_DATE
    );

    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES ((v_item->>'product_id')::uuid, v_item_location, v_net_qty)
    ON CONFLICT (product_id, location)
    DO UPDATE SET stock_qty = product_stock_locations.stock_qty + v_net_qty,
                  updated_at = NOW();

    INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
    VALUES (
      (v_item->>'product_id')::uuid,
      v_net_qty,
      'grn_receipt',
      'grn',
      v_grn_id,
      v_item_location,
      v_actor
    );
  END LOOP;

  IF p_po_id IS NOT NULL THEN
    UPDATE purchase_orders
    SET status = 'Received',
        delivered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_po_id;
  END IF;

  RETURN v_grn_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_grn_idempotent(p_items jsonb, p_po_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid, p_received_by uuid DEFAULT NULL::uuid, p_remarks text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grn_id UUID;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('create_grn_idempotent:' || p_idempotency_key));

    SELECT result_uuid INTO v_grn_id
    FROM rpc_idempotency_keys
    WHERE function_name = 'create_grn_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_grn_id;
    END IF;
  END IF;

  v_grn_id := create_grn(p_items, p_po_id, p_supplier_id, p_received_by, p_remarks);

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_uuid)
    VALUES ('create_grn_idempotent', p_idempotency_key, v_grn_id)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_grn_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_master_setting_option(p_key text, p_value text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_value text := NULLIF(BTRIM(p_value), '');
  v_current text[];
BEGIN
  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Value is required';
  END IF;

  v_current := get_master_setting_options(v_key);

  IF v_value = ANY(v_current) THEN
    RAISE EXCEPTION 'Value "%" already exists in %', v_value, v_key;
  END IF;

  RETURN save_master_setting_options(v_key, v_current || v_value);
END;
$function$
CREATE OR REPLACE FUNCTION public.create_order(p_company company_enum, p_invoice_type invoice_type_enum, p_customer_id uuid, p_Godown text, p_site_address text, p_items jsonb, p_remarks text DEFAULT NULL::text, p_delivery_date date DEFAULT NULL::date, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total_discount numeric := 0;
  v_item_amount numeric;
  v_item_discount numeric;
  v_actor uuid := COALESCE(p_created_by, auth.uid());
  v_Godown text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['sales', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to create order';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  v_Godown := validate_master_setting_option(
    'Godowns',
    COALESCE(NULLIF(BTRIM(p_Godown), ''), default_master_setting_option('Godowns')),
    'Godown',
    true
  );

  v_order_number := generate_order_number();

  INSERT INTO orders (
    order_number, company, invoice_type, customer_id, Godown,
    site_address, remarks, delivery_date, created_by, status
  )
  VALUES (
    v_order_number, p_company, p_invoice_type, p_customer_id, v_Godown,
    p_site_address, p_remarks, p_delivery_date, v_actor, 'Pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE((v_item->>'quantity')::integer, 0) <= 0 THEN
      RAISE EXCEPTION 'Order item quantity must be > 0';
    END IF;
    IF COALESCE((v_item->>'dealer_price')::numeric, -1) < 0 THEN
      RAISE EXCEPTION 'Order item dealer price must be >= 0';
    END IF;

    v_item_amount := (v_item->>'quantity')::integer * (v_item->>'dealer_price')::numeric;
    v_item_discount := v_item_amount * COALESCE((v_item->>'discount_pct')::numeric, 0) / 100;

    INSERT INTO order_items (order_id, product_id, quantity, dealer_price, discount_pct, amount)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'dealer_price')::numeric,
      COALESCE((v_item->>'discount_pct')::numeric, 0),
      v_item_amount - v_item_discount
    );

    v_subtotal := v_subtotal + v_item_amount;
    v_total_discount := v_total_discount + v_item_discount;
  END LOOP;

  UPDATE orders
  SET subtotal = v_subtotal,
      total_discount = v_total_discount,
      grand_total = v_subtotal - v_total_discount,
      updated_at = NOW()
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_product(p_name text, p_sku text, p_mrp numeric, p_dealer_price numeric, p_brand_id uuid DEFAULT NULL::uuid, p_initial_stock_kottakkal integer DEFAULT 0, p_initial_stock_chenakkal integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_product_id UUID;
BEGIN
    -- Insert product
    INSERT INTO products (name, sku, mrp, dealer_price, brand_id, stock_qty)
    VALUES (p_name, p_sku, p_mrp, p_dealer_price, p_brand_id, p_initial_stock_kottakkal + p_initial_stock_chenakkal)
    RETURNING id INTO v_product_id;
    
    -- Create stock entries for both locations
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES 
        (v_product_id, 'Kottakkal', p_initial_stock_kottakkal),
        (v_product_id, 'Chenakkal', p_initial_stock_chenakkal);
    
    RETURN v_product_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.create_stock_adjustment_atomic(p_product_id uuid, p_location text, p_quantity integer, p_type stock_adjustment_type_enum, p_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_adjustment_id uuid;
  v_current_qty integer;
  v_new_qty integer;
  v_actor uuid := COALESCE(p_user_id, auth.uid());
  v_location text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to adjust stock';
  END IF;

  v_location := validate_master_setting_option('Godowns', p_location, 'location', true);

  SELECT stock_qty
  INTO v_current_qty
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = v_location
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES (p_product_id, v_location, 0)
    ON CONFLICT (product_id, location) DO NOTHING;
    v_current_qty := 0;
  END IF;

  v_new_qty := CASE
    WHEN p_type = 'Addition' THEN v_current_qty + p_quantity
    ELSE v_current_qty - p_quantity
  END;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Stock cannot go below zero at %', v_location;
  END IF;

  INSERT INTO stock_adjustments (product_id, quantity, type, reason, location, adjusted_by)
  VALUES (p_product_id, p_quantity, p_type, p_reason, v_location, v_actor)
  RETURNING id INTO v_adjustment_id;

  UPDATE product_stock_locations
  SET stock_qty = v_new_qty,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND location = v_location;

  INSERT INTO stock_movements (
    product_id,
    quantity,
    movement_type,
    reference_type,
    reference_id,
    location,
    created_by
  )
  VALUES (
    p_product_id,
    CASE WHEN p_type = 'Addition' THEN p_quantity ELSE -p_quantity END,
    'adjustment',
    'stock_adjustment',
    v_adjustment_id,
    v_location,
    v_actor
  );

  RETURN v_adjustment_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.role
  FROM users u
  WHERE u.id = auth.uid()
    AND u.is_active = true
  LIMIT 1;
$function$
CREATE OR REPLACE FUNCTION public.default_master_setting_option(p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_options text[];
BEGIN
  v_options := get_master_setting_options(p_key);
  IF COALESCE(array_length(v_options, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN v_options[1];
END;
$function$
CREATE OR REPLACE FUNCTION public.delete_master_setting_option(p_key text, p_value text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_value text := NULLIF(BTRIM(p_value), '');
  v_current text[];
  v_usage_count bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can manage master settings';
  END IF;

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Value is required';
  END IF;

  v_current := get_master_setting_options(v_key);

  IF NOT (v_value = ANY(v_current)) THEN
    RAISE EXCEPTION 'Value "%" does not exist in %', v_value, v_key;
  END IF;

  IF COALESCE(array_length(v_current, 1), 0) <= 1 THEN
    RAISE EXCEPTION '% must keep at least one option', v_key;
  END IF;

  IF v_key = 'Godowns' THEN
    SELECT
      (SELECT COUNT(*) FROM orders WHERE Godown = v_value)
      + (SELECT COUNT(*) FROM grn_items WHERE location = v_value)
      + (SELECT COUNT(*) FROM product_stock_locations WHERE location = v_value)
      + (SELECT COUNT(*) FROM stock_adjustments WHERE location = v_value)
      + (SELECT COUNT(*) FROM stock_movements WHERE location = v_value)
      + (SELECT COUNT(*) FROM stock_transfers WHERE from_location = v_value OR to_location = v_value)
    INTO v_usage_count;

    IF v_usage_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete Godown "%" because it is referenced in % rows', v_value, v_usage_count;
    END IF;
  ELSIF v_key = 'districts' THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM customers
    WHERE location = v_value;

    IF v_usage_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete district "%" because it is referenced by % customers', v_value, v_usage_count;
    END IF;
  ELSIF v_key = 'vehicle_types' THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM delivery_agents
    WHERE vehicle_type = v_value OR vehicle_type_other = v_value;

    IF v_usage_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete vehicle type "%" because it is referenced by % drivers', v_value, v_usage_count;
    END IF;
  END IF;

  RETURN save_master_setting_options(v_key, array_remove(v_current, v_value));
END;
$function$
CREATE OR REPLACE FUNCTION public.enforce_users_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'Only admins can update other users';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Only admins can update role, active flag, employee id, or email';
  END IF;

  RETURN NEW;
END;
$function$
CREATE OR REPLACE FUNCTION public.filter_jsonb_text_array(p_value jsonb, p_allowed text[])
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(a.allowed) ORDER BY a.ord)
      FROM unnest(p_allowed) WITH ORDINALITY AS a(allowed, ord)
      WHERE jsonb_typeof(p_value) = 'array'
        AND p_value ? a.allowed
    ),
    '[]'::jsonb
  );
$function$
CREATE OR REPLACE FUNCTION public.generate_delivery_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('delivery_number_seq');
BEGIN
  RETURN 'DEL-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$function$
CREATE OR REPLACE FUNCTION public.generate_grn_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('grn_number_seq');
BEGIN
  RETURN 'GRN-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$function$
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company company_enum)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_code text;
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('invoice_number_seq');
BEGIN
  v_company_code := CASE p_company
    WHEN 'YES YES' THEN 'YY'
    WHEN 'LLP' THEN 'LLP'
    WHEN 'Zekon' THEN 'ZK'
    ELSE 'INV'
  END;

  RETURN v_company_code || '-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$function$
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('order_number_seq');
BEGIN
  RETURN 'ORD-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$function$
CREATE OR REPLACE FUNCTION public.generate_po_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year text := TO_CHAR(NOW(), 'YY');
  v_next bigint := nextval('po_number_seq');
BEGIN
  RETURN 'PO-' || v_year || '-' || LPAD(v_next::text, 5, '0');
END;
$function$
CREATE OR REPLACE FUNCTION public.get_billing_reversal_requests(p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rows JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only accounts/admin can view reversal requests';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'order_id', r.order_id,
        'order_number', o.order_number,
        'invoice_number', r.invoice_number,
        'company', r.company,
        'status', r.status,
        'request_reason', r.request_reason,
        'admin_review_note', r.admin_review_note,
        'requested_by', r.requested_by,
        'requested_by_name', req.full_name,
        'approved_by_name', appr.full_name,
        'rejected_by_name', rej.full_name,
        'customer_name', c.name,
        'created_at', r.created_at,
        'updated_at', r.updated_at
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM public.billing_reversal_requests r
  JOIN public.orders o ON o.id = r.order_id
  LEFT JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.users req ON req.id = r.requested_by
  LEFT JOIN public.users appr ON appr.id = r.approved_by
  LEFT JOIN public.users rej ON rej.id = r.rejected_by
  WHERE p_status IS NULL OR r.status = p_status;

  RETURN v_rows;
END;
$function$
CREATE OR REPLACE FUNCTION public.get_company_profiles()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
CREATE OR REPLACE FUNCTION public.get_customer_balance(p_customer_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_opening DECIMAL;
    v_orders_total DECIMAL;
    v_receipts_total DECIMAL;
BEGIN
    SELECT opening_balance INTO v_opening FROM customers WHERE id = p_customer_id;
    
    SELECT COALESCE(SUM(grand_total), 0) INTO v_orders_total
    FROM orders WHERE customer_id = p_customer_id AND status IN ('Billed', 'Delivered');
    
    SELECT COALESCE(SUM(r.amount), 0) INTO v_receipts_total
    FROM receipts r
    JOIN orders o ON r.order_id = o.id
    WHERE o.customer_id = p_customer_id
      AND r.payment_status IN ('Received', 'Credited', 'Cleared');
    
    RETURN v_opening + v_orders_total - v_receipts_total;
END;
$function$
CREATE OR REPLACE FUNCTION public.get_customer_ledger(p_customer_id uuid)
 RETURNS TABLE(transaction_date timestamp with time zone, transaction_type text, reference_number text, debit numeric, credit numeric, balance numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH transactions AS (
        -- Orders (debit)
        SELECT 
            o.created_at as txn_date,
            'Invoice' as txn_type,
            o.invoice_number as ref_no,
            o.grand_total as debit_amt,
            0::DECIMAL as credit_amt
        FROM orders o
        WHERE o.customer_id = p_customer_id
        AND o.status IN ('Billed', 'Delivered')
        
        UNION ALL
        
        -- Receipts (credit)
        SELECT 
            r.created_at,
            'Receipt',
            r.receipt_number,
            0::DECIMAL,
            r.amount
        FROM receipts r
        JOIN orders o ON r.order_id = o.id
        WHERE o.customer_id = p_customer_id
          AND r.payment_status IN ('Received', 'Credited', 'Cleared')
    )
    SELECT 
        t.txn_date,
        t.txn_type,
        t.ref_no,
        t.debit_amt,
        t.credit_amt,
        SUM(t.debit_amt - t.credit_amt) OVER (ORDER BY t.txn_date) as running_balance
    FROM transactions t
    ORDER BY t.txn_date;
END;
$function$
CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_threshold integer DEFAULT 10)
 RETURNS TABLE(product_id uuid, product_name text, sku text, location text, stock_qty integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    psl.location,
    psl.stock_qty
  FROM products p
  JOIN product_stock_locations psl ON p.id = psl.product_id
  WHERE p.is_active = true
    AND psl.stock_qty <= p_threshold
  ORDER BY psl.stock_qty ASC, p.name;
END;
$function$
CREATE OR REPLACE FUNCTION public.get_master_setting_options(p_key text)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_value jsonb;
BEGIN
  SELECT s.value
  INTO v_value
  FROM settings s
  WHERE s.key = v_key
  LIMIT 1;

  IF v_value IS NULL OR jsonb_typeof(v_value) <> 'array' THEN
    RETURN ARRAY[]::text[];
  END IF;

  RETURN normalize_master_setting_values(ARRAY(SELECT jsonb_array_elements_text(v_value)));
END;
$function$
CREATE OR REPLACE FUNCTION public.get_master_settings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_Godowns_raw jsonb;
  v_districts_raw jsonb;
  v_vehicle_types_raw jsonb;
BEGIN
  IF auth.uid() IS NULL OR current_user_role() IS NULL THEN
    RAISE EXCEPTION 'active authenticated user required';
  END IF;

  SELECT value INTO v_Godowns_raw FROM public.settings WHERE key = 'Godowns' LIMIT 1;
  SELECT value INTO v_districts_raw FROM public.settings WHERE key = 'districts' LIMIT 1;
  SELECT value INTO v_vehicle_types_raw FROM public.settings WHERE key = 'vehicle_types' LIMIT 1;

  RETURN jsonb_build_object(
    'Godowns', public.normalize_master_settings_array(
      v_Godowns_raw,
      ARRAY['Kottakkal', 'Chenakkal'],
      '["Kottakkal", "Chenakkal"]'::jsonb
    ),
    'districts', public.normalize_master_settings_array(
      v_districts_raw,
      ARRAY[
        'Kasaragod', 'Kannur', 'Wayanad', 'Kozhikode', 'Malappuram', 'Palakkad', 'Thrissur',
        'Ernakulam', 'Idukki', 'Kottayam', 'Alappuzha', 'Pathanamthitta', 'Kollam', 'Thiruvananthapuram'
      ],
      '["Kasaragod", "Kannur", "Wayanad", "Kozhikode", "Malappuram", "Palakkad", "Thrissur", "Ernakulam", "Idukki", "Kottayam", "Alappuzha", "Pathanamthitta", "Kollam", "Thiruvananthapuram"]'::jsonb
    ),
    'vehicle_types', public.normalize_master_settings_array(
      v_vehicle_types_raw,
      ARRAY['2-Wheeler', '3-Wheeler', '4-Wheeler', 'Truck', 'Others'],
      '["2-Wheeler", "3-Wheeler", "4-Wheeler", "Truck", "Others"]'::jsonb
    )
  );
END;
$function$
CREATE OR REPLACE FUNCTION public.get_order_summary(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(status order_status_enum, order_count bigint, total_amount numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        o.status,
        COUNT(*),
        COALESCE(SUM(o.grand_total), 0)
    FROM orders o
    WHERE (p_start_date IS NULL OR o.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at::DATE <= p_end_date)
    GROUP BY o.status
    ORDER BY o.status;
END;
$function$
CREATE OR REPLACE FUNCTION public.get_stock_by_location(p_location text DEFAULT NULL::text)
 RETURNS TABLE(product_id uuid, product_name text, sku text, brand_name text, location text, stock_qty integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_location text := validate_master_setting_option('Godowns', p_location, 'location', false);
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    b.name,
    psl.location,
    psl.stock_qty
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  JOIN product_stock_locations psl ON p.id = psl.product_id
  WHERE p.is_active = true
    AND (v_location IS NULL OR psl.location = v_location)
  ORDER BY p.name, psl.location;
END;
$function$
CREATE OR REPLACE FUNCTION public.has_role(p_roles user_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(current_user_role() = ANY(p_roles), false);
$function$
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.is_active = true
  );
$function$
CREATE OR REPLACE FUNCTION public.normalize_master_setting_values(p_values text[])
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT COALESCE(array_agg(v.val ORDER BY v.first_pos), ARRAY[]::text[])
  FROM (
    SELECT cleaned.val, MIN(cleaned.ord) AS first_pos
    FROM (
      SELECT NULLIF(BTRIM(u.val), '') AS val, u.ord
      FROM unnest(COALESCE(p_values, ARRAY[]::text[])) WITH ORDINALITY AS u(val, ord)
    ) AS cleaned
    WHERE cleaned.val IS NOT NULL
    GROUP BY cleaned.val
  ) AS v;
$function$
CREATE OR REPLACE FUNCTION public.normalize_master_settings_array(p_value jsonb, p_allowed text[], p_default jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(p_value) = 'array'
      AND jsonb_array_length(p_value) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(p_value) AS x(v)
        WHERE NOT (x.v = ANY (p_allowed))
      )
    THEN public.filter_jsonb_text_array(p_value, p_allowed)
    ELSE p_default
  END;
$function$
CREATE OR REPLACE FUNCTION public.reject_billing_reversal(p_request_id uuid, p_admin_user_id uuid, p_admin_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor UUID := COALESCE(p_admin_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'admin_user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only admin can reject billing reversal';
  END IF;

  UPDATE public.billing_reversal_requests
  SET status = 'Rejected',
      admin_review_note = NULLIF(TRIM(p_admin_note), ''),
      rejected_by = v_actor,
      rejected_at = NOW(),
      approved_by = NULL,
      approved_at = NULL,
      updated_at = NOW()
  WHERE id = p_request_id
    AND status = 'Pending';

  RETURN FOUND;
END;
$function$
CREATE OR REPLACE FUNCTION public.reject_order(p_order_id uuid, p_rejected_by uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_rejected_by <> auth.uid() THEN
    RAISE EXCEPTION 'rejected_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to reject order';
  END IF;

  UPDATE orders
  SET status = 'Rejected',
      approved_by = p_rejected_by,
      approved_at = NOW(),
      remarks = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN remarks
        ELSE COALESCE(remarks || ' | ', '') || 'Rejected: ' || TRIM(p_reason)
      END,
      updated_at = NOW()
  WHERE id = p_order_id
    AND status = 'Pending';

  RETURN FOUND;
END;
$function$
CREATE OR REPLACE FUNCTION public.request_billing_reversal(p_order_id uuid, p_reason text, p_requested_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor UUID := COALESCE(p_requested_by, auth.uid());
  v_order RECORD;
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'requested_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['accounts', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only accounts/admin can request billing reversal';
  END IF;
  IF COALESCE(TRIM(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Reversal reason is required';
  END IF;

  SELECT o.id, o.status, o.invoice_number, o.company
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.status <> 'Billed' THEN
    RAISE EXCEPTION 'Only billed orders can be reversed';
  END IF;

  SELECT r.id INTO v_request_id
  FROM public.billing_reversal_requests r
  WHERE r.order_id = p_order_id
    AND r.status = 'Pending'
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    RETURN v_request_id;
  END IF;

  INSERT INTO public.billing_reversal_requests (
    order_id,
    invoice_number,
    company,
    request_reason,
    status,
    requested_by
  )
  VALUES (
    p_order_id,
    v_order.invoice_number,
    v_order.company,
    TRIM(p_reason),
    'Pending',
    v_actor
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$function$
CREATE OR REPLACE FUNCTION public.save_master_setting_options(p_key text, p_values text[])
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_clean text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can manage master settings';
  END IF;

  v_clean := normalize_master_setting_values(p_values);

  IF COALESCE(array_length(v_clean, 1), 0) = 0 THEN
    RAISE EXCEPTION '% must contain at least one option', v_key;
  END IF;

  INSERT INTO settings (key, value, updated_at)
  VALUES (v_key, to_jsonb(v_clean), NOW())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();

  RETURN v_clean;
END;
$function$
CREATE OR REPLACE FUNCTION public.transfer_stock(p_product_id uuid, p_from_location text, p_to_location text, p_quantity integer, p_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from_stock integer;
  v_transfer_id uuid;
  v_actor uuid := COALESCE(p_user_id, auth.uid());
  v_from_location text;
  v_to_location text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'procurement', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to transfer stock';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be greater than zero';
  END IF;

  v_from_location := validate_master_setting_option('Godowns', p_from_location, 'from location', true);
  v_to_location := validate_master_setting_option('Godowns', p_to_location, 'to location', true);

  IF v_from_location = v_to_location THEN
    RAISE EXCEPTION 'Cannot transfer to same location';
  END IF;

  SELECT stock_qty
  INTO v_from_stock
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = v_from_location
  FOR UPDATE;

  IF v_from_stock IS NULL OR v_from_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at % (available: %)', v_from_location, COALESCE(v_from_stock, 0);
  END IF;

  INSERT INTO stock_transfers (product_id, from_location, to_location, quantity, reason, transferred_by)
  VALUES (p_product_id, v_from_location, v_to_location, p_quantity, p_reason, v_actor)
  RETURNING id INTO v_transfer_id;

  UPDATE product_stock_locations
  SET stock_qty = stock_qty - p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND location = v_from_location;

  INSERT INTO product_stock_locations (product_id, location, stock_qty)
  VALUES (p_product_id, v_to_location, p_quantity)
  ON CONFLICT (product_id, location)
  DO UPDATE SET stock_qty = product_stock_locations.stock_qty + p_quantity,
                updated_at = NOW();

  INSERT INTO stock_movements (product_id, quantity, movement_type, reference_type, reference_id, location, created_by)
  VALUES
    (p_product_id, -p_quantity, 'transfer_out', 'stock_transfers', v_transfer_id, v_from_location, v_actor),
    (p_product_id, p_quantity, 'transfer_in', 'stock_transfers', v_transfer_id, v_to_location, v_actor);

  RETURN TRUE;
END;
$function$
CREATE OR REPLACE FUNCTION public.update_delivery_status(p_delivery_id uuid, p_status delivery_status_enum, p_failure_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE deliveries
    SET status = p_status,
        failure_reason = CASE WHEN p_status = 'Failed' THEN p_failure_reason ELSE NULL END,
        dispatched_at = CASE WHEN p_status = 'In Transit' THEN NOW() ELSE dispatched_at END,
        delivered_at = CASE WHEN p_status = 'Delivered' THEN NOW() ELSE delivered_at END
    WHERE id = p_delivery_id;
    
    -- Update order status if delivered
    IF p_status = 'Delivered' THEN
        UPDATE orders
        SET status = 'Delivered'
        WHERE id = (SELECT order_id FROM deliveries WHERE id = p_delivery_id);
    END IF;
    
    RETURN FOUND;
END;
$function$
CREATE OR REPLACE FUNCTION public.update_delivery_status(p_delivery_id uuid, p_status delivery_status_enum, p_failure_reason text DEFAULT NULL::text, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delivery record;
  v_item record;
  v_location text;
  v_actor uuid := COALESCE(p_updated_by, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF v_actor <> auth.uid() THEN
    RAISE EXCEPTION 'updated_by must match authenticated user';
  END IF;
  IF NOT has_role(ARRAY['inventory', 'admin']::user_role[]) THEN
    RAISE EXCEPTION 'Insufficient role to update delivery status';
  END IF;

  SELECT d.id, d.order_id, d.status AS current_status, o.status AS order_status, o.Godown
  INTO v_delivery
  FROM deliveries d
  JOIN orders o ON o.id = d.order_id
  WHERE d.id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found: %', p_delivery_id;
  END IF;

  v_location := validate_master_setting_option(
    'Godowns',
    COALESCE(NULLIF(BTRIM(v_delivery.Godown), ''), default_master_setting_option('Godowns')),
    'delivery Godown',
    true
  );

  IF p_status = 'Delivered' AND v_delivery.current_status <> 'Delivered' THEN
    IF v_delivery.order_status NOT IN ('Billed', 'Delivered') THEN
      RAISE EXCEPTION 'Order must be Billed before delivery completion';
    END IF;

    FOR v_item IN
      SELECT product_id, quantity
      FROM order_items
      WHERE order_id = v_delivery.order_id
    LOOP
      INSERT INTO product_stock_locations (product_id, location, stock_qty)
      VALUES (v_item.product_id, v_location, 0)
      ON CONFLICT (product_id, location) DO NOTHING;

      UPDATE product_stock_locations
      SET stock_qty = GREATEST(0, stock_qty - v_item.quantity),
          updated_at = NOW()
      WHERE product_id = v_item.product_id
        AND location = v_location;

      INSERT INTO stock_movements (
        product_id,
        quantity,
        movement_type,
        reference_type,
        reference_id,
        location,
        created_by
      )
      VALUES (
        v_item.product_id,
        -v_item.quantity,
        'order_delivery',
        'delivery',
        p_delivery_id,
        v_location,
        v_actor
      );
    END LOOP;

    UPDATE orders
    SET status = 'Delivered',
        updated_at = NOW()
    WHERE id = v_delivery.order_id;
  END IF;

  UPDATE deliveries
  SET status = p_status,
      failure_reason = CASE WHEN p_status = 'Failed' THEN p_failure_reason ELSE NULL END,
      dispatched_at = CASE WHEN p_status = 'In Transit' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
      delivered_at = CASE WHEN p_status = 'Delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
      updated_at = NOW()
  WHERE id = p_delivery_id;

  RETURN FOUND;
END;
$function$
CREATE OR REPLACE FUNCTION public.update_delivery_status_idempotent(p_delivery_id uuid, p_status delivery_status_enum, p_failure_reason text DEFAULT NULL::text, p_updated_by uuid DEFAULT NULL::uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated BOOLEAN;
BEGIN
  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('update_delivery_status_idempotent:' || p_idempotency_key));

    SELECT result_bool INTO v_updated
    FROM rpc_idempotency_keys
    WHERE function_name = 'update_delivery_status_idempotent'
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_updated;
    END IF;
  END IF;

  v_updated := update_delivery_status(p_delivery_id, p_status, p_failure_reason, p_updated_by);

  IF COALESCE(TRIM(p_idempotency_key), '') <> '' THEN
    INSERT INTO rpc_idempotency_keys (function_name, idempotency_key, result_bool)
    VALUES ('update_delivery_status_idempotent', p_idempotency_key, v_updated)
    ON CONFLICT (function_name, idempotency_key) DO NOTHING;
  END IF;

  RETURN v_updated;
END;
$function$
CREATE OR REPLACE FUNCTION public.update_master_setting_option(p_key text, p_old_value text, p_new_value text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_old text := NULLIF(BTRIM(p_old_value), '');
  v_new text := NULLIF(BTRIM(p_new_value), '');
  v_current text[];
  v_updated text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can manage master settings';
  END IF;

  IF v_old IS NULL OR v_new IS NULL THEN
    RAISE EXCEPTION 'Both old and new values are required';
  END IF;

  v_current := get_master_setting_options(v_key);

  IF NOT (v_old = ANY(v_current)) THEN
    RAISE EXCEPTION 'Value "%" does not exist in %', v_old, v_key;
  END IF;

  IF v_old <> v_new AND v_new = ANY(v_current) THEN
    RAISE EXCEPTION 'Value "%" already exists in %', v_new, v_key;
  END IF;

  IF v_old <> v_new THEN
    IF v_key = 'Godowns' THEN
      UPDATE orders SET Godown = v_new WHERE Godown = v_old;
      UPDATE grn_items SET location = v_new WHERE location = v_old;
      UPDATE product_stock_locations SET location = v_new WHERE location = v_old;
      UPDATE stock_adjustments SET location = v_new WHERE location = v_old;
      UPDATE stock_movements SET location = v_new WHERE location = v_old;
      UPDATE stock_transfers SET from_location = v_new WHERE from_location = v_old;
      UPDATE stock_transfers SET to_location = v_new WHERE to_location = v_old;
    ELSIF v_key = 'districts' THEN
      UPDATE customers SET location = v_new WHERE location = v_old;
    ELSIF v_key = 'vehicle_types' THEN
      UPDATE delivery_agents SET vehicle_type = v_new WHERE vehicle_type = v_old;
      UPDATE delivery_agents SET vehicle_type_other = v_new WHERE vehicle_type_other = v_old;
    END IF;
  END IF;

  v_updated := ARRAY(
    SELECT CASE WHEN item = v_old THEN v_new ELSE item END
    FROM unnest(v_current) AS item
  );

  RETURN save_master_setting_options(v_key, v_updated);
END;
$function$
CREATE OR REPLACE FUNCTION public.update_stock_at_location(p_product_id uuid, p_location text, p_quantity integer, p_operation text, p_reason text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_location text;
  v_current_qty integer;
  v_new_qty integer;
BEGIN
  v_location := validate_master_setting_option('Godowns', p_location, 'location', true);

  SELECT stock_qty INTO v_current_qty
  FROM product_stock_locations
  WHERE product_id = p_product_id
    AND location = v_location
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    INSERT INTO product_stock_locations (product_id, location, stock_qty)
    VALUES (p_product_id, v_location, 0)
    ON CONFLICT (product_id, location) DO NOTHING;
    v_current_qty := 0;
  END IF;

  CASE p_operation
    WHEN 'add' THEN v_new_qty := v_current_qty + p_quantity;
    WHEN 'subtract' THEN v_new_qty := GREATEST(0, v_current_qty - p_quantity);
    WHEN 'set' THEN v_new_qty := p_quantity;
    ELSE
      RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END CASE;

  UPDATE product_stock_locations
  SET stock_qty = v_new_qty,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND location = v_location;

  INSERT INTO stock_movements (
    product_id,
    quantity,
    movement_type,
    location,
    created_by
  )
  VALUES (
    p_product_id,
    CASE p_operation
      WHEN 'add' THEN p_quantity
      WHEN 'subtract' THEN -p_quantity
      ELSE v_new_qty - v_current_qty
    END,
    'adjustment',
    v_location,
    p_user_id
  );

  RETURN v_new_qty;
END;
$function$
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
CREATE OR REPLACE FUNCTION public.validate_master_setting_option(p_key text, p_value text, p_label text DEFAULT NULL::text, p_required boolean DEFAULT true)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text := assert_master_setting_key(p_key);
  v_label text := COALESCE(NULLIF(BTRIM(p_label), ''), p_key);
  v_value text := NULLIF(BTRIM(p_value), '');
  v_allowed text[];
BEGIN
  v_allowed := get_master_setting_options(v_key);

  IF v_value IS NULL THEN
    IF p_required THEN
      RAISE EXCEPTION '% is required', v_label;
    END IF;
    RETURN NULL;
  END IF;

  IF NOT (v_value = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid % "%". Configure it in Settings first.', v_label, v_value;
  END IF;

  RETURN v_value;
END;
$function$

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS billing_reversal_requests_pkey ON public.billing_reversal_requests USING btree (id);
CREATE INDEX IF NOT EXISTS idx_billing_reversal_requests_order_id ON public.billing_reversal_requests USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_billing_reversal_requests_status ON public.billing_reversal_requests USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_reversal_pending_order ON public.billing_reversal_requests USING btree (order_id) WHERE (status = 'Pending'::text);
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_key ON public.brands USING btree (name);
CREATE UNIQUE INDEX IF NOT EXISTS brands_pkey ON public.brands USING btree (id);
CREATE INDEX IF NOT EXISTS idx_brands_deleted_at ON public.brands USING btree (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS collections_pkey ON public.collections USING btree (id);
CREATE INDEX IF NOT EXISTS idx_collections_customer_id ON public.collections USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_due_date ON public.collections USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_collections_order_id ON public.collections USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS customers_pkey ON public.customers USING btree (id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON public.customers USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_location ON public.customers USING btree (location);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers USING btree (phone);
CREATE UNIQUE INDEX IF NOT EXISTS data_recovery_events_pkey ON public.data_recovery_events USING btree (id);
CREATE INDEX IF NOT EXISTS idx_data_recovery_events_created_at ON public.data_recovery_events USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_recovery_events_entity ON public.data_recovery_events USING btree (entity_table, entity_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_delivery_number_key ON public.deliveries USING btree (delivery_number);
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_pkey ON public.deliveries USING btree (id);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_agent_id ON public.deliveries USING btree (delivery_agent_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_agents_pkey ON public.delivery_agents USING btree (id);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_deleted_at ON public.delivery_agents USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_is_active ON public.delivery_agents USING btree (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS grn_grn_number_key ON public.grn USING btree (grn_number);
CREATE UNIQUE INDEX IF NOT EXISTS grn_pkey ON public.grn USING btree (id);
CREATE INDEX IF NOT EXISTS idx_grn_po_id ON public.grn USING btree (po_id);
CREATE UNIQUE INDEX IF NOT EXISTS grn_items_pkey ON public.grn_items USING btree (id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON public.grn_items USING btree (grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_product_id ON public.grn_items USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items USING btree (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS order_items_pkey ON public.order_items USING btree (id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_Godown ON public.orders USING btree (Godown);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice_number_unique ON public.orders USING btree (invoice_number) WHERE (invoice_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders USING btree (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders USING btree (order_number);
CREATE UNIQUE INDEX IF NOT EXISTS orders_pkey ON public.orders USING btree (id);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.po_items USING btree (po_id);
CREATE UNIQUE INDEX IF NOT EXISTS po_items_pkey ON public.po_items USING btree (id);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_location ON public.product_stock_locations USING btree (location);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_product_id ON public.product_stock_locations USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_locations_stock_qty ON public.product_stock_locations USING btree (stock_qty);
CREATE UNIQUE INDEX IF NOT EXISTS product_stock_locations_pkey ON public.product_stock_locations USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS product_stock_locations_product_id_location_key ON public.product_stock_locations USING btree (product_id, location);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products USING btree (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products USING btree (deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products USING btree (sku);
CREATE UNIQUE INDEX IF NOT EXISTS products_pkey ON public.products USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_key ON public.products USING btree (sku);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders USING btree (status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders USING btree (supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_pkey ON public.purchase_orders USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_po_number_key ON public.purchase_orders USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON public.receipts USING btree (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS receipts_pkey ON public.receipts USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS receipts_receipt_number_key ON public.receipts USING btree (receipt_number);
CREATE UNIQUE INDEX IF NOT EXISTS rpc_idempotency_keys_function_name_idempotency_key_key ON public.rpc_idempotency_keys USING btree (function_name, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS rpc_idempotency_keys_pkey ON public.rpc_idempotency_keys USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_key ON public.settings USING btree (key);
CREATE UNIQUE INDEX IF NOT EXISTS settings_pkey ON public.settings USING btree (id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON public.stock_adjustments USING btree (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS stock_adjustments_pkey ON public.stock_adjustments USING btree (id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON public.stock_movements USING btree (location);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON public.stock_movements USING btree (movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements USING btree (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_pkey ON public.stock_movements USING btree (id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON public.stock_transfers USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_location ON public.stock_transfers USING btree (from_location);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_product_id ON public.stock_transfers USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_location ON public.stock_transfers USING btree (to_location);
CREATE UNIQUE INDEX IF NOT EXISTS stock_transfers_pkey ON public.stock_transfers USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_pkey ON public.suppliers USING btree (id);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users USING btree (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_employee_id_key ON public.users USING btree (employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON public.users USING btree (id);

-- Triggers
DROP TRIGGER IF EXISTS "trigger_update_brands_updated_at" ON public."brands";
DROP TRIGGER IF EXISTS "trigger_update_collections_updated_at" ON public."collections";
DROP TRIGGER IF EXISTS "trigger_update_customers_updated_at" ON public."customers";
DROP TRIGGER IF EXISTS "trigger_update_deliveries_updated_at" ON public."deliveries";
DROP TRIGGER IF EXISTS "trigger_update_delivery_agents_updated_at" ON public."delivery_agents";
DROP TRIGGER IF EXISTS "trigger_update_grn_updated_at" ON public."grn";
DROP TRIGGER IF EXISTS "trigger_update_orders_updated_at" ON public."orders";
DROP TRIGGER IF EXISTS "trigger_update_product_stock_locations_updated_at" ON public."product_stock_locations";
DROP TRIGGER IF EXISTS "trigger_update_products_updated_at" ON public."products";
DROP TRIGGER IF EXISTS "trigger_update_purchase_orders_updated_at" ON public."purchase_orders";
DROP TRIGGER IF EXISTS "trigger_update_settings_updated_at" ON public."settings";
DROP TRIGGER IF EXISTS "trigger_update_suppliers_updated_at" ON public."suppliers";
DROP TRIGGER IF EXISTS "trg_enforce_users_update_guard" ON public."users";
DROP TRIGGER IF EXISTS "trigger_update_users_updated_at" ON public."users";
CREATE TRIGGER trigger_update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_delivery_agents_updated_at BEFORE UPDATE ON delivery_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_grn_updated_at BEFORE UPDATE ON grn FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_product_stock_locations_updated_at BEFORE UPDATE ON product_stock_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_enforce_users_update_guard BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION enforce_users_update_guard();
CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public."billing_reversal_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."data_recovery_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."delivery_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."grn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."grn_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."po_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."product_stock_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rpc_idempotency_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stock_adjustments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stock_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "billing_reversal_requests_insert_accounts_admin" ON public."billing_reversal_requests";
CREATE POLICY "billing_reversal_requests_insert_accounts_admin" ON public."billing_reversal_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((has_role(ARRAY['accounts'::user_role, 'admin'::user_role]) AND (requested_by = auth.uid()) AND (status = 'Pending'::text) AND (approved_by IS NULL) AND (rejected_by IS NULL) AND (approved_at IS NULL) AND (rejected_at IS NULL)));
DROP POLICY IF EXISTS "billing_reversal_requests_select_accounts_admin" ON public."billing_reversal_requests";
CREATE POLICY "billing_reversal_requests_select_accounts_admin" ON public."billing_reversal_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_role(ARRAY['accounts'::user_role, 'admin'::user_role]));
DROP POLICY IF EXISTS "billing_reversal_requests_update_admin_only" ON public."billing_reversal_requests";
CREATE POLICY "billing_reversal_requests_update_admin_only" ON public."billing_reversal_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (has_role(ARRAY['admin'::user_role])) WITH CHECK (has_role(ARRAY['admin'::user_role]));
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."brands";
CREATE POLICY "Allow authenticated delete" ON public."brands" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."brands";
CREATE POLICY "Allow authenticated insert" ON public."brands" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."brands";
CREATE POLICY "Allow authenticated select" ON public."brands" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."brands";
CREATE POLICY "Allow authenticated update" ON public."brands" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "brands_delete" ON public."brands";
CREATE POLICY "brands_delete" ON public."brands" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "brands_insert" ON public."brands";
CREATE POLICY "brands_insert" ON public."brands" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "brands_select" ON public."brands";
CREATE POLICY "brands_select" ON public."brands" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "brands_update" ON public."brands";
CREATE POLICY "brands_update" ON public."brands" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."collections";
CREATE POLICY "Allow authenticated delete" ON public."collections" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."collections";
CREATE POLICY "Allow authenticated insert" ON public."collections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."collections";
CREATE POLICY "Allow authenticated select" ON public."collections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."collections";
CREATE POLICY "Allow authenticated update" ON public."collections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "collections_delete" ON public."collections";
CREATE POLICY "collections_delete" ON public."collections" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "collections_insert" ON public."collections";
CREATE POLICY "collections_insert" ON public."collections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "collections_select" ON public."collections";
CREATE POLICY "collections_select" ON public."collections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "collections_update" ON public."collections";
CREATE POLICY "collections_update" ON public."collections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."customers";
CREATE POLICY "Allow authenticated delete" ON public."customers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."customers";
CREATE POLICY "Allow authenticated insert" ON public."customers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."customers";
CREATE POLICY "Allow authenticated select" ON public."customers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."customers";
CREATE POLICY "Allow authenticated update" ON public."customers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "customers_delete" ON public."customers";
CREATE POLICY "customers_delete" ON public."customers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "customers_insert" ON public."customers";
CREATE POLICY "customers_insert" ON public."customers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "customers_select" ON public."customers";
CREATE POLICY "customers_select" ON public."customers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "customers_update" ON public."customers";
CREATE POLICY "customers_update" ON public."customers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "recovery_events_insert_authenticated" ON public."data_recovery_events";
CREATE POLICY "recovery_events_insert_authenticated" ON public."data_recovery_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() IS NOT NULL));
DROP POLICY IF EXISTS "recovery_events_select_authenticated" ON public."data_recovery_events";
CREATE POLICY "recovery_events_select_authenticated" ON public."data_recovery_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() IS NOT NULL));
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."deliveries";
CREATE POLICY "Allow authenticated delete" ON public."deliveries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."deliveries";
CREATE POLICY "Allow authenticated insert" ON public."deliveries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."deliveries";
CREATE POLICY "Allow authenticated select" ON public."deliveries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."deliveries";
CREATE POLICY "Allow authenticated update" ON public."deliveries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "deliveries_delete" ON public."deliveries";
CREATE POLICY "deliveries_delete" ON public."deliveries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "deliveries_insert" ON public."deliveries";
CREATE POLICY "deliveries_insert" ON public."deliveries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "deliveries_select" ON public."deliveries";
CREATE POLICY "deliveries_select" ON public."deliveries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "deliveries_update" ON public."deliveries";
CREATE POLICY "deliveries_update" ON public."deliveries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."delivery_agents";
CREATE POLICY "Allow authenticated delete" ON public."delivery_agents" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."delivery_agents";
CREATE POLICY "Allow authenticated insert" ON public."delivery_agents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."delivery_agents";
CREATE POLICY "Allow authenticated select" ON public."delivery_agents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."delivery_agents";
CREATE POLICY "Allow authenticated update" ON public."delivery_agents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "delivery_agents_delete" ON public."delivery_agents";
CREATE POLICY "delivery_agents_delete" ON public."delivery_agents" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "delivery_agents_insert" ON public."delivery_agents";
CREATE POLICY "delivery_agents_insert" ON public."delivery_agents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "delivery_agents_select" ON public."delivery_agents";
CREATE POLICY "delivery_agents_select" ON public."delivery_agents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "delivery_agents_update" ON public."delivery_agents";
CREATE POLICY "delivery_agents_update" ON public."delivery_agents" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."grn";
CREATE POLICY "Allow authenticated delete" ON public."grn" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."grn";
CREATE POLICY "Allow authenticated insert" ON public."grn" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."grn";
CREATE POLICY "Allow authenticated select" ON public."grn" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."grn";
CREATE POLICY "Allow authenticated update" ON public."grn" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "grn_delete" ON public."grn";
CREATE POLICY "grn_delete" ON public."grn" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "grn_insert" ON public."grn";
CREATE POLICY "grn_insert" ON public."grn" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "grn_select" ON public."grn";
CREATE POLICY "grn_select" ON public."grn" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "grn_update" ON public."grn";
CREATE POLICY "grn_update" ON public."grn" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."grn_items";
CREATE POLICY "Allow authenticated delete" ON public."grn_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."grn_items";
CREATE POLICY "Allow authenticated insert" ON public."grn_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."grn_items";
CREATE POLICY "Allow authenticated select" ON public."grn_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."grn_items";
CREATE POLICY "Allow authenticated update" ON public."grn_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "grn_items_delete" ON public."grn_items";
CREATE POLICY "grn_items_delete" ON public."grn_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "grn_items_insert" ON public."grn_items";
CREATE POLICY "grn_items_insert" ON public."grn_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "grn_items_select" ON public."grn_items";
CREATE POLICY "grn_items_select" ON public."grn_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "grn_items_update" ON public."grn_items";
CREATE POLICY "grn_items_update" ON public."grn_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "order_items_delete_admin" ON public."order_items";
CREATE POLICY "order_items_delete_admin" ON public."order_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (has_role(ARRAY['admin'::user_role]));
DROP POLICY IF EXISTS "order_items_insert_sales_admin_accounts" ON public."order_items";
CREATE POLICY "order_items_insert_sales_admin_accounts" ON public."order_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (has_role(ARRAY['sales'::user_role, 'accounts'::user_role, 'admin'::user_role]));
DROP POLICY IF EXISTS "order_items_select_authenticated" ON public."order_items";
CREATE POLICY "order_items_select_authenticated" ON public."order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_role(ARRAY['admin'::user_role, 'sales'::user_role, 'accounts'::user_role, 'inventory'::user_role, 'procurement'::user_role]));
DROP POLICY IF EXISTS "order_items_update_accounts_admin" ON public."order_items";
CREATE POLICY "order_items_update_accounts_admin" ON public."order_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (has_role(ARRAY['accounts'::user_role, 'admin'::user_role])) WITH CHECK (has_role(ARRAY['accounts'::user_role, 'admin'::user_role]));
DROP POLICY IF EXISTS "orders_delete_admin" ON public."orders";
CREATE POLICY "orders_delete_admin" ON public."orders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (has_role(ARRAY['admin'::user_role]));
DROP POLICY IF EXISTS "orders_insert_sales_admin" ON public."orders";
CREATE POLICY "orders_insert_sales_admin" ON public."orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((has_role(ARRAY['sales'::user_role, 'admin'::user_role]) AND (COALESCE(created_by, auth.uid()) = auth.uid())));
DROP POLICY IF EXISTS "orders_select_authenticated" ON public."orders";
CREATE POLICY "orders_select_authenticated" ON public."orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_role(ARRAY['admin'::user_role, 'sales'::user_role, 'accounts'::user_role, 'inventory'::user_role, 'procurement'::user_role]));
DROP POLICY IF EXISTS "orders_update_accounts_inventory_admin" ON public."orders";
CREATE POLICY "orders_update_accounts_inventory_admin" ON public."orders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (has_role(ARRAY['accounts'::user_role, 'inventory'::user_role, 'admin'::user_role])) WITH CHECK (has_role(ARRAY['accounts'::user_role, 'inventory'::user_role, 'admin'::user_role]));
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."po_items";
CREATE POLICY "Allow authenticated delete" ON public."po_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."po_items";
CREATE POLICY "Allow authenticated insert" ON public."po_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."po_items";
CREATE POLICY "Allow authenticated select" ON public."po_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."po_items";
CREATE POLICY "Allow authenticated update" ON public."po_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "po_items_delete" ON public."po_items";
CREATE POLICY "po_items_delete" ON public."po_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "po_items_insert" ON public."po_items";
CREATE POLICY "po_items_insert" ON public."po_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "po_items_select" ON public."po_items";
CREATE POLICY "po_items_select" ON public."po_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "po_items_update" ON public."po_items";
CREATE POLICY "po_items_update" ON public."po_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "product_stock_locations_mutation_inventory_admin" ON public."product_stock_locations";
CREATE POLICY "product_stock_locations_mutation_inventory_admin" ON public."product_stock_locations" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_role(ARRAY['inventory'::user_role, 'admin'::user_role])) WITH CHECK (has_role(ARRAY['inventory'::user_role, 'admin'::user_role]));
DROP POLICY IF EXISTS "product_stock_locations_select_authenticated" ON public."product_stock_locations";
CREATE POLICY "product_stock_locations_select_authenticated" ON public."product_stock_locations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_role(ARRAY['admin'::user_role, 'inventory'::user_role, 'procurement'::user_role, 'accounts'::user_role, 'sales'::user_role]));
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."products";
CREATE POLICY "Allow authenticated delete" ON public."products" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."products";
CREATE POLICY "Allow authenticated insert" ON public."products" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."products";
CREATE POLICY "Allow authenticated select" ON public."products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."products";
CREATE POLICY "Allow authenticated update" ON public."products" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "products_delete" ON public."products";
CREATE POLICY "products_delete" ON public."products" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "products_insert" ON public."products";
CREATE POLICY "products_insert" ON public."products" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "products_select" ON public."products";
CREATE POLICY "products_select" ON public."products" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "products_update" ON public."products";
CREATE POLICY "products_update" ON public."products" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."purchase_orders";
CREATE POLICY "Allow authenticated delete" ON public."purchase_orders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."purchase_orders";
CREATE POLICY "Allow authenticated insert" ON public."purchase_orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."purchase_orders";
CREATE POLICY "Allow authenticated select" ON public."purchase_orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."purchase_orders";
CREATE POLICY "Allow authenticated update" ON public."purchase_orders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "purchase_orders_delete" ON public."purchase_orders";
CREATE POLICY "purchase_orders_delete" ON public."purchase_orders" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "purchase_orders_insert" ON public."purchase_orders";
CREATE POLICY "purchase_orders_insert" ON public."purchase_orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "purchase_orders_select" ON public."purchase_orders";
CREATE POLICY "purchase_orders_select" ON public."purchase_orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "purchase_orders_update" ON public."purchase_orders";
CREATE POLICY "purchase_orders_update" ON public."purchase_orders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."receipts";
CREATE POLICY "Allow authenticated delete" ON public."receipts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."receipts";
CREATE POLICY "Allow authenticated insert" ON public."receipts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."receipts";
CREATE POLICY "Allow authenticated select" ON public."receipts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."receipts";
CREATE POLICY "Allow authenticated update" ON public."receipts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "receipts_delete" ON public."receipts";
CREATE POLICY "receipts_delete" ON public."receipts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "receipts_insert" ON public."receipts";
CREATE POLICY "receipts_insert" ON public."receipts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "receipts_select" ON public."receipts";
CREATE POLICY "receipts_select" ON public."receipts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "receipts_update" ON public."receipts";
CREATE POLICY "receipts_update" ON public."receipts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "rpc_idempotency_keys_admin_only" ON public."rpc_idempotency_keys";
CREATE POLICY "rpc_idempotency_keys_admin_only" ON public."rpc_idempotency_keys" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_role(ARRAY['admin'::user_role])) WITH CHECK (has_role(ARRAY['admin'::user_role]));
DROP POLICY IF EXISTS "settings_admin_only" ON public."settings";
CREATE POLICY "settings_admin_only" ON public."settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_role(ARRAY['admin'::user_role])) WITH CHECK (has_role(ARRAY['admin'::user_role]));
DROP POLICY IF EXISTS "stock_adjustments_mutation_inventory_admin" ON public."stock_adjustments";
CREATE POLICY "stock_adjustments_mutation_inventory_admin" ON public."stock_adjustments" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_role(ARRAY['inventory'::user_role, 'admin'::user_role])) WITH CHECK (has_role(ARRAY['inventory'::user_role, 'admin'::user_role]));
DROP POLICY IF EXISTS "stock_adjustments_select_authenticated" ON public."stock_adjustments";
CREATE POLICY "stock_adjustments_select_authenticated" ON public."stock_adjustments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_role(ARRAY['admin'::user_role, 'inventory'::user_role, 'accounts'::user_role, 'procurement'::user_role]));
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."stock_movements";
CREATE POLICY "Allow authenticated delete" ON public."stock_movements" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."stock_movements";
CREATE POLICY "Allow authenticated insert" ON public."stock_movements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."stock_movements";
CREATE POLICY "Allow authenticated select" ON public."stock_movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."stock_movements";
CREATE POLICY "Allow authenticated update" ON public."stock_movements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "stock_movements_delete" ON public."stock_movements";
CREATE POLICY "stock_movements_delete" ON public."stock_movements" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "stock_movements_insert" ON public."stock_movements";
CREATE POLICY "stock_movements_insert" ON public."stock_movements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "stock_movements_select" ON public."stock_movements";
CREATE POLICY "stock_movements_select" ON public."stock_movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "stock_movements_update" ON public."stock_movements";
CREATE POLICY "stock_movements_update" ON public."stock_movements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "stock_transfers_insert_inventory_procurement_admin" ON public."stock_transfers";
CREATE POLICY "stock_transfers_insert_inventory_procurement_admin" ON public."stock_transfers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (has_role(ARRAY['inventory'::user_role, 'procurement'::user_role, 'admin'::user_role]));
DROP POLICY IF EXISTS "stock_transfers_select_authenticated" ON public."stock_transfers";
CREATE POLICY "stock_transfers_select_authenticated" ON public."stock_transfers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_role(ARRAY['admin'::user_role, 'inventory'::user_role, 'procurement'::user_role, 'accounts'::user_role]));
DROP POLICY IF EXISTS "Allow authenticated delete" ON public."suppliers";
CREATE POLICY "Allow authenticated delete" ON public."suppliers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert" ON public."suppliers";
CREATE POLICY "Allow authenticated insert" ON public."suppliers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated select" ON public."suppliers";
CREATE POLICY "Allow authenticated select" ON public."suppliers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "Allow authenticated update" ON public."suppliers";
CREATE POLICY "Allow authenticated update" ON public."suppliers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "suppliers_delete" ON public."suppliers";
CREATE POLICY "suppliers_delete" ON public."suppliers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "suppliers_insert" ON public."suppliers";
CREATE POLICY "suppliers_insert" ON public."suppliers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_select" ON public."suppliers";
CREATE POLICY "suppliers_select" ON public."suppliers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
DROP POLICY IF EXISTS "suppliers_update" ON public."suppliers";
CREATE POLICY "suppliers_update" ON public."suppliers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (true);
DROP POLICY IF EXISTS "users_delete_admin" ON public."users";
CREATE POLICY "users_delete_admin" ON public."users" AS PERMISSIVE FOR DELETE TO "authenticated" USING (has_role(ARRAY['admin'::user_role]));
DROP POLICY IF EXISTS "users_insert_admin" ON public."users";
CREATE POLICY "users_insert_admin" ON public."users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (has_role(ARRAY['admin'::user_role]));
DROP POLICY IF EXISTS "users_select_self_or_active_or_admin" ON public."users";
CREATE POLICY "users_select_self_or_active_or_admin" ON public."users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((id = auth.uid()) OR (is_active = true) OR has_role(ARRAY['admin'::user_role])));
DROP POLICY IF EXISTS "users_update_self_or_admin" ON public."users";
CREATE POLICY "users_update_self_or_admin" ON public."users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((id = auth.uid()) OR has_role(ARRAY['admin'::user_role]))) WITH CHECK (((id = auth.uid()) OR has_role(ARRAY['admin'::user_role])));

-- Grants
GRANT DELETE ON TABLE public."billing_reversal_requests" TO "service_role";
GRANT INSERT ON TABLE public."billing_reversal_requests" TO "service_role";
GRANT REFERENCES ON TABLE public."billing_reversal_requests" TO "service_role";
GRANT SELECT ON TABLE public."billing_reversal_requests" TO "service_role";
GRANT TRIGGER ON TABLE public."billing_reversal_requests" TO "service_role";
GRANT TRUNCATE ON TABLE public."billing_reversal_requests" TO "service_role";
GRANT UPDATE ON TABLE public."billing_reversal_requests" TO "service_role";
GRANT DELETE ON TABLE public."brands" TO "authenticated";
GRANT INSERT ON TABLE public."brands" TO "authenticated";
GRANT SELECT ON TABLE public."brands" TO "authenticated";
GRANT UPDATE ON TABLE public."brands" TO "authenticated";
GRANT DELETE ON TABLE public."brands" TO "service_role";
GRANT INSERT ON TABLE public."brands" TO "service_role";
GRANT REFERENCES ON TABLE public."brands" TO "service_role";
GRANT SELECT ON TABLE public."brands" TO "service_role";
GRANT TRIGGER ON TABLE public."brands" TO "service_role";
GRANT TRUNCATE ON TABLE public."brands" TO "service_role";
GRANT UPDATE ON TABLE public."brands" TO "service_role";
GRANT DELETE ON TABLE public."collections" TO "authenticated";
GRANT INSERT ON TABLE public."collections" TO "authenticated";
GRANT SELECT ON TABLE public."collections" TO "authenticated";
GRANT UPDATE ON TABLE public."collections" TO "authenticated";
GRANT DELETE ON TABLE public."collections" TO "service_role";
GRANT INSERT ON TABLE public."collections" TO "service_role";
GRANT REFERENCES ON TABLE public."collections" TO "service_role";
GRANT SELECT ON TABLE public."collections" TO "service_role";
GRANT TRIGGER ON TABLE public."collections" TO "service_role";
GRANT TRUNCATE ON TABLE public."collections" TO "service_role";
GRANT UPDATE ON TABLE public."collections" TO "service_role";
GRANT DELETE ON TABLE public."customers" TO "authenticated";
GRANT INSERT ON TABLE public."customers" TO "authenticated";
GRANT SELECT ON TABLE public."customers" TO "authenticated";
GRANT UPDATE ON TABLE public."customers" TO "authenticated";
GRANT DELETE ON TABLE public."customers" TO "service_role";
GRANT INSERT ON TABLE public."customers" TO "service_role";
GRANT REFERENCES ON TABLE public."customers" TO "service_role";
GRANT SELECT ON TABLE public."customers" TO "service_role";
GRANT TRIGGER ON TABLE public."customers" TO "service_role";
GRANT TRUNCATE ON TABLE public."customers" TO "service_role";
GRANT UPDATE ON TABLE public."customers" TO "service_role";
GRANT INSERT ON TABLE public."data_recovery_events" TO "authenticated";
GRANT SELECT ON TABLE public."data_recovery_events" TO "authenticated";
GRANT DELETE ON TABLE public."data_recovery_events" TO "service_role";
GRANT INSERT ON TABLE public."data_recovery_events" TO "service_role";
GRANT REFERENCES ON TABLE public."data_recovery_events" TO "service_role";
GRANT SELECT ON TABLE public."data_recovery_events" TO "service_role";
GRANT TRIGGER ON TABLE public."data_recovery_events" TO "service_role";
GRANT TRUNCATE ON TABLE public."data_recovery_events" TO "service_role";
GRANT UPDATE ON TABLE public."data_recovery_events" TO "service_role";
GRANT DELETE ON TABLE public."deliveries" TO "authenticated";
GRANT INSERT ON TABLE public."deliveries" TO "authenticated";
GRANT SELECT ON TABLE public."deliveries" TO "authenticated";
GRANT UPDATE ON TABLE public."deliveries" TO "authenticated";
GRANT DELETE ON TABLE public."deliveries" TO "service_role";
GRANT INSERT ON TABLE public."deliveries" TO "service_role";
GRANT REFERENCES ON TABLE public."deliveries" TO "service_role";
GRANT SELECT ON TABLE public."deliveries" TO "service_role";
GRANT TRIGGER ON TABLE public."deliveries" TO "service_role";
GRANT TRUNCATE ON TABLE public."deliveries" TO "service_role";
GRANT UPDATE ON TABLE public."deliveries" TO "service_role";
GRANT DELETE ON TABLE public."delivery_agents" TO "authenticated";
GRANT INSERT ON TABLE public."delivery_agents" TO "authenticated";
GRANT SELECT ON TABLE public."delivery_agents" TO "authenticated";
GRANT UPDATE ON TABLE public."delivery_agents" TO "authenticated";
GRANT DELETE ON TABLE public."delivery_agents" TO "service_role";
GRANT INSERT ON TABLE public."delivery_agents" TO "service_role";
GRANT REFERENCES ON TABLE public."delivery_agents" TO "service_role";
GRANT SELECT ON TABLE public."delivery_agents" TO "service_role";
GRANT TRIGGER ON TABLE public."delivery_agents" TO "service_role";
GRANT TRUNCATE ON TABLE public."delivery_agents" TO "service_role";
GRANT UPDATE ON TABLE public."delivery_agents" TO "service_role";
GRANT DELETE ON TABLE public."grn" TO "authenticated";
GRANT INSERT ON TABLE public."grn" TO "authenticated";
GRANT SELECT ON TABLE public."grn" TO "authenticated";
GRANT UPDATE ON TABLE public."grn" TO "authenticated";
GRANT DELETE ON TABLE public."grn" TO "service_role";
GRANT INSERT ON TABLE public."grn" TO "service_role";
GRANT REFERENCES ON TABLE public."grn" TO "service_role";
GRANT SELECT ON TABLE public."grn" TO "service_role";
GRANT TRIGGER ON TABLE public."grn" TO "service_role";
GRANT TRUNCATE ON TABLE public."grn" TO "service_role";
GRANT UPDATE ON TABLE public."grn" TO "service_role";
GRANT DELETE ON TABLE public."grn_items" TO "authenticated";
GRANT INSERT ON TABLE public."grn_items" TO "authenticated";
GRANT SELECT ON TABLE public."grn_items" TO "authenticated";
GRANT UPDATE ON TABLE public."grn_items" TO "authenticated";
GRANT DELETE ON TABLE public."grn_items" TO "service_role";
GRANT INSERT ON TABLE public."grn_items" TO "service_role";
GRANT REFERENCES ON TABLE public."grn_items" TO "service_role";
GRANT SELECT ON TABLE public."grn_items" TO "service_role";
GRANT TRIGGER ON TABLE public."grn_items" TO "service_role";
GRANT TRUNCATE ON TABLE public."grn_items" TO "service_role";
GRANT UPDATE ON TABLE public."grn_items" TO "service_role";
GRANT DELETE ON TABLE public."order_items" TO "authenticated";
GRANT INSERT ON TABLE public."order_items" TO "authenticated";
GRANT SELECT ON TABLE public."order_items" TO "authenticated";
GRANT UPDATE ON TABLE public."order_items" TO "authenticated";
GRANT DELETE ON TABLE public."order_items" TO "service_role";
GRANT INSERT ON TABLE public."order_items" TO "service_role";
GRANT REFERENCES ON TABLE public."order_items" TO "service_role";
GRANT SELECT ON TABLE public."order_items" TO "service_role";
GRANT TRIGGER ON TABLE public."order_items" TO "service_role";
GRANT TRUNCATE ON TABLE public."order_items" TO "service_role";
GRANT UPDATE ON TABLE public."order_items" TO "service_role";
GRANT DELETE ON TABLE public."orders" TO "authenticated";
GRANT INSERT ON TABLE public."orders" TO "authenticated";
GRANT SELECT ON TABLE public."orders" TO "authenticated";
GRANT UPDATE ON TABLE public."orders" TO "authenticated";
GRANT DELETE ON TABLE public."orders" TO "service_role";
GRANT INSERT ON TABLE public."orders" TO "service_role";
GRANT REFERENCES ON TABLE public."orders" TO "service_role";
GRANT SELECT ON TABLE public."orders" TO "service_role";
GRANT TRIGGER ON TABLE public."orders" TO "service_role";
GRANT TRUNCATE ON TABLE public."orders" TO "service_role";
GRANT UPDATE ON TABLE public."orders" TO "service_role";
GRANT DELETE ON TABLE public."po_items" TO "authenticated";
GRANT INSERT ON TABLE public."po_items" TO "authenticated";
GRANT SELECT ON TABLE public."po_items" TO "authenticated";
GRANT UPDATE ON TABLE public."po_items" TO "authenticated";
GRANT DELETE ON TABLE public."po_items" TO "service_role";
GRANT INSERT ON TABLE public."po_items" TO "service_role";
GRANT REFERENCES ON TABLE public."po_items" TO "service_role";
GRANT SELECT ON TABLE public."po_items" TO "service_role";
GRANT TRIGGER ON TABLE public."po_items" TO "service_role";
GRANT TRUNCATE ON TABLE public."po_items" TO "service_role";
GRANT UPDATE ON TABLE public."po_items" TO "service_role";
GRANT DELETE ON TABLE public."product_stock_locations" TO "authenticated";
GRANT INSERT ON TABLE public."product_stock_locations" TO "authenticated";
GRANT SELECT ON TABLE public."product_stock_locations" TO "authenticated";
GRANT UPDATE ON TABLE public."product_stock_locations" TO "authenticated";
GRANT DELETE ON TABLE public."product_stock_locations" TO "service_role";
GRANT INSERT ON TABLE public."product_stock_locations" TO "service_role";
GRANT REFERENCES ON TABLE public."product_stock_locations" TO "service_role";
GRANT SELECT ON TABLE public."product_stock_locations" TO "service_role";
GRANT TRIGGER ON TABLE public."product_stock_locations" TO "service_role";
GRANT TRUNCATE ON TABLE public."product_stock_locations" TO "service_role";
GRANT UPDATE ON TABLE public."product_stock_locations" TO "service_role";
GRANT SELECT ON TABLE public."product_stock_summary" TO "authenticated";
GRANT DELETE ON TABLE public."product_stock_summary" TO "service_role";
GRANT INSERT ON TABLE public."product_stock_summary" TO "service_role";
GRANT REFERENCES ON TABLE public."product_stock_summary" TO "service_role";
GRANT SELECT ON TABLE public."product_stock_summary" TO "service_role";
GRANT TRIGGER ON TABLE public."product_stock_summary" TO "service_role";
GRANT TRUNCATE ON TABLE public."product_stock_summary" TO "service_role";
GRANT UPDATE ON TABLE public."product_stock_summary" TO "service_role";
GRANT DELETE ON TABLE public."products" TO "authenticated";
GRANT INSERT ON TABLE public."products" TO "authenticated";
GRANT SELECT ON TABLE public."products" TO "authenticated";
GRANT UPDATE ON TABLE public."products" TO "authenticated";
GRANT DELETE ON TABLE public."products" TO "service_role";
GRANT INSERT ON TABLE public."products" TO "service_role";
GRANT REFERENCES ON TABLE public."products" TO "service_role";
GRANT SELECT ON TABLE public."products" TO "service_role";
GRANT TRIGGER ON TABLE public."products" TO "service_role";
GRANT TRUNCATE ON TABLE public."products" TO "service_role";
GRANT UPDATE ON TABLE public."products" TO "service_role";
GRANT DELETE ON TABLE public."purchase_orders" TO "authenticated";
GRANT INSERT ON TABLE public."purchase_orders" TO "authenticated";
GRANT SELECT ON TABLE public."purchase_orders" TO "authenticated";
GRANT UPDATE ON TABLE public."purchase_orders" TO "authenticated";
GRANT DELETE ON TABLE public."purchase_orders" TO "service_role";
GRANT INSERT ON TABLE public."purchase_orders" TO "service_role";
GRANT REFERENCES ON TABLE public."purchase_orders" TO "service_role";
GRANT SELECT ON TABLE public."purchase_orders" TO "service_role";
GRANT TRIGGER ON TABLE public."purchase_orders" TO "service_role";
GRANT TRUNCATE ON TABLE public."purchase_orders" TO "service_role";
GRANT UPDATE ON TABLE public."purchase_orders" TO "service_role";
GRANT DELETE ON TABLE public."receipts" TO "authenticated";
GRANT INSERT ON TABLE public."receipts" TO "authenticated";
GRANT SELECT ON TABLE public."receipts" TO "authenticated";
GRANT UPDATE ON TABLE public."receipts" TO "authenticated";
GRANT DELETE ON TABLE public."receipts" TO "service_role";
GRANT INSERT ON TABLE public."receipts" TO "service_role";
GRANT REFERENCES ON TABLE public."receipts" TO "service_role";
GRANT SELECT ON TABLE public."receipts" TO "service_role";
GRANT TRIGGER ON TABLE public."receipts" TO "service_role";
GRANT TRUNCATE ON TABLE public."receipts" TO "service_role";
GRANT UPDATE ON TABLE public."receipts" TO "service_role";
GRANT DELETE ON TABLE public."rpc_idempotency_keys" TO "service_role";
GRANT INSERT ON TABLE public."rpc_idempotency_keys" TO "service_role";
GRANT REFERENCES ON TABLE public."rpc_idempotency_keys" TO "service_role";
GRANT SELECT ON TABLE public."rpc_idempotency_keys" TO "service_role";
GRANT TRIGGER ON TABLE public."rpc_idempotency_keys" TO "service_role";
GRANT TRUNCATE ON TABLE public."rpc_idempotency_keys" TO "service_role";
GRANT UPDATE ON TABLE public."rpc_idempotency_keys" TO "service_role";
GRANT DELETE ON TABLE public."settings" TO "authenticated";
GRANT INSERT ON TABLE public."settings" TO "authenticated";
GRANT REFERENCES ON TABLE public."settings" TO "authenticated";
GRANT SELECT ON TABLE public."settings" TO "authenticated";
GRANT TRIGGER ON TABLE public."settings" TO "authenticated";
GRANT TRUNCATE ON TABLE public."settings" TO "authenticated";
GRANT UPDATE ON TABLE public."settings" TO "authenticated";
GRANT DELETE ON TABLE public."settings" TO "service_role";
GRANT INSERT ON TABLE public."settings" TO "service_role";
GRANT REFERENCES ON TABLE public."settings" TO "service_role";
GRANT SELECT ON TABLE public."settings" TO "service_role";
GRANT TRIGGER ON TABLE public."settings" TO "service_role";
GRANT TRUNCATE ON TABLE public."settings" TO "service_role";
GRANT UPDATE ON TABLE public."settings" TO "service_role";
GRANT DELETE ON TABLE public."stock_adjustments" TO "authenticated";
GRANT INSERT ON TABLE public."stock_adjustments" TO "authenticated";
GRANT SELECT ON TABLE public."stock_adjustments" TO "authenticated";
GRANT UPDATE ON TABLE public."stock_adjustments" TO "authenticated";
GRANT DELETE ON TABLE public."stock_adjustments" TO "service_role";
GRANT INSERT ON TABLE public."stock_adjustments" TO "service_role";
GRANT REFERENCES ON TABLE public."stock_adjustments" TO "service_role";
GRANT SELECT ON TABLE public."stock_adjustments" TO "service_role";
GRANT TRIGGER ON TABLE public."stock_adjustments" TO "service_role";
GRANT TRUNCATE ON TABLE public."stock_adjustments" TO "service_role";
GRANT UPDATE ON TABLE public."stock_adjustments" TO "service_role";
GRANT DELETE ON TABLE public."stock_movements" TO "authenticated";
GRANT INSERT ON TABLE public."stock_movements" TO "authenticated";
GRANT SELECT ON TABLE public."stock_movements" TO "authenticated";
GRANT UPDATE ON TABLE public."stock_movements" TO "authenticated";
GRANT DELETE ON TABLE public."stock_movements" TO "service_role";
GRANT INSERT ON TABLE public."stock_movements" TO "service_role";
GRANT REFERENCES ON TABLE public."stock_movements" TO "service_role";
GRANT SELECT ON TABLE public."stock_movements" TO "service_role";
GRANT TRIGGER ON TABLE public."stock_movements" TO "service_role";
GRANT TRUNCATE ON TABLE public."stock_movements" TO "service_role";
GRANT UPDATE ON TABLE public."stock_movements" TO "service_role";
GRANT DELETE ON TABLE public."stock_transfers" TO "authenticated";
GRANT INSERT ON TABLE public."stock_transfers" TO "authenticated";
GRANT SELECT ON TABLE public."stock_transfers" TO "authenticated";
GRANT UPDATE ON TABLE public."stock_transfers" TO "authenticated";
GRANT DELETE ON TABLE public."stock_transfers" TO "service_role";
GRANT INSERT ON TABLE public."stock_transfers" TO "service_role";
GRANT REFERENCES ON TABLE public."stock_transfers" TO "service_role";
GRANT SELECT ON TABLE public."stock_transfers" TO "service_role";
GRANT TRIGGER ON TABLE public."stock_transfers" TO "service_role";
GRANT TRUNCATE ON TABLE public."stock_transfers" TO "service_role";
GRANT UPDATE ON TABLE public."stock_transfers" TO "service_role";
GRANT DELETE ON TABLE public."suppliers" TO "authenticated";
GRANT INSERT ON TABLE public."suppliers" TO "authenticated";
GRANT SELECT ON TABLE public."suppliers" TO "authenticated";
GRANT UPDATE ON TABLE public."suppliers" TO "authenticated";
GRANT DELETE ON TABLE public."suppliers" TO "service_role";
GRANT INSERT ON TABLE public."suppliers" TO "service_role";
GRANT REFERENCES ON TABLE public."suppliers" TO "service_role";
GRANT SELECT ON TABLE public."suppliers" TO "service_role";
GRANT TRIGGER ON TABLE public."suppliers" TO "service_role";
GRANT TRUNCATE ON TABLE public."suppliers" TO "service_role";
GRANT UPDATE ON TABLE public."suppliers" TO "service_role";
GRANT DELETE ON TABLE public."users" TO "authenticated";
GRANT INSERT ON TABLE public."users" TO "authenticated";
GRANT SELECT ON TABLE public."users" TO "authenticated";
GRANT UPDATE ON TABLE public."users" TO "authenticated";
GRANT DELETE ON TABLE public."users" TO "service_role";
GRANT INSERT ON TABLE public."users" TO "service_role";
GRANT REFERENCES ON TABLE public."users" TO "service_role";
GRANT SELECT ON TABLE public."users" TO "service_role";
GRANT TRIGGER ON TABLE public."users" TO "service_role";
GRANT TRUNCATE ON TABLE public."users" TO "service_role";
GRANT UPDATE ON TABLE public."users" TO "service_role";

COMMIT;
