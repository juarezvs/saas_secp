# SPEC 02 — Módulo Recesso Forense

## Objetivo
Criar bounded context `recesso-forense` para controlar convocação, marcações, espelho, fechamento, homologação, aceite SECAD e relatórios SEPAG/SECAP.

## Contexto funcional
O recesso ocorre anualmente de 20/12 a 06/01. Nem todos os servidores trabalham. Cada servidor pode ser convocado em dias específicos e escolher, por dia trabalhado, pecúnia ou folga.

## Entidades sugeridas
- RecessoForense
- RecessoPeriodo
- RecessoConvocacao
- RecessoConvocacaoDia
- RecessoChefiaResponsavel
- RecessoEspelhoServidor
- RecessoFechamentoServidor
- RecessoHomologacaoChefia
- RecessoAceiteSecad
- RecessoRelatorioSepag
- RecessoRelatorioSecap

## Fluxo
1. Admin/NUTEC cadastra recesso anual.
2. Admin/NUTEC cadastra portaria de convocação.
3. Admin/NUTEC vincula servidores convocados por dia.
4. Define chefia responsável por servidor/período.
5. Servidor registra marcações normalmente.
6. Sistema monta espelho próprio do recesso.
7. Servidor escolhe pecúnia ou folga por dia.
8. Servidor fecha período dezembro/janeiro.
9. Chefia homologa.
10. SECAD aceita.
11. SEPAG gera relatório de pecúnia.
12. SECAP gera relatório de folgas.

## Critérios de aceite
- [ ] Recesso separado do espelho ordinário.
- [ ] Dezembro e janeiro fecham separadamente.
- [ ] Dia não convocado não gera falta/débito.
- [ ] Dia não convocado mostra “Recesso Forense”.
- [ ] Cada dia convocado possui escolha pecúnia/folga.
- [ ] Chefia do recesso pode ser diferente da chefia ordinária.
- [ ] Auditoria em todas as transições.
