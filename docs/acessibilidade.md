# Acessibilidade

## O que foi feito

- Alvos de toque de pelo menos 48dp; o botão `sm` (40dp) é ampliado com `hitSlop`.
- `accessibilityLabel` e `accessibilityRole` nos componentes de UI.
- Estado indicado por ícone e texto, não só por cor.
- Escala de fonte do sistema respeitada (Início empilha indicadores em fontes grandes; a barra de abas limita a escala).
- Tema claro e escuro.

## Passe manual (checklist)

- [ ] Contraste conferido no tema claro.
- [ ] Contraste conferido no tema escuro.
- [ ] Fonte do sistema a 200%: nenhuma tela corta texto ou perde botões.
- [ ] Leitor de tela (TalkBack/VoiceOver) navega as 4 abas.
- [ ] Leitor de tela completa o fluxo "+" (fazenda e sensor).
- [ ] Navegação por teclado no web (Tab/Enter) alcança os controles principais.
- [ ] Mapa tem `accessibilityLabel` e há alternativa em texto (CEP/campos).

## Follow-up

- `NotificationsSection.tsx` e `perfil.tsx` não foram auditados nesta fase (pertencem ao plano 04-09).
- `Modal.tsx` (linhas 65 e 67): verificar se o backdrop/contêiner é decorativo e dispensa papel de acessibilidade.
