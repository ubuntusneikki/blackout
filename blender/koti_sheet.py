"""Kotipelin tyylitesti: kokoaa koti.py:n renderöinnit pix.py:llä yhdeksi esikatselukuvaksi.
Aja:  python3 koti_sheet.py <render-kansio> <ulos.png>
Ankkurit ja ruudun koko luetaan koti.py:n kirjoittamasta koti.json-tiedostosta."""
import sys, json
from PIL import Image, ImageDraw, ImageFont
from pix import process

D = sys.argv[1].rstrip('/') + '/'; OUT = sys.argv[2]
meta = json.load(open(D + 'koti.json'))
SP = {n: (s['ax'], s['ay']) for n, s in meta['sprites'].items()}
TW, TH = meta['tile']; HW, HH = TW // 2, TH // 2
im = {n: process(D + n + '_c.png', D + n + '_id.png') for n in SP}
RW, RH = meta['sprites']['tila_huone']['w'], meta['sprites']['tila_huone']['h']
RAX, RAY = SP['tila_huone']

def tile(c, r):  # ruudun ankkuri huoneen ankkurista
    return HW * (c - r), HH * (c + r - 3)

def put(canvas, name, x, y):
    ax, ay = SP[name]; canvas.alpha_composite(im[name], (x - ax, y - ay))

def room(items):
    """Koottu huone. items: [(c, r, astia/laite, sieni tai None)], piirretään c + r -järjestyksessä."""
    cv = Image.new('RGBA', (RW, RH), (11, 16, 24, 255))
    put(cv, 'tila_huone', RAX, RAY)
    for c, r, obj, plant in sorted(items, key=lambda v: v[0] + v[1]):
        dx, dy = tile(c, r); x, y = RAX + dx, RAY + dy
        put(cv, obj, x, y)
        if plant:
            put(cv, plant, x, y - meta['plant_dy'][obj])
            put(cv, obj + '_etu', x, y)
    return cv

S = 3
scene = room([(3, 0, 'astia_terraario', 'sieni_heltta_kypsa'), (0, 3, 'laite_hautomo_kaynnissa', None),
              (2, 2, 'astia_terraario', 'sieni_heltta_nuori')])
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 18)
except Exception: font = ImageFont.load_default()

names = ['astia_terraario', 'sieni_heltta_itu', 'sieni_heltta_nuori', 'sieni_heltta_kypsa',
         'laite_hautomo_tyhja', 'laite_hautomo_kaynnissa', 'laite_hautomo_valmis']
SS = 3; mh = max(im[n].height for n in names)
strip_w = sum(im[n].width * SS + 24 for n in names) + 30
W = max(RW * S + 60, strip_w); H = RH * S + 60 + mh * SS + 70
out = Image.new('RGB', (W, H), (11, 16, 24)); d = ImageDraw.Draw(out)
d.text((30, 15), f'KOTI · TYYLITESTI 2  ·  4×4-huone {RW} px, ruutu {TW}×{TH} px (≈{meta["ppm"]:.0f} px/m), ×{S}', fill=(168, 251, 238), font=font)
big = scene.resize((RW * S, RH * S), Image.NEAREST); out.paste(big, (30, 45))
x = 30; y0 = RH * S + 60
for n in names:
    b = im[n].resize((im[n].width * SS, im[n].height * SS), Image.NEAREST)
    out.paste(b, (x, y0 + mh * SS - b.height), b)
    d.text((x, y0 + mh * SS + 8), n.replace('laite_', '').replace('sieni_', '').replace('astia_', ''), fill=(201, 188, 156), font=font)
    x += b.width + 24
out.save(OUT); scene.save(OUT.replace('.png', '_1x.png')); print(out.size)
