"""Solmu – kotipelin spritet (docs/grafiikka-koti.md).

Aja:  python3 koti.py -- <kansio> [nimi ...]     (pip install bpy, ei Blender-asennusta)
Jokaisesta spritestä tulee <nimi>_c.png (väri) ja <nimi>_id.png (ääriviivat), jotka pix.py käsittelee.

Mittakaava: lattiaruutu (1 m × 1 m) on tasan 88 × 44 px, eli noin 62 px/m.
Jokainen sprite renderöidään kiinteään kankaaseen niin, että ankkuri (ruudun keskipiste lattiatasolla)
osuu kokonaislukupikseliin ANCHORS-taulukon mukaan. Silloin spritet sopivat yhteen ilman puolikkaita pikseleitä.

Ruutukoordinaatit: huoneen ruutu (c, r), c = 0..3 vasemmalta oikealle takaseinää pitkin, r = 0..3 takaa eteen.
Maailmassa ruudun keskipiste on (-1.5 + c, 1.5 - r). Kuvassa ruudun ankkuri on huoneen ankkurista
(44 * (c - r), 22 * (c + r - 3)) pikseliä. Piirtojärjestys: c + r, pienin ensin.
"""
import bpy, math, os, sys, random
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTDIR = argv[0] if argv else os.path.expanduser('~')
ONLY = set(argv[1:])

TILE_W = 88                               # ruudun leveys pikseleinä (2× tarkkuus, näkymä 384 px)
PPM = TILE_W / (2 * math.sqrt(0.5))       # ≈ 31.11 px/m
CAM_ROT = (math.radians(60), 0, math.radians(45))

# =================== MATERIAALIT ===================
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hexc(h, a=1.0):
    h = h.lstrip('#'); return tuple(lin(int(h[i:i+2], 16) / 255) for i in (0, 2, 4)) + (a,)

MATS = {}
def mat(name, col, rough=0.8, metal=0.0, emit=None, estr=0.0, alpha=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(col); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = hexc(emit); b.inputs['Emission Strength'].default_value = estr
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    MATS[name] = m; return m

def wmat(name, c1, c2, scale=3.0, rough=0.85, metal=0.0, cut=0.5, stretch=(1, 1, 1)):
    """Kaksi väriä kohinalla (puun syy, kuluma, patina). stretch venyttää kohinaa (puun syyt)."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = stretch
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 3
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = cut - 0.08; cr.color_ramp.elements[0].color = hexc(c1)
    cr.color_ramp.elements[1].position = cut + 0.08; cr.color_ramp.elements[1].color = hexc(c2)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
    MATS[name] = m; return m

def brick(name, c1, c2, mortar, scale, size=(0.5, 0.25), mortar_size=0.03, axes='xy', offset=0.5):
    """Tiilikuvio. axes: mitkä objektin akselit ovat tiilen vaaka- ja pystysuunta ('yz' = x-normaalinen seinä)."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.9
    br = nt.nodes.new('ShaderNodeTexBrick'); br.offset = offset
    br.inputs['Color1'].default_value = hexc(c1); br.inputs['Color2'].default_value = hexc(c2)
    br.inputs['Mortar'].default_value = hexc(mortar); br.inputs['Scale'].default_value = scale
    br.inputs['Mortar Size'].default_value = mortar_size
    br.inputs['Brick Width'].default_value = size[0]; br.inputs['Row Height'].default_value = size[1]
    tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); cb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(tc.outputs['Object'], sp.inputs['Vector'])
    nt.links.new(sp.outputs[axes[0].upper()], cb.inputs['X']); nt.links.new(sp.outputs[axes[1].upper()], cb.inputs['Y'])
    nt.links.new(cb.outputs['Vector'], br.inputs['Vector']); nt.links.new(br.outputs['Color'], b.inputs['Base Color'])
    MATS[name] = m; return m

STRAIN = {   # kanta: (lakki, heltat/hehku, tumma)
    'heltta': ('#34b8ac', '#a8fbee', '#1d5c58'),
    'ruusu':  ('#c4428f', '#ffa6d6', '#5a1f4a'),
    'hamara': ('#8a4ad0', '#d6b0ff', '#3a1f5a'),
    'hoitaja':('#8fd0a0', '#e8fff0', '#2f5a3a'),
}

def M():
    return {
      'plank':   wmat('lankku', '#6a4a30', '#8f6a44', 6.0, 0.85, stretch=(1, 7, 1), cut=0.48),
      'plankD':  mat('lankkuT', '#45301f', 0.9),
      'brickL':  brick('tiiliV', '#6a4440', '#4a3330', '#22191c', 1.0, (0.24, 0.085), 0.012, 'yz'),
      'brickR':  brick('tiiliO', '#7a4438', '#5a3028', '#22191c', 1.0, (0.24, 0.085), 0.012, 'xz'),
      'wood':    wmat('puu', '#6a4a30', '#45301f', 8.0, 0.9, stretch=(1, 1, 5)),
      'woodL':   wmat('puuV', '#b88a58', '#8f6a44', 8.0, 0.8, stretch=(1, 1, 5)),
      'copper':  mat('kupari', '#d99a5b', 0.35, 1.0),
      'patina':  wmat('patina', '#a8602f', '#4f7d86', 4.0, 0.5, 0.6, 0.42),
      'iron':    mat('rauta', '#2c3a4a', 0.55, 0.7),
      'cream':   wmat('emali', '#c9bc9c', '#efe6cc', 3.0, 0.5, cut=0.45),
      'glassB':  mat('lasiTaka', '#1f2a38', 0.1, 0.0, emit='#16262e', estr=0.6),
      'glassF':  mat('lasiLuukku', '#4f7d86', 0.08, 0.0, alpha=0.1),
      'soil':    wmat('multa', '#2a1d16', '#45301f', 12.0, 1.0),
      'moss':    wmat('sammal', '#3f6a26', '#79a83a', 9.0, 1.0),
      'mossD':   mat('sammalT', '#24391c', 1.0),
      'stem':    mat('jalka', '#efe6cc', 0.7),
      'stemD':   mat('jalkaT', '#c9bc9c', 0.8),
      'sky':     mat('taivas', '#3a3a5e', 1.0, emit='#7a4a5a', estr=1.2),
      'skyT':    mat('taivasY', '#141c28', 1.0, emit='#1b2a4a', estr=1.2),
      'city':    mat('kaupunki', '#141c28', 1.0),
      'cityL':   mat('kaupunkiV', '#ffcf7a', 1.0, emit='#ffcf7a', estr=3.0),
      'door':    wmat('ovi', '#45301f', '#33242a', 5.0, 0.9, stretch=(1, 1, 6)),
      'dark':    mat('pimea', '#0b1018', 1.0),
      'ledG':    mat('ledV', '#6ae07a', 0.5, emit='#6ae07a', estr=8),
      'ledA':    mat('ledA', '#e8a02a', 0.5, emit='#ffcf7a', estr=8),
      'ledOff':  mat('ledP', '#23272a', 0.5),
      'warmIn':  mat('hautomoS', '#d99a5b', 1.0, emit='#ffb860', estr=2.2),
      'warmInA': mat('hautomoSA', '#e8a02a', 1.0, emit='#ffcf7a', estr=6.0),
      'warmOff': mat('hautomoSP', '#33242a', 1.0),
      'agar':    mat('agar', '#f3d08a', 0.4, emit='#d99a5b', estr=0.3),
      # futuristinen laboratorio
      'labtile': brick('laatta', '#46566a', '#3c4239', '#141c28', 1.0, (0.25, 0.25), 0.008, 'xy', 0.0),
      'panelL':  wmat('paneeliV', '#2c3a4a', '#1f2a38', 3.0, 0.6, 0.2, stretch=(1, 1, 0.3)),
      'panelR':  wmat('paneeliO', '#46566a', '#2c3a4a', 3.0, 0.6, 0.2, stretch=(1, 1, 0.3)),
      'panelD':  mat('paneeliT', '#23272a', 0.5, 0.4),
      'steel':   mat('teras', '#77705f', 0.35, 0.8),
      'steelD':  mat('terasT', '#2c3a4a', 0.45, 0.7),
      'rubber':  mat('kumi', '#141c28', 0.9),
      'strip':   mat('valolista', '#ffcf7a', 0.5, emit='#ffcf7a', estr=5.0),
      'tube':    mat('ravinneputki', '#5fc7d0', 0.1, emit='#1d6a78', estr=1.2),
      'screen':  mat('naytto', '#16262e', 0.3, emit='#1d6a78', estr=0.8),
      'screenL': mat('nayttoV', '#5fc7d0', 0.3, emit='#5fc7d0', estr=2.0),
      'leaf':    wmat('lehti', '#3f6a26', '#79a83a', 6.0, 0.8),
      'leafD':   mat('lehtiT', '#24391c', 0.9),
      'myc':     mat('rihmasto', '#4f7d86', 0.6, emit='#5fc7d0', estr=0.7),
      'wild':    mat('villi', '#4a3f78', 0.6, emit='#7a6cc0', estr=0.8),
      'pot':     mat('ruukku', '#a8602f', 0.8),
    }

def strain_mats(k):
    cap_c, gill_c, dark_c = STRAIN[k]
    return (mat('lakki_' + k, cap_c, 0.5, emit=cap_c, estr=1.6),
            mat('heltta_' + k, gill_c, 0.5, emit=gill_c, estr=3.0),
            mat('tumma_' + k, dark_c, 0.7))

# =================== RAKENNUSAPURIT ===================
def link(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    bpy.context.scene.collection.objects.link(o); return o

def box(loc, size, m, rot=(0, 0, 0), shadow=True):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = size; bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); o.visible_shadow = shadow; return link(o)

def cyl(loc, r, d, m, v=12, rot=(0, 0, 0), r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=d, location=loc, rotation=rot)
    o = bpy.context.object; o.data.materials.append(m); return link(o)

def sphere(loc, r, m, scale=(1, 1, 1), seg=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(4, seg // 2), radius=r, location=loc)
    o = bpy.context.object; o.scale = scale; bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); return link(o)

def rod(a, b, r, m, v=6):
    a, b = Vector(a), Vector(b); d = b - a
    o = cyl((a + b) / 2, r, d.length, m, v)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y'); return o

def cap(loc, r, h, m, droop=0.0):
    """Sienen lakki: litistetty puolipallo, reuna voi taipua alas (droop)."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=7, radius=r, location=loc)
    o = bpy.context.object
    for v in o.data.vertices:
        if v.co.z < 0: v.co.z = 0
        rr = math.hypot(v.co.x, v.co.y) / r
        v.co.z = v.co.z * h / r - droop * r * rr ** 3
    o.data.materials.append(m); return link(o)

def glow_light(loc, col, energy, size=0.1):
    L = bpy.data.lights.new('hehku', 'POINT'); L.energy = energy; L.color = hexc(col)[:3]; L.shadow_soft_size = size
    o = bpy.data.objects.new('hehku', L); o.location = loc; return link(o)

# =================== SIENET ===================
def gills(top, r, gillm, n=14):
    """Heltat: säteittäiset levyt lakin alla, näkyvät sivulta katsottuna."""
    for i in range(n):
        a = i / n * 2 * math.pi
        box((top[0] + math.cos(a) * r * 0.45, top[1] + math.sin(a) * r * 0.45, top[2] - r * 0.06),
            (r * 0.8, max(0.006, r * 0.05), r * 0.12), gillm, rot=(0, 0, a), shadow=False)

def shroom(x, y, z, h, r, k, tilt=(0, 0), light=0.0, ring=True):
    capm, gillm, darkm = strain_mats(k); m = M()
    top = (x + tilt[0] * h, y + tilt[1] * h, z + h)
    sr = max(0.012, r * 0.16)
    st = rod((x, y, z), top, sr, m['stem'], 8)
    cyl((x, y, z + sr), sr * 1.6, sr * 2, m['stemD'], 8)                                   # tyven paksunnos
    if ring and r > 0.06:
        p = 0.7; rp = (x + tilt[0] * h * p, y + tilt[1] * h * p, z + h * p)
        cyl(rp, sr * 1.9, sr * 0.8, m['stemD'], 10)                                        # rengas
    cyl((top[0], top[1], top[2] - r * 0.02), r * 0.9, r * 0.04, gillm, 16)                  # hehkuva heltta-alue
    gills(top, r, gillm, 12 if r > 0.06 else 6)
    cap(top, r, r * 0.6, capm, droop=0.35)
    if r > 0.05:   # vaaleat itiöpilkut lakin päällä
        rnd = random.Random(int(r * 1000))
        for i in range(5 if r > 0.1 else 3):
            a = rnd.random() * 6.28; d = rnd.uniform(0.25, 0.6) * r
            sphere((top[0] + math.cos(a) * d, top[1] + math.sin(a) * d, top[2] + r * 0.6 * (1 - (d / r) ** 2) * 0.95),
                   r * 0.09, gillm, seg=6)
    if light: glow_light((top[0], top[1], top[2] - r * 0.3), STRAIN[k][1], light, 0.05)

SHROOM_SCALE = 1.3   # sienet hieman liioiteltuja, jotta siluetti erottuu
def sieni_heltta(stage):
    """Siniheltta: leveälakkinen, hehkuvat heltat. Ryhmä yksi iso + pienempiä."""
    k = SHROOM_SCALE
    def sh(x, y, z, h, r, *a, **kw): shroom(x * k, y * k, z, h * k, r * k, *a, **kw)
    if stage == 'itu':
        for i, (x, y, h) in enumerate([(0, 0, 0.08), (0.07, -0.05, 0.06), (-0.06, 0.04, 0.05)]):
            sh(x, y, 0, h, 0.035, 'heltta', ring=False)
    elif stage == 'nuori':
        sh(0, 0, 0, 0.2, 0.09, 'heltta', light=2)
        sh(0.1, -0.08, 0, 0.11, 0.05, 'heltta', (0.15, -0.1))
        sh(-0.09, 0.06, 0, 0.07, 0.035, 'heltta')
    else:
        sh(0, 0.02, 0, 0.36, 0.16, 'heltta', (0.04, 0.03), light=4)
        sh(0.14, -0.12, 0, 0.2, 0.09, 'heltta', (0.22, -0.15), light=1)
        sh(-0.13, 0.1, 0, 0.14, 0.065, 'heltta', (-0.2, 0.1))
        sh(0.03, -0.17, 0, 0.08, 0.04, 'heltta')
    _, gillm, _ = strain_mats('heltta')
    rnd = random.Random(3)
    for i in range(6 if stage == 'kypsa' else 3):     # rihmaa maassa
        a = rnd.random() * 6.28; l = (0.1 + rnd.random() * 0.1) * k
        rod((0, 0, 0.004), (math.cos(a) * l, math.sin(a) * l, 0.004), 0.006, gillm, 4)

# =================== ASTIAT ===================
BASE_H = 0.26                           # terraarion jalustan korkeus
T_W, T_H = 0.74, 0.8                    # terraarion lasin leveys ja korkeus
SOIL_TOP = BASE_H + 0.12
def astia_terraario(part='taka'):
    """Laboratorioterraario: teräsjalusta näyttöineen, korkea lasi, kasvuvalo ja sumutin kannessa.
    'taka' = jalusta, multa ja takalasit; 'etu' = etukulman kehys, joka piirretään sienen päälle."""
    m = M(); w = d = T_W; h = T_H; z0 = BASE_H; t = 0.035
    if part == 'taka':
        box((0, 0, z0 / 2 + 0.03), (w + 0.04, d + 0.04, z0 - 0.06), m['steelD'])
        box((0, 0, z0 - 0.02), (w + 0.08, d + 0.08, 0.04), m['steel'])
        box((0, 0, 0.02), (w - 0.06, d - 0.06, 0.04), m['rubber'])
        box((0.08, -d / 2 - 0.025, z0 / 2), (0.34, 0.012, 0.09), m['screen'])                 # lukema-näyttö
        for i in range(4):
            box((-0.04 + i * 0.07, -d / 2 - 0.033, z0 / 2 - 0.02 + (i % 3) * 0.015), (0.04, 0.01, 0.025 + (i % 3) * 0.02), m['screenL'])
        sphere((-0.24, -d / 2 - 0.03, z0 / 2), 0.022, m['ledG'])
        box((w / 2 + 0.025, 0.1, z0 / 2), (0.012, 0.3, 0.05), m['panelD'])                   # tuuletusrako
        box((0, 0, z0 + 0.06), (w, d, 0.12), m['soil'])
        box((0, 0, z0 + 0.125), (w - 0.02, d - 0.02, 0.012), m['moss'])
        rnd = random.Random(7)
        for i in range(12):
            box((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), z0 + 0.135), (0.05, 0.05, 0.015 + rnd.random() * 0.03), m['moss'])
        for i in range(3):
            sphere((rnd.uniform(-0.3, 0.3), rnd.uniform(0.0, 0.3), z0 + 0.13), 0.03, m['steelD'], (1, 1, 0.6), 6)   # kivet
        # takalasit, etulasit jätetään pois (aukileikkaus)
        box((-w / 2, 0, z0 + h / 2), (0.01, d, h), m['glassB'])
        box((0, d / 2, z0 + h / 2), (w, 0.01, h), m['glassB'])
        for (sx, sy) in ((-1, -1), (-1, 1), (1, 1)):
            box((sx * w / 2, sy * d / 2, z0 + h / 2), (t, t, h), m['steel'])
        for z in (z0, z0 + h):
            box((-w / 2, 0, z), (t, d + t, t), m['steel']); box((0, d / 2, z), (w + t, t, t), m['steel'])
        # kansi: kasvuvalopalkki takareunassa, sumutinsuutin ja ravinneletku
        box((-w / 2 + 0.07, 0, z0 + h + 0.02), (0.1, d - 0.04, 0.05), m['steelD'])
        box((-w / 2 + 0.07, 0, z0 + h - 0.01), (0.06, d - 0.1, 0.012), mat('kasvuvalo', '#a8fbee', 0.5, emit='#5fc7d0', estr=3.0))
        box((0, d / 2 - 0.07, z0 + h + 0.02), (w - 0.04, 0.1, 0.05), m['steelD'])
        cyl((0.05, d / 2 - 0.07, z0 + h + 0.07), 0.035, 0.06, m['steel'], 10)
        rod((0.05, d / 2 - 0.07, z0 + h + 0.1), (0.05, d / 2 + 0.12, z0 + h + 0.1), 0.018, m['tube'], 8)
    else:
        box((w / 2, -d / 2, z0 + h / 2), (t, t, h), m['steel'])
        for z in (z0, z0 + h):
            box((w / 2, 0, z), (t, d + t, t), m['steel']); box((0, -d / 2, z), (w + t, t, t), m['steel'])
PLANT = {'astia_terraario': SOIL_TOP + 0.01}

# =================== LAITTEET ===================
def laite_hautomo(state='kaynnissa'):
    """Hautomo terraarion tyyliin: teräsjalusta lukemanäytöllä, tummat sivupaneelit teräskehyksessä,
    lasiluukku (-y-puoli), jonka takana lämpimässä valossa hyllyittäin agar-maljoja. Merkkivalo katolla."""
    m = M(); w, d, h = 0.66, 0.6, 0.86; z0 = BASE_H; t = 0.035
    # jalusta kuten terraariossa
    box((0, 0, z0 / 2 + 0.03), (w + 0.04, d + 0.04, z0 - 0.06), m['steelD'])
    box((0, 0, z0 - 0.02), (w + 0.08, d + 0.08, 0.04), m['steel'])
    box((0, 0, 0.02), (w - 0.06, d - 0.06, 0.04), m['rubber'])
    box((0.06, -d / 2 - 0.025, z0 / 2), (0.3, 0.012, 0.09), m['screen'])
    lit = state != 'tyhja'
    for i in range(3):
        box((-0.03 + i * 0.07, -d / 2 - 0.033, z0 / 2), (0.045, 0.01, 0.03), m['screenL'] if lit else m['panelD'])
    box((w / 2 + 0.025, 0.1, z0 / 2), (0.012, 0.3, 0.05), m['panelD'])
    # kaappi: takaseinä ja sivut tummaa paneelia, katto ja pohja
    box((0, d / 2 - 0.02, z0 + h / 2), (w, 0.04, h), m['panelL'])
    box((-w / 2 + 0.02, 0, z0 + h / 2), (0.04, d, h), m['panelL'])
    box((w / 2 - 0.02, 0, z0 + h / 2), (0.04, d, h), m['panelR'])
    for z in (0.25, 0.5, 0.75):                                          # tuuletusrivat oikealla kyljellä
        box((w / 2 + 0.002, 0.05, z0 + z * h), (0.01, d - 0.25, 0.025), m['panelD'])
    box((0, 0, z0 + 0.03), (w, d, 0.06), m['steelD'])
    box((0, 0, z0 + h - 0.04), (w, d, 0.08), m['steelD'])
    inner = {'tyhja': m['warmOff'], 'kaynnissa': m['warmIn'], 'valmis': m['warmInA']}[state]
    box((0, d / 2 - 0.045, z0 + h / 2), (w - 0.1, 0.01, h - 0.16), inner)
    if lit:
        glow_light((0, -0.05, z0 + h * 0.55), '#ffcf7a' if state == 'valmis' else '#ffb860', 6 if state == 'valmis' else 3, 0.2)
    # hyllyt ja maljat
    rnd = random.Random(5)
    cols = ['heltta', 'ruusu', 'heltta', 'hamara']
    for i, z in enumerate((0.2, 0.44, 0.68)):
        zz = z0 + z
        box((0, 0.02, zz), (w - 0.08, d - 0.1, 0.015), m['steel'])
        if not lit and i > 0: continue
        for j, x in enumerate((-0.16, 0.0, 0.16)):
            cyl((x, -0.06 + (j % 2) * 0.08, zz + 0.02), 0.065, 0.025, m['agar'], 14)
            k = cols[(i + j) % 4]; capm, gillm, _ = strain_mats(k)
            if lit:
                cyl((x + rnd.uniform(-0.02, 0.02), -0.06 + (j % 2) * 0.08, zz + 0.035), 0.035, 0.008, gillm, 10)
    # lasiluukku ja teräskehys (pystytolpat ja reunat kuten terraariossa)
    # luukun lasi jätetään pois kuten terraarion etulasit; vain ohut heijastusjuova lasin paikalla
    rod((-w / 2 + 0.1, -d / 2 + 0.005, z0 + h - 0.12), (-w / 2 + 0.22, -d / 2 + 0.005, z0 + h - 0.3), 0.008, mat('heijastus', '#9fd3d6', 0.3, emit='#9fd3d6', estr=0.6), 4)
    for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        box((sx * w / 2, sy * d / 2, z0 + h / 2), (t, t, h), m['steel'])
    for z in (z0, z0 + h):
        for sy in (-1, 1): box((0, sy * d / 2, z), (w + t, t, t), m['steel'])
        for sx in (-1, 1): box((sx * w / 2, 0, z), (t, d + t, t), m['steel'])
    box((w / 2 - 0.09, -d / 2 - 0.03, z0 + h / 2), (0.025, 0.03, 0.2), m['steelD'])      # kahva
    # kansi: merkkivalo ja kostutusletku (sama ravinneputki kuin terraariossa)
    led = {'tyhja': m['ledOff'], 'kaynnissa': m['ledG'], 'valmis': m['ledA']}[state]
    box((-w / 2 + 0.12, -d / 2 + 0.12, z0 + h + 0.03), (0.12, 0.12, 0.04), m['steelD'])
    sphere((-w / 2 + 0.12, -d / 2 + 0.12, z0 + h + 0.07), 0.04, led)
    if lit:
        glow_light((-w / 2 + 0.12, -d / 2 + 0.04, z0 + h + 0.13), '#6ae07a' if state == 'kaynnissa' else '#ffcf7a', 0.6, 0.05)
    cyl((0.12, 0.1, z0 + h + 0.05), 0.035, 0.08, m['steel'], 10)
    rod((0.12, 0.1, z0 + h + 0.09), (0.12, d / 2 + 0.12, z0 + h + 0.09), 0.018, m['tube'], 8)

# =================== TILAT ===================
ROOM_N = (4, 4)
WALL_H = 2.1
def vine(x, y, z0, length, face, seed, m):
    """Roikkuva köynnös seinän yläreunasta: lehtiä ketjussa. face = seinän normaali."""
    rnd = random.Random(seed); nx, ny = face; z = z0
    while z > z0 - length:
        o = rnd.uniform(-0.06, 0.06)
        px = x + nx * 0.07 + (o if nx == 0 else 0); py = y + ny * 0.07 + (o if ny == 0 else 0)
        s = rnd.uniform(0.04, 0.07)
        for side in (-1, 1):
            ox = side * 0.05 if nx == 0 else 0; oy = side * 0.05 if ny == 0 else 0
            sphere((px + ox, py + oy, z - (0.03 if side > 0 else 0)), s, m['leaf'] if rnd.random() < 0.7 else m['leafD'], (1.4, 1.4, 0.45), 6)
        rod((px, py, z + 0.04), (px, py, z - 0.06), 0.006, m['leafD'], 4)
        z -= s * 1.3

def tila_huone():
    """4×4-laboratorio: laattalattia, paneeliseinät, valolista, ravinneputket, tuuletin, liukuovi kellariin,
    syvä ikkuna hämärään, köynnöksiä ja nurkan lattialle levinnyt rihmasto."""
    m = M(); nx, ny = ROOM_N; hx, hy = nx / 2, ny / 2
    for c in range(nx):
        for r in range(ny):
            box((-hx + 0.5 + c, hy - 0.5 - r, -0.04), (0.99, 0.99, 0.08), m['labtile'])
    box((0, 0, -0.1), (nx, ny, 0.04), m['dark'])
    T = 0.16
    LW = box((-hx - T / 2, -T / 4, WALL_H / 2 - 0.08), (T, ny + T / 2, WALL_H + 0.16), m['panelL'], shadow=False)
    RW = box((-T / 2, hy + T / 2, WALL_H / 2 - 0.08), (nx + T, T, WALL_H + 0.16), m['panelR'], shadow=False)
    # paneelisaumat ja alalista
    for y in (-1.0, 0.0 - 0.5, 1.0):
        if abs(y - 0.2) < 0.6: continue
        box((-hx + 0.005, y, WALL_H / 2), (0.02, 0.025, WALL_H), m['panelD'], shadow=False)
    for x in (-1.0, 0.0 - 0.6, 1.6):
        box((x, hy - 0.005, WALL_H / 2), (0.025, 0.02, WALL_H), m['panelD'], shadow=False)
    box((-hx + 0.03, 0, 0.12), (0.06, ny, 0.24), m['steelD'], shadow=False)
    box((0, hy - 0.03, 0.12), (nx, 0.06, 0.24), m['steelD'], shadow=False)
    # lämmin valolista seinien yläosassa
    box((-hx + 0.05, 0, WALL_H - 0.12), (0.06, ny, 0.035), m['strip'], shadow=False)
    box((0, hy - 0.05, WALL_H - 0.12), (nx, 0.06, 0.035), m['strip'], shadow=False)
    box((-hx + 0.07, 0, WALL_H - 0.08), (0.1, ny, 0.04), m['steelD'], shadow=False)
    box((0, hy - 0.07, WALL_H - 0.08), (nx, 0.1, 0.04), m['steelD'], shadow=False)
    # leveä ikkuna oikeassa seinässä: syvä teräskarmi (3D-reunat), takana vain hämärä valo
    wx0, wx1, wz0, wz1 = -0.5, 1.6, 0.8, 1.65
    wx, ww, wz, wh = (wx0 + wx1) / 2, wx1 - wx0, (wz0 + wz1) / 2, wz1 - wz0
    D, F = 0.2, 0.1                     # karmin syvyys huoneeseen päin ja leveys
    box((wx, hy - 0.005, wz + wh * 0.2), (ww, 0.02, wh * 0.6), m['skyT'], shadow=False)        # hämärä lasi
    box((wx, hy - 0.005, wz - wh * 0.3), (ww, 0.02, wh * 0.4), m['sky'], shadow=False)
    for (cx, sx) in ((wx0 - F / 2, F), (wx1 + F / 2, F)):                                     # sivukarmit
        box((cx, hy - D / 2, wz), (sx, D, wh + 2 * F), m['steelD'], shadow=False)
    for cz in (wz0 - F / 2, wz1 + F / 2):                                                     # ala- ja yläkarmi
        box((wx, hy - D / 2, cz), (ww, D, F), m['steelD'], shadow=False)
    # sisäreunan viiste: ohut vaalea teräsreuna karmin etureunassa
    for (cx, sx) in ((wx0 - 0.015, 0.03), (wx1 + 0.015, 0.03)):
        box((cx, hy - D + 0.015, wz), (sx, 0.03, wh), m['steel'], shadow=False)
    for cz in (wz0 - 0.015, wz1 + 0.015):
        box((wx, hy - D + 0.015, cz), (ww + 0.06, 0.03, 0.03), m['steel'], shadow=False)
    for xx in (wx0 + ww / 3, wx0 + 2 * ww / 3):                                                # välipuitteet lasin pinnassa
        box((xx, hy - 0.03, wz), (0.04, 0.05, wh), m['steelD'], shadow=False)
    box((wx, hy - 0.03, wz0 + wh * 0.4), (ww, 0.05, 0.035), m['steelD'], shadow=False)
    # liukuovi kellariin vasemmassa seinässä
    dy, dw, dh = 0.2, 0.95, 1.85
    box((-hx + 0.04, dy, dh / 2 + 0.05), (0.08, dw + 0.18, dh + 0.1), m['steelD'], shadow=False)
    box((-hx + 0.07, dy, dh / 2), (0.06, dw, dh), m['panelR'], shadow=False)
    box((-hx + 0.105, dy, dh / 2), (0.02, 0.03, dh - 0.1), m['panelD'], shadow=False)        # keskisauma
    box((-hx + 0.105, dy - 0.25, 1.25), (0.02, 0.24, 0.42), m['glassB'], shadow=False)        # ikkunaviilto
    box((-hx + 0.105, dy + 0.25, 1.25), (0.02, 0.24, 0.42), m['glassB'], shadow=False)
    for z in (0.35, 0.6):
        box((-hx + 0.105, dy, z), (0.02, dw - 0.1, 0.04), mat('varoitus', '#e8a02a', 0.6), shadow=False)
    box((-hx + 0.06, dy + dw / 2 + 0.2, 1.05), (0.05, 0.12, 0.2), m['panelD'], shadow=False)  # ovipaneeli
    box((-hx + 0.09, dy + dw / 2 + 0.2, 1.08), (0.02, 0.07, 0.07), m['screenL'], shadow=False)
    box((-hx + 0.06, dy, dh + 0.2), (0.03, 0.5, 0.13), m['panelD'], shadow=False)           # KELLARI-kyltti
    box((-hx + 0.08, dy, dh + 0.2), (0.02, 0.42, 0.06), mat('kyltti', '#5fc7d0', 0.5, emit='#1d6a78', estr=1.5), shadow=False)
    # tuuletin vasemman seinän yläosassa
    fy, fz = -1.25, 1.45
    box((-hx + 0.08, fy, fz), (0.16, 0.55, 0.55), m['steelD'], shadow=False)
    cyl((-hx + 0.17, fy, fz), 0.22, 0.03, m['rubber'], 18, rot=(0, math.pi / 2, 0))
    for i in range(5):
        a = i * 2 * math.pi / 5
        box((-hx + 0.19, fy + math.cos(a) * 0.1, fz + math.sin(a) * 0.1), (0.015, 0.06, 0.18), m['steel'], rot=(a, 0, 0), shadow=False)
    cyl((-hx + 0.2, fy, fz), 0.04, 0.03, m['steel'], 10, rot=(0, math.pi / 2, 0))
    for z in (fz - 0.2, fz + 0.2):
        box((-hx + 0.18, fy, z), (0.02, 0.5, 0.02), m['steel'], shadow=False)
    # putket: kupariputki ja hehkuva ravinneputki, kaapelinippu nurkassa
    pz = WALL_H - 0.35
    rod((-hx + 0.09, -hy, pz), (-hx + 0.09, hy - 0.09, pz), 0.045, m['copper'], 10)
    rod((-hx + 0.09, hy - 0.09, pz), (hx, hy - 0.09, pz), 0.045, m['copper'], 10)
    rod((-hx + 0.09, -hy, 0.42), (-hx + 0.09, -0.4, 0.42), 0.035, m['tube'], 10)
    rod((-0.2, hy - 0.09, 0.42), (hx, hy - 0.09, 0.42), 0.035, m['tube'], 10)
    for y in (-1.6, -0.6): box((-hx + 0.05, y, 0.42), (0.1, 0.05, 0.1), m['steelD'], shadow=False)
    for x in (0.2, 1.2): box((x, hy - 0.05, 0.42), (0.05, 0.1, 0.1), m['steelD'], shadow=False)
    for i, col in enumerate(['rubber', 'rubber', 'steelD', 'pot', 'rubber']):
        rod((-hx + 0.06 + i * 0.03, hy - 0.06 - (i % 2) * 0.03, 0), (-hx + 0.06 + i * 0.03, hy - 0.06 - (i % 2) * 0.03, WALL_H), 0.018, m[col], 6)
    cyl((-hx + 0.09, hy - 0.09, pz - 0.5), 0.08, 0.14, m['patina'], 10)
    # köynnökset seinien yläreunasta
    vine(-hx, -0.7, WALL_H - 0.05, 0.9, (1, 0), 21, m); vine(-hx, -1.6, WALL_H - 0.05, 0.5, (1, 0), 22, m)
    vine(0.6, hy, WALL_H - 0.05, 0.55, (0, -1), 23, m); vine(-0.7, hy, WALL_H - 0.05, 1.0, (0, -1), 24, m)
    vine(1.85, hy, WALL_H - 0.05, 0.7, (0, -1), 25, m)
    # sammal ja hoidettu rihmasto nurkassa: vaaleat säikeet kiipeävät seinille
    rnd = random.Random(4)
    for i in range(30):
        a = rnd.random()
        box((-hx + 0.1 + rnd.random() * 0.6 * a, hy - 0.1 - rnd.random() * 0.8, 0.008), (0.07, 0.07, 0.016 + rnd.random() * 0.02), m['moss'])
    for i in range(10):
        a = rnd.uniform(-1.5, 0); l = rnd.uniform(0.3, 0.9)
        rod((-hx + 0.1, hy - 0.1, 0.005), (-hx + 0.1 + math.cos(a) * l, hy - 0.1 + math.sin(a) * l, 0.005), 0.007, m['myc'], 4)
    # huoneen oma valo (vain taustakuvaan): lämmin katosta ja viileä ikkunasta
    L = bpy.data.lights.new('katto', 'AREA'); L.energy = 70; L.size = 2.5; L.color = hexc('#f3d08a')[:3]
    lo = bpy.data.objects.new('katto', L); lo.location = (0, 0, WALL_H + 0.3); link(lo)
    L = bpy.data.lights.new('ikkuna', 'AREA'); L.energy = 50; L.size = 1.8; L.color = hexc('#7a6cc0')[:3]
    lo = bpy.data.objects.new('ikkuna', L); lo.location = (wx, hy - 0.25, wz); lo.rotation_euler = (math.radians(-90), 0, 0); link(lo)

# =================== KOHTAUS JA RENDERÖINTI ===================
def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    sc = bpy.context.scene
    w = bpy.data.worlds.new('w'); w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = hexc('#1b2a4a')
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sc.world = w
    key = bpy.data.lights.new('paavalo', 'SUN'); key.energy = 3.0; key.color = hexc('#ffc890')[:3]; key.angle = math.radians(10)
    ko = bpy.data.objects.new('paavalo', key); ko.rotation_mode = 'QUATERNION'
    ko.rotation_quaternion = Vector((0.3, -1.0, 1.3)).normalized().to_track_quat('Z', 'Y'); sc.collection.objects.link(ko)
    fill = bpy.data.lights.new('tayte', 'SUN'); fill.energy = 0.8; fill.color = hexc('#8fd0c0')[:3]
    fo = bpy.data.objects.new('tayte', fill); fo.rotation_euler = CAM_ROT; sc.collection.objects.link(fo)
    cam = bpy.data.cameras.new('kamera'); cam.type = 'ORTHO'; cam.clip_end = 1000
    co = bpy.data.objects.new('kamera', cam); co.rotation_euler = CAM_ROT; sc.collection.objects.link(co); sc.camera = co
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.filter_width = 0.01; sc.cycles.max_bounces = 5
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0.3
    sc.render.film_transparent = True
    return sc, co

def frame_anchor(sc, co, W, H, ax, ay):
    """Kangas W×H px; maailman origo osuu pikseliin (ax, ay)."""
    R = co.rotation_euler.to_matrix()
    cx = (W / 2 - ax) / PPM; cy = -(H / 2 - ay) / PPM
    co.location = R @ Vector((cx, cy, 200))
    sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
    co.data.ortho_scale = max(W, H) / PPM

def render_pair(sc, path, samples=96):
    sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.render.filepath = path + '_c.png'; bpy.ops.render.render(write_still=True)
    m = bpy.data.materials.new('id'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    oi = nt.nodes.new('ShaderNodeObjectInfo'); em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(oi.outputs['Random'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    vl = bpy.context.view_layer; vl.material_override = m
    lights = [o for o in sc.objects if o.type == 'LIGHT']
    for o in lights: o.hide_render = True
    bg = sc.world.node_tree.nodes['Background'].inputs['Strength']; old = bg.default_value; bg.default_value = 0
    sc.cycles.samples = 1; sc.cycles.use_denoising = False; mb = sc.cycles.max_bounces; sc.cycles.max_bounces = 0
    sc.render.filepath = path + '_id.png'; bpy.ops.render.render(write_still=True)
    vl.material_override = None
    for o in lights: o.hide_render = False
    bg.default_value = old; sc.cycles.max_bounces = mb

# nimi: (rakentaja, kangas W, H, ankkuri ax, ay)
SPRITES = {
    'tila_huone':               (tila_huone, 384, 320, 192, 226),
    'astia_terraario':          (lambda: astia_terraario('taka'), 96, 160, 48, 136),
    'astia_terraario_etu':      (lambda: astia_terraario('etu'), 96, 160, 48, 136),
    'sieni_heltta_itu':         (lambda: sieni_heltta('itu'), 48, 48, 24, 36),
    'sieni_heltta_nuori':       (lambda: sieni_heltta('nuori'), 64, 64, 32, 48),
    'sieni_heltta_kypsa':       (lambda: sieni_heltta('kypsa'), 80, 88, 40, 68),
    'laite_hautomo_tyhja':      (lambda: laite_hautomo('tyhja'), 96, 144, 48, 120),
    'laite_hautomo_kaynnissa':  (lambda: laite_hautomo('kaynnissa'), 96, 144, 48, 120),
    'laite_hautomo_valmis':     (lambda: laite_hautomo('valmis'), 96, 144, 48, 120),
}

if __name__ == '__main__' or argv:
    import json
    os.makedirs(OUTDIR, exist_ok=True)
    meta = {'tile': [TILE_W, TILE_W // 2], 'ppm': PPM,
            'plant_dy': {k: round(z * math.sin(math.radians(60)) * PPM) for k, z in PLANT.items()},
            'sprites': {n: {'w': W, 'h': H, 'ax': ax, 'ay': ay} for n, (_, W, H, ax, ay) in SPRITES.items()}}
    json.dump(meta, open(os.path.join(OUTDIR, 'koti.json'), 'w'), indent=1)
    for name, (fn, W, H, ax, ay) in SPRITES.items():
        if ONLY and name not in ONLY: continue
        sc, co = setup_scene(); fn()
        frame_anchor(sc, co, W, H, ax, ay)
        render_pair(sc, os.path.join(OUTDIR, name), 192 if name.startswith('tila') else 96)
        print('VALMIS', name, W, H)
