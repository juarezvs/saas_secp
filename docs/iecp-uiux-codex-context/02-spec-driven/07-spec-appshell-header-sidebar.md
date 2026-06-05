# 07 — Spec: AppShell, Header e Sidebar

## Objetivo

Implementar a estrutura visual principal do SECP com header institucional, sidebar recolhível e área de conteúdo responsiva.

## Escopo

- `AppShell`.
- `AppHeader`.
- `AppSidebar`.
- `Breadcrumb`.
- `ProfileSwitcher`.
- `AccessibilityToolbar`.
- Layout desktop e mobile.

## Fora de escopo

- Autenticação real.
- RBAC real.
- Busca em backend.
- Integração com dados reais.

## Comportamento esperado

### Header

Deve exibir:

- botão hamburger;
- logo/nome SECP;
- subtítulo “Sistema Eletrônico de Controle de Ponto”;
- unidade atual;
- perfil ativo;
- acessibilidade;
- notificações;
- menu do usuário.

### Sidebar

Deve exibir itens conforme perfil mockado inicial:

Servidor:

- Início.
- Registrar ponto.
- Minha frequência.
- Meu banco de horas.
- Solicitações.
- Recesso forense.
- Comprovantes.
- Relatórios.
- Ajuda e regras.

Gestor:

- Painel da chefia.
- Equipe.
- Solicitações.
- Homologação mensal.
- Banco de horas da equipe.
- Recesso forense.
- Relatórios.
- Auditoria da unidade.

### Responsivo

- Desktop: sidebar fixa/recolhível.
- Tablet: sidebar recolhível.
- Mobile: drawer sobreposto.

## Estados

- Sidebar expandida.
- Sidebar recolhida.
- Item ativo.
- Submenu aberto.
- Submenu fechado.
- Perfil ativo alterado visualmente.

## Acessibilidade

- Hamburger com `aria-label`.
- Menu com navegação por teclado.
- Foco visível.
- Links com texto discernível.
- Sidebar mobile com trap de foco quando modal/drawer.

## Critérios de aceite

- Header permanece consistente em todas as páginas protegidas.
- Sidebar recolhe e expande sem quebrar o layout.
- O item ativo é visualmente claro.
- O conteúdo principal respeita o espaço da sidebar.
- Funciona em 1440px, 1024px, 768px e 390px.

## Prompt operacional

```txt
Implemente a SPEC 07: AppShell, Header e Sidebar.
Use a estrutura de pastas indicada em 05-estrutura-de-pastas-layout-nextjs.md.
Crie dados mockados para usuário, unidade e perfil ativo.
Não implemente autenticação real.
Garanta acessibilidade básica e responsividade.
Ao final, liste os arquivos criados/alterados e checklist de aceite.
```
