# 11 — Spec: Registrar ponto e biometria facial

## Objetivo

Criar a experiência visual de registro de ponto via sistema web, com fluxo especial para reconhecimento facial na primeira marcação do dia.

## Escopo

- Página `registrar-ponto`.
- `RegistroPontoPanel`.
- `PontoActionCard`.
- `BiometriaFacialCapture` visual.
- `ConfirmationReceipt`.
- Timeline do dia após registro.

## Regras de UX

- O sistema deve informar qual será a próxima marcação.
- Primeira marcação do dia via web deve exigir reconhecimento facial, conforme premissa do SECP.
- A partir da segunda marcação, pode aparecer botão “Registrar horário”, conforme permissão.
- O usuário deve receber comprovante.

## Estados

- Aguardando reconhecimento facial.
- Câmera carregando.
- Rosto não detectado.
- Rosto detectado.
- Captura válida.
- Registro em processamento.
- Registro confirmado.
- Erro com orientação.

## Mensagens

- “Centralize seu rosto no círculo.”
- “Mantenha boa iluminação.”
- “Rosto detectado. Aguarde a confirmação.”
- “Registro realizado com sucesso.”
- “Comprovante gerado.”

## Acessibilidade e privacidade

- Informar finalidade da biometria.
- Não expor dados biométricos em tela.
- Permitir cancelamento.
- Indicar método alternativo quando disponível.

## Critérios de aceite

- Fluxo compreensível sem treinamento.
- Erros explicam como corrigir.
- Comprovante aparece ao final.
- UI preparada para câmera, mas pode ser mock visual na primeira etapa.

## Prompt operacional

```txt
Implemente a SPEC 11: Registrar ponto e biometria facial.
Nesta etapa, faça a UI e estados mockados, sem implementar reconhecimento facial real.
Crie componentes separados para painel de registro, captura facial e comprovante.
```
