# Exploração SARH: substituição de função

Pesquisa executada em produção, de forma somente leitura, usando a configuração Oracle SARH já cadastrada no SECP para a seccional SJDF.

## Tabelas SARH identificadas

- `SARH.RH_SUBSTITUICAO_AUTOMATICA`: cadastro de substituição automática vinculada à função substituída e ao servidor que exerce a substituição. Campos centrais encontrados: função substituída (`SBAU_HIFC_*_SUBS`), servidor exercente (`SBAU_FUNC_SIGLA_SECAO_EXERC`, `SBAU_FUNC_COD_FUNC_EXERC`), início/fim, ato, publicação e dispensa.
- `SARH.RH_SUBSTITUTO_AUTOMATICO`: relacionamento entre função substituída e função exercente/substituta. Campos centrais encontrados: função substituída (`*_SUBS`), função exercente (`*_EXER`), início/fim, ato, publicação e dispensa.
- `SARH.RH_SUBSTITUTO_FUNCAO`: cadastro direto titular/substituto por período de afastamento. Campos centrais encontrados: titular, substituto, início/fim, tipo de afastamento e período do afastamento.
- `SARH.RH_DESIGNACOES`: estrutura para designações com titular/substituto, ato, motivo, lotação, período e indicador de prejuízo. Na base consultada estava sem registros, mas a estrutura foi considerada no modelo.
- `SARH.RH_TIPO_DESIGNACAO` e `SARH.RH_MOTIVO_DESIGNACAO`: catálogos auxiliares para classificar designações.
- `SARH.RH_FUNCAO_CONFIANCA`, `SARH.RH_FUNCAO`, `SARH.RH_IDENTIFICACAO_FUNCAO`, `SARH.RH_HIST_FUNCAO_CONFIANCA`, `SARH.RH_MOVIMENTACAO_FUNCIONAL` e `SARH.RH_PESO_FUNCAO`: estrutura de referência para função, categoria, código folha, lotação, histórico, movimentação e peso/código de folha.

## Regras de negócio refletidas no SECP

O SECP passa a ter modelo próprio para sobreviver ao fim do SARH, preservando importação histórica quando existir:

- `FuncaoConfiancaReferencia`: referência de função, categoria/código, valor mensal, código de folha e vínculo opcional à seccional.
- `SubstituicaoFuncao`: cadastro do titular, substituto, função titular, função substituta, unidade, período, tipo, status, ato, publicação, processo SEI e origem.
- `PagamentoSubstituicaoFuncao`: cálculo por competência/período, com valor da função do titular, valor da função do substituto, diferença mensal, divisor mensal, valor do dia e valor total.
- `PagamentoSubstituicaoFuncaoDia`: memória diária do pagamento, ligada a afastamento SARH, falta apurada ou ajuste manual.

## Fórmula suportada

O cálculo padrão do cenário informado pelo usuário é:

```text
diferença mensal = valor da função do titular - valor da função do substituto
valor do dia = diferença mensal / 30
valor total = valor do dia * quantidade de dias elegíveis
```

Exemplo: titular com função de R$ 1.000,00 e substituto com função de R$ 300,00 gera diferença mensal de R$ 700,00. O valor diário é R$ 23,33, antes de arredondamentos parametrizáveis pelo fluxo de pagamento.

## Próximos pontos funcionais

- Criar rotina de sincronização para importar `RH_SUBSTITUICAO_AUTOMATICA`, `RH_SUBSTITUTO_AUTOMATICO` e `RH_SUBSTITUTO_FUNCAO`.
- Criar tela administrativa para manter funções, valores e substituições diretamente no SECP.
- Criar rotina de cálculo que gere `PagamentoSubstituicaoFuncao` a partir de afastamentos/faltas do titular e do período cadastrado.
- Parametrizar, por seccional, se o pagamento considera dias corridos, dias úteis ou outro critério.
