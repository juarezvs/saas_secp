# 00 — Contexto Mestre do SECP para Codex/VSCode

## Papel do agente
Você atuará como Arquiteto de Software Sênior e Engenheiro de Contexto do projeto **SECP — Sistema Eletrônico de Controle de Ponto**, usando Next.js App Router, TypeScript, Tailwind CSS v4, Prisma v7, PostgreSQL, Auth.js/NextAuth, Docker, Clean Architecture, DDD, SOLID e RBAC dinâmico.

## Objetivo do produto
Construir o SECP para atender integralmente a Portaria SJAM-DIREF 135/2025, que regulamenta expediente, jornada, controle eletrônico de frequência, banco de horas, homologação mensal e boletim de frequência no âmbito da Seção Judiciária do Amazonas, Subseção Judiciária de Tabatinga e UAA de Tefé.

## Regras normativas centrais
1. Registro ordinário por equipamento biométrico integrado ao sistema.
2. Entrada, saída, intervalo e retorno devem ser classificados dinamicamente pela sequência cronológica do dia.
3. Jornada de 7h ininterruptas ou 8h com intervalo de 1h a 3h.
4. Expediente institucional: 8h às 18h, com hipótese excepcional de horário diferenciado entre 6h e 19h.
5. Banco de horas com horas-crédito, horas-débito, horas não autorizadas, horas acima do limite, horas excedentes e horas excedentes noturnas.
6. Limite ordinário de 16h mensais de crédito para fruição futura.
7. Compensação de horas-crédito e horas-débito em até 3 meses.
8. Autorização prévia da chefia para realização e compensação de horas.
9. Homologação mensal pela chefia até o 2º dia útil do mês subsequente.
10. Envio do Boletim de Frequência à SECAP/NUCGP até o dia 10 de cada mês.
11. Notificação do servidor em caso de falta injustificada ou horas-débito não compensadas, com prazo de 2 dias úteis para defesa.
12. Recesso Forense anual de 20/12 a 06/01 como domínio próprio, separado do controle ordinário.

## Regras complementares já decididas no projeto
1. O SECP terá múltiplos perfis por usuário, com apenas um perfil ativo por sessão.
2. RBAC deve ser dinâmico: perfis e permissões cadastráveis.
3. Usuário inicial: `secp` / senha `secp`, com perfil administrativo/master.
4. Login inicial por matrícula e senha de rede Windows/AD, com arquitetura preparada para Google, Microsoft Entra ID, Apple e outros provedores via Auth.js.
5. Servidor cadastrado deve receber automaticamente usuário correspondente, perfil SERVIDOR e jornada padrão de 7h ininterrupta.
6. CPF deve existir em `Usuario` e `Servidor`, sincronizados em transação.
7. Registro web só aparece para usuário com permissão específica.
8. Registro facial só aparece para usuário com permissão específica.
9. Cadastro facial deve capturar frontal, direita, esquerda e futuramente sorriso, com UX semelhante a apps bancários.
10. AFD/equipamentos biométricos gravam marcações em tabela bruta imutável.
11. Marcações brutas são processadas e geram marcações calculadas; nunca editar dado bruto.
12. Pessoas não servidoras podem ter acesso ao sistema e, quando aplicável, registros simples de entrada/saída sem regras de servidor.
13. Todas as páginas de listagem devem seguir o padrão de DataTable com filtros por coluna, pesquisa com debounce, itens por página, paginação e exportação CSV/PDF.

## Padrão visual e UX
1. Layout inspirado no Portal Azure/Microsoft.
2. Cores institucionais: azul Pantone 294 C, verde Pantone 356 C, cinza Pantone Cool Gray 7.
3. AppShell com sidebar recolhível e header.
4. Breadcrumb em todas as páginas internas.
5. `PageHeader` com ícone, título, descrição, ações e `RegraPortariaCard` como ícone discreto com popup.
6. Regras normativas devem aparecer como ajuda contextual, não como bloco grande em todas as telas.
7. Acessibilidade no header: VLibras, claro/escuro, tamanho de fonte, fonte para dislexia, ARIA.
8. Client Components devem evitar hydration mismatch: não ler localStorage diretamente no estado inicial renderizado no servidor.

## Arquitetura de pastas atual recomendada
```
src/
  app/
    (app)/
    api/
  components/
    layout/
    ui/
    listagens/
  modules/
    auth/
    usuarios/
    perfis/
    orgaos/
    unidades/
    servidores/
    jornadas/
    marcacoes/
    marcacoes-brutas/
    afd/
    banco-horas/
    solicitacoes/
    homologacao/
    boletim-frequencia/
    relatorios/
    biometria/
    recesso-forense/
    auditoria/
    integracoes/
  shared/
    infrastructure/
    domain/
    application/
prisma/
workers/
```

## Regras para o Codex
- Não fazer alterações gigantes em vários módulos sem uma spec clara.
- Antes de alterar, localizar arquivos existentes e preservar nomes/funções já usados.
- Entregar sempre versão final completa dos arquivos alterados quando solicitado.
- Rodar mentalmente `npm run build`, checando tipagem Prisma, imports e App Router.
- Em rotas API `route.ts`, não usar JSX; usar `React.createElement` para PDF.
- `@react-pdf/renderer` deve usar `renderToBuffer` com cast para `ReactElement<DocumentProps>` e `Response(new Uint8Array(buffer))`.
- Never criar CSV/PDF considerando apenas página atual; exportação deve respeitar filtros e ignorar paginação.
- Dado bruto de marcação é imutável.
- Toda operação relevante deve gerar auditoria.
