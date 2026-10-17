# Reestruturação do módulo de horas extras

Marco iniciado em 17/10/2026. **A reestruturação integral ainda não está concluída.**

| Entrega | Situação |
|---|---|
| [Fase 0 — diagnóstico AS-IS, TO-BE e riscos](00-diagnostico.md) | Concluída para o código auditado; documentos administrativos ausentes identificados |
| [Matriz normativa e conflitos](01-matriz-normativa.md) | 27 linhas rastreáveis; pendências explícitas de leitura e homologação |
| [Fase 1 — especificação, arquitetura, modelo e migração](02-especificacao.md) | Desenho técnico concluído; não representa homologação jurídica |
| [Incremento 1 — validação e cobertura](03-validacao-incremento-1.md) | Correções do núcleo existente, testes e limitações |
| [Operação e homologação](04-operacao-homologacao.md) | Procedimento de conferência do incremento e critérios para as próximas fases |
| Fases 2–12 completas | Pendentes; não há campanha, workflow coletivo ou migração novos ativados por este incremento |

O código do primeiro incremento corrige os limites por mês/ano dentro da solicitação, datas civis, aritmética financeira, vigências ambíguas, base bruta implícita, acesso ao cálculo e identificação da exportação interna. Não resolve sozinho a agregação global dos limites, a remuneração histórica do SARH, a compensação prévia, a razão orçamentária e a concorrência da folha.

Nenhuma migration, seed ou escrita no banco de produção faz parte deste incremento. A verificação de tipos utiliza contêiner temporário isolado, sem rede, no diretório de desenvolvimento do servidor; os serviços da aplicação não são reiniciados.
