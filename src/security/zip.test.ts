// Testes do empacotador de ZIP (D-12): auto-teste do escritor e regras de inclusao.
// tsconfig usa types: ["jest"] (sem @types/node); modulos do Node via require.
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('node:child_process') as {
  spawnSync: (cmd: string, args: string[], opts: { encoding: 'utf8' }) => { status: number | null; stdout: string };
};
const { join } = require('node:path') as { join: (...parts: string[]) => string };

const script = join(process.cwd(), 'scripts', 'build-zip.mjs');
const check = (path: string, extra: string[] = []): string =>
  spawnSync(process.execPath, [script, '--check-path', path, ...extra], { encoding: 'utf8' }).stdout.trim();

describe('build-zip', () => {
  it('--self-test escreve e le um zip com nomes e CRC32 corretos', () => {
    const res = spawnSync(process.execPath, [script, '--self-test'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS');
    expect(res.stdout).not.toContain('FAIL');
  });

  it.each([
    ['.env', 'exclude'],
    ['.env.local', 'exclude'],
    ['.env.production', 'exclude'],
    ['.env.example', 'include'],
    ['node_modules/x/y.js', 'exclude'],
    ['.git/config', 'exclude'],
    ['.planning/STATE.md', 'exclude'],
    ['secret.pem', 'exclude'],
    ['a.key', 'exclude'],
    ['dist-zip/old.zip', 'exclude'],
    ['src/security/pii/engine.ts', 'include'],
  ])('shouldInclude(%s) -> %s', (path, expected) => {
    expect(check(path)).toBe(expected);
  });

  it('--with-planning inclui .planning', () => {
    expect(check('.planning/STATE.md', ['--with-planning'])).toBe('include');
  });
});
