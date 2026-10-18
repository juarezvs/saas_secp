# Consulta de contracheque do servidor

A tela `/meu-contracheque` segue a referência visual fornecida: fundo claro com gradiente discreto, cartões de indicadores, histórico à esquerda, demonstrativo à direita, resumo financeiro e ações rápidas. O layout se adapta ao celular e ao tema escuro.

## Acesso e uso

Entrar no SECP com o perfil **Servidor** e abrir **Meu contracheque**. A consulta inicial seleciona a competência mais recente retornada pelo SARH. Os campos de competência e tipo de documento permitem pesquisa. O botão **Filtros** abre a busca por descrição/competência. O histórico apresenta seis registros por página; a seleção de um documento atualiza a prévia e os valores.

**Baixar PDF** usa a exportação existente e autenticada. **Imprimir** prepara somente o demonstrativo selecionado para impressão pelo navegador. **Compartilhar** prepara o PDF e, nos dispositivos compatíveis, pede um segundo toque para abrir o compartilhamento de arquivos do sistema. Em navegador incompatível, orienta baixar e enviar o PDF. Não é criado um link público de acesso ao contracheque.

## Origem dos dados e fidelidade das informações

| Informação | Origem |
|---|---|
| Competências disponíveis | Cabeçalhos do próprio servidor em `spddba01.sfpt_contracheque`, até 36 competências |
| Histórico e quantidade de documentos | Cabeçalhos nos 12 meses encerrados na competência selecionada |
| Valores brutos, descontos e líquido | Rubricas `R`/`D` de `spddba01.sfpv_rubricas_contracheque`, usando o cálculo já existente no SECP |
| Identificação, cargo, função e lotação do demonstrativo | Cabeçalho do documento no SARH; nome/lotação atuais são usados no cabeçalho da tela somente se ausentes no demonstrativo |
| Margem consignável | `spddba01.sfpt_margem_consignavel` |
| Data da folha | `chave_folha`; não é apresentada como data de publicação |
| Minigráficos | Valores reais dos últimos 12 documentos do histórico, em ordem cronológica |

Os cartões de pendências, downloads e informe anual da referência foram substituídos por descontos, competências consultadas e margem consignável, pois a integração atual não fornece aqueles indicadores. Informe de rendimentos e comprovante bancário aparecem como indisponíveis nesta consulta; não há disponibilidade fictícia nem documentos de demonstração.

Valores ausentes não se tornam indicadores financeiros zerados. Quando o SARH não pode ser consultado, a tela informa a indisponibilidade. O CPF fica mascarado na prévia e a conta bancária mostra apenas o final. O PDF existente mantém seu conteúdo e a indicação de finalidade para conferência, sem valor legal.

## Proteção e implementação

A matrícula e o órgão são derivados da sessão e do vínculo funcional ativo no servidor, sem aceitar esses campos na URL. A consulta e o PDF exigem o perfil Servidor, a permissão `contracheque:consultar:proprio` e órgão/unidade/vínculo ativos. Documentos incompatíveis com a competência solicitada são recusados. O histórico preserva a separação por folha e sequência, incluindo a regra existente de sequência zero.

O histórico usa uma conexão Oracle e duas consultas limitadas ao próprio servidor e ao intervalo de 12 meses. Links do histórico não fazem pré-carregamento automático de contracheques. As informações financeiras continuam consultadas sob demanda; não foram criadas tabelas, migrations, seeds ou armazenamento de valores no SECP.

Branch: `feature/meu-contracheque-layout`. Código inicial consolidado no commit `bb2ae4a`. Os ajustes responsivos e de impressão estão no commit `c56ae67`.


## Validação em desenvolvimento — 18/10/2026

- Consulta somente de leitura ao SARH para o próprio servidor de teste: 36 competências disponíveis, 20 documentos no intervalo de 12 meses e 13 rubricas no documento selecionado. Todos os 20 documentos tinham totais; os valores do histórico coincidiram com o detalhamento. Nenhum valor salarial é incluído neste registro.
- 14 testes automatizados aprovados: identidade funcional, consultas Oracle e regressão da remuneração base de horas extras. ESLint dos arquivos alterados aprovado.
- A compilação inicial (`bb2ae4a`) passou pela verificação completa de TypeScript e geração das páginas. A recompilação dos ajustes visuais (`c56ae67`) passou pela compilação e geração das páginas; não repetiu a análise global de TypeScript, por configuração exclusiva do contêiner temporário. A configuração do repositório continua inalterada.
- Build executado no Ubuntu em pasta isolada de desenvolvimento, com limite de dois processadores e 6 GiB, sem substituir serviços de produção. A imagem inclui o módulo nativo Oracle Linux completo; inicialização em modo thick confirmada com node-oracledb 6.10.0.
- Teste no navegador contra o desenvolvimento publicado: página e PDF reais com HTTP 200, paginação de seis registros, busca, limpeza de filtros, pesquisa nos dois dropdowns e seleção de folha suplementar aprovados. Documento incompatível com a competência retornou 404; acesso anônimo ao PDF foi protegido. O teste usou uma sessão assinada temporária do próprio usuário, sem validar novamente o login LDAP.
- Inspeção visual realizada em desktop e celular. Na largura de 412 px, a página não apresentou transbordamento horizontal; o histórico mantém rolagem dentro da tabela. A impressão remove o limite de altura das rubricas e usa fundo branco mesmo no tema escuro. Nenhum erro de execução foi detectado no cliente.
- Publicada a imagem local `secp-web:dev_20261018_contracheque_final`, identificador `sha256:455d2224e84f5b6eedd5f904eb8308aea034c6a8341706a170348b7829d1bf89`, construída com o código de `c56ae67`. Capturas e resultados com informações pessoais ficam somente na pasta temporária privada, fora do Git.

A página pode ser acessada em `http://localhost:3000/meu-contracheque`, com o perfil **Servidor**. Não foram executados migrations, seeds ou alterações de dados financeiros. Produção não foi atualizada nesta entrega.
