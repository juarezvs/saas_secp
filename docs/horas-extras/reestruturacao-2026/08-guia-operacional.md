# Operação das campanhas de serviço extraordinário

## Acesso e responsabilidades

Abra **Horas extras → Campanhas e projetos** (`/horas-extras/campanhas`). A lista de projetos fica em `/horas-extras/projetos`, com filtros pesquisáveis e paginação. Órgãos e unidades inativos não participam das consultas e operações.

| Responsabilidade | Permissão existente utilizada |
|---|---|
| Campanha e limite documentado de horário especial | `horas-extras:configurar-politica` |
| Apresentação, início e comprovação pelo titular | `horas-extras:solicitar` e vínculo de chefia da unidade; administrador de configuração pode preparar o cadastro |
| Análise administrativa | `horas-extras:analisar`, com vínculo de chefia quando aplicável |
| Alocação, descentralização, reserva e complementação | `horas-extras:responder-orcamento` |
| Autorização, homologação, decisão documental e conversão | `horas-extras:deliberar` |
| Apuração de marcações | `horas-extras:reprocessar` — leitura de execução não permite esta mutação |
| Validação RH de rubricas e histórico remuneratório | `horas-extras:validar-rubrica` e `horas-extras:validar-remuneracao` |
| Cálculo/liberação financeira | `horas-extras:gerar-lote` |
| Fechamento do lote | `horas-extras:fechar-lote` |

A permissão de ação não dispensa o escopo do órgão. O participante consulta seus próprios itens; dados da base remuneratória aparecem somente a perfis financeiros admitidos. O SECP reutiliza o perfil ativo e os vínculos institucionais, sem criar contas paralelas de usuários.

## 1. Cadastrar e ativar a campanha

Em **Nova campanha**, informe órgão, exercício, código, nome, processo e documento SEI, período de execução, prazos, finalidade, critérios e unidades. A ordem das análises pode ser administrativa/orçamentária ou orçamentária/administrativa, sempre com decisão da autoridade ao final.

Os valores de referência são planejamento. A campanha nasce em **Rascunho**, com alocação, descentralização, reserva e execução financeira zeradas. O rascunho pode ser editado enquanto não possuir projetos ou movimentos. Depois de conferir o cadastro, use **Ativar campanha**, com justificativa.

Os valores e prazos da SJAM 2026 não se aplicam automaticamente à SJRR ou a outros órgãos. A minuta documental de 2026 preserva as referências e pendências dos documentos fornecidos; não presume vigência de execução nem crédito recebido.

## 2. Registrar os atos financeiros

Na campanha, registre separadamente **Alocar recursos** e **Registrar crédito descentralizado**, vinculando cada ato ao documento SEI. A disponibilidade é o menor valor entre alocação e descentralização, menos reservas e execução financeira. Remanejamentos distinguem alocação de crédito recebido e não movimentam parcelas comprometidas.

As reservas são vinculadas à versão do projeto e são feitas na análise orçamentária. Se o cálculo posterior exceder a estimativa, a área competente pode **Complementar reserva do projeto**, desde que exista cobertura livre. Cancelamento, indeferimento, retificação e reconhecimento parcial liberam as parcelas correspondentes, com novos lançamentos na razão.

Execução financeira na razão é consumo do recurso reservado; não confirma que houve pagamento em folha.

## 3. Apresentar o projeto coletivo

Use **Novo projeto coletivo**. O formulário possui cinco etapas: identificação, justificativa, servidores/horários, conferência e confirmação. Inclua itens por servidor e data, com atividade, modalidade, intervalo e estimativa. A lotação deve ser válida para o serviço proposto.

O cadastro verifica jornada, afastamentos, limites e sobreposição. No envio e na autorização, lotação, afastamentos, jornada e calendário são novamente conferidos. A antecedência insuficiente exige justificativa de urgência para decisão expressa da autoridade. Um rascunho salvo não está autorizado.

O serviço que atravessa meia-noite é desdobrado em datas civis, com tipos de dia e limites próprios, conservando o custo estimado total. No horário especial, a área competente precisa registrar a referência da Junta e o limite extraordinário aplicável, sem armazenar diagnóstico clínico.

## 4. Analisar e autorizar

Abra o projeto e use **Próxima etapa**. Ações e transições são verificadas no servidor. A área orçamentária reserva apenas os itens em pecúnia. Na decisão, informe os minutos e a justificativa de cada item; zero representa indeferimento daquele item.

Autorização parcial libera a diferença não deferida. As autorizações administrativas existentes são geradas por competência e guardam vínculo com a versão do projeto. Elas podem ser consultadas na SECAP, mas suas etapas de campanha são realizadas pelo projeto, evitando contornar decisões e reservas pelo fluxo anterior.

Devoluções e indeferimentos possuem motivo e documento. **Criar nova versão** preserva a proposta anterior, suas decisões e autorizações. A retificação de versão autorizada deve anteceder a prestação; não reescreve serviço já realizado.

## 5. Apurar, comprovar e homologar

Depois da execução, use **Apurar marcações**. O SECP lê os registros existentes, conserva seus IDs, instantes, fontes e fusos, exclui a jornada ordinária e confronta o período autorizado. Marca ímpar, ausência ou inconsistência não produz horas automaticamente.

Se necessário, a autoridade utiliza **Tratamento documental excepcional**, informando evidências, resultados e minutos individualizados. Isso registra uma decisão separada, sem inserir marcações artificiais. Mudança do calendário após autorização exige reconhecimento documental do enquadramento.

O titular apresenta resultados e documentos, limitados à frequência apurada ou reconhecida documentalmente. São verificados o prazo da campanha e o segundo dia útil do mês seguinte. Pendência de prazo exige decisão registrada; o prazo local não dispensa automaticamente a obrigação normativa.

A autoridade homologa por item, podendo reconhecer menos horas que as comprovadas. Se nenhum item for reconhecido, pode concluir sem crédito. Os quantitativos solicitado, autorizado, apurado, comprovado e homologado permanecem separados.

## 6. Definir pagamento ou banco extraordinário

**Pagamento:** cadastre rubricas validadas e remunerações históricas em **Remuneração e rubricas**. As vigências não podem se sobrepor sem retificação explícita. A base é formada somente pelas parcelas admitidas, com documento e responsável. Promoção ou alteração de função no mês exige vigências distintas. Não é usado o bruto ou salário atual como substituto implícito.

O cálculo exige evidência do banco anterior ao serviço. Histórico ausente ou negativo bloqueia a definição financeira até comprovação apropriada. A autoridade pode registrar o demonstrativo documental da regularização anterior à prestação. Após calcular, o perfil financeiro confere os demonstrativos individuais e **Libera para folha**. O valor precisa estar coberto pelas reservas.

Retificação salarial posterior não modifica cálculos emitidos. **Recálculo financeiro versionado** preserva a memória anterior e cria outra versão, antes da inclusão em lote. Item já incluído em lote exige procedimento financeiro próprio, preservando o encaminhamento anterior.

**Banco:** após homologar, selecione explicitamente os itens a converter, o documento e a validade autorizada dentro do prazo aplicável. Não há conversão automática por falta de orçamento. Créditos extraordinários possuem fatores, origem, saldo e validade separados do banco ordinário. A fruição consome primeiro os créditos que vencem antes, verifica a permanência de pessoal e registra a folga no controle institucional de frequência.

O sistema impede dupla contagem entre crédito ordinário e horas reconhecidas como extraordinárias, inclusive em validações ordinárias posteriores à homologação.

## 7. Preparar e encaminhar à folha

Em **Folha de horas extras**, gere o lote do órgão e competência. Somente cálculos liberados da campanha são admitidos. Travas transacionais impedem incluir a mesma classificação em lotes concorrentes. Confira os itens, demonstrativos e totais e feche o lote.

As exportações disponíveis são de conferência interna. O leiaute externo ainda depende de homologação pela área de folha/SARH; o sistema não cria uma integração remuneratória inexistente e não realiza lançamento financeiro automático.

Depois da entrega manual, retorne ao projeto e use **Registrar encaminhamento à folha**, informando o documento que comprova o encaminhamento. O sistema exige os respectivos lotes fechados. Esse registro conclui o fluxo do projeto, sem afirmar que o pagamento foi efetivado.

## Ativação e manutenção

As rotinas exigem `HORAS_EXTRAS_CAMPANHAS_ENABLED=true` e lista explícita em `HORAS_EXTRAS_CAMPANHAS_ORGAOS`. A ativação local para testes não constitui homologação institucional nem ativa produção.

Aplicar as migrations com `prisma migrate deploy`, após backup. Não usar reset, exclusão de históricos ou seed global para atualização. O seed de políticas e workflows preserva os registros existentes. Os scripts `preparar-banco-teste.mjs` e `preparar-interface-teste.ts` aceitam apenas bancos locais descartáveis `secp_he_test_*`, com dados inteiramente fictícios, e não devem ser usados no banco do aplicativo.
