# Integração operacional de campanhas

Trabalho iniciado em 17/10/2026, a pedido do usuário. O aceite exige navegação e execução completas, não apenas serviços ou tabelas.

## Contrato de integração

- Campanha e orçamento reutilizam a razão financeira já implementada.
- Projeto coletivo possui versões fechadas e itens por servidor/data/intervalo. Retificação nunca altera uma versão autorizada.
- Autorização da campanha gera as autorizações administrativas existentes, com vínculo explícito de proveniência. Frequência e folha continuam usando os módulos institucionais.
- Toda decisão usa sessão, ação, órgão e unidade; leitura própria não permite consultar salários de terceiros.
- Reserva, decisão e auditoria devem ser atômicas. Consumo financeiro não substitui homologação nem confirma pagamento.
- Frequência vem das marcações existentes. Pendências exigem tratamento documentado, sem criar marcações artificiais.
- Remuneração administrativa documentada e validada supre a ausência de integração histórica; nenhum salário atual substitui silenciosamente o histórico.
- Encaminhamento à folha é manual e documentado até homologação de leiaute externo. Exportação interna não é pagamento.

## Critério de conclusão

Implementação, migrations aditivas, testes PostgreSQL concorrentes, testes de interface, documentação e versão atualizada em localhost:3000. Documentos e decisões institucionais pendentes devem aparecer como impedimentos específicos, sem regras presumidas. Não publicar em produção durante este trabalho sem uma instrução de implantação.

## Registro do ambiente

A migration `20261017190000_horas_extras_campanhas_orcamento` foi aplicada ao banco **local de desenvolvimento** em 17/10/2026, após backup. O localhost foi reconstruído no commit `e33d2b0`; as flags novas permaneciam desativadas. Isso atualiza a fotografia anterior do README e do relatório do incremento 2.
