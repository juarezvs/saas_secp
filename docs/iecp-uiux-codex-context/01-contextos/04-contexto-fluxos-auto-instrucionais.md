# 04 — Contexto dos fluxos auto-instrucionais

## Princípio

O SECP deve guiar o usuário do início ao fim da tarefa.

Cada fluxo deve ter:

1. Contexto.
2. Regra aplicável.
3. Dados necessários.
4. Validação.
5. Revisão.
6. Confirmação.
7. Comprovante.
8. Próximo responsável.

## Fluxo: registrar ponto

```txt
Usuário abre dashboard
→ sistema identifica próxima marcação
→ sistema informa método exigido
→ usuário registra
→ sistema confirma
→ sistema mostra comprovante
→ dashboard atualiza timeline
```

### Mensagens obrigatórias

- “Esta é sua próxima marcação: Entrada.”
- “Método: reconhecimento facial.”
- “Registro realizado com sucesso.”
- “Comprovante gerado.”

## Fluxo: solicitação de ajuste

```txt
Selecionar data
→ informar marcação faltante
→ justificar
→ anexar documento se necessário
→ revisar
→ enviar
→ gerar comprovante
→ encaminhar à chefia
```

### Estado final

- Aguardando análise da chefia.

## Fluxo: solicitação de compensação

```txt
Selecionar saldo/dia
→ informar data de compensação
→ justificar interesse
→ revisar impacto no banco
→ enviar para chefia
→ comprovante
```

### Alertas

- “Compensação depende de autorização.”
- “Saldo negativo deve ser priorizado.”
- “Observe o prazo de até 3 meses.”

## Fluxo: homologação mensal

```txt
Chefia acessa painel
→ sistema agrupa servidores por criticidade
→ chefia analisa pendências
→ chefia aprova/indefere solicitações
→ sistema recalcula frequência
→ chefia homologa
→ sistema gera boletim
→ encaminha à SECAP/NUCGP
```

## Fluxo: recesso forense

```txt
Admin cadastra recesso
→ cadastra convocados e chefias
→ servidor registra dias convocados
→ servidor fecha dezembro/janeiro separadamente
→ chefia homologa
→ SECAD aceita
→ SEPAG consolida pecúnia
→ SECAP consolida folgas
```

## Fluxo: acesso por perfil

Ao entrar, o usuário deve ver:

- perfil ativo;
- unidade atual;
- permissões aplicadas;
- próxima ação relevante para aquele perfil.

Se houver múltiplos perfis, permitir troca no header com confirmação visual:

```txt
Você está atuando como: Gestor
Unidade: SJAM > SECAD > NUTEC
```

## Card de orientação padrão

```txt
O que você faz nesta tela?
Explique em até 2 linhas.

Quando usar?
Explique em até 2 linhas.

Próximo passo:
[Botão de ação]
```

## Card de consequência

Usar em telas sensíveis:

```txt
Atenção
Se esta pendência não for resolvida no prazo, poderá impactar a homologação mensal e gerar comunicação à área competente.
```
