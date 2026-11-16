// Auditoria estatica de taint do app (Fase 04.2, D-05).
// Uso: node scripts/taint-audit.mjs [--self-test] [--fail-on-unsafe] [--with-tests]
//        [--file caminho.ts] [--out dir]
// Rastreia fluxos origem -> destino em src/ com a API do compilador TypeScript e grava
// auditoria-prototipo.{json,md}. Nunca imprime valores: apenas arquivo:linha e nomes.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze, summarize } from './taint/tracer.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, fb) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : fb;
};

const FIXTURE = join(root, 'scripts/fixtures/taint-vulnerable.ts');

function readJson(rel, fallback) {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

function selfTest() {
  const { flows } = analyze({ root, files: [FIXTURE] });
  const inFn = (prefix) => flows.filter((f) => f.sink.container.startsWith(prefix));
  const leaky = inFn('leaky');
  const guarded = inFn('guarded');
  const leakyUnsafe = leaky.filter((f) => f.status === 'unsafe');
  const guardedUnsafe = guarded.filter((f) => f.status === 'unsafe');
  const kinds = new Set(leakyUnsafe.map((f) => f.sink.kind));
  const checks = [
    [`fixture vulneravel gera >= 3 fluxos unsafe (${leakyUnsafe.length})`, leakyUnsafe.length >= 3],
    ['cobre console, fetch e service_error', ['console', 'fetch', 'service_error'].every((k) => kinds.has(k))],
    [`variantes protegidas nao geram unsafe (${guarded.length} fluxos, ${guardedUnsafe.length} unsafe)`, guarded.length >= 3 && guardedUnsafe.length === 0],
  ];
  let ok = true;
  for (const [label, pass] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
    if (!pass) ok = false;
  }
  process.exit(ok ? 0 : 1);
}

function matchesBaseline(flow, baseline) {
  return baseline.some(
    (b) =>
      b.sinkFile === flow.sink.file &&
      b.sinkKind === flow.sink.kind &&
      (!b.sourceKind || b.sourceKind === flow.source.kind) &&
      typeof b.reason === 'string' &&
      b.reason.length > 10,
  );
}

function runEvidenceTests(evidence) {
  const files = [...new Set(evidence.map((e) => e.file))];
  const outDir = mkdtempSync(join(tmpdir(), 'taint-evidence-'));
  const outFile = join(outDir, 'jest.json');
  const jestBin = join(root, 'node_modules/jest/bin/jest.js');
  const cmd = existsSync(jestBin) ? process.execPath : 'npx';
  const baseArgs = existsSync(jestBin) ? [jestBin] : ['jest'];
  const res = spawnSync(cmd, [...baseArgs, ...files, '--json', `--outputFile=${outFile}`, '--silent'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  let report = null;
  try {
    report = JSON.parse(readFileSync(outFile, 'utf8'));
  } catch {
    report = null;
  }
  rmSync(outDir, { recursive: true, force: true });
  const assertions = [];
  for (const tr of report?.testResults ?? []) {
    const file = tr.name.startsWith(root) ? tr.name.slice(root.length + 1) : tr.name;
    for (const a of tr.assertionResults ?? []) assertions.push({ file, title: a.fullName, status: a.status });
  }
  return evidence.map((e) => {
    const hits = assertions.filter((a) => a.file === e.file && a.title.includes(e.test));
    const passed = hits.length > 0 && hits.every((h) => h.status === 'passed');
    return { ...e, passed, executed: hits.length, jestExit: res.status };
  });
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

function buildMarkdown(report) {
  const s = report.summary;
  const lines = [
    '# Auditoria de taint do prototipo',
    '',
    `Gerado em ${s.generatedAt}. Fluxos rastreados: ${s.flows} (bloqueados: ${s.blocked}, sanitizados: ${s.sanitized}, inseguros: ${s.unsafe}).`,
    '',
    'O rastreador estatico (`node scripts/taint-audit.mjs`) usa a API do compilador TypeScript sobre `src/`, propaga o dado da origem ate o destino e classifica cada fluxo. Valores reais nunca aparecem aqui: apenas arquivo, linha e nomes de simbolos.',
    '',
    '- **blocked**: o fluxo passa por uma guarda de sink (`guardSink`, `unwrapFor`, `assertAllowedUrl`) que bloqueia ou mascara o dado.',
    '- **sanitized**: o fluxo passa por um sanitizador (`sanitizeFreeText`, `redact`, `sanitizeCause`, `onlyDigits`, `assertCoarseCoord`...).',
    '- **unsafe**: nenhuma guarda no caminho. Deve ser zero ou estar justificado em `scripts/taint-baseline.json`.',
    '',
    '## Fluxos',
    '',
    '| Fluxo | Origem -> Destino | Controle | Status | Teste |',
    '| --- | --- | --- | --- | --- |',
    ...report.flows.map((f) => {
      const origem = `${f.source.kind} (${f.source.file}:${f.source.line})`;
      const destino = `${f.sink.kind} (${f.sink.file}:${f.sink.line})`;
      const teste = f.evidence.length ? f.evidence.map((e) => `\`${e.file}\`: ${e.test}`).join('; ') : '-';
      return `| ${f.id} | ${mdEscape(origem)} -> ${mdEscape(destino)} | ${mdEscape(f.guard ?? '(nenhum)')} | ${f.status} | ${mdEscape(teste)} |`;
    }),
    '',
    '## Em ação',
    '',
    report.evidenceRan
      ? 'Os testes abaixo foram executados com `--with-tests` e provam, com valores sintéticos, o comportamento em tempo de execução.'
      : 'Execute com `--with-tests` para rodar os testes de evidência (esta tabela lista o mapeamento).',
    '',
    '| Evidência | Teste (jest) | Resultado |',
    '| --- | --- | --- |',
    ...report.evidence.map(
      (e) => `| ${mdEscape(e.label)} | \`${e.file}\`: ${mdEscape(e.test)} | ${report.evidenceRan ? (e.passed ? `passou (${e.executed})` : 'FALHOU') : 'nao executado'} |`,
    ),
    '',
    '## Prova de detecção (fixture vulnerável)',
    '',
    `O arquivo \`scripts/fixtures/taint-vulnerable.ts\` vaza dados de propósito. O auto-teste (\`node scripts/taint-audit.mjs --self-test\`) exige pelo menos 3 fluxos inseguros nele e zero nas variantes protegidas. Resultado nesta geração: ${report.fixture.unsafe} fluxos inseguros nas funções vulneráveis, ${report.fixture.guardedUnsafe} nas protegidas.`,
    '',
    '| Fluxo da fixture | Destino | Status |',
    '| --- | --- | --- |',
    ...report.fixture.flows.map((f) => `| ${f.sink.container} | ${f.sink.kind} (linha ${f.sink.line}) | ${f.status} |`),
    '',
    '## Limitações',
    '',
    '- O rastreador segue variáveis, atribuições, templates, objetos, desestruturação, funções do app (parâmetro -> retorno e parâmetro -> sink) e `useState`. Props de JSX e estado fora de `useState` não são seguidos; o complemento são os testes de execução acima.',
    '- A lista de fontes e sinks fica em `scripts/taint/config.mjs`.',
    '',
  ];
  return lines.join('\n');
}

function run() {
  const t0 = Date.now();
  const fileOpt = opt('--file', null);
  const baseline = readJson('scripts/taint-baseline.json', []);
  const { flows, filesAnalyzed } = analyze({ root, files: fileOpt ? [resolve(root, fileOpt)] : undefined });

  let evidence = readJson('scripts/taint/evidence.json', { items: [] });
  evidence = Array.isArray(evidence) ? evidence : evidence.items;
  const ran = flag('--with-tests') ? runEvidenceTests(evidence) : evidence.map((e) => ({ ...e, passed: null, executed: 0 }));

  for (const f of flows) {
    f.evidence = evidence
      .filter((e) => e.match && (!e.match.sink || e.match.sink === f.sink.kind) && (!e.match.source || e.match.source === f.source.kind) && (!e.match.status || e.match.status === f.status))
      .map((e) => ({ file: e.file, test: e.test }));
    f.baselined = f.status === 'unsafe' && matchesBaseline(f, baseline);
  }

  const fx = analyze({ root, files: [FIXTURE] });
  const fixtureLeaky = fx.flows.filter((f) => f.sink.container.startsWith('leaky'));
  const fixtureGuarded = fx.flows.filter((f) => f.sink.container.startsWith('guarded'));

  const summary = { generatedAt: new Date().toISOString(), filesAnalyzed, ...summarize(flows) };
  const unsafeOpen = flows.filter((f) => f.status === 'unsafe' && !f.baselined);
  const report = {
    summary: { ...summary, unsafeOpen: unsafeOpen.length },
    flows,
    evidenceRan: flag('--with-tests'),
    evidence: ran,
    fixture: {
      file: 'scripts/fixtures/taint-vulnerable.ts',
      unsafe: fixtureLeaky.filter((f) => f.status === 'unsafe').length,
      guardedUnsafe: fixtureGuarded.filter((f) => f.status === 'unsafe').length,
      flows: fx.flows.map(({ sink, status }) => ({ sink, status })),
    },
  };

  const outDir = resolve(root, opt('--out', 'docs/seguranca'));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'auditoria-prototipo.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outDir, 'auditoria-prototipo.md'), buildMarkdown(report));

  for (const f of unsafeOpen) console.log(`UNSAFE ${f.id} ${f.source.kind} ${f.source.file}:${f.source.line} -> ${f.sink.kind} ${f.sink.file}:${f.sink.line}`);
  console.log(
    `Resumo: ${filesAnalyzed} arquivos, ${summary.flows} fluxos (bloqueados ${summary.blocked}, sanitizados ${summary.sanitized}, inseguros ${summary.unsafe}, fora do baseline ${unsafeOpen.length}) em ${Date.now() - t0} ms.`,
  );
  let failed = false;
  if (flag('--with-tests')) {
    const bad = ran.filter((e) => !e.passed);
    for (const e of bad) console.log(`FAIL evidencia: ${e.label} (${e.file})`);
    console.log(`Evidencias: ${ran.length - bad.length}/${ran.length} passaram.`);
    if (bad.length) failed = true;
  }
  if (flag('--fail-on-unsafe') && unsafeOpen.length > 0) {
    console.error('FAIL: ha fluxos inseguros fora do baseline.');
    failed = true;
  }
  if (failed) process.exit(1);
}

if (flag('--self-test')) selfTest();
else run();
