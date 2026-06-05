# 06 — Spec-Driven Development para UI/UX do SECP

## Objetivo

Fazer o Codex implementar a UI por especificações pequenas, rastreáveis e testáveis.

## Formato de cada spec

Cada spec deve conter:

1. Objetivo.
2. Escopo.
3. Fora de escopo.
4. Arquivos prováveis.
5. Componentes necessários.
6. Estados de UI.
7. Acessibilidade.
8. Critérios de aceite.
9. Checklist de revisão.
10. Prompt operacional.

## Ordem de implementação recomendada

1. Tokens visuais.
2. Componentes base.
3. AppShell/Header/Sidebar.
4. Dashboard servidor.
5. Registro de ponto.
6. Solicitações com stepper.
7. Espelho de ponto e banco de horas.
8. Homologação da chefia.
9. Recesso forense.
10. Landpage e login.
11. Acessibilidade avançada.
12. Polimento visual e responsividade.

## Regra de tamanho

O Codex deve ser instruído a manter:

- componentes até 250 linhas;
- hooks até 150 linhas;
- páginas até 120 linhas;
- arquivos de configuração até 200 linhas.

Se exceder, deve propor decomposição.

## Critérios globais de aceite

- Build sem erro.
- Lint sem erro relevante.
- Interface responsiva.
- Navegação por teclado.
- Foco visível.
- Estados loading, empty, error e success.
- Cards de orientação.
- Cards de regra da Portaria nas telas críticas.
- Sem regra de negócio complexa em componente visual.
- Sem dados sensíveis hardcoded.

## Prompt padrão para uma spec

```txt
Implemente a SPEC <número> do pacote SECP UI/UX.
Leia os arquivos de contexto abertos e a skill relacionada.
Antes de codificar, liste os arquivos que pretende criar/alterar.
Implemente somente o escopo da spec.
Ao final, mostre checklist de aceite e comandos de teste.
```
