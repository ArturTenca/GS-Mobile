import { fakeEmail, fakeJwt } from './fixtures.ts';

// tsconfig usa types: ["jest"] (sem @types/node); modulos do Node via require.
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('node:child_process') as {
  spawnSync: (cmd: string, args: string[], opts: { encoding: 'utf8' }) => { status: number | null; stdout: string };
};
const { join } = require('node:path') as { join: (...parts: string[]) => string };

describe('pii-scan CLI', () => {
  it('--self-test passa e nao imprime valores brutos', () => {
    const script = join(process.cwd(), 'scripts', 'pii-scan.mjs');
    const res = spawnSync(process.execPath, [script, '--self-test'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS');
    expect(res.stdout).not.toContain('FAIL');
    expect(res.stdout).not.toContain(fakeEmail());
    expect(res.stdout).not.toContain(fakeJwt().slice(0, 24));
  });
});
