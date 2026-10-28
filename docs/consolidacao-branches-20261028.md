# Consolidação das branches — 28/10/2026

O usuário autorizou consolidar trabalhos concluídos em `main` e remover suas branches. A auditoria encontrou trabalhos pendentes; portanto, somente as entregas concluídas foram incorporadas. Nenhuma implantação, migration, seed ou alteração de dados de produção foi executada nesta consolidação.

## Incorporado em main

- Correções já publicadas em produção: SARH, afastamentos especiais, jornada computável, textos de solicitações, coletor Henry e demais alterações do histórico até `8ec1e59`.
- MCT, campanhas e orçamento de horas extras, descoberta de equipamentos e seus testes/documentação: merge `7b04f4f`, incluindo a entrega local concluída em `ec6dee6`. A conclusão técnica desses trabalhos não substitui homologação operacional nem autoriza ativar modalidades em produção.
- Histórico alternativo dos hotfixes de solicitações/Henry: merge `19c3308`. A equivalência dos patches foi conferida, e esse merge não alterou a árvore de arquivos.
- Contracheque: os três commits próprios da entrega foram incorporados separadamente, preservando o módulo facial/mobile fora de `main`:

| Original | Commit em main |
| --- | --- |
| `bb2ae4a` | `1715f7b` |
| `c56ae67` | `50dc763` |
| `c18f277` | `8e6d6db` |

Os arquivos do contracheque foram comparados com a entrega original, sem divergências. As correções recentes de afastamentos/jornada também foram comparadas com a branch de desenvolvimento, sem divergências.

## Branches removidas

| Branch | Local | Remota |
| --- | --- | --- |
| `feature/marcacao_ferias` | Removida | Não existia |
| `feature/mct-secp` | Removida | Removida |
| `feature/mct-secp-simplificacao` | Removida | Removida |
| `feature/meu-contracheque-layout` | Removida | Não existia |
| `feature/novo_espelho_ponto` | Removida | Não existia |
| `feature/novo_layout` | Removida | Não existia |
| `feature/paginacao-servidores` | Removida | Não existia |
| `hotfix/producao-afastamentos-especiais-20261028` | Removida | Removida |
| `hotfix/producao-utf8-coletor-20261027` | Removida | Removida |
| `hotfix/solicitacoes-utf8-coletor-henry-20261027` | Removida | Removida |

Total: dez branches locais e cinco remotas. Antes da remoção, o conteúdo concluído foi publicado em `main`. As remoções remotas foram atômicas, protegidas pelos SHAs conferidos. As branches locais estavam integralmente contidas em `main`, exceto a de contracheque: seus três patches próprios estavam equivalentes em `main`, e todo o histórico original continuava alcançável pela branch pendente `feature/secp-app-external-lab`.

Os worktrees dos hotfixes concluídos ficaram em HEAD destacado, sem remoção de diretórios, arquivos privados ou configurações ignoradas pelo Git.

## Branches preservadas por pendências

| Branch | Motivo |
| --- | --- |
| `feature/secp-face-engine-mobile` | Engenharia e homologação ainda pendentes, conforme `docs/face-engine-mobile/03-homologacao-e-pendencias.md`: cadastro guiado, validação offline, interface administrativa, testes físicos e outras etapas. |
| `feature/secp-app-external-lab` | Continuação do laboratório/mobile; conserva o histórico original das entregas e as pendências faciais, inclusive validação física do fluxo no aparelho. |
| `hotfix/conversao-excedente-banco-horas` | Apesar de seu último commit já estar em `main`, o worktree `secp-hotfix` possui treze arquivos modificados sem commit. Esses arquivos não foram incorporados nem alterados. A branch remota também foi preservada. |

Os três relatórios não rastreados do workspace principal e os scripts não rastreados dos worktrees de releases foram preservados.

## Validação da versão consolidada

- Vitest: 625 testes aprovados em 121 arquivos, excluindo os arquivos `*.integration.test.ts` que exigem infraestrutura própria.
- TypeScript: `tsc --noEmit` aprovado, com Prisma gerado a partir do schema consolidado.
- ESLint: módulo e rotas do contracheque aprovados.
- Serviço Python de descoberta: 35 testes aprovados e um teste PostgreSQL ignorado por exigir banco isolado; testes executados em SQLite temporário.
- Ruff do serviço de descoberta aprovado.
- `git diff --check` aprovado. As 1.181 versões de dependências do lockfile foram comparadas com o ambiente utilizado, sem divergências.
- Nenhum PR aberto foi encontrado no repositório durante a auditoria.

`main` foi validada em worktree separado (`secp-main`). O workspace principal permanece na branch de laboratório para preservar o contexto do trabalho pendente. Não foi executado um novo build de publicação nesta etapa.
