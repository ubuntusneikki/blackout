"""Kotipelin sprite-atlas ja esikatselu.
Aja:  python3 koti_atlas.py <render-kansio> <atlas-kansio> [esikatselu.png]
Lukee koti.py:n renderöinnit ja koti.json-tiedoston, ajaa ne pix.py:n läpi (paletti, ääriviivat),
rajaa läpinäkyvät reunat pois ja pakkaa yhdeksi kuvaksi:
  <atlas-kansio>/atlas.png
  <atlas-kansio>/atlas.json  { "meta": {...}, "sprites": { nimi: {x, y, w, h, ax, ay, [plant:{x,y}]} } }
ax, ay = ankkuri spriten vasemmasta yläkulmasta (ruudun keskipiste lattiatasolla, sienellä tyvi).
plant = astian kohta, johon sieni piirretään (sienen ankkuri osuu siihen)."""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
from pix import process

D = sys.argv[1].rstrip('/') + '/'; OUT = sys.argv[2]; PREV = sys.argv[3] if len(sys.argv) > 3 else None
meta = json.load(open(D + 'koti.json'))
os.makedirs(OUT, exist_ok=True)

# --- käsittele ja rajaa
spr = {}
for n, s in meta['sprites'].items():
    im = process(D + n + '_c.png', D + n + '_id.png')
    bb = im.getbbox() or (0, 0, 1, 1)
    ax, ay = (s['ax'], s['ay']) if s['ax'] is not None else (s['w'] // 2, s['h'] // 2)
    if n.startswith('tila_') or n.startswith('ikoni_'): bb = (0, 0, im.width, im.height)   # tilat ja kuvakkeet täysikokoisina
    spr[n] = {'im': im.crop(bb), 'ax': ax - bb[0], 'ay': ay - bb[1]}
    if n in ('astia_terraario', 'astia_lasipurkki'):
        spr[n]['plant'] = {'x': spr[n]['ax'], 'y': spr[n]['ay'] - meta['plant_dy'][n]}

# --- hyllypakkaus: korkeimmat ensin, leveys 1024
W = 1024; x = y = rowh = 0; order = sorted(spr, key=lambda n: (-spr[n]['im'].height, n))
for n in order:
    im = spr[n]['im']
    if x + im.width > W: x = 0; y += rowh + 1; rowh = 0
    spr[n]['x'], spr[n]['y'] = x, y; x += im.width + 1; rowh = max(rowh, im.height)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for n in order: atlas.paste(spr[n]['im'], (spr[n]['x'], spr[n]['y']))
atlas.save(os.path.join(OUT, 'atlas.png'), optimize=True)
out = {'meta': {k: meta[k] for k in ('tile', 'rooms', 'kannat', 'tuotteet')},
       'sprites': {n: {k: v for k, v in spr[n].items() if k != 'im'} | {'w': spr[n]['im'].width, 'h': spr[n]['im'].height}
                   for n in sorted(spr)}}
json.dump(out, open(os.path.join(OUT, 'atlas.json'), 'w'), indent=1, ensure_ascii=False)
print('atlas', W, H, len(spr), 'spriteä')

if not PREV: sys.exit()
# --- esikatselu: kaksi koottua tilaa + kaikki spritet nimettyinä
def put(cv, n, px, py):
    s = spr[n]; cv.alpha_composite(s['im'], (px - s['ax'], py - s['ay']))

def room(name, items):
    r = meta['rooms'][name]; s = spr[name]
    cv = Image.new('RGBA', (s['im'].width, s['im'].height), (11, 16, 24, 255)); put(cv, name, s['ax'], s['ay'])
    for c, rr, obj, plant in sorted(items, key=lambda v: v[0] + v[1]):
        px = s['ax'] + r['tile0'][0] + c * r['dc'][0] + rr * r['dr'][0]
        py = s['ay'] + r['tile0'][1] + c * r['dc'][1] + rr * r['dr'][1]
        put(cv, obj, px, py)
        if plant:
            p = spr[obj]['plant']; put(cv, plant, px - spr[obj]['ax'] + p['x'], py - spr[obj]['ay'] + p['y'])
            put(cv, obj + '_etu', px, py)
    return cv

huone = room('tila_huone', [(3, 0, 'astia_terraario', 'sieni_heltta_kypsa'), (2, 0, 'astia_lasipurkki', 'sieni_ruusu_kypsa'),
                            (0, 3, 'laite_hautomo_valmis', None), (2, 2, 'laite_kehikko_valokalvo_valmis', None),
                            (1, 1, 'astia_lasipurkki', 'sieni_hoitaja_kypsa'), (3, 2, 'astia_terraario', 'sieni_hamara_nuori')])
kellari = room('tila_kellari', [(1, 0, 'astia_lasipurkki', 'sieni_kalvo_kypsa'), (2, 0, 'astia_terraario', 'sieni_hoitaja_kypsa'),
                                (3, 0, 'astia_lasipurkki', 'sieni_kalvo_nuori'), (2, 1, 'laite_kehikko_suodatin_kasvaa_2', None),
                                (1, 2, 'laite_kehikko_lamporihma_valmis', None)])
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 15)
except Exception: font = ImageFont.load_default()
S = 2; bg = (11, 16, 24)
top = Image.new('RGB', (huone.width * S + kellari.width * S + 90, max(huone.height, kellari.height) * S + 70), bg)
d = ImageDraw.Draw(top); d.text((30, 15), 'KOTI V1 · ATLAS  ·  huone 4×4 ja kellari 4×3, ruutu %d×%d px, ×%d' % (*meta['tile'], S), fill=(168, 251, 238), font=font)
top.paste(huone.resize((huone.width * S, huone.height * S), Image.NEAREST), (30, 50))
top.paste(kellari.resize((kellari.width * S, kellari.height * S), Image.NEAREST), (huone.width * S + 60, 50))
# ruudukko kaikista spriteistä (ei tiloja)
names = [n for n in sorted(spr) if not n.startswith('tila_')]
cells = []; GW = top.width - 60; xx = 30; yy = 0; rowh = 0; rows = []
for n in names:
    sc = 3 if n.startswith('ikoni_') else 2
    im = spr[n]['im']; lab = n.replace('laite_', '').replace('sieni_', '').replace('astia_', '').replace('ikoni_', 'ik_')
    w, h = max(im.width * sc, len(lab) * 9 + 6), im.height * sc + 22
    if xx + w > GW: rows.append(rowh); xx = 30; yy += rowh + 14; rowh = 0
    cells.append((n, sc, xx, yy, w, h)); xx += w + 12; rowh = max(rowh, h)
grid = Image.new('RGB', (top.width, yy + rowh + 30), bg); g = ImageDraw.Draw(grid)
for n, sc, x0, y0, w, h in cells:
    im = spr[n]['im'].resize((spr[n]['im'].width * sc, spr[n]['im'].height * sc), Image.NEAREST)
    grid.paste(im, (x0, y0 + h - 22 - im.height), im)
    g.text((x0, y0 + h - 18), n.replace('laite_', '').replace('sieni_', '').replace('astia_', '').replace('ikoni_', 'ik_'), fill=(201, 188, 156), font=font)
prev = Image.new('RGB', (top.width, top.height + grid.height), bg); prev.paste(top, (0, 0)); prev.paste(grid, (0, top.height))
prev.save(PREV); print('esikatselu', prev.size)
