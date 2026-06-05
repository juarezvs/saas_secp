# 10 — Spec: Dashboard do Servidor

## Objetivo

Criar o dashboard principal do perfil Servidor, com foco em próxima ação, marcações do dia, pendências, banco de horas e frequência mensal.

## Escopo

- `ServidorDashboard`.
- `NextActionCard`.
- `MarcacoesDiaTimeline`.
- `DashboardMetricCard`.
- `AlertasServidorPanel`.
- `FrequenciaMesResumo`.
- `AcessoRapidoGrid`.

## Dados mockados

Usar dados locais temporários:

```txt
Nome: Juarez
Perfil: Servidor
Unidade: SJAM > SECAD > NUTEC
Jornada hoje: 7h00
Trabalhado hoje: 00h00
Banco de horas: +08h20
Pendências: 1
Próxima ação: Registrar entrada por reconhecimento facial
```

## Layout

Primeira linha:

- saudação;
- data;
- botão de notificações.

Segunda linha:

- Card azul de próxima ação;
- Jornada hoje;
- Trabalhado hoje;
- Banco de horas;
- Pendências.

Terceira linha:

- Marcações de hoje;
- Alertas e avisos;
- Frequência do mês.

Quarta linha:

- Acesso rápido;
- Guia rápido.

## Estados

- Sem marcação.
- Entrada registrada.
- Saída intervalo pendente.
- Retorno pendente.
- Saída final pendente.
- Dia completo.
- Pendência crítica.

## Critérios de aceite

- O usuário entende imediatamente qual ação realizar.
- As informações normativas aparecem em cards simples.
- O dashboard é responsivo.
- A timeline do dia mostra quatro posições: entrada, saída intervalo, retorno intervalo, saída.
- A frequência do mês pode ser inicialmente mockada.

## Prompt operacional

```txt
Implemente a SPEC 10: Dashboard do Servidor.
Use AppShell já existente e componentes base.
Use dados mockados em arquivo separado ou constante local.
Não conecte ao backend ainda.
Garanta que a primeira dobra mostre a próxima ação do usuário.
```
