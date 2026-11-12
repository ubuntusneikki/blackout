"""Solmu – kotipelin spritet (docs/grafiikka-koti.md).

Aja:  python3 koti.py -- <kansio> [nimi ...]     (pip install bpy, ei Blender-asennusta)
Jokaisesta spritestä tulee <nimi>_c.png (väri) ja <nimi>_id.png (ääriviivat), jotka pix.py käsittelee.

Mittakaava: lattiaruutu (1 m × 1 m) on tasan 44 × 22 px, eli noin 31 px/m.
Jokainen sprite renderöidään kiinteään kankaaseen niin, että ankkuri (ruudun keskipiste lattiatasolla)
osuu kokonaislukupikseliin ANCHORS-taulukon mukaan. Silloin spritet sopivat yhteen ilman puolikkaita pikseleitä.

Ruutukoordinaatit: huoneen ruutu (c, r), c = 0..3 vasemmalta oikealle takaseinää pitkin, r = 0..3 takaa eteen.
Maailmassa ruudun keskipiste on (-1.5 + c, 1.5 - r). Kuvassa ruudun ankkuri on huoneen ankkurista
(22 * (c - r), 11 * (c + r - 3)) pikseliä. Piirtojärjestys: c + r, pienin ensin.
"""
import bpy, math, os, sys, random
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTDIR = argv[0] if argv else os.path.expanduser('~')
ONLY = set(argv[1:])

TILE_W = 44                               # ruudun leveys pikseleinä
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

def brick(name, c1, c2, mortar, scale, size=(0.5, 0.25), mortar_size=0.03, axes='xy'):
    """Tiilikuvio. axes: mitkä objektin akselit ovat tiilen vaaka- ja pystysuunta ('yz' = x-normaalinen seinä)."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.9
    br = nt.nodes.new('ShaderNodeTexBrick')
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
      'glassB':  mat('lasiTaka', '#4f7d86', 0.1, 0.0, emit='#1d6a78', estr=0.5),
      'glassF':  mat('lasiLuukku', '#4f7d86', 0.08, 0.0, alpha=0.25),
      'soil':    wmat('multa', '#2a1d16', '#45301f', 12.0, 1.0),
      'moss':    wmat('sammal', '#3f6a26', '#79a83a', 9.0, 1.0),
      'mossD':   mat('sammalT', '#24391c', 1.0),
      'stem':    mat('jalka', '#efe6cc', 0.7),
      'stemD':   mat('jalkaT', '#c9bc9c', 0.8),
      'sky':     mat('taivas', '#7a4a5a', 1.0, emit='#d9845a', estr=1.4),
      'skyT':    mat('taivasY', '#1b2a4a', 1.0, emit='#3a3a5e', estr=1.4),
      'city':    mat('kaupunki', '#141c28', 1.0),
      'cityL':   mat('kaupunkiV', '#ffcf7a', 1.0, emit='#ffcf7a', estr=3.0),
      'door':    wmat('ovi', '#45301f', '#33242a', 5.0, 0.9, stretch=(1, 1, 6)),
      'dark':    mat('pimea', '#0b1018', 1.0),
      'ledG':    mat('ledV', '#6ae07a', 0.5, emit='#6ae07a', estr=8),
      'ledA':    mat('ledA', '#e8a02a', 0.5, emit='#ffcf7a', estr=8),
      'ledOff':  mat('ledP', '#23272a', 0.5),
      'warmIn':  mat('hautomoS', '#d99a5b', 1.0, emit='#ffb860', estr=1.6),
      'warmInA': mat('hautomoSA', '#e8a02a', 1.0, emit='#ffcf7a', estr=3.5),
      'warmOff': mat('hautomoSP', '#33242a', 1.0),
      'agar':    mat('agar', '#f3d08a', 0.4, emit='#d99a5b', estr=0.3),
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
def shroom(x, y, z, h, r, k, tilt=(0, 0), light=0.0):
    capm, gillm, darkm = strain_mats(k)
    top = (x + tilt[0] * h, y + tilt[1] * h, z + h)
    rod((x, y, z), top, max(0.014, r * 0.17), MATS.get('jalka') or M()['stem'], 8)
    cap(top, r, r * 0.55, capm, droop=0.25)
    # hehkuvat heltat: ohut levy lakin alla
    cyl((top[0], top[1], top[2] - r * 0.06), r * 0.86, r * 0.05, gillm, 14)
    if light: glow_light((top[0], top[1], top[2] + r * 0.2), STRAIN[k][1], light)

SHROOM_SCALE = 1.6   # sienet liioitellaan, jotta siluetti erottuu pienessä koossa
def sieni_heltta(stage):
    """Siniheltta: leveälakkinen, hehkuvat heltat. Ryhmä yksi iso + kaksi pientä."""
    k = SHROOM_SCALE
    def sh(x, y, z, h, r, *a, **kw): shroom(x * k, y * k, z, h * k, r * k, *a, **kw)
    if stage == 'itu':
        for i, (x, y, h) in enumerate([(0, 0, 0.07), (0.07, -0.05, 0.05), (-0.06, 0.04, 0.04)]):
            sh(x, y, 0, h, 0.03, 'heltta')
    elif stage == 'nuori':
        sh(0, 0, 0, 0.17, 0.08, 'heltta', light=4)
        sh(0.1, -0.08, 0, 0.09, 0.045, 'heltta', (0.15, -0.1))
        sh(-0.09, 0.06, 0, 0.06, 0.03, 'heltta')
    else:
        sh(0, 0, 0, 0.34, 0.16, 'heltta', (0.05, 0.03), light=10)
        sh(0.13, -0.11, 0, 0.18, 0.085, 'heltta', (0.25, -0.15), light=3)
        sh(-0.12, 0.1, 0, 0.12, 0.055, 'heltta', (-0.2, 0.1))
        sh(0.02, 0.15, 0, 0.07, 0.035, 'heltta')
    # rihmaa maassa
    _, gillm, _ = strain_mats('heltta')
    rnd = random.Random(3)
    for i in range(5 if stage == 'kypsa' else 2):
        a = rnd.random() * 6.28; l = (0.08 + rnd.random() * 0.08) * k
        rod((0, 0, 0.004), (math.cos(a) * l, math.sin(a) * l, 0.004), 0.006, gillm, 4)

# =================== ASTIAT ===================
STAND_H = 0.42      # terraarion jalustan korkeus
def stand(w, d, h):
    m = M()
    box((0, 0, h - 0.03), (w, d, 0.06), m['woodL'])
    for sx in (-1, 1):
        for sy in (-1, 1):
            box((sx * (w / 2 - 0.04), sy * (d / 2 - 0.04), (h - 0.06) / 2), (0.05, 0.05, h - 0.06), m['wood'])
    box((0, 0, 0.1), (w - 0.08, d - 0.08, 0.025), m['wood'])        # alataso

def astia_terraario(part='taka'):
    """Terraario jalustalla. 'taka' = jalusta, pohja ja takalasit; 'etu' = etukulman kehys sienen päälle."""
    m = M(); w, d, h = 0.66, 0.66, 0.56; z0 = STAND_H; t = 0.03
    if part == 'taka':
        stand(0.72, 0.72, STAND_H)
        box((0, 0, z0 + 0.05), (w, d, 0.1), m['soil'])
        box((0, 0, z0 + 0.105), (w - 0.02, d - 0.02, 0.012), m['moss'])
        rnd = random.Random(7)
        for i in range(9):
            box((rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), z0 + 0.12), (0.06, 0.06, 0.02 + rnd.random() * 0.03), m['moss'])
        # takalasit (taaimmat kaksi seinää), etulasit jätetään pois: aukileikkaus
        box((-w / 2, 0, z0 + h / 2), (0.01, d, h), m['glassB'])
        box((0, d / 2, z0 + h / 2), (w, 0.01, h), m['glassB'])
        for (sx, sy) in ((-1, -1), (-1, 1), (1, 1)):
            box((sx * w / 2, sy * d / 2, z0 + h / 2), (t, t, h + t), m['copper'])
        for z in (z0, z0 + h):
            box((-w / 2, 0, z), (t, d + t, t), m['copper']); box((0, d / 2, z), (w + t, t, t), m['copper'])
        rod((0, d / 2, z0 + h), (0, d / 2 - 0.2, z0 + h + 0.12), 0.012, m['copper'])   # sumutinputki
        cyl((0, d / 2 - 0.22, z0 + h + 0.12), 0.03, 0.04, m['copper'])
    else:
        box((w / 2, -d / 2, z0 + h / 2), (t, t, h + t), m['copper'])
        for z in (z0, z0 + h):
            box((w / 2, 0, z), (t, d + t, t), m['copper']); box((0, -d / 2, z), (w + t, t, t), m['copper'])
PLANT = {'astia_terraario': (0, 0, STAND_H + 0.11)}

# =================== LAITTEET ===================
def laite_hautomo(state='kaynnissa'):
    """Hautomo: lämmin emalikaappi, lasiluukku, sisällä hyllyillä agar-maljoja, merivihreä merkkivalo."""
    m = M(); w, d, h = 0.62, 0.56, 0.98; z0 = 0.08
    for sx in (-1, 1):
        for sy in (-1, 1): box((sx * (w / 2 - 0.05), sy * (d / 2 - 0.05), z0 / 2), (0.05, 0.05, z0), m['iron'])
    # runko: takaseinä, sivut, katto, pohja (luukku -y-puolella)
    box((0, d / 2 - 0.02, z0 + h / 2), (w, 0.04, h), m['cream'])
    box((-w / 2 + 0.02, 0, z0 + h / 2), (0.04, d, h), m['cream'])
    box((w / 2 - 0.02, 0, z0 + h / 2), (0.04, d, h), m['cream'])
    box((0, 0, z0 + 0.03), (w, d, 0.06), m['cream'])
    box((0, 0, z0 + h - 0.06), (w, d, 0.12), m['cream'])
    box((0, 0, z0 + h + 0.01), (w + 0.03, d + 0.03, 0.03), m['copper'])
    inner = {'tyhja': m['warmOff'], 'kaynnissa': m['warmIn'], 'valmis': m['warmInA']}[state]
    box((0, d / 2 - 0.045, z0 + h / 2), (w - 0.1, 0.01, h - 0.2), inner)
    if state != 'tyhja':
        glow_light((0, -0.05, z0 + h * 0.55), '#ffcf7a' if state == 'valmis' else '#ffb860', 6 if state == 'valmis' else 3, 0.2)
    # hyllyt ja maljat
    rnd = random.Random(5)
    cols = ['heltta', 'ruusu', 'heltta', 'hamara']
    for i, z in enumerate((0.3, 0.56, 0.82)):
        zz = z0 + z
        box((0, 0.02, zz), (w - 0.08, d - 0.1, 0.015), m['copper'])
        if state == 'tyhja' and i > 0: continue
        for j, x in enumerate((-0.15, 0.0, 0.15)):
            cyl((x, -0.06 + (j % 2) * 0.08, zz + 0.02), 0.065, 0.025, m['agar'], 14)
            k = cols[(i + j) % 4]; capm, gillm, _ = strain_mats(k)
            if state != 'tyhja':
                cyl((x + rnd.uniform(-0.02, 0.02), -0.06 + (j % 2) * 0.08, zz + 0.035), 0.035, 0.008, gillm, 10)
    # lasiluukku ja sen kehys
    box((0, -d / 2 + 0.01, z0 + h / 2 - 0.03), (w - 0.06, 0.012, h - 0.2), m['glassF'], shadow=False)
    for x in (-w / 2 + 0.03, w / 2 - 0.03):
        box((x, -d / 2, z0 + h / 2 - 0.03), (0.06, 0.03, h - 0.14), m['copper'])
    for z in (z0 + 0.09, z0 + h - 0.1):
        box((0, -d / 2, z), (w, 0.03, 0.05), m['copper'])
    box((w / 2 - 0.1, -d / 2 - 0.03, z0 + h / 2), (0.03, 0.03, 0.16), m['iron'])        # kahva
    # merkkivalo ja lämpömittari katolla
    led = {'tyhja': m['ledOff'], 'kaynnissa': m['ledG'], 'valmis': m['ledA']}[state]
    sphere((-w / 2 + 0.12, -d / 2 + 0.1, z0 + h + 0.06), 0.045, led)
    if state != 'tyhja':
        glow_light((-w / 2 + 0.12, -d / 2 + 0.02, z0 + h + 0.12), '#6ae07a' if state == 'kaynnissa' else '#ffcf7a', 0.6, 0.05)
    cyl((0.1, 0.08, z0 + h + 0.1), 0.035, 0.16, m['copper'], 10)                         # ilmaputki
    rod((0.1, 0.08, z0 + h + 0.18), (0.1, d / 2 + 0.05, z0 + h + 0.18), 0.02, m['copper'])

# =================== TILAT ===================
ROOM_N = (4, 4)
WALL_H = 2.1
def tila_huone():
    """4×4-huone: lautalattia ruuduittain, kaksi tiiliseinää, ikkuna iltakaupunkiin, ovi kellariin, kupariputki."""
    m = M(); nx, ny = ROOM_N; hx, hy = nx / 2, ny / 2
    for c in range(nx):
        for r in range(ny):
            box((-hx + 0.5 + c, hy - 0.5 - r, -0.04), (0.985, 0.985, 0.08), m['plank'])
    box((0, 0, -0.1), (nx, ny, 0.04), m['dark'])      # rakojen pohja
    # seinät (eivät varjosta lattiaa, jotta erikseen renderöidyt spritet sopivat valaistukseen)
    T = 0.14
    box((-hx - T / 2, -T / 4, WALL_H / 2 - 0.08), (T, ny + T / 2, WALL_H + 0.16), m['brickL'], shadow=False)
    box((-T / 2, hy + T / 2, WALL_H / 2 - 0.08), (nx + T, T, WALL_H + 0.16), m['brickR'], shadow=False)
    # jalkalistat
    box((-hx + 0.02, 0, 0.06), (0.04, ny, 0.12), m['woodL'], shadow=False)
    box((0, hy - 0.02, 0.06), (nx, 0.04, 0.12), m['woodL'], shadow=False)
    # ikkuna oikeassa takaseinässä (y = hy)
    wx, wz, ww, wh = 0.7, 1.25, 1.2, 0.9
    box((wx, hy - 0.03, wz), (ww + 0.12, 0.08, wh + 0.12), m['woodL'], shadow=False)
    box((wx, hy - 0.05, wz + wh * 0.15), (ww, 0.08, wh * 0.7), m['skyT'], shadow=False)
    box((wx, hy - 0.05, wz - wh * 0.32), (ww, 0.08, wh * 0.3), m['sky'], shadow=False)
    rnd = random.Random(11)
    x = wx - ww / 2 + 0.05
    while x < wx + ww / 2 - 0.08:
        bw = rnd.uniform(0.1, 0.2); bh = rnd.uniform(0.15, 0.45)
        box((x + bw / 2, hy - 0.1, wz - wh / 2 + bh / 2), (bw, 0.02, bh), m['city'], shadow=False)
        for k in range(int(bh / 0.09)):
            if rnd.random() < 0.35:
                box((x + bw / 2 + rnd.uniform(-bw / 3, bw / 3), hy - 0.115, wz - wh / 2 + 0.05 + k * 0.09), (0.025, 0.01, 0.025), m['cityL'], shadow=False)
        x += bw + 0.01
    box((wx, hy - 0.12, wz), (0.04, 0.04, wh), m['woodL'], shadow=False)          # ikkunapuitteet
    box((wx, hy - 0.12, wz + 0.1), (ww, 0.04, 0.04), m['woodL'], shadow=False)
    box((wx, hy - 0.16, wz - wh / 2 - 0.05), (ww + 0.2, 0.14, 0.05), m['woodL'], shadow=False)   # ikkunalauta
    # ovi kellariin vasemmassa takaseinässä (x = -hx)
    dy, dw, dh = 0.2, 0.9, 1.8
    box((-hx + 0.03, dy, dh / 2 + 0.04), (0.06, dw + 0.12, dh + 0.08), m['woodL'], shadow=False)
    box((-hx + 0.05, dy, dh / 2), (0.06, dw, dh), m['door'], shadow=False)
    for z in (0.45, 1.35):
        box((-hx + 0.085, dy, z), (0.02, dw - 0.1, 0.06), m['iron'], shadow=False)
    sphere((-hx + 0.11, dy - dw / 2 + 0.12, 0.95), 0.035, m['copper'])
    box((-hx + 0.04, dy, dh + 0.18), (0.03, 0.42, 0.14), m['iron'], shadow=False)    # kyltti
    box((-hx + 0.06, dy, dh + 0.18), (0.02, 0.34, 0.07), mat('kyltti', '#5fc7d0', 0.5, emit='#1d6a78', estr=1.5), shadow=False)
    # kupariputki seinien yläreunassa ja pystyputki nurkassa
    pz = WALL_H - 0.25
    rod((-hx + 0.08, -hy, pz), (-hx + 0.08, hy - 0.08, pz), 0.045, m['copper'], 10)
    rod((-hx + 0.08, hy - 0.08, pz), (hx, hy - 0.08, pz), 0.045, m['copper'], 10)
    rod((-hx + 0.08, hy - 0.08, 0), (-hx + 0.08, hy - 0.08, pz), 0.045, m['copper'], 10)
    for y in (-1.3, 1.0): box((-hx + 0.04, y, pz), (0.08, 0.05, 0.12), m['iron'], shadow=False)
    for x in (-0.9, 1.5): box((x, hy - 0.04, pz), (0.05, 0.08, 0.12), m['iron'], shadow=False)
    cyl((-hx + 0.08, hy - 0.08, pz - 0.6), 0.07, 0.12, m['patina'], 10)            # venttiili
    # sammalta nurkassa ja seinän juurella
    rnd = random.Random(4)
    for i in range(26):
        a = rnd.random()
        box((-hx + 0.08 + rnd.random() * 0.5 * a, hy - 0.08 - rnd.random() * 0.7, 0.005), (0.07, 0.07, 0.015 + rnd.random() * 0.02), m['moss'])
    for i in range(10):
        box((-hx + 0.005, hy - 0.2 - rnd.random() * 0.4, rnd.random() * 0.45), (0.02, 0.08, 0.07), m['moss'], shadow=False)

# =================== KOHTAUS JA RENDERÖINTI ===================
def setup_scene(interior=1.0):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    sc = bpy.context.scene
    w = bpy.data.worlds.new('w'); w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = hexc('#1b2a4a')
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sc.world = w
    # lämmin päävalo vasemmalta ylhäältä (kuvassa vasemmalla on maailman -y-suunta)
    key = bpy.data.lights.new('paavalo', 'SUN'); key.energy = 3.0; key.color = hexc('#ffc890')[:3]; key.angle = math.radians(10)
    ko = bpy.data.objects.new('paavalo', key); ko.rotation_mode = 'QUATERNION'
    ko.rotation_quaternion = Vector((0.3, -1.0, 1.3)).normalized().to_track_quat('Z', 'Y'); sc.collection.objects.link(ko)
    # viileä täyttövalo kamerasta päin
    fill = bpy.data.lights.new('tayte', 'SUN'); fill.energy = 0.7; fill.color = hexc('#8fb0d0')[:3]
    fo = bpy.data.objects.new('tayte', fill); fo.rotation_euler = CAM_ROT; sc.collection.objects.link(fo)
    cam = bpy.data.cameras.new('kamera'); cam.type = 'ORTHO'; cam.clip_end = 1000
    co = bpy.data.objects.new('kamera', cam); co.rotation_euler = CAM_ROT; sc.collection.objects.link(co); sc.camera = co
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.filter_width = 0.01; sc.cycles.max_bounces = 5
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0.3
    sc.render.film_transparent = True
    return sc, co

def frame_anchor(sc, co, W, H, ax, ay):
    """Kangas W×H px; maailman origo osuu pikseliin (ax, ay) (vasen yläkulma = 0,0, pikselin vasen yläreuna)."""
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
    'tila_huone':               (tila_huone, 192, 168, 96, 118),
    'astia_terraario':          (lambda: astia_terraario('taka'), 48, 72, 24, 60),
    'astia_terraario_etu':      (lambda: astia_terraario('etu'), 48, 72, 24, 60),
    'sieni_heltta_itu':         (lambda: sieni_heltta('itu'), 24, 24, 12, 18),
    'sieni_heltta_nuori':       (lambda: sieni_heltta('nuori'), 32, 32, 16, 24),
    'sieni_heltta_kypsa':       (lambda: sieni_heltta('kypsa'), 40, 40, 20, 30),
    'laite_hautomo_tyhja':      (lambda: laite_hautomo('tyhja'), 48, 72, 24, 60),
    'laite_hautomo_kaynnissa':  (lambda: laite_hautomo('kaynnissa'), 48, 72, 24, 60),
    'laite_hautomo_valmis':     (lambda: laite_hautomo('valmis'), 48, 72, 24, 60),
}

if __name__ == '__main__' or argv:
    os.makedirs(OUTDIR, exist_ok=True)
    for name, (fn, W, H, ax, ay) in SPRITES.items():
        if ONLY and name not in ONLY: continue
        sc, co = setup_scene(); fn()
        frame_anchor(sc, co, W, H, ax, ay)
        render_pair(sc, os.path.join(OUTDIR, name), 160 if name.startswith('tila') else 96)
        print('VALMIS', name, W, H)
