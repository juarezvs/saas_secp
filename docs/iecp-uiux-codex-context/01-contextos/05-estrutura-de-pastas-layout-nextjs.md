# 05 — Estrutura de pastas recomendada para layout Next.js

## Objetivo

Organizar a camada de UI do SECP sem misturar apresentação, regra de negócio e infraestrutura.

## Estrutura sugerida

```txt
src/
  app/
    (public)/
      page.tsx
      login/
        page.tsx
    (app)/
      layout.tsx
      dashboard/
        page.tsx
      registrar-ponto/
        page.tsx
      minha-frequencia/
        page.tsx
      banco-horas/
        page.tsx
      solicitacoes/
        page.tsx
        nova/
          page.tsx
      homologacao/
        page.tsx
      recesso-forense/
        page.tsx
      administracao/
        page.tsx
  components/
    ui/
      button.tsx
      card.tsx
      badge.tsx
      input.tsx
      select.tsx
      modal.tsx
      skeleton.tsx
      tooltip.tsx
    layout/
      app-shell.tsx
      app-header.tsx
      app-sidebar.tsx
      breadcrumb.tsx
      profile-switcher.tsx
      accessibility-toolbar.tsx
    feedback/
      empty-state-guided.tsx
      deadline-alert.tsx
      portaria-rule-card.tsx
      instruction-card.tsx
      status-badge.tsx
    data/
      data-table.tsx
      filter-bar.tsx
      pagination.tsx
      export-pdf-button.tsx
    workflow/
      stepper.tsx
      approval-flow.tsx
      timeline.tsx
      confirmation-receipt.tsx
      audit-log-viewer.tsx
  modules/
    dashboard/
      presentation/
        components/
          servidor-dashboard.tsx
          gestor-dashboard.tsx
          dashboard-card.tsx
    marcacoes/
      presentation/
        components/
          ponto-action-card.tsx
          marcacoes-dia-timeline.tsx
          registro-ponto-panel.tsx
    solicitacoes/
      presentation/
        components/
          solicitacao-stepper.tsx
          ajuste-ponto-form.tsx
          compensacao-form.tsx
    banco-horas/
      presentation/
        components/
          banco-horas-summary-card.tsx
          banco-horas-extrato.tsx
    homologacao/
      presentation/
        components/
          homologacao-queue.tsx
          servidor-frequencia-review.tsx
    recesso-forense/
      presentation/
        components/
          recesso-dashboard.tsx
          recesso-periodo-card.tsx
    biometria/
      presentation/
        components/
          biometria-facial-capture.tsx
          facial-guidance-step.tsx
  styles/
    globals.css
    tokens.css
```

## Convenções

- Componentes genéricos ficam em `src/components`.
- Componentes específicos de domínio ficam em `src/modules/<modulo>/presentation/components`.
- Páginas em `src/app` devem ser finas: compõem componentes, não concentram lógica.
- Todo componente com estado complexo deve ter arquivo próprio.
- Evitar arquivos acima de 250 linhas.
- Nomes de conceitos de negócio em português.
- Nomes de componentes UI podem seguir inglês técnico quando forem padrões universais: `Button`, `Card`, `DataTable`, `Stepper`.

## Padrão de página

```tsx
export default function Page() {
  return (
    <PageContainer>
      <PageHeader />
      <InstructionCard />
      <PortariaRuleCard />
      <FeatureComponent />
    </PageContainer>
  )
}
```

## Padrão de módulo

```txt
modules/<modulo>/
  domain/
  application/
  infrastructure/
  presentation/
    components/
    pages/
    hooks/
    view-models/
```

Para a etapa de UI/UX, priorizar `presentation` e componentes compartilhados. Não alterar domínio sem necessidade.
