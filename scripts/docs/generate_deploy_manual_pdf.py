from __future__ import annotations

from datetime import date
from pathlib import Path
import textwrap

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "manual-implantacao-secp-producao.pdf"


class NumberedCanvas:
    pass


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "Title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0B3A75"),
            spaceAfter=14,
        ),
        "Subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#334155"),
            spaceAfter=8,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=21,
            textColor=colors.HexColor("#0B3A75"),
            spaceBefore=8,
            spaceAfter=8,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12.5,
            leading=16,
            textColor=colors.HexColor("#134E8E"),
            spaceBefore=8,
            spaceAfter=5,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=12.4,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#172033"),
            spaceAfter=5,
        ),
        "Small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=10,
            textColor=colors.HexColor("#334155"),
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.8,
            leading=9.6,
            textColor=colors.white,
        ),
        "Note": ParagraphStyle(
            "Note",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.2,
            backColor=colors.HexColor("#EEF6FF"),
            borderColor=colors.HexColor("#BFDBFE"),
            borderWidth=0.7,
            borderPadding=6,
            textColor=colors.HexColor("#0F2747"),
            spaceBefore=4,
            spaceAfter=7,
        ),
        "Warn": ParagraphStyle(
            "Warn",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11.2,
            backColor=colors.HexColor("#FFF7ED"),
            borderColor=colors.HexColor("#FDBA74"),
            borderWidth=0.7,
            borderPadding=6,
            textColor=colors.HexColor("#7C2D12"),
            spaceBefore=4,
            spaceAfter=7,
        ),
        "Code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.2,
            leading=9.1,
            textColor=colors.HexColor("#0F172A"),
            backColor=colors.HexColor("#F8FAFC"),
            borderColor=colors.HexColor("#CBD5E1"),
            borderWidth=0.4,
            borderPadding=5,
            spaceBefore=3,
            spaceAfter=6,
        ),
    }
    return styles


S = build_styles()


def p(text: str, style: str = "Body"):
    return Paragraph(text, S[style])


def h1(text: str):
    return Paragraph(text, S["H1"])


def h2(text: str):
    return Paragraph(text, S["H2"])


def code(text: str):
    wrapped = []
    for line in text.strip().splitlines():
        if len(line) <= 92:
            wrapped.append(line)
            continue

        wrapped.extend(
            textwrap.wrap(
                line,
                width=92,
                subsequent_indent="  ",
                break_long_words=False,
                break_on_hyphens=False,
            )
        )

    return Preformatted("\n".join(wrapped), S["Code"])


def bullets(items: list[str]):
    return ListFlowable(
        [ListItem(p(item), leftIndent=10) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=14,
        bulletFontSize=6,
        bulletColor=colors.HexColor("#0B3A75"),
    )


def numbered(items: list[str]):
    return ListFlowable(
        [ListItem(p(item), leftIndent=14) for item in items],
        bulletType="1",
        leftIndent=16,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8.8,
        bulletColor=colors.HexColor("#0B3A75"),
    )


def table(data, widths):
    if data:
        header = []
        for cell in data[0]:
            if isinstance(cell, Paragraph):
                header.append(Paragraph(cell.getPlainText(), S["TableHeader"]))
            else:
                header.append(Paragraph(str(cell), S["TableHeader"]))
        data = [header, *data[1:]]

    t = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3A75")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.6),
                ("LEADING", (0, 0), (-1, -1), 9.2),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#172033")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def on_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#0B3A75"))
    canvas.rect(0, height - 0.55 * cm, width, 0.55 * cm, fill=True, stroke=False)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawString(1.4 * cm, height - 0.36 * cm, "SECP - Manual de Implantacao em Producao")
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(1.4 * cm, 0.65 * cm, "Documento operacional - uso interno")
    canvas.drawRightString(width - 1.4 * cm, 0.65 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


def make_doc():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=1.35 * cm,
        leftMargin=1.35 * cm,
        topMargin=1.35 * cm,
        bottomMargin=1.25 * cm,
        title="Manual de Implantacao do SECP em Producao",
        author="SECP",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=on_page)])
    return doc


def story():
    today = date.today().strftime("%d/%m/%Y")
    elems = []

    elems += [
        Spacer(1, 2.1 * cm),
        p("Manual de Implantacao do SECP em Producao", "Title"),
        p("Guia definitivo para instalacao, configuracao, validacao e operacao inicial em unidades interessadas", "Subtitle"),
        Spacer(1, 0.35 * cm),
        table(
            [
                [p("Sistema", "Small"), p("SECP - Sistema Eletronico de Controle de Ponto", "Small")],
                [p("Ambiente alvo", "Small"), p("Servidor Linux Ubuntu com Docker Compose", "Small")],
                [p("Data de emissao", "Small"), p(today, "Small")],
                [p("Classificacao", "Small"), p("Uso interno - nao incluir senhas reais neste documento", "Small")],
            ],
            [4.0 * cm, 11.7 * cm],
        ),
        Spacer(1, 0.55 * cm),
        p(
            "Este manual consolida o procedimento recomendado para implantar o SECP em producao. "
            "Ele foi escrito para equipes de infraestrutura e suporte tecnico, com foco em comandos reproduziveis, "
            "validacoes objetivas e operacao segura.",
            "Note",
        ),
        PageBreak(),
    ]

    elems += [
        h1("1. Escopo e Premissas"),
        p("O procedimento cobre a implantacao do SECP usando os arquivos Docker presentes no projeto: <b>compose.prod.yaml</b>, <b>Dockerfile</b>, <b>.env.production</b>, PgBouncer, PostgreSQL, Redis, workers e observabilidade opcional."),
        bullets(
            [
                "A unidade deve possuir servidor Ubuntu dedicado ou VM equivalente, com acesso administrativo.",
                "O banco principal fica no container <b>secp-postgres</b> e a aplicacao usa preferencialmente PgBouncer via <b>secp-pgbouncer</b>.",
                "Workers rodam em containers separados para evitar que rotinas pesadas concorram com a interface web.",
                "Credenciais, tokens, segredos e URLs internas devem ser definidos localmente pela unidade. Nunca versionar esses valores.",
            ]
        ),
        p("Ponto de atencao: este manual nao substitui politicas institucionais de seguranca, backup, firewall e mudanca. Use janela de manutencao para primeira implantacao, migrations e alteracoes de infraestrutura.", "Warn"),
        h2("Arquitetura resumida"),
        table(
            [
                [p("Componente", "Small"), p("Container/servico", "Small"), p("Funcao", "Small")],
                [p("Aplicacao web", "Small"), p("secp-web", "Small"), p("Next.js em producao, porta interna 3000.", "Small")],
                [p("Banco", "Small"), p("secp-postgres", "Small"), p("PostgreSQL 18, volume persistente secp_postgres_data.", "Small")],
                [p("Pool de conexoes", "Small"), p("secp-pgbouncer", "Small"), p("PgBouncer na porta 6432, exposto apenas em 127.0.0.1.", "Small")],
                [p("Filas/cache", "Small"), p("secp-redis", "Small"), p("Redis 7 com appendonly habilitado.", "Small")],
                [p("Workers", "Small"), p("secp-worker-*", "Small"), p("AFD, SARH, login SARH, reprocessamento, calendario, relatorios e relogios.", "Small")],
                [p("Admin opcional", "Small"), p("secp-pgadmin", "Small"), p("pgAdmin no profile admin, nao recomendado expor sem controle.", "Small")],
            ],
            [3.2 * cm, 4.6 * cm, 7.7 * cm],
        ),
    ]

    elems += [
        h1("2. Requisitos Minimos"),
        table(
            [
                [p("Item", "Small"), p("Minimo recomendado", "Small"), p("Observacao", "Small")],
                [p("Sistema operacional", "Small"), p("Ubuntu Server LTS 22.04 ou 24.04", "Small"), p("Manter atualizacoes de seguranca aplicadas.", "Small")],
                [p("CPU", "Small"), p("4 vCPU", "Small"), p("Aumentar se houver muitos relogios, SARH frequente ou relatorios intensos.", "Small")],
                [p("Memoria", "Small"), p("8 GB RAM", "Small"), p("O compose limita web e workers, mas o PostgreSQL tambem precisa folga.", "Small")],
                [p("Disco", "Small"), p("100 GB SSD", "Small"), p("Separar volumes/backups quando possivel. Monitorar crescimento de banco e relatorios.", "Small")],
                [p("Rede", "Small"), p("Acesso aos relogios, AD, SARH e DNS institucional", "Small"), p("Liberar portas conforme topologia da unidade.", "Small")],
                [p("Runtime", "Small"), p("Docker Engine e Docker Compose v2", "Small"), p("Node nao precisa estar instalado no host para producao Docker.", "Small")],
            ],
            [3.6 * cm, 5.0 * cm, 6.9 * cm],
        ),
        h2("Portas usuais"),
        bullets(
            [
                "<b>3000/tcp</b>: SECP web no host, normalmente atras de proxy reverso, IIS/ARR ou DNS interno.",
                "<b>3001/tcp</b>: worker Henry online, quando usado.",
                "<b>6432/tcp</b>: PgBouncer restrito a 127.0.0.1 no compose.",
                "<b>5050/tcp</b>: pgAdmin somente se profile admin for ativado.",
                "<b>3100/9090</b>: Grafana/Prometheus se observabilidade for habilitada e publicada.",
            ]
        ),
    ]

    elems += [
        h1("3. Preparacao do Servidor Ubuntu"),
        h2("Atualizar pacotes e instalar dependencias"),
        code(
            """
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl git openssl unzip sshpass
"""
        ),
        h2("Instalar Docker Engine e Compose v2"),
        code(
            """
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker version
docker compose version
"""
        ),
        p("Em ambientes com politica restritiva, instale Docker pelo repositorio homologado da unidade. O requisito tecnico e que <b>docker compose version</b> responda com Compose v2.", "Note"),
        h2("Criar diretorio padrao"),
        code(
            """
sudo mkdir -p /opt/secp
sudo chown -R $USER:$USER /opt/secp
cd /opt/secp
"""
        ),
    ]

    elems += [
        h1("4. Obter o Codigo e Preparar Arquivos"),
        h2("Clonar ou atualizar o repositorio"),
        code(
            """
cd /opt/secp
git clone <URL_DO_REPOSITORIO_SECP> secp-app
cd /opt/secp/secp-app
git checkout <BRANCH_OU_TAG_DE_PRODUCAO>
"""
        ),
        p("Recomendacao: implantar por tag ou commit fixo. Evite apontar producao diretamente para uma branch movel sem registro de mudanca.", "Warn"),
        h2("Estrutura esperada"),
        code(
            """
/opt/secp/secp-app/
  compose.prod.yaml
  Dockerfile
  .env.production
  docker/pgbouncer/pgbouncer.ini
  docker/pgbouncer/userlist.txt
  docker/oracle/instantclient-basiclite-linuxx64.zip   # opcional
  backups/
  observability/
"""
        ),
    ]

    elems += [
        h1("5. Configurar .env.production"),
        p("Crie o arquivo <b>.env.production</b> no diretorio raiz do projeto. Use valores reais apenas no servidor. O exemplo abaixo usa placeholders."),
        code(
            """
APP_VERSION=20260716_unidade

POSTGRES_USER=secp
POSTGRES_PASSWORD=<SENHA_FORTE_DO_POSTGRES>
POSTGRES_DB=secp_prod
DATABASE_URL=postgresql://secp:<SENHA_FORTE_DO_POSTGRES>@postgres:5432/secp_prod?schema=public
DATABASE_URL_POOLED=postgresql://secp:<SENHA_FORTE_DO_POSTGRES>@pgbouncer:6432/secp_prod?schema=public

AUTH_SECRET=<GERAR_COM_OPENSSL_RAND_HEX_32>
NEXTAUTH_SECRET=<MESMO_VALOR_OU_OUTRO_SEGREDO_FORTE>
AUTH_URL=https://<DNS_DO_SECP>
NEXTAUTH_URL=https://<DNS_DO_SECP>
AUTH_TRUST_HOST=true

SECP_ADMIN_MATRICULA=secp
SECP_ADMIN_SENHA=<SENHA_INICIAL_TEMPORARIA>
SECP_ADMIN_NOME=Administrador SECP
SECP_ADMIN_EMAIL=<EMAIL_SUPORTE>

AD_AUTH_URL=<URL_DA_API_DE_LOGIN_AD>
NODE_ENV=production
APP_TIMEZONE=America/Manaus
TZ=America/Manaus

SARH_MOCK=false
SARH_BASE_URL=<URL_BASE_SARH>
SARH_API_BASE_URL=<URL_API_SARH>
SARH_API_TOKEN=<TOKEN_SARH_SE_APLICAVEL>
SARH_TIMEOUT_MS=30000
SARH_ORACLE_HOME=/opt/oracle/instantclient

SECP_EQUIPAMENTO_WEBHOOK_TOKEN=<TOKEN_FORTE_WEBHOOK_EQUIPAMENTOS>
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
AFD_UPLOAD_DIR=import/_upload/afd

BIOMETRIA_FACIAL_ENCRYPTION_KEY=<CHAVE_BASE64_32_BYTES>
BIOMETRIA_FACIAL_TEMPLATE_PEPPER=<PEPPER_FORTE>
BIOMETRIA_FACIAL_ALLOW_RAW_IMAGE_STORAGE=false

SECP_AUTO_WORKERS=false
AFD_AUTO_WORKER=false
REPROCESSAMENTO_GLOBAL_AUTO_WORKER=false
HENRY_COLETA_AUTO_WORKER=false
HENRY_ONLINE_AUTO_WORKER=false
CALENDARIO_INSTITUCIONAL_AUTO_WORKER=false
SARH_LOGIN_SYNC_AUTO_WORKER=false
SARH_SYNC_AUTO_WORKER=false

LOG_LEVEL=info
DOCKER_SOCKET_GID=<GID_DO_DOCKER_SOCKET>
"""
        ),
        h2("Gerar segredos"),
        code(
            """
openssl rand -hex 32
openssl rand -base64 32
stat -c '%g' /var/run/docker.sock
"""
        ),
        p("Use o GID retornado pelo ultimo comando em <b>DOCKER_SOCKET_GID</b>. Isso permite que a tela administrativa leia o estado dos containers quando necessario.", "Note"),
    ]

    elems += [
        h1("6. PgBouncer e Oracle Instant Client"),
        h2("PgBouncer"),
        p("Antes de subir a stack, crie <b>docker/pgbouncer/userlist.txt</b> fora do Git."),
        code(
            """
cd /opt/secp/secp-app
printf '%s%s' '<SENHA_FORTE_DO_POSTGRES>' 'secp' | md5sum
sudo install -m 600 /dev/null docker/pgbouncer/userlist.txt
printf '\"secp\" \"md5<HASH_GERADO>\"\\n' > docker/pgbouncer/userlist.txt
"""
        ),
        p("O valor final precisa ser a palavra <b>md5</b> concatenada com o hash MD5 de senha + usuario.", "Note"),
        h2("Oracle Instant Client para SARH"),
        bullets(
            [
                "Se o build tiver internet, o Dockerfile baixa automaticamente o pacote Linux x64 da Oracle.",
                "Para unidade sem internet no build, coloque o arquivo <b>docker/oracle/instantclient-basiclite-linuxx64.zip</b> antes de construir as imagens.",
                "Nao use client Windows dentro do container Linux.",
            ]
        ),
    ]

    elems += [
        h1("7. Subida Inicial em Producao"),
        h2("Validar compose"),
        code(
            """
cd /opt/secp/secp-app
export DOCKER_SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production config >/tmp/secp-prod-compose.yaml
"""
        ),
        h2("Construir imagens"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production build
"""
        ),
        h2("Subir infraestrutura basica"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d postgres redis pgbouncer
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production ps
"""
        ),
        h2("Executar migrations e seed inicial"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile tools run --rm migrate
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile tools run --rm seed
"""
        ),
        p("Execute seed inicial apenas na primeira implantacao ou quando houver orientacao explicita. Em atualizacoes comuns, migrations bastam.", "Warn"),
        h2("Subir aplicacao e workers"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers up -d
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production ps
"""
        ),
    ]

    elems += [
        h1("8. Validacao Tecnica Pos-Subida"),
        h2("Saude da aplicacao"),
        code(
            """
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
docker inspect secp-web --format '{{.State.Health.Status}}'
"""
        ),
        h2("Banco, Redis e PgBouncer"),
        code(
            """
docker exec secp-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h localhost
docker exec secp-redis redis-cli ping
docker exec secp-pgbouncer pg_isready -h 127.0.0.1 -p 6432 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
"""
        ),
        h2("Logs essenciais"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production logs --tail=120 web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers logs --tail=120 worker-sarh
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers logs --tail=120 worker-coleta-relogio
"""
        ),
        h2("Checklist funcional"),
        bullets(
            [
                "Acessar a URL oficial do SECP e autenticar com usuario administrador inicial.",
                "Alterar a senha inicial temporaria ou desabilitar acesso local conforme politica da unidade.",
                "Validar cadastro de orgao/seccional, unidades, perfis e permissao administrativa.",
                "Executar sincronizacao SARH em lote pequeno e conferir servidores, afastamentos e ferias.",
                "Cadastrar um equipamento biometrico de teste e confirmar coleta de marcacoes brutas.",
                "Abrir /espelho-ponto para servidor conhecido e conferir competencia atual.",
            ]
        ),
    ]

    elems += [
        h1("9. Publicacao por DNS ou Proxy Reverso"),
        p("O compose publica o SECP na porta <b>3000</b> do host. Em producao, recomenda-se publicar via DNS interno e proxy reverso com TLS institucional."),
        h2("Exemplo de proxy generico"),
        code(
            """
# Exemplo conceitual. Adapte para IIS/ARR, Nginx, Caddy ou balanceador institucional.
https://secp.<unidade>.jus.br  ->  http://IP_DO_SERVIDOR:3000

Cabecalhos importantes:
  X-Forwarded-Proto: https
  X-Forwarded-Host: secp.<unidade>.jus.br
  X-Forwarded-For: <IP_CLIENTE>
"""
        ),
        p("Depois de publicar, ajuste <b>AUTH_URL</b> e <b>NEXTAUTH_URL</b> para a URL oficial HTTPS e recrie o container web.", "Note"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d --no-deps --force-recreate web
"""
        ),
    ]

    elems += [
        h1("10. Integracoes"),
        h2("SARH"),
        bullets(
            [
                "Confirmar conectividade do servidor SECP ate o SARH/API ou Oracle, conforme ambiente da unidade.",
                "Manter <b>SARH_MOCK=false</b> em producao.",
                "Validar rotinas separadas quando disponiveis: servidores, afastamentos, ferias e demais endpoints.",
                "Acompanhar logs dos containers <b>secp-worker-sarh</b> e <b>secp-worker-sarh-login</b>.",
            ]
        ),
        h2("Equipamentos biometricos"),
        bullets(
            [
                "Confirmar IP, porta, fabricante, modelo, orgao e unidade antes da primeira coleta.",
                "Para relogios Control iD FACE ID, usar protocolo Access API quando o endpoint <b>load_objects.fcgi</b> responder.",
                "Para Control iD idClass Bio, usar protocolo REP/AFD em HTTPS 443 quando <b>get_afd.fcgi</b> responder.",
                "Se o relogio pertencer a um orgao, o processamento deve normalizar matriculas numericas com o prefixo do orgao.",
                "Acompanhar <b>marcacoes_brutas</b>, eventos do equipamento e logs do <b>worker-coleta-relogio</b>.",
            ]
        ),
        h2("AD/autenticacao"),
        bullets(
            [
                "Validar a URL <b>AD_AUTH_URL</b> a partir do servidor.",
                "Definir plano de contingencia para login local administrativo.",
                "Evitar expor credenciais LDAP ou tokens em chamados, prints ou scripts compartilhados.",
            ]
        ),
    ]

    elems += [
        h1("11. Backup e Restauracao"),
        h2("Backup manual do PostgreSQL"),
        code(
            """
cd /opt/secp/secp-app
mkdir -p backups
docker exec secp-postgres pg_dump -U secp -d secp_prod -Fc > backups/secp_prod_$(date +%Y%m%d_%H%M%S).dump
"""
        ),
        h2("Backup de arquivos persistentes"),
        code(
            """
docker run --rm -v secp-prod_secp_uploads_data:/data -v "$PWD/backups:/backups" alpine \
  tar czf /backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

docker run --rm -v secp-prod_secp_relatorios_data:/data -v "$PWD/backups:/backups" alpine \
  tar czf /backups/relatorios_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
"""
        ),
        h2("Restauracao em ambiente controlado"),
        code(
            """
# Exemplo: restaurar dump em banco vazio. Nao executar em producao sem janela e aprovacao.
docker exec -i secp-postgres pg_restore -U secp -d secp_prod --clean --if-exists < backups/ARQUIVO.dump
"""
        ),
        p("Regra operacional: antes de migrations, atualizacoes relevantes ou manutencoes no banco, gerar backup e validar que o arquivo foi criado com tamanho plausivel.", "Warn"),
    ]

    elems += [
        h1("12. Atualizacao de Versao"),
        numbered(
            [
                "Registrar versao atual: <b>git rev-parse HEAD</b> e <b>docker images | grep secp</b>.",
                "Gerar backup do PostgreSQL e dos volumes de uploads/relatorios.",
                "Atualizar codigo para tag ou commit aprovado.",
                "Atualizar <b>APP_VERSION</b> no <b>.env.production</b>.",
                "Rodar <b>docker compose config</b> para validar variaveis.",
                "Construir imagens e executar migrations.",
                "Recriar web e workers.",
                "Validar health, ready, login, SARH, espelho de ponto e coleta de relogio.",
            ]
        ),
        code(
            """
cd /opt/secp/secp-app
git fetch --all --tags
git checkout <TAG_OU_COMMIT_APROVADO>
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production build
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile tools run --rm migrate
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d --no-deps --force-recreate web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers up -d --no-deps --force-recreate
"""
        ),
    ]

    elems += [
        h1("13. Rollback"),
        p("Rollback deve ter escopo claro. Se houve migration destrutiva, o rollback de imagem pode nao bastar; talvez seja necessario restaurar backup."),
        h2("Rollback de imagem/codigo sem restaurar banco"),
        code(
            """
cd /opt/secp/secp-app
git checkout <TAG_OU_COMMIT_ANTERIOR>
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production build web worker-afd worker-sarh worker-coleta-relogio
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d --no-deps --force-recreate web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers up -d --no-deps --force-recreate
"""
        ),
        h2("Rollback com restauracao de banco"),
        bullets(
            [
                "Parar web e workers para evitar escrita durante restauracao.",
                "Restaurar dump aprovado em janela de manutencao.",
                "Subir web e workers da versao compativel com o dump.",
                "Validar login, health, ready e dados essenciais.",
            ]
        ),
    ]

    elems += [
        h1("14. Observabilidade Opcional"),
        p("O projeto possui stack de observabilidade com Prometheus, Grafana, Alertmanager, Tempo, Loki, Promtail e exporters."),
        h2("Preflight"),
        code(
            """
cd /opt/secp/secp-app
bash scripts/observability/preflight.sh
"""
        ),
        h2("Preparar secrets e subir"),
        code(
            """
cd /opt/secp/secp-app/observability
cp .env.example .env
mkdir -p secrets
openssl rand -hex 32 > secrets/secp_metrics_token
openssl rand -base64 32 > secrets/grafana_admin_password
printf 'https://SEU-WEBHOOK-ALERTMANAGER.example/secp\\n' > secrets/alertmanager_webhook_url
bash scripts/validate.sh
bash scripts/start.sh
bash scripts/status.sh
"""
        ),
        p("O endpoint <b>/api/metrics</b> exige token Bearer. Nao publique Prometheus ou Grafana sem autenticacao e controle de rede.", "Warn"),
    ]

    elems += [
        h1("15. Operacao Diaria e Diagnostico Rapido"),
        h2("Comandos de rotina"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production ps
docker stats --no-stream
df -h
docker system df
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
"""
        ),
        h2("Quando a aplicacao nao responde"),
        numbered(
            [
                "Verificar se <b>secp-web</b> esta Up/healthy.",
                "Consultar logs recentes do <b>web</b>.",
                "Validar PostgreSQL, PgBouncer e Redis.",
                "Verificar uso de disco e memoria.",
                "Testar acesso local <b>curl http://127.0.0.1:3000/api/health</b> antes de culpar proxy ou DNS.",
            ]
        ),
        h2("Quando filas ou workers atrasam"),
        bullets(
            [
                "Verificar logs do worker especifico.",
                "Conferir Redis com <b>redis-cli ping</b>.",
                "Avaliar se relogios biometricos estao online e se o cursor NSR esta muito atrasado.",
                "Evitar aumentar concorrencia sem medir CPU, memoria, banco e rede.",
            ]
        ),
        h2("Quando o banco apresenta erro"),
        bullets(
            [
                "Testar <b>pg_isready</b> no PostgreSQL e no PgBouncer.",
                "Nao rodar <b>vacuum full</b>, migrations manuais ou reset sem backup e janela.",
                "Verificar conexoes, tamanho do banco e logs do container.",
            ]
        ),
    ]

    elems += [
        h1("16. Checklist de Entrega da Implantacao"),
        table(
            [
                [p("Item", "Small"), p("Validado", "Small"), p("Observacao", "Small")],
                [p("Servidor Ubuntu atualizado e com Docker Compose v2", "Small"), p("( )", "Small"), p("", "Small")],
                [p("Repositorio em tag/commit aprovado", "Small"), p("( )", "Small"), p("", "Small")],
                [p(".env.production criado sem valores padrao inseguros", "Small"), p("( )", "Small"), p("", "Small")],
                [p("PgBouncer userlist.txt criado", "Small"), p("( )", "Small"), p("", "Small")],
                [p("Migrations executadas com sucesso", "Small"), p("( )", "Small"), p("", "Small")],
                [p("Web e workers rodando", "Small"), p("( )", "Small"), p("", "Small")],
                [p("/api/health e /api/ready respondendo", "Small"), p("( )", "Small"), p("", "Small")],
                [p("Login administrativo validado", "Small"), p("( )", "Small"), p("", "Small")],
                [p("SARH validado em lote pequeno", "Small"), p("( )", "Small"), p("", "Small")],
                [p("Equipamento biometrico de teste validado", "Small"), p("( )", "Small"), p("", "Small")],
                [p("Backup inicial gerado e armazenado", "Small"), p("( )", "Small"), p("", "Small")],
                [p("DNS/proxy/TLS validado", "Small"), p("( )", "Small"), p("", "Small")],
                [p("Responsaveis de operacao definidos", "Small"), p("( )", "Small"), p("", "Small")],
            ],
            [9.2 * cm, 2.0 * cm, 4.3 * cm],
        ),
        Spacer(1, 0.4 * cm),
        table(
            [
                [p("Unidade", "Small"), p("", "Small")],
                [p("Responsavel tecnico", "Small"), p("", "Small")],
                [p("Data da implantacao", "Small"), p("", "Small")],
                [p("Commit/tag implantado", "Small"), p("", "Small")],
                [p("URL oficial", "Small"), p("", "Small")],
            ],
            [5.0 * cm, 10.5 * cm],
        ),
    ]

    return elems


def main():
    doc = make_doc()
    doc.build(story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
