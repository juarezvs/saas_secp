# 00 — Como usar este pacote no VSCode com Codex

## Objetivo

Usar o Codex de forma controlada para implementar a UI/UX do SECP sem quebrar a arquitetura existente, sem gerar arquivos grandes e sem perder aderência à Portaria SJAM-DIREF 135/2025.

## Preparação no projeto

Na raiz do projeto Next.js, crie a pasta:

```txt
/docs/ia/secp-uiux-codex-context
```

Copie todo este pacote para essa pasta.

Estrutura esperada:

```txt
secp/
  src/
  prisma/
  docs/
    ia/
      secp-uiux-codex-context/
        README.md
        00-guia/
        01-contextos/
        02-spec-driven/
        03-harness/
        04-changes/
        05-skills/
        06-prompts/
        07-templates/
        assets/
```

## Estratégia de uso com Codex

### Etapa 1 — Orientar o agente

Abra no VSCode estes arquivos ao mesmo tempo:

```txt
README.md
00-guia/00-como-usar-no-vscode-codex.md
01-contextos/01-contexto-produto-uiux-secp.md
01-contextos/02-contexto-normativo-portaria-135-ui.md
02-spec-driven/06-spec-driven-overview.md
03-harness/19-harness-uiux-geral.md
```

Depois faça o prompt:

```txt
Leia os arquivos abertos. Você atuará apenas na UI/UX do SECP.
Não implemente regra de negócio de banco de horas agora.
Antes de alterar qualquer arquivo, liste os arquivos que pretende criar/alterar e explique a ordem.
Depois implemente somente a primeira etapa.
```

### Etapa 2 — Trabalhar por fatias pequenas

Nunca peça “implemente toda a UI”. Peça por fatia:

```txt
Implemente somente os tokens de design e os componentes base: Button, Card, Badge, PageHeader e Skeleton.
Use os arquivos 08-spec-design-system-tokens.md e 27-skill-design-system-tailwind.md como fonte principal.
Não altere páginas ainda.
```

### Etapa 3 — Validar antes de avançar

Depois de cada etapa, peça:

```txt
Revise o que foi criado contra o checklist da spec e da skill.
Aponte lacunas, riscos e próximos passos.
Não gere novos arquivos ainda.
```

### Etapa 4 — Criar telas

Depois dos componentes base, implemente telas por perfil:

1. AppShell + Header + Sidebar.
2. Dashboard do servidor.
3. Registrar ponto.
4. Solicitações com stepper.
5. Espelho de ponto.
6. Banco de horas.
7. Homologação da chefia.
8. Recesso forense.
9. Landpage e login.

## Regras para todo prompt ao Codex

Sempre inclua:

```txt
Restrições:
- Não criar arquivos gigantes.
- Não misturar UI com regra de negócio complexa.
- Usar TypeScript estrito.
- Componentizar.
- Preservar App Router.
- Preservar arquitetura modular.
- Usar nomes claros em português quando forem conceitos de negócio.
- Usar acessibilidade: aria-label, foco visível, contraste e navegação por teclado.
- Mostrar skeleton em estados de carregamento.
- Toda tela crítica deve ter card de orientação e card de regra da Portaria.
```

## Fluxo recomendado no VSCode

1. Criar branch:

```bash
git checkout -b feature/uiux-secp-layout
```

2. Abrir contexto e skill.
3. Pedir plano curto ao Codex.
4. Aprovar mentalmente o plano.
5. Pedir implementação de uma fatia.
6. Rodar localmente:

```bash
npm run lint
npm run build
npm run dev
```

7. Revisar visualmente.
8. Commitar:

```bash
git add .
git commit -m "feat(ui): implementa base visual do SECP"
```

## Prompt padrão de início

Use este prompt no Codex:

```txt
Você é um especialista em UI/UX, Next.js App Router, TypeScript e Tailwind CSS v4.
Leia os arquivos abertos em /docs/ia/secp-uiux-codex-context.
Implemente a próxima fatia da UI do SECP conforme a spec indicada.
Antes de codificar, liste arquivos a criar/alterar.
Depois gere código completo por arquivo.
Não crie arquivos com mais de 250 linhas sem justificar.
Não implemente regra de negócio que não foi pedida.
Ao final, entregue checklist de validação e comandos para testar.
```
