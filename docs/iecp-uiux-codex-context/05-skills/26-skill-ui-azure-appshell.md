# 26 — Skill: UI Azure AppShell

## Objetivo

Criar a estrutura de navegação principal do SECP: AppShell, Header, Sidebar, breadcrumb, troca de perfil e acessibilidade no topo.

## Contexto que a IA deve receber

- Produto: SECP, sistema institucional de controle eletrônico de frequência.
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4.
- Diretriz visual: layout institucional inspirado em Azure Portal, com identidade própria da Justiça Federal.
- UX: auto-instrucional, guiando o usuário pela próxima ação.
- Normativo: telas críticas devem exibir card de regra da Portaria.

## Entradas esperadas

- Spec 07.
- Estrutura atual do projeto.
- Componentes base disponíveis.

## Saídas obrigatórias

- Componentes de layout completos.
- Sidebar recolhível.
- Header institucional.
- Responsividade.

## Restrições

- Não criar arquivos gigantes.
- Não implementar regra de negócio fora do escopo.
- Não alterar autenticação, Prisma ou backend sem solicitação explícita.
- Não hardcodar dados sensíveis.
- Garantir acessibilidade mínima.
- Usar componentes existentes quando disponíveis.

## Checklist de qualidade

- [ ] Header mostra SECP, unidade, perfil e usuário.
- [ ] Sidebar recolhe/expande.
- [ ] Navegação por teclado.
- [ ] Mobile usa drawer.

## Exemplo de prompt operacional

```txt
Implemente o AppShell do SECP usando a Skill 26 e a Spec 07. Liste arquivos antes de alterar. Use dados mockados para usuário/perfil/unidade.
```
