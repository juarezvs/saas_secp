# MCT-SECP: arquitetura funcional

## Fonte de horários

`Jornada`, `JornadaDia`, `JornadaFaixaHorario`, `Escala`, `EscalaDia` e
`JornadaServidor` continuam sendo a única fonte de horários. O
`MctScheduleAdapter` converte essa fonte para o plano temporal do MCT sem criar
uma segunda agenda.

## Camadas

1. Configuração da Apuração: associa jornada/escala, modelo orientativo e uma
   versão de política. A ativação é explícita e possui vigência.
2. Configurações Avançadas: mantém naturezas, rubricas, políticas e regras
   versionadas para equipes técnicas.
3. Motor: normaliza eventos, planeja o dia, executa os relógios de jornada e
   conformidade, classifica rubricas e registra memória de cálculo.

## Segurança de implantação

- `LEGACY` permanece como operação oficial padrão.
- `SHADOW` não altera apuração, banco de horas, folha ou homologação.
- `MCT` exige autorização explícita e não reprocessa competência homologada.
- Modelos são reutilizáveis, mas não publicam parâmetros normativos implícitos.
- A migração da configuração é aditiva e não ativa jornadas existentes.

## Auditoria e cadastros reutilizados

O MCT não mantém agenda própria. A resolução diária reutiliza `Jornada`,
`JornadaDia`, `JornadaFaixaHorario`, `Escala`, `EscalaDia` e
`JornadaServidor`, inclusive vigências e atribuições individuais. Calendário,
afastamentos, dispensas, férias, autorizações e apuração diária continuam nos
respectivos domínios do SECP. O MCT recebe o plano temporal normalizado e não
altera essas fontes.

Naturezas, rubricas, políticas e regras são catálogos avançados versionados.
Uma política trata a classificação da diferença; ela não repete entrada,
saída, carga ou escala. A carga inicial é idempotente, preserva registros
institucionais e não publica parâmetros jurídicos novos.

## Fluxo operacional

1. O administrador associa uma jornada existente, um modelo orientativo e uma política publicada.
2. A configuração incompleta pode ser salva, mas não ativada.
3. A validação executa o mesmo núcleo usado no SHADOW. O hash, a versão do motor e o resumo ficam na configuração.
4. A ativação exige a versão validada e ausência de vigência ativa sobreposta. Alterações geram nova configuração e preservam o histórico.
5. A inativação encerra a vigência sem excluir resultados anteriores.

## Simulação e comparação

O simulador resolve a associação da jornada, usa a política publicada e
carrega regras e rubricas vigentes. Ocorrências e autorizações informadas são
somente contexto simulado. Ele não cria marcação, crédito, débito, autorização
ou homologação.

A tela **Validação e comparação** processa uma competência inteira em SHADOW e
persiste execuções e comparações por dia. As divergências abrangem jornada
prevista, tempo trabalhado, crédito, débito e conformidade. Durante o piloto,
o lote via interface e script fica bloqueado em produção.

## Ativação controlada

O modo oficial continua indisponível para a aplicação. O guard só aceita `MCT`
com autorização do piloto, habilitação explícita do escopo, competência não
homologada e ausência de outro escritor oficial. Nenhuma chamada de produção
satisfaz essas condições nesta entrega: `LEGACY` segue como único escritor e
`SHADOW` como observador.

## Roteiro de homologação

1. Aplicar migrations aditivas e carregar o catálogo idempotente.
2. Configurar e validar a jornada em desenvolvimento.
3. Executar o cenário de referência de 7h no simulador.
4. Processar `AM200401`, competência `2026-09`, em Validação e comparação.
5. Revisar férias, afastamentos, dispensas, feriados, intervalos, excedentes, compensações e autorizações.
6. Conferir divergências críticas e a memória de cálculo no drawer do espelho.
7. Repetir a competência e confirmar a idempotência das execuções.
8. Confirmar que competência homologada não admite escrita oficial.
9. Registrar o aceite funcional de RH, ponto e chefia.
10. Preparar habilitação por escopo em mudança futura, sem ativação global.
