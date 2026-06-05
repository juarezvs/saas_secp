# 29 — Skill: Registro de Ponto Facial

## Objetivo

Criar o fluxo visual de registro de ponto e captura facial, com comprovante e orientação ao usuário.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 11.
- Regras de primeira marcação por reconhecimento facial.
- Componentes base.

## Saídas obrigatórias

- RegistroPontoPanel.
- BiometriaFacialCapture visual.
- PontoActionCard.
- ConfirmationReceipt.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Próxima marcação clara.
- [ ] Estados da câmera simulados.
- [ ] Comprovante final.
- [ ] Mensagens acessíveis.

## Exemplo de prompt operacional

```txt
Implemente a tela Registrar Ponto conforme Skill 29 e Spec 11. Faça apenas UI mockada, sem reconhecimento facial real.
```
