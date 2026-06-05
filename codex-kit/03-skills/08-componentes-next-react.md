# Skill 08 — Gerador de Componentes React/Next.js

## Objetivo
Criar componentes React/Next.js componentizados, tipados, reutilizáveis e compatíveis com App Router.

## Regras
- Server Components por padrão.
- Client Components apenas quando houver estado, eventos, browser APIs ou hooks client.
- Client-only para câmera, localStorage, Human, window/document.
- Não misturar Prisma em Client Components.

## Saídas
- Componente completo.
- Props tipadas.
- Estados e acessibilidade.
- Onde criar o arquivo.

## Checklist
- [ ] `use client` apenas quando necessário.
- [ ] Props sem `any`.
- [ ] Sem import server em client.
- [ ] Sem hydration mismatch.

## Prompt operacional
Crie/refatore o componente abaixo para Next.js App Router, com tipagem forte, acessibilidade e separação server/client correta.
