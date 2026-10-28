# Validação do primeiro incremento

## Mudanças implementadas

1. **Datas e limites da solicitação:** rejeição de datas civis inexistentes, separação dos totais por mês/ano e aplicação do limite anual recebido da política. Não altera políticas históricas. A agregação de outras autorizações/campanhas ainda precisa do caso de uso transacional da fase 6. O default legado de 134h no seed/formulário foi registrado em R11: requer nova versão de política e conferência institucional antes da ativação; não confundir esse valor configurado com o teto normativo atual de 200h.
2. **Cálculo financeiro decimal:** `Decimal` com precisão local de 40 dígitos e arredondamento half-up por item. Exemplo de regressão: base de 250 centavos, 112 minutos, divisor de 12.000 minutos e adicional de 50% produz 3,5 centavos, arredondados para 4; o cálculo binário anterior podia retornar 3.
3. **Vigências:** rejeição de sobreposição, identificadores ausentes/duplicados, período invertido, remuneração não positiva ou não inteira em centavos e minutos inválidos. Não escolher silenciosamente uma base entre duas versões. Dados ambíguos ficam pendentes de regularização.
4. **Base de contracheque:** retirada do fallback automático para o total bruto. Somente rendimentos de códigos explicitamente configurados compõem a base, com soma decimal. Isso é seleção técnica; cadastro jurídico de rubricas, vigência e aprovação RH continuam pendentes. O payload identifica que competência mensal não comprova vigência diária.
5. **Acesso ao cálculo:** permissão somente de visualizar folha não permite calcular. O serviço recebe o escopo do perfil ativo e rejeita órgão fora dele antes da consulta salarial; lista vazia não concede acesso global.
6. **Exportação:** `layout=resumo` passa a representar resumo **interno**, com valores agregados em decimal. `layout=oficial` retorna HTTP 409 e código `LEIAUTE_FOLHA_NAO_HOMOLOGADO`, em vez de afirmar um leiaute externo não validado. Detalhado permanece disponível. Proteção contra fórmulas CSV e negação de escopo vazio na exportação/detalhe de lote.

## Evidência automatizada

- Antes: **8 arquivos / 34 testes** do módulo de horas extras aprovados.
- Depois: **14 arquivos / 86 testes** de horas extras e endpoint de exportação aprovados.
- Regressão ampliada: **34 arquivos / 168 testes** aprovados, incluindo banco de horas, MCT e recesso.
- Os testes das actions e endpoint usam dependências simuladas. Não são testes de integração com PostgreSQL, SARH nem folha de produção. Não foi executado Playwright neste incremento.
- ESLint nos arquivos TypeScript alterados: sem erros; limpeza de um tipo não utilizado preexistente no serviço de cálculo.
- A checagem TypeScript local foi encerrada pelo limite de heap de 2 GB. A checagem de tipos do código-fonte foi então **aprovada**, com `tsc --noEmit`, em contêiner temporário no servidor, sem rede, limitado a 1 CPU/6 GB e heap de 5 GB. Nenhum serviço da aplicação foi reiniciado; o contêiner de verificação foi removido automaticamente ao terminar. Isso não substitui build Next.js nem teste e2e de interface.

Cobertura V8 medida nos **seis serviços selecionados do incremento**, não no módulo inteiro:

| Métrica | Cobertura |
|---|---:|
| Linhas | 82,75% (144/174) |
| Instruções | 83,42% (151/181) |
| Funções | 90,90% (20/22) |
| Ramos | 73,21% (123/168) |

Base remuneratória, segmentação de vigências, cálculo financeiro e verificação de escopo atingiram 100% de linhas no recorte medido. Expansão de datas e ramificações do validador mantêm lacunas; não anunciar cobertura integral.

Comando reproduzível (uma linha, shell que preserve o argumento glob):

```text
npx vitest run src/modules/horas-extras src/modules/banco-horas src/modules/mct src/modules/recesso-forense src/app/api/horas-extras/folha --maxWorkers=1 --coverage.enabled --coverage.provider=v8 --coverage.include="src/modules/horas-extras/application/services/{base-remuneratoria-contracheque,calcular-valor-horas-extras,horas-extras-datas,segmentar-remuneracao-horas-extras,validar-solicitacao-horas-extras,escopo-horas-extras}.service.ts" --coverage.reporter=text --coverage.reporter=json-summary --coverage.reportsDirectory=.tmp/horas-extras-coverage
```

`@vitest/coverage-v8` foi fixado em 4.1.7, compatível com a versão de Vitest instalada. O JSON bruto fica em `.tmp/horas-extras-coverage/coverage-summary.json`; não contém dados de servidores.

## Limitações e critérios ainda não cumpridos

As 34 áreas obrigatórias do pedido estão rastreadas na especificação; não estão todas implementadas ou cobertas. Permanecem pendentes campanhas, orçamento descentralizado e reserva concorrente, projeto coletivo/retificação, workflow integrado, apuração histórica completa, banco extraordinário, fonte remuneratória por vigência real, homologação parcial, consumo único entre lotes, leiaute externo, migração e homologação institucional.

O provider de contracheque continua mensal. Retirar o bruto e rejeitar sobreposição **não prova** promoção/função intramês. A rotina de apuração ainda consulta saldo atual do banco; esta correção exige histórico e novas decisões, não substituição silenciosa. A geração de lotes ainda precisa da proteção transacional descrita em R03.

Não há atualização de dados nem recálculo automático de snapshots existentes. A fase 12 exige backup/restauração ensaiados, reconciliação e homologação antes de produção.
