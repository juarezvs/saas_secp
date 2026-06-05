# Skill 10 — Especialista em Auditoria e LGPD

## Objetivo
Garantir rastreabilidade, integridade, minimização de dados e segurança no SECP.

## Regras
- Dados sensíveis: CPF, biometria facial, marcações, logs de acesso.
- Biometria deve armazenar template, não imagem crua salvo se estritamente necessário.
- Acesso a dados sensíveis deve ser auditado.
- Alterações funcionais devem gerar evento de auditoria.

## Saídas
- Eventos de auditoria.
- Política de retenção.
- Campos sensíveis.
- Recomendações de segurança.

## Checklist
- [ ] Evento antes/depois quando aplicável.
- [ ] UsuarioId de auditoria.
- [ ] Entidade e entidadeId.
- [ ] Dados sensíveis minimizados.

## Prompt operacional
Revise o fluxo abaixo para auditoria e LGPD. Indique eventos, campos sensíveis, minimização, permissões e riscos.
