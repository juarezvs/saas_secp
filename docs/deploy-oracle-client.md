# Oracle Instant Client no deploy

O deploy Docker do SECP usa o Oracle Instant Client para a sincronizacao SARH em Thick mode.

Para enviar o sistema a outra seccional sem depender de internet durante o build, mantenha o ZIP Linux x64 em:

```text
docker/oracle/instantclient-basiclite-linuxx64.zip
```

O client Windows de `C:\oracle` nao deve ser usado no container Linux. Ele contem `.dll` e `.exe`; o container precisa do pacote Linux.

O `Dockerfile` procura primeiro o ZIP em `docker/oracle`. Se ele nao existir, baixa automaticamente o Instant Client da Oracle durante o build.

O pacote `oracledb` tambem e copiado explicitamente para a imagem standalone do Next, pois ele contem o binario nativo necessario para o Thick mode.
