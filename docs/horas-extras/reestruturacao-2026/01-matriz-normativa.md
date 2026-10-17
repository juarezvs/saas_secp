# Matriz de aderência normativa

Data da leitura: 17/10/2026. **Parcial** indica código existente, não conformidade certificada. Testes `Nxx` são critérios de aceite planejados até constarem como executados no relatório de validação. Esta matriz antecede a implementação do incremento.

Fontes: [CJF 4 consolidada](https://www.cjf.jus.br/publico/biblioteca/Res%20004-2008.pdf) (C4), [CJF 973/2025](https://www.cjf.jus.br/publico/biblioteca/Res_973-2025.pdf) (C973), [CJF 984/2026](https://www.cjf.jus.br/publico/biblioteca/Res_984-2026.pdf) (C984), [Lei 8.112 compilada](https://www.planalto.gov.br/ccivil_03/leis/l8112compilado.htm) (L8112); Portaria 135/2025 (P135), arquivo local `SEI_23258652_Portaria_SJAM_Diref_135.pdf`, conferência SEI 23258652/CRC D7BC2066.

| ID / norma | Dispositivo e síntese fiel | Vigência consultada | Regra de negócio / módulo | Validação necessária | Teste | Situação AS-IS |
|---|---|---|---|---|---|---|
| N01 C973/C4 | 42 caput/§1: autorização escrita excepcional, titular, nomes e atividades | Redação 973; publicação 06/11/2025 | Projeto coletivo justificado / solicitação | Titular/delegação e origem documental | N01: justificativa e relação obrigatórias | Parcial, solicitação individual |
| N02 C973/C4 | 42 §2: antecedência de cinco dias úteis; urgência justificada | Redação 973 | Calendário por abrangência / prazo | Urgência não é aprovação automática | N02: dentro/fora/urgência/feriado | Ausente no validador |
| N03 C973/C4 | 42 §3: pagamento depende de disponibilidade | Redação 973 | Orçamento segregado da decisão administrativa | Referência versus crédito disponível | N03: sem descentralização/insuficiência | Parecer sem razão financeira |
| N04 C4 | 43: autoridade competente | Redação 173/2011 mantida | Workflow e conversão / RBAC | DIREF e eventual ato válido de delegação | N04: competência, órgão e perfil | Permissões genéricas |
| N05 C4 | 44: excluir férias e gratificação natalina da base | Mantida no consolidado | Rubricas/remuneração | Natureza, vigência e RH; não bruto automático | N05: rubricas ausentes/excluídas | Fallback bruto inseguro |
| N06 C4 | 45 caput/§§1–2: oito horas; jornada ininterrupta e intervalo | Redações 173/2011 e 401/2016 | Apuração / separar ordinária de extraordinária | Jornada 7h/8h; não pagar sétima–oitava | N06: 7h/8h/intervalo | Parcial no banco, lacuna no fluxo SECAP |
| N07 C973/C4 | 45 §§2-A/2-B: teto 10h; descanso 1h acima de 7h, excluído | Redação 973 | Execução de fins de semana/feriados | Compatibilizar com art.47 §2 e jornada individual | N07: 7h, 7h01, 10h e excesso | Parcial no banco |
| N08 C973/C4 | 45 §3: 2h úteis, 44h mês, 200h ano | Redação 973 | Limites agregados por servidor | Todas campanhas/órgãos sem duplicar autorizado/executado | N08: diário/mensal/anual/concorrência | Mensal só na solicitação; anual ausente |
| N09 C973/C4 | 45 §3-A +47 §3 I: exceção apenas no período 20/12–06/01 | Redação 973 | Recesso / limites próprios dez/jan | Convocação e enquadramento; teto 44h em cada mês | N09: 19/12,20/12,06/01,07/01 | Recesso existente, integração pendente |
| N10 C973/C4 +L8112 | 45 §3-B e art.98: horário especial e limite da Junta | Redação 973; lei compilada | Jornada especial / restrição de saúde | Guardar só restrição funcional necessária | N10: teto especial fim de semana | Ausente no validador |
| N11 C4 | 46: divisor 200; 50% úteis/sábado; 100% domingo/feriado | Redação 186/2012 | Cálculo decimal e memória | Não tratar facultativo como feriado | N11: divisor/percentual/arredondamento | Parcial, ponto flutuante |
| N12 C4 | 46 §2: fatores também na conversão | Incluído 173/2011 | Banco extraordinário, 1,5/2 | Autorização e escolha única de destino | N12: conversão sem duplicidade | Sem razão extraordinária própria |
| N13 C973/C4 | 46-A: débito no mês exige compensação anterior ao serviço | Incluído 973 | Histórico do banco e elegibilidade | Reconstruir saldo e prova temporal, não saldo atual | N13: compensação antes/depois/ausente | Não aderente no processamento SECAP |
| N14 C4 | 47 I–IV/§1: hipóteses e tarefas justificadas | Texto consolidado | Fim de semana / solicitação | Enquadramento, datas, horários e impossibilidades locais | N14: sábado/domingo/feriado | Parcial |
| N15 C973/C4 | 47 §2-A: facultativo/suspensão só além da jornada regular | Incluído 973 | Classificação do calendário | Suspensão interna não equivale a feriado | N15: facultativo e suspensão | Parcial |
| N16 C4 | 48: unidade de lotação; exceção com concordância | Texto consolidado | Solicitação por unidade | Lotação histórica e anuência | N16: outra unidade autorizada | Parcial |
| N17 C973/C4 | 49: ficha atestada até segundo dia útil seguinte | Redação 973 | Comprovação/homologação | Calendário e conflito prazo campanha | N17: prazo e dupla manifestação | Atesto parcial |
| N18 C4 | 50-A: prazo até exercício seguinte; nov/dez até segundo seguinte | Redação 379/2015 | Expiração extraordinária | Não usar três meses ordinários | N18: outubro/novembro/dezembro | Ausente como regime próprio |
| N19 C4 | 50-A §§2/3: teto 30 dias e permanência de 2/3 quando cabível | Redação consolidada | Fruição extraordinária | Conversão dias/minutos pela jornada e lotação histórica | N19: teto/equipe mínima | Pendente |
| N20 C4/P135 | 50-B; P135 6 §7 e15: frequência eletrônica/biometria local | P135 efeitos 01/08/2025 | Marcações e comprovantes | Origem real; alternativa apenas com fundamento documentado | N20: falta/paridade/meia-noite | Usa marcas válidas sem prova completa |
| N21 L8112 | 73/74: acréscimo e excepcionalidade | Lei compilada | Autorização e cálculo | Compatibilização com disciplina CJF | N21: serviço ordinário não gera extra | Parcial |
| N22 L8112/C4 | 75;51/52: noturno 22h–5h e hora reduzida; restrição CJ/FC no consolidado | Vigência consultada, alcance jurídico pendente | Apuração/cálculo noturno separado | Jurídico deve tratar alcance do art.52; não corte local 19h | N22: noturno e CJ/FC | Não homologado |
| N23 C984 | 1/2: suspende 53-A–I, efeitos 06/11/2025; preserva atos praticados | Publicação 20/03/2026 | Sobreaviso indisponível para nova aplicação | Preservar histórico, sem reativar por configuração | N23: bloqueio e preservação | Não identificado fluxo de ativação próprio |
| N24 P135 | 2 IV/V,10 §9,13/14: crédito ordinário não vira pecúnia; autorização/teto16h | Efeitos 01/08/2025; conferir alterações no SEI | Banco ordinário separado | Não modificar regras ordinárias nesta migração | N24: regimes e teto | Banco existente reutilizável |
| N25 P135 | 4/6/8/16: jornada, frequência e homologação | Mesma ressalva local | Cadastros e comprovação | Reutilizar jornada e marcações; homologação rastreável | N25: 7h/8h/origem/delegação | Parcial |
| N26 Despacho26097342 | Conteúdo integral não disponível | **Pendente** | Campanha 2026 proposta no pedido | Confirmar teto por unidade, prazos e impossibilidades | N26: referência não é crédito | Não parametrizar como norma homologada |
| N27 Circular46/2026; SEI26096685/26097335 | Conteúdo integral não disponível | **Pendente** | Referências administrativas | Leitura e validação institucional | N27: ativação bloqueada | Pendentes |

## Conflitos que não podem ser resolvidos silenciosamente

1. Jornada ordinária local de 7h versus exigências do art.45 para serviço extraordinário remunerado. A autorização não remunera automaticamente a oitava hora.
2. Teto geral de 10h do art.45 §2-A versus jornada regular mais 2h do art.47 §2; a especificação adota validar ambas as condições e solicita homologação da interpretação antes de ativar o fluxo novo.
3. Prazo administrativo 19/11/2026 informado pelo usuário versus segundo dia útil do art.49. Manter dois prazos identificados e gerar pendência; não substituir um pelo outro.
4. Conversão extraordinária e créditos ordinários possuem fundamentos e vencimentos diferentes. Não migrar por mera igualdade de percentual.
5. Art.52 sobre adicional noturno para CJ/FC: leitura integral feita, alcance jurídico a homologar. Não reutilizar para excluir CJ/FC de horas extras diurnas: art.50 foi revogado.
6. Contracheque mensal não comprova remuneração efetiva de cada dia. Ausência de endpoint histórico confirmado não autoriza fabricar vigências.
