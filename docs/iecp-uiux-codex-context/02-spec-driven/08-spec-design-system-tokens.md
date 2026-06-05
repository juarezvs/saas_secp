# 08 — Spec: Design System Tokens

## Objetivo

Criar a base visual reutilizável do SECP com tokens de cor, espaçamento, raio, sombra, tipografia e estados.

## Escopo

- Variáveis CSS.
- Configuração Tailwind quando aplicável.
- Classes utilitárias institucionais.
- Tokens claro/escuro.
- Tokens de status.

## Tokens obrigatórios

### Cores

```txt
secp-blue-900: #002F6C
secp-blue-800: #003C88
secp-blue-700: #0050B5
secp-green-700: #007A33
secp-gray-500: #97999B
secp-bg: #F5F7FA
secp-card: #FFFFFF
secp-warning: #F59E0B
secp-danger: #B42318
secp-info: #2563EB
```

### Raios

```txt
radius-sm: 6px
radius-md: 10px
radius-lg: 14px
radius-xl: 20px
```

### Sombras

```txt
shadow-card: suave, institucional
shadow-floating: para menus e drawers
```

### Espaçamento

Base 4px.

## Estados de status

- Regular.
- Pendente.
- Crítico.
- Homologado.
- Indeferido.
- Aguardando análise.
- Recesso/feriado.
- Bloqueado.

## Tema escuro

Deve existir estrutura preparada, mesmo que a primeira versão seja simples.

## Critérios de aceite

- Tokens centralizados.
- Cores não espalhadas manualmente em todos os componentes.
- Suporte a tema claro/escuro.
- Alto contraste preservado.
- Componentes base usam tokens.

## Prompt operacional

```txt
Implemente a SPEC 08: Design System Tokens.
Crie tokens CSS/Tailwind para a identidade visual do SECP.
Não altere páginas de domínio.
Depois atualize os componentes base para consumir tokens quando existirem.
```
