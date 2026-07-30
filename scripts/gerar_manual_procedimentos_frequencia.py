from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
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


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
DOCS_DIR = ROOT / "docs"
OUT_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = OUT_DIR / "manual-procedimentos-frequencia-sjdf-secp.pdf"
MD_PATH = DOCS_DIR / "manual-procedimentos-frequencia-sjdf-secp.md"
LOGO_PATH = ROOT / "public" / "secp-logo.png"

AZUL = colors.HexColor("#123A6F")
AZUL_ESCURO = colors.HexColor("#0B2447")
VERDE = colors.HexColor("#166534")
CINZA = colors.HexColor("#475569")
CINZA_CLARO = colors.HexColor("#E2E8F0")
FUNDO = colors.HexColor("#F8FAFC")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CapaTitulo",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=30,
        textColor=AZUL_ESCURO,
        alignment=TA_CENTER,
        spaceAfter=18,
    )
)
styles.add(
    ParagraphStyle(
        name="Subtitulo",
        parent=styles["BodyText"],
        fontSize=12,
        leading=17,
        textColor=CINZA,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="H1Manual",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=23,
        textColor=AZUL_ESCURO,
        spaceBefore=12,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="H2Manual",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13.5,
        leading=18,
        textColor=AZUL,
        spaceBefore=10,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyManual",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.4,
        leading=13.2,
        textColor=colors.HexColor("#111827"),
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallManual",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.1,
        leading=10.6,
        textColor=CINZA,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHeader",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8.2,
        leading=10.2,
        textColor=colors.white,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=7.6,
        leading=9.4,
        textColor=colors.HexColor("#111827"),
    )
)
styles.add(
    ParagraphStyle(
        name="Callout",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=AZUL_ESCURO,
    )
)


def p(text: str, style: str = "BodyManual") -> Paragraph:
    return Paragraph(text, styles[style])


def bullets(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item), leftIndent=10) for item in items],
        bulletType="bullet",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=7,
    )


def numbered(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item), leftIndent=12) for item in items],
        bulletType="1",
        leftIndent=14,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8,
    )


def table(rows: list[list[str]], widths: list[float] | None = None) -> Table:
    data = [[p(cell, "TableHeader" if r == 0 else "TableCell") for cell in row] for r, row in enumerate(rows)]
    tbl = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1)
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), AZUL),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return tbl


def callout(text: str) -> Table:
    tbl = Table([[p(text, "Callout")]], colWidths=[16.2 * cm])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#BFDBFE")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tbl


def on_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(AZUL_ESCURO)
    canvas.rect(0, height - 1.15 * cm, width, 1.15 * cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(1.45 * cm, height - 0.68 * cm, "NUTEC / SECP")
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(
        width - 1.45 * cm,
        height - 0.68 * cm,
        "Manual de procedimentos administrativos de frequência",
    )
    canvas.setStrokeColor(CINZA_CLARO)
    canvas.line(1.45 * cm, 1.35 * cm, width - 1.45 * cm, 1.35 * cm)
    canvas.setFillColor(CINZA)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(1.45 * cm, 0.85 * cm, "Material de treinamento - uso interno")
    canvas.drawRightString(width - 1.45 * cm, 0.85 * cm, f"Página {doc.page}")
    canvas.restoreState()


def add_section(story, title: str, body: list):
    story.append(p(title, "H1Manual"))
    story.extend(body)
    story.append(Spacer(1, 0.15 * cm))


def procedure_block(
    codigo: str,
    nome: str,
    quando: str,
    configurar: list[str],
    executar: list[str],
    efeito: str,
    conferir: str,
    exemplos: list[str],
):
    return KeepTogether(
        [
            p(f"{nome} ({codigo})", "H2Manual"),
            table(
                [
                    ["Quando usar", quando],
                    ["Parametrizar antes", "<br/>".join(configurar)],
                    ["Executar no SECP", "<br/>".join(executar)],
                    ["Efeito prático", efeito],
                    ["Como conferir", conferir],
                    ["Exemplos práticos", "<br/>".join(exemplos)],
                ],
                [4.1 * cm, 12.1 * cm],
            ),
            Spacer(1, 0.2 * cm),
        ]
    )


def build_story():
    story = []
    if LOGO_PATH.exists():
        img = Image(str(LOGO_PATH), width=7.4 * cm, height=2.42 * cm)
        img.hAlign = "CENTER"
        story.append(Spacer(1, 1.2 * cm))
        story.append(img)
    else:
        story.append(Spacer(1, 1.5 * cm))

    story.append(Spacer(1, 0.7 * cm))
    story.append(p("Manual de Usuário", "CapaTitulo"))
    story.append(
        p(
            "Procedimentos administrativos de frequência por seccional no SECP",
            "CapaTitulo",
        )
    )
    story.append(
        p(
            "Como parametrizar, configurar e executar os fluxos inspirados nos procedimentos do SJDF para alcançar o efeito final de negócio no SECP.",
            "Subtitulo",
        )
    )
    story.append(Spacer(1, 1.2 * cm))
    story.append(callout("Versão para treinamento de usuários finais, chefias e administradores seccionais."))
    story.append(PageBreak())

    add_section(
        story,
        "1. Objetivo do manual",
        [
            p(
                "Este manual ensina como usar o SECP para parametrizar e executar os procedimentos administrativos de frequência. O foco é o efeito final: apurar corretamente jornada, banco de horas, horas extras, afastamentos, teletrabalho, ajustes e Nada Consta, sempre respeitando as regras de cada seccional.",
            ),
            p(
                "O SECP é multi-seccional. Portanto, sempre confirme se o perfil ativo está no órgão correto antes de configurar ou executar um procedimento.",
            ),
            callout(
                "Regra de ouro: primeiro configure a regulamentação e os procedimentos da seccional; depois execute as rotinas operacionais; por fim confira o espelho, banco de horas ou histórico de execução."
            ),
        ],
    )

    add_section(
        story,
        "2. Permissões e perfil ativo",
        [
            p("Antes de iniciar, verifique no cabeçalho do SECP qual é o perfil ativo. O menu lateral mostra apenas as opções permitidas para esse perfil."),
            table(
                [
                    ["Rotina", "Permissões normalmente necessárias"],
                    ["Procedimentos de frequência", "procedimentos-frequencia:consultar:seccional/global ou procedimentos-frequencia:gerenciar:seccional/global"],
                    ["Emitir Nada Consta", "procedimentos-frequencia:emitir-nada-consta:seccional/global"],
                    ["Regulamentação do ponto", "regulamentacao-ponto:gerenciar:seccional/global"],
                    ["Jornadas", "jornadas:gerenciar:seccional/global"],
                    ["Banco de horas", "banco-horas:gerenciar:seccional/global ou banco-horas:consultar:*"],
                    ["Horas extras", "horas-extras:configurar-*, horas-extras:analisar:chefia, horas-extras:deliberar:*, horas-extras:gerar-lote:*"],
                    ["Solicitações", "solicitacoes:criar:proprio, solicitacoes:analisar:chefia/subordinados, solicitacoes:consultar:*"],
                ],
                [5 * cm, 11.2 * cm],
            ),
        ],
    )

    add_section(
        story,
        "3. Configuração inicial por seccional",
        [
            p("Faça esta etapa uma vez por órgão e revise sempre que houver mudança normativa."),
            p("3.1 Regulamentação do ponto", "H2Manual"),
            numbered(
                [
                    "Acesse Administração > Regulamentação do ponto.",
                    "Escolha o órgão/seccional e clique em Ajustar.",
                    "Marque Usar estas regras para este órgão quando a configuração deve ficar ativa.",
                    "Preencha Referência normativa com a portaria, resolução, despacho ou ato aplicável.",
                    "Revise os campos de banco de horas: Limite mensal de crédito no banco de horas, Prazo para compensação do crédito, Tolerância mínima para gerar crédito e Tolerância mínima para registrar débito.",
                    "Configure jornada de 7h: Mínimo trabalhado para gerar crédito em jornada de 7h, Intervalo mínimo exigido na jornada de 7h, Mínimo para FC/CJ em jornada de 7h e Exigir intervalo para crédito na jornada de 7h.",
                    "Configure janelas: Expediente padrão, Janela permitida para flexibilização, Prazo de homologação e Prazo para ajuste de ponto.",
                    "Configure percentuais: Acréscimo para sábado (%), Acréscimo para domingo/feriado (%) e Acréscimo para recesso (%).",
                    "Use Observações sobre a regra do órgão para registrar exceções e orientações.",
                    "Se quiser reprocessar imediatamente, informe Competência a recalcular e marque Recalcular esta competência ao salvar. Depois clique em Salvar regulamentação.",
                ]
            ),
            p("3.2 Procedimentos de frequência", "H2Manual"),
            numbered(
                [
                    "Acesse Administração > Procedimentos de frequência.",
                    "Na linha do órgão desejado, clique em Ajustar.",
                    "Para cada procedimento, revise Nome apresentado ao usuário, Ativo, Objetivo final de negócio, Orientação operacional e Fundamento normativo da seccional.",
                    "Marque ou desmarque: Exige processo SEI, Exige ciência do gestor, Exige autoridade, Exige anexo/documento, Permite banco aberto, Permite banco fechado, Preserva histórico, Permite recálculo e Lança em competência posterior.",
                    "Preencha Retroatividade livre com a quantidade de meses antes de exigir autorização reforçada.",
                    "Revise Permissão para executar e Permissão para autorizar. Esses campos controlam quem pode operar ou decidir o procedimento.",
                    "Clique em Salvar procedimentos.",
                ]
            ),
            p("3.3 Configuração de horas extras", "H2Manual"),
            numbered(
                [
                    "Acesse Administração > Horas extras.",
                    "Na etapa Escopo, informe Órgão, Escopo e Vigência inicial.",
                    "Na etapa Limites, configure Dia útil, Fim de semana, Mensal, Anual e Divisor.",
                    "Na etapa Percentuais, configure Adicional dia útil, Adicional sábado, Adicional domingo e Adicional feriado.",
                    "Na etapa Fluxo, escolha um modelo: completo, simplificado ou dupla aprovação. Depois marque ou desmarque as etapas desejadas.",
                    "Organize a ordem das etapas com os botões de mover para cima/baixo e ajuste a permissão responsável de cada etapa.",
                    "Publique a configuração. O fluxo passa a orientar solicitação, análise, orçamento, deliberação, execução, fechamento e folha.",
                ]
            ),
        ],
    )

    story.append(PageBreak())
    add_section(
        story,
        "4. Matriz rápida de execução",
        [
            table(
                [
                    ["Procedimento", "Tela principal", "Resultado esperado"],
                    ["Jornada diária", "Jornadas > Atribuições", "Apuração usa jornada vigente e regulamentação da seccional."],
                    ["Hora extra", "Horas extras > Nova solicitação; Gestão; Orçamento; Deliberação; Execução; Folha", "Horas aprovadas são separadas das não autorizadas e seguem para banco/folha."],
                    ["Compensação de saldo", "Solicitações > Nova; Banco de horas", "Débito é compensado por crédito ou trabalho autorizado."],
                    ["Substituição CJ3", "Jornadas > Atribuições", "Jornada temporária de 8h ou outra carga é aplicada no período."],
                    ["Afastamento para ministrar curso", "Solicitações > Nova, tipo Capacitação", "Evento é tratado como informativo/compensável conforme regra."],
                    ["Jornada reduzida", "Jornadas > Atribuições", "Carga prevista reduzida/especial é aplicada por vigência."],
                    ["Banco aberto", "Solicitações > Nova ou Banco de horas > Ajuste administrativo", "Competência aberta pode ser recalculada."],
                    ["Banco fechado", "Banco de horas > Ajuste administrativo", "Histórico é preservado e impacto é lançado conforme procedimento."],
                    ["Teletrabalho", "Servidores > Detalhar > Dispensa administrativa de ponto", "Período autorizado passa a refletir no espelho."],
                    ["Conversão de horas não autorizadas", "Espelho de ponto > Autorizar", "Excedente autorizado vira crédito computável."],
                    ["Nada Consta", "Procedimentos de frequência > Nada Consta", "SECP consolida saldo, débitos, faltas e homologações."],
                ],
                [4.2 * cm, 6.2 * cm, 5.8 * cm],
            )
        ],
    )

    procedures = [
        procedure_block(
            "JORNADA_DIARIA",
            "Jornada diária",
            "Use para garantir que o servidor seja apurado pela carga e pela regra correta da seccional.",
            [
                "Em Administração > Regulamentação do ponto, confira expediente, tolerâncias e regras de crédito.",
                "Em Administração > Procedimentos de frequência, mantenha Jornada diária como Ativo.",
            ],
            [
                "Acesse Jornadas > Atribuições.",
                "Preencha Servidor, Jornada, Data de início e, se houver, Data final.",
                "Em Tipo de vinculação, use Permanente para regra ordinária ou outro tipo quando a regra depender de cargo, unidade ou órgão.",
                "Clique em Atribuir jornada e depois recalcule o espelho quando necessário.",
            ],
            "O espelho passa a calcular carga prevista, minutos trabalhados, crédito, débito e inconsistências pela jornada vigente.",
            "Acesse Espelho de ponto, escolha competência e servidor, e confira as colunas de marcações, crédito, débito e banco de horas.",
            [
                "Servidor de 7h sem intervalo obrigatório: marque a jornada correta e deixe a regulamentação sem exigência de intervalo para crédito de 7h.",
                "Servidor muda de unidade e passa a seguir regra local: atribua nova jornada com Data de início na data da mudança.",
            ],
        ),
        procedure_block(
            "HORA_EXTRA",
            "Hora extra",
            "Use quando houver serviço extraordinário previamente solicitado ou administrativamente autorizado.",
            [
                "Em Administração > Horas extras, configure Escopo, Limites, Percentuais e Fluxo.",
                "Em Administração > Procedimentos de frequência, configure Hora extra com Exige processo SEI, Exige ciência do gestor, Exige autoridade e Exige anexo/documento conforme a norma.",
            ],
            [
                "O servidor acessa Horas extras > Nova solicitação.",
                "Informa o período, a justificativa, a descrição das atividades e os dias/horários solicitados.",
                "A chefia acessa Gestão de horas extras e registra a análise.",
                "Se houver etapa orçamentária, o responsável acessa Orçamento de horas extras e informa Resultado, Minutos aprovados, Valor estimado, Disponibilidade, Ação orçamentária, Plano orçamentário, Empenho/Referência, Processo SEI e Observações.",
                "Na Deliberação de horas extras, escolha Resultado, informe Minutos aprovados, Valor estimado deliberado, Processo SEI e Justificativa da decisão.",
            ],
            "O SECP registra a autorização no motor, compara o autorizado com o executado e separa hora extra aprovada de excedente não autorizado.",
            "Acompanhe em Execução de horas extras, Folha de horas extras, Banco de horas e Espelho de ponto.",
            [
                "SJAM usa fluxo Servidor -> Chefia -> Deliberação -> Execução -> Folha.",
                "SJRR usa fluxo Servidor -> Chefia -> Orçamento -> Deliberação -> Execução -> Fechamento -> Pagamento.",
            ],
        ),
        procedure_block(
            "COMPENSACAO_SALDO",
            "Compensação de saldo",
            "Use para regularizar débito por crédito existente ou por trabalho autorizado.",
            [
                "Em Regulamentação do ponto, confira prazo de compensação, tolerâncias e limite mensal.",
                "Em Procedimentos de frequência, mantenha Compensação de saldo ativa e revise Permissão para autorizar.",
            ],
            [
                "Acesse Solicitações > Nova.",
                "Na etapa 1, selecione Tipo = Compensação.",
                "Na etapa 2, informe Data inicial e Data final.",
                "Na etapa 3, escolha Modalidade da compensação: Utilizar crédito para compensar débito ou Trabalhar horas para compensar débito.",
                "Na etapa 4, preencha Título e Justificativa / descrição e envie.",
                "A chefia analisa a solicitação e escolhe Deferir, Indeferir ou Devolver para ajustes.",
            ],
            "Quando deferida, a compensação reduz o débito ou registra a autorização para compensar dentro do banco de horas.",
            "Confira Banco de horas, Espelho de ponto e Linha do Tempo da solicitação.",
            [
                "Servidor teve débito de 1h em 05/07 e possui crédito suficiente: solicitar Compensação com Utilizar crédito para compensar débito.",
                "Servidor deverá trabalhar 2h adicionais para quitar débito: solicitar Compensação com Trabalhar horas para compensar débito.",
            ],
        ),
        procedure_block(
            "ALTERACAO_TEMPORARIA_JORNADA",
            "Substituição CJ3 ou alteração temporária de jornada",
            "Use quando o servidor precisa cumprir carga diferente em período determinado.",
            [
                "Cadastre a jornada de destino em Jornadas, se ainda não existir.",
                "Em Procedimentos de frequência, revise Alteração temporária de jornada e deixe Permite banco fechado conforme a regra.",
            ],
            [
                "Acesse Jornadas > Atribuições.",
                "Preencha Servidor, Jornada, Data de início e Data final.",
                "Em Tipo de vinculação, selecione Temporária.",
                "Preencha Documento SEI, Fundamento documental, Motivo e Autoridade responsável.",
                "Clique em Atribuir jornada.",
            ],
            "Durante a vigência, a carga prevista do servidor muda e o espelho pode ser recalculado para refletir a substituição.",
            "Confira a aba de jornadas do servidor e o Espelho de ponto do período.",
            [
                "Substituição CJ3 de 01/07 a 15/07: atribua jornada de 8h com Tipo de vinculação = Temporária.",
                "Servidor designado para escala especial por 10 dias: atribua jornada/escala específica com Data final.",
            ],
        ),
        procedure_block(
            "AFASTAMENTO_INFORMATIVO",
            "Afastamento para ministrar curso",
            "Use quando o afastamento deve justificar a frequência sem gerar alteração indevida no banco.",
            [
                "Em Procedimentos de frequência, configure Afastamento informativo com Exige processo SEI, Exige ciência do gestor e Exige anexo/documento se a seccional exigir.",
                "Defina na Orientação operacional se o evento é apenas informativo ou se exige compensação posterior.",
            ],
            [
                "Acesse Solicitações > Nova.",
                "Na etapa 1, selecione Tipo = Capacitação.",
                "Na etapa 2, informe Data inicial e Data final.",
                "Na etapa 3, selecione Modalidade da capacitação: Capacitação externa ou Capacitação interna.",
                "Na etapa 4, preencha Título e Justificativa / descrição e envie.",
            ],
            "O evento fica registrado para análise e pode ser tratado como informativo, abonável ou compensável conforme parametrização da seccional.",
            "Confira a solicitação, o espelho de ponto e o histórico do servidor.",
            [
                "Curso externo de dia inteiro: selecione Capacitação externa e informe o período completo.",
                "Curso interno de 3h com necessidade de complementação: selecione Capacitação interna e oriente a chefia sobre eventual compensação.",
            ],
        ),
        procedure_block(
            "JORNADA_ESPECIAL",
            "Jornada reduzida por razões médicas ou outras",
            "Use para aplicar carga reduzida ou especial autorizada por laudo, decisão ou ato administrativo.",
            [
                "Cadastre uma jornada compatível em Jornadas, se necessário.",
                "Em Procedimentos de frequência, mantenha Jornada especial ou reduzida ativa e exija Documento/ato e Autoridade quando a norma pedir.",
            ],
            [
                "Acesse Jornadas > Atribuições.",
                "Selecione Servidor e Jornada reduzida/especial.",
                "Informe Data de início, Data final quando houver, Documento SEI, Fundamento documental, Motivo, Autoridade responsável e Justificativa.",
                "Clique em Atribuir jornada.",
            ],
            "A carga prevista do período muda e o recálculo passa a comparar marcações contra a jornada especial, não contra a jornada ordinária.",
            "Confira Espelho de ponto, Banco de horas e histórico de jornadas do servidor.",
            [
                "Servidor autorizado a cumprir 4h diárias por razões médicas: atribua jornada especial de 4h com vigência.",
                "Servidor com horário diferenciado autorizado: marque Autorizar horário diferenciado e registre a justificativa.",
            ],
        ),
        procedure_block(
            "AJUSTE_BANCO_ABERTO",
            "Lançamentos com banco aberto",
            "Use para corrigir marcações, ocorrências ou saldos enquanto a competência ainda pode ser recalculada.",
            [
                "Em Regulamentação do ponto, confira Prazo para ajuste de ponto e Prazo de homologação.",
                "Em Procedimentos de frequência, mantenha Ajuste com banco aberto com Permite recálculo marcado.",
            ],
            [
                "Para pedido do servidor, acesse Solicitações > Nova e use Tipo = Ajuste de ponto, Abono/justificativa, Atividade externa, Viagem a serviço ou Folga banco de horas.",
                "Para ajuste administrativo, acesse Banco de horas, selecione servidor/competência e use Ajuste administrativo.",
                "No ajuste administrativo, preencha Natureza, Data de referência, Quantidade de horas, Processo SEI, Ato/autorização, Autoridade e Justificativa.",
            ],
            "O SECP registra o ajuste, recalcula a competência aberta e atualiza o saldo imediatamente quando permitido.",
            "Confira Espelho de ponto, Banco de horas e Auditoria.",
            [
                "Servidor esqueceu saída às 15:00 em mês aberto: criar Solicitação do tipo Ajuste de ponto, Tipo de marcação = SAÍDA.",
                "Chefia autoriza abono de período em aberto: criar Solicitação do tipo Abono/justificativa e deferir.",
            ],
        ),
        procedure_block(
            "AJUSTE_BANCO_FECHADO",
            "Lançamentos com banco fechado",
            "Use para regularizar período já homologado sem apagar o histórico original.",
            [
                "Em Procedimentos de frequência, configure Ajuste com banco fechado com Permite banco fechado, Preserva histórico e Lança em competência posterior.",
                "Revise Retroatividade livre, Exige autoridade e Exige anexo/documento.",
            ],
            [
                "Acesse Banco de horas e selecione o servidor.",
                "Use Ajuste administrativo.",
                "Preencha Natureza = Crédito ou Débito, Data de referência da ocorrência original, Quantidade de horas, Processo SEI, Ato/autorização, Autoridade e Justificativa.",
                "Clique em Incluir ajuste.",
            ],
            "O SECP registra a execução como procedimento de banco fechado, preserva o espelho homologado e lança o impacto como movimento administrativo auditável.",
            "Confira Movimentos do banco de horas e Auditoria. Não espere alteração visual do espelho homologado original.",
            [
                "Correção de 2h de crédito de maio já homologado: lançar Crédito com processo SEI e justificativa.",
                "Débito reconhecido depois do fechamento: lançar Débito administrativo com autoridade e fundamento.",
            ],
        ),
        procedure_block(
            "TRABALHO_REMOTO",
            "Teletrabalho ou dispensa administrativa de ponto",
            "Use para registrar período autorizado de teletrabalho, dispensa de ponto ou regra de frequência manual.",
            [
                "Em Procedimentos de frequência, revise Teletrabalho ou trabalho remoto e defina se exige processo SEI, ciência, autoridade e documento.",
                "Confirme se a permissão para executar permite o cadastro pela equipe responsável.",
            ],
            [
                "Acesse Servidores e abra o Detalhar do servidor.",
                "No card Dispensa administrativa de ponto, preencha Motivo, Data de início, Data final, Ato autorizativo, Processo SEI e Observação.",
                "Marque Exigir frequência manual quando o servidor precisa continuar informando frequência; desmarque quando a dispensa não exigir marcação.",
                "Clique em Registrar dispensa.",
                "Como alternativa para pedido do servidor, use Solicitações > Nova, Tipo = Dispensa de ponto, e configure Regime remoto: Dispensa sem teletrabalho, Teletrabalho 100% ou Regime híbrido.",
            ],
            "O período fica vinculado ao servidor e o espelho passa a tratar frequência conforme a regra autorizada.",
            "Confira o detalhe do servidor, Espelho de ponto e histórico de dispensas.",
            [
                "Teletrabalho integral por portaria: Regime remoto = Teletrabalho 100% ou cadastro direto no servidor.",
                "Regime híbrido às segundas e quartas: Regime remoto = Regime híbrido e marque Seg e Qua em Dias remotos.",
            ],
        ),
        procedure_block(
            "CONVERSAO_HORAS_NAO_AUTORIZADAS",
            "Conversão de horas não autorizadas",
            "Use quando horas excedentes aparecerem como não autorizadas, mas houver decisão administrativa para computá-las.",
            [
                "Em Procedimentos de frequência, revise Conversão de horas não autorizadas e exija processo/documento quando aplicável.",
                "Confirme na Regulamentação do ponto se Exigir autorização prévia para crédito está coerente com a seccional.",
            ],
            [
                "Acesse Espelho de ponto e selecione competência e servidor.",
                "Localize o dia com horas extras não autorizadas.",
                "Na coluna de ações, clique em Autorizar.",
                "No modal Confirmar autorização, preencha Justificativa administrativa, Processo SEI, Documento/ato e Autoridade.",
                "Clique em Confirmar autorização.",
            ],
            "O SECP registra a autorização, converte o excedente em crédito computável e recalcula a competência do servidor.",
            "Confira a mesma data no Espelho de ponto e o Banco de horas.",
            [
                "Servidor cumpriu 02:00 além da jornada com autorização formal posterior: autorizar no espelho e informar o processo SEI.",
                "Parte do excedente era indevida: autorize apenas o tempo permitido pela rotina, mantendo o restante como não autorizado.",
            ],
        ),
        procedure_block(
            "NADA_CONSTA",
            "Nada Consta de frequência",
            "Use para emitir informação consolidada de frequência, banco de horas, débitos vencidos, faltas e homologações pendentes.",
            [
                "Em Procedimentos de frequência, mantenha Nada Consta de frequência ativo.",
                "Garanta que a permissão procedimentos-frequencia:emitir-nada-consta:seccional/global esteja no perfil responsável.",
            ],
            [
                "Acesse Administração > Procedimentos de frequência > Nada Consta.",
                "No campo Servidor, selecione matrícula/nome do servidor.",
                "Preencha Processo SEI.",
                "Preencha Justificativa administrativa com o motivo e o destino do documento.",
                "Clique em Emitir Nada Consta.",
            ],
            "O SECP consolida saldo, débitos vencidos, faltas não resolvidas e homologações pendentes, e registra a emissão no motor.",
            "Confira o card Resultado consolidado e a tabela Últimas emissões.",
            [
                "Servidor sem pendências: resultado Nada consta, com saldo e contadores zerados ou regulares.",
                "Servidor com débito vencido: resultado Constam pendências, exibindo saldo, débitos, faltas ou homologações pendentes.",
            ],
        ),
    ]
    add_section(story, "5. Execução dos procedimentos", procedures)

    story.append(PageBreak())
    add_section(
        story,
        "6. Conferência e auditoria",
        [
            numbered(
                [
                    "Após qualquer execução, confira a tela de origem: solicitação, jornada, banco de horas, espelho ou Nada Consta.",
                    "Confira o Espelho de ponto da competência afetada para validar marcações, carga prevista, crédito, débito, horas extras e banco de horas.",
                    "Confira Banco de horas para verificar movimentos, saldo, pendências, horas não autorizadas e horas acima do limite.",
                    "Em Procedimentos de frequência, acompanhe as execuções registradas quando a rotina gerar procedimento.",
                    "Em Auditoria, confirme usuário responsável, entidade, data/hora e metadados da operação quando necessário.",
                ]
            ),
            callout(
                "Em banco fechado, o comportamento correto é preservar o histórico original. O efeito financeiro/administrativo deve aparecer como movimento posterior ou execução auditável, não como alteração silenciosa do espelho já homologado."
            ),
        ],
    )

    add_section(
        story,
        "7. Checklist antes de treinar usuários",
        [
            bullets(
                [
                    "Perfis possuem as permissões corretas para consultar, executar e autorizar.",
                    "Regulamentação do ponto está ativa para cada seccional.",
                    "Procedimentos de frequência estão ativos e com exigências coerentes.",
                    "Jornadas necessárias foram cadastradas e vinculadas aos servidores.",
                    "Fluxo de horas extras por seccional está publicado.",
                    "Calendário institucional e recesso forense estão atualizados.",
                    "Usuários sabem conferir o resultado no espelho, banco de horas e histórico.",
                ]
            )
        ],
    )

    return story


def markdown_content() -> str:
    return """# Manual de Usuário - Procedimentos Administrativos de Frequência no SECP

Este manual foi gerado também em PDF: `output/pdf/manual-procedimentos-frequencia-sjdf-secp.pdf`.

## Uso

1. Configure a Regulamentação do ponto por seccional.
2. Configure Procedimentos de frequência por seccional.
3. Configure o fluxo de Horas extras, quando aplicável.
4. Execute cada procedimento pela tela própria.
5. Confira os efeitos no Espelho de ponto, Banco de horas, Solicitações, Auditoria ou Nada Consta.

## Telas principais

- Administração > Regulamentação do ponto
- Administração > Procedimentos de frequência
- Administração > Procedimentos de frequência > Nada Consta
- Administração > Horas extras
- Jornadas > Atribuições
- Solicitações > Nova
- Horas extras > Nova solicitação
- Banco de horas
- Espelho de ponto
- Servidores > Detalhar > Dispensa administrativa de ponto

Consulte o PDF para o passo a passo completo, com campos e exemplos práticos por procedimento.
"""


def build_pdf():
    doc = BaseDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=1.45 * cm,
        rightMargin=1.45 * cm,
        topMargin=1.65 * cm,
        bottomMargin=1.55 * cm,
        title="Manual de Procedimentos Administrativos de Frequência - SECP",
        author="NUTEC / SECP",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="normal",
    )
    template = PageTemplate(id="manual", frames=[frame], onPage=on_page)
    doc.addPageTemplates([template])
    doc.build(build_story())
    MD_PATH.write_text(markdown_content(), encoding="utf-8")


if __name__ == "__main__":
    build_pdf()
    print(PDF_PATH)
    print(MD_PATH)
