import { join, readdirSync, readFileSync, repoRoot } from './testFs';

const DIR = join(repoRoot(), 'supabase', 'migrations');

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n');
}

/** Returns each dynamic-SQL `execute` statement (up to the next semicolon-terminated clause). */
function dynamicExecutes(sql: string): string[] {
  const clean = stripComments(sql);
  const out: string[] = [];
  const re = /(^|[\s;])execute\s+(?!function\b|procedure\b|on\b)/gi;
  for (const m of clean.matchAll(re)) {
    const start = (m.index ?? 0) + m[0].length;
    const before = clean.slice(Math.max(0, (m.index ?? 0) - 10), m.index ?? 0);
    if (/(grant|revoke)\s*$/i.test(before)) continue;
    out.push(clean.slice(start, start + 400).split(';')[0]);
  }
  return out;
}

const files = readdirSync(DIR).filter((f: string) => f.endsWith('.sql'));

describe('dynamic SQL audit', () => {
  it('finds the migrations', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('allows only the static http_post execute or %I/%L format', () => {
    const bad: string[] = [];
    for (const f of files) {
      for (const stmt of dynamicExecutes(readFileSync(join(DIR, f), 'utf8'))) {
        const staticHttp = /^'select net\.http_post\(url := \$1, headers := \$2, body := \$3\)'\s+using\b/i.test(stmt.trim());
        if (staticHttp) continue;
        const fmt = /^format\(/i.test(stmt.trim()) && !/%s/.test(stmt) && !/\|\|/.test(stmt);
        if (!fmt) bad.push(`${f}: ${stmt.trim().slice(0, 80)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('never concatenates into execute', () => {
    for (const f of files) {
      for (const stmt of dynamicExecutes(readFileSync(join(DIR, f), 'utf8'))) {
        expect(stmt).not.toMatch(/\|\|/);
      }
    }
  });

  it('migration 010 has no dynamic-SQL execute', () => {
    const f = files.find((n: string) => n.startsWith('010'));
    expect(f).toBeDefined();
    expect(dynamicExecutes(readFileSync(join(DIR, f as string), 'utf8'))).toEqual([]);
  });
});
