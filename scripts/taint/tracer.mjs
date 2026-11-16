// Rastreador estatico de taint (source -> sink) com a API do compilador TypeScript.
// Propagacao por ponto fixo sobre simbolos do checker: declaracoes, atribuicoes, template
// literals, '+', objetos/arrays/spread, acesso a propriedade, desestruturacao, resumos de
// funcao (parametro -> retorno e parametro -> sink, em qualquer profundidade) e callbacks.
// Limitacao conhecida: nao segue props de JSX nem estado fora de useState; o complemento sao
// os testes de runtime listados em evidence.json. Nunca imprime valores, so arquivo:linha e nomes.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

import { CALL_SOURCES, GUARDS, MUTATORS, NEW_SINKS, PROPERTY_SOURCES, SANITIZERS, SHAPE_SOURCES, SINKS } from './config.mjs';

const MAX_PATH = 14;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

function createProgram(root, rootFiles) {
  const cfgPath = join(root, 'tsconfig.json');
  const read = ts.readConfigFile(cfgPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  const options = { ...parsed.options, noEmit: true, skipLibCheck: true, allowJs: false };
  return ts.createProgram({ rootNames: rootFiles, options });
}

export function analyze({ root, files }) {
  const rootFiles = files ?? walk(join(root, 'src'));
  const program = createProgram(root, rootFiles);
  const checker = program.getTypeChecker();

  const isApp = (sf) => !sf.isDeclarationFile && !sf.fileName.includes('node_modules') && !/\.test\.(ts|tsx)$/.test(sf.fileName);
  const appFiles = program.getSourceFiles().filter(isApp);
  const rel = (sf) => relative(root, sf.fileName).split(sep).join('/');
  const lineOf = (n) => n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1;

  const taintMap = new Map(); // ts.Symbol -> Info
  const returnTaint = new Map(); // function-like node -> Info
  const setterMap = new Map(); // setter symbol -> state symbol
  let changed = false;

  const mkSource = (src, node, symbol) => ({
    source: { kind: src.id, label: src.label, file: rel(node.getSourceFile()), line: lineOf(node), symbol },
    path: [symbol],
    guards: [],
  });

  const guardLevel = (info) => info.guards.length;
  const worst = (infos) => {
    const list = infos.filter(Boolean);
    if (list.length === 0) return null;
    return list.reduce((a, b) => (guardLevel(b) < guardLevel(a) ? b : a));
  };
  const withGuard = (info, guard) => ({
    ...info,
    guards: [...info.guards, guard],
    path: [...info.path, guard.name].slice(-MAX_PATH),
  });
  const withStep = (info, label) => ({ ...info, path: [...info.path, label].slice(-MAX_PATH) });

  function markSymbol(sym, info, label) {
    if (!sym) return;
    const next = label ? withStep(info, label) : info;
    const cur = taintMap.get(sym);
    if (!cur || guardLevel(next) < guardLevel(cur)) {
      taintMap.set(sym, next);
      changed = true;
    }
  }

  function markReturn(fn, info) {
    if (!fn || !info) return;
    const cur = returnTaint.get(fn);
    if (!cur || guardLevel(info) < guardLevel(cur)) {
      returnTaint.set(fn, info);
      changed = true;
    }
  }

  const symbolOf = (id) => {
    if (!id) return undefined;
    if (ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id) {
      return checker.getShorthandAssignmentValueSymbol(id.parent);
    }
    return checker.getSymbolAtLocation(id);
  };

  function rootIdentifier(n) {
    let cur = n;
    for (;;) {
      if (ts.isIdentifier(cur)) return cur;
      if (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur) || ts.isNonNullExpression(cur) || ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur)) {
        cur = cur.expression;
      } else if (ts.isCallExpression(cur)) {
        cur = cur.expression;
      } else return null;
    }
  }

  function calleeText(call) {
    return call.expression.getText().replace(/\s+/g, '');
  }
  function calleeLastName(call) {
    const e = call.expression;
    if (ts.isIdentifier(e)) return e.text;
    if (ts.isPropertyAccessExpression(e)) return e.name.text;
    return '';
  }

  function resolvedDecl(call) {
    let sig;
    try {
      sig = checker.getResolvedSignature(call);
    } catch {
      return null;
    }
    const decl = sig?.declaration;
    if (!decl) return null;
    return isApp(decl.getSourceFile()) ? decl : false;
  }

  function isSupabaseChain(expr) {
    const id = rootIdentifier(expr);
    return !!id && SHAPE_SOURCES.supabaseRoots.includes(id.text);
  }

  function propertySource(n) {
    if (!ts.isIdentifier(n.expression)) return null;
    const base = n.expression.text;
    const prop = n.name.text;
    for (const src of PROPERTY_SOURCES) {
      if (src.bases.includes(base) && src.props.includes(prop)) return mkSource(src, n, `${base}.${prop}`);
    }
    if (SHAPE_SOURCES.coords.names.includes(prop) && ['property', 'farm', 'coords', 'location'].includes(base)) {
      return mkSource(SHAPE_SOURCES.coords, n, `${base}.${prop}`);
    }
    return null;
  }

  function callTaint(n) {
    const last = calleeLastName(n);
    const text = calleeText(n);
    for (const src of CALL_SOURCES) {
      if (src.callees.includes(last)) return mkSource(src, n, `${last}()`);
    }
    if (last === 'json' && n.arguments.length === 0 && ts.isPropertyAccessExpression(n.expression)) {
      const r = rootIdentifier(n.expression.expression);
      if (!r || r.text !== 'JSON') return mkSource(SHAPE_SOURCES.httpJson, n, `${n.expression.expression.getText().slice(0, 24)}.json()`);
    }
    if (SINKS.some((s) => s.test(text))) return null;
    const argInfos = n.arguments.map((a) => taintOf(a));
    if (SANITIZERS.includes(last) || SANITIZERS.includes(text)) {
      const w = worst(argInfos.concat(ts.isPropertyAccessExpression(n.expression) ? [taintOf(n.expression.expression)] : []));
      return w ? withGuard(w, { name: last, kind: 'sanitized' }) : null;
    }
    if (GUARDS.includes(last)) {
      const w = worst(argInfos);
      return w ? withGuard(w, { name: last, kind: 'blocked' }) : null;
    }
    const decl = resolvedDecl(n);
    if (decl) return returnTaint.get(decl) ?? null;
    const base = ts.isPropertyAccessExpression(n.expression) ? taintOf(n.expression.expression) : null;
    return worst([...argInfos, base]);
  }

  function taintOf(n) {
    if (!n) return null;
    if (ts.isIdentifier(n)) {
      const sym = symbolOf(n);
      return sym ? (taintMap.get(sym) ?? null) : null;
    }
    if (
      ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) ||
      ts.isTypeAssertionExpression(n) || ts.isSatisfiesExpression(n) || ts.isAwaitExpression(n) ||
      ts.isSpreadElement(n) || ts.isSpreadAssignment(n)
    ) {
      return taintOf(n.expression);
    }
    if (ts.isTemplateExpression(n)) return worst(n.templateSpans.map((s) => taintOf(s.expression)));
    if (ts.isBinaryExpression(n)) {
      const k = n.operatorToken.kind;
      if (k === ts.SyntaxKind.EqualsToken) return taintOf(n.right);
      if ([ts.SyntaxKind.PlusToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.PlusEqualsToken].includes(k)) {
        return worst([taintOf(n.left), taintOf(n.right)]);
      }
      return null;
    }
    if (ts.isConditionalExpression(n)) return worst([taintOf(n.whenTrue), taintOf(n.whenFalse)]);
    if (ts.isObjectLiteralExpression(n)) {
      return worst(
        n.properties.map((p) => {
          if (ts.isPropertyAssignment(p)) return taintOf(p.initializer);
          if (ts.isShorthandPropertyAssignment(p)) {
            const sym = symbolOf(p.name);
            return sym ? (taintMap.get(sym) ?? null) : null;
          }
          if (ts.isSpreadAssignment(p)) return taintOf(p.expression);
          return null;
        }),
      );
    }
    if (ts.isArrayLiteralExpression(n)) return worst(n.elements.map((e) => taintOf(e)));
    if (ts.isPropertyAccessExpression(n)) {
      const own = propertySource(n);
      if (own) return own;
      if (n.name.text === 'length') return null;
      return taintOf(n.expression);
    }
    if (ts.isElementAccessExpression(n)) return taintOf(n.expression);
    if (ts.isCallExpression(n)) return callTaint(n);
    if (ts.isNewExpression(n)) return worst((n.arguments ?? []).map((a) => taintOf(a)));
    return null;
  }

  function bindingIdentifiers(name, out = []) {
    if (ts.isIdentifier(name)) out.push(name);
    else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindingIdentifiers(el.name, out);
    return out;
  }

  function seedFunctionParam(fn, index, info, label) {
    const p = fn?.parameters?.[index];
    if (!p || !ts.isIdentifier(p.name)) return;
    markSymbol(symbolOf(p.name), info, label ?? p.name.text);
  }

  function functionFromExpr(expr) {
    if (!expr) return null;
    if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) return expr;
    if (ts.isCallExpression(expr)) {
      const inner = expr.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
      return inner ?? null;
    }
    if (ts.isIdentifier(expr)) {
      const decl = symbolOf(expr)?.valueDeclaration;
      if (!decl) return null;
      if (ts.isFunctionDeclaration(decl)) return decl;
      if (ts.isVariableDeclaration(decl) && decl.initializer) return functionFromExpr(decl.initializer);
    }
    return null;
  }

  function visit(n) {
    if (ts.isVariableDeclaration(n)) {
      let info = n.initializer ? taintOf(n.initializer) : null;
      const init = n.initializer ? (ts.isAwaitExpression(n.initializer) ? n.initializer.expression : n.initializer) : null;
      if (init && ts.isCallExpression(init) && isSupabaseChain(init)) {
        info = mkSource(SHAPE_SOURCES.supabase, n, 'supabase');
      }
      if (init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'useState' && ts.isArrayBindingPattern(n.name)) {
        const [state, setter] = n.name.elements;
        if (state && setter && ts.isBindingElement(state) && ts.isBindingElement(setter) && ts.isIdentifier(state.name) && ts.isIdentifier(setter.name)) {
          const ss = symbolOf(state.name);
          const st = symbolOf(setter.name);
          if (ss && st) setterMap.set(st, ss);
        }
      }
      if (info) for (const id of bindingIdentifiers(n.name)) markSymbol(symbolOf(id), info, id.text);
    } else if (ts.isCatchClause(n) && n.variableDeclaration && ts.isIdentifier(n.variableDeclaration.name)) {
      markSymbol(symbolOf(n.variableDeclaration.name), mkSource(SHAPE_SOURCES.caught, n, n.variableDeclaration.name.text));
    } else if (ts.isForOfStatement(n) && ts.isVariableDeclarationList(n.initializer)) {
      const info = taintOf(n.expression);
      if (info) for (const d of n.initializer.declarations) for (const id of bindingIdentifiers(d.name)) markSymbol(symbolOf(id), info, id.text);
    } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const info = taintOf(n.right);
      const id = rootIdentifier(n.left);
      if (info && id) markSymbol(symbolOf(id), info, id.text);
    } else if (ts.isParameter(n) && ts.isIdentifier(n.name) && SHAPE_SOURCES.coords.names.includes(n.name.text) && n.parent.body) {
      markSymbol(symbolOf(n.name), mkSource(SHAPE_SOURCES.coords, n, n.name.text));
    } else if (ts.isReturnStatement(n) && n.expression) {
      const fn = ts.findAncestor(n.parent, ts.isFunctionLike);
      markReturn(fn, taintOf(n.expression));
    } else if ((ts.isArrowFunction(n)) && !ts.isBlock(n.body)) {
      markReturn(n, taintOf(n.body));
    } else if (ts.isJsxAttribute(n) && n.name.getText() === 'onChangeText' && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression) {
      const expr = n.initializer.expression;
      const src = mkSource(SHAPE_SOURCES.onChangeText, n, 'onChangeText');
      const fn = functionFromExpr(expr);
      if (fn) seedFunctionParam(fn, 0, src, 'text');
      else if (ts.isIdentifier(expr)) {
        const st = setterMap.get(symbolOf(expr));
        if (st) markSymbol(st, src, expr.text);
      }
    } else if (ts.isCallExpression(n)) {
      const callee = n.expression;
      // setter de useState: setX(valor) contamina o estado
      if (ts.isIdentifier(callee)) {
        const st = setterMap.get(symbolOf(callee));
        if (st && n.arguments[0]) {
          const info = taintOf(n.arguments[0]);
          if (info) markSymbol(st, info, callee.text);
        }
      }
      // metodos mutadores: arr.push(x)
      if (ts.isPropertyAccessExpression(callee) && MUTATORS.includes(callee.name.text)) {
        const info = worst(n.arguments.map((a) => taintOf(a)));
        const id = rootIdentifier(callee.expression);
        if (info && id) markSymbol(symbolOf(id), info, id.text);
      }
      // callbacks de metodos sobre base contaminada: tainted.map((x) => ...)
      if (ts.isPropertyAccessExpression(callee)) {
        const base = taintOf(callee.expression);
        if (base) for (const a of n.arguments) if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) seedFunctionParam(a, 0, base);
      }
      // resumo parametro -> corpo: semeia os parametros da funcao chamada
      const text = calleeText(n);
      const last = calleeLastName(n);
      const skip = SINKS.some((s) => s.test(text)) || SANITIZERS.includes(last) || GUARDS.includes(last);
      if (!skip) {
        const decl = resolvedDecl(n);
        if (decl) {
          n.arguments.forEach((a, i) => {
            const info = taintOf(a);
            if (info) seedFunctionParam(decl, i, info);
          });
        }
      }
    }
    ts.forEachChild(n, visit);
  }

  for (let pass = 0; pass < 12; pass += 1) {
    changed = false;
    for (const sf of appFiles) visit(sf);
    if (!changed) break;
  }

  const flows = [];
  const seen = new Set();

  const containerOf = (n) => {
    const fn = ts.findAncestor(n, ts.isFunctionLike);
    if (!fn) return '(modulo)';
    if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
    if (ts.isVariableDeclaration(fn.parent) && ts.isIdentifier(fn.parent.name)) return fn.parent.name.text;
    return '(anonima)';
  };

  const statusOf = (guards) => {
    if (guards.length === 0) return 'unsafe';
    return guards.some((g) => g.kind === 'blocked') ? 'blocked' : 'sanitized';
  };

  function record(sinkId, sinkLabel, callNode, info, extraGuard) {
    const full = extraGuard ? withGuard(info, extraGuard) : info;
    const sf = callNode.getSourceFile();
    const key = [sinkId, rel(sf), lineOf(callNode), full.source.kind, full.source.file, full.source.line].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    flows.push({
      source: full.source,
      sink: { kind: sinkId, label: sinkLabel, file: rel(sf), line: lineOf(callNode), call: callNode.expression.getText().slice(0, 60), container: containerOf(callNode) },
      path: full.path,
      guards: full.guards.map((g) => g.name),
      guard: full.guards.length ? full.guards[full.guards.length - 1].name : null,
      status: statusOf(full.guards),
    });
  }

  function newSinkGuarded(newNode, spec) {
    const sym = checker.getSymbolAtLocation(newNode.expression);
    const target = sym && sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    const decl = target?.declarations?.[0];
    if (!decl) return false;
    return decl.getText().includes(spec.requires);
  }

  function checkSinks(n) {
    if (ts.isCallExpression(n)) {
      const text = calleeText(n);
      for (const s of SINKS) {
        if (!s.test(text)) continue;
        const idx = s.args ?? n.arguments.map((_, i) => i);
        for (const i of idx) {
          const info = n.arguments[i] ? taintOf(n.arguments[i]) : null;
          if (info) record(s.id, s.label, n, info, s.implicitGuard);
        }
        break;
      }
    } else if (ts.isNewExpression(n) && n.arguments) {
      const name = n.expression.getText();
      for (const s of NEW_SINKS) {
        if (name !== s.className) continue;
        for (const i of s.args) {
          const info = n.arguments[i] ? taintOf(n.arguments[i]) : null;
          if (info) record(s.id, s.label, n, info, newSinkGuarded(n, s) ? s.guard : undefined);
        }
      }
    }
    ts.forEachChild(n, checkSinks);
  }
  for (const sf of appFiles) checkSinks(sf);

  flows.sort((a, b) => a.sink.file.localeCompare(b.sink.file) || a.sink.line - b.sink.line || a.source.kind.localeCompare(b.source.kind));
  flows.forEach((f, i) => {
    f.id = `T-${String(i + 1).padStart(3, '0')}`;
  });
  return { flows, filesAnalyzed: appFiles.length };
}

export function summarize(flows) {
  const count = (s) => flows.filter((f) => f.status === s).length;
  return { flows: flows.length, blocked: count('blocked'), sanitized: count('sanitized'), unsafe: count('unsafe') };
}

export const fileExists = existsSync;
export const resolvePath = resolve;
