import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');

// Migration targets list — paths relative to docs/. Historical migrations live
// in deprecated/ now; current-cycle migrations live in applied/.
const migrationTargets = [
  'deprecated/SECURITY_TRANSACTION_HARDENING.sql',
  'deprecated/RPC_IDEMPOTENCY_WRAPPERS.sql',
  'deprecated/COMPANY_PROFILE_SETTINGS_MIGRATION.sql',
  'deprecated/BILLING_REVERSAL_WORKFLOW.sql',
  'deprecated/SAFE_RECOVERY_AND_AUDIT_MIGRATION.sql',
  'applied/INVOICE_NUMBER_SEQUENCES.sql',
  'applied/P2_TAX_SCHEMA_EXTENSIONS.sql',
  'applied/AUDIT_TRAIL.sql',
  'applied/DELIVERY_ITEMS.sql',
  'applied/PURCHASE_RETURNS.sql',
  'applied/RLS_AUDIT.sql',
];

const prohibitedPatterns = [
  {
    name: 'Permissive RLS USING(true)',
    regex: /USING\s*\(\s*true\s*\)/i,
  },
  {
    name: 'Permissive RLS WITH CHECK(true)',
    regex: /WITH\s+CHECK\s*\(\s*true\s*\)/i,
  },
  {
    name: 'Disable row level security',
    regex: /ALTER\s+TABLE\s+[^;]+\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/i,
  },
  {
    name: 'Anon users table read grant',
    regex: /GRANT\s+SELECT\s+ON\s+users\s+TO\s+anon/i,
  },
];

const sqlFiles = migrationTargets;

for (const fileName of migrationTargets) {
  const fullPath = path.join(docsDir, fileName);
  const exists = await fs.access(fullPath).then(() => true).catch(() => false);
  if (!exists) {
    console.error(`Missing required migration: docs/${fileName}`);
    process.exit(1);
  }
}

const violations = [];

// Only scan applied/ for forbidden patterns. deprecated/ may legitimately
// contain historical references; live policy is checked separately by
// security-smoke-test against pg_policies via MCP / advisor APIs.
const scanTargets = migrationTargets.filter((p) => p.startsWith('applied/'));

for (const fileName of scanTargets) {
  const fullPath = path.join(docsDir, fileName);
  const text = await fs.readFile(fullPath, 'utf8');

  for (const pattern of prohibitedPatterns) {
    if (pattern.regex.test(text)) {
      violations.push(`${fileName}: ${pattern.name}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Migration security validation failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Migration security validation passed (${sqlFiles.length} SQL files checked).`);
