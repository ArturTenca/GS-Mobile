// Automated design-rule gate. Run: node scripts/check-ui-rules.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcDir = join(root, 'src');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const HEX = /#[0-9a-fA-F]{6}\b/;
const SUPABASE_IMPORT = /from\s+['"]@\/lib\/supabase['"]/;
const violations = [];

for (const file of walk(srcDir)) {
  const rel = relative(root, file).split(sep).join('/');
  const isTest = /\.test\.(ts|tsx)$/.test(rel);
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);

  const hexAllowed = rel === 'src/theme/tokens.ts' || rel === 'src/theme/tokens.test.ts';
  const uiLayer =
    rel.startsWith('src/components/ui/') ||
    (rel.startsWith('src/components/layout/') && rel !== 'src/components/layout/DatabaseGate.tsx') ||
    rel.startsWith('src/app/');

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (!hexAllowed && HEX.test(line)) violations.push(`${at} hex color literal outside tokens`);
    if (!isTest && /fontWeight/.test(line)) violations.push(`${at} fontWeight is not allowed (use font family)`);
    if (!isTest && /Alert\.alert\(|window\.confirm\(/.test(line)) violations.push(`${at} use ConfirmDialog instead of Alert.alert/window.confirm`);
    if (/className\s*=/.test(line)) violations.push(`${at} className is not allowed`);
    if (uiLayer && SUPABASE_IMPORT.test(line)) {
      const authScreen = rel === 'src/app/(auth)/index.tsx' && /\{\s*isSupabaseConfigured\s*\}/.test(line);
      const resetScreen = rel === 'src/app/reset-password.tsx';
      if (!authScreen && !resetScreen) violations.push(`${at} UI layer must not import @/lib/supabase`);
    }
  });
}

if (violations.length > 0) {
  console.error(`UI rules: ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log('UI rules: OK');
