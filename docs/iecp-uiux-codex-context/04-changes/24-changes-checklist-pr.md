# 24 — Checklist de PR para UI/UX SECP

## Antes de abrir PR

- [ ] Rodei `npm run lint`.
- [ ] Rodei `npm run build`.
- [ ] Testei no navegador.
- [ ] Testei responsividade básica.
- [ ] Revisei foco por teclado.
- [ ] Não deixei console.log.
- [ ] Não hardcodei dados sensíveis.
- [ ] Não misturei regra de negócio complexa na UI.

## Arquitetura

- [ ] Componentes genéricos estão em `src/components`.
- [ ] Componentes de domínio estão em `src/modules/<modulo>/presentation`.
- [ ] Páginas em `src/app` são finas.
- [ ] Arquivos não ficaram gigantes.
- [ ] Props estão tipadas.

## UX

- [ ] A tela explica o que o usuário deve fazer.
- [ ] Existe próxima ação quando aplicável.
- [ ] Existe card de orientação.
- [ ] Existe card de regra da Portaria quando aplicável.
- [ ] Erros são explicativos.
- [ ] Estados vazio/loading foram tratados.

## Acessibilidade

- [ ] Inputs possuem label.
- [ ] Botões possuem texto ou aria-label.
- [ ] Foco visível.
- [ ] Contraste adequado.
- [ ] Ações críticas não dependem só de cor.
- [ ] Layout suporta aumento de fonte.

## Funcional

- [ ] Filtros funcionam localmente ou têm contrato claro.
- [ ] Paginação funciona localmente ou tem contrato claro.
- [ ] Exportação PDF tem botão ou callback preparado.
- [ ] Stepper bloqueia avanço inválido.
- [ ] Comprovante final aparece nos fluxos.

## Normativo

- [ ] Registro de ponto cita regra aplicável.
- [ ] Banco de horas cita autorização/limite/prazo quando aplicável.
- [ ] Homologação cita prazo da chefia.
- [ ] Recesso forense não se mistura ao ponto ordinário.
- [ ] Responsabilidades por perfil estão visíveis.
