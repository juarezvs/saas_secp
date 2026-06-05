# SPEC 03 — Biometria Facial

## Objetivo
Implementar cadastro e validação facial para permitir registro de marcação por reconhecimento facial mediante permissão.

## Regras
1. Cadastro facial: frontal, direita, esquerda e futuramente sorriso.
2. Captura automática, sem botão manual.
3. Contorno visual da face.
4. Salvar template normalizado e metadados.
5. Qualidade deve ser `0..1`, não percentual `0..100`.
6. Validação para registro exige similaridade mínima de 0.75.
7. Após validação, gerar autorização biométrica temporária.
8. Registro facial consome autorização e cria marcação bruta `FACIAL_AUTORIZADO`.

## Cuidados técnicos
- `@vladmandic/human` apenas client-side.
- Não importar Human em Server Component.
- `human.detect(video)` retorna objeto com `face`.
- `yaw` pode vir zero; usar deslocamento do centro da face como fallback.
- Vídeo espelhado inverte percepção direita/esquerda.

## Critérios de aceite
- [ ] Cadastro conclui frontal/direita/esquerda.
- [ ] Salva template sem erro `Too big: expected number <= 1`.
- [ ] Registro facial valida e cria marcação bruta.
- [ ] Não registra direto em `Marcacao`.
