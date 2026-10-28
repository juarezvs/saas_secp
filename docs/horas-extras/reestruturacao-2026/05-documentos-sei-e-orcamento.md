# Incorporação dos documentos SEI e contrato do orçamento

Leitura integral e inspeção visual em 17/10/2026 dos PDFs fornecidos pelo usuário. As determinações dos documentos são regras administrativas a representar no SECP, não instruções para o agente comunicar unidades, movimentar créditos reais ou conceder autorizações.

| Fonte | Identificação e integridade |
|---|---|
| Informação SEPLO 26096685 | Uma página; assinatura de 14/10/2026 16h08 Brasília; processo 0000320-27.2026.4.01.8002; CRC 06D21573; SHA-256 `68d22eda2e91c37ff77138a8b486976d6650741502bdf6f10cb7fbd013b14073` |
| Despacho SJAM-DIREF 26097342 | Duas páginas; assinatura de 14/10/2026 17h22 Brasília; mesmo processo; CRC 6F1CE3BA; SHA-256 `9b3749b58d5fc6dfaede41b5feb35fba9a466100fd9a9f63906cb225e05f7e97` |

Cópias originais lidas em `C:/Users/am200401/Downloads/`. Leitura da cópia e dos identificadores não equivale a validação criptográfica da assinatura ou conferência de autenticidade no SEI. Circular DIGES 46/2026 é identificada no despacho como SEI **25922536**; texto integral da Circular e do Encaminhamento SECAD **26097335** continuam pendentes. O e-mail SECOR **26096723** também é referência, não documento integralmente consultado.

## Conclusões documentais

1. A Informação registra suplementação de **R$250.991,00**, cuja disponibilização ocorreria nos pedidos de créditos de folha de outubro a dezembro. Não é crédito efetivamente recebido por cada unidade.
2. A mesma Informação registra **R$6.233,27 disponíveis naquela data** e **R$20.620,77 na NE2026NE000016**, estes dependentes de apuração da SEPAG quanto à execução. Não somar os três números como disponibilidade atual. Guardar como observações documentais datadas, sem gerar descentralização ou reserva automaticamente.
3. O Despacho determina alocação em **valores médios** de R$18.000 para Varas/Turma Recursal/Vara Única de Tabatinga e R$5.000 para CEJUC. Essas referências não comprovam alocação individual efetivada nem recebimento de recursos. Unidades administrativas requerem apreciação da DIREF, sem valor presumido.
4. Liberação depende das solicitações encaminhadas à DIPOR; o próprio despacho informa que o crédito ainda não estava descentralizado. Falta de descentralização pode resultar em conversão do esforço efetivo em banco, sem geração automática de crédito extraordinário pelo sistema.
5. Propostas e retificações precisam de antecedência de cinco dias úteis. Retificação exige novo formulário e análise prévia da DIREF, inclusive mudanças de datas, pessoas e horas.
6. Projetos até **21/10/2026**; comprovação até **19/11/2026**. A data local não substitui silenciosamente o segundo dia útil do art.49 da Resolução CJF4.
7. Sábado exige impossibilidade expressa de realizar em dias úteis. Domingo/feriado exige demonstrar impossibilidade de dias úteis e/ou sábados; o sistema solicitará os dois fundamentos para explicitar a análise, sem inventar autorização automática.
8. O despacho reafirma exclusão do intervalo e limites 2h úteis/44h mensais/200h anuais, registro eletrônico e planejamento de atividades não continuadas, júris e inspeções externas.
9. Saldos alocados a unidades sem projetos no prazo devem ser remanejados por decisão financeira rastreável, não por job que presuma inexistência de projeto externo ao SECP.
10. Ar condicionado central do Rio Negro depende de cinco unidades em esforço simultâneo. É condição logística: registrar aviso/planejamento, sem transformá-la automaticamente em indeferimento de horas comprovadas.

## Dúvidas explícitas para homologação

- A determinação de converter solicitações que ultrapassem o montante da unidade não esclarece se a conversão abrange a solicitação inteira ou apenas o excesso. **Não implementar rateio automático nem pagamento parcial presumido**. Encaminhar a decisão competente com memória das duas quantidades.
- Confirmar prazo federal de ficha mensal versus prazo final local da campanha. Representar ambos e sinalizar conflito.
- Valores médios não são uniformização obrigatória de toda unidade; distribuição efetiva e eventuais ajustes exigem documento.
- O saldo informado em 14/10 precisa de conciliação antes de qualquer movimentação atual. O empenho pendente não é fonte de caixa livre.

## Incremento seguinte: modelagem aditiva e razão financeira

Antes do código, fica definido o contrato técnico:

- `OvertimeCampaign`: órgão, exercício, código, nome, SEI, documento, vigência, prazos e regras documentais versionadas por snapshot; status inicial `DRAFT`.
- `OvertimeCampaignAccount`: campanha/unidade, referência separada, alocação, descentralização, reserva e execução financeira. Mesmo órgão exigido por integridade referencial composta.
- `OvertimeBudgetOperation`: chave idempotente, hash do comando, ação, usuário, perfil, justificativa, SEI e correlação. Operações de liberação/execução referenciam a reserva de origem.
- `OvertimeBudgetMovement`: lançamentos imutáveis com valor e natureza, ligados à operação e conta. Remanejamento possui duas pernas na mesma transação.
- Não preencher saldos com os números dos PDFs. Nenhum seed global de produção será executado. O modelo inicial da campanha guarda os números apenas como **informações documentais**.
- Disponível para reserva = `min(alocado, descentralizado) - reservado - executado`. Referência não participa dessa fórmula. Descentralização e alocação são atos separados.
- Reserva requer campanha ativa, escopo do órgão, documento e justificativa. Liberação/execução limitam-se ao remanescente da reserva original. Consumo financeiro não representa automaticamente homologação nem envio à folha.
- Alocação pode ser remanejada sem transferir caixa. Transferência de crédito efetivo é operação distinta e não pode criar recursos. Débito e crédito devem somar zero em cada remanejamento.
- Transação bloqueia campanha e contas em ordem determinística, revalida saldo e idempotência e grava projeções, razão e auditoria atomicamente. Histórico da razão não admite UPDATE/DELETE; correções são novos movimentos.
- Funcionalidade desativada por padrão e liberável apenas com flag e lista explícita de órgãos. Sem integração automática com folha ou banco ordinário.
- Testes de concorrência/idempotência/rollback devem utilizar PostgreSQL isolado. Unitários ou mocks não comprovam concorrência real.

Essas quatro tabelas são uma fundação financeira. Projetos coletivos, retificações, telas, homologação e integração com folha continuarão na sequência da especificação; não declarar a fase3 completa apenas pela existência da razão.
