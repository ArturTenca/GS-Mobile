// Auto-teste do rastreador estatico: a fixture vulneravel precisa ser detectada.
// tsconfig usa types: ["jest"] (sem @types/node); modulos do Node via require.
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('node:child_process') as {
  spawnSync: (cmd: string, args: string[], opts: { encoding: 'utf8' }) => { status: number | null; stdout: string };
};
const { join } = require('node:path') as { join: (...parts: string[]) => string };

describe('taint-audit CLI', () => {
  it('--self-test detecta a fixture vulneravel e libera as variantes protegidas', () => {
    const script = join(process.cwd(), 'scripts', 'taint-audit.mjs');
    const res = spawnSync(process.execPath, [script, '--self-test'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS');
    expect(res.stdout).not.toContain('FAIL');
  });
});
