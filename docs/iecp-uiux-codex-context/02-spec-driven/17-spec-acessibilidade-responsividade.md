# 17 — Spec: Acessibilidade e responsividade

## Objetivo

Garantir que o SECP seja acessível, responsivo e utilizável por teclado e tecnologias assistivas.

## Escopo

- Toolbar de acessibilidade.
- Tema claro/escuro.
- Alto contraste.
- Aumentar/diminuir fonte.
- Fonte para dislexia.
- VLibras visual.
- Aria labels.
- Foco visível.
- Responsividade.

## Breakpoints mínimos

- 390px mobile.
- 768px tablet.
- 1024px notebook.
- 1440px desktop.

## Regras

- Nenhum botão sem nome acessível.
- Nenhum input sem label.
- Foco visível em todos os elementos interativos.
- Sidebar mobile deve ser navegável por teclado.
- Tabelas devem ter fallback responsivo.

## Critérios de aceite

- Navegação principal funciona por Tab.
- Contraste adequado nos estados principais.
- Ações críticas não dependem apenas de cor.
- Texto não quebra com fonte aumentada.

## Prompt operacional

```txt
Implemente a SPEC 17: acessibilidade e responsividade.
Revise os componentes já criados.
Não altere regras de negócio.
Garanta aria-labels, foco visível e toolbar funcional com estado local.
```
