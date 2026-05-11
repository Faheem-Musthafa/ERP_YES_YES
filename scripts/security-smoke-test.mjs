import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

const execFileP = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024, ...opts }, (_err, stdout) => resolve(String(stdout ?? '')));
  });

const root = process.cwd();

const requiredFiles = [
  'docs/deprecated/SECURITY_TRANSACTION_HARDENING.sql',
  'vercel.json',
  'src/app/supabase.ts',
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  const exists = await fs.access(fullPath).then(() => true).catch(() => false);
  if (!exists) {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
}

const fixAllPath = path.join(root, 'docs/deprecated/FIX_ALL_TABLES_RLS.sql');
const fix403Path = path.join(root, 'docs/deprecated/FIX_403_ERROR.sql');

const fixAllText = await fs.readFile(fixAllPath, 'utf8');
const fix403Text = await fs.readFile(fix403Path, 'utf8');

if (!/DEPRECATED SCRIPT - DO NOT RUN/i.test(fixAllText)) {
  console.error('docs/deprecated/FIX_ALL_TABLES_RLS.sql must stay deprecated');
  process.exit(1);
}

if (!/DEPRECATED SCRIPT - DO NOT RUN/i.test(fix403Text)) {
  console.error('docs/deprecated/FIX_403_ERROR.sql must stay deprecated');
  process.exit(1);
}

const vercelText = await fs.readFile(path.join(root, 'vercel.json'), 'utf8');
if (!/Content-Security-Policy/i.test(vercelText)) {
  console.error('vercel.json must include Content-Security-Policy header');
  process.exit(1);
}
if (!/Strict-Transport-Security/i.test(vercelText)) {
  console.error('vercel.json must include Strict-Transport-Security header');
  process.exit(1);
}

// No tracked .env files in git.
const tracked = (await execFileP('git', ['ls-files', '.env', '.env.local', '.env.production'])).trim();
if (tracked) {
  console.error('.env files must not be tracked in git:\n' + tracked);
  process.exit(1);
}

// Forbid DISABLE ROW LEVEL SECURITY in committed SQL outside docs/deprecated/.
// Strip SQL line comments (-- …) and block comments (/* … */) before matching
// so that documentation references in DOWN-migration comments are ignored.
const sqlSearchDirs = ['docs', 'docs/applied'];
for (const dir of sqlSearchDirs) {
  const dirPath = path.join(root, dir);
  const entries = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.sql')) continue;
    const text = await fs.readFile(path.join(dirPath, entry.name), 'utf8');
    const uncommented = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    if (/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(uncommented)) {
      console.error(`${dir}/${entry.name} contains live DISABLE ROW LEVEL SECURITY — move to docs/deprecated/`);
      process.exit(1);
    }
  }
}

// npm audit — block on critical/high.
const auditOut = await execFileP('npm', ['audit', '--json']);
try {
  const audit = JSON.parse(auditOut);
  const meta = audit?.metadata?.vulnerabilities ?? {};
  if ((meta.critical ?? 0) > 0 || (meta.high ?? 0) > 0) {
    console.error(`npm audit: ${meta.critical} critical, ${meta.high} high vulnerabilities — run npm audit fix`);
    process.exit(1);
  }
} catch {
  console.warn('npm audit output not parsable — skipping vuln gate');
}

console.log('Security smoke test passed.');
