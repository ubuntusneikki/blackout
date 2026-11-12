"""Kokoaa kit.py:n renderöinneistä yhden arkin.
Ajo:  python sheet.py [kansio] [ulos.png] [otsikko]   (oletus kit/ -> kit_sheet.png)"""
import sys
from PIL import Image, ImageDraw, ImageFont
from pix import process
D = (sys.argv[1].rstrip('/') + '/') if len(sys.argv) > 1 else 'kit/'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'kit_sheet.png'
TITLE = sys.argv[3] if len(sys.argv) > 3 else 'KATUPAKKAUS 1'
KIT = [('kpl01_penkki','Penkki'),('kpl02_katulamppu','Katulamppu'),('kpl03_bussikatos','Bussikatos'),('kpl04_kioski','Kioski'),
 ('kpl05_auto','Hylätty auto'),('kpl06_vesisailio','Vesisäiliö'),('kpl07_aita','Aita'),('kpl08_sahkokaappi','Sähkökaappi'),
 ('kpl09_pyorateline','Pyöräteline'),('kpl10_sienirengas','Sienirengas')]
TAL = [('talo_a_lamelli','Lamellitalo'),('talo_b_pistetalo','Pistetalo'),('talo_c_kivitalo','Kivitalo')]
S = 4
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 22)
except: font = ImageFont.load_default()
def row(items, S, cell_h):
    ims = [(process(D+n+'_c.png', D+n+'_id.png'), l) for n, l in items]
    W = sum(im.width*S + 40 for im, _ in ims) + 40
    R = Image.new('RGB', (W, cell_h), (11,16,24)); d = ImageDraw.Draw(R); x = 40
    for im, l in ims:
        big = im.resize((im.width*S, im.height*S), Image.NEAREST)
        R.paste(big, (x, cell_h - 50 - big.height), big); d.text((x, cell_h - 38), l, fill=(216,226,234), font=font); x += big.width + 40
    return R
def tallest(items): return max(Image.open(D+n+'_c.png').height for n, _ in items)
r1 = row(KIT[:5], S, tallest(KIT[:5])*S+80); r2 = row(KIT[5:], S, tallest(KIT[5:])*S+80); r3 = row(TAL, 3, tallest(TAL)*3+80)
W = max(r.width for r in (r1, r2, r3)); out = Image.new('RGB', (W, r1.height+r2.height+r3.height+60), (11,16,24))
d = ImageDraw.Draw(out); d.text((40, 15), TITLE + '  ·  palikat 14 px/m (×4)  ·  talot 4 px/m (×3)', fill=(168,251,238), font=font)
y = 60
for r in (r1, r2, r3): out.paste(r, (0, y)); y += r.height
out.save(OUT); print(out.size)
