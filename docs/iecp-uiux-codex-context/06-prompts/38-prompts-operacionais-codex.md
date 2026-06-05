# 38 — Prompts operacionais para Codex

## Prompt 1 — Preparar plano

```txt
Leia os arquivos abertos do pacote SECP UI/UX.
A tarefa é: <descreva a tarefa>.
Antes de alterar arquivos, liste:
1. Arquivos que pretende criar.
2. Arquivos que pretende alterar.
3. O que ficará fora do escopo.
4. Riscos.
Aguarde minha confirmação antes de codificar.
```

## Prompt 2 — Design system

```txt
Implemente a base visual do SECP com tokens e componentes mínimos.
Use:
- 03-contexto-identidade-visual.md
- 08-spec-design-system-tokens.md
- 09-spec-componentes-base.md
- 27-skill-design-system-tailwind.md
Restrições:
- Não alterar páginas finais.
- Não implementar backend.
- Componentes pequenos e acessíveis.
```

## Prompt 3 — AppShell

```txt
Implemente AppShell, Header, Sidebar, Breadcrumb, ProfileSwitcher e AccessibilityToolbar.
Use:
- 07-spec-appshell-header-sidebar.md
- 26-skill-ui-azure-appshell.md
A sidebar deve ser recolhível e responsiva.
Use dados mockados de usuário, unidade e perfil.
```

## Prompt 4 — Dashboard do servidor

```txt
Implemente o dashboard do servidor conforme a imagem de referência e a Spec 10.
Use dados mockados.
A primeira dobra deve destacar a próxima ação recomendada.
Inclua marcações do dia, banco de horas, pendências, alertas e acesso rápido.
```

## Prompt 5 — Solicitação com stepper

```txt
Crie o Stepper genérico e implemente o fluxo mockado de Solicitação de Ajuste de Ponto.
Use a Spec 12 e Skill 30.
O fluxo deve terminar em revisão e comprovante.
```

## Prompt 6 — Revisão de acessibilidade

```txt
Revise os componentes e páginas da UI do SECP.
Use a Skill 34 e Spec 17.
Corrija problemas de aria-label, labels, foco visível, contraste e responsividade.
Não altere regra de negócio.
```

## Prompt 7 — Revisão contra checklist

```txt
Revise a implementação atual contra:
- checklist da spec usada;
- checklist de PR 24;
- harness geral 19.
Não crie código novo.
Liste apenas problemas, riscos e recomendações.
```

## Prompt 8 — Corrigir erro específico

```txt
Estou recebendo este erro:
<cole o erro>
Analise o erro e corrija apenas o necessário.
Ao final, entregue a versão final completa dos arquivos alterados e explique como testar.
```
