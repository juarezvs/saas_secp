# 12 — Spec: Solicitações com Stepper

## Objetivo

Criar um fluxo genérico de solicitações guiadas por etapa, reutilizável para ajuste de ponto, compensação, abono, atividade externa e viagem a serviço.

## Escopo

- `Stepper` genérico.
- `SolicitacaoStepper`.
- Página de nova solicitação.
- Cards de tipos de solicitação.
- Revisão final.
- Comprovante.

## Tipos iniciais

- Ajuste de ponto.
- Compensação.
- Abono / justificativa.
- Atividade externa.
- Viagem a serviço.

## Etapas padrão

1. Tipo de solicitação.
2. Data/período.
3. Dados específicos.
4. Justificativa.
5. Anexos.
6. Revisão.
7. Comprovante.

## Regras de UI

- Etapa atual destacada.
- Etapas anteriores marcadas como concluídas.
- Não avançar sem campos mínimos.
- Mostrar regra da Portaria aplicável ao tipo selecionado.
- Mostrar “quem analisará” ao final.

## Critérios de aceite

- Stepper é genérico.
- Cada tipo pode customizar campos.
- Comprovante é exibido no final.
- Layout responsivo.
- Sem backend obrigatório nesta etapa.

## Prompt operacional

```txt
Implemente a SPEC 12: solicitações com stepper.
Crie primeiro o Stepper genérico, depois uma implementação mockada para Ajuste de Ponto.
Não conecte ao backend ainda.
```
