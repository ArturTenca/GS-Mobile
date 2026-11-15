---
status: approved
phase: 01-app-shell-auth-demo-farm
source: [01-VERIFICATION.md]
started: 2026-11-12T00:00:00Z
updated: 2026-11-12T00:00:00Z
---

## Current Test

User approved on 2026-11-12 and confirmed 004_review_fixes.sql applied on the live project; individual items not reported step by step.

## Tests

### 1. Aplicar 004_review_fixes.sql no projeto Supabase e reconferir isolamento RLS
expected: SQL roda sem erro; editar nome de área/sensor demo funciona; alterar is_demo é recusado; sensor não aceita área de outra propriedade
result: passed (user: "rodei o sql 004")

### 2. Recuperação de senha ponta a ponta com PKCE no mesmo aparelho/navegador
expected: "Esqueci minha senha" → e-mail → link abre "Definir nova senha" só após troca do código → "Senha atualizada"; link reaproveitado ou de outro aparelho → "Link expirado ou inválido"
result: [pending]

### 3. Texto das análises de risco demo acompanha o nível (WR-11), após 004 aplicada
expected: nenhuma análise "moderado/alto" com recomendação "Sem ação necessária"
result: [pending]

### 4. Reteste ao vivo pós-correções: isolamento entre duas contas, logout (inclusive offline) e sessão persistente ao recarregar
expected: conta B não vê dados da A; logout offline não volta logado ao reabrir; refresh mantém sessão
result: [pending]

### 5. Estados offline e rótulos de leitor de tela em aparelho real
expected: "Sem conexão…" com "Tentar novamente"; abas e ícones anunciados pelo leitor de tela
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
