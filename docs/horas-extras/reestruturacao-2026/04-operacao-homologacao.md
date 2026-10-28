# Operação, conferência e homologação

## Primeiro incremento

1. Conferir, com gestão de pessoas, os códigos já configurados em `HORAS_EXTRAS_RUBRICAS_BASE_CONTRACHEQUE`. Não preencher com códigos presumidos nem usar todas as rubricas do bruto. A ausência de configuração passa a bloquear novos cálculos explicitamente.
2. Encaminhar remunerações sobrepostas, sem vigência, com período invertido ou sem base positiva ao RH. A correção exige prova e decisão; não editar snapshot já homologado/pago.
3. Para calcular, o perfil ativo deve ter permissão `horas-extras:gerar-lote` no escopo admitido e vínculo com o órgão, ou escopo global explícito. Ter acesso de leitura à folha não autoriza a ação.
4. Para conferência, exportar detalhado ou **resumo interno**. Integrações antigas que usam `layout=oficial` receberão 409: atualizar para `resumo` somente se desejarem arquivo de conferência. Isso não transforma o CSV em importação de folha.
5. Conferir em ensaio o caso R$8.000 até 14/10 e R$9.000 a partir de 15/10, com vigências documentadas, e comparar memória por item. O provider mensal isolado não supre essa documentação.
6. Conferir datas inexistentes, meses/exercícios distintos, erro de rubrica e tentativa de acesso de outro órgão. Os testes automatizados são referência, não substituem conferência institucional.

Não se aplica migration ou seed neste incremento. Reversão do código restaura a versão anterior sem transformação de dados; registrar a razão e considerar que os riscos financeiros auditados reaparecem no código anterior.

## Checklist de homologação das fases seguintes

- [x] Ler integralmente as cópias fornecidas do Despacho26097342 e Informação26096685, com inspeção das três páginas e identificação de integridade.
- [ ] Obter íntegra da Circular DIGES46/2026 (SEI25922536), Encaminhamento26097335 e e-mail26096723; conferir alterações posteriores da Portaria135/2025 e autenticidade no SEI.
- [ ] Gestão de pessoas e autoridade competente validam matriz, jornada 7h/8h, hipóteses de fim de semana, horário especial e alcance do adicional noturno.
- [ ] Resolver documentalmente os dois prazos de comprovação, sem alteração tácita do art.49.
- [ ] Rubricas validadas por natureza, fundamento e vigência; histórico remuneratório autorizado com provenance e rastreio de promoções/funções.
- [ ] Campanha 2026 conferida: valores de referência não geram disponibilidade; descentralização comprovada separadamente.
- [ ] Reservas/remanejamentos e consumo de origem financeira submetidos a testes concorrentes reais no PostgreSQL.
- [ ] Compensação anterior demonstrada por histórico do mês; nenhum saldo atual tomado como prova substitutiva.
- [ ] Conferir marcas reais, intervalo, meia-noite, feriados por abrangência, exclusão da jornada ordinária e prevenção de duplicidade.
- [ ] Banco extraordinário com decisão, fatores, vencimento próprio e limite/fruição; crédito ordinário preservado.
- [ ] Comprovação e homologação parcial por pessoa/data, evidências, decisões e snapshots imutáveis.
- [ ] RBAC/LGPD e auditoria validados para todos os novos endpoints/actions, escopo próprio/unidade/órgão e global explícito.
- [ ] Leiaute externo confirmado pelo responsável da folha, com teste de importação controlado e sem postagem automática.
- [ ] Recesso qualificado e suspensão de sobreaviso respeitados, preservando atos históricos.
- [ ] Restaurar backup em ensaio, testar migrations/backfill idempotentes e reconciliar IDs/minutos/valores; nenhuma exclusão automática de histórico.
- [ ] Cumprir os 34 cenários de aceite, com testes unitários, integração e e2e e relatório real de cobertura.
- [ ] Ativação gradual por órgão apenas após homologação; features novas não homologadas desativadas por padrão.

Este checklist registra trabalho pendente. Nenhum item é considerado aprovado apenas por constar aqui.

## Atualização técnica posterior — 17/10/2026

O checklist acima é institucional e não representa ausência da implementação atual. Consulte o [guia operacional](08-guia-operacional.md) e o [relatório de validação integral](09-validacao-integral.md) para as funcionalidades, migrations e testes posteriores. Aprovação normativa, confirmação do leiaute externo e homologação pelas áreas competentes continuam exigindo atos institucionais.
