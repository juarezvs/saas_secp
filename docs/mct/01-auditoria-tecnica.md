# MCT-SECP - Auditoria tecnica inicial

## Estado atual

O SECP usa Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL, Zod,
BullMQ e Vitest. Os modulos seguem, em geral, as camadas `domain`,
`application`, `infrastructure` e `presentation`.

O calculo oficial atual esta concentrado nos seguintes fluxos:

- `jornadas/application/services/resolver-previsao-jornada-dia.service.ts`:
  resolve a jornada vigente e a previsao do dia.
- `calendario-institucional/application/services/classificar-dia-institucional.service.ts`:
  classifica feriados, suspensoes e efeitos parametrizados.
- `marcacoes/application/services/normalizar-marcacoes-sem-intervalo.service.ts`:
  trata marcacoes operacionais sem intervalo explicito.
- `apuracao/application/services/calcular-apuracao-diaria.service.ts`:
  calcula carga, trabalho, intervalo, credito, debito e ocorrencias.
- `recalculo/application/services/recalcular-dia-servidor.service.ts`:
  coordena a leitura e a persistencia da apuracao oficial.
- `recalculo/application/services/regerar-banco-horas-mes.service.ts`:
  converte apuracoes e autorizacoes em movimentos de banco de horas.
- `homologacao/application/services/validar-pendencias-homologacao.service.ts`:
  valida a competencia antes da formalizacao.

O Espelho de Ponto e composto pela pagina
`src/app/(app)/espelho-ponto/page.tsx` e pelos componentes do modulo
`apuracao/presentation`. Ele deve continuar sendo a interface consolidada.

## Limites de responsabilidade

O MCT sera um dominio independente. O nucleo nao importa Prisma, React,
Next.js, filas nem servicos do espelho. Adaptadores de aplicacao converterao
os cadastros existentes em entradas do motor.

Enquanto o modo for `LEGACY` ou `SHADOW`, o MCT nao pode:

- atualizar `apuracoes_diarias`;
- criar movimentos em `banco_horas_movimentos`;
- alterar marcacoes originais;
- alterar homologacoes;
- produzir efeitos financeiros ou administrativos.

## Pontos de integracao planejados

1. Adaptador de jornada e calendario, somente leitura.
2. Adaptador de marcacoes e eventos administrativos, preservando IDs de origem.
3. Execucao persistida e idempotente em schema proprio.
4. Comparador entre resultado legado e MCT no modo `SHADOW`.
5. Consulta dos resultados pelo Espelho de Ponto.
6. Ativacao `MCT` apenas por escopo explicitamente autorizado.

## Riscos e controles

| Risco | Controle inicial |
| --- | --- |
| Dupla contagem | Intervalos semiabertos e teste de conservacao temporal |
| Dupla destinacao | Destinacao separada do tempo trabalhado |
| Resultado nao reproduzivel | Entrada canonica, versao de politica e execucao deterministica |
| Regra juridica inventada | Politicas declarativas; excedente permanece pendente por padrao |
| Alteracao de mes homologado | Adaptador devera recusar escrita e gerar nova execucao historica |
| Vazamento entre orgaos | `orgaoId` obrigatorio em politica e execucao persistida |
| Acoplamento ao espelho | Dominio MCT sem dependencia de UI |

## Decisoes pendentes de validacao

- escopos administrativos autorizados a publicar politicas;
- catalogo juridico definitivo de rubricas;
- criterios oficiais de bloqueio da homologacao;
- estrategia de retencao das entradas e memorias de calculo;
- momento e escopo do primeiro piloto em `SHADOW`.

## Persistencia da fundacao

As tabelas da fundacao usam o prefixo `mct_` no schema PostgreSQL `public`.
O projeto Prisma atual nao utiliza multiplos schemas; adotar um schema fisico
`mct` exigiria declarar `@@schema` em todo o modelo legado. O prefixo oferece
isolamento aditivo sem ampliar o risco da primeira etapa.

Foram definidos registros separados para:

- versoes imutaveis de politicas e rubricas;
- execucoes por orgao, servidor, data, politica, entrada e modo;
- snapshots dos eventos de entrada;
- segmentos temporais;
- fatos de conformidade;
- rubricas aplicadas e memoria de calculo.

A chave de execucao impede que a mesma entrada seja persistida duas vezes. O
repositorio inicial aceita exclusivamente resultados `SHADOW` e nao possui
dependencias ou operacoes sobre apuracao, banco de horas ou homologacao.

### Prova controlada no desenvolvimento

Uma execucao com marcacoes reais do servidor `AM200401`, em 25/09/2026,
produziu 431 minutos trabalhados, 11 minutos de excedente pendente e nenhum
credito reconhecido. Antes e depois da execucao permaneceram inalteradas as
398 apuracoes oficiais e os 177 movimentos de banco de horas desse servidor.

## Relogios e planejamento

O Planejador Temporal usa um ciclo generico de N dias. Escalas 5x2, 6x1,
5x1, 12x36 e ciclos personalizados sao dados diferentes para o mesmo
algoritmo. Ocorrencias aplicam efeitos explicitos e ordenados por prioridade.

O Relogio de Jornada separa:

- trabalho efetivo;
- exercicio reconhecido;
- falta quantitativa;
- debito administrativamente reconhecido;
- excedente bruto;
- credito reconhecido;
- excedente ainda pendente.

Credito e debito reconhecidos sao zero por padrao. Uma quantidade somente e
reconhecida quando fornecida explicitamente por uma etapa administrativa ou
regra publicada. O Relogio de Conformidade registra entrada tardia, mas a
classifica como compensada apenas quando a politica permite compensacao no
dia e o Relogio de Jornada confirma o cumprimento integral da carga.

## Classificacao multidimensional

O classificador executa uma DSL fechada com comparacoes, composicao `E`, `OU`
e `NAO`. Os efeitos permitidos se limitam a aplicar uma rubrica cadastrada a
um escopo temporal, usando quantidade constante ou um campo numerico do
contexto. Nao ha execucao de JavaScript, `eval` ou formulas livres.

Rubricas de dimensoes diferentes podem coexistir sobre o mesmo intervalo sem
que suas quantidades sejam somadas como tempo adicional. Grupos de
exclusividade sao resolvidos por precedencia. Empates e duas destinacoes
concorrentes sem precedencia produzem conflito administrativo e nenhuma das
destinacoes e aplicada.

Rubricas que exigem autorizacao ou homologacao permanecem com status
pendente. Mesmo quando a rubrica declara efeito de credito, debito ou
compensacao, o modo `SHADOW` apenas registra a classificacao nas tabelas MCT.
Ele nao cria movimentos no banco de horas.

Na prova de persistencia com `AM200401`, os 11 minutos excedentes receberam a
rubrica `DST-EXCEDENTE-PENDENTE`, em estado pendente de homologacao e sem
destinacao financeira. As contagens oficiais continuaram inalteradas.

## Comparacao em Shadow Mode

O comparador recebe um snapshot da apuracao oficial e o resultado quantitativo
do MCT. Ele compara jornada prevista, tempo trabalhado, credito e debito, sem
alterar nenhum dos lados. Divergencias de credito ou debito sao destacadas
como criticas porque podem representar efeito administrativo distinto; essa
severidade e diagnostica e nao modifica o resultado oficial.

O modo padrao e `LEGACY`. `SHADOW` precisa ser solicitado pelo chamador. O modo
`MCT` permanece bloqueado sem autorizacao explicita e nao pode reprocessar
oficialmente uma competencia homologada.

Na comparacao de desenvolvimento do dia 25/09/2026 para `AM200401`, o legado
reconheceu 11 minutos de credito, enquanto o MCT conservador manteve zero
credito e 11 minutos pendentes. A divergencia foi registrada exclusivamente
em `mct_comparacoes_legado`; as 398 apuracoes e os 177 movimentos oficiais
permaneceram inalterados.

## Analise da Jornada no Espelho

O Espelho de Ponto passou a consumir, em modo estritamente de leitura, a
execucao `SHADOW` mais recente de cada dia. A consulta exige simultaneamente
o orgao e o servidor que ja foram autorizados pelo escopo da pagina, evitando
consulta cruzada entre organizacoes.

A acao diaria abre um drawer responsivo com resumo quantitativo, linha do
tempo, eventos utilizados, fatos de conformidade, rubricas, fundamento
normativo, memoria explicavel, comparacao com o legado, identificadores de
auditoria e historico de reprocessamentos. Dias ainda nao processados exibem
um estado vazio e nao iniciam calculo implicitamente.

Essa integracao nao altera os valores exibidos na tabela, nao interfere na
homologacao e nao grava apuracao ou movimentos de banco de horas. O legado
permanece como unica fonte oficial nesta fase.

## Pre-validacao paralela da competencia

O modal de assinatura apresenta uma pre-validacao MCT identificada como
diagnostico `SHADOW`. Ela consolida a cobertura dos dias apurados e sinaliza
marcacoes incompletas, conflitos de classificacao, rubricas pendentes,
excedentes sem destinacao e divergencias criticas em relacao ao legado.

Essa lista nao e enviada para a action de homologacao, nao bloqueia a
assinatura e nao substitui `validarPendenciasHomologacaoServidor`. A validacao
legada no backend permanece integralmente responsavel pelos totais e
pendencias oficiais. Essa separacao permite validar a futura consolidacao sem
misturar resultados dos dois motores.

