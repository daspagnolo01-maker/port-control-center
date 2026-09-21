"""Genera la versione PDF impaginata del manuale Port Control Center."""
import re, urllib.request
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                               Table, TableStyle, KeepTogether, PageBreak, Flowable,
                               NextPageTemplate)

SRC = Path('/home/user/workspace/port-control-center/MANUALE.md')
OUT = Path('/home/user/workspace/port-control-center/Manuale-Port-Control-Center.pdf')

# ---------------------------------------------------------------- font
FD = Path('/tmp/fonts'); FD.mkdir(exist_ok=True)
FONTS = {
    'DMSans': 'https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf',
    'Inter': 'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf',
    'JetBrainsMono': 'https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf',
}
avail = {}
for name, url in FONTS.items():
    p = FD / f'{name}.ttf'
    try:
        if not p.exists():
            urllib.request.urlretrieve(url, p)
        pdfmetrics.registerFont(TTFont(name, str(p)))
        avail[name] = True
    except Exception as e:
        print('font fallito', name, e)

# variable fonts: registriamo istanze statiche tramite subset? reportlab usa il default instance.
BODY = 'Inter' if 'Inter' in avail else 'Helvetica'
DISP = 'DMSans' if 'DMSans' in avail else 'Helvetica-Bold'
MONO = 'JetBrainsMono' if 'JetBrainsMono' in avail else 'Courier'
# I font variabili rendono il peso di default (Regular): il grassetto si simula.
pdfmetrics.registerFontFamily(BODY, normal=BODY, bold=BODY, italic=BODY, boldItalic=BODY)

INK = HexColor('#1B2430')
MUTED = HexColor('#5C6674')
ACC = HexColor('#0E6E77')
ACC_DK = HexColor('#0B4A52')
LINE = HexColor('#D3D8DD')
SOFT = HexColor('#F1F4F5')
BAND = HexColor('#E7EDEE')

PW, PH = A4
ML = MR = 20 * mm
MT = 22 * mm
MB = 20 * mm
CW = PW - ML - MR

def st(name, **kw):
    base = dict(fontName=BODY, fontSize=9.6, leading=14.4, textColor=INK, alignment=TA_LEFT,
                allowWidows=0, allowOrphans=0)
    base.update(kw)
    return ParagraphStyle(name, **base)

S = {
    'body': st('body', spaceAfter=6),
    'h1': st('h1', fontName=DISP, fontSize=19, leading=23, textColor=ACC_DK, spaceBefore=4, spaceAfter=9),
    'h2': st('h2', fontName=DISP, fontSize=12.6, leading=16, textColor=INK, spaceBefore=12, spaceAfter=5),
    'h3': st('h3', fontName=DISP, fontSize=10.6, leading=14, textColor=ACC, spaceBefore=9, spaceAfter=4),
    'li': st('li', spaceAfter=3, leftIndent=12, bulletIndent=2),
    'code': st('code', fontName=MONO, fontSize=8.2, leading=11.6, textColor=HexColor('#16303A')),
    'th': st('th', fontName=DISP, fontSize=8.3, leading=11, textColor=HexColor('#FFFFFF')),
    'td': st('td', fontSize=8.3, leading=11.2),
    'tdm': st('tdm', fontName=MONO, fontSize=7.8, leading=11),
    'foot': st('foot', fontSize=7.6, leading=9.5, textColor=MUTED),
    'cover_t': st('cover_t', fontName=DISP, fontSize=31, leading=35, textColor=HexColor('#FFFFFF')),
    'cover_s': st('cover_s', fontSize=11.5, leading=17, textColor=HexColor('#BFD6D9')),
    'cover_k': st('cover_k', fontName=MONO, fontSize=8, leading=12, textColor=HexColor('#8FB5BA')),
    'toc1': st('toc1', fontName=DISP, fontSize=10, leading=15),
    'toc2': st('toc2', fontSize=9.2, leading=14, textColor=MUTED, leftIndent=14),
}

def esc(t):
    t = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    t = re.sub(r'`([^`]+)`', lambda m: f'<font face="{MONO}" size="8.6" color="#16303A">{m.group(1)}</font>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', lambda m: f'<font color="#0B4A52">{m.group(1)}</font>', t)
    return t

class Rule(Flowable):
    def __init__(self, w, color=LINE, th=0.6, pad=0):
        self.w, self.color, self.th, self.pad = w, color, th, pad
        self.height = th + pad
    def wrap(self, aw, ah):
        return (self.w, self.height)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.th)
        self.canv.line(0, self.pad / 2, self.w, self.pad / 2)

class CodeBlock(Flowable):
    """Blocco di codice con sfondo, spezzabile su più pagine."""
    def __init__(self, lines, width, fs=None):
        self.lines, self.width = lines, width
        self.pad = 7
        usable = width - 2 * self.pad - 8
        if fs is None:
            longest = max((pdfmetrics.stringWidth(l, MONO, 8.2) for l in lines), default=0)
            fs = 8.2 if longest <= usable else max(6.4, 8.2 * usable / max(longest, 1))
        self.fs = fs
        self.lh = self.fs * 1.42
        self.height = self.lh * len(lines) + 2 * self.pad
    def wrap(self, aw, ah):
        self.width = min(self.width, aw)
        return (self.width, self.height)
    def split(self, aw, ah):
        fit = int((ah - 2 * self.pad) // self.lh)
        if fit < 2 or fit >= len(self.lines):
            return [self] if ah >= self.height else []
        return [CodeBlock(self.lines[:fit], self.width, self.fs),
                CodeBlock(self.lines[fit:], self.width, self.fs)]
    def draw(self):
        c = self.canv
        c.setFillColor(SOFT); c.setStrokeColor(LINE); c.setLineWidth(0.6)
        c.roundRect(0, 0, self.width, self.height, 3, stroke=1, fill=1)
        c.setFillColor(ACC); c.rect(0, 2, 2.4, self.height - 4, stroke=0, fill=1)
        c.setFont(MONO, self.fs); c.setFillColor(HexColor('#18333C'))
        y = self.height - self.pad - self.fs
        for ln in self.lines:
            c.drawString(self.pad + 6, y, ln)
            y -= self.lh

# ---------------------------------------------------------------- parsing markdown
raw = SRC.read_text().split('\n')
blocks = []  # (tipo, dati)
i = 0
while i < len(raw):
    ln = raw[i]
    s = ln.strip()
    if s.startswith('```'):
        i += 1; buf = []
        while i < len(raw) and not raw[i].strip().startswith('```'):
            buf.append(raw[i].rstrip()); i += 1
        i += 1
        blocks.append(('code', buf)); continue
    if s == '---':
        blocks.append(('hr', None)); i += 1; continue
    if s.startswith('#'):
        lv = len(s) - len(s.lstrip('#'))
        blocks.append((f'h{min(lv,3)}', s.lstrip('#').strip())); i += 1; continue
    if s.startswith('|'):
        rows = []
        while i < len(raw) and raw[i].strip().startswith('|'):
            cells = [c.strip() for c in raw[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells):
                rows.append(cells)
            i += 1
        blocks.append(('table', rows)); continue
    if re.match(r'^[-*] ', s):
        items = []
        while i < len(raw) and re.match(r'^[-*] ', raw[i].strip()):
            items.append(raw[i].strip()[2:]); i += 1
        blocks.append(('ul', items)); continue
    if re.match(r'^\d+\. ', s):
        items = []
        while i < len(raw) and re.match(r'^\d+\. ', raw[i].strip()):
            t = raw[i].strip()
            n = re.match(r'^(\d+)\.', t).group(1)
            items.append((n, re.sub(r'^\d+\.\s*', '', t))); i += 1
        blocks.append(('ol', items)); continue
    if s:
        buf = [s]; i += 1
        while i < len(raw) and raw[i].strip() and not re.match(r'^([#|\-*`]|\d+\. )', raw[i].strip()):
            buf.append(raw[i].strip()); i += 1
        blocks.append(('p', ' '.join(buf))); continue
    i += 1

# ---------------------------------------------------------------- tabelle
def make_table(rows):
    ncol = max(len(r) for r in rows)
    rows = [r + [''] * (ncol - len(r)) for r in rows]
    head, body = rows[0], rows[1:]
    def parola_max(col):
        m = 0
        for txt in [head[col]] + [r[col] for r in body]:
            for w in re.sub(r'[`*]', '', txt).split():
                m = max(m, pdfmetrics.stringWidth(w, MONO, 8.3))
        return m + 13
    mins = [min(parola_max(c), CW * 0.34) for c in range(ncol)]
    weights = []
    for c in range(ncol):
        lens = [len(head[c])] + [len(r[c]) for r in body]
        weights.append(max(sum(lens) / max(len(lens), 1), max(lens) * 0.42, 6))
    tot = sum(weights)
    widths = [CW * w / tot for w in weights]
    # rispetta i minimi e recupera lo spazio dalle colonne più larghe
    for c in range(ncol):
        widths[c] = max(widths[c], mins[c])
    ecc = sum(widths) - CW
    while ecc > 0.5:
        elastiche = [c for c in range(ncol) if widths[c] > mins[c] + 1]
        if not elastiche:
            break
        quota = ecc / len(elastiche)
        for c in elastiche:
            taglio = min(quota, widths[c] - mins[c])
            widths[c] -= taglio; ecc -= taglio
    if sum(widths) > CW:
        k = CW / sum(widths); widths = [w * k for w in widths]
    data = [[Paragraph(esc(c), S['th']) for c in head]]
    for r in body:
        data.append([Paragraph(esc(c), S['td']) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACC_DK),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#FFFFFF'), HexColor('#F6F8F9')]),
        ('LINEBELOW', (0, 0), (-1, -1), 0.4, LINE),
        ('LINEBEFORE', (0, 0), (0, -1), 0, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]))
    return t

# ---------------------------------------------------------------- copertina + indice
story = []
capitoli = []  # (numero, titolo)
for tipo, d in blocks:
    if tipo == 'h2' and re.match(r'^\d+\.\s', d):
        n, tit = d.split('.', 1)
        capitoli.append((n.strip(), tit.strip()))

class Cover(Flowable):
    def wrap(self, aw, ah):
        self.w, self.h = aw, PH - MT - MB
        return (self.w, self.h)
    def draw(self):
        c = self.canv
        h = self.h
        c.saveState()
        c.setFillColor(HexColor('#0C1A22'))
        c.rect(-ML, -MB, PW, PH, stroke=0, fill=1)
        # bande orizzontali sottili che richiamano le banchine
        c.setStrokeColor(HexColor('#173540'))
        for k in range(14):
            y = h * 0.30 - k * 7
            c.setLineWidth(0.7)
            c.line(-ML + 24, y, -ML + 24 + (PW - 48) * (0.35 + 0.045 * k) % (PW - 60), y)
        c.setFillColor(ACC)
        c.rect(0, h - 132, 46, 3.4, stroke=0, fill=1)
        c.restoreState()

def draw_cover(c):
    c.saveState()
    c.setFillColor(HexColor('#0C1A22')); c.rect(0, 0, PW, PH, stroke=0, fill=1)
    c.setStrokeColor(HexColor('#17323C')); c.setLineWidth(0.8)
    for k in range(18):
        y = 150 + k * 9
        c.line(ML, y, ML + 60 + (k * 37) % (CW - 60), y)
    c.setFillColor(ACC); c.rect(ML, PH - 132, 48, 3.6, stroke=0, fill=1)
    c.setFont(MONO, 8.4); c.setFillColor(HexColor('#7FA9AF'))
    c.drawString(ML, PH - 112, 'PORT CONTROL CENTER')
    c.setFont(DISP, 30); c.setFillColor(HexColor('#FFFFFF'))
    c.drawString(ML, PH - 190, 'Manuale di installazione')
    c.drawString(ML, PH - 228, 'e utilizzo')
    c.setFont(BODY, 11.5); c.setFillColor(HexColor('#BFD6D9'))
    c.drawString(ML, PH - 266, 'Interfaccia interattiva di gestione e controllo')
    c.drawString(ML, PH - 284, 'di un porto commerciale')
    c.setStrokeColor(HexColor('#20505A')); c.setLineWidth(0.7)
    c.line(ML, 128, PW - MR, 128)
    c.setFont(MONO, 8); c.setFillColor(HexColor('#8FB5BA'))
    c.drawString(ML, 108, 'VERSIONE DEL DOCUMENTO   21 SETTEMBRE 2026')
    c.drawString(ML, 94, 'CATENA DI ACCESSO   PORTO > AREA FISICA > FUNZIONE > ATTIVITA > SOFTWARE')
    c.restoreState()

# indice
story.append(Paragraph('Indice', S['h1']))
story.append(Rule(CW, ACC, 1.1, 8))
story.append(Spacer(1, 6))
idx = [[Paragraph(f'<font face="{MONO}" size="9" color="#0E6E77">{n}</font>', S['toc1']),
        Paragraph(t, S['toc1'])] for n, t in capitoli]
ti = Table(idx, colWidths=[26, CW - 26], hAlign='LEFT')
ti.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ('TOPPADDING', (0, 0), (-1, -1), 3.4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3.4),
    ('LINEBELOW', (0, 0), (-1, -2), 0.35, HexColor('#E4E8EA')),
]))
story.append(ti)
story.append(PageBreak())

# corpo
iniziato = False
for tipo, d in blocks:
    if tipo == 'p' and d.startswith('Versione del documento:'):
        continue
    if tipo == 'h1':
        continue  # il titolo è in copertina
    if tipo == 'hr':
        continue
    if tipo == 'h2':
        if iniziato:
            story.append(PageBreak())
        iniziato = True
        num, tit = (d.split('.', 1) + [''])[:2]
        story.append(Paragraph(f'<font face="{MONO}" size="11" color="#0E6E77">{num.strip()}</font>&nbsp;&nbsp;{esc(tit.strip())}', S['h1']))
        story.append(Rule(CW, ACC, 1.1, 8))
        story.append(Spacer(1, 4))
    elif tipo == 'h3':
        story.append(Paragraph(esc(d), S['h3']))
    elif tipo == 'p':
        story.append(Paragraph(esc(d), S['body']))
    elif tipo == 'ul':
        for it in d:
            story.append(Paragraph(esc(it), S['li'], bulletText='\u2013'))
        story.append(Spacer(1, 4))
    elif tipo == 'ol':
        for n, it in d:
            story.append(Paragraph(esc(it), S['li'], bulletText=f'{n}.'))
        story.append(Spacer(1, 4))
    elif tipo == 'code':
        story.append(Spacer(1, 2))
        story.append(CodeBlock(d or [''], CW))
        story.append(Spacer(1, 8))
    elif tipo == 'table':
        story.append(Spacer(1, 3))
        story.append(make_table(d))
        story.append(Spacer(1, 9))

# ---------------------------------------------------------------- documento
class Doc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        pass

doc = Doc(str(OUT), pagesize=A4, leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
          title='Manuale di installazione e utilizzo — Port Control Center',
          author='Perplexity Computer', subject='Port Control Center')

frame = Frame(ML, MB, CW, PH - MT - MB, id='corpo', leftPadding=0, rightPadding=0,
              topPadding=0, bottomPadding=0)

def cover_page(c, d):
    draw_cover(c)

def chrome(c, d):
    c.saveState()
    c.setFont(BODY, 7.6); c.setFillColor(MUTED)
    c.drawString(ML, PH - MT + 13, 'Port Control Center · Manuale di installazione e utilizzo')
    c.setStrokeColor(LINE); c.setLineWidth(0.5)
    c.line(ML, PH - MT + 8, PW - MR, PH - MT + 8)
    c.line(ML, MB - 11, PW - MR, MB - 11)
    c.setFont(MONO, 7.8); c.setFillColor(ACC)
    c.drawRightString(PW - MR, MB - 22, f'{c.getPageNumber() - 1}')
    c.setFont(BODY, 7.6); c.setFillColor(MUTED)
    c.drawString(ML, MB - 22, 'Documento ad uso interno')
    c.restoreState()

doc.addPageTemplates([
    PageTemplate(id='cover', frames=[Frame(ML, MB, CW, PH - MT - MB, id='c')], onPage=cover_page),
    PageTemplate(id='corpo', frames=[frame], onPage=chrome),
])

full = [NextPageTemplate('corpo'), PageBreak()] + story  # pagina 1 = copertina
doc.build(full)
print('scritto', OUT)
