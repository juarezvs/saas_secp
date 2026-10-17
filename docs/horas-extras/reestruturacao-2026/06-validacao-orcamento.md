# Incremento 2 - documentos SEI, campanhas e orçamento

## Resultado implementado

- Leitura integral e inspeção visual da Informação26096685 e Despacho26097342, com hashes e registro das dúvidas no documento05. Matriz atualizada de27 para32 itens.
- Quatro modelos novos: `OvertimeCampaign`, `OvertimeCampaignAccount`, `OvertimeBudgetOperation` e `OvertimeBudgetMovement`.
- Migration aditiva `20261017190000_horas_extras_campanhas_orcamento`: tabelas, enums, índices, chaves compostas para mesmo órgão/campanha, checks de saldo/data/evidência e triggers de imutabilidade da razão. Acrescenta índice único `(id, orgao_id)` à tabela de unidades; não altera nem apaga seus registros.
- Minuta documental exclusiva da SJAM: referências médias18mil/5mil, prazos21/10 e19/11, exigências documentais e pendências explícitas. Nasce `DRAFT`, sem período de execução presumido e com saldos financeiros zerados. As quantias da Informação ficam apenas em observações datadas. Não cria campanha na SJRR ou em outra seccional.
- Serviço de orçamento: alocar/cancelar alocação, descentralizar/devolver crédito, reservar/liberar/executar financeiramente e remanejar alocação ou crédito como atos distintos.
- Lock de campanha e contas, idempotência por campanha/chave/hash, razão e auditoria na mesma transação. Falha de auditoria desfaz todas as projeções e lançamentos, inclusive duas pernas de remanejamento.
- Permissão de ação e escopo de órgão obrigatórios. Órgão, unidade e ancestrais inativos bloqueiam movimentação; mapa de visibilidade organizacional regenerado para os modelos novos.
- Nenhuma rota HTTP, server action pública, tela nova ou integração automática com folha/banco ordinário foi ativada neste incremento. O contexto do serviço deve vir da sessão autenticada, nunca de campos enviados pelo cliente.

## Ativação controlada

Os serviços exigem as duas condições:

```text
HORAS_EXTRAS_CAMPANHAS_ENABLED=true
HORAS_EXTRAS_CAMPANHAS_ORGAOS=<uuid-do-orgao-homologado>
```

Ausência, flag diferente de `true`, lista vazia ou curinga não habilitam o órgão. Nenhuma dessas variáveis foi habilitada em produção ou no aplicativo localhost por este trabalho. A minuta continua em rascunho mesmo com a flag; não existe ativação administrativa automática. Campanha ativa exige período definido por constraint, sem inferir esse período do prazo de comprovação.

Executar financeiramente uma reserva é consumo orçamentário na razão; não homologa frequência e não paga nem envia à folha. Vinculação estruturada das reservas às versões de projetos e decisões e os indicadores autorizado/homologado/elegível/folha pertencem aos próximos incrementos.

## Evidência executada

**37 arquivos / 207 testes aprovados**, incluindo regressão de horas extras, banco, MCT, recesso, exportação e visibilidade. Desse conjunto, **14 testes** usam PostgreSQL18 real em contêiner descartável, com duas instâncias de Prisma para concorrência. Não são mocks de transação.

Casos reais verificados:

1. Duas reservas de60 para saldo100: somente uma é aceita; saldo reservado final60.
2. Mesma chave concorrente: uma operação e uma auditoria; repetição retorna o resultado anterior. Conteúdo diferente na mesma chave é rejeitado.
3. Referência/alocação sem descentralização não reserva nenhum centavo.
4. Execução parcial/liberação não excedem a reserva original, mesmo havendo outra reserva na conta.
5. Remanejamento conserva totais e distingue alocação de crédito recebido.
6. Falha de auditoria posterior às duas atualizações provoca rollback integral.
7. UPDATE/DELETE da razão são rejeitados pelo PostgreSQL.
8. Leitura não autoriza escrita; escopo vazio e outro órgão são negados.
9. Órgão/ancestral inativo impedem movimentação.
10. FK composta impede unidade de outro órgão; check impede reserva maior que cobertura.
11. Minuta SJAM cria referências, mas nenhum saldo efetivo ou operação financeira.
12. Flag desativada bloqueia novos lançamentos.
13. Reserva e conta de outra campanha não podem ser usadas na operação.
14. Migration preserva registros fictícios anteriores, inclusive autorização já `PAGA`, pessoa/servidor, classificação, cálculo, item, atesto e snapshot remuneratório, com minutos/centavos/memórias intactos.

O ensaio parte do schema Prisma do commit `4b7a79b`, insere histórico **inteiramente fictício** e aplica a nova migration. Não equivale a restaurar o banco de produção nem a executar toda a cadeia histórica de migrations/customizações SQL; isso permanece obrigatório na homologação de implantação.

Cobertura V8 medida exclusivamente nos cinco arquivos novos de domínio, schema e serviços financeiros:

| Métrica | Resultado |
|---|---:|
| Linhas | 97,50% (117/120) |
| Instruções | 94,89% (130/137) |
| Funções | 100% (28/28) |
| Ramos | 92,85% (104/112) |

Prisma validate, ESLint nos arquivos alterados, checagem completa de tipos e rechecagem incremental dos últimos ajustes dos testes **aprovados**. TypeScript executado em contêiner temporário sem rede no servidor, limitado a1CPU/6GB, removido automaticamente ao concluir. O PostgreSQL descartável de testes também foi encerrado. Não há build Next.js ou Playwright neste incremento, pois não foram criadas interfaces.

## Reprodução do ensaio

Usar um PostgreSQL **descartável e vazio**, acessível por loopback, com nome `secp_he_test_*`. O preparador recusa host externo, nome diferente ou tabelas existentes e nunca executa reset/truncate. Precisa do commit-base `4b7a79b` disponível no Git. A URL de teste deve ser fornecida explicitamente, separada de `DATABASE_URL`.

```powershell
$env:HORAS_EXTRAS_TEST_DATABASE_URL = '<url-do-postgresql-descartavel-local>'
node scripts/horas-extras/preparar-banco-teste.mjs
npx vitest run src/modules/horas-extras/application/services/orcamento-campanha-horas-extras.integration.test.ts --maxWorkers=1
```

O contêiner usado nesta sessão tem memória limitada e armazenamento temporário; sua remoção descarta somente dados fictícios de teste. Não aplicar o preparador em desenvolvimento ou produção.

Também foram executadas três verificações negativas do preparador: recusa de host externo, recusa de banco local com nome de desenvolvimento e recusa do banco de teste já preenchido. Todas recusaram a operação, sem apagar o histórico fictício. Essas verificações operacionais são adicionais aos207 testes Vitest e não entram nessa contagem.

## Limites e próximos passos

A fase2 foi iniciada pela estrutura financeira, não concluída para todos os modelos do pedido. A fase3 tem fundação transacional, ainda sem interfaces, validação institucional ou integração com solicitações. O risco R03 da **geração antiga de lotes de folha** permanece separado: a proteção das novas reservas não corrige esse fluxo automaticamente.

Pendentes: projetos coletivos e retificações, workflow, comprovação/homologação, limites globais por servidor, histórico do saldo e remuneração, banco extraordinário, integração de folha, migração real e homologação. Permanecem sem leitura integral Circular DIGES46/2026 (25922536), Encaminhamento26097335 e e-mail26096723; não inventar seu conteúdo. Conversão integral versus apenas excesso e prazo de ficha mensal versus comprovação local continuam sujeitos a decisão competente.

Produção e banco local de desenvolvimento não receberam migration, seed, campanha, movimentação ou reinício. Para implantação futura: revisar volume/lock do índice em unidades, ensaiar restauração, reconciliar histórico, aprovar regras e manter flags desligadas até homologação.
