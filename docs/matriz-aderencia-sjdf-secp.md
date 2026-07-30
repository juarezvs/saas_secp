# Matriz de aderencia SJDF x SECP

Base de analise: Fluxo-SJDF.pdf. Objetivo: verificar se o SECP produz o mesmo efeito final de negocio, sem depender de codigos ou telas do Forponto.

| Procedimento SJDF | Efeito final esperado | Atendimento no SECP | Ajuste realizado |
| --- | --- | --- | --- |
| Jornada diaria | Apurar jornada 7h entre 07:00 e 21:00, tratando excedente como credito quando permitido. | Atendido | Parametrizacao por jornada/regulamentacao e registro de procedimento `JORNADA_DIARIA` ao atribuir jornada. |
| Hora extra | Separar credito comum, hora extra autorizada e excedente nao autorizado, respeitando descanso/limites. | Atendido | Deliberacao final de horas extras agora registra execucao `HORA_EXTRA` no motor. Regras continuam parametrizadas por seccional. |
| Compensacao de saldo | Trocar falta/debito por compensacao quando autorizada. | Atendido | Solicitacoes, banco de horas e ajuste manual passam pelo motor de procedimentos. |
| Substituicao CJ3 | Alterar carga para 8h apenas no periodo autorizado e reanalisar periodo. | Atendido | Atribuicao temporaria de jornada passa pelo motor como `ALTERACAO_TEMPORARIA_JORNADA`. |
| Afastamento para ministrar curso | Registrar afastamento informativo/compensavel sem alterar indevidamente o banco. | Atendido por parametrizacao | Procedimento `AFASTAMENTO_INFORMATIVO` fica parametrizavel por seccional e pode ser acionado por solicitacoes/afastamentos. |
| Jornada reduzida por razoes medicas e outras | Aplicar jornada especial/reduzida com vigencia e recalculo retroativo quando cabivel. | Atendido | Atribuicao de jornada reduzida/especial passa pelo motor como `JORNADA_ESPECIAL`. |
| Lancamentos com banco aberto | Corrigir marcacoes/ocorrencias, reanalisar periodo e recalcular banco aberto. | Atendido | Ajustes administrativos e solicitacoes deferidas usam `AJUSTE_BANCO_ABERTO`. |
| Lancamentos com banco fechado | Preservar historico original, registrar correcao, calcular impacto e lancar em competencia posterior permitida. | Atendido por procedimento controlado | Motor bloqueia recalculo indevido em periodo homologado e exige procedimento `AJUSTE_BANCO_FECHADO` quando parametrizado. |
| Teletrabalho | Registrar periodo autorizado e refletir no espelho. | Atendido | Cadastro de teletrabalho/dispensa passa pelo motor como `TRABALHO_REMOTO`. |
| Conversao de horas nao autorizadas | Converter 600/horas nao autorizadas em horas trabalhadas/credito computavel quando houver ciencia/autorizacao. | Atendido | Autorizacao de hora extra/banco registra `CONVERSAO_HORAS_NAO_AUTORIZADAS`. |
| Nada Consta | Consolidar saldo, debitos vencidos, faltas, pendencias de homologacao e registrar emissao no processo. | Atendido | Criada rotina executavel em `/administracao/procedimentos-frequencia/nada-consta`, vinculada ao motor `NADA_CONSTA`. |

Conclusao: com os ajustes desta matriz, o SECP passa a atender o objetivo final dos procedimentos SJDF por seccional, por meio de regulamentacao, permissoes, cadastros auxiliares e motor de execucao auditavel.
