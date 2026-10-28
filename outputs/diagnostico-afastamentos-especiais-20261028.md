# Afastamentos especiais no espelho — 28/10/2026

## Resultado

Causa confirmada: o SECP não consultava `SARH.RH_FREQUENCIA_ESPECIAL`, que contém as viagens a serviço exibidas como afastamentos especiais no SARH de produção.

A verificação usou as credenciais cadastradas no PostgreSQL de produção para a integração SARH do órgão da AM200401, seguindo o vínculo `servidores.orgao_id -> integracoes_sistemas.orgao_id`. A conexão identificou banco JFAM, serviço `jfam.trf1.gov.br`. Nenhuma credencial foi exibida ou copiada para o relatório.

A hipótese inicial de `RH_AFASTAMENTO_JUIZ` foi descartada e sua inclusão removida do código. Essa tabela está vazia na conexão consultada e não contém os registros da imagem.

## Registros confirmados

| Código | Início | Fim | Dias inclusivos |
| --- | --- | --- | --- |
| 13 | 21/10/2026 | 23/10/2026 | 3 |
| 12 | 05/10/2026 | 08/10/2026 | 4 |
| 11 | 23/08/2026 | 29/08/2026 | 7 |
| 10 | 19/08/2026 | 22/08/2026 | 4 |
| 8 | 07/06/2026 | 13/06/2026 | 7 |
| 9 | 31/05/2026 | 04/06/2026 | 5 |

O início do código 11 é 23/08, conforme o Oracle e a imagem inicial. O texto posterior do usuário mencionou 02/08.

A consulta corrigida retornou 58 eventos: os 45 das fontes anteriores e 13 viagens a serviço, sendo seis de 2026 e sete mais antigas. Os seis períodos foram confrontados automaticamente por código e datas. Todos os identificadores retornados são distintos. O PostgreSQL do SECP não continha registros dessa fonte para o servidor.

## Alteração local

- Inclui `RH_FREQUENCIA_ESPECIAL` na consulta unificada, com o mesmo escopo de matrícula, seção e funcionário dos demais eventos.
- Importa `FREQ_TIPO = '1'`, confirmado como viagem a serviço pelo confronto com os registros da imagem. Outros tipos dessa tabela não são convertidos em afastamento; ela também contém campos de teletrabalho.
- Usa identificador estável `AFASTAMENTO_ESPECIAL:<seção>:<funcionário>:<código>`, categoria `AFASTAMENTO_ESPECIAL`, descrição `VIAGEM A SERVICO`, datas, dias inclusivos, observação e número do processo SEI.
- Mantém `tipoCodigo` nulo: `FREQ_TIPO` não é código do catálogo `RH_TIPO_AFASTAMENTO`, evitando vincular viagem ao tipo 1 de outro cadastro.
- O fluxo de login já solicita o endpoint de afastamentos e não exige um novo endpoint. A mensagem de espelho atualizado podia aparecer porque o processamento terminava com sucesso sobre um conjunto incompleto de fontes.

## Validação e estado

26 testes aprovados em quatro arquivos. Os testes do espelho cobrem maio, junho, agosto e outubro, os períodos consecutivos, fins inclusivos, finais de semana e a viagem que cruza maio/junho, com zero débito nos dias abrangidos, mesmo ao consultar após o término.

A consulta SQL alterada foi executada com sucesso no Oracle de produção. Consultas externas foram somente de leitura. Não houve implantação, sincronização com gravação, inserção manual de afastamentos ou recálculo em produção. A alteração precisa ser publicada e a sincronização executada para que esses registros sejam importados.
