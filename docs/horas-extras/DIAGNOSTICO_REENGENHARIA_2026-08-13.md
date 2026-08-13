# Diagnostico de Reengenharia - Horas Extras

Data: 2026-08-13

## Contexto Encontrado

O SECP ja possui um modulo `src/modules/horas-extras` com fluxo baseado em solicitacao do servidor, analise de chefia, parecer orcamentario, deliberacao final, autorizacao e lote de folha.

Esse fluxo nao atende integralmente ao novo requisito, porque a rotina operacional principal passa a ser o cadastro pela SECAP de uma autorizacao administrativa ja formalizada, com servidores autorizados, intervalos rastreaveis, atesto, calculo financeiro temporal e preparacao para folha.

## Arquivos E Estruturas Mantidos

- `Servidor`, `Usuario`, `UnidadeOrganizacional`, `Orgao`, `Lotacao` e `GestorUnidade` continuam sendo as referencias de identidade, lotacao e hierarquia.
- `Marcacao` e `MarcacaoBruta` devem continuar imutaveis como fonte de ponto.
- `ApuracaoDiaria`, `BancoHorasSaldo`, `MovimentoBancoHoras` e `AutorizacaoBancoHoras` devem ser consultados pela nova pipeline, sem duplicar a mesma fracao temporal.
- `AuditoriaEvento` deve ser usado para registrar criacao, versoes, ajustes, atesto, calculo, lote e pagamento.
- `src/modules/contracheque` e `src/modules/integracoes/sarh` devem ser reutilizados como infraestrutura para remuneracao de contracheque e historico remuneratorio.
- `src/shared/reporting` e `src/shared/export` devem ser usados para PDF/CSV e relatorios.

## Arquivos A Modificar

- `prisma/schema.prisma`: substituir ou complementar os modelos `Overtime*` atuais por entidades orientadas a autorizacao SECAP, servidor autorizado, execucao, classificacao, atesto, calculo, snapshot remuneratorio e lote.
- `prisma/seed.ts`: ajustar permissoes e menus para SECAP, gestor, servidor e folha.
- `src/modules/horas-extras/application/services`: centralizar maquina de estados, classificacao temporal, compensacao de debito, limites, atesto e calculo financeiro.
- `src/modules/horas-extras/infrastructure/repositories`: criar repositorios para autorizacoes administrativas, execucao, classificacoes, atestos, calculos e lotes.
- `src/app/(app)/horas-extras`, `src/app/(app)/gestao/horas-extras`, `src/app/(app)/folha/horas-extras`: alterar as telas para consumir a nova autorizacao administrativa.
- `src/modules/menus/domain/menu-catalogo.ts`: trocar o fluxo principal de "Minhas horas extras"/solicitacao para consultas e autorizacoes conforme perfil, preservando acesso legado somente se necessario.

## Arquivos A Substituir Ou Desativar

- Acoes de solicitacao antiga em `src/modules/horas-extras/application/actions/criar-solicitacao-horas-extras.action.ts` e `excluir-rascunho-horas-extras.action.ts` devem deixar de ser o mecanismo operacional principal.
- Telas de solicitacao antiga em `src/app/(app)/horas-extras/nova` devem ser removidas, redirecionadas ou convertidas para consulta do servidor.
- O calculo antigo baseado apenas em `ApuracaoDiaria.minutosCredito` nao deve ser usado para pagamento.

## Incremento Implementado Nesta Etapa

- Criado servico de classificacao temporal por intervalo em `src/modules/horas-extras/application/services/classificar-execucao-horas-extras.service.ts`.
- Criada maquina de estados explicita em `src/modules/horas-extras/domain/maquina-estados-horas-extras.ts`.
- Criada segmentacao remuneratoria temporal em `src/modules/horas-extras/application/services/segmentar-remuneracao-horas-extras.service.ts`.
- Criada persistencia inicial da rotina SECAP em `autorizacoes_horas_extras`, `autorizacoes_horas_extras_servidores`, `autorizacoes_horas_extras_regras`, `horas_extras_execucoes_intervalos`, `horas_extras_classificacoes_intervalos`, `horas_extras_atestos` e `horas_extras_eventos`.
- Criada action server-side para registrar autorizacao administrativa com validacao, snapshot e auditoria.
- Criada tela inicial `/secap/horas-extras/autorizacoes` para consultar autorizacoes cadastradas pela nova rotina.
- Criada tela `/secap/horas-extras/autorizacoes/nova` para cadastro de autorizacao SECAP com multiplos servidores.
- Criado processamento inicial da execucao a partir de `Marcacao`, sem alterar marcacoes brutas, gravando `horas_extras_execucoes_intervalos` e `horas_extras_classificacoes_intervalos`.
- Criado atesto com bloqueio para servidores pendentes e snapshot dos totais classificados.
- Criado motor financeiro puro para calcular valores por vigencia remuneratoria, divisor e percentual configurado.
- Criada porta `RemuneracaoProvider` e provider real `ContrachequeSarhRemuneracaoProvider`, usando o contracheque SARH do servidor como fonte da remuneracao bruta da competencia.
- Criada persistencia de calculo financeiro em `horas_extras_calculos`, `horas_extras_calculos_itens` e `horas_extras_remuneracoes_snapshots`, com memoria de formula, politica, rubricas de rendimento e documento de contracheque consultado.
- Criada action/botao para calcular autorizacoes atestadas a partir da tela SECAP, atualizando a autorizacao para `CALCULADA`.
- Ajustada geracao de lote de folha para consumir `HoraExtraCalculo` e `HoraExtraCalculoItem`, carregar valores calculados, preservar `calculoId`/`calculoItemId` no metadata e mover autorizacoes para `PRONTA_PARA_FOLHA`.
- Criado PDF do atesto em `/api/horas-extras/atestados/[autorizacaoId]/pdf`, a partir do snapshot assinado pelo gestor.
- Criados relatorios CSV analitico e sintetico em `/api/horas-extras/relatorios/analitico` e `/api/horas-extras/relatorios/sintetico`.
- Criado layout CSV consolidado de folha via `/api/horas-extras/folha/[id]/export?layout=oficial`.
- Parametrizada a base remuneratoria por `HORAS_EXTRAS_RUBRICAS_BASE_CONTRACHEQUE`: quando preenchida, soma apenas as rubricas configuradas; quando vazia, usa o total bruto do contracheque e registra esse criterio no snapshot.

Ainda dependem das proximas etapas: validacao do leiaute oficial definitivo da folha junto ao destino externo e remocao controlada do fluxo legado.

## Regras Ja Cobertas Por Teste

- Debito antes de hora extra.
- Debito maior, igual ou menor que a execucao.
- Faixa permitida antes/depois.
- Excedente ao limite autorizado.
- Data fora do periodo.
- Datas especificas autorizadas.
- Limite por tipo de dia.
- Impossibilidade de dupla classificacao da mesma fracao.
- Estados globais da autorizacao sem transicoes arbitrarias.
- Calculo por vigencia remuneratoria, inclusive data exata da nova vigencia.
- Falha explicita quando nao ha remuneracao vigente.
- Calculo financeiro por percentual de tipo de dia e remuneracao vigente.
- Falha explicita quando falta regra financeira.

## Pendencias Institucionais

- Percentuais, divisor, rubricas de folha, arredondamento, minimo remuneravel e regras financeiras finais continuam vindo da politica existente do modulo, sem valores inventados.
- A remuneracao-base agora vem do contracheque SARH. Por padrao usa `totais.bruto`; se `HORAS_EXTRAS_RUBRICAS_BASE_CONTRACHEQUE` estiver preenchida com codigos separados por virgula, usa apenas essas rubricas de rendimento e registra o criterio no snapshot.
- A migracao de dados legados deve ser feita sem apagar registros atuais; se nao houver dados suficientes, os registros devem ser marcados como legado.
