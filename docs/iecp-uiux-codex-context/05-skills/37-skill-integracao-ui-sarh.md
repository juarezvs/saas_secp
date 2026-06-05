# 37 — Skill: Integração UI SARH

## Objetivo

Criar telas administrativas de acompanhamento visual da integração SARH, sem implementar consumo real se não pedido.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- APIs SARH conhecidas: lotação, empresas, servidores, lotação-servidor, cargos.
- Perfil NUTEC/Admin.

## Saídas obrigatórias

- Painel de status SARH.
- Cards de endpoints.
- Tabela de últimas sincronizações.
- Empty/loading/error states.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Endpoints organizados.
- [ ] Status visual.
- [ ] Erros amigáveis.
- [ ] Sem expor CPF em tela desnecessariamente.

## Exemplo de prompt operacional

```txt
Implemente painel UI de integração SARH conforme Skill 37. Use dados mockados e não consuma API real nesta etapa.
```
