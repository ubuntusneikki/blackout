"""Kotipelin tyylitesti: kokoaa koti.py:n renderöinnit pix.py:llä yhdeksi esikatselukuvaksi.
Aja:  python3 koti_sheet.py <render-kansio> <ulos.png>"""
import sys, math
from PIL import Image, ImageDraw, ImageFont
from pix import process

D = sys.argv[1].rstrip('/') + '/'; OUT = sys.argv[2]
SP = {  # nimi: ankkuri kankaalla (sama kuin koti.py SPRITES)
    'tila_huone': (96, 118), 'astia_terraario': (24, 60), 'astia_terraario_etu': (24, 60),
    'sieni_heltta_itu': (12, 18), 'sieni_heltta_nuori': (16, 24), 'sieni_heltta_kypsa': (20, 30),
    'laite_hautomo_tyhja': (24, 60), 'laite_hautomo_kaynnissa': (24, 60), 'laite_hautomo_valmis': (24, 60),
}
PPM = 44 / (2 * math.sqrt(0.5))
PLANT_DY = round(0.53 * math.sin(math.radians(60)) * PPM)   # terraarion multapinta ruudun ankkurista ylöspäin
im = {n: process(D + n + '_c.png', D + n + '_id.png') for n in SP}

def tile(c, r):  # ruudun ankkuri huoneen ankkurista
    return 22 * (c - r), 11 * (c + r - 3)

def put(canvas, name, x, y):
    ax, ay = SP[name]; canvas.alpha_composite(im[name], (x - ax, y - ay))

def room(vessels):
    """Koottu huone 192 px leveänä. vessels: [(c, r, astia/laite, sieni tai None)], piirretään c + r -järjestyksessä."""
    cv = Image.new('RGBA', (192, 168), (11, 16, 24, 255))
    put(cv, 'tila_huone', 96, 118)
    for c, r, obj, plant in sorted(vessels, key=lambda v: v[0] + v[1]):
        dx, dy = tile(c, r); x, y = 96 + dx, 118 + dy
        put(cv, obj, x, y)
        if plant:
            put(cv, plant, x, y - PLANT_DY)
            put(cv, obj + '_etu', x, y)
    return cv

S = 4
scene = room([(3, 0, 'astia_terraario', 'sieni_heltta_kypsa'), (0, 0, 'laite_hautomo_kaynnissa', None),
              (1, 3, 'astia_terraario', 'sieni_heltta_nuori')])
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 18)
except Exception: font = ImageFont.load_default()

names = ['astia_terraario', 'sieni_heltta_itu', 'sieni_heltta_nuori', 'sieni_heltta_kypsa',
         'laite_hautomo_tyhja', 'laite_hautomo_kaynnissa', 'laite_hautomo_valmis']
strip_w = sum(im[n].width * S + 30 for n in names) + 30
W = max(192 * S + 60, strip_w); H = 168 * S + 60 + 72 * S + 90
out = Image.new('RGB', (W, H), (11, 16, 24)); d = ImageDraw.Draw(out)
d.text((30, 15), 'KOTI · TYYLITESTI  ·  4×4-huone 192 px, ruutu 44×22 px (≈31 px/m), ×4', fill=(168, 251, 238), font=font)
big = scene.resize((192 * S, 168 * S), Image.NEAREST); out.paste(big, (30, 45))
x = 30; y0 = 168 * S + 60
for n in names:
    b = im[n].resize((im[n].width * S, im[n].height * S), Image.NEAREST)
    out.paste(b, (x, y0 + 72 * S - b.height), b)
    d.text((x, y0 + 72 * S + 8), n.replace('laite_', '').replace('sieni_', '').replace('astia_', ''), fill=(201, 188, 156), font=font)
    x += b.width + 30
out.save(OUT); scene.save(OUT.replace('.png', '_1x.png')); print(out.size)
