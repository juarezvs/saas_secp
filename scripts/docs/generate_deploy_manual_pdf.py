from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path
import textwrap

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
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
OUTPUT = ROOT / "output" / "pdf" / "manual-tecnico-implantacao-secp-linux.pdf"
BRASAO = ROOT / "output" / "pdf" / "assets" / "brasao-republica.png"

BLUE = colors.HexColor("#0B2F63")
BLUE_2 = colors.HexColor("#123F77")
BLUE_3 = colors.HexColor("#EAF2FF")
GOLD = colors.HexColor("#B8860B")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#475569")
LINE = colors.HexColor("#CBD5E1")
LIGHT = colors.HexColor("#F8FAFC")
WARN_BG = colors.HexColor("#FFF7ED")
WARN_LINE = colors.HexColor("#FDBA74")
OK_BG = colors.HexColor("#ECFDF5")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "CoverTitle": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=31,
            alignment=TA_CENTER,
            textColor=BLUE,
            spaceAfter=12,
        ),
        "CoverSubtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=17,
            alignment=TA_CENTER,
            textColor=MUTED,
            spaceAfter=8,
        ),
        "Institution": ParagraphStyle(
            "Institution",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.2,
            leading=11,
            alignment=TA_CENTER,
            textColor=INK,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16.5,
            leading=21,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=7,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=15,
            textColor=BLUE_2,
            spaceBefore=7,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=12.1,
            alignment=TA_JUSTIFY,
            textColor=INK,
            spaceAfter=4.6,
        ),
        "Small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.4,
            leading=9.5,
            textColor=INK,
        ),
        "Tiny": ParagraphStyle(
            "Tiny",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=6.8,
            leading=8.4,
            textColor=MUTED,
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=8.8,
            textColor=colors.white,
        ),
        "Note": ParagraphStyle(
            "Note",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10.8,
            backColor=BLUE_3,
            borderColor=colors.HexColor("#93C5FD"),
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
            fontSize=8.15,
            leading=10.8,
            backColor=WARN_BG,
            borderColor=WARN_LINE,
            borderWidth=0.7,
            borderPadding=6,
            textColor=colors.HexColor("#7C2D12"),
            spaceBefore=4,
            spaceAfter=7,
        ),
        "Ok": ParagraphStyle(
            "Ok",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.15,
            leading=10.8,
            backColor=OK_BG,
            borderColor=colors.HexColor("#86EFAC"),
            borderWidth=0.7,
            borderPadding=6,
            textColor=colors.HexColor("#064E3B"),
            spaceBefore=4,
            spaceAfter=7,
        ),
        "Code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=6.75,
            leading=8.35,
            textColor=colors.HexColor("#0F172A"),
            backColor=colors.HexColor("#F8FAFC"),
            borderColor=LINE,
            borderWidth=0.45,
            borderPadding=5,
            spaceBefore=3,
            spaceAfter=6,
        ),
        "Right": ParagraphStyle(
            "Right",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.0,
            leading=10,
            alignment=TA_RIGHT,
            textColor=BLUE,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=12.1,
            alignment=TA_LEFT,
            textColor=INK,
            spaceAfter=4.6,
        ),
    }


S = build_styles()


def para(text: str, style: str = "Body"):
    return Paragraph(text, S[style])


def h1(text: str):
    return Paragraph(escape(text), S["H1"])


def h2(text: str):
    return Paragraph(escape(text), S["H2"])


def code(text: str):
    lines: list[str] = []
    for raw in text.strip("\n").splitlines():
        if len(raw) <= 98:
            lines.append(raw)
        else:
            lines.extend(
                textwrap.wrap(
                    raw,
                    width=98,
                    subsequent_indent="  ",
                    break_long_words=False,
                    break_on_hyphens=False,
                )
            )
    return Preformatted("\n".join(lines), S["Code"])


def bullets(items: list[str]):
    return ListFlowable(
        [ListItem(Paragraph(item, S["Bullet"]), leftIndent=12) for item in items],
        bulletType="bullet",
        leftIndent=14,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=6,
        bulletColor=BLUE,
    )


def numbered(items: list[str]):
    return ListFlowable(
        [ListItem(para(item), leftIndent=15) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8,
        bulletColor=BLUE,
    )


def table(data, widths, font_size=7.25, header=True, zebra=True):
    rows = []
    for row_index, row in enumerate(data):
        style = "TableHeader" if header and row_index == 0 else "Small"
        rows.append([cell if isinstance(cell, Paragraph) else Paragraph(str(cell), S[style]) for cell in row])
    t = Table(rows, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    commands = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("LEADING", (0, 0), (-1, -1), font_size + 1.8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
        ("TOPPADDING", (0, 0), (-1, -1), 3.8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.8),
    ]
    if header:
        commands += [
            ("BACKGROUND", (0, 0), (-1, 0), BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    if zebra and len(data) > 1:
        commands.append(("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, LIGHT]))
    t.setStyle(TableStyle(commands))
    return t


def metric_cards(items):
    cells = []
    for title, body in items:
        cells.append(
            [
                Paragraph(escape(title), ParagraphStyle("CardTitle", parent=S["Small"], fontName="Helvetica-Bold", textColor=BLUE, fontSize=8.2, leading=10)),
                Paragraph(body, S["Tiny"]),
            ]
        )
    rows = [
        [
            Table([[cell[0]], [cell[1]]], colWidths=[4.35 * cm], style=[("BOTTOMPADDING", (0, 0), (-1, -1), 1)])
            for cell in cells[i : i + 4]
        ]
        for i in range(0, len(cells), 4)
    ]
    t = Table(rows, colWidths=[4.35 * cm] * 4, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FBFF")),
                ("BOX", (0, 0), (-1, -1), 0.35, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return t


def draw_header(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.white)
    canvas.rect(0, height - 1.52 * cm, width, 1.52 * cm, fill=True, stroke=False)
    canvas.setStrokeColor(LINE)
    canvas.line(1.15 * cm, height - 1.52 * cm, width - 1.15 * cm, height - 1.52 * cm)

    if BRASAO.exists():
        canvas.drawImage(str(BRASAO), 1.22 * cm, height - 1.33 * cm, width=0.88 * cm, height=0.88 * cm, preserveAspectRatio=True, mask="auto")

    x = width / 2
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 7.6)
    canvas.drawCentredString(x, height - 0.46 * cm, "JUSTIÇA FEDERAL DO AMAZONAS")
    canvas.setFont("Helvetica", 7.2)
    canvas.drawCentredString(x, height - 0.75 * cm, "SEÇÃO JUDICIÁRIA DO AMAZONAS")
    canvas.drawCentredString(x, height - 1.04 * cm, "Núcleo de Tecnologia da Informação - NUTEC")
    canvas.setFillColor(BLUE)
    canvas.setFont("Helvetica-Bold", 7.0)
    canvas.drawRightString(width - 1.25 * cm, height - 0.74 * cm, "Manual Técnico")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.2)
    canvas.drawString(1.25 * cm, 0.70 * cm, "SECP - Sistema Eletrônico de Controle de Ponto")
    canvas.drawRightString(width - 1.25 * cm, 0.70 * cm, f"Página {doc.page}")
    canvas.restoreState()


def build_doc():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=1.25 * cm,
        leftMargin=1.25 * cm,
        topMargin=1.85 * cm,
        bottomMargin=1.15 * cm,
        title="Manual Técnico de Implantação do SECP em Linux",
        author="Núcleo de Tecnologia da Informação - NUTEC",
        subject="Implantação, operação, atualização e integração do SECP",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=draw_header)])
    return doc


CONTAINERS = [
    ["Container", "Imagem/target", "Porta/volume", "Função operacional"],
    ["secp-web", "secp-web:${APP_VERSION} / target runner", "3000:3000; uploads; relatórios; docker.sock ro", "Aplicação Next.js em produção. Expõe interface web, APIs, health, ready e métricas protegidas por token."],
    ["secp-db-postgres", "postgres:18-alpine", "172.19.5.37:5432; volume secp_db_postgres_data no servidor de banco", "Banco PostgreSQL remoto do SECP, executado no servidor dedicado. Não sobe no compose normal da aplicação."],
    ["secp-pgbouncer", "edoburu/pgbouncer:latest", "127.0.0.1:6432:6432", "Pool de conexões usado pela aplicação e workers para reduzir pressão sobre o PostgreSQL."],
    ["secp-redis", "redis:7-alpine", "volume secp_redis_data", "Filas BullMQ, cache, jobs assíncronos e coordenação de workers."],
    ["secp-migrator", "secp-migrator:${APP_VERSION} / target migrator", "profile tools", "Container temporário para executar prisma migrate deploy."],
    ["secp-seeder", "secp-seeder:${APP_VERSION} / target seeder", "profile tools", "Container temporário para executar prisma db seed. O seed usa upsert e deve preservar dados reais."],
    ["secp-worker-afd", "secp-worker:${APP_VERSION}", "volume uploads", "Processamento assíncrono de arquivos AFD importados."],
    ["secp-worker-sarh", "secp-worker:${APP_VERSION}", "sem porta pública", "Sincronização SARH: servidores, vínculos, lotações, cargos, afastamentos e férias, conforme escopo configurado."],
    ["secp-worker-sarh-login", "secp-worker:${APP_VERSION}", "sem porta pública", "Sincronização de dados de login/perfil oriundos do SARH."],
    ["secp-worker-reprocessamento", "secp-worker:${APP_VERSION}", "sem porta pública", "Reprocessamento global de marcações e apurações."],
    ["secp-worker-calendario", "secp-worker:${APP_VERSION}", "sem porta pública", "Atualização de calendário institucional, feriados e regras de expediente."],
    ["secp-worker-henry-coleta", "secp-worker:${APP_VERSION}", "sem porta pública", "Coleta ativa de relógios Henry e protocolos compatíveis."],
    ["secp-worker-henry-online", "secp-worker:${APP_VERSION}", "3001:3001", "Listener/serviço online para integração Henry, quando usado pelo equipamento."],
    ["secp-worker-coleta-relogio", "secp-worker:${APP_VERSION}", "sem porta pública", "Coleta progressiva de equipamentos biométricos, NSR e protocolos Control iD/Dimep/Genérico."],
    ["secp-worker-relatorio-exportacao", "secp-worker:${APP_VERSION}", "volume relatórios", "Geração assíncrona de PDFs, planilhas e relatórios pesados."],
    ["secp-pgadmin", "dpage/pgadmin4:9.8", "5050:80; profile admin", "Administração opcional do PostgreSQL. Não publicar sem controle de rede e credenciais fortes."],
]


PROFILES = [
    ["Código", "Nome", "Tipo", "Abrangência padrão", "Finalidade"],
    ["MASTER", "MASTER", "Administrativo", "Global", "Perfil raiz com acesso global a todas as seccionais e configurações do SECP."],
    ["ADMIN", "Administrador do Sistema", "Administrativo", "Seccional", "Configurações iniciais e administração do sistema na seccional."],
    ["SERVIDOR", "Servidor", "Pessoa", "Próprio", "Uso básico: ponto, espelho, banco de horas, solicitações, férias, afastamentos e contracheque."],
    ["ESTAGIARIO", "Estagiário", "Pessoa", "Próprio", "Uso básico do SECP para estagiários."],
    ["PRESTADOR", "Prestador", "Pessoa", "Próprio", "Uso básico do SECP para prestadores."],
    ["VOLUNTARIO", "Voluntário", "Pessoa", "Próprio", "Uso básico do SECP para voluntários."],
    ["MAGISTRADO", "Magistrado", "Pessoa", "Próprio", "Uso básico do SECP para magistrados."],
    ["CHEFIA", "Chefia/Gestor de Unidade", "Funcional", "Subordinados/Chefia", "Análise de solicitações, homologação de frequência, equipe e boletins."],
    ["SECAP", "SECAP/NUCGP", "Administrativo", "Seccional", "Gestão de pessoas: apuração, banco de horas, homologações, boletins e cadastros funcionais."],
    ["SECAD", "SECAD", "Administrativo", "Seccional", "Secretaria Administrativa: fluxos do recesso forense e relatórios institucionais."],
    ["DIREF", "Direção do Foro", "Administrativo", "Seccional", "Consulta institucional de frequência, banco de horas, boletins, recesso e auditoria."],
    ["NUTEC", "NUTEC", "Administrativo/Técnico", "Seccional", "Monitoramento de integrações, importações, biometria e processamento operacional."],
    ["SUPORTE", "Suporte técnico", "Administrativo/Técnico", "Seccional", "Perfil técnico legado equivalente ao NUTEC, mantido por compatibilidade."],
    ["EXCECAO_REGISTRO_WEB", "Exceção - Registro web", "Exceção", "Injetado em SERVIDOR", "Permite registro web para usuário pessoa sem aparecer como perfil selecionável."],
    ["EXCECAO_REGISTRO_FACIAL", "Exceção - Registro facial", "Exceção", "Injetado em SERVIDOR", "Permite registro facial para usuário pessoa sem aparecer como perfil selecionável."],
]


INTEGRATION_FIELDS = [
    ["Integração", "Campos essenciais", "Validação"],
    ["SARH - Oracle", "Seccional, nome, usuário Oracle, senha Oracle, string/TNS, Oracle Home/libDir, sigla localidade SARH, ativo.", "Salvar em Administração > Integrações > SARH, executar sincronização de lote pequeno e acompanhar worker-sarh."],
    ["Active Directory - API HTTP", "Órgão autenticador, nome, modo API HTTP do AD, URL da API de autenticação, timeout, ativo.", "Testar login de matrícula conhecida. Se a integração falhar, o sistema pode usar senha local conforme configuração."],
    ["Active Directory - LDAP Bind", "Endpoint LDAP/LDAPS, domínio NetBIOS ou UPN, Base DN, Bind DN técnico, senha de bind, padrão DN opcional, filtro de busca, timeout.", "Validar porta 389 ou 636 a partir do servidor, autenticar matrícula conhecida e revisar logs do web."],
    ["Equipamentos biométricos", "Código, nome, órgão, unidade, fabricante, modelo, série, localização, IP, porta, protocolo, credenciais de coleta/configuração, próximo NSR, token webhook.", "Cadastrar equipamento de teste, validar conectividade, coletar marcações e conferir marcacoes_brutas/eventos."],
]


def story():
    today = date.today().strftime("%d/%m/%Y")
    elems = []

    elems += [
        Spacer(1, 1.05 * cm),
        Image(str(BRASAO), width=2.25 * cm, height=2.25 * cm) if BRASAO.exists() else Spacer(1, 2.25 * cm),
        Spacer(1, 0.22 * cm),
        para("JUSTIÇA FEDERAL DO AMAZONAS", "Institution"),
        para("SEÇÃO JUDICIÁRIA DO AMAZONAS", "Institution"),
        para("Núcleo de Tecnologia da Informação - NUTEC", "Institution"),
        Spacer(1, 1.05 * cm),
        para("Manual Técnico de Implantação do SECP em Linux", "CoverTitle"),
        para("Implantação, certificado digital com Caddy, distribuição por GPO, atualização de versão, operação de containers e integrações institucionais", "CoverSubtitle"),
        Spacer(1, 0.55 * cm),
        table(
            [
                ["Sistema", "SECP - Sistema Eletrônico de Controle de Ponto"],
                ["Ambiente alvo", "Servidor Linux Ubuntu da aplicação com Docker Engine, Docker Compose v2, PgBouncer, Redis e Caddy; banco PostgreSQL dedicado em 172.19.5.37"],
                ["Público-alvo", "Técnicos de informática, administradores de sistemas e equipe de infraestrutura"],
                ["Data de emissão", today],
                ["Classificação", "Uso interno - não inserir senhas reais em cópias deste manual"],
            ],
            [4.0 * cm, 12.0 * cm],
            header=False,
        ),
        Spacer(1, 0.55 * cm),
        para("Versão premium: este manual foi estruturado para permitir implantação reproduzível, atualização segura e operação assistida do SECP em ambiente Linux, sem zerar banco de produção e com separação clara entre aplicação, banco, proxy, integrações e workers.", "Note"),
        PageBreak(),
    ]

    elems += [
        h1("1. Visão geral"),
        para("O SECP é uma aplicação web Next.js com banco PostgreSQL, fila Redis, PgBouncer para pool de conexões e workers especializados. Em produção, a aplicação deve ser publicada atrás de HTTPS, preferencialmente por Caddy no próprio servidor Linux ou por proxy institucional equivalente."),
        metric_cards(
            [
                ("Aplicação", "Next.js 16, Node.js 22, Auth.js/NextAuth, Prisma 7."),
                ("Banco", "PostgreSQL 18 em container no servidor dedicado 172.19.5.37."),
                ("Filas", "Redis 7 para jobs assíncronos e processamento pesado."),
                ("Integrações", "SARH Oracle/API, Active Directory, LDAP e equipamentos biométricos."),
                ("Certificado", "Caddy com TLS público ou CA interna distribuída por GPO."),
                ("Operação", "Atualização por APP_VERSION, migrations Prisma e recriação seletiva de containers."),
                ("Segurança", "Segredos fora do Git, backups antes de migrations e tokens de webhook fortes."),
                ("Escopo", "Perfis com abrangência próprio, subordinados, seccional e global."),
            ]
        ),
        Spacer(1, 0.35 * cm),
        para("Regra de ouro: em produção, nunca executar docker compose down -v, prisma migrate reset, db push --force-reset ou qualquer comando que remova volumes. Dados reais devem ser preservados.", "Warn"),
        h2("Topologia recomendada"),
        code(
            """
Cliente Windows -> DNS interno -> Caddy :443 -> secp-web :3000
secp-web        -> PgBouncer :6432 -> PostgreSQL 172.19.5.37:5432
secp-web        -> Redis :6379
workers         -> PgBouncer + Redis + SARH + equipamentos biométricos
Caddy           -> emite/renova certificado e faz proxy reverso HTTPS
GPO             -> distribui a CA interna aos clientes Windows, se o certificado não for público
"""
        ),
    ]

    elems += [
        h1("2. Requisitos do servidor"),
        table(
            [
                ["Item", "Recomendado", "Observação"],
                ["Sistema operacional", "Ubuntu Server LTS 22.04 ou 24.04", "Manter atualizações de segurança aplicadas."],
                ["CPU", "4 vCPU ou mais", "Aumentar se houver muitos equipamentos, relatórios ou sincronizações SARH concorrentes."],
                ["Memória", "8 GB RAM ou mais", "A aplicação web e workers têm limites; o PostgreSQL deve ter folga no servidor dedicado."],
                ["Disco", "100 GB SSD ou mais", "Monitorar relatórios, backups e volumes locais; monitorar o volume do banco no servidor 172.19.5.37."],
                ["Rede", "Acesso a SARH, AD/LDAP, equipamentos e DNS", "Liberar portas de saída conforme integração."],
                ["Runtime", "Docker Engine + Docker Compose v2", "O host não precisa de Node.js para rodar produção Docker."],
                ["Acesso", "Usuário técnico com sudo", "Evitar operar diretamente como root; registrar mudanças."],
            ],
            [3.4 * cm, 5.0 * cm, 7.6 * cm],
        ),
        h2("Portas"),
        table(
            [
                ["Porta", "Origem/Destino", "Uso"],
                ["80/tcp", "Cliente -> Caddy", "Redirecionamento HTTP para HTTPS e desafio ACME quando aplicável."],
                ["443/tcp", "Cliente -> Caddy", "Acesso HTTPS oficial ao SECP."],
                ["3000/tcp", "Caddy/IIS/ARR -> secp-web", "Aplicação web publicada pelo compose."],
                ["3001/tcp", "Equipamento/integração -> worker-henry-online", "Integração Henry online, quando necessária."],
                ["6432/tcp", "Host local -> PgBouncer", "Exposto apenas em 127.0.0.1 no compose."],
                ["5050/tcp", "Admin -> pgAdmin", "Somente quando profile admin for usado."],
            ],
            [2.6 * cm, 5.2 * cm, 8.2 * cm],
        ),
    ]

    elems += [
        h1("3. Containers utilizados"),
        para("A tabela abaixo lista os containers previstos no compose de produção. Os serviços migrate e seed são ferramentas temporárias executadas por profile tools; os workers rodam por profile workers."),
        table(CONTAINERS, [3.15 * cm, 3.85 * cm, 3.95 * cm, 6.05 * cm], font_size=6.6),
    ]

    elems += [
        h1("4. Preparação do Ubuntu"),
        h2("Atualizar sistema e instalar dependências"),
        code(
            """
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git openssl unzip rsync
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
        h2("Criar estrutura padrão"),
        code(
            """
sudo mkdir -p /opt/secp
sudo chown -R $USER:$USER /opt/secp
cd /opt/secp
git clone <URL_DO_REPOSITORIO_SECP> secp-app
cd /opt/secp/secp-app
git checkout <TAG_OU_COMMIT_APROVADO>
mkdir -p backups observability/secrets
"""
        ),
        para("Implante por tag ou commit aprovado. Evite usar produção apontando para branch móvel sem registro de mudança.", "Warn"),
    ]

    elems += [
        h1("5. Configuração do .env.production"),
        para("Crie o arquivo .env.production no diretório /opt/secp/secp-app. Não versionar este arquivo. Os valores abaixo são modelo e devem ser substituídos por credenciais reais da unidade."),
        code(
            """
APP_VERSION=20260720_unidade

POSTGRES_USER=secp
POSTGRES_PASSWORD=<SENHA_FORTE_DO_POSTGRES>
POSTGRES_DB=secp_prod
DATABASE_URL=postgresql://secp:<SENHA>@172.19.5.37:5432/secp_prod?schema=public
DATABASE_URL_POOLED=postgresql://secp:<SENHA>@pgbouncer:6432/secp_prod?schema=public

AUTH_SECRET=<openssl rand -hex 32>
NEXTAUTH_SECRET=<openssl rand -hex 32>
AUTH_URL=https://secp.<dominio-interno>
NEXTAUTH_URL=https://secp.<dominio-interno>
AUTH_TRUST_HOST=true

SECP_ADMIN_MATRICULA=secp
SECP_ADMIN_SENHA=<SENHA_INICIAL_TEMPORARIA>
SECP_ADMIN_NOME=Administrador SECP
SECP_ADMIN_EMAIL=suporte@<dominio>

AD_AUTH_URL=http://login.ad.integracao.am.trf1.gov.br/auth/login
NODE_ENV=production
APP_TIMEZONE=America/Manaus
TZ=America/Manaus

SARH_MOCK=false
SARH_BASE_URL=http://sarh.integracao.am.trf1.gov.br
SARH_TIMEOUT_MS=30000
SARH_ORACLE_HOME=/opt/oracle/instantclient

SECP_EQUIPAMENTO_WEBHOOK_TOKEN=<openssl rand -hex 32>
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
AFD_UPLOAD_DIR=import/_upload/afd

BIOMETRIA_FACIAL_ENCRYPTION_KEY=<openssl rand -base64 32>
BIOMETRIA_FACIAL_TEMPLATE_PEPPER=<openssl rand -hex 32>
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
DOCKER_SOCKET_GID=<stat -c '%g' /var/run/docker.sock>
SECP_WEB_CPUS=2.0
SECP_WEB_MEM_LIMIT=2g
"""
        ),
        h2("Gerar segredos e GID do Docker"),
        code(
            """
openssl rand -hex 32
openssl rand -base64 32
stat -c '%g' /var/run/docker.sock
"""
        ),
        para("Depois de alterar AUTH_URL, NEXTAUTH_URL, segredos, tokens ou variáveis de integração, recrie o container web para carregar o novo ambiente.", "Note"),
    ]

    elems += [
        h1("6. PgBouncer, segredos e Oracle Instant Client"),
        h2("PgBouncer"),
        para("O PgBouncer exige docker/pgbouncer/userlist.txt fora do Git. O SECP usa scram-sha-256; copie para esse arquivo o verificador SCRAM do usuário secp no PostgreSQL dedicado."),
        code(
            """
ssh nutec@172.19.5.37
cd /opt/secp-db
docker exec -it secp-db-postgres psql -U postgres -d postgres
ALTER ROLE secp WITH PASSWORD '<SENHA_FORTE_DO_POSTGRES>';
SELECT rolpassword FROM pg_authid WHERE rolname = 'secp';

cd /opt/secp/secp-app
install -m 600 /dev/null docker/pgbouncer/userlist.txt
printf '"secp" "SCRAM-SHA-256$..."\\n' > docker/pgbouncer/userlist.txt
"""
        ),
        h2("Secret de métricas"),
        code(
            """
mkdir -p observability/secrets
openssl rand -hex 32 > observability/secrets/secp_metrics_token
chmod 600 observability/secrets/secp_metrics_token
"""
        ),
        h2("Oracle Instant Client"),
        bullets(
            [
                "O Dockerfile procura primeiro por docker/oracle/instantclient-basiclite-linux*x64*.zip.",
                "Se o ZIP Linux x64 não existir, o build tenta baixar o Instant Client da Oracle.",
                "Em ambiente sem internet, coloque previamente o arquivo docker/oracle/instantclient-basiclite-linuxx64.zip.",
                "Não usar cliente Oracle Windows dentro do container Linux.",
            ]
        ),
    ]

    elems += [
        h1("7. Implantação inicial"),
        h2("Validar compose"),
        code(
            """
cd /opt/secp/secp-app
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production config -q
"""
        ),
        h2("Construir imagens"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production build
"""
        ),
        h2("Subir infraestrutura"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d redis pgbouncer
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production ps
"""
        ),
        h2("Executar migrations e seed"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile tools run --rm migrate
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile tools run --rm seed
"""
        ),
        para("Na primeira implantação, o seed cria perfis, permissões, parâmetros e usuário inicial. Em atualizações, rode seed somente quando houver orientação ou quando o release incluir permissões/menu/parametrizações novas.", "Warn"),
        h2("Subir web e workers"),
        code(
            """
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers up -d
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production ps
"""
        ),
    ]

    elems += [
        h1("8. Certificado digital e Caddy"),
        para("O Caddy é recomendado para encerrar TLS e encaminhar tráfego para o secp-web. Ele pode usar certificado público automaticamente via ACME quando o DNS e a porta 80/443 forem públicos, ou certificado interno emitido por uma CA institucional."),
        h2("Instalar Caddy no Ubuntu"),
        code(
            """
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
systemctl status caddy --no-pager
"""
        ),
        h2("Opção A - HTTPS automático com CA pública"),
        para("Use quando o nome DNS for resolvível e a autoridade certificadora pública puder validar o domínio. O servidor precisa receber tráfego nas portas 80 e 443."),
        code(
            """
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
secp.<dominio-interno-ou-publico> {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3000
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "SAMEORIGIN"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
EOF

sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
"""
        ),
        h2("Opção B - CA interna do Caddy para rede local"),
        para("Use quando o SECP for publicado apenas em rede interna sem validação por CA pública. Nesse caso, os clientes Windows devem confiar no certificado raiz da CA local do Caddy, distribuído por GPO."),
        code(
            """
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
secp.am.trf1.jus.br {
  tls internal
  encode gzip zstd
  reverse_proxy 127.0.0.1:3000
}
EOF

sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo caddy trust
sudo find /var/lib/caddy/.local/share/caddy/pki/authorities/local -name root.crt -print
"""
        ),
        h2("Exportar certificado raiz para distribuição"),
        code(
            """
sudo cp /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt /tmp/secp-caddy-root.crt
sudo chmod 644 /tmp/secp-caddy-root.crt
openssl x509 -in /tmp/secp-caddy-root.crt -outform DER -out /tmp/secp-caddy-root.cer
openssl x509 -in /tmp/secp-caddy-root.crt -noout -subject -issuer -dates -fingerprint -sha256
"""
        ),
        para("Guarde o arquivo .cer em compartilhamento seguro acessível ao controlador de domínio. Não distribua a chave privada da CA. Distribua apenas o certificado raiz público.", "Warn"),
    ]

    elems += [
        h1("9. Distribuição do certificado por GPO"),
        para("Quando for usada CA interna, os computadores Windows precisam confiar no certificado raiz. A forma recomendada em domínio Active Directory é distribuir o certificado por Group Policy Object."),
        numbered(
            [
                "No controlador de domínio ou estação com RSAT, abrir Group Policy Management.",
                "Criar uma GPO específica, por exemplo GPO-SECP-Caddy-Root-CA, ou usar uma GPO existente aprovada.",
                "Vincular a GPO ao domínio, site ou OU que contém os computadores clientes que acessarão o SECP.",
                "Editar a GPO e navegar para Computer Configuration > Policies > Windows Settings > Security Settings > Public Key Policies.",
                "Clicar com o botão direito em Trusted Root Certification Authorities e escolher Import.",
                "Selecionar o arquivo secp-caddy-root.cer exportado do Caddy.",
                "Escolher Place all certificates in the following store e confirmar Trusted Root Certification Authorities.",
                "Finalizar o assistente e aguardar replicação da política.",
            ]
        ),
        h2("Forçar atualização e validar no cliente"),
        code(
            """
gpupdate /force
certutil -store root | findstr /i "Caddy SECP"
certutil -urlcache * delete
"""
        ),
        para("Em alguns ambientes, o nome exibido no repositório de certificados pode ser o Common Name da CA local do Caddy. Valide pelo SHA256 fingerprint anotado no servidor.", "Note"),
        h2("Testes do navegador"),
        bullets(
            [
                "Abrir https://secp.<dominio> em estação de domínio.",
                "Confirmar que o navegador não apresenta alerta de certificado.",
                "Conferir se o certificado do site encadeia até a CA importada via GPO.",
                "Executar gpresult /r ou gpresult /h relatorio.html se a política não aparecer.",
            ]
        ),
    ]

    elems += [
        h1("10. Validação pós-implantação"),
        h2("Healthchecks"),
        code(
            """
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
docker inspect secp-web --format '{{.State.Health.Status}}'
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production ps
"""
        ),
        h2("Banco, Redis e PgBouncer"),
        code(
            """
docker exec secp-redis redis-cli ping
docker exec secp-pgbouncer pg_isready -h 127.0.0.1 -p 6432 -U secp -d secp_prod
ssh nutec@172.19.5.37 'cd /opt/secp-db && docker exec secp-db-postgres pg_isready -U secp -d secp_prod -h localhost'
"""
        ),
        h2("Checklist funcional"),
        bullets(
            [
                "Login administrativo inicial efetuado e senha temporária alterada conforme política local.",
                "Perfis e permissões exibidos corretamente em /perfis.",
                "Menu lateral compatível com o perfil ativo e personalização disponível apenas para perfis autorizados.",
                "SARH validado em lote pequeno antes de carga ampla.",
                "Equipamento biométrico de teste cadastrado e coleta validada.",
                "Espelho de ponto e banco de horas conferidos para servidor conhecido.",
                "Caddy respondendo em HTTPS sem alerta de certificado.",
            ]
        ),
    ]

    elems += [
        h1("11. Atualização de versão"),
        para("A atualização deve preservar dados reais. Antes de qualquer migration, gere backup do PostgreSQL e confirme que o arquivo foi criado com tamanho plausível."),
        h2("Backup pré-atualização"),
        code(
            """
cd /opt/secp/secp-app
mkdir -p backups
ssh nutec@172.19.5.37 'docker exec secp-db-postgres pg_dump -U secp -d secp_prod -Fc' > backups/predeploy_${APP_VERSION}_$(date +%Y%m%d%H%M%S).dump
ls -lh backups/*.dump | tail
"""
        ),
        h2("Atualizar código e imagens"),
        code(
            """
cd /opt/secp/secp-app
git fetch --all --tags
git checkout <TAG_OU_COMMIT_APROVADO>
sed -i 's/^APP_VERSION=.*/APP_VERSION=<NOVO_TAG>/' .env.production
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production config -q
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production build web migrate seed worker-afd
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile tools run --rm migrate
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile tools run --rm seed
"""
        ),
        h2("Recriar somente o necessário"),
        code(
            """
# Somente web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d --no-deps --force-recreate web

# Um worker específico
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers up -d --no-deps --force-recreate worker-sarh

# Todos os workers
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers up -d --no-deps --force-recreate \
  worker-afd worker-sarh worker-sarh-login worker-reprocessamento worker-calendario \
  worker-henry-coleta worker-henry-online worker-coleta-relogio worker-relatorio-exportacao
"""
        ),
        h2("Retenção simples dos últimos 2 backups"),
        code(
            """
cd /opt/secp/secp-app
ls -1t backups/*.dump | tail -n +3 | xargs -r rm -f
ls -lh backups/*.dump
"""
        ),
        para("Não remova backups fora da política aprovada. Se houver retenção institucional externa, mantenha cópia fora do servidor antes de excluir arquivos locais.", "Warn"),
    ]

    elems += [
        h1("12. Operação de containers"),
        h2("Subir, parar e reiniciar seletivamente"),
        code(
            """
cd /opt/secp/secp-app

# Status
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production ps

# Reiniciar apenas web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production restart web

# Subir apenas pgAdmin, se necessário
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile admin up -d pgadmin

# Parar worker de coleta sem afetar web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers stop worker-coleta-relogio

# Logs
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production logs --tail=150 web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers logs --tail=150 worker-sarh
"""
        ),
        h2("Comandos proibidos em produção sem plano formal"),
        bullets(
            [
                "docker compose down -v",
                "docker volume rm secp-db_secp_db_postgres_data ou qualquer volume do banco em 172.19.5.37",
                "npx prisma migrate reset",
                "npx prisma db push --force-reset",
                "rm -rf /opt/secp/secp-app/backups sem cópia externa validada",
            ]
        ),
    ]

    elems += [
        h1("13. Integrações"),
        table(INTEGRATION_FIELDS, [3.25 * cm, 7.0 * cm, 6.75 * cm], font_size=6.9),
        h2("SARH"),
        bullets(
            [
                "Manter SARH_MOCK=false em produção.",
                "Se a unidade usa Oracle direto, configurar conexão em Administração > Integrações > SARH.",
                "Se usa API HTTP, validar URL base, token, timeout e endpoints disponibilizados.",
                "Sincronizações devem começar por escopo pequeno, conferindo servidores, vínculos, lotações, chefias, afastamentos e férias.",
                "Logs principais: secp-worker-sarh e secp-worker-sarh-login.",
            ]
        ),
        h2("Active Directory"),
        bullets(
            [
                "Modo API HTTP: informar a URL do serviço autenticador AD.",
                "Modo LDAP Bind: informar LDAP/LDAPS, domínio, Base DN, Bind DN, senha técnica e filtro.",
                "Preferir LDAPS 636 quando a infraestrutura oferecer certificado confiável.",
                "Manter conta técnica com permissão mínima de leitura/autenticação.",
            ]
        ),
        h2("Equipamentos eletrônicos de ponto"),
        bullets(
            [
                "Protocolos suportados no cadastro: Genérico/webhook, Henry Linha ADV, Henry Lumen Balcão LT/Primme Acesso 8X, Dimep Smart Print, Control iD FACE ID e Control iD idClass Bio.",
                "Cada equipamento deve ter órgão vinculado; unidade operacional é recomendada quando o relógio pertence a uma unidade específica.",
                "Campos de usuário/senha podem ser separados por finalidade: padrão, dados/coleta e configuração.",
                "A coleta progressiva usa próximo NSR quando o protocolo fornece essa informação.",
                "Para webhook, use token forte e valide logs de entrada antes de liberar produção.",
            ]
        ),
    ]

    elems += [
        h1("14. Perfis padrão"),
        para("O seed padrão cria perfis institucionais com flags administrativo e exceção. Perfis de exceção não aparecem como perfil ativo; suas permissões são injetadas no perfil de destino definido no cadastro."),
        table(PROFILES, [2.7 * cm, 3.9 * cm, 3.0 * cm, 3.2 * cm, 4.2 * cm], font_size=6.65),
        h2("Abrangências de permissão"),
        table(
            [
                ["Abrangência", "Significado"],
                ["próprio", "Permite ação apenas sobre os próprios dados do usuário autenticado."],
                ["subordinados", "Permite ação sobre pessoas subordinadas, respeitando hierarquia, chefia ou delegação vigente."],
                ["seccional", "Permite ação sobre pessoas e dados da seccional/órgão do perfil."],
                ["global", "Permite ação em todo o SECP, normalmente reservada ao MASTER e rotinas centrais."],
            ],
            [3.2 * cm, 13.8 * cm],
        ),
    ]

    elems += [
        h1("15. Backup, restauração e rollback"),
        h2("Backup do PostgreSQL"),
        code(
            """
cd /opt/secp/secp-app
mkdir -p backups
ssh nutec@172.19.5.37 'docker exec secp-db-postgres pg_dump -U secp -d secp_prod -Fc' > backups/secp_prod_$(date +%Y%m%d_%H%M%S).dump
"""
        ),
        h2("Backup dos volumes de arquivos"),
        code(
            """
docker run --rm -v secp-prod_secp_uploads_data:/data -v "$PWD/backups:/backups" alpine \
  tar czf /backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

docker run --rm -v secp-prod_secp_relatorios_data:/data -v "$PWD/backups:/backups" alpine \
  tar czf /backups/relatorios_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
"""
        ),
        h2("Rollback de imagem sem restaurar banco"),
        code(
            """
git checkout <TAG_ANTERIOR>
sed -i 's/^APP_VERSION=.*/APP_VERSION=<TAG_ANTERIOR>/' .env.production
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production build web worker-afd
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production up -d --no-deps --force-recreate web
docker compose -p secp-prod -f compose.prod.yaml --env-file .env.production --profile workers up -d --no-deps --force-recreate
"""
        ),
        para("Se a versão nova aplicou migration incompatível com a versão anterior, rollback de imagem pode não bastar. Nesse caso, parar web/workers e restaurar dump em janela formal de manutenção.", "Warn"),
    ]

    elems += [
        h1("16. Observabilidade e auditoria operacional"),
        para("O projeto possui stack opcional de observabilidade com Prometheus, Grafana, Alertmanager, Tempo, Loki, Promtail e exporters. A aplicação expõe /api/metrics protegido por token."),
        code(
            """
cd /opt/secp/secp-app/observability
cp .env.example .env
mkdir -p secrets
openssl rand -hex 32 > secrets/secp_metrics_token
openssl rand -base64 32 > secrets/grafana_admin_password
printf 'https://webhook-institucional.example/secp\\n' > secrets/alertmanager_webhook_url
bash scripts/validate.sh
bash scripts/start.sh
bash scripts/status.sh
"""
        ),
        h2("Diagnóstico rápido"),
        table(
            [
                ["Sintoma", "Verificar", "Comando inicial"],
                ["SECP não abre", "Caddy, secp-web, DNS, firewall", "curl -vk https://secp.<dominio>"],
                ["Login falhando", "AD_AUTH_URL, LDAP, usuário local, logs do web", "docker logs --tail=150 secp-web"],
                ["Banco indisponível", "PostgreSQL remoto, PgBouncer, disco", "docker exec secp-pgbouncer pg_isready -h 127.0.0.1 -p 6432 -U secp -d secp_prod"],
                ["Filas paradas", "Redis e workers", "docker logs --tail=150 secp-worker-sarh"],
                ["Coleta de relógio falhando", "IP, porta, protocolo, credenciais e NSR", "docker logs --tail=150 secp-worker-coleta-relogio"],
                ["Certificado inválido", "Caddyfile, cadeia, GPO, DNS", "openssl s_client -connect secp.<dominio>:443 -servername secp.<dominio>"],
            ],
            [3.7 * cm, 6.2 * cm, 7.1 * cm],
            font_size=6.7,
        ),
    ]

    elems += [
        h1("17. Checklist de entrega"),
        table(
            [
                ["Item", "OK", "Observação"],
                ["Ubuntu atualizado, Docker e Compose v2 instalados", "( )", ""],
                ["Código em tag/commit aprovado", "( )", ""],
                [".env.production criado sem senhas fracas ou placeholders", "( )", ""],
                ["PgBouncer userlist.txt criado e protegido", "( )", ""],
                ["Secret de métricas criado", "( )", ""],
                ["Oracle Instant Client disponível para build SARH", "( )", ""],
                ["Migrations aplicadas", "( )", ""],
                ["Seed executado quando necessário", "( )", ""],
                ["Web e workers no APP_VERSION correto", "( )", ""],
                ["/api/health e /api/ready OK", "( )", ""],
                ["Caddy com HTTPS validado", "( )", ""],
                ["Certificado raiz distribuído por GPO, se CA interna", "( )", ""],
                ["SARH validado em lote pequeno", "( )", ""],
                ["AD/LDAP validado com usuário real", "( )", ""],
                ["Equipamento de teste coletando marcações", "( )", ""],
                ["Backup inicial armazenado e documentado", "( )", ""],
            ],
            [10.0 * cm, 1.6 * cm, 5.4 * cm],
            font_size=6.9,
        ),
        Spacer(1, 0.35 * cm),
        table(
            [
                ["Unidade", ""],
                ["Responsável técnico", ""],
                ["Data da implantação", ""],
                ["Commit/tag implantado", ""],
                ["URL oficial", ""],
                ["Observações", ""],
            ],
            [4.5 * cm, 12.5 * cm],
            header=False,
        ),
    ]

    elems += [
        h1("18. Referências técnicas"),
        bullets(
            [
                "Caddy Documentation - Install: https://caddyserver.com/docs/install",
                "Microsoft Learn - Distribute certificates to Windows devices by using Group Policy: https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/distribute-certificates-group-policy",
                "Microsoft Learn - Distribute Certificates to Client Computers by Using Group Policy: https://learn.microsoft.com/en-us/windows-server/identity/ad-fs/deployment/distribute-certificates-to-client-computers-by-using-group-policy",
                "Wikimedia Commons - Coat of arms of Brazil.svg: https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Brazil.svg",
                "Arquivos do SECP usados como fonte: compose.prod.yaml, Dockerfile, prisma/seed.ts, docker/pgbouncer/README.md, docker/oracle/README.md e módulos de integração.",
            ]
        ),
        para("As orientações de Caddy e GPO foram conferidas em 20/07/2026. Em ambientes com política institucional própria de certificados, firewall, proxy reverso ou hardening, prevalecem as normas da Justiça Federal e da unidade responsável.", "Note"),
    ]

    return elems


def main():
    doc = build_doc()
    doc.build(story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
