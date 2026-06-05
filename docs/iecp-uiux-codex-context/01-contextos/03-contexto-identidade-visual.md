# 03 — Contexto de identidade visual do SECP

## Conceito

O SECP deve parecer uma solução institucional de governança de frequência, não apenas um formulário de ponto.

Palavras-chave:

- confiança;
- rastreabilidade;
- clareza;
- ação orientada;
- segurança;
- acessibilidade;
- conformidade.

## Paleta principal

| Token | Uso | Hex sugerido |
|---|---|---:|
| `--secp-blue-900` | Header, sidebar ativa, botões primários | `#002F6C` |
| `--secp-blue-800` | Hover primário | `#003C88` |
| `--secp-blue-700` | Links e destaques | `#0050B5` |
| `--secp-green-700` | Sucesso, homologado, regular | `#007A33` |
| `--secp-gray-600` | Texto secundário | `#6B7280` |
| `--secp-gray-500` | Cinza institucional | `#97999B` |
| `--secp-bg` | Fundo da aplicação | `#F5F7FA` |
| `--secp-card` | Fundo de cards | `#FFFFFF` |
| `--secp-warning` | Pendente, prazo, atenção | `#F59E0B` |
| `--secp-danger` | Erro, falta, indeferido | `#B42318` |
| `--secp-info` | Informação | `#2563EB` |

## Tipografia

Preferir fonte sem serifa, moderna e legível:

- `Inter`, `Arial`, `Segoe UI`, fallback `sans-serif`.
- Para fonte de dislexia, usar classe alternativa configurável pelo usuário.

Escala sugerida:

| Uso | Tamanho |
|---|---:|
| Título de página | 24–32px |
| Título de card | 16–18px |
| Texto normal | 14–16px |
| Texto auxiliar | 12–13px |
| Número de indicador | 28–40px |

## Ícones

Usar ícones lineares, simples e consistentes. Sugestão: Lucide React.

Mapeamento:

- Início: `Home`.
- Registrar ponto: `Clock`.
- Frequência: `CalendarDays`.
- Banco de horas: `Hourglass`.
- Solicitações: `ClipboardList`.
- Homologação: `CheckCircle`.
- Auditoria: `ShieldCheck`.
- Recesso: `CalendarRange`.
- Relatórios: `BarChart3`.
- Acessibilidade: `Accessibility`.

## Layout visual

- Header azul institucional em gradiente discreto.
- Sidebar clara com item ativo em azul.
- Cards brancos com borda cinza clara e sombra suave.
- Ação principal em card azul com destaque.
- Badges pequenos e objetivos.
- Muito espaço em branco.
- Tabelas limpas, com cabeçalho fixo quando útil.

## Tom de comunicação

Usar frases curtas e orientadas à ação.

Evitar:

- “Erro genérico”.
- “Operação inválida”.
- “Acesso negado” sem explicação.

Preferir:

- “Você ainda não possui permissão para registrar ponto via web.”
- “Sua chefia precisa autorizar a compensação antes da fruição.”
- “Há uma pendência que pode impactar a homologação mensal.”

## Referência visual

O arquivo `assets/secp-dashboard-reference.png` representa a direção visual esperada:

- dashboard com sidebar;
- header institucional;
- card de próxima ação;
- cards de indicadores;
- timeline de marcações;
- painel de alertas;
- gráfico simples;
- acesso rápido;
- guia rápido.

Não copiar literalmente cada pixel. Implementar o padrão e a experiência.
