# Manual ilustrado de treinamento

Produzido em 17/10/2026, com telas reais da aplicação SECP `1ad4bb4`, em instância local descartável de treinamento. Nenhuma alteração funcional ou implantação foi realizada para produzir o manual.

- Entrega: `output/pdf/manual-horas-extras-secp-treinamento.pdf`, 41 páginas, 33 capturas incorporadas, sumário clicável e marcadores.
- Fonte editável: `docs/manual-horas-extras-secp-treinamento.md`.
- Conteúdo e diagramação: `scripts/docs/manual_horas_extras_conteudo.py` e `scripts/docs/gerar_manual_horas_extras.py`.
- Imagens originais: `output/pdf/assets/manual-horas-extras-2026`.
- Regeneração: `python scripts/docs/gerar_manual_horas_extras.py --render`, com ReportLab, Pillow, PyMuPDF e fonte Arial ou DejaVu Sans disponíveis.

O material atende a usuário, chefia, configuração e administração, com responsabilidades, três cenários, resultados esperados, conferências, mensagens frequentes e roteiro de avaliação.

## Captura e conferência

A instância utilizou a mesma imagem do web local, banco `secp_he_test_manual20261017`, Redis próprios e relógio controlado exclusivamente nela. Os preparadores recusaram outros bancos. Pessoas, documentos, valores, convocações e marcações são fictícios e estão assim identificados no material.

O cenário da campanha específica percorreu cadastro, orçamento, projeto, autorização, apuração, comprovação, homologação, rubrica, base histórica, cálculo de R$ 120,00, lote fechado e encaminhamento. O cenário de recesso demonstrou quatro horas homologadas, fator 2, crédito de 480 minutos e utilização integral em folga. O pedido individual foi capturado com perfil do servidor e perfil da chefia, incluindo deferimento e consulta do resultado.

As 41 páginas do PDF final foram renderizadas e inspecionadas visualmente. Foram conferidos os 39 links do sumário, os 41 marcadores, os textos e a presença das 33 figuras. A instância e seus bancos descartáveis foram removidos ao final, preservando o localhost:3000, seu banco e os demais serviços.

## Diferenças operacionais identificadas

O manual descreve o comportamento observado, sem presumir uma unificação entre fluxos:

1. **Recesso e campanha.** A campanha exige convocação publicada com escolha `PENDENTE` e status `CONVOCADO`. A tela nativa de inclusão em lote exige `PECUNIA` ou `FOLGA`. Não há nessa tela uma ação para preparar o estado pendente exigido pela campanha. A convocação pendente usada na demonstração foi preparada por carga fictícia isolada; esse pré-requisito e a necessidade de conciliação administrativa estão destacados no manual. O exercício não demonstra preparação integral dessa condição pela interface.
2. **Pedido individual.** A ação atual `Deferir` na chefia conclui o pedido como `APPROVED`, sem próxima etapa, e gera autorização individual. Ela não encaminha automaticamente para as etapas de orçamento e deliberação listadas no modelo configurável. O manual acompanha esse caminho real, distingue-o do projeto de campanha e não demonstra integração automática com a campanha ou com seu lote financeiro.
3. **Parâmetros e calendário.** A tela de configuração individual contém texto de ajuda que agrupa hipóteses de calendário. As campanhas possuem validações próprias e não tratam ponto facultativo automaticamente como adicional de 100%. O manual orienta conferir a versão e o enquadramento utilizados.

Esses pontos devem ser considerados em homologação e em eventual ajuste funcional posterior. A produção não foi modificada durante esta elaboração.
