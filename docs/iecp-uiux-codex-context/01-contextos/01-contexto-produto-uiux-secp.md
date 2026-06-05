# 01 — Contexto do produto UI/UX SECP

## Produto

O **SECP — Sistema Eletrônico de Controle de Ponto** é uma plataforma institucional para registro, acompanhamento, correção, homologação, auditoria e consolidação da frequência funcional no âmbito da Justiça Federal do Amazonas.

## Tese de UX

O SECP deve ser um sistema auto-instrucional. O usuário não deve precisar conhecer a Portaria para operar corretamente o sistema. A interface deve traduzir a regra normativa em orientação visual, prazo, ação recomendada e consequência.

Toda tela crítica deve responder:

1. O que está acontecendo?
2. O que eu preciso fazer agora?
3. Qual é o prazo?
4. Quem analisa depois?
5. Qual artigo ou regra fundamenta essa ação?

## Perfis centrais

- Servidor.
- Gestor / chefia imediata.
- Delegado da chefia.
- Administrador.
- NUTEC.
- SECAP / NUCGP.
- SECAD.
- DIREF.
- Auditor / consulta.
- Perfis customizados.
- Prestadores, estagiários e voluntários com dashboard simplificado.

## Experiência por perfil

### Servidor

Foco em ação rápida:

- Registrar ponto.
- Ver marcações do dia.
- Resolver pendência.
- Consultar banco de horas.
- Solicitar ajuste, compensação, abono, atividade externa ou viagem.
- Fechar período quando aplicável.

### Gestor

Foco em decisão:

- Ver equipe.
- Priorizar pendências críticas.
- Analisar solicitações.
- Homologar frequência.
- Gerenciar banco de horas da equipe.
- Validar recesso forense.

### NUTEC

Foco em sustentação:

- Usuários.
- Perfis.
- Permissões.
- Equipamentos.
- Integrações.
- Logs técnicos.

### SECAP / NUCGP

Foco em conferência funcional:

- Boletins recebidos.
- Pendências por unidade.
- Conferência com SARH.
- Ocorrências para folha.

### SECAD / DIREF

Foco em governança e deliberação:

- Indicadores institucionais.
- Pendências críticas.
- Autorização excepcional.
- Acompanhamento de prazos.
- Decisões administrativas.

## Princípios visuais

- Interface limpa, institucional e moderna.
- Layout de portal administrativo, inspirado em Azure Portal.
- Sidebar recolhível.
- Header com contexto institucional.
- Cards grandes para ação recomendada.
- Badges de status claros.
- Tabelas com filtros robustos.
- Orientações normativas próximas à ação.
- Acessibilidade no topo, sempre disponível.

## Padrão de ação recomendada

Sempre que possível, a primeira dobra da tela deve conter um `NextActionCard`.

Exemplos:

- “Registre sua entrada por reconhecimento facial.”
- “Resolva 1 ajuste pendente antes do fechamento mensal.”
- “Há 6 servidores aguardando homologação.”
- “O período de recesso de dezembro está aguardando fechamento.”

## Resultado esperado

O usuário deve conseguir operar o SECP mesmo no primeiro acesso, com mínima necessidade de treinamento, porque o fluxo, os prazos, as consequências e os fundamentos estarão visíveis na própria interface.
