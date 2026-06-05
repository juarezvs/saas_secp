# SPEC 04 — AFD e Marcações Brutas

## Objetivo
Garantir importação de arquivos AFD e sincronização de marcações brutas com processamento assíncrono.

## Regras
1. Upload múltiplo de AFD.
2. Drag and drop com barra de progresso.
3. Processamento assíncrono via BullMQ/Redis.
4. Dados brutos imutáveis.
5. Evitar duplicidade por hash/NSR/equipamento/data/cpf/matrícula.
6. Pessoas ainda não cadastradas ficam pendentes.
7. Ao cadastrar servidor com CPF/matrícula, reprocessar pendências.
8. Processamento gera `Marcacao` e recalcula dia.

## Critérios de aceite
- [ ] Worker processa arquivos.
- [ ] Redis sobe no Docker.
- [ ] Duplicidade não cria marcação repetida.
- [ ] Pendente por CPF passa a processar após cadastro do servidor.
