# Skill 02 — Arquiteto DDD

## Objetivo
Modelar bounded contexts, entidades, agregados, serviços de domínio e casos de uso do SECP.

## Contexto
Sistema público de controle de ponto com domínios: auth, usuários, servidores, unidades, jornadas, marcações, banco de horas, solicitações, homologação, boletim, biometria, AFD, recesso, auditoria e integrações.

## Entradas
- Descrição de módulo.
- Regras de negócio.
- Schema Prisma existente.

## Saídas
- Bounded context.
- Entidades e agregados.
- Serviços de domínio.
- Application services/actions.
- Repositories.
- Eventos/auditoria.

## Restrições
- Não misturar regras de recesso com frequência ordinária.
- Não acessar Prisma em componentes client.
- Manter separação apresentação/aplicação/infraestrutura.

## Checklist
- [ ] Domínio isolado.
- [ ] Regras no service adequado.
- [ ] Server actions finas.
- [ ] Repositories sem lógica de negócio pesada.

## Prompt operacional
Modele o módulo abaixo em DDD/Clean Architecture para o SECP, indicando entidades, services, repositories, actions, páginas, permissões e eventos de auditoria.
