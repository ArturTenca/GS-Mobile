import { join, readdirSync, readFileSync, repoRoot, statSync } from './testFs';

const SRC = join(repoRoot(), 'src');
const SINKS: [string, RegExp][] = [
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
  ['.innerHTML', /\.innerHTML/],
  ['outerHTML', /outerHTML/],
  ['eval(', /(^|[^\w.])eval\s*\(/],
  ['new Function(', /new\s+Function\s*\(/],
  ['document.write', /document\.write/],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe('dangerous sink audit', () => {
  const files = walk(SRC);

  it('scans a non-trivial number of source files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(SINKS)('has no %s in src', (_label, re) => {
    const hits = files.filter((f: string) => re.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
