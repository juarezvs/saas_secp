# Auditoria de horas extras — 17/10/2026

## Escopo e evidências

Auditoria do código em `bda8c59`, sem acesso de escrita à produção. A proposta nova prevalece sobre o diagnóstico de 13/08/2026, que priorizava o cadastro SECAP de autorizações externas. Os dois fluxos existentes precisam continuar legíveis durante a transição. Este documento não homologa regras jurídicas nem certifica dados de produção.

Foram examinados o schema Prisma, os serviços, actions, repositories, componentes e rotas do módulo `src/modules/horas-extras`, os pontos de integração com calendário, banco de horas, MCT, frequência, contracheque/SARH, recesso, permissões e auditoria. A suíte inicial do módulo passou: **8 arquivos, 34 testes**, `npx vitest run src/modules/horas-extras --maxWorkers=1`.

## AS-IS

| Área | Implementação encontrada | Reutilização e lacuna |
|---|---|---|
| Arquitetura | Next.js App Router, TypeScript, Prisma/PostgreSQL, módulos domain/application/infrastructure/presentation | Manter a arquitetura efetiva; não criar outro controle de ponto. |
| Solicitações | `OvertimeRequest`, `OvertimeRequestDay`, histórico, política e workflow versionados; `criar-solicitacao-horas-extras.action.ts` | Um servidor por solicitação; falta projeto coletivo apresentado pelo titular, campanha e retificação imutável. Atualização de rascunho substitui dias. |
| SECAP | `AutorizacaoHoraExtraAdministrativa`, servidores/regras, formulários e repositories próprios | Recebe documento já autorizado, sem vínculo obrigatório com solicitação ou campanha. Preservar sua origem e versões históricas. |
| Workflow | `OvertimeWorkflow*` e máquina de estados de autorização SECAP | Dois ciclos de vida; actions ainda usam etapas fixas, como `ANALISE_CHEFIA`. É necessário contrato único entre aprovação administrativa e execução. |
| Orçamento | `OvertimeBudgetReview` registra parecer e valores | Parecer não é razão de movimentações. Não há conta de campanha/unidade com reserva atômica, descentralização e remanejamento. |
| Limites | `validar-solicitacao-horas-extras.service.ts` | Limite mensal soma toda a solicitação, mesmo atravessando meses; não aplica o anual informado no tipo. Não agrega outras autorizações/campanhas. |
| Calendário | Action classifica datas com calendário institucional | Reutilizar feriados e abrangência. A classificação de execução infere dias da semana quando falta regra por data; feriados e ponto facultativo podem divergir. |
| Apuração | `processar-execucao-autorizacao-horas-extras.service.ts`, classificador puro e tabelas de intervalos | Usa marcações válidas, mas emparelha lista inteira, descarta pares de dias diferentes e intervalos noturnos; par incompleto pode deslocar pares posteriores. Não demonstra exclusão da jornada ordinária pelo classificador. |
| Débito anterior | Processamento lê `BancoHorasSaldo.saldoMinutos` atual e consome primeiros intervalos como débito | Não comprova saldo histórico do mês nem compensação anterior à data do serviço, exigida pelo art. 46-A. O saldo atual não pode certificar essa condição. |
| Banco ordinário | Módulo `banco-horas`, classificação, FIFO, autorizações e expiração configurável; limite padrão 16h e três meses | Reutilizar infraestrutura, mas não aplicar esses limites aos créditos extraordinários do art. 50-A. Registro extraordinário deve ter regime, origem, decisão, fator e validade próprios. |
| MCT | Adapter de jornada, classificação, simulação e comparação shadow | Manter como classificador/parametrizador, subordinado à jornada vigente; não transformar configuração em autorização de pagamento. |
| Recesso | `RecessoForense`, convocação, convocados, espelho e homologação próprios | Reutilizar convocação; exceção de limites deve estar vinculada ao serviço de 20/12 a 06/01, não ao mês inteiro nem a um rótulo livre. |
| Remuneração | Provider Oracle de contracheque, interface `RemuneracaoProvider`, segmentador temporal e snapshots | Provider fornece uma base mensal para o mês inteiro. Não comprova promoção/função intramês. Nenhum endpoint histórico novo foi confirmado. |
| Rubricas | Variável `HORAS_EXTRAS_RUBRICAS_BASE_CONTRACHEQUE` | Sem variável, provider usa **total bruto**. Lista de códigos não equivale a cadastro jurídico com vigência e validação do RH. Rubricas de saída `HE_50/HE_100` são códigos internos, não leiaute SARH homologado. |
| Cálculo | Serviço puro, valores em centavos, persistência de memória e vigências | Usa ponto flutuante; aceita remuneração sobreposta escolhendo a primeira; precisa rejeitar ambiguidade e usar aritmética decimal. Política consultada no primeiro dia do mês não resolve mudança intramês. |
| Comprovação | Classificações e `HoraExtraAtesto` com snapshot; geração PDF | Atesto não substitui todas as etapas de comprovação/resultados/homologação parcial com assinaturas e prazo do art. 49. |
| Folha | `HoraExtraCalculo*`, lote, linhas, checksum e fechamento | Unicidade da linha é apenas por lote + classificação; não garante ausência de duplicidade entre lotes concorrentes. Geração e cálculo fazem verificações fora da transação. |
| Relatórios | Analítico/sintético, atesto PDF, CSV detalhado e agregado `layout=oficial` | Exportação agregada recebe nome oficial apesar de documentação antiga reconhecer falta de homologação. Faltam todos os filtros de campanha/regime e XLSX com controle de exposição. |
| Segurança | `exigirPermissao`, perfil ativo, próprios/chefia/seccional/global, `AuditoriaEvento` e `HoraExtraEvento` | Reutilizar. Action de cálculo permite `visualizar-folha` realizar mutação; não transmite escopo do órgão ao serviço. Escopo vazio não pode significar global. |
| Integridade | Vários snapshots e referências `Restrict` | Também existem `Cascade` no histórico, decisões e itens. Não remover tabelas nem reprocessar registros pagos para impor modelo novo. Não existe imutabilidade global garantida por trigger/constraint. |

## Riscos priorizados e correções

| ID | Gravidade | Evidência/arquivo relativo a `src/modules/horas-extras` | Tratamento |
|---|---|---|---|
| R01 | Crítica | `infrastructure/integrations/contracheque-remuneracao.provider.ts`: fallback `TOTAL_BRUTO_CONTRACHEQUE` | Bloquear nova base sem rubricas explícitas; cadastro com vigência/RH antes de homologação financeira. |
| R02 | Crítica | `application/services/processar-execucao-autorizacao-horas-extras.service.ts`: saldo atual e intervalos | Histórico do banco, compensação anterior, jornada e origem biométrica antes de reconhecimento financeiro. Não corrigir histórico automaticamente. |
| R03 | Crítica | `application/actions/gerar-lote-folha-horas-extras.action.ts`: pré-checagens e unicidade por lote | Serializar por órgão/competência e impor consumo único da classificação com backfill prévio das duplicidades. |
| R04 | Alta | `application/actions/calcular-autorizacao-horas-extras-secap.action.ts`: permissão de leitura também calcula | Exigir permissão de mutação e validar órgão dentro do serviço antes da consulta salarial. |
| R05 | Alta | `application/services/validar-solicitacao-horas-extras.service.ts`: soma global | Separar mês/ano e incluir histórico agregado no contrato; preservar políticas históricas, sem atualizar seeds antigos silenciosamente. |
| R06 | Alta | Provider mensal e segmentador que aceita sobreposição | Não inferir histórico intramês; rejeitar vigências ambíguas. Providenciar importação autorizada com evidência e validação RH. |
| R07 | Alta | `src/app/api/horas-extras/folha/[id]/export/route.ts` | Bloquear alegação de leiaute oficial não homologado; manter exportação interna identificada. |
| R08 | Alta | Sem campanha/razão financeira | Valor de referência informado não constitui crédito disponível. Campanha 2026 nasce em rascunho, sem saldo financeiro. |
| R09 | Alta | Crédito ordinário e extraordinário compartilham conceitos | Separar regimes sem alterar a rotina ordinária já utilizada; registrar consumo único por intervalo. |
| R10 | Alta | Art. 52 consolidado versus art. 75/alcance de funções | Análise jurídica explícita do adicional noturno para CJ/FC; não inventar decisão nem confundir corte local das 19h com adicional noturno federal das 22h. |
| R11 | Alta | `prisma/seed.ts` na configuração padrão e `presentation/components/horas-extras-politica-form.tsx` | Defaults ainda indicam 134h anuais; seed atualiza a versão 1 por upsert. Corrigir em migração versionada: preservar políticas referenciadas, distinguir teto institucional de teto normativo vigente e impedir reescrita por seed global. Não executar esse seed como migração corretiva. |

## Fontes e pendências

Fontes oficiais consultadas em 17/10/2026: [CJF 4 consolidada](https://www.cjf.jus.br/publico/biblioteca/Res%20004-2008.pdf), [CJF 973](https://www.cjf.jus.br/publico/biblioteca/Res_973-2025.pdf), [CJF 984](https://www.cjf.jus.br/publico/biblioteca/Res_984-2026.pdf), [Lei 8.112](https://www.planalto.gov.br/ccivil_03/leis/l8112compilado.htm). O consolidado contém versões antigas riscadas: o limite vigente é 200h anuais, não 134h; não reativar a exceção revogada do art. 45 §4º. A suspensão do sobreaviso preserva atos já praticados, não autoriza apagá-los.

Portaria local lida integralmente no arquivo `SEI_23258652_Portaria_SJAM_Diref_135.pdf` (12 páginas; efeitos desde 01/08/2025). Sua existência no projeto não certifica inexistência de alteração posterior: conferir no SEI na homologação. PDF inspecionado visualmente nos dispositivos de classificação e jornada.

**Não disponíveis para leitura integral:** Despacho SJAM-DIREF 26097342; Circular DIGES 46/2026; SEI 26096685 e 26097335. Valores de R$18.000/R$5.000 e prazos de 21/10 e 19/11/2026 vieram do pedido do usuário: parâmetros propostos, não prova de descentralização nem texto normativo verificado. Solicitação de link/texto integral encaminhada ao usuário. Eventual conflito do prazo local com o art. 49 será exibido para decisão competente, sem prorrogação implícita.

## TO-BE e sequência

Adotar a [especificação](02-especificacao.md) e a [matriz normativa](01-matriz-normativa.md). Primeiro corrigir contratos/aritmética e travas verificáveis, depois acrescentar campanha e razão orçamentária, projeto coletivo e versões, workflow integrado, apuração histórica, banco extraordinário, remuneração validada, comprovação/homologação e exportação homologada. Manter feature flags desativadas para regras locais não verificadas e novos fluxos não homologados.

O primeiro incremento não exige migration nem seed: não altera registros nem políticas históricas. As fases posteriores exigem migrations aditivas, ensaio de backfill e reconciliação antes de ativação por órgão. Não executar `migrate reset`, `db push --force-reset`, truncate ou seeds globais em produção. Produção, biométricos e serviços de descoberta ficam fora deste incremento.
