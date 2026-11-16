// Scanner de PII do repositorio e dos seeds SQL (Fase 04.2, D-03).
// Uso: node scripts/pii-scan.mjs [--out dir] [--fail-on-critical] [--self-test]
// Nunca imprime segredos: so mostra file:line:regra:categoria:severidade e a
// previa ja mascarada pelo motor, jamais o trecho original.
// Requer Node >= 22.18 (importa o motor TypeScript por type stripping nativo).

import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let engine;
let fixtures;
try {
  engine = await import('../src/security/pii/engine.ts');
  fixtures = await import('../src/security/pii/fixtures.ts');
} catch {
  console.error('Nao foi possivel carregar o motor de PII (src/security/pii/engine.ts).');
  console.error('Use Node >= 22.18 (type stripping nativo) / Use Node >= 22.18 for native type stripping.');
  process.exit(2);
}
const { scan } = engine;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const MAX_BYTES = 2 * 1024 * 1024;
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.ttf', '.otf', '.woff', '.woff2',
  '.mp4', '.mov', '.webm', '.mp3', '.wav', '.keystore', '.jks', '.lock',
]);
const SEED_FILES = ['supabase/migrations/003_demo_farm.sql', 'supabase/migrations/007_demo_dataset.sql'];
const REPORT_PREFIX = 'docs/seguranca/pii-scan-report.';

function skipPath(rel) {
  return (
    rel.startsWith('.planning/') ||
    rel.startsWith('node_modules') ||
    rel.startsWith(REPORT_PREFIX) ||
    rel === 'package-lock.json' ||
    BINARY_EXT.has(extname(rel).toLowerCase())
  );
}

function listFiles() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return [...new Set(out.split('\0').filter(Boolean))].filter((rel) => !skipPath(rel));
}

function readText(rel) {
  const full = join(root, rel);
  let st;
  try {
    st = lstatSync(full);
  } catch {
    return null;
  }
  if (!st.isFile() || st.size > MAX_BYTES) return null;
  const buf = readFileSync(full);
  if (buf.includes(0)) return null;
  return buf.toString('utf8');
}

function loadAllowlist() {
  try {
    const parsed = JSON.parse(readFileSync(join(root, 'scripts/pii-scan-allowlist.json'), 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.file && e.ruleId && e.reason) : [];
  } catch {
    return [];
  }
}

function selfTest() {
  const rng = fixtures.makeRng(42);
  const cpf = fixtures.makeCpf(rng);
  const email = fixtures.fakeEmail();
  const jwt = fixtures.fakeJwt();
  const sample = `cpf ${fixtures.formatCpf(cpf)} mail ${email} tok ${jwt}`;
  const found = scan(sample);
  const has = (id) => found.some((f) => f.ruleId === id);
  const checks = [
    ['detecta CPF valido', has('cpf')],
    ['detecta e-mail', has('email')],
    ['detecta JWT', has('jwt')],
    ['nao acusa texto do app', scan('Há 80% de chance de chuva forte e 23,5 C').length === 0],
    [
      'previas nao contem valor bruto',
      !JSON.stringify(found).includes(cpf) &&
        !JSON.stringify(found).includes(email) &&
        !JSON.stringify(found).includes(jwt.slice(0, 24)),
    ],
  ];
  let ok = true;
  for (const [label, pass] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
    if (!pass) ok = false;
  }
  process.exit(ok ? 0 : 1);
}

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function mdTable(title, record) {
  const rows = Object.entries(record).sort((a, b) => b[1] - a[1]);
  const body = rows.length ? rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n') : '| (nenhum) | 0 |';
  return `### ${title}\n\n| Item | Achados |\n| --- | ---: |\n${body}\n`;
}

function run() {
  const allowlist = loadAllowlist();
  const files = listFiles();
  const findings = [];
  let scanned = 0;

  for (const rel of files) {
    const text = readText(rel);
    if (text === null) continue;
    scanned += 1;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].length === 0) continue;
      for (const f of scan(lines[i])) {
        const informational = f.ruleId === 'supabase_publishable' || rel.endsWith('.env.example');
        findings.push({
          file: rel,
          line: i + 1,
          ruleId: f.ruleId,
          category: f.category,
          severity: f.severity,
          preview: f.preview,
          informational,
        });
      }
    }
  }

  const real = findings.filter((f) => !f.informational);
  const byCategory = {};
  const bySeverity = {};
  const byFile = {};
  for (const f of real) {
    bump(byCategory, f.category);
    bump(bySeverity, f.severity);
    bump(byFile, f.file);
  }

  const isAllowed = (f) => allowlist.some((a) => a.file === f.file && a.ruleId === f.ruleId);
  const criticalOpen = real.filter((f) => f.severity === 'critical' && !isAllowed(f));

  const seed = SEED_FILES.map((file) => {
    const list = real.filter((f) => f.file === file);
    const bySev = {};
    for (const f of list) bump(bySev, f.severity);
    return { file, total: list.length, bySeverity: bySev, critical: list.filter((f) => f.severity === 'critical').length };
  });

  const report = {
    summary: {
      generatedAt: new Date().toISOString(),
      filesScanned: scanned,
      totalFindings: real.length,
      informationalFindings: findings.length - real.length,
      criticalNotAllowlisted: criticalOpen.length,
      byCategory,
      bySeverity,
    },
    seed,
    byFile,
    findings: real.map(({ informational: _i, ...rest }) => rest),
  };

  const outDir = resolve(root, opt('--out', 'docs/seguranca'));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'pii-scan-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    '# Relatorio do scanner de PII',
    '',
    `Gerado em ${report.summary.generatedAt}. Arquivos varridos: ${scanned}. Achados: ${real.length}` +
      ` (informativos: ${report.summary.informationalFindings}). Criticos fora da allowlist: ${criticalOpen.length}.`,
    '',
    'Este relatorio mostra apenas arquivo, linha, regra e previa mascarada. Nenhum valor original e gravado.',
    '',
    mdTable('Por categoria', byCategory),
    mdTable('Por severidade', bySeverity),
    mdTable('Por arquivo', byFile),
    '### Seeds de demonstracao',
    '',
    '| Arquivo | Achados | Criticos |',
    '| --- | ---: | ---: |',
    ...seed.map((s) => `| ${s.file} | ${s.total} | ${s.critical} |`),
    '',
  ].join('\n');
  writeFileSync(join(outDir, 'pii-scan-report.md'), md);

  for (const f of real) {
    console.log(`${f.file}:${f.line}:${f.ruleId}:${f.category}:${f.severity}:${f.preview}`);
  }
  console.log(
    `Resumo: ${scanned} arquivos, ${real.length} achados, ${criticalOpen.length} criticos fora da allowlist.`,
  );
  for (const s of seed) console.log(`Seed ${s.file}: ${s.total} achados, ${s.critical} criticos`);

  if (flag('--fail-on-critical') && criticalOpen.length > 0) {
    console.error('FAIL: ha achados criticos fora da allowlist.');
    process.exit(1);
  }
}

if (flag('--self-test')) selfTest();
else run();
