# SECP UI/UX — Pacote de Contexto para Codex no VSCode

Este pacote contém arquivos Markdown numerados para orientar o Codex na implementação incremental da UI/UX do **SECP — Sistema Eletrônico de Controle de Ponto**.

O objetivo é permitir que o Codex, dentro do VSCode, implemente o layout com consistência visual, rastreabilidade normativa, componentização e experiência auto-instrucional.

## Como usar rapidamente

1. Copie a pasta `secp-uiux-codex-context` para a raiz do projeto SECP.
2. No VSCode, abra primeiro estes arquivos:
   - `00-guia/00-como-usar-no-vscode-codex.md`
   - `01-contextos/01-contexto-produto-uiux-secp.md`
   - `02-spec-driven/06-spec-driven-overview.md`
   - a skill específica da tarefa em `05-skills/`.
3. Peça ao Codex para ler os arquivos abertos e implementar apenas a etapa solicitada.
4. Exija sempre arquivos pequenos, componentizados, com checklist de aceite.

## Princípios obrigatórios

- UI institucional, clara e responsiva.
- Layout inspirado no Azure Portal, sem copiar marca ou identidade da Microsoft.
- Cores oficiais: azul Pantone 294 C, verde Pantone 356 C e cinza Pantone Cool Gray 7.
- Header com acessibilidade, perfil ativo, unidade e usuário.
- Sidebar recolhível por perfil.
- Cards auto-instrucionais com regra da Portaria aplicável.
- Tabelas com busca, filtros, paginação, itens por página, skeleton e exportação PDF.
- Solicitações sempre com `Stepper` e comprovante final.
- Telas separadas de listagem, inclusão, edição, visualização e auditoria.
- Nenhum componente gigante.
- Nenhuma regra normativa escondida apenas no backend.
- Toda tela crítica deve explicar “o que fazer agora” e “por que isso é necessário”.

## Ordem de leitura recomendada

1. `00-guia/00-como-usar-no-vscode-codex.md`
2. `00-guia/01-mapa-dos-arquivos.md`
3. `01-contextos/01-contexto-produto-uiux-secp.md`
4. `01-contextos/02-contexto-normativo-portaria-135-ui.md`
5. `01-contextos/03-contexto-identidade-visual.md`
6. `02-spec-driven/06-spec-driven-overview.md`
7. `03-harness/19-harness-uiux-geral.md`
8. Skill específica conforme a tarefa.

## Imagem de referência

A imagem gerada para o dashboard está em:

`assets/secp-dashboard-reference.png`

Use-a como referência visual, não como reprodução pixel-perfect. O objetivo é preservar a lógica de experiência: menu lateral, header institucional, cards, ação recomendada, frequência do mês, alertas e acesso rápido.
