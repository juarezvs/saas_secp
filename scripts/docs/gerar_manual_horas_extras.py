"""Gera o manual de treinamento a partir do conteúdo e de capturas reais.

Uso: python scripts/docs/gerar_manual_horas_extras.py --render
Não acessa banco, produção ou a aplicação. Não altera as capturas.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle

from manual_horas_extras_conteudo import PAGES

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf"
ASSETS = OUT / "assets" / "manual-horas-extras-2026"
PDF = OUT / "manual-horas-extras-secp-treinamento.pdf"
MD = ROOT / "docs" / "manual-horas-extras-secp-treinamento.md"
REVIEW = ROOT / ".tmp" / "manual-he-review"
WIDTH, HEIGHT = landscape(A4)
MARGIN = 35
BODY_WIDTH = WIDTH - MARGIN * 2
BLUE = colors.HexColor("#123A6F")
GRAY = colors.HexColor("#526173")
LIGHT = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#D7E0E9")
TOTAL = len(PAGES) + 2


def register_fonts():
    choices = [
        (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    ]
    for regular, bold in choices:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("Manual", str(regular)))
            pdfmetrics.registerFont(TTFont("ManualBold", str(bold)))
            pdfmetrics.registerFontFamily("Manual", normal="Manual", bold="ManualBold")
            return
    raise RuntimeError("Fonte Unicode Arial ou DejaVu Sans não localizada")


def clean(text):
    return str(text).replace("—", "-").replace("–", "-").replace("‑", "-")


def paragraph(text, size=10, leading=14, color=colors.black, bold=False):
    return Paragraph(escape(clean(text)), ParagraphStyle(
        "manual", fontName="ManualBold" if bold else "Manual",
        fontSize=size, leading=leading, textColor=color,
        spaceAfter=0, allowWidows=0, allowOrphans=0))


def draw_paragraph(c, text, x, top, width, size=10, leading=14, color=colors.black, bold=False):
    p = paragraph(text, size, leading, color, bold)
    _, height = p.wrap(width, 2000)
    p.drawOn(c, x, top-height)
    return top-height


def header(c, section, title, number, bookmark=True):
    c.setFillColor(BLUE)
    c.setFont("ManualBold", 9)
    c.drawString(MARGIN, HEIGHT-23, "SECP  |  MANUAL DE TREINAMENTO")
    c.setFillColor(GRAY)
    c.setFont("Manual", 8)
    c.drawRightString(WIDTH-MARGIN, HEIGHT-23, section)
    c.setStrokeColor(BORDER)
    c.line(MARGIN, HEIGHT-33, WIDTH-MARGIN, HEIGHT-33)
    c.setFillColor(colors.black)
    c.setFont("ManualBold", 18)
    c.drawString(MARGIN, HEIGHT-59, title)
    c.setFillColor(GRAY)
    c.setFont("Manual", 7.4)
    c.drawString(MARGIN, 17, "Versão documentada 1ad4bb4  |  17 outubro 2026  |  Exemplos fictícios em ambiente isolado")
    c.drawRightString(WIDTH-MARGIN, 17, f"{number} / {TOTAL}")
    if bookmark:
        c.bookmarkPage(f"page-{number}")
        c.addOutlineEntry(title, f"page-{number}", level=0, closed=False)
    return HEIGHT-79


def cover(c):
    logo = ROOT / "public" / "secp-logo.png"
    if logo.exists():
        c.drawImage(str(logo), MARGIN, HEIGHT-112, width=150, height=58, preserveAspectRatio=True, mask="auto")
    c.setFillColor(colors.black)
    c.setFont("ManualBold", 29)
    c.drawString(MARGIN, HEIGHT-167, "Manual de treinamento")
    c.drawString(MARGIN, HEIGHT-204, "de horas extras no SECP")
    y=draw_paragraph(c, "Usuário  |  Chefia  |  Configuração  |  Administração", MARGIN, HEIGHT-232, BODY_WIDTH, 14, 19)
    y=draw_paragraph(c, "Aprenda a preparar campanhas, apresentar projetos, analisar pedidos, comprovar a execução e conferir os desfechos em folha e banco extraordinário.", MARGIN, y-17, BODY_WIDTH-90, 12, 18)
    box_y=116
    box_width=(BODY_WIDTH-24)/3
    cards=[("01", "Campanha específica", "Do planejamento ao encaminhamento documentado à folha."),
           ("02", "Recesso forense", "Período, convocação, campanha, crédito e fruição."),
           ("03", "Pedido individual", "Solicitação do servidor e decisão direta da chefia.")]
    for index,(n,title,body) in enumerate(cards):
        x=MARGIN+index*(box_width+12)
        c.setFillColor(LIGHT);c.roundRect(x,box_y,box_width,115,8,stroke=0,fill=1)
        c.setFillColor(BLUE);c.setFont("ManualBold",18);c.drawString(x+14,box_y+84,n)
        draw_paragraph(c,title,x+14,box_y+68,box_width-28,12,16,bold=True)
        draw_paragraph(c,body,x+14,box_y+43,box_width-28,10,14,color=GRAY)
    c.setFont("Manual",9);c.setFillColor(GRAY)
    c.drawString(MARGIN,65,"Edição de treinamento de 17 de outubro de 2026")
    c.drawString(MARGIN,49,"Telas reais da aplicação SECP 1ad4bb4 com dados fictícios identificados")
    c.bookmarkPage("page-1");c.addOutlineEntry("Capa", "page-1", level=0)
    c.showPage()


def toc(c):
    y=header(c,"Navegação","Sumário",2)
    y=draw_paragraph(c,"Clique no título para abrir a página. As etapas de campanha e de pedido individual são apresentadas separadamente.",MARGIN,y,BODY_WIDTH,10,14)-16
    col=(BODY_WIDTH-30)/2
    rows=(len(PAGES)+1)//2
    line_height=19
    for index, data in enumerate(PAGES):
        column=index//rows;row=index%rows
        x=MARGIN+column*(col+30);top=y-row*line_height
        p=index+3
        c.setFont("Manual",8.8);c.setFillColor(colors.black)
        text=data['title']
        while pdfmetrics.stringWidth(text,"Manual",8.8)>col-31:
            text=text[:-2]
        if text!=data['title']:text=text.rstrip()+"..."
        c.drawString(x,top,text);c.setFillColor(BLUE);c.drawRightString(x+col,top,str(p))
        c.linkRect("",f"page-{p}",(x,top-3,x+col,top+11),relative=0,thickness=0)
    c.showPage()


def screen_page(c, data, number, figure):
    top=header(c,data['section'],data['title'],number)
    top=draw_paragraph(c,"Responsável  "+data['role'],MARGIN,top,BODY_WIDTH,9,12,color=GRAY)-3
    top=draw_paragraph(c,"Caminho  "+data['route'],MARGIN,top,BODY_WIDTH,8.4,11,color=GRAY)-7
    for index, step in enumerate(data['steps'],1):
        top=draw_paragraph(c,f"{index}. {step}",MARGIN,top,BODY_WIDTH,9.5,12.7)-4
    expected=paragraph("Confira  "+data['expected'],9.2,12.2,bold=True)
    _, expected_h=expected.wrap(BODY_WIDTH,1000)
    critical="Limitação atual:" in data['note']
    note=paragraph(data['note'],9 if critical else 8.3,12 if critical else 11,color=colors.black if critical else GRAY) if data['note'] else None
    note_h=note.wrap(BODY_WIDTH,1000)[1] if note else 0
    from PIL import Image
    image_path=ASSETS/data['image']
    with Image.open(image_path) as im:iw,ih=im.size
    assert iw>=1000 and 500<=ih<=650,(image_path,iw,ih)
    space_for_image=top-34-expected_h-note_h-28
    image_h=min(350,space_for_image)
    assert image_h>=255,(data['title'],image_h)
    image_w=iw/ih*image_h
    if image_w>BODY_WIDTH:
        image_w=BODY_WIDTH;image_h=ih/iw*image_w
    x=MARGIN+(BODY_WIDTH-image_w)/2
    y=top-image_h-3
    c.setStrokeColor(BORDER);c.rect(x-1,y-1,image_w+2,image_h+2,stroke=1,fill=0)
    c.drawImage(str(image_path),x,y,width=image_w,height=image_h)
    top=y-5
    top=draw_paragraph(c,f"Figura {figure:02d}  {data['title']}",MARGIN,top,BODY_WIDTH,7.5,10,color=GRAY)-5
    expected.drawOn(c,MARGIN,top-expected_h);top-=expected_h+4
    if note:
        if critical:
            c.setFillColor(colors.HexColor("#FFF4DB"))
            c.roundRect(MARGIN-5,top-note_h-3,BODY_WIDTH+10,note_h+7,3,stroke=0,fill=1)
        note.drawOn(c,MARGIN,top-note_h);top-=note_h
    assert top>=29,(data['title'],top)
    c.showPage()


def text_page(c,data,number):
    y=header(c,data['section'],data['title'],number)-2
    for p in data['paragraphs']:
        y=draw_paragraph(c,p,MARGIN,y,BODY_WIDTH,10.3,15)-13
    if data['rows']:
        widths=[180,BODY_WIDTH-180]
        cells=[[paragraph(t,9.6,13,colors.white,True) for t in data['headers']]]
        cells+=[[paragraph(t,9.5,13) for t in row] for row in data['rows']]
        table=Table(cells,colWidths=widths,hAlign='LEFT')
        table.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),BLUE),
            ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,LIGHT]),
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),
            ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
            ('LINEBELOW',(0,0),(-1,0),.5,BLUE),
        ]))
        _,h=table.wrap(BODY_WIDTH,2000);table.drawOn(c,MARGIN,y-h);y-=h
    assert y>=32,(data['title'],y)
    c.showPage()


def markdown():
    lines=["# Manual de treinamento de horas extras no SECP", "",
           "Edição de 17 de outubro de 2026. Aplicação documentada: 1ad4bb4.", "",
           "Telas reais do SECP em instância isolada com dados fictícios. A versão PDF é o material diagramado para treinamento.", ""]
    for data in PAGES:
        lines+=['## '+data['title'],'',data['section'],'']
        if data['kind']=='screen':
            lines+=['**Responsável:** '+data['role'],'','**Caminho:** '+data['route'],'']
            lines += [f"{i}. {step}" for i,step in enumerate(data['steps'],1)]
            lines+=['','**Confira:** '+data['expected'],'']
            if data['note']:lines+=['**Atenção:** '+data['note'],'']
            lines += [f"![{data['title']}](../output/pdf/assets/manual-horas-extras-2026/{data['image']})",'']
        else:
            for p in data['paragraphs']:lines += [p,'']
            if data['rows']:
                lines+=['| '+' | '.join(data['headers'])+' |','| '+' | '.join(['---']*len(data['headers']))+' |']
                lines+=['| '+' | '.join(row)+' |' for row in data['rows']]
                lines+=['']
    MD.write_text('\n'.join(lines),encoding='utf-8')


def render():
    import fitz
    from PIL import Image,ImageOps,ImageDraw
    REVIEW.mkdir(parents=True,exist_ok=True)
    pdf=fitz.open(PDF)
    assert len(pdf)==TOTAL
    for index,page in enumerate(pdf):
        page.get_pixmap(matrix=fitz.Matrix(1.4,1.4),alpha=False).save(REVIEW/f"page-{index+1:02d}.png")
        assert page.get_text().strip(),index
    for start in range(0,len(pdf),4):
        sheet=Image.new('RGB',(1684,1228),'#dbe2ea')
        draw=ImageDraw.Draw(sheet)
        for offset in range(4):
            index=start+offset
            if index>=len(pdf):break
            with Image.open(REVIEW/f"page-{index+1:02d}.png") as im:
                thumb=ImageOps.contain(im,(826,584))
                x=(offset%2)*842+8;y=(offset//2)*614+22
                sheet.paste(thumb,(x,y))
                draw.text((x,y-17),f"Pagina {index+1}",fill='black')
        sheet.save(REVIEW/f"review-{start//4+1:02d}.png")
    print(f"Renderizadas {len(pdf)} paginas em {REVIEW}")


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--render',action='store_true');args=parser.parse_args()
    register_fonts();OUT.mkdir(parents=True,exist_ok=True)
    for data in PAGES:
        if data['kind']=='screen':assert (ASSETS/data['image']).is_file(),data['image']
    c=canvas.Canvas(str(PDF),pagesize=(WIDTH,HEIGHT),pageCompression=1)
    c.setTitle('Manual de treinamento de horas extras no SECP')
    c.setAuthor('SECP - Material de treinamento funcional')
    c.setSubject('Usuario, chefia, configuracao e administracao; campanhas, recesso e pedido individual')
    cover(c);toc(c);figure=0
    for index,data in enumerate(PAGES,3):
        if data['kind']=='screen':figure+=1;screen_page(c,data,index,figure)
        else:text_page(c,data,index)
    c.save();markdown()
    manifest={'pdf':str(PDF),'pages':TOTAL,'figures':figure,'applicationVersion':'1ad4bb4','screenshots':'Aplicacao real com dados ficticios em instancia isolada','sha256':hashlib.sha256(PDF.read_bytes()).hexdigest()}
    REVIEW.mkdir(parents=True,exist_ok=True);(REVIEW/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    if args.render:render()
    print(json.dumps(manifest,ensure_ascii=False))


if __name__=='__main__':main()
