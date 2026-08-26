Ele faz o fluxo completo de produção: empacota o código local sem .env, .tmp, backups e artefatos grandes, envia para o servidor, cria backup da release atual, roda build, migrations, seed, publica somente o secp-web, valida /api/ready, valida a CA do TRF1 dentro do container e mantém só os 2 backups/deploys mais recentes.

Uso padrão:

$env:SECP_PROD_SSH_PASSWORD = "sua-senha-ssh"
.\scripts\deploy-producao.ps1


Ou passando a senha só na execução:

.\scripts\deploy-producao.ps1 -SshPassword "sua-senha-ssh"


Também dá para definir versão manual:

.\scripts\deploy-producao.ps1 -AppVersion "20260818_ajuste_x"