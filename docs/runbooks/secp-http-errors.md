# Erros HTTP no SECP

1. Abra o dashboard SECP - Visao Geral e identifique as rotas com 5xx.
2. Consulte logs do `secp-web` no intervalo do alerta.
3. Verifique PostgreSQL e Redis se os erros envolverem telas pesadas.
4. Se o erro ocorrer apos deploy, compare a imagem ativa com a anterior.

