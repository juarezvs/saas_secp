# Reestruturação do módulo de horas extras

Marco iniciado em 17/10/2026. **A reestruturação integral ainda não está concluída.**

| Entrega | Situação |
|---|---|
| [Fase 0 — diagnóstico AS-IS, TO-BE e riscos](00-diagnostico.md) | Concluída para o código auditado; documentos administrativos ausentes identificados |
| [Matriz normativa e conflitos](01-matriz-normativa.md) | 32 linhas rastreáveis; Informação26096685 e Despacho26097342 lidos; demais pendências explícitas |
| [Fase 1 — especificação, arquitetura, modelo e migração](02-especificacao.md) | Desenho técnico concluído; não representa homologação jurídica |
| [Incremento 1 — validação e cobertura](03-validacao-incremento-1.md) | Correções do núcleo existente, testes e limitações |
| [Operação e homologação](04-operacao-homologacao.md) | Procedimento de conferência do incremento e critérios para as próximas fases |
| [Documentos SEI e contrato financeiro](05-documentos-sei-e-orcamento.md) | Regras verificadas, valores informativos segregados, ambiguidades mantidas |
| [Incremento 2 — fundação de campanhas e orçamento](06-validacao-orcamento.md) | Quatro modelos, migration aditiva e serviços transacionais; testes em PostgreSQL descartável |
| Fases 2–12 completas | Pendentes; modelagem e orçamento iniciados. Fluxo coletivo, interfaces e integração de folha ainda não implementados |

O código do primeiro incremento corrige os limites por mês/ano dentro da solicitação, datas civis, aritmética financeira, vigências ambíguas, base bruta implícita, acesso ao cálculo e identificação da exportação interna. Não resolve sozinho a agregação global dos limites, a remuneração histórica do SARH, a compensação prévia, a razão orçamentária e a concorrência da folha.

No incremento2 foi criada uma migration, aplicada apenas ao PostgreSQL descartável de testes. Produção e banco local de desenvolvimento permanecem sem essa migration e sem seed de campanha. Novos serviços ficam desativados por padrão, exigindo flag e lista explícita de órgãos. A verificação de tipos utiliza contêiner temporário isolado, sem rede, no diretório de desenvolvimento do servidor; os serviços da aplicação não são reiniciados.
