// Confere que cada linha (nao comentario) de uma migration aparece literalmente em setup_completo.sql.
// Uso: node scripts/verify-setup-sql.mjs 010
import { readdirSync, readFileSync } from 'node:fs';

const prefix = process.argv[2];
if (!prefix) {
  console.error('Uso: node scripts/verify-setup-sql.mjs <prefixo, ex. 010>');
  process.exit(2);
}

const file = readdirSync('supabase/migrations').find((f) => f.startsWith(`${prefix}_`) && f.endsWith('.sql'));
if (!file) {
  console.error(`Migration ${prefix}_*.sql nao encontrada`);
  process.exit(2);
}

const setupLines = readFileSync('supabase/setup_completo.sql', 'utf8').split('\n').map((l) => l.replace(/\s+$/, ''));
const present = new Set(setupLines);
const wanted = readFileSync(`supabase/migrations/${file}`, 'utf8')
  .split('\n')
  .map((l) => l.replace(/\s+$/, ''))
  .filter((l) => l.trim() !== '' && !l.trimStart().startsWith('--'));

const missing = wanted.filter((l) => !present.has(l));
console.log(`${file}: ${wanted.length} linhas conferidas, ${missing.length} ausentes`);
if (missing.length > 0) {
  for (const l of missing.slice(0, 5)) console.log(`  ausente: ${l}`);
  process.exit(1);
}

const marker = setupLines.findIndex((l) => l.includes(file));
const commits = setupLines.slice(marker).filter((l) => l === 'commit;').length;
if (marker < 0 || commits !== 1) {
  console.error(`Esperado exatamente 1 'commit;' apos o marcador de ${file}; encontrado ${commits}`);
  process.exit(1);
}
console.log('OK: 1 commit; apos o marcador');
