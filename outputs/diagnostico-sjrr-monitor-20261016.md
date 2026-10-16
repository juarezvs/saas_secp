# Comunicação biométrica da SJRR — 16/10/2026

Publicado em produção: `secp-web:prod_20261016_coleta_sjrr_lotes`.

## Monitor Control iD

O SECP recebe notificações HTTP no servidor `172.19.5.244`, porta TCP `3000`.
O caminho base é configurado automaticamente por equipamento:

```text
api/integracoes/control-id/monitor/<equipamentoId>/<token>
```

O equipamento acrescenta `/dao`, `/device_is_alive`, `/door` ou outro evento ao caminho base. O receptor interpreta inserções em `access_logs`, conforme o [protocolo oficial do Monitor Control iD](https://www.controlid.com.br/docs/access-api-pt/monitor/introducao-ao-monitor/). Sensores, fotografias e alterações de cadastros não são convertidos em marcações de ponto.

A autenticação utiliza credencial individual. As notificações de marcação são persistidas e processadas em fila própria. A coleta pela Access API permanece disponível. Os dois canais compartilham a identificação dos usuários e a deduplicação por equipamento, registro e horário, sem avançar o cursor pelo Monitor.

| Equipamento | IP | Resultado |
|---|---|---|
| FaceID balcão entrada | 172.29.9.35 | Monitor configurado e confirmado por leitura |
| FaceID balcão saída | 172.29.9.38 | Monitor configurado e confirmado por leitura |
| FaceID PNE entrada | 172.29.9.36 | Monitor configurado e confirmado por leitura |
| FaceID PNE saída | 172.29.9.37 | Monitor configurado e confirmado por leitura |
| FaceID torniquete entrada | 172.29.5.33 | Monitor configurado e confirmado por leitura |
| FaceID torniquete saída | 172.29.5.34 | Monitor configurado e confirmado por leitura |
| iDUHF cancela entrada | 172.29.10.92 | Monitor configurado e confirmado por leitura |
| iDUHF cancela saída | 172.29.10.93 | Monitor configurado e confirmado por leitura |
| FaceID garagem entrada | 172.29.5.43 | Sem resposta HTTP; não configurado |
| FaceID garagem saída | 172.29.5.44 | Sem resposta HTTP; não configurado |

Os parâmetros de autorização e identificação dos oito equipamentos permaneceram iguais aos lidos antes da ativação. As configurações anteriores do Monitor foram salvas no servidor, em arquivo protegido, dentro de `/opt/secp/operacoes/sjrr-20261016`.

## Validação

- 38 testes passaram; ESLint, TypeScript e build passaram.
- Produção respondeu `200` em `/api/ready`.
- Um acesso real já processado do PNE foi reenviado duas vezes ao endpoint: ambas as respostas foram `200`.
- Uma credencial incorreta recebeu `401`.
- A quantidade de registros brutos desse acesso permaneceu `1`; a marcação associada permaneceu a mesma.
- O cursor permaneceu `16`, sem regressão ou avanço causado pelo reenvio.
- A cancela de saída (`172.29.10.93`) enviou uma notificação nativa ao novo receptor, confirmando o fluxo equipamento → SECP na porta `3000`.

O teste validou o receptor e a fila usando um registro existente, sem criar uma marcação nova. O envio nativo também foi observado na cancela de saída; o envio de uma nova marcação facial pode ser conferido com um registro real no local.

## Coleta Henry e recuperação

Foram corrigidas a ordem dos parâmetros RR, a separação de pacotes TCP e a identificação da resposta da consulta. Os lotes foram limitados a dez eventos: na recepção, uma resposta grande de 4.780 bytes chegou incompleta, com 1.260 bytes.

Na recuperação de outubro, 4.278 registros foram analisados, 680 foram processados nessa etapa e 65 competências foram recalculadas. Os 3.500 registros sem vínculo foram preservados. O processamento informou zero falhas. A coleta automática foi direcionada aos registros atuais, e o índice anterior foi preservado para recuperação histórica separada.

O Henry da garagem, `172.29.5.131`, respondeu ao ping, mas não à porta TCP `3000`. Ele permanece como pendência de rede/equipamento, junto dos dois FaceID da garagem.

## Portas e preservação de dados

| Fluxo | Destino | Porta |
|---|---|---|
| Control iD → SECP, Monitor HTTP | 172.19.5.244 | TCP 3000 |
| SECP → Control iD, coleta Access API | IP do equipamento | TCP 80 |
| SECP → Henry, coleta ativa | IP do equipamento | TCP 3000 |
| Henry → listener online legado do SECP | 172.19.5.244 | TCP 3001 |

O banco não foi zerado. Permanecem dois conjuntos de backups de banco e aplicação. A recuperação histórica executa no Ubuntu, em processo separado; os logs ficam em `/opt/secp/operacoes/sjrr-20261016`.
