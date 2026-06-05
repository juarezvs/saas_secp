# 02 — Contexto normativo da Portaria aplicado à UI

## Finalidade

Este arquivo traduz regras da Portaria SJAM-DIREF 135/2025 em decisões de interface. Não substitui a análise jurídica ou normativa; serve para orientar a implementação visual.

## Regras normativas que devem aparecer na UI

### Controle eletrônico de frequência

A interface deve deixar claro que a frequência é registrada por meio eletrônico/biométrico e que o sistema controla entrada, saída, saída de intervalo e retorno de intervalo.

Implicações visuais:

- Timeline do dia.
- Próxima marcação calculada pela sequência cronológica.
- Comprovante de registro.
- Indicação do método: biometria, web, equipamento, meio alternativo.

### Jornada de trabalho

A UI deve exibir jornada prevista de 7h ou 8h, além de indicar intervalo quando aplicável.

Implicações visuais:

- Card “Jornada hoje”.
- Card “Trabalhado hoje”.
- Mensagem de intervalo mínimo e máximo quando jornada for 8h.
- Sinalização quando houver horário diferenciado.

### Expediente institucional

A UI deve mostrar alertas quando a marcação ocorrer fora do expediente padrão ou dentro de janela excepcional.

Implicações visuais:

- Badge “Fora do expediente padrão”.
- Tooltip: “Horário excepcional depende de justificativa/autorização”.
- Card de orientação em solicitações de horário diferenciado.

### Banco de horas

A UI deve apresentar saldo, validade, limite mensal ordinário e necessidade de autorização.

Implicações visuais:

- Card de saldo atual.
- Indicador de crédito/débito.
- Lista de créditos/débitos a vencer.
- Alerta ao aproximar do limite de 16h mensais.
- Alerta de prazo de 3 meses para compensação.

### Solicitações

A interface deve guiar o servidor com stepper.

Tipos visuais mínimos:

- Ajuste de ponto.
- Compensação.
- Abono / justificativa.
- Atividade externa.
- Viagem a serviço.
- Horário diferenciado.
- Dispensa excepcional, quando aplicável ao perfil autorizado.

### Homologação

A UI da chefia deve funcionar como fila de decisão, não como tabela passiva.

Estados sugeridos:

- Regular.
- Pendente de solicitação.
- Falta injustificada.
- Débito não compensado.
- Aguardando servidor.
- Aguardando chefia.
- Homologado.
- Encaminhado à SECAP.

### Notificação e defesa

Quando houver falta injustificada ou débito não compensado, a interface deve destacar o prazo de defesa.

Implicações visuais:

- Alerta crítico.
- Prazo em dias úteis.
- Botão “Apresentar justificativa”.
- Registro em timeline.

### Recesso forense

O recesso deve ser separado do ponto ordinário.

Implicações visuais:

- Dashboard próprio.
- Espelho próprio.
- Separação dezembro/janeiro.
- Fluxo próprio: servidor fecha, chefia homologa, SECAD aceita, SEPAG consolida pecúnia, SECAP consolida folgas.
- Dias não convocados exibem “Recesso forense”, nunca vazio.

### Acesso à frequência

Servidor e chefia devem visualizar frequência diária e saldo.

Implicações visuais:

- “Minha frequência” para servidor.
- “Frequência da equipe” para gestor.
- Exportação de espelho.
- Trilhas de auditoria.

### Responsabilidades institucionais

A UI deve separar módulos conforme responsabilidade:

- NUTEC: usuários, equipamentos, integrações e suporte.
- SECAP/NUCGP: boletins, conferência funcional, ocorrências.
- SECAD: acompanhamento administrativo e aceite de homologações especiais.
- DIREF: deliberações e autorizações excepcionais.

## Padrão para Card de Regra da Portaria

Toda tela crítica deve incluir um componente `PortariaRuleCard` com:

- Título da regra.
- Artigo ou referência.
- Resumo em linguagem simples.
- Impacto prático.
- Link interno “ver detalhes”.

Exemplo:

```txt
Regra aplicada
Art. 6º — O registro da frequência deve ocorrer por meio eletrônico/biométrico.
Impacto: esta marcação gera registro auditável de entrada ou saída.
```

## Regra de ouro

Nenhuma tela do SECP deve exigir que o usuário memorize a Portaria para tomar uma decisão operacional correta.
