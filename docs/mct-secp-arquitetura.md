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
