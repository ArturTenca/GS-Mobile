import { CATEGORIES, SEVERITIES } from './constants.ts';
import { RULES } from './rules.ts';
import type { Category, Finding, Rule, ScanOptions, Severity } from './types.ts';

// Ponto de entrada unico do motor de PII. Consumidores importam somente daqui.
export { CATEGORIES, SEVERITIES, RULES };
export type {
  Category,
  Finding,
  RedactionStrategy,
  Rule,
  RuleId,
  ScanOptions,
  Severity,
} from './types.ts';

const DEFAULT_MAX_LENGTH = 10000;
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;
const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function normalize(text: string, maxLength: number): string {
  const capped = text.length > maxLength * 2 ? text.slice(0, maxLength * 2) : text;
  return capped.normalize('NFKC').replace(INVISIBLE, '').slice(0, maxLength);
}

function maskEmail(raw: string): string {
  const at = raw.indexOf('@');
  const domain = raw.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const tld = dot >= 0 ? domain.slice(dot) : '';
  return `${raw[0]}***@${domain[0] ?? ''}***${tld}`;
}

function previewFor(rule: Rule, raw: string): string {
  switch (rule.redact) {
    case 'mask-keep-last2':
      return `***.***.***-${raw.replace(/\D/g, '').slice(-2)}`;
    case 'mask-email':
      return maskEmail(raw);
    case 'mask-phone':
      return `(**) *****-${raw.replace(/\D/g, '').slice(-4)}`;
    case 'drop':
      return '[REDACTED:secret]';
    default:
      return `[REDACTED:${rule.id}]`;
  }
}

type Candidate = { rule: Rule; start: number; end: number; validated: boolean; preview: string };

function collect(text: string, rules: Rule[]): Candidate[] {
  const out: Candidate[] = [];
  for (const rule of rules) {
    for (const m of text.matchAll(rule.pattern)) {
      const matched = m[0];
      const start = m.index ?? 0;
      const end = start + matched.length;
      if (matched.length === 0) continue;
      const before = text.slice(Math.max(0, start - 40), start);
      const after = text.slice(end, end + 40);
      if (rule.contextWords) {
        const win = text.slice(Math.max(0, start - rule.contextWords.window), start);
        const hit = rule.contextWords.words.test(win);
        if (rule.contextWords.required && !hit) continue;
      }
      if (rule.validate && !rule.validate(matched, { before, after })) continue;
      out.push({ rule, start, end, validated: Boolean(rule.validate), preview: previewFor(rule, matched) });
    }
  }
  return out;
}

function resolveOverlaps(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.validated !== b.validated) return a.validated ? -1 : 1;
    const sev = SEVERITY_RANK[b.rule.severity] - SEVERITY_RANK[a.rule.severity];
    if (sev !== 0) return sev;
    const len = b.end - b.start - (a.end - a.start);
    if (len !== 0) return len;
    return a.start - b.start;
  });
  const accepted: Candidate[] = [];
  for (const c of sorted) {
    if (!accepted.some((a) => c.start < a.end && a.start < c.end)) accepted.push(c);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

function toFinding(c: Candidate): Finding {
  return {
    ruleId: c.rule.id,
    category: c.rule.category,
    severity: c.rule.severity,
    start: c.start,
    end: c.end,
    preview: c.preview,
    validated: c.validated,
  };
}

function activeRules(opts?: ScanOptions): Rule[] {
  const cats = opts?.categories;
  return cats ? RULES.filter((r) => cats.includes(r.category)) : RULES;
}

export function scan(text: string, opts?: ScanOptions): Finding[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const normalized = normalize(text, opts?.maxLength ?? DEFAULT_MAX_LENGTH);
  return resolveOverlaps(collect(normalized, activeRules(opts))).map(toFinding);
}

// Retorna o texto normalizado (NFKC, sem caracteres invisiveis, cortado em
// maxLength) com cada trecho sensivel trocado pela previa mascarada.
export function redact(text: string, findings?: Finding[], opts?: ScanOptions): string {
  if (typeof text !== 'string' || text.length === 0) return '';
  const normalized = normalize(text, opts?.maxLength ?? DEFAULT_MAX_LENGTH);
  const list = findings ?? scan(text, opts);
  let result = '';
  let cursor = 0;
  for (const f of [...list].sort((a, b) => a.start - b.start)) {
    if (f.start < cursor || f.end > normalized.length) continue;
    result += normalized.slice(cursor, f.start) + f.preview;
    cursor = f.end;
  }
  return result + normalized.slice(cursor);
}

const MAX_DEPTH = 20;

export function redactDeep<T>(value: T, opts?: ScanOptions): T {
  const walk = (v: unknown, depth: number): unknown => {
    if (typeof v === 'string') return redact(v, undefined, opts);
    if (depth >= MAX_DEPTH || v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map((item) => walk(item, depth + 1));
    const copy: Record<string, unknown> = {};
    for (const [k, item] of Object.entries(v as Record<string, unknown>)) copy[k] = walk(item, depth + 1);
    return copy;
  };
  return walk(value, 0) as T;
}

export function hasPii(text: string, categories?: Category[]): boolean {
  return scan(text, categories ? { categories } : undefined).length > 0;
}
