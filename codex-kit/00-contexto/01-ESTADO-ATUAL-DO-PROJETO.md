# 01 — Estado Atual do Projeto SECP

## Funcionalidades já trabalhadas
1. Estrutura modular Next.js App Router.
2. Autenticação com Auth.js/NextAuth.
3. RBAC com múltiplos perfis e perfil ativo.
4. Cadastro de servidores com usuário correspondente.
5. CPF em Servidor e necessidade de CPF também em Usuario.
6. Jornada padrão de 7h para servidor novo.
7. AFD/importação de arquivos, BullMQ/Redis e processamento assíncrono.
8. Marcações brutas imutáveis.
9. Processamento de marcações brutas para marcações calculadas.
10. Espelho mensal com marcações do dia, crédito, débito e cores.
11. Relatórios PDF de espelho, banco de horas, boletim.
12. Biometria facial: cadastro automático frontal/direita/esquerda e validação facial em progresso.
13. Dashboard por perfil: Admin e Servidor.
14. Listagens com filtros/paginação/exportação em Servidores e Unidades em evolução.
15. PageHeader e RegraPortariaCard com popup normativo.

## Principais problemas já encontrados e padrões de correção

### Next route.ts com JSX
Erro: `Expected '>', got 'ident'`.
Solução: manter `route.ts` e usar `React.createElement`, nunca JSX dentro de `.ts`.

### PDF Response com Buffer
Erro: `Buffer<ArrayBufferLike> is not assignable to BodyInit`.
Solução: `return new Response(new Uint8Array(buffer), {...})`.

### React PDF typing
Erro: `FunctionComponentElement<Props> is not assignable to ReactElement<DocumentProps>`.
Solução:
```ts
const documento = React.createElement(Component, props) as ReactElement<DocumentProps>;
const buffer = await renderToBuffer(documento);
```

### Prisma include inexistente
Exemplo: `biometriaFacial` vs `biometriaFacialServidor`, `ativo` inexistente em `BiometriaFacialServidor`.
Solução: consultar schema antes, usar campos reais (`status: "ATIVO"`).

### Enum inválido
Exemplo: `StatusSolicitacao` não possui `PENDENTE`, usa `ENVIADA`, `EM_ANALISE`, `DEFERIDA`, etc.
Solução: usar enums reais do schema.

### Hydration mismatch
Causado por localStorage no estado inicial.
Solução: estado inicial estável e leitura no `useEffect` após mount.

### Human/Vladmandic
`human.detect(video)` retorna objeto com `face`, não array direto.
Direção direita/esquerda pode não vir em `yaw`; usar deslocamento do centro da face quando yaw vier 0.

## Lacunas prioritárias
1. Recesso Forense como bounded context próprio.
2. Homologação especial do recesso: servidor → chefia → SECAD → SEPAG/SECAP.
3. Exportador genérico PDF/CSV para todas as listagens.
4. DataTable genérica reutilizável.
5. Auditoria completa em todos os fluxos.
6. Testes automatizados de cálculo e regras da Portaria.
7. Integração SARH completa: órgãos, lotações, servidores, cargos.
8. Integração SEI para documentos/boletins futuramente.
