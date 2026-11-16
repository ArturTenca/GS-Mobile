// Empacota o projeto em um ZIP seguro para entrega (Fase 04.2, D-12). Sem dependencias.
// Uso: node scripts/build-zip.mjs [--with-planning] [--self-test] [--check-path <caminho>]
//   --with-planning   inclui .planning/ (por padrao fica de fora)
//   --self-test       gera um zip pequeno em pasta temporaria, le o diretorio central e confere
//                     nomes e CRC32 de cada entrada
//   --check-path <p>  imprime "include" ou "exclude" para o caminho (usado nos testes)
// Nunca inclui .env*, chaves, node_modules, .git; recusa empacotar se o motor de PII achar
// credencial critica (so imprime caminhos e contagens, nunca o conteudo).
// Requer Node >= 22.18 (type stripping para importar src/security/pii/engine.ts) e zlib.crc32.

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};

const MAX_SCAN_BYTES = 2 * 1024 * 1024;
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.ttf', '.otf', '.woff', '.woff2',
  '.mp4', '.mov', '.webm', '.mp3', '.wav', '.keystore', '.jks',
]);

export function shouldInclude(path, { withPlanning = false } = {}) {
  const p = path.replace(/\\/g, '/').replace(/^\.\//, '');
  const parts = p.split('/');
  const name = parts[parts.length - 1];
  if (parts.some((seg) => seg === 'node_modules' || seg === '.git')) return false;
  if (parts[0] === 'dist-zip' || parts[0] === '.expo' || parts[0] === 'web-build') return false;
  if (!withPlanning && parts[0] === '.planning') return false;
  if (name === '.env.example') return true;
  if (name === '.env' || name.startsWith('.env.')) return false;
  if (/\.(pem|key|p8|p12|jks|keystore|mobileprovision|log)$/i.test(name)) return false;
  if (name === '.DS_Store') return false;
  return true;
}

if (flag('--check-path')) {
  console.log(shouldInclude(opt('--check-path') ?? '', { withPlanning: flag('--with-planning') }) ? 'include' : 'exclude');
  process.exit(0);
}

// ---------- escritor de ZIP ----------

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export function buildZip(entries, now = new Date()) {
  const { time, date } = dosDateTime(now);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data) >>> 0;
    const deflated = data.length > 0 ? deflateRawSync(data) : Buffer.alloc(0);
    const useDeflate = data.length > 0 && deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(((0o100644 << 16) >>> 0), 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

// Le o diretorio central e devolve [{name, crc, size}] (verificando a assinatura final).
export function readCentralDirectory(buf) {
  const eocd = buf.length - 22;
  if (buf.readUInt32LE(eocd) !== 0x06054b50) throw new Error('fim do diretorio central nao encontrado');
  const count = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) throw new Error('entrada central invalida');
    const method = buf.readUInt16LE(pos + 10);
    const crc = buf.readUInt32LE(pos + 16);
    const csize = buf.readUInt32LE(pos + 20);
    const size = buf.readUInt32LE(pos + 24);
    const nlen = buf.readUInt16LE(pos + 28);
    const xlen = buf.readUInt16LE(pos + 30);
    const clen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);
    out.push({ name: buf.toString('utf8', pos + 46, pos + 46 + nlen), crc, size, csize, method, localOffset });
    pos += 46 + nlen + xlen + clen;
  }
  return out;
}

function extractEntry(buf, entry) {
  const o = entry.localOffset;
  if (buf.readUInt32LE(o) !== 0x04034b50) throw new Error('cabecalho local invalido');
  const start = o + 30 + buf.readUInt16LE(o + 26) + buf.readUInt16LE(o + 28);
  const raw = buf.subarray(start, start + entry.csize);
  return entry.method === 8 ? inflateRawSync(raw) : raw;
}


function selfTest() {
  const entries = [
    { name: 'README.txt', data: Buffer.from('ola mundo\n'.repeat(50)) },
    { name: 'src/ação/arquivo.ts', data: Buffer.from('export const x = 1;\n') },
    { name: 'vazio.txt', data: Buffer.alloc(0) },
    { name: 'bin/dados.bin', data: Buffer.from([0, 1, 2, 3, 250, 251, 252, 0]) },
  ];
  const dir = mkdtempSync(join(tmpdir(), 'build-zip-selftest-'));
  const results = [];
  try {
    const file = join(dir, 'teste.zip');
    writeFileSync(file, buildZip(entries));
    const buf = readFileSync(file);
    const central = readCentralDirectory(buf);
    results.push(['numero de entradas confere', central.length === entries.length]);
    results.push(['nomes conferem (UTF-8)', entries.every((e, i) => central[i].name === e.name)]);
    results.push(['CRC32 e conteudo de cada entrada conferem', entries.every((e, i) => {
      const got = extractEntry(buf, central[i]);
      return central[i].crc === crc32(e.data) >>> 0 && Buffer.compare(got, e.data) === 0 && central[i].size === e.data.length;
    })]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const inc = (p, o) => shouldInclude(p, o);
  results.push(['.env e .env.local excluidos, .env.example incluido', !inc('.env') && !inc('.env.local') && inc('.env.example')]);
  results.push(['node_modules, .git, chaves e .planning excluidos', !inc('node_modules/x/y.js') && !inc('.git/config') && !inc('secret.pem') && !inc('a.key') && !inc('.planning/STATE.md')]);
  results.push(['.planning incluido com --with-planning e codigo normal incluido', inc('.planning/STATE.md', { withPlanning: true }) && inc('src/security/pii/engine.ts')]);
  let ok = true;
  for (const [label, pass] of results) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
    if (!pass) ok = false;
  }
  process.exit(ok ? 0 : 1);
}

if (flag('--self-test')) selfTest();

// ---------- build real ----------

let engine;
try {
  engine = await import('../src/security/pii/engine.ts');
} catch {
  console.error('Nao foi possivel carregar o motor de PII (src/security/pii/engine.ts). Use Node >= 22.18.');
  process.exit(2);
}

function loadAllowlist() {
  try {
    const parsed = JSON.parse(readFileSync(join(root, 'scripts/pii-scan-allowlist.json'), 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.file && e.ruleId && e.reason) : [];
  } catch {
    return [];
  }
}

const withPlanning = flag('--with-planning');
const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const all = [...new Set(listed.split('\0').filter(Boolean))];
const included = [];
let excluded = 0;
for (const rel of all) {
  let st;
  try {
    st = lstatSync(join(root, rel));
  } catch {
    continue;
  }
  if (!st.isFile() || !shouldInclude(rel, { withPlanning })) {
    excluded += 1;
    continue;
  }
  included.push(rel);
}

// Recusa se houver credencial critica (fora da allowlist) em qualquer arquivo de texto.
const allowlist = loadAllowlist();
const offenders = new Map();
const entries = [];
for (const rel of included) {
  const data = readFileSync(join(root, rel));
  entries.push({ name: rel, data });
  if (data.length > MAX_SCAN_BYTES || BINARY_EXT.has(extname(rel).toLowerCase()) || data.includes(0)) continue;
  const text = data.toString('utf8');
  for (const line of text.split(/\r?\n/)) {
    if (line.length === 0) continue;
    for (const f of engine.scan(line)) {
      if (f.category !== 'credential' || f.severity !== 'critical') continue;
      if (allowlist.some((a) => a.file === rel && a.ruleId === f.ruleId)) continue;
      offenders.set(rel, (offenders.get(rel) ?? 0) + 1);
    }
  }
}

if (offenders.size > 0) {
  console.error(`RECUSADO: ${offenders.size} arquivo(s) com credencial critica. Nada foi empacotado.`);
  for (const [rel, n] of offenders) console.error(`  ${rel}: ${n} achado(s)`);
  process.exit(1);
}

const outDir = join(root, 'dist-zip');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outFile = join(outDir, `AgroAlerta-Cybersecurity-${stamp}.zip`);
writeFileSync(outFile, buildZip(entries));
console.log(`ZIP gerado: dist-zip/${basename(outFile)}`);
console.log(`Incluidos: ${included.length} arquivos. Excluidos: ${excluded}.`);
