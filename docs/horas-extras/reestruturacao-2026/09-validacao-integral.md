# Validação integral — 17/10/2026

## Entrega técnica

O módulo integra campanha, recursos por unidade, projeto coletivo versionado, análises, autorização administrativa, frequência existente, comprovação, homologação individual, remuneração histórica documentada, cálculo versionado, créditos extraordinários e encaminhamento manual à folha. Reutiliza autenticação, perfis, lotação, jornada, calendário, marcações, autorizações, atestos, cálculos e lotes do SECP.

Não foram criados registros de ponto para suprir ausências reais. Os registros fictícios utilizados nos testes ficaram exclusivamente em bancos PostgreSQL locais descartáveis `secp_he_test_*`.

## Testes automatizados

Execução com um worker Vitest, sem compilação pesada na estação:

| Conjunto | Resultado |
|---|---|
| Horas extras, banco, MCT, recesso e visibilidade | 211 testes aprovados, 37 arquivos |
| Regeneração do banco ordinário | 3 testes aprovados |
| Exportação existente da folha | 4 testes aprovados |
| Integração PostgreSQL de orçamento | 14 testes aprovados |
| Integração PostgreSQL do fluxo operacional | 32 testes aprovados |
| Total dos conjuntos distintos acima | **264 testes aprovados** |

As integrações usam dois clientes reais para verificar concorrência. Os preparadores recusam bancos que não sejam locais descartáveis; a preparação estrutural recusa banco já populado. Não executam reset. O histórico fictício pago anterior à migration permanece intacto.

### Rastreabilidade dos 34 cenários solicitados

| Cenários | Evidência |
|---|---|
| 1–3: antecedência e urgência | `fluxo-campanha.test.ts`, cinco dias úteis e exceção sujeita à decisão |
| 4–5: retificações | Integração operacional: nova versão prévia, recusa posterior, conteúdo preservado |
| 6–8: limites diário, mensal e anual | Domínio, serviços existentes e integração entre projetos concorrentes |
| 9–10: jornadas de sete e oito horas | Frequência real no domínio, exclusão da primeira extensão da jornada de sete horas |
| 11–14: sábado, domingo, feriado e ponto facultativo | Domínio de percentuais, calendário e classificações existentes |
| 15–16: intervalo e meia-noite | Domínio e integração de desdobramento por data civil, conservando a estimativa |
| 17–19: banco negativo, compensação prévia e conversão | Integração: bloqueios, decisão documental anterior, fatores, validade, FIFO e folga institucional |
| 20–22: insuficiência, descentralização e remanejamento | Integração PostgreSQL do orçamento e projeto, sem presumir crédito por valor de referência |
| 23–25: promoção, função e remuneração retroativa | Rubricas e bases por vigência; promoção intramês e substituição documental com recálculo versionado anterior ao lote |
| 26: recesso | Testes do módulo existente e domínio de convocação, limite próprio e fatores |
| 27–28: homologação parcial e cancelamento | Integração operacional, reconhecimento individual e liberação das reservas |
| 29–30: duplicidade e concorrência | Dois clientes em autorização, reserva e lote; trava de reutilização de crédito ordinário |
| 31–32: acesso e auditoria | Escopo vazio negado, chefia e unidades filhas, consulta própria, imutabilidade e rollback transacional |
| 33: relatórios | CSV/XLSX, proteção contra fórmulas, permissões e exportação de folha; exportações exercitadas no navegador |
| 34: histórico | Schema anterior, registros fictícios pagos e migrations aditivas aplicados em PostgreSQL descartável |

Os cenários são cobertos por conjuntos complementares. Essa matriz não equivale a um teste de interface independente para cada linha nem a aprovação normativa.

### Cobertura medida

V8, 71 testes de domínio, exportação e integração aprovados. Recorte explícito: `campanha-operacional.service.ts`, `credito-extraordinario.service.ts`, `gerar-lote-folha-seguro.service.ts`, `campanha-exportacao.service.ts` e `fluxo-campanha.ts`.

| Métrica | Resultado |
|---|---|
| Linhas | **96,19% — 506/526** |
| Instruções | 83,17% — 776/933 |
| Funções | 92,77% — 167/180 |
| Ramificações | 69,83% — 514/736 |

O recorte não representa cobertura de toda a aplicação ou de todas as telas. Não se declara cobertura de 100%. Relatório reproduzível em `.tmp/campanhas-final-coverage/coverage-summary.json` e log `.tmp/campanhas-final-coverage.log`.

## Validação no navegador

O roteiro `tests/e2e/horas-extras-campanha.mjs` usa Playwright e recusa localhost:3000 e bancos normais do aplicativo. A instância descartável usa recursos limitados e um relógio simulado carregado exclusivamente nela.

Na versão `1ad4bb4`, o roteiro completo passou desde a criação da campanha e indicação do titular responsável até lote fechado e encaminhamento manual documentado: duas horas fictícias, base histórica de R$ 8.000,00 e cálculo de R$ 120,00. Foram baixados PDF, CSV e XLSX; a consulta própria não recebeu demonstrativo financeiro nem ações decisórias. Nenhum erro de JavaScript foi registrado nesse percurso.

A inspeção visual incluiu o projeto concluído e a renderização do comprovante PDF, de uma página. O XLSX teve sua integridade ZIP conferida. O teste identificou e motivou a correção do envio antecipado ao avançar para a etapa de confirmação; o roteiro completo passou após essa correção.

Conferência independente no banco descartável: projeto `COMPLETED`, 120 minutos homologados, item `SENT_TO_PAYROLL`, cálculo R$ 120,00, reserva remanescente R$ 0,00 e execução financeira R$ 120,00. Isso comprova o registro de encaminhamento, sem afirmar pagamento efetivado. Evidências em `.tmp/campanha-e2e-result.json`, `.tmp/campanhas-e2e-final.log` e `.tmp/campanha-e2e-completa.png`.

## Implantação local

A migration `20261017220000_horas_extras_fluxo_campanha` foi aplicada com `prisma migrate deploy` explicitamente em `127.0.0.1:5432/secp_dev`. Backup prévio: `.tmp/backups/secp-dev-before-campanhas-full-68549b9.dump`, formato custom, 1.458.952.159 bytes, índice verificado com 1.370 linhas. Nenhum reset ou seed global foi executado.

Compilação e verificação de tipos foram executadas em diretórios de desenvolvimento e contêineres temporários do servidor Ubuntu. Nenhuma migration, implantação ou reinicialização de produção foi feita nesta entrega. A ativação local utiliza uma lista explícita dos 15 órgãos ativos; órgãos ou unidades inativos continuam sujeitos aos filtros institucionais.

O web local foi reconstruído e reiniciado com `APP_VERSION=1ad4bb4`, limite de duas CPUs e 2 GiB. `/api/health` respondeu `ok`, com a data real de 17/10/2026. Login e abertura de sete páginas autenticadas retornaram HTTP 200, sem erro de JavaScript: campanhas, nova campanha, projetos, novo projeto, banco extraordinário, remuneração e folha. Evidências em `.tmp/campanhas-localhost-final.json` e `.tmp/campanhas-localhost-final.png`. O banco local permaneceu sem as campanhas e projetos fictícios dos testes.

Os dez workers foram atualizados sequencialmente para o mesmo código, incluindo o responsável pela regeneração do banco de horas. A conferência comparou imagem, variáveis de conexão, rede, volumes, portas, CPU e memória com a fotografia anterior; todos estavam em execução, sem reinícios ou erros fatais de inicialização. A porta 3001 do Henry manteve a publicação IPv4 e IPv6 anterior. Evidência em `.tmp/campanhas-workers-final.json`.

Imagens de rollback: `secp-web:before-campanhas-1ad4bb4` e `secp-worker:before-campanhas-1ad4bb4`. A fotografia privada da configuração dos workers está junto ao backup local. Os contêineres substituídos foram removidos após a conferência; os três contêineres de teste e seus bancos fictícios foram encerrados e removidos. Discovery e os serviços de outros sistemas foram preservados.

Imagens finais verificadas por igualdade de IDs entre servidor de compilação e estação:

- Web: `sha256:ffb604c62d72edc88890e429574011c18a19c0b960b10c200e748b0132d4c615`.
- Worker: `sha256:bc35723702df706d4fdf41ee3d5a4c4e97199ca328e016a5115b601aa7286020`.

Os arquivos de transporte das imagens foram removidos do diretório temporário remoto após a importação. Nenhum backup de produção foi alterado.

## Limites operacionais e homologação

- Folha/SARH: encaminhamento manual com documento e lotes fechados. O leiaute externo precisa ser confirmado pela área responsável; o sistema não declara pagamento efetivado.
- Remuneração histórica: cadastro documentado e validado pelo RH; não existe consulta histórica automática ao SARH presumida por esta entrega.
- Recálculo: antes do lote, preservando versões. Após inclusão em lote, é exigido procedimento financeiro próprio para preservar o histórico encaminhado.
- Conversão: decisão expressa por item homologado inteiro; fruição institucional em dias completos. Não há conversão automática por insuficiência de recursos.
- Regras institucionais: permanecem as pendências da matriz normativa, incluindo documentos SEI ainda não fornecidos, conflito de prazo de comprovação, rubricas e hipóteses de jornada especial. O software exige os registros e decisões correspondentes; não os aprova em nome da Administração.

O [guia operacional](08-guia-operacional.md) descreve o percurso e as responsabilidades. A liberação em produção exige implantação e homologação próprias.
