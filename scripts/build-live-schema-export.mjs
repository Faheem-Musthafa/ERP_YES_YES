import fs from 'node:fs';

const base =
  '/home/faheem/.config/Code/User/workspaceStorage/d0036fb2375c2f9a079af5821fdc7a0d/GitHub.copilot-chat/chat-session-resources/b5b2fb0e-dafb-483d-93d0-cfeed4c4fe5c';

function parseWrapped(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (Array.isArray(raw)) return raw;
  if (typeof raw.result === 'string') {
    const m = raw.result.match(/<untrusted-data-[^>]+>\n([\s\S]*?)\n<\/untrusted-data-/);
    if (!m) throw new Error(`Cannot parse wrapped payload: ${path}`);
    return JSON.parse(m[1]);
  }
  throw new Error(`Unsupported payload shape in ${path}`);
}

function qIdent(name) {
  return '"' + String(name).replaceAll('"', '""') + '"';
}

function addIfNotExists(indexDef) {
  return indexDef
    .replace(/^CREATE UNIQUE INDEX /, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS ');
}

function parsePgArray(text) {
  if (!text || text === '{}') return [];
  return text
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

const tableAndConstraints = parseWrapped(
  `${base}/call_qVleErBFI7uozB7aTaii8Pa9__vscode-1776355146644/content.json`,
);
const indexes = parseWrapped(
  `${base}/call_kcMCdBpKQ0y5S9LPWTMUfx78__vscode-1776355146634/content.json`,
);
const functions = parseWrapped(
  `${base}/call_m2XLc6gmNIK9KJYC656VYEiY__vscode-1776355146635/content.json`,
);
const policies = parseWrapped(
  `${base}/call_2MXMjLm2UY7t0thBVDs3ZYn4__vscode-1776355146637/content.json`,
);
const grants = parseWrapped(
  `${base}/call_B40mlusYo30X85GS60JL4bJB__vscode-1776355146638/content.json`,
);

const extensionDdls = [
  'CREATE SCHEMA IF NOT EXISTS extensions;',
  'CREATE SCHEMA IF NOT EXISTS graphql;',
  'CREATE SCHEMA IF NOT EXISTS vault;',
  'CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;',
  'CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;',
  'CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;',
  'CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;',
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;',
];

const enumDdls = [
  "DO $$ BEGIN CREATE TYPE public.collection_status_enum AS ENUM ('Pending', 'Collected', 'Overdue', 'Voided'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.company_enum AS ENUM ('LLP', 'YES YES', 'Zekon'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.delivery_status_enum AS ENUM ('Pending', 'In Transit', 'Delivered', 'Failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.grn_status_enum AS ENUM ('Pending', 'Verified', 'Completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.invoice_type_enum AS ENUM ('GST', 'NGST', 'IGST', 'Delivery Challan Out', 'Delivery Challan In', 'Stock Transfer', 'Credit Note'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.order_status_enum AS ENUM ('Pending', 'Approved', 'Rejected', 'Billed', 'Delivered'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.payment_mode_enum AS ENUM ('Cash', 'Cheque', 'UPI', 'Bank Transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.po_status_enum AS ENUM ('Draft', 'Pending', 'Approved', 'Received', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.stock_adjustment_type_enum AS ENUM ('Addition', 'Subtraction'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.supplier_status_enum AS ENUM ('Active', 'Inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
  "DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('admin', 'sales', 'accounts', 'inventory', 'procurement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
];

const sequenceDdls = [
  'CREATE SEQUENCE IF NOT EXISTS public.delivery_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;',
  'CREATE SEQUENCE IF NOT EXISTS public.grn_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;',
  'CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;',
  'CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;',
  'CREATE SEQUENCE IF NOT EXISTS public.po_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE;',
];

const triggerDdls = [
  'CREATE TRIGGER trigger_update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_delivery_agents_updated_at BEFORE UPDATE ON delivery_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_grn_updated_at BEFORE UPDATE ON grn FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_product_stock_locations_updated_at BEFORE UPDATE ON product_stock_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trigger_update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
  'CREATE TRIGGER trg_enforce_users_update_guard BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION enforce_users_update_guard();',
  'CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
];

const rlsTables = [
  'billing_reversal_requests',
  'brands',
  'collections',
  'customers',
  'data_recovery_events',
  'deliveries',
  'delivery_agents',
  'grn',
  'grn_items',
  'order_items',
  'orders',
  'po_items',
  'product_stock_locations',
  'products',
  'purchase_orders',
  'receipts',
  'rpc_idempotency_keys',
  'settings',
  'stock_adjustments',
  'stock_movements',
  'stock_transfers',
  'suppliers',
  'users',
];

const tableDdls = tableAndConstraints
  .filter((x) => x.kind === 'table')
  .map((x) => x.ddl.replaceAll('\\n', '\n'));
const constraintDdls = tableAndConstraints
  .filter((x) => x.kind === 'constraint')
  .map((x) => x.ddl);

const indexDdls = indexes.map((x) => `${addIfNotExists(x.indexdef)};`);
const functionDdls = functions.map((x) => x.definition.trim());

const policyDdls = policies.flatMap((p) => {
  const roles = parsePgArray(p.roles);
  const rolesClause = roles.length > 0 ? ` TO ${roles.map(qIdent).join(', ')}` : '';
  const qualClause = p.qual ? ` USING (${p.qual})` : '';
  const withCheckClause = p.with_check ? ` WITH CHECK (${p.with_check})` : '';
  return [
    `DROP POLICY IF EXISTS ${qIdent(p.policyname)} ON public.${qIdent(p.tablename)};`,
    `CREATE POLICY ${qIdent(p.policyname)} ON public.${qIdent(p.tablename)} AS ${p.permissive} FOR ${p.cmd}${rolesClause}${qualClause}${withCheckClause};`,
  ];
});

const grantDdls = grants.map(
  (g) => `GRANT ${g.privilege_type} ON TABLE public.${qIdent(g.table_name)} TO ${qIdent(g.grantee)};`,
);

const dropTriggerDdls = triggerDdls.map((ddl) => {
  const m = ddl.match(/^CREATE TRIGGER\s+([^\s]+)\s+BEFORE\s+UPDATE\s+ON\s+([^\s]+)\s+/i);
  if (!m) return null;
  return `DROP TRIGGER IF EXISTS ${qIdent(m[1])} ON public.${qIdent(m[2])};`;
}).filter(Boolean);

const rlsDdls = rlsTables.map((t) => `ALTER TABLE public.${qIdent(t)} ENABLE ROW LEVEL SECURITY;`);

const output = [
  '-- ============================================================================',
  '-- LIVE SUPABASE SCHEMA EXPORT (A-Z) ',
  '-- ============================================================================',
  '-- Source project: ruwkgubpowdshpucmqxc (ERP)',
  '-- Generated on: 2026-04-16',
  '-- Generated via MCP schema introspection (tables, constraints, indexes,',
  '-- functions, triggers, RLS policies, grants, enums, sequences)',
  '-- ============================================================================',
  '',
  'BEGIN;',
  '',
  '-- Schemas and extensions',
  ...extensionDdls,
  '',
  'SET search_path TO public;',
  '',
  '-- Enums',
  ...enumDdls,
  '',
  '-- Sequences',
  ...sequenceDdls,
  '',
  '-- Tables',
  ...tableDdls,
  '',
  '-- Constraints',
  ...constraintDdls,
  '',
  '-- Functions',
  ...functionDdls,
  '',
  '-- Indexes',
  ...indexDdls,
  '',
  '-- Triggers',
  ...dropTriggerDdls,
  ...triggerDdls,
  '',
  '-- Enable RLS',
  ...rlsDdls,
  '',
  '-- Policies',
  ...policyDdls,
  '',
  '-- Grants',
  ...grantDdls,
  '',
  'COMMIT;',
  '',
].join('\n');

const outPath = '/home/faheem/Development/ERP_YES_YES/docs/A_TO_Z_SCHEMA_FROM_SUPABASE_2026_04_16.sql';
fs.writeFileSync(outPath, output);
console.log(`Wrote ${outPath}`);
console.log(`Tables: ${tableDdls.length}`);
console.log(`Constraints: ${constraintDdls.length}`);
console.log(`Functions: ${functionDdls.length}`);
console.log(`Indexes: ${indexDdls.length}`);
console.log(`Policies: ${policies.length}`);
console.log(`Grants: ${grantDdls.length}`);
