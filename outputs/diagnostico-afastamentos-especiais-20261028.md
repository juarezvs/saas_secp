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

## Implantação autorizada e concluída em 28/10/2026

O usuário autorizou commit, push e implantação. Correção publicada no commit `8765ef7f1145ca015a59a4f2e286fa3edd9a51ad`, branch `hotfix/producao-afastamentos-especiais-20261028`, sobre a base de produção `e372a01`. O mesmo ajuste foi registrado na branch local de desenvolvimento como `0d57afe`.

- Conferência prévia: 1.288 arquivos de aplicação, Prisma e workers corresponderam à base `e372a01`. Um arquivo de cache de testes rastreado em `src/node_modules/.vite` foi excluído dessa comparação por não ser código de aplicação.
- Pacote do commit confirmado por SHA-256 no envio: `9f960e93a8311521bb62ae47e8a87a720539619123d1e6f65f0ad8d50fbe66f9`.
- Release ativa: `/opt/secp/releases/secp-app-prod_20261028_afastamentos_8765ef7`.
- Backup do banco: `/opt/secp/backups/secp-prod-before-prod_20261028_afastamentos_8765ef7.dump`, com 1.705.016.775 bytes. Índice lido com sucesso por `pg_restore --list` antes da publicação.
- Backup da aplicação: `/opt/secp/backups/secp-app-before-prod_20261028_afastamentos_8765ef7.tar.gz`, com 31.676.283 bytes. Mantidos os dois backups mais recentes, conforme o procedimento habitual.
- Build de produção e TypeScript concluídos com sucesso no Ubuntu. A geração de páginas estáticas emitiu tentativas de conexão com Redis em localhost no ambiente de build, mas finalizou com sucesso; os checks de Redis na aplicação publicada passaram.
- Verificação de migrations: 115 disponíveis, nenhuma pendente. Não houve reset nem execução de seed.
- Web e dez workers iniciados com as novas imagens. Fonte SARH conferida nos workers de sincronização e de login: SHA-256 `ed7de9da0c02338965c9c75c73e3b2af5eead0f6d254ce4effd340dfaed9a8cc`, igual ao arquivo do pacote. As terminações de linha do pacote diferem do blob Git, sem diferença de conteúdo após normalização.
- `/api/ready` interno e `https://secp.am.trf1.gov.br/api/ready` responderam com PostgreSQL e Redis saudáveis. A verificação pública usou a cadeia de confiança do Windows, com checagem de revogação em modo best effort; não foi desabilitada a validação de certificado. Não houve inspeção visual de sessão autenticada.

### Sincronização e espelhos da AM200401

Executado o fluxo normal de sincronização incremental, somente para a matrícula AM200401 e endpoint de afastamentos. Execução `676394c0-2ddf-40f0-ad07-a5fa860144e4`: 44 recebidos (sem férias), 13 criados, 31 atualizados, zero erros e zero conflitos. Os seis períodos de 2026 foram confrontados nos registros persistidos e estão ativos. As outras sete viagens importadas são históricas.

Solicitado recálculo pelo fluxo normal das competências 05, 06, 08 e 10/2026:

| Competência | Resultado |
| --- | --- |
| 05/2026 | ATUALIZADO |
| 06/2026 | Bloqueado: período já homologado |
| 08/2026 | Bloqueado: período já homologado |
| 10/2026 | ATUALIZADO |

Os bloqueios de homologação foram preservados; não houve reabertura nem alteração forçada de períodos homologados. As tentativas de recálculo de junho e agosto permanecem registradas como FALHA, com a mensagem de período já homologado.

A montagem real do espelho foi executada com os dados persistidos, jornadas, calendário e apurações da AM200401. Confirmou ocorrência de viagem e zero débito nos 30 dias dos seis períodos: um dia em maio, onze em junho, onze em agosto e sete em outubro. Esse resultado comprova a aplicação na montagem do espelho, inclusive nos meses cujo recálculo foi bloqueado; não equivale a alterar a homologação ou seus saldos já fechados.

## Complemento: jornada computável — publicado em 28/10/2026

Regra informada pelo usuário: viagens a serviço e concessões compensatórias integram a jornada computável e o KPI Jornada Prevista. A montagem anteriormente zerava a carga prevista de todo afastamento e mantinha apenas os minutos já existentes na apuração.

Ajuste publicado no commit `dfc6f42`, na mesma branch de produção (registro local de desenvolvimento: `bcdf11c`):

- Viagens a serviço e concessões compensatórias preservam a carga prevista do dia, obtida da jornada e do calendário, inclusive quando a apuração persistida estava com carga zero.
- A coluna Computável recebe pelo menos essa carga. Marcações parciais são completadas até a jornada, sem somar a jornada novamente a horas já computadas. Horas já superiores à carga não são duplicadas.
- O abono é identificado nos metadados do espelho por `contaComoJornada` e `minutosAbonados`. Não cria crédito adicional de banco de horas nem marcações artificiais.
- Feriados e dias sem jornada prevista não recebem horas presumidas. Jornadas de seis horas são respeitadas. Férias e licenças mantêm o tratamento anterior.
- A classificação usa as descrições normalizadas do SARH. O cadastro de produção confirmou concessões compensatórias nos tipos 28 e 51, com descrição iniciada por `CONCESSAO COMPENSATORIA`.

Validação: 46 testes aprovados em cinco arquivos, TypeScript e ESLint aprovados. Antes da ativação, a nova imagem foi validada somente por leitura dos dados de produção; a verificação foi repetida na release ativa.

Na AM200401, competência 10/2026, a jornada prevista passou de 5.040 minutos (84h) para 8.400 minutos (140h). Confirmados 420 minutos previstos e 420 computáveis em 05, 06, 07, 08 e 09/10 e em 21, 22 e 23/10, com zero débito e zero crédito adicional nesses oito dias. O período de 09/10 é concessão compensatória; os demais são viagens a serviço.

Publicação:

- Release ativa: `/opt/secp/releases/secp-app-prod_20261028_jornada_dfc6f42`.
- Pacote conferido por SHA-256: `20c4903ad459817e1205ca00fe245d94b501ad64a2d77be720280a4973671f73`.
- Backup do banco: `secp-prod-before-prod_20261028_jornada_dfc6f42.dump`, 1.705.533.930 bytes, validado com `pg_restore --list`.
- Backup da aplicação: `secp-app-before-prod_20261028_jornada_dfc6f42.tar.gz`, 48.490.507 bytes. Mantidos os dois backups mais recentes.
- Build final e TypeScript concluídos no servidor. 115 migrations disponíveis, nenhuma pendente; seed ignorado. As mensagens de Redis em localhost durante a geração estática não impediram o build; os checks do Redis real passaram após a ativação.
- Web e dez workers conferidos na nova versão. Os arquivos de efeito de afastamento e montagem do espelho foram comparados por SHA-256 com o pacote nos workers SARH e SARH de login.
- Endpoints interno e público de prontidão responderam com PostgreSQL e Redis saudáveis. Acesso público validado com a cadeia de confiança do Windows e revogação best effort, sem desabilitar validação de certificado.

Este complemento altera a montagem do espelho; não executou nova sincronização, recálculo persistente ou reabertura de competências homologadas. A verificação foi feita pelo serviço real de montagem, sem inspeção visual autenticada no navegador.
