# Descoberta de equipamentos do SECP

Extensão independente: Next.js → API administrativa assinada → FastAPI/SQL → agentes de saída HTTPS → redes autorizadas. O serviço não participa da coleta ou do processamento de ponto. Não configura relógios, não lê marcações/usuários/imagens/templates e não tenta senhas padrão.

## Componentes e arquivos

- `discovery/central.py`: API v1, inscrições, aprovação, redes, jobs, leases, resultados, retenção e métricas.
- `db.py`, `migrations/`: persistência exclusiva de descoberta, via SQLAlchemy/Alembic. Nenhuma migration Prisma necessária.
- `agent.py`: inscrição, token individual, heartbeat, rotação, outbox SQLite durável, reconexão e cancelamento cooperativo.
- `scanner.py`, `local_network.py`: interfaces, vizinhança ARP, TCP, ICMP opcional, mDNS, SSDP, WS-Discovery e SNMP GET sysDescr.0.
- `adapters.py`: identificação específica por protocolo e evidências declaradas/inferidas. Somente metadados permitidos são serializados.
- `worker.py`: manutenção independente de leases, deadlines e retenção; Redis opcional para heartbeat/notificações.
- `src/modules/descoberta`, no repositório principal: gateway, conciliação de identidades, cadastro assistido e console Next.js.

O SQL é a fila durável. Redis não é uma segunda fonte de estado: sua indisponibilidade não perde jobs ou resultados. Agentes recebem um job por vez; cada lease expira em 120 s. Após perda do agente, hosts ainda não confirmados são reenfileirados, até três tentativas. Deadline por job: 30 min. Retenção: jobs/observações por 30 dias e auditoria por 90 dias. O worker deve permanecer ativo para executar essas políticas.

SQLite WAL atende uma instalação pequena com um central/worker. Use PostgreSQL com banco/usuário exclusivos para múltiplas instâncias e concorrência de produção. Não aponte migrations para o banco do SECP.

## Instalação do serviço central

Pré-requisitos: Docker Compose ou Python 3.12+, rota dos agentes até o central e certificado TLS válido. As tabelas usam prefixo `discovery_`; o controle Alembic usa `discovery_alembic_version`.

```bash
cd services/device-discovery
cp .env.example .env
python -c 'import secrets; print(secrets.token_urlsafe(48))'
# Copie o valor gerado para DISCOVERY_GATEWAY_SECRET no .env e no backend Next.js.
# Configure o banco exclusivo, os certificados em ./certs e suas permissões.
docker compose --profile tools run --rm migrate
docker compose up -d --build central worker
docker compose ps
docker compose logs --tail 50 central worker
```

O exemplo publica somente `127.0.0.1:8041`. Antes de iniciar, confira `DISCOVERY_DOCKER_SUBNET`: a rede privada do Docker não pode se sobrepor às redes institucionais/VPN, inclusive redes alcançadas pelos drivers atuais. O padrão explícito é `172.31.254.0/28`. Para agentes remotos, exponha o central por um proxy/rede privada autorizada, com firewall para os segmentos dos agentes. Configure certificado/chave e CA nos dois lados; a conexão central nunca aceita `verify_tls=false`. O certificado usado no health check deve incluir o host de `DISCOVERY_HEALTH_URL` em seu SAN. As chaves precisam ser legíveis pelo UID 10001 do contêiner, sem leitura pública. O executável central recusa iniciar em produção sem TLS.

No ambiente do **servidor** Next.js:

```dotenv
DISCOVERY_SERVICE_URL=https://discovery.sua-rede.interna:8041
DISCOVERY_GATEWAY_SECRET=<mesmo segredo aleatório do central>
```

Se Next.js e central estiverem em Docker na mesma máquina, use `compose.secp.yaml` como override, configure `SECP_DOCKER_NETWORK` e use um nome DNS incluído no certificado. Distribua a CA à imagem Node pelo mecanismo `docker/certs` já existente. Não use variáveis `NEXT_PUBLIC_*` para esses valores. Reinicie somente o web após configurar o ambiente. A ausência do serviço afeta apenas a tela de descoberta.

Prefira conexão interna direta do backend ao central. O escopo assinado comporta até 256 órgãos e 4096 unidades inativas/ocultas; seu header é limitado a 240 KB. Caso a API administrativa passe por Nginx, ajuste os buffers de headers nesse servidor privado (por exemplo, `large_client_header_buffers 4 256k;`). Isso evita rejeitar escopos de administradores globais com muitas unidades. Agentes não enviam esse header administrativo.

### Desenvolvimento

Para teste local isolado, `DISCOVERY_ENVIRONMENT=development` permite HTTP no central e no gateway Next.js. Configure `DISCOVERY_SERVICE_URL=http://secp-discovery-central:8000` na rede Docker compartilhada. Agentes de teste precisam de `allow_insecure_transport: true`. Essas exceções são explícitas e restritas ao desenvolvimento. Nenhuma rede é pré-autorizada; nenhum agente ou equipamento é criado automaticamente.

Execução sem Docker:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install '.[test]'
export DISCOVERY_DATABASE_URL='sqlite:////caminho/privado/discovery.db'
export DISCOVERY_GATEWAY_SECRET='<segredo aleatório>'
alembic upgrade head
python -m discovery.central
# Outro processo, com o mesmo ambiente:
python -m discovery.worker
```

Para execução do worker fora de Docker, disponibilize `/data` privado e gravável ao usuário do serviço; é onde fica o heartbeat usado pelo health check.

## Instalação e inscrição dos agentes

1. No SECP, abra `/equipamentos/descoberta`, escolha a seccional ativa e autorize um CIDR privado, de preferência `/32` no primeiro teste.
2. Em **Agentes**, crie uma inscrição e selecione as redes autorizadas. O bootstrap é exibido uma vez e expira em 15 minutos.
3. Baixe a configuração sem credenciais e ajuste endereço HTTPS do central, CA, `state_dir`, redes, portas e métodos. A lista local de redes é uma segunda barreira independente da configuração central.
4. Forneça o bootstrap ao processo e inicie o agente. Ele aparecerá como **Aguardando aprovação**. Confira nome, unidade, versão e interfaces antes de aprovar.
5. Remova o bootstrap do ambiente após a inscrição. O token de operação fica no arquivo privado do agente. Não copie o estado para outra instalação: cada agente deve ter sua própria inscrição.

### Linux/systemd

```bash
cp agent.example.json /caminho/privado/agent.json
# Edite central_url, networks e state_dir=/var/lib/secp-discovery-agent.
chmod 600 /caminho/privado/agent.json
sudo ./install-agent-linux.sh /caminho/privado/agent.json
sudo install -m 0600 /dev/null /etc/secp-discovery-agent/bootstrap.env
# Escreva DISCOVERY_AGENT_BOOTSTRAP_TOKEN=<valor temporário> nesse arquivo privado.
sudo systemctl enable --now secp-discovery-agent
sudo journalctl -u secp-discovery-agent -n 50
```

O usuário dedicado possui apenas leitura da configuração e escrita do estado. A unidade limita CPU/memória e protege o filesystem. Se utilizar arquivo de credenciais ou CA, garanta leitura pelo usuário `secp-discovery`. ICMP depende de `ping` instalado/permissões; sua ausência não impede TCP.

### Docker em Linux

```bash
export DISCOVERY_AGENT_CONFIG=/caminho/privado/agent.json
# Use state_dir=/data/agent no JSON e forneça CA/credenciais por mounts próprios, se necessários.
sudo chown 10001:10001 "$DISCOVERY_AGENT_CONFIG"
sudo chmod 600 "$DISCOVERY_AGENT_CONFIG"
export DISCOVERY_AGENT_BOOTSTRAP_TOKEN='<bootstrap temporário>'
docker compose -f compose.agent.yaml up -d --build
unset DISCOVERY_AGENT_BOOTSTRAP_TOKEN
```

O exemplo usa `network_mode: host` para interfaces, ARP e multicast da LAN Linux. Docker Desktop/bridge não equivale à rede física. No Windows, prefira Python nativo. Em redes roteadas, use TCP; multicast/ARP não atravessam VLANs. Sondas multicast exigem interface local dentro do CIDR autorizado e TTL 1; respostas fora do alvo são descartadas. Não são seguidos `LOCATION` ou `XAddrs` anunciados.

### Windows

Use Python 3.12+ e uma conta dedicada. Crie venv e instale este pacote. Configure caminhos Windows para estado e CA. Restrinja ACLs de diretório/configuração à conta do agente e administradores. O token usa DPAPI da conta Windows; mudanças de conta exigem reinscrição.

```powershell
py -3 -m venv C:\SECPDiscovery\venv
C:\SECPDiscovery\venv\Scripts\pip.exe install C:\caminho\services\device-discovery
# Salve e revise C:\SECPDiscovery\agent.json; não coloque credenciais no repositório.
C:\SECPDiscovery\venv\Scripts\python.exe -m discovery.agent --config C:\SECPDiscovery\agent.json --protect-config
$env:DISCOVERY_AGENT_BOOTSTRAP_TOKEN = '<bootstrap temporário>'
C:\SECPDiscovery\venv\Scripts\python.exe -m discovery.agent --config C:\SECPDiscovery\agent.json
Remove-Item Env:DISCOVERY_AGENT_BOOTSTRAP_TOKEN
```

Para serviço, utilize WinSW aprovado pela TI com o exemplo `windows-service.example.xml`, renomeado para corresponder ao executável. Configure a conta do serviço antes de inscrever/proteger os arquivos, para manter a mesma identidade DPAPI. A instalação/gestão do wrapper segue a documentação da versão adotada pela TI; não acompanha binário externo neste repositório. Não use `sc.exe create` apontando diretamente para Python: ele não implementa o protocolo do SCM.

## Credenciais de equipamentos e protocolos

Credenciais de dispositivo são opcionais e locais ao agente. Sem elas, não há login automático. Use `credentials_file` apontando a JSON protegido (0600 no Linux; DPAPI/ACL no Windows), com mapa por IP literal:

```json
{
  "192.168.50.20": {
    "protocol": "CONTROL_ID_FACE_ID",
    "port": 80,
    "username": "<usuário autorizado>",
    "password": "<senha autorizada>",
    "legacy_http": false
  }
}
```

`CONTROL_ID_IDCLASS_BIO` consulta `get_about.fcgi`; `CONTROL_ID_FACE_ID` consulta `system_information.fcgi`. Modelos com HTTP legado podem exigir `legacy_http: true`, exclusivamente para o dispositivo indicado. Validação TLS do **dispositivo** é independente da validação central; prefira certificados válidos. Credenciais nunca seguem para resultados, logs ou o navegador.

| Fabricante | Identificação implementada | Limites reais |
|---|---|---|
| Control iD acesso/iDFace/iDUHF | Login explícito + `system_information.fcgi`; serial, versão e MAC quando informados | Modelo inferido do título é marcado inferido; não representa homologação de toda a linha |
| Control iD iDClass | Perfil explícito + `get_about.fcgi`, serial e metadados | Exige credenciais e escolha correta de protocolo |
| Hikvision | ISAPI `System/deviceInfo`, XML seguro, Digest quando configurado | Sem SDK SADP; sem driver de coleta Hikvision no SECP |
| Intelbras Bio-T | Perfil explícito, Digest, leitura de serial `magicBox.cgi` | Fabricante vinculado ao perfil revisado; não classifica qualquer OEM Dahua como Intelbras |
| Henry/Dimep | Indícios HTTP quando disponíveis; teste assistido por drivers reais já existentes | Não envia payload HTTP para portas binárias Henry 3000/3001 sem perfil explícito; sem confirmação genérica por porta |
| ZKTeco | Indícios HTTP e estrutura de adaptadores | SDK/protocolo/modelo não homologado; permanece provável/desconhecido |

SNMP é opcional: configure `snmp_community` no arquivo protegido e autorize o método nos dois lados. Não há comunidade padrão, SET ou walk. O teste por driver Node é executado pelo **servidor SECP**: uma rede alcançada pelo agente pode não ter rota a partir desse servidor. Nessa situação, a descoberta funciona e o teste informa a limitação de rota.

## Uso e cadastro do primeiro equipamento

1. Autorize o `/32` do equipamento e aprove um agente com rota até ele.
2. Inicie **Nova descoberta → Endereço IP individual**, escolhendo rede/agente e unidade, se aplicável.
3. Acompanhe hosts processados/total e erros. O progresso representa resultados efetivamente confirmados; sem agente online, o job fica na fila até o deadline.
4. Abra **Detalhes**: confira serial, MAC, firmware e evidências. `Confirmado` exige resposta de protocolo específico; IP, MAC, porta ou título isolados não confirmam fabricante/modelo.
5. Caso compatível, use **Testar comunicação**, fornecendo credenciais autorizadas ao driver existente. Não ativa coleta ou Monitor.
6. Escolha **Cadastrar** ou selecione até 20 resultados para cadastro em lote. Revise driver, porta, nome, unidade e localização. Resultados prováveis/desconhecidos exigem confirmação explícita.
7. Os cadastros são criados **inativos**, pela action e pelas validações atuais do SECP. Abra o cadastro para revisar configuração e ativar. Nenhum equipamento existente é sobrescrito automaticamente.
8. Reenvios reconhecem a identidade/código persistido. Serial confirmado + fabricante é preferido; IP/MAC coincidentes geram conflito para revisão. Identidades de outro escopo não expõem nomes ou IDs.

**Reidentificar** gera novo job `/32` no agente responsável. Credenciais necessárias devem estar no arquivo privado dele. Sem filtro de job, a listagem mostra a última observação de cada identidade estável; o drawer preserva as últimas 20 observações e horários de primeira/última descoberta. IP/MAC isolados não consolidam identidades. O histórico de jobs possui paginação e retenção.

## Segurança, escopos e API

O backend exige sessão e permissões atuais `integracoes:consultar:*`/`integracoes:gerenciar:*`, dentro do escopo da seccional. Órgãos/unidades inativos e descendentes ocultos não aparecem em listas/resultados do módulo. A API central recebe esses escopos assinados, com timestamp, nonce persistente e hash de corpo/query; assinaturas expiram em 60 s. Mutação do BFF exige mesma origem. Tokens de agente/bootstrap/leases são armazenados como hashes no central. Bootstrap é de uso único; aprovação administrativa ocorre após inscrição. Tokens rotacionam automaticamente antes do vencimento, com sobreposição de cinco minutos; revogação invalida ambos imediatamente. Reinscrição administrativa revoga a identidade anterior e exige nova aprovação.

API central: `/api/v1/networks`, `/api/v1/agents`, `/api/v1/jobs`, `/api/v1/devices`, `/api/v1/audit`, `/api/v1/metrics`. Comunicação de agentes: `/agent/v1/enroll`, `heartbeat`, `claim`, `rotate`, `jobs/{id}/lease`, `jobs/{id}/report`. OpenAPI em `/docs`. Não exponha a API administrativa diretamente ao navegador. Não existem operações de shell/comandos remotos.

Limites padrão: até 1024 hosts por solicitação, 16 redes no modo automático, três jobs pendentes/ativos por agente, 24 hosts concorrentes e 20 operações/s no máximo; os limites locais conservadores podem reduzir esses valores. Portas permitidas: 80,443,3000,3001,4370,8080,8443,1870. CIDRs somente RFC1918; loopback é exclusivo de testes explicitamente habilitados. URLs/hostnames não são aceitos como alvos. Janelas UTC são validadas na criação, retirada e execução do job.

## Diagnóstico, manutenção e recuperação

- `GET /health/live`: processo/versão; `/health/ready`: conexão SQL e tabelas migradas. `python -m discovery.health worker`: heartbeat recente do worker. `/api/v1/metrics` é assinado e restrito ao escopo.
- Sem agentes: confira aprovação, token, CA, DNS/HTTPS e heartbeat. Incompatibilidade de versão principal impede retirada de jobs.
- Sem hosts: confira rota, ACL/VLAN, portas, allowlists dos dois lados e interfaces. Ping bloqueado não impede descoberta TCP.
- Sem identificação: habilite perfil e credenciais autorizadas, confira a porta e consulte evidências. Não altere configuração do relógio para ampliar reconhecimento.
- Cancelamento: solicitação cooperativa; consultas em curso respeitam timeout. Perda de comunicação interrompe varredura após 80 s sem contato; leases vencidos são tratados pelo worker.
- Atualização: encerre/cancele jobs, faça backup do banco de descoberta, aplique Alembic e atualize central/worker/agentes. Não remova volumes de dados. Para SQLite, use backup consistente da API SQLite ou pare central/worker antes da cópia; não copie apenas o `.db` ignorando WAL ativo.
- Remoção de agente: revogue no SECP, pare/desabilite systemd/contêiner/WinSW e remova arquivos privados conforme a política institucional. Não afeta coleta ou equipamento físico.
- Auditoria: console Histórico e `/auditoria?entidade=DescobertaEquipamentos`; eventos técnicos por escopo também em `/api/v1/audit`. Logs estruturados contêm correlation/job ID e categorias de erro, sem corpos, senhas ou sessões de dispositivo.

## Testes reproduzíveis

```bash
pip install '.[test]'
pytest tests -q
ruff check discovery tests migrations
# Banco exclusivo; cada teste cria e remove apenas seu schema discovery_test_UUID:
DISCOVERY_TEST_DATABASE_URL='postgresql+psycopg://USUARIO:SENHA@localhost/secp_discovery_test' pytest tests -q
# Raiz do SECP:
npx vitest run src/modules/descoberta src/app/api/descoberta-equipamentos/route.test.ts --maxWorkers=1
npx eslint src/modules/descoberta src/app/api/descoberta-equipamentos 'src/app/(app)/equipamentos/descoberta'
npm run build
```

Os simuladores vivem exclusivamente em `tests/`, não são embarcados no Docker central e não abastecem a UI operacional. O teste de rede usa servidor HTTP de metadados em loopback 8080, armazenamento real e perda simulada de confirmação para verificar reenvio idempotente. Hardware físico, SDKs proprietários, broadcast de cada VLAN e credenciais institucionais precisam de validação operacional própria. Consulte o relatório de entrega para os testes realmente executados nesta implementação.
