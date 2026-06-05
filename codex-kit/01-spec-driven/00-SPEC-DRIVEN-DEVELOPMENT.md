# 00 — Spec-Driven Development do SECP

## Regra de trabalho
Toda implementação deve começar por uma SPEC pequena, rastreável e testável. O Codex deve implementar apenas o escopo da SPEC atual.

## Estrutura obrigatória de cada SPEC
1. Objetivo.
2. Contexto funcional.
3. Regra normativa relacionada.
4. Arquivos impactados.
5. Contratos de entrada e saída.
6. Regras de negócio.
7. Critérios de aceite.
8. Testes mínimos.
9. Riscos e cuidados.
10. Comando final de validação.

## Template
```md
# SPEC XX — Nome

## Objetivo
...

## Contexto funcional
...

## Base normativa/regra SECP
...

## Arquivos impactados
- caminho/arquivo.ts

## Regras de negócio
- RN-...

## Critérios de aceite
- [ ] ...

## Testes mínimos
- [ ] npm run build
- [ ] fluxo manual X

## Restrições
- Não alterar dados brutos.
- Não quebrar RBAC.
- Não usar JSX em route.ts.
```

## Prioridade atual de specs
1. Padronização de listagens e exportações.
2. Dashboard por perfil.
3. Cadastro e validação facial.
4. Registro de marcação web/facial por permissão.
5. Recesso Forense.
6. Auditoria total.
7. Testes automatizados de cálculo.
