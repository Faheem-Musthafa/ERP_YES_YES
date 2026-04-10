import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
  'docs/SECURITY_TRANSACTION_HARDENING.sql',
  'vercel.json',
  'src/app/supabase.ts',
  '.github/workflows/ci.yml',
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  const exists = await fs.access(fullPath).then(() => true).catch(() => false);
  if (!exists) {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
}

const fixAllPath = path.join(root, 'docs/FIX_ALL_TABLES_RLS.sql');
const fix403Path = path.join(root, 'docs/FIX_403_ERROR.sql');

const fixAllText = await fs.readFile(fixAllPath, 'utf8');
const fix403Text = await fs.readFile(fix403Path, 'utf8');

if (!/DEPRECATED SCRIPT - DO NOT RUN/i.test(fixAllText)) {
  console.error('docs/FIX_ALL_TABLES_RLS.sql must stay deprecated');
  process.exit(1);
}

if (!/DEPRECATED SCRIPT - DO NOT RUN/i.test(fix403Text)) {
  console.error('docs/FIX_403_ERROR.sql must stay deprecated');
  process.exit(1);
}

const vercelText = await fs.readFile(path.join(root, 'vercel.json'), 'utf8');
if (!/Content-Security-Policy/i.test(vercelText)) {
  console.error('vercel.json must include Content-Security-Policy header');
  process.exit(1);
}

console.log('Security smoke test passed.');
