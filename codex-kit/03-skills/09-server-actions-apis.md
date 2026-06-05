# Skill 09 — Gerador de Server Actions/APIs

## Objetivo
Criar server actions e rotas API seguras, transacionais e aderentes ao RBAC.

## Regras
- Verificar sessão e permissão no server.
- Validar entrada com Zod quando aplicável.
- Usar transação quando alterar múltiplas entidades.
- Revalidar rotas afetadas.
- Registrar auditoria.
- Em API route.ts, não usar JSX.

## Checklist
- [ ] Auth verificado.
- [ ] Permissão verificada.
- [ ] Validação de entrada.
- [ ] Transação quando necessário.
- [ ] Auditoria.
- [ ] Revalidate/redirect corretos.

## Prompt operacional
Crie a action/API abaixo, protegendo por RBAC, validando entrada, usando transação, auditoria e revalidação correta.
