from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
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
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "tutorial-jornadas-secp-usuario-final.pdf"
BRASAO = ROOT / "public" / "brasao-republica.png"

BLUE = colors.HexColor("#0B2F63")
BLUE_DARK = colors.HexColor("#08214A")
BLUE_LIGHT = colors.HexColor("#EAF2FF")
GOLD = colors.HexColor("#B8860B")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#475569")
LINE = colors.HexColor("#CBD5E1")
LIGHT = colors.HexColor("#F8FAFC")
GREEN_LIGHT = colors.HexColor("#ECFDF5")
ORANGE_LIGHT = colors.HexColor("#FFF7ED")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "CoverTitle": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            textColor=BLUE,
            spaceAfter=10,
        ),
        "CoverSubtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11.2,
            leading=16,
            alignment=TA_CENTER,
            textColor=MUTED,
            spaceAfter=7,
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
            fontSize=16,
            leading=20,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.4,
            leading=14.5,
            textColor=BLUE_DARK,
            spaceBefore=7,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.75,
            leading=12.1,
            alignment=TA_JUSTIFY,
            textColor=INK,
            spaceAfter=4.4,
        ),
        "Small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.4,
            leading=9.6,
            textColor=INK,
        ),
        "Tiny": ParagraphStyle(
            "Tiny",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=6.7,
            leading=8.25,
            textColor=MUTED,
        ),
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.05,
            leading=8.7,
            textColor=colors.white,
        ),
        "Note": ParagraphStyle(
            "Note",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10.8,
            backColor=BLUE_LIGHT,
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
            backColor=ORANGE_LIGHT,
            borderColor=colors.HexColor("#FDBA74"),
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
            backColor=GREEN_LIGHT,
            borderColor=colors.HexColor("#86EFAC"),
            borderWidth=0.7,
            borderPadding=6,
            textColor=colors.HexColor("#064E3B"),
            spaceBefore=4,
            spaceAfter=7,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.55,
            leading=11.7,
            alignment=TA_LEFT,
            textColor=INK,
            spaceAfter=3.8,
        ),
    }


S = build_styles()


def p(text: str, style: str = "Body"):
    return Paragraph(text, S[style])


def h1(text: str):
    return Paragraph(escape(text), S["H1"])


def h2(text: str):
    return Paragraph(escape(text), S["H2"])


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
        [ListItem(p(item), leftIndent=15) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8,
        bulletColor=BLUE,
    )


def table(data, widths, header=True, zebra=True, font_size=7.1):
    rows = []
    for idx, row in enumerate(data):
        style = "TableHeader" if header and idx == 0 else "Small"
        rows.append([cell if isinstance(cell, Paragraph) else Paragraph(str(cell), S[style]) for cell in row])
    t = Table(rows, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    commands = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("LEADING", (0, 0), (-1, -1), font_size + 1.9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4.4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4.4),
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


def draw_header(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.white)
    canvas.rect(0, height - 1.55 * cm, width, 1.55 * cm, fill=True, stroke=False)
    canvas.setStrokeColor(LINE)
    canvas.line(1.15 * cm, height - 1.55 * cm, width - 1.15 * cm, height - 1.55 * cm)

    if BRASAO.exists():
        canvas.drawImage(str(BRASAO), 1.22 * cm, height - 1.36 * cm, width=0.88 * cm, height=0.88 * cm, preserveAspectRatio=True, mask="auto")

    x = width / 2
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 7.6)
    canvas.drawCentredString(x, height - 0.46 * cm, "JUSTIÇA FEDERAL DO AMAZONAS")
    canvas.setFont("Helvetica", 7.2)
    canvas.drawCentredString(x, height - 0.75 * cm, "SEÇÃO JUDICIÁRIA DO AMAZONAS")
    canvas.drawCentredString(x, height - 1.04 * cm, "Núcleo de Tecnologia da Informação - NUTEC")
    canvas.setFillColor(BLUE)
    canvas.setFont("Helvetica-Bold", 7.0)
    canvas.drawRightString(width - 1.25 * cm, height - 0.74 * cm, "Tutorial do Usuário")
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
        rightMargin=1.2 * cm,
        leftMargin=1.2 * cm,
        topMargin=1.82 * cm,
        bottomMargin=1.12 * cm,
        title="Tutorial de Jornadas do SECP",
        author="Núcleo de Tecnologia da Informação - NUTEC",
        subject="Cadastro, escala e associação de jornadas às pessoas no SECP",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="default", frames=[frame], onPage=draw_header)])
    return doc


TIPOS = [
    ("SETE_HORAS", "7 horas", "Jornada ordinária diária de 7 horas, normalmente ininterrupta. No SECP, a carga diária sugerida é 420 minutos, com entrada e saída padrão, e sem intervalo obrigatório."),
    ("OITO_HORAS", "8 horas", "Jornada diária de 8 horas em dois turnos. Deve exigir intervalo, com mínimo de 60 minutos e máximo de 180 minutos."),
    ("ESPECIAL", "Especial", "Regime autorizado por profissão regulamentada ou situação excepcional. Exige fundamento legal ou normativo no cadastro."),
    ("FIXA_SEMANAL", "Fixa semanal", "Previsão que se repete por dia da semana. A grade semanal define quais dias têm trabalho, folga, carga e faixas de horário."),
    ("FLEXIVEL", "Flexível", "Jornada com carga prevista, mas com janela mais ampla, núcleo obrigatório ou autorização para horário diferenciado."),
    ("CARGA_DIARIA", "Carga diária", "Controle centrado na quantidade de minutos do dia, com menos ênfase no horário fixo, desde que a jornada continue controlando frequência."),
    ("CARGA_SEMANAL", "Carga semanal", "Controle principal por carga semanal. O campo de carga semanal em minutos é obrigatório para esse tipo."),
    ("CARGA_MENSAL", "Carga mensal", "Controle principal por carga mensal. O campo de carga mensal em minutos é obrigatório para esse tipo."),
    ("ESCALA_CICLICA", "Escala cíclica", "Regime em ciclos, como 12x36 ou 24x72. A jornada guarda as regras gerais; a escala cadastrada no detalhe define as posições do ciclo."),
    ("ESCALA_VARIAVEL", "Escala variável", "Regime cujo planejamento muda conforme necessidade. A jornada define parâmetros gerais e a escala atribuída define o dia esperado."),
    ("TURNO_FIXO", "Turno fixo", "Regime com turno constante, por exemplo manhã, tarde ou noite, podendo ter grade semanal própria."),
    ("TURNO_REVEZAMENTO", "Turno de revezamento", "Regime em que a pessoa alterna turnos por ciclo. Normalmente usa escala de revezamento com data de ancoragem."),
    ("NOTURNA", "Noturna", "Jornada com trabalho no período noturno, podendo atravessar a meia-noite. Deve marcar virada de dia quando a saída for no dia seguinte."),
    ("PARCIAL", "Parcial ou reduzida", "Regime com carga inferior à ordinária, como meio período ou redução formal por ato administrativo."),
    ("PLANTAO_EVENTUAL", "Plantão eventual", "Regime usado para plantões não ordinários ou acionamentos específicos, com dias de plantão definidos na grade ou em escala."),
    ("SEM_CONTROLE_CONVENCIONAL", "Sem controle convencional", "Regime sem controle ordinário de horário. Quando o controle de horário fica desmarcado, a ausência de marcações não gera falta comum."),
]

OPCOES_TIPO_JORNADA = [
    ("7 horas", "SETE_HORAS"),
    ("8 horas", "OITO_HORAS"),
    ("Especial", "ESPECIAL"),
    ("Fixa semanal", "FIXA_SEMANAL"),
    ("Flexível", "FLEXIVEL"),
    ("Carga diária", "CARGA_DIARIA"),
    ("Carga semanal", "CARGA_SEMANAL"),
    ("Carga mensal", "CARGA_MENSAL"),
    ("Escala cíclica", "ESCALA_CICLICA"),
    ("Escala variável", "ESCALA_VARIAVEL"),
    ("Turno fixo", "TURNO_FIXO"),
    ("Turno de revezamento", "TURNO_REVEZAMENTO"),
    ("Noturna", "NOTURNA"),
    ("Parcial/reduzida", "PARCIAL"),
    ("Plantão eventual", "PLANTAO_EVENTUAL"),
    ("Sem controle convencional", "SEM_CONTROLE_CONVENCIONAL"),
]

OPCOES_TIPO_DIA = [
    "Trabalho",
    "Folga",
    "Plantão",
    "Compensado",
    "Sem expediente",
]

OPCOES_TIPO_ESCALA = [
    "Semanal",
    "Revezamento",
    "Individual",
    "Cíclica",
    "Planejada",
    "Turno fixo",
    "Turno alternante",
]

OPCOES_TIPO_VINCULACAO = [
    "Permanente",
    "Temporária",
    "Por cargo/categoria",
    "Por unidade",
    "Por seccional",
    "Padrão do órgão",
]


EXEMPLOS = {
    "SETE_HORAS": ["Servidor administrativo com expediente das 08:00 às 15:00, sem intervalo obrigatório.", "Servidor com horário diferenciado autorizado para cumprir 7h entre 06:00 e 13:00, se a jornada permitir a exceção."],
    "OITO_HORAS": ["Servidor ocupante de FC/CJ cumprindo 08:00-12:00 e 13:00-17:00.", "Pessoa em unidade com atendimento ampliado, trabalhando 09:00-13:00 e 14:00-18:00."],
    "ESPECIAL": ["Profissional com jornada definida em legislação específica, como área de saúde, com fundamento registrado.", "Servidor enquadrado em ato administrativo temporário que autoriza regime diferente do padrão."],
    "FIXA_SEMANAL": ["Segunda a sexta, das 08:00 às 15:00, com sábado e domingo como folga.", "Segunda a quinta com 8h e sexta com carga reduzida, conforme ato interno."],
    "FLEXIVEL": ["Entrada entre 07:00 e 09:00, núcleo obrigatório das 10:00 às 14:00 e saída proporcional.", "Servidor autorizado a variar entrada e saída dentro da janela de 06:00 a 19:00."],
    "CARGA_DIARIA": ["Pessoa que precisa cumprir 6h por dia, com controle principal pelo total diário trabalhado.", "Atividade administrativa com carga diária de 5h, sem necessidade de turno rígido."],
    "CARGA_SEMANAL": ["Servidor com meta de 35h semanais distribuídas conforme escala da unidade.", "Equipe que alterna dias mais longos e mais curtos, desde que feche a carga semanal."],
    "CARGA_MENSAL": ["Regime que exige fechamento de 150h no mês, com distribuição acompanhada pela chefia.", "Unidade com planejamento mensal de atendimento, ajustando os dias trabalhados dentro da competência."],
    "ESCALA_CICLICA": ["Escala 12x36: Dia 1 trabalha 12h; Dia 2 folga; data de ancoragem define a sequência.", "Escala 24x72: um dia de plantão e três dias de folga, com ciclo de 4 dias."],
    "ESCALA_VARIAVEL": ["Equipe de apoio a audiências com horários planejados conforme pauta semanal.", "Atendimento extraordinário em mutirão, com escala informada para os dias necessários."],
    "TURNO_FIXO": ["Servidor sempre no turno da manhã, das 07:00 às 14:00.", "Equipe de atendimento vespertino, das 12:00 às 19:00, com mesma faixa em todos os dias úteis."],
    "TURNO_REVEZAMENTO": ["Pessoa alterna semana diurna e semana vespertina, conforme escala de revezamento.", "Equipe técnica alterna ciclo manhã/tarde/noite com data de ancoragem definida."],
    "NOTURNA": ["Plantão das 19:00 às 01:00, com virada de dia marcada.", "Equipe de operação das 22:00 às 06:00, usando limite de virada para a data de referência."],
    "PARCIAL": ["Estagiário com jornada diária de 4h, das 08:00 às 12:00.", "Servidor com redução formal de jornada para 5h diárias por período determinado."],
    "PLANTAO_EVENTUAL": ["Servidor convocado para plantão em fim de semana específico.", "Equipe de suporte escalada para atendimento excepcional em feriado."],
    "SEM_CONTROLE_CONVENCIONAL": ["Magistrado ou autoridade sem registro ordinário de ponto, conforme regra administrativa.", "Pessoa dispensada de controle eletrônico convencional por ato específico, sem gerar falta por ausência de marcação comum."],
}


def story():
    today = date.today().strftime("%d/%m/%Y")
    elems = []

    elems += [
        Spacer(1, 1.0 * cm),
        Image(str(BRASAO), width=2.25 * cm, height=2.25 * cm) if BRASAO.exists() else Spacer(1, 2.25 * cm),
        Spacer(1, 0.20 * cm),
        p("JUSTIÇA FEDERAL DO AMAZONAS", "Institution"),
        p("SEÇÃO JUDICIÁRIA DO AMAZONAS", "Institution"),
        p("Núcleo de Tecnologia da Informação - NUTEC", "Institution"),
        Spacer(1, 0.92 * cm),
        p("Tutorial de Jornadas no SECP", "CoverTitle"),
        p("Cadastro dos tipos de jornada, criação de escalas e associação à pessoa para apuração, banco de horas e homologação", "CoverSubtitle"),
        Spacer(1, 0.48 * cm),
        table(
            [
                ["Sistema", "SECP - Sistema Eletrônico de Controle de Ponto"],
                ["Público-alvo", "Usuários responsáveis por cadastrar jornadas, escalas e vínculos de jornada"],
                ["Unidade emissora", "Núcleo de Tecnologia da Informação - NUTEC"],
                ["Data de emissão", today],
                ["Finalidade", "Material de treinamento para uso interno"],
            ],
            [4.0 * cm, 12.0 * cm],
            header=False,
        ),
        Spacer(1, 0.42 * cm),
        p("Neste tutorial, a palavra pessoa é usada no sentido de cadastro funcional do SECP. Na tela de atribuição, o sistema apresenta esse cadastro como servidor.", "Note"),
        PageBreak(),
    ]

    elems += [
        h1("1. O que a jornada controla"),
        p("A jornada informa ao SECP qual carga a pessoa deve cumprir, em quais dias há expediente, se há intervalo obrigatório, se existe janela de horário, se o banco de horas pode ser movimentado e se horas extras podem ser tratadas por fluxo próprio."),
        p("Quando associada à pessoa, a jornada passa a valer dentro do período informado. O cálculo diário procura a jornada vigente na data da marcação, resolve a previsão do dia e compara as marcações registradas com a carga esperada."),
        table(
            [
                ["Efeito prático", "Como aparece na rotina"],
                ["Apuração diária", "Define carga prevista, janela de expediente, necessidade de intervalo e resultado do dia: regular, crédito, débito, falta, incompleta, sem jornada ou sem expediente."],
                ["Banco de horas", "Créditos e débitos apurados podem gerar movimentos pendentes, observando autorização, limite mensal, prazo de compensação e homologação."],
                ["Homologação", "A chefia e a gestão de pessoas analisam ocorrências geradas a partir da jornada vigente no mês."],
                ["Horário diferenciado", "Só pode ser autorizado individualmente se a jornada permitir essa exceção. O sistema registra quem autorizou e quando."],
                ["Histórico", "Vínculos são temporais. Uma nova associação substitui ou recorta períodos sobrepostos, preservando a rastreabilidade."],
            ],
            [4.4 * cm, 11.6 * cm],
        ),
        p("Atenção: pessoa sem jornada vigente em dia útil tende a ficar com ocorrência de sem jornada. Isso impede uma apuração limpa e deve ser corrigido antes da homologação.", "Warn"),
        h1("2. Permissões e caminhos no menu"),
        p("O cadastro e a associação de jornadas exigem permissão de gerenciamento de jornadas. No menu lateral, acesse Jornada e escala > Jornadas."),
        numbered([
            "Para consultar jornadas já cadastradas, use a tela Jornadas. Ela permite filtrar por busca geral, código, nome, tipo e status.",
            "Para cadastrar um novo tipo de jornada, clique em Nova jornada.",
            "Para associar uma jornada a uma pessoa, clique em Atribuir jornada.",
            "Para cadastrar uma escala, primeiro abra a jornada em Detalhar e use o bloco Cadastrar escala.",
        ]),
        h1("3. Cadastro da jornada"),
        p("Na tela Nova jornada, preencha os dados gerais, parâmetros de controle e, quando aplicável, a previsão semanal. O código deve usar letras maiúsculas, números e underscore, por exemplo JORNADA_7H ou ESCALA_12X36."),
        table(
            [
                ["Nome do campo na tela", "Como preencher", "Observação prática"],
                ["Código", "Identificador único, em maiúsculas.", "Não pode repetir outro código existente."],
                ["Nome", "Nome claro para seleção pelo usuário.", "Use nomes como Jornada 7h - Administrativa."],
                ["Tipo", "Escolha uma das opções exibidas no campo.", "O tipo orienta validações e interpretação do cadastro."],
                ["Carga diária em minutos", "Ex.: 420 para 7h, 480 para 8h.", "É a principal referência diária quando não houver escala mais específica."],
                ["Entrada padrão", "Horário no formato HH:mm.", "Obrigatório para jornadas que controlam horário, exceto carga semanal, carga mensal e sem controle convencional."],
                ["Saída padrão", "Horário no formato HH:mm.", "Deve ser posterior à entrada, salvo jornada com virada de dia."],
                ["Exige intervalo", "Marque quando houver repouso/alimentação obrigatório.", "Jornada de 8h deve exigir intervalo entre 60 e 180 minutos."],
                ["Permite horário diferenciado", "Marque quando a jornada admitir autorização individual de horário diferenciado.", "Apenas permitir no cadastro não autoriza automaticamente a pessoa."],
                ["Controla horário", "Mantenha marcado quando o SECP deve esperar marcações e comparar horários.", "Desmarque em regime sem controle convencional."],
                ["Permite flexibilidade", "Marque quando a carga puder ser cumprida em janela mais ampla ou com núcleo obrigatório.", "Útil para jornada flexível, escala ou revezamento."],
                ["Permite banco de horas", "Mantenha marcado quando créditos e débitos puderem movimentar saldo.", "Desmarque apenas se o regime não deve gerar banco."],
                ["Permite hora extra", "Marque para regimes que possam tratar excedentes como serviço extraordinário.", "Depende de autorização e fluxo próprio."],
                ["Permite virada de dia", "Marque quando o trabalho puder começar em uma data e terminar na data seguinte.", "Usado principalmente em jornada noturna e plantões."],
                ["Intervalo mínimo", "Informe em minutos.", "Quando exige intervalo estiver marcado, o mínimo deve ser pelo menos 60."],
                ["Intervalo máximo", "Informe em minutos.", "Quando exige intervalo estiver marcado, o máximo não pode superar 180."],
                ["Entrada mínima diferenciada", "Informe o menor horário permitido na janela diferenciada.", "A validação do SECP espera limite mínimo de 06:00."],
                ["Saída máxima diferenciada", "Informe o maior horário permitido na janela diferenciada.", "A validação do SECP espera limite máximo de 19:00."],
                ["Fundamento normativo", "Portaria, resolução, ato, lei ou regulamento.", "Obrigatório na jornada especial."],
                ["Vigência inicial", "Data inicial da validade da jornada.", "Use quando a jornada nasce a partir de uma data específica."],
                ["Vigência final", "Data final da validade da jornada, quando houver.", "Não pode ser anterior à vigência inicial."],
                ["Limite da virada", "Horário usado como limite operacional da virada de dia.", "Útil quando a jornada cruza a meia-noite."],
                ["Descrição", "Texto livre com observações da jornada.", "Em jornadas especiais, complemente o fundamento legal ou normativo."],
                ["Carga semanal em minutos", "Informe a carga semanal quando o tipo for Carga semanal.", "Ex.: 2100 para 35h semanais."],
                ["Carga mensal em minutos", "Informe a carga mensal quando o tipo for Carga mensal.", "Ex.: 9000 para 150h mensais."],
                ["Jornada ativa", "Mantenha marcada para permitir uso em novas associações.", "Jornadas inativas não devem ser atribuídas a novas pessoas."],
            ],
            [3.5 * cm, 5.6 * cm, 6.9 * cm],
            font_size=6.65,
        ),
        h2("Opções do campo Tipo"),
        table(
            [["Opção exibida", "Código interno registrado"]] + OPCOES_TIPO_JORNADA,
            [6.2 * cm, 9.8 * cm],
            font_size=6.9,
        ),
        h2("Previsão semanal"),
        p("A grade Previsão semanal da jornada define o comportamento esperado em cada dia da semana. As colunas que aparecem para o usuário são Dia, Tipo, Carga, Início, Fim, Núcleo início, Núcleo fim e Vira dia."),
        bullets([
            "Tipo: escolha Trabalho, Folga, Plantão, Compensado ou Sem expediente.",
            "Carga: informe a carga prevista do dia em minutos.",
            "Início e Fim: informe a faixa de trabalho do dia.",
            "Núcleo início e Núcleo fim: use quando houver período obrigatório dentro de uma jornada flexível.",
            "Vira dia: marque quando a faixa começar em um dia e terminar após a meia-noite.",
        ]),
        h1("4. Cadastro de escala"),
        p("A escala é cadastrada dentro do detalhe de uma jornada. Ela é usada quando a regra do dia não pode ser representada apenas pela grade semanal da jornada."),
        numbered([
            "Acesse Jornadas e clique em Detalhar na jornada desejada.",
            "No bloco Cadastrar escala, preencha os campos Código, Nome, Tipo, Escala ativa, Dias do ciclo, Data de ancoragem, Fuso horário e Descrição.",
            "Para escala cíclica, revezamento ou turno alternante, informe Dias do ciclo e Data de ancoragem. A data de ancoragem define qual data corresponde ao Dia 1 do ciclo.",
            "Na tabela Ciclo por posição, quando usada, preencha Posição, Trabalha, Entrada, Saída, Início intervalo, Fim intervalo, Carga min. e Vira dia.",
            "Na tabela semanal, preencha Dia, Trabalha, Entrada, Saída, Início intervalo, Fim intervalo e Carga min.",
            "Clique em Cadastrar escala. Depois, ao atribuir a jornada à pessoa, selecione a escala correspondente quando o formulário oferecer essa opção no fluxo utilizado.",
        ]),
        table(
            [
                ["Opção do campo Tipo", "Uso típico"],
                ["Semanal", "Repete os mesmos dias da semana."],
                ["Revezamento", "Alterna posições de trabalho e folga por ciclo."],
                ["Individual", "Ajuste específico para uma pessoa."],
                ["Cíclica", "Ciclo fixo por quantidade de dias, como 12x36."],
                ["Planejada", "Escala definida por planejamento administrativo."],
                ["Turno fixo", "Pessoa sempre no mesmo turno."],
                ["Turno alternante", "Pessoa alterna turnos dentro do ciclo."],
            ],
            [5.0 * cm, 11.0 * cm],
        ),
        h1("5. Associação da jornada à pessoa"),
        p("A associação é feita na tela Atribuir jornada ao servidor. Essa etapa é o que torna a jornada efetiva para apuração da pessoa."),
        numbered([
            "Acesse Jornada e escala > Jornadas.",
            "Clique em Atribuir jornada.",
            "No campo Servidor, pesquise por matrícula, nome ou lotação e selecione a pessoa.",
            "No campo Jornada, selecione a jornada ativa que será aplicada.",
            "No campo Data de início, informe o primeiro dia de validade. Use Data final apenas quando a associação for temporária.",
            "No campo Tipo de vinculação, escolha Permanente, Temporária, Por cargo/categoria, Por unidade, Por seccional ou Padrão do órgão.",
            "Preencha Documento SEI, Fundamento documental, Motivo e Autoridade responsável quando houver ato administrativo.",
            "Marque Autorizar horário diferenciado somente quando a jornada permitir essa exceção e informe Justificativa formal.",
            "Clique em Atribuir jornada.",
        ]),
        table(
            [
                ["Nome do campo na tela", "Uso correto"],
                ["Servidor", "Seleciona a pessoa que receberá a jornada."],
                ["Jornada", "Seleciona a jornada ativa que passará a valer."],
                ["Data de início", "Define a primeira data de efeito da associação."],
                ["Data final", "Encerra a associação em data específica, quando houver."],
                ["Tipo de vinculação", "Classifica o motivo institucional do vínculo."],
                ["Documento SEI", "Registra o documento administrativo de suporte."],
                ["Fundamento documental", "Informa portaria, decisão, processo ou ato."],
                ["Motivo", "Resume a razão da associação."],
                ["Autoridade responsável", "Identifica quem autorizou ou determinou o vínculo."],
                ["Autorizar horário diferenciado", "Habilita a exceção individual, se a jornada permitir."],
                ["Justificativa", "Obrigatória para horário diferenciado e para alguns vínculos temporários ou excepcionais."],
            ],
            [5.0 * cm, 11.0 * cm],
            font_size=6.8,
        ),
        p("Se a nova associação sobrepuser outra jornada ativa da mesma pessoa, o SECP ajusta o período anterior, cria continuação quando necessário ou substitui o vínculo sobreposto. Assim, cada data deve ficar com uma jornada vigente aplicável.", "Ok"),
        PageBreak(),
        h1("6. Como escolher o tipo correto"),
        table(
            [["Opção exibida no campo Tipo", "Código interno", "Cadastro essencial"]] +
            [[rotulo, codigo, desc] for codigo, rotulo, desc in TIPOS],
            [4.25 * cm, 3.75 * cm, 8.0 * cm],
            font_size=6.35,
        ),
        PageBreak(),
    ]

    elems += [
        h1("7. Tipos de jornada e exemplos práticos"),
        p("Use os exemplos abaixo como ponto de partida. Ajuste sempre à norma local, ao ato administrativo e à orientação da área de gestão de pessoas."),
    ]

    for codigo, rotulo, descricao in TIPOS:
        elems.append(KeepTogether([
            h2(f"{rotulo} ({codigo})"),
            p(descricao),
            table(
                [
                    ["Nº", "Como cadastrar", "Efeito quando associado à pessoa"],
                    ["1", EXEMPLOS[codigo][0], efeito_por_tipo(codigo)],
                    ["2", EXEMPLOS[codigo][1], efeito_por_tipo(codigo)],
                ],
                [0.8 * cm, 7.1 * cm, 8.1 * cm],
                font_size=6.95,
            ),
            Spacer(1, 0.12 * cm),
        ]))

    elems += [
        PageBreak(),
        h1("8. Conferência antes de salvar"),
        table(
            [
                ["Item", "Pergunta de conferência"],
                ["Tipo", "O tipo escolhido representa de fato a regra administrativa da pessoa ou grupo?"],
                ["Carga", "A carga diária, semanal ou mensal está em minutos e bate com o ato normativo?"],
                ["Intervalo", "Jornada de 8h tem intervalo obrigatório entre 60 e 180 minutos?"],
                ["Dias", "Sábados, domingos, folgas e sem expediente foram marcados corretamente?"],
                ["Escala", "Regimes cíclicos têm quantidade de dias e data de ancoragem?"],
                ["Vigência", "A data inicial corresponde ao primeiro dia em que a regra deve produzir efeito?"],
                ["Documento", "Vínculos temporários e exceções têm fundamento, documento SEI ou justificativa?"],
                ["Horário diferenciado", "A jornada permite a exceção e a pessoa tem autorização formal?"],
            ],
            [4.0 * cm, 12.0 * cm],
        ),
        h1("9. Problemas frequentes"),
        table(
            [
                ["Situação", "Causa provável", "Como corrigir"],
                ["Apuração mostra sem jornada", "Pessoa não tinha jornada vigente naquela data.", "Cadastre ou associe a jornada com data de início correta e recalcule a competência."],
                ["Dia virou falta", "Jornada controla horário e não houve marcação nem dispensa aplicável.", "Verifique marcações, afastamentos, dispensa de ponto ou solicitação deferida."],
                ["Apuração incompleta", "Faltou entrada, saída ou marcação de intervalo obrigatório.", "Corrija as marcações ou analise solicitação de ajuste."],
                ["Intervalo inválido", "Intervalo ficou abaixo do mínimo ou acima do máximo.", "Revise marcações e parâmetros da jornada ou escala."],
                ["Horas fora do expediente", "Registro ocorreu fora da janela padrão ou diferenciada.", "Autorize horário diferenciado quando cabível ou ajuste a jornada/escala."],
                ["Crédito não entrou no banco", "Faltou autorização, excedeu limite mensal, não cumpriu regra de intervalo ou foi classificado como não computável.", "Verifique regulamentação, autorização e ocorrências do banco de horas."],
            ],
            [4.0 * cm, 5.6 * cm, 6.4 * cm],
            font_size=6.95,
        ),
        h1("10. Resumo para treinamento"),
        bullets([
            "Cadastre primeiro a jornada, depois cadastre escala se o regime exigir ciclo ou planejamento.",
            "Associe a jornada à pessoa com data de início correta; use data final para vínculos temporários.",
            "Não autorize horário diferenciado sem base formal e sem a jornada permitir a exceção.",
            "Para jornadas especiais, registre o fundamento normativo no cadastro da jornada.",
            "Após mudanças retroativas, recalcule a competência para atualizar apuração e banco de horas.",
        ]),
        p("Material elaborado para treinamento de usuários do SECP, com base nas telas, validações e regras implementadas no módulo de jornadas do sistema.", "Note"),
    ]

    return elems


def efeito_por_tipo(codigo: str) -> str:
    base = {
        "SETE_HORAS": "A apuração espera 420 minutos no dia. Se não houver intervalo obrigatório, marcações de entrada e saída bastam; crédito só é tratado conforme a regra de banco vigente.",
        "OITO_HORAS": "A apuração espera 480 minutos e exige saída e retorno do intervalo. Intervalo fora dos limites gera inconsistência.",
        "ESPECIAL": "A jornada passa a aplicar carga, horário e intervalo próprios do regime autorizado, preservando o fundamento no histórico.",
        "FIXA_SEMANAL": "O dia da semana determina carga, trabalho, folga e janela. A escala só prevalece se houver uma associada.",
        "FLEXIVEL": "A pessoa pode cumprir a carga dentro da janela configurada, respeitando núcleo obrigatório ou horário diferenciado quando autorizado.",
        "CARGA_DIARIA": "O sistema compara os minutos trabalhados com a carga diária definida, gerando regularidade, crédito ou débito.",
        "CARGA_SEMANAL": "A carga semanal orienta o acompanhamento do período; a previsão diária serve como referência quando configurada.",
        "CARGA_MENSAL": "A carga mensal orienta o fechamento da competência; a previsão diária pode apoiar a apuração dia a dia.",
        "ESCALA_CICLICA": "A posição do ciclo, calculada pela data de ancoragem, define se o dia é trabalho, folga ou plantão.",
        "ESCALA_VARIAVEL": "A escala atribuída define a previsão efetiva do dia, permitindo planejamento diferente da semana padrão.",
        "TURNO_FIXO": "A janela do turno é usada para validar marcações e apontar horas fora do expediente.",
        "TURNO_REVEZAMENTO": "A escala de revezamento define o turno de cada data, evitando débito indevido por troca planejada.",
        "NOTURNA": "A virada de dia permite apurar marcações que começam em uma data e terminam após a meia-noite.",
        "PARCIAL": "A carga reduzida passa a ser a referência; trabalhar menos gera débito, trabalhar mais pode gerar crédito conforme regras.",
        "PLANTAO_EVENTUAL": "Somente os dias previstos como plantão geram carga. Folgas e dias sem expediente não geram falta comum.",
        "SEM_CONTROLE_CONVENCIONAL": "Quando o controle de horário está desmarcado, o dia é tratado sem expediente convencional e não gera falta por ausência de ponto ordinário.",
    }
    return base[codigo]


def main():
    doc = build_doc()
    doc.build(story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
