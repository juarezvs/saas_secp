# Oracle Instant Client para deploy

Coloque aqui o ZIP Linux x64 do Oracle Instant Client Basic Light quando o deploy precisar ser independente de internet.

Nome esperado:

```text
instantclient-basiclite-linuxx64.zip
```

Tambem sao aceitos nomes versionados que comecem com `instantclient-basiclite-linux` e terminem com `x64.zip`.

O `Dockerfile` usa este arquivo no build da imagem. Se nenhum ZIP estiver presente, o build baixa o Instant Client automaticamente do site da Oracle.

Nao use aqui o client Windows de `C:\oracle`, pois ele contem `.dll`/`.exe` e nao funciona no container Linux.
