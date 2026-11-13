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

STRAIN = {   # kanta: (lakki, heltat/hehku, tumma). Uusi kanta: lisää värit tähän ja rivi KANNAT-taulukkoon.
    'heltta': ('#34b8ac', '#a8fbee', '#1d5c58'),
    'ruusu':  ('#c4428f', '#ffa6d6', '#5a1f4a'),
    'hamara': ('#8a4ad0', '#d6b0ff', '#3a1f5a'),
    'kalvo':  ('#9fd3d6', '#ffa6d6', '#2d4a55'),
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
      'ledG':    mat('kuplaT', '#5fc7d0', 0.5, emit='#5fc7d0', estr=4),   # elävä merkki: teal itiökupla (ei myrkynvihreää)
      'ledA':    mat('ledA', '#e8a02a', 0.5, emit='#ffcf7a', estr=8),
      'ledOff':  mat('ledP', '#23272a', 0.5),
      'warmIn':  mat('hautomoS', '#6a4a30', 1.0, emit='#45301f', estr=0.8),   # käynnissä: himmeä, maljojen kannan värit näkyvät
      'warmInA': mat('hautomoSA', '#e8a02a', 1.0, emit='#ffcf7a', estr=6.0),
      'warmOff': mat('hautomoSP', '#33242a', 1.0),
      'agar':    mat('agar', '#8a7d68', 0.4),
      # futuristinen laboratorio
      'labtile': brick('laatta', '#46566a', '#3c4239', '#141c28', 1.0, (0.25, 0.25), 0.008, 'xy', 0.0),
      'panelL':  wmat('paneeliV', '#2c3a4a', '#1f2a38', 3.0, 0.6, 0.2, stretch=(1, 1, 0.3)),
      'panelR':  wmat('paneeliO', '#46566a', '#2c3a4a', 3.0, 0.6, 0.2, stretch=(1, 1, 0.3)),
      'panelD':  mat('paneeliT', '#23272a', 0.5, 0.4),
      'steel':   mat('teras', '#77705f', 0.35, 0.8),
      'steelD':  mat('terasT', '#2c3a4a', 0.45, 0.7),
      'rubber':  mat('kumi', '#141c28', 0.9),
      'strip':   mat('valolista', '#d99a5b', 0.5, emit='#d99a5b', estr=4.0),   # tunnelmavalo keskisävyssä
      'tube':    mat('ravinneputki', '#1d6a78', 0.1, emit='#1d6a78', estr=0.9),   # hillitty teal-neste
      'screen':  mat('naytto', '#16262e', 0.3, emit='#1d6a78', estr=0.8),
      'screenL': mat('nayttoV', '#5fc7d0', 0.3, emit='#5fc7d0', estr=2.0),
      'leaf':    wmat('lehti', '#3f6a26', '#79a83a', 6.0, 0.8),
      'leafD':   mat('lehtiT', '#24391c', 0.9),
      'myc':     mat('rihmasto', '#4f7d86', 0.6, emit='#5fc7d0', estr=0.7),
      'wild':    mat('villi', '#4a3f78', 0.6, emit='#7a6cc0', estr=0.8),
      'pot':     mat('ruukku', '#a8602f', 0.8),
    }

CAP_GLOW = {'kalvo': 0.4, 'hoitaja': 0.4}   # vaaleat lakit hehkuvat vähemmän, jotta väri ei puhkea valkoiseksi
def strain_mats(k):
    cap_c, gill_c, dark_c = STRAIN[k]
    return (mat('lakki_' + k, cap_c, 0.5, emit=cap_c, estr=CAP_GLOW.get(k, 1.6)),
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

CAM_H = Vector((1, -1, 0)).normalized()     # kameran suunta vaakatasossa (kamera on +x, -y -puolella)
def half(o, keep='back', cx=0.0, cy=0.0):
    """Poista kappaleesta kameran puoleinen (keep='back') tai taaempi (keep='front') puolisko."""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = []
    for f in bm.faces:
        c = o.matrix_world @ f.calc_center_median()
        d = (c.x - cx) * CAM_H.x + (c.y - cy) * CAM_H.y
        if (d > 0.002 and keep == 'back') or (d < -0.002 and keep == 'front'): kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free(); return o

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
K = SHROOM_SCALE
def sh(x, y, z, h, r, *a, **kw): shroom(x * K, y * K, z, h * K, r * K, *a, **kw)

def threads(k, n, l0=0.1, seed=3):
    """Rihmaa maassa tyven ympärillä."""
    _, gillm, _ = strain_mats(k); rnd = random.Random(seed)
    for i in range(n):
        a = rnd.random() * 6.28; l = (l0 + rnd.random() * l0) * K
        rod((0, 0, 0.004), (math.cos(a) * l, math.sin(a) * l, 0.004), 0.006, gillm, 4)

def muoto_heltta(stage, k):
    """Leveälakkinen, hehkuvat heltat. Ryhmä yksi iso + pienempiä (siniheltta)."""
    if stage == 'itu':
        for (x, y, h) in [(0, 0, 0.08), (0.07, -0.05, 0.06), (-0.06, 0.04, 0.05)]:
            sh(x, y, 0, h, 0.035, k, ring=False)
    elif stage == 'nuori':
        sh(0, 0, 0, 0.2, 0.09, k, light=2)
        sh(0.1, -0.08, 0, 0.11, 0.05, k, (0.15, -0.1))
        sh(-0.09, 0.06, 0, 0.07, 0.035, k)
    else:
        sh(0, 0.02, 0, 0.36, 0.16, k, (0.04, 0.03), light=4)
        sh(0.14, -0.12, 0, 0.2, 0.09, k, (0.22, -0.15), light=1)
        sh(-0.13, 0.1, 0, 0.14, 0.065, k, (-0.2, 0.1))
        sh(0.03, -0.17, 0, 0.08, 0.04, k)
    threads(k, {'itu': 3, 'nuori': 3, 'kypsa': 6}[stage])

def bell(x, y, z, h, r, k, tilt=(0, 0), light=0.0):
    """Kellolakkinen sieni: korkea, alas taipuva lakki (ruususieni)."""
    capm, gillm, _ = strain_mats(k); m = M()
    top = (x + tilt[0] * h, y + tilt[1] * h, z + h)
    rod((x, y, z), top, max(0.01, r * 0.14), m['stem'], 8)
    cyl((top[0], top[1], top[2] - r * 0.5), r * 0.75, r * 0.05, gillm, 14)
    cap((top[0], top[1], top[2] - r * 0.45), r, r * 1.1, capm, droop=0.6)
    sphere((top[0], top[1], top[2] + r * 0.62), r * 0.18, gillm, seg=6)             # vaalea nuppi lakin huipulla
    if light: glow_light((top[0], top[1], top[2] - r * 0.6), STRAIN[k][1], light, 0.05)

def muoto_ruusu(stage, k):
    """Kimppu kapeita kellolakkeja, jotka kaartuvat ulospäin (ruususieni)."""
    f = {'itu': 0.35, 'nuori': 0.65, 'kypsa': 1.0}[stage]
    n = {'itu': 3, 'nuori': 4, 'kypsa': 6}[stage]
    rnd = random.Random(8)
    for i in range(n):
        a = i / n * 6.28 + 0.4; d = 0.0 if i == 0 else 0.07
        h = (0.34 if i == 0 else rnd.uniform(0.18, 0.28)) * f
        bell(math.cos(a) * d * K, math.sin(a) * d * K, 0, h * K, (0.07 if i == 0 else 0.05) * f * K, k,
             (math.cos(a) * 0.35 * (i > 0), math.sin(a) * 0.35 * (i > 0)), light=3 * f if i == 0 else 0)
    threads(k, n, 0.08, 5)

def muoto_nuppi(stage, k):
    """Pyöreitä hehkuvia nuppeja paksuilla jaloilla (hämäränuppi)."""
    capm, gillm, darkm = strain_mats(k); m = M()
    f = {'itu': 0.35, 'nuori': 0.65, 'kypsa': 1.0}[stage]
    items = [(0, 0, 0.22, 0.1), (0.1, -0.06, 0.12, 0.06), (-0.08, 0.08, 0.1, 0.05), (0.02, 0.12, 0.06, 0.035), (-0.1, -0.08, 0.07, 0.04)]
    for i, (x, y, h, r) in enumerate(items[:{'itu': 3, 'nuori': 3, 'kypsa': 5}[stage]]):
        x, y, h, r = x * K * (0.6 + 0.4 * f), y * K * (0.6 + 0.4 * f), h * K * f, r * K * f
        cyl((x, y, h / 2), r * 0.38, h, m['stemD'], 8, r2=r * 0.28)
        sphere((x, y, h + r * 0.75), r, capm, (1, 1, 0.9), 12)
        sphere((x - r * 0.3, y - r * 0.3, h + r * 1.2), r * 0.32, gillm, seg=6)          # kirkas kohta
        for j in range(3):                                                             # pienet syylät
            a = j * 2.1 + i
            sphere((x + math.cos(a) * r * 0.8, y + math.sin(a) * r * 0.8, h + r * 0.85), r * 0.14, darkm, seg=4)
        if i == 0: glow_light((x, y - r * 1.5, h + r), STRAIN[k][1], 4 * f, 0.05)
    threads(k, 4, 0.08, 6)

def muoto_kalvo(stage, k):
    """Lakin alta roikkuu verkkomainen kalvohame (kalvoheltta): tiivis, verkkomainen rihmasto."""
    capm, gillm, _ = strain_mats(k); m = M()
    f = {'itu': 0.35, 'nuori': 0.65, 'kypsa': 1.0}[stage]
    def one(x, y, h, r, light=0.0):
        top = (x, y, h)
        rod((x, y, 0), top, max(0.01, r * 0.15), m['stem'], 8)
        cap(top, r, r * 0.7, capm, droop=0.3)
        if r > 0.04:                     # verkkohame: pystysäikeet ja renkaat
            n = 12; zb = h * 0.3
            for i in range(n):
                a = i / n * 6.28
                rod((x + math.cos(a) * r * 0.55, y + math.sin(a) * r * 0.55, h - r * 0.05),
                    (x + math.cos(a) * r * 0.85, y + math.sin(a) * r * 0.85, zb), 0.005, gillm, 4)
            for t in (0.3, 0.6, 0.9):
                rr = r * (0.55 + 0.3 * t); zz = h - r * 0.05 - (h - r * 0.05 - zb) * t
                bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=0.005, major_segments=16, minor_segments=4, location=(x, y, zz))
                o = bpy.context.object; o.data.materials.append(gillm); link(o)
        if light: glow_light((x, y - r, h - r * 0.5), STRAIN[k][1], light, 0.05)
    one(0, 0, 0.34 * K * f, 0.13 * K * f, 3 * f)
    if stage != 'itu':
        one(0.13 * K, -0.08 * K, 0.18 * K * f, 0.07 * K * f)
    one(-0.1 * K, 0.1 * K, 0.1 * K * f, 0.045 * K * f)
    threads(k, 5, 0.1, 7)

def muoto_hoitaja(stage, k):
    """Pitkä ja ohut, rihmat kurottavat sivuille ja niiden päissä on sumupisarat (hoitajasieni)."""
    capm, gillm, _ = strain_mats(k); m = M()
    f = {'itu': 0.35, 'nuori': 0.65, 'kypsa': 1.0}[stage]
    H = 0.44 * K * f; r = 0.07 * K * f
    rod((0, 0, 0), (0, 0, H), max(0.01, r * 0.18), m['stem'], 8)
    cap((0, 0, H), r, r * 0.9, capm, droop=0.2)
    sphere((0, 0, H + r * 0.85), r * 0.25, gillm, seg=6)
    if stage != 'itu':
        n = 4 if stage == 'kypsa' else 2
        for i in range(n):
            a = i / n * 6.28 + 0.3; z0 = H * (0.45 + 0.12 * (i % 2)); L = 0.22 * K * f
            p0 = (0, 0, z0); p1 = (math.cos(a) * L * 0.6, math.sin(a) * L * 0.6, z0 + 0.05 * K * f)
            p2 = (math.cos(a) * L, math.sin(a) * L, z0 - 0.02 * K * f)
            rod(p0, p1, 0.007, capm, 4); rod(p1, p2, 0.006, capm, 4)
            sphere(p2, 0.022 * K * f, gillm, seg=6)                                       # sumupisara
    glow_light((0, -r * 2, H), STRAIN[k][1], 2 * f, 0.05)
    threads(k, 4, 0.08, 9)

# Kantataulukko: avain -> (nimi, muoto). Uusi kanta = värit STRAIN-taulukkoon + rivi tähän (muodon voi lainata).
KANNAT = {
    'heltta':  ('SINIHELTTA', muoto_heltta),
    'ruusu':   ('RUUSUSIENI', muoto_ruusu),
    'hamara':  ('HÄMÄRÄNUPPI', muoto_nuppi),
    'kalvo':   ('KALVOHELTTA', muoto_kalvo),
    'hoitaja': ('HOITAJASIENI', muoto_hoitaja),
}
STAGES = ('itu', 'nuori', 'kypsa')

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
        box((0.05, -d / 2 - 0.022, z0 / 2), (0.4, 0.012, 0.08), m['glassB'])                  # ravinnenesteen ikkuna
        box((0.05, -d / 2 - 0.026, z0 / 2 - 0.012), (0.38, 0.01, 0.045), m['tube'])
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
        hl = mat('heijastus', '#9fd3d6', 0.3, emit='#9fd3d6', estr=0.6)
        rod((w / 2 - 0.06, -d / 2 - 0.005, z0 + 0.12), (w / 2 - 0.06, -d / 2 - 0.005, z0 + h - 0.08), 0.006, hl, 4)
        rod((w / 2 + 0.005, -d / 2 + 0.06, z0 + 0.12), (w / 2 + 0.005, -d / 2 + 0.06, z0 + h - 0.08), 0.006, hl, 4)
        for z in (z0, z0 + h):
            box((w / 2, 0, z), (t, d + t, t), m['steel']); box((0, -d / 2, z), (w + t, t, t), m['steel'])
J_R, J_H, J_BASE = 0.3, 0.8, 0.2
def astia_lasipurkki(part='taka'):
    """Lasipurkki: lieriö teräsjalustalla ja -kannella, kansi kostutusletkulla (pieni bioreaktori).
    'taka' = jalusta, multa, takapuolen lasi ja kansi; 'etu' = etupuolen reunarenkaat ja heijastusjuova."""
    m = M(); z0 = J_BASE
    if part == 'taka':
        cyl((0, 0, z0 / 2), J_R + 0.04, z0, m['steelD'], 20)
        cyl((0, 0, z0 - 0.015), J_R + 0.06, 0.03, m['steel'], 20)
        cyl((0, 0, z0 + 0.06), J_R - 0.01, 0.12, m['soil'], 20)
        cyl((0, 0, z0 + 0.125), J_R - 0.02, 0.012, m['moss'], 20)
        rnd = random.Random(12)
        for i in range(6):
            a = rnd.random() * 6.28; d = rnd.uniform(0, J_R * 0.7)
            box((math.cos(a) * d, math.sin(a) * d, z0 + 0.135), (0.05, 0.05, 0.015 + rnd.random() * 0.02), m['moss'])
        g = cyl((0, 0, z0 + J_H / 2), J_R, J_H, m['glassB'], 24); half(g, 'back')
        for z in (z0, z0 + J_H):
            bpy.ops.mesh.primitive_torus_add(major_radius=J_R, minor_radius=0.02, major_segments=24, minor_segments=6, location=(0, 0, z))
            o = bpy.context.object; o.data.materials.append(m['steel']); link(o); half(o, 'back')
        # kansi: rengas ja takaosan kehys, kostutusletku
        box((0, J_R * 0.55, z0 + J_H + 0.03), (J_R * 1.4, J_R * 0.5, 0.05), m['steelD'], rot=(0, 0, math.radians(45)))
        cyl((-0.06, J_R * 0.55, z0 + J_H + 0.08), 0.03, 0.06, m['steel'], 10)
        rod((-0.06, J_R * 0.55, z0 + J_H + 0.11), (-0.06, J_R + 0.15, z0 + J_H + 0.11), 0.018, m['tube'], 8)
    else:
        for z in (z0, z0 + J_H):
            bpy.ops.mesh.primitive_torus_add(major_radius=J_R, minor_radius=0.02, major_segments=24, minor_segments=6, location=(0, 0, z))
            o = bpy.context.object; o.data.materials.append(m['steel']); link(o); half(o, 'front')
        a = math.radians(-70)
        rod((math.cos(a) * J_R, math.sin(a) * J_R, z0 + 0.15), (math.cos(a) * J_R, math.sin(a) * J_R, z0 + J_H - 0.1), 0.008,
            mat('heijastus', '#9fd3d6', 0.3, emit='#9fd3d6', estr=0.6), 4)

PLANT = {'astia_terraario': SOIL_TOP + 0.01, 'astia_lasipurkki': J_BASE + 0.13}

# =================== LAITTEET ===================
def laite_hautomo(state='kaynnissa'):
    """Hautomo terraarion tyyliin: teräsjalusta lukemanäytöllä, tummat sivupaneelit teräskehyksessä,
    lasiluukku (-y-puoli), jonka takana lämpimässä valossa hyllyittäin agar-maljoja. Merkkivalo katolla."""
    m = M(); w, d, h = 0.66, 0.6, 0.86; z0 = BASE_H; t = 0.035
    # jalusta kuten terraariossa
    box((0, 0, z0 / 2 + 0.03), (w + 0.04, d + 0.04, z0 - 0.06), m['steelD'])
    box((0, 0, z0 - 0.02), (w + 0.08, d + 0.08, 0.04), m['steel'])
    box((0, 0, 0.02), (w - 0.06, d - 0.06, 0.04), m['rubber'])
    lit = state != 'tyhja'
    box((0.05, -d / 2 - 0.022, z0 / 2), (0.36, 0.012, 0.08), m['glassB'])
    if lit: box((0.05, -d / 2 - 0.026, z0 / 2 - 0.012), (0.34, 0.01, 0.045), m['tube'])
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
        glow_light((0, -0.05, z0 + h * 0.55), '#ffcf7a' if state == 'valmis' else '#d99a5b', 6 if state == 'valmis' else 0.8, 0.2)
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
                cyl((x + rnd.uniform(-0.01, 0.01), -0.06 + (j % 2) * 0.08, zz + 0.035), 0.05, 0.01, m['ledA'] if state == 'valmis' else capm, 10)
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

TUOTTEET = {   # kehikon tuotteet: avain -> (nimi, kanta, väri, hehku)
    'valokalvo':  ('VALOKALVO', 'heltta', '#5fc7d0', '#a8fbee'),
    'lamporihma': ('LÄMPÖRIHMA', 'ruusu', '#c4428f', '#ffc46a'),
    'suodatin':   ('ITIÖSUODATIN', 'kalvo', '#9fd3d6', '#ffa6d6'),
}
def membrane(prod, frac, x0, x1, z0, z1, y=0.0):
    """Kehikkoon kasvava elävä kasvusto. frac = kasvun osuus alhaalta ylös (0..1)."""
    nimi, k, col, glow = TUOTTEET[prod]
    zt = z0 + (z1 - z0) * frac; w = x1 - x0; cx = (x0 + x1) / 2
    rnd = random.Random(len(prod))
    if prod == 'valokalvo':      # hehkuva ohut kalvo, tummemmat suonet
        box((cx, y, (z0 + zt) / 2), (w, 0.012, zt - z0), mat('valokalvo', col, 0.4, emit=glow, estr=1.2))
        for i in range(5):
            xx = x0 + w * (i + 0.5) / 5
            rod((xx, y - 0.01, z0), (xx + rnd.uniform(-0.05, 0.05), y - 0.01, zt), 0.006, mat('suoni', '#1d6a78', 0.6), 4)
    elif prod == 'lamporihma':   # punottu verkko lämpimästi hehkuvia rihmoja
        rm = mat('lamporihma', col, 0.6, emit=glow, estr=1.0)
        n = 9
        for i in range(n + 1):
            xx = x0 + w * i / n
            rod((xx, y, z0), (xx, y, zt), 0.01, rm, 4)
        zz = z0
        while zz <= zt:
            rod((x0, y - 0.005, zz), (x1, y - 0.005, zz), 0.01, rm, 4); zz += 0.06
        box((cx, y + 0.01, (z0 + zt) / 2), (w, 0.006, zt - z0), mat('lamporihmaP', '#5a1f4a', 0.8))
    else:                        # itiösuodatin: tiivis vaalea kalvo ja verkkokuvio
        box((cx, y, (z0 + zt) / 2), (w, 0.014, zt - z0), mat('suodatinK', col, 0.6, emit='#4f7d86', estr=0.5))
        nm = mat('suodatinV', glow, 0.5, emit=glow, estr=1.2)
        for i in range(-6, 7):
            a = (x0 + w / 2 + i * 0.08, z0); b = (a[0] + 0.5, z0 + 0.5); c = (a[0] - 0.5, z0 + 0.5)
            for (p, q) in ((a, b), (a, c)):
                # leikkaa viiva kasvualueeseen
                pts = []
                for t in [j / 40 for j in range(41)]:
                    px = p[0] + (q[0] - p[0]) * t; pz = p[1] + (q[1] - p[1]) * t
                    if x0 <= px <= x1 and z0 <= pz <= zt: pts.append((px, pz))
                if len(pts) > 1:
                    rod((pts[0][0], y - 0.01, pts[0][1]), (pts[-1][0], y - 0.01, pts[-1][1]), 0.005, nm, 4)
    if frac < 1:                 # kasvureuna: rihmat kurottavat ylös
        _, gillm, _ = strain_mats(k)
        for i in range(8):
            xx = x0 + w * rnd.random()
            rod((xx, y - 0.012, zt), (xx + rnd.uniform(-0.04, 0.04), y - 0.012, zt + rnd.uniform(0.03, 0.1)), 0.005, gillm, 4)

def laite_kehikko(prod=None, stage='tyhja'):
    """Kehikko: pystykehys teräsjalustalla, johon elävä kasvusto ohjataan kasvamaan (muottikasvatus).
    stage: tyhja, kasvaa_1, kasvaa_2, valmis (meripihkainen merkkivalo)."""
    m = M(); z0 = 0.18; W, Hh = 0.72, 0.92; t = 0.04
    box((0, 0, z0 / 2 + 0.02), (0.8, 0.36, z0 - 0.04), m['steelD'])
    box((0, 0, z0 - 0.015), (0.84, 0.4, 0.03), m['steel'])
    box((0, 0, 0.02), (0.74, 0.3, 0.04), m['rubber'])
    led = {'tyhja': m['ledOff'], 'kasvaa_1': m['ledG'], 'kasvaa_2': m['ledG'], 'valmis': m['ledA']}[stage]
    sphere((0.25, -0.19, z0 / 2), 0.025, led)
    if stage == 'valmis': glow_light((0.25, -0.3, z0 / 2), '#ffcf7a', 0.8, 0.05)
    x0, x1, zb, zt = -W / 2, W / 2, z0 + 0.04, z0 + Hh
    for x in (x0 - t / 2, x1 + t / 2):
        box((x, 0, (zb + zt) / 2 + 0.02), (t, t * 1.4, zt - zb + t + 0.04), m['steel'])
    for z in (zb - t / 2, zt + t / 2):
        box((0, 0, z), (W + 2 * t, t * 1.4, t), m['steel'])
    for x in (x0 + 0.06, x1 - 0.06):                                                  # kiinnikkeet
        for z in (zb + 0.02, zt - 0.02): box((x, -0.03, z), (0.05, 0.02, 0.04), m['steelD'])
    # ravinneletku kehyksen yläreunassa
    rod((x0, 0.03, zt + 0.07), (x1, 0.03, zt + 0.07), 0.016, m['tube'], 8)
    rod((x1 + 0.03, 0.03, zt + 0.07), (x1 + 0.03, 0.03, z0), 0.016, m['tube'], 8)
    frac = {'tyhja': 0, 'kasvaa_1': 0.3, 'kasvaa_2': 0.65, 'valmis': 1.0}[stage]
    if prod and frac > 0:
        membrane(prod, frac, x0, x1, zb, zt)
        if stage == 'valmis':
            nimi, k, col, glow = TUOTTEET[prod]
            glow_light((0, -0.35, (zb + zt) / 2), glow, 4, 0.3)

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
    """4×4-laboratorio: laattalattia, paneeliseinät, valolista, ravinneputket, tuuletin, liukuovi (rihmaretki),
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
    # liukuovi vasemmassa seinässä: tästä symbiontin rihma kurottaa ulos villiin (rihmaretki)
    dy, dw, dh = 0.2, 0.95, 1.85
    box((-hx + 0.04, dy, dh / 2 + 0.05), (0.08, dw + 0.18, dh + 0.1), m['steelD'], shadow=False)
    box((-hx + 0.07, dy, dh / 2), (0.06, dw, dh), m['panelR'], shadow=False)
    box((-hx + 0.105, dy, dh / 2), (0.02, 0.03, dh - 0.1), m['panelD'], shadow=False)        # keskisauma
    box((-hx + 0.105, dy - 0.25, 1.25), (0.02, 0.24, 0.42), m['glassB'], shadow=False)        # ikkunaviilto
    box((-hx + 0.105, dy + 0.25, 1.25), (0.02, 0.24, 0.42), m['glassB'], shadow=False)
    for z in (0.35, 0.6):
        box((-hx + 0.105, dy, z), (0.02, dw - 0.1, 0.04), mat('varoitus', '#e8a02a', 0.6), shadow=False)
    box((-hx + 0.06, dy + dw / 2 + 0.2, 1.05), (0.05, 0.12, 0.2), m['panelD'], shadow=False)  # avausvipu
    box((-hx + 0.09, dy + dw / 2 + 0.2, 1.12), (0.04, 0.03, 0.08), m['copper'], shadow=False)
    # symbiontin rihma: muutama hehkuva säie lattialla oven raosta huoneeseen
    rnd = random.Random(31)
    for i in range(6):
        y0 = dy + rnd.uniform(-0.35, 0.35); l = rnd.uniform(0.25, 0.6); a = rnd.uniform(-0.5, 0.5)
        rod((-hx + 0.1, y0, 0.006), (-hx + 0.1 + math.cos(a) * l, y0 + math.sin(a) * l, 0.006), 0.008, m['myc'], 4)
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

def tila_kellari():
    """4×3-kellari: betonilattia lattiakaivolla, kosteat betoniseinät, putket ja tippuva vesi, sammalta nurkissa,
    kattoluukku ja tikkaat ylös huoneeseen, viileämpi valo."""
    m = M(); nx, ny = 4, 3; hx, hy = nx / 2, ny / 2
    conc = wmat('betoniL', '#3c4239', '#2e322e', 2.5, 0.9, cut=0.5)
    wallL = wmat('betoniV', '#2e322e', '#23272a', 1.8, 0.95, cut=0.45, stretch=(1, 1, 0.5))
    wallR = wmat('betoniO', '#3c4239', '#2e322e', 1.8, 0.95, cut=0.45, stretch=(1, 1, 0.5))
    for c in range(nx):
        for r in range(ny):
            box((-hx + 0.5 + c, hy - 0.5 - r, -0.04), (0.985, 0.985, 0.08), conc)
    box((0, 0, -0.1), (nx, ny, 0.04), m['dark'])
    T = 0.16
    box((-hx - T / 2, -T / 4, WALL_H / 2 - 0.08), (T, ny + T / 2, WALL_H + 0.16), wallL, shadow=False)
    box((-T / 2, hy + T / 2, WALL_H / 2 - 0.08), (nx + T, T, WALL_H + 0.16), wallR, shadow=False)
    # kosteusraidat seinissä
    damp = mat('kostea', '#16262e', 0.3, 0.1)
    rnd = random.Random(41)
    for i in range(7):
        y = rnd.uniform(-hy + 0.2, hy - 0.2); hh = rnd.uniform(0.4, 1.4)
        box((-hx + 0.004, y, WALL_H - 0.25 - hh / 2), (0.01, rnd.uniform(0.05, 0.15), hh), damp, shadow=False)
    for i in range(8):
        x = rnd.uniform(-hx + 0.2, hx - 0.2); hh = rnd.uniform(0.4, 1.4)
        box((x, hy - 0.004, WALL_H - 0.25 - hh / 2), (rnd.uniform(0.05, 0.15), 0.01, hh), damp, shadow=False)
    # betonipilarit ja palkki
    box((-hx + 0.1, hy - 0.1, WALL_H / 2), (0.2, 0.2, WALL_H), wallR, shadow=False)
    box((0.4, hy - 0.08, WALL_H / 2), (0.25, 0.16, WALL_H), wallR, shadow=False)
    # putkisto: kaksi paksua putkea seinää pitkin, venttiili ja tippuva vesi
    for (z, rr, mm) in ((WALL_H - 0.3, 0.07, m['copper']), (WALL_H - 0.5, 0.05, m['steelD'])):
        rod((-hx + 0.12, -hy, z), (-hx + 0.12, hy - 0.12, z), rr, mm, 12)
        rod((-hx + 0.12, hy - 0.12, z), (hx, hy - 0.12, z), rr, mm, 12)
    rod((1.3, hy - 0.12, WALL_H - 0.3), (1.3, hy - 0.12, 0.25), 0.05, m['copper'], 10)
    cyl((1.3, hy - 0.12, 0.6), 0.09, 0.12, m['patina'], 10)
    cyl((1.3, hy - 0.2, 0.6), 0.07, 0.03, mat('venttiili', '#e0504a', 0.6), 10, rot=(math.pi / 2, 0, 0))
    for z in (0.95, 0.7, 0.4):
        sphere((-hx + 0.12, 0.3, z), 0.018, m['tube'], (1, 1, 1.6), 6)                       # pisarat
    puddle = mat('lammikko', '#16262e', 0.05, 0.3)
    box((-hx + 0.45, 0.25, 0.003), (0.5, 0.7, 0.006), puddle)
    # lattiakaivo
    cyl((0.5, -0.5, 0.003), 0.16, 0.008, m['steelD'], 16)
    for i in range(4): box((0.5, -0.5 - 0.09 + i * 0.06, 0.008), (0.24, 0.02, 0.006), m['rubber'])
    # tikkaat ja kattoluukku vasemman seinän edessä
    ly = -hy + 0.45
    for dyy in (-0.2, 0.2): rod((-hx + 0.12, ly + dyy, 0), (-hx + 0.12, ly + dyy, WALL_H + 0.1), 0.02, m['steel'], 6)
    for i in range(7): rod((-hx + 0.12, ly - 0.2, 0.25 + i * 0.27), (-hx + 0.12, ly + 0.2, 0.25 + i * 0.27), 0.014, m['steel'], 6)
    # häkkivalaisin oikealla seinällä (lämmin, himmeä) ja viileä kattovalo
    lx = -0.6
    box((lx, hy - 0.05, 1.6), (0.18, 0.1, 0.12), m['steelD'], shadow=False)
    sphere((lx, hy - 0.12, 1.6), 0.06, mat('hakkilamppu', '#ffcf7a', 0.5, emit='#ffcf7a', estr=4))
    for dz in (-0.05, 0.05): rod((lx - 0.08, hy - 0.17, 1.6 + dz), (lx + 0.08, hy - 0.17, 1.6 + dz), 0.006, m['steel'], 4)
    # sammal ja kasvit nurkissa
    for i in range(40):
        a = rnd.random()
        box((-hx + 0.1 + rnd.random() * 0.8 * a, hy - 0.1 - rnd.random() * 0.9, 0.008), (0.07, 0.07, 0.016 + rnd.random() * 0.025), m['moss'])
    for i in range(14):
        box((hx - 0.1 - rnd.random() * 0.6, hy - 0.1 - rnd.random() * 0.3, 0.008), (0.07, 0.07, 0.016 + rnd.random() * 0.02), m['moss'])
    for i in range(10):
        box((-hx + 0.006, hy - 0.2 - rnd.random() * 0.5, rnd.random() * 0.4), (0.02, 0.08, 0.07), m['moss'], shadow=False)
    vine(-hx, -0.2, WALL_H - 0.05, 0.6, (1, 0), 42, m); vine(1.7, hy, WALL_H - 0.05, 0.8, (0, -1), 43, m)
    # villi rihmasto (kylmä violetti) tunkee kellarin takanurkkaan ja seinän raosta, vain vähän
    wild = m['wild']; wildD = mat('villiT', '#24203f', 0.8)
    for i in range(14):
        a = rnd.uniform(-1.5, 0); l = rnd.uniform(0.15, 0.6)
        rod((-hx + 0.08, hy - 0.08, 0.006), (-hx + 0.08 + math.cos(a) * l, hy - 0.08 + math.sin(a) * l, 0.006), 0.007, wild, 4)
    for i in range(8):
        sphere((-hx + 0.1 + rnd.random() * 0.3, hy - 0.1 - rnd.random() * 0.3, 0.01), rnd.uniform(0.03, 0.06), wildD if i % 2 else wild, (1, 1, 0.5), 6)
    for i in range(5):
        y0 = hy - 0.12 - rnd.random() * 0.25
        rod((-hx + 0.004, y0, 0), (-hx + 0.004, y0 + rnd.uniform(-0.1, 0.1), rnd.uniform(0.25, 0.6)), 0.007, wild, 4)
    for i in range(6):                                                                    # seinän rako oikealla
        x0 = hx - 0.35 + rnd.uniform(-0.05, 0.05)
        rod((x0, hy - 0.004, 1.1 + i * 0.05), (x0 + rnd.uniform(-0.2, 0.2), hy - 0.004, 1.1 + i * 0.05 + rnd.uniform(-0.15, 0.15)), 0.006, wild, 4)
    box((hx - 0.35, hy - 0.003, 1.25), (0.025, 0.01, 0.5), mat('rako', '#130f24', 0.9), shadow=False)
    L = bpy.data.lights.new('katto', 'AREA'); L.energy = 55; L.size = 2.5; L.color = hexc('#9fd3d6')[:3]
    lo = bpy.data.objects.new('katto', L); lo.location = (0, 0, WALL_H + 0.3); link(lo)
    L = bpy.data.lights.new('lamppu', 'POINT'); L.energy = 12; L.color = hexc('#ffcf7a')[:3]
    lo = bpy.data.objects.new('lamppu', L); lo.location = (lx, hy - 0.3, 1.55); link(lo)

# =================== KUVAKKEET ===================
def ikoni_hopea():
    """Hopea: pino kolikoita."""
    sil = mat('hopea', '#c9bc9c', 0.35, 0.2, emit='#8a7d68', estr=0.6); sil2 = mat('hopeaV', '#efe6cc', 0.35, 0.2, emit='#c9bc9c', estr=0.6)
    for i in range(4): cyl((0.01 * (i % 2), 0, 0.012 + i * 0.024), 0.07, 0.022, sil if i % 2 else sil2, 16)
    cyl((0.1, 0.06, 0.012), 0.07, 0.022, sil, 16)
    cyl((0.1, 0.06, 0.036), 0.07, 0.022, sil2, 16)

def ikoni_itio(k):
    """Itiöpussi: suljettu itiöampulli, sisällä kannan värisiä itiöitä."""
    capm, gillm, darkm = strain_mats(k); m = M()
    g = cyl((0, 0, 0.1), 0.045, 0.14, m['glassB'], 14); half(g, 'back')
    cyl((0, 0, 0.075), 0.04, 0.11, capm, 14)
    for i in range(5): sphere((0.025 * math.cos(i * 2.4), 0.025 * math.sin(i * 2.4) - 0.02, 0.05 + i * 0.022), 0.012, gillm, seg=6)
    cyl((0, 0, 0.18), 0.05, 0.03, m['steel'], 14)
    cyl((0, 0, 0.015), 0.05, 0.03, m['steel'], 14)

def ikoni_agar():
    """Agar-malja."""
    m = M()
    cyl((0, 0, 0.01), 0.1, 0.02, m['glassB'], 20)
    cyl((0, 0, 0.022), 0.09, 0.012, m['agar'], 20)
    cyl((0, 0, 0.032), 0.1, 0.006, mat('kansi', '#9fd3d6', 0.1, alpha=0.4), 20)

def ikoni_sato(k):
    """Raaka sato: yksi kannan kypsä sieni."""
    nimi, fn = KANNAT[k]
    if k == 'hamara':
        capm, gillm, _ = strain_mats(k); m = M()
        cyl((0, 0, 0.05), 0.03, 0.1, m['stemD'], 8); sphere((0, 0, 0.14), 0.07, capm, seg=12)
        sphere((-0.02, -0.02, 0.18), 0.02, gillm, seg=6)
    elif k == 'ruusu':
        bell(0, 0, 0, 0.2, 0.08, k)
    else:
        shroom(0, 0, 0, 0.18, 0.09, k, ring=True)

def ikoni_tuote(prod):
    """Kehikon tuote: pieni kehyksellinen kasvustolevy."""
    m = M(); W = 0.22
    membrane(prod, 1.0, -W / 2, W / 2, 0.02, 0.02 + W)
    for x in (-W / 2 - 0.01, W / 2 + 0.01): box((x, 0, 0.02 + W / 2), (0.02, 0.03, W + 0.04), m['steel'])
    for z in (0.01, 0.03 + W): box((0, 0, z), (W + 0.04, 0.03, 0.02), m['steel'])

def ikoni_villi():
    """Villi näyte: kontaminoitunut malja, jossa kylmän violettia villiä rihmastoa."""
    m = M(); w = M()['wild']
    cyl((0, 0, 0.01), 0.1, 0.02, m['glassB'], 20)
    cyl((0, 0, 0.022), 0.09, 0.012, mat('villiAgar', '#3a3a5e', 0.5), 20)
    rnd = random.Random(51)
    for i in range(9):
        a = rnd.random() * 6.28; l = rnd.uniform(0.03, 0.08)
        rod((0, 0, 0.03), (math.cos(a) * l, math.sin(a) * l, 0.03), 0.006, w, 4)
    sphere((0, 0, 0.035), 0.025, w, seg=8)

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

def frame_fit(sc, co, W, H, pad=2):
    """Kuvakkeet: sovita kaikki kappaleet W×H-kankaan keskelle (oma mittakaava)."""
    bpy.context.view_layer.update()
    R = co.rotation_euler.to_matrix(); Rt = R.transposed(); xs, ys = [], []
    for o in sc.objects:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            q = Rt @ (o.matrix_world @ Vector(c)); xs.append(q.x); ys.append(q.y)
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    ppm = min((W - 2 * pad) / w, (H - 2 * pad) / h)
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    co.location = R @ Vector((cx, cy, 200))
    sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
    co.data.ortho_scale = max(W, H) / ppm

# Huoneet: nimi -> (ruudut nx, ny). Ruudun (c, r) keskipiste maailmassa (-nx/2 + 0.5 + c, ny/2 - 0.5 - r).
ROOMS = {'tila_huone': (4, 4), 'tila_kellari': (4, 3)}

# nimi: (rakentaja, kangas W, H, ankkuri ax, ay); ankkuri None = kuvake, sovitetaan kankaaseen
SPRITES = {
    'tila_huone':          (tila_huone, 384, 320, 192, 226),
    'tila_kellari':        (tila_kellari, 384, 296, 192, 206),
    'astia_terraario':     (lambda: astia_terraario('taka'), 96, 160, 48, 136),
    'astia_terraario_etu': (lambda: astia_terraario('etu'), 96, 160, 48, 136),
    'astia_lasipurkki':    (lambda: astia_lasipurkki('taka'), 96, 160, 48, 136),
    'astia_lasipurkki_etu':(lambda: astia_lasipurkki('etu'), 96, 160, 48, 136),
}
for k, (nimi, fn) in KANNAT.items():
    for st in STAGES:
        SPRITES['sieni_%s_%s' % (k, st)] = ((lambda fn=fn, st=st, k=k: fn(st, k)), 80, 88, 40, 68)
for st in ('tyhja', 'kaynnissa', 'valmis'):
    SPRITES['laite_hautomo_' + st] = ((lambda st=st: laite_hautomo(st)), 96, 144, 48, 120)
SPRITES['laite_kehikko_tyhja'] = ((lambda: laite_kehikko(None, 'tyhja')), 96, 144, 48, 120)
for p in TUOTTEET:
    for st in ('kasvaa_1', 'kasvaa_2', 'valmis'):
        SPRITES['laite_kehikko_%s_%s' % (p, st)] = ((lambda p=p, st=st: laite_kehikko(p, st)), 96, 144, 48, 120)
IC = 32
SPRITES['ikoni_hopea'] = (ikoni_hopea, IC, IC, None, None)
SPRITES['ikoni_agar'] = (ikoni_agar, IC, IC, None, None)
SPRITES['ikoni_villi'] = (ikoni_villi, IC, IC, None, None)
for k in KANNAT:
    SPRITES['ikoni_itio_' + k] = ((lambda k=k: ikoni_itio(k)), IC, IC, None, None)
    SPRITES['ikoni_sato_' + k] = ((lambda k=k: ikoni_sato(k)), IC, IC, None, None)
for p in TUOTTEET:
    SPRITES['ikoni_' + p] = ((lambda p=p: ikoni_tuote(p)), IC, IC, None, None)

def meta():
    rooms = {}
    for n, (nx, ny) in ROOMS.items():
        hx, hy = nx / 2, ny / 2; HW = TILE_W // 2; HH = TILE_W // 4
        wx, wy = -hx + 0.5, hy - 0.5           # ruutu (0, 0)
        rooms[n] = {'n': [nx, ny], 'tile0': [round(HW * (wx + wy)), round(HH * (wx - wy))],
                    'dc': [HW, HH], 'dr': [-HW, HH]}
    return {'tile': [TILE_W, TILE_W // 2], 'ppm': PPM, 'rooms': rooms,
            'plant_dy': {k: round(z * math.sin(math.radians(60)) * PPM) for k, z in PLANT.items()},
            'kannat': {k: v[0] for k, v in KANNAT.items()}, 'tuotteet': {k: v[0] for k, v in TUOTTEET.items()},
            'sprites': {n: {'w': W, 'h': H, 'ax': ax, 'ay': ay} for n, (_, W, H, ax, ay) in SPRITES.items()}}

if __name__ == '__main__' or argv:
    import json, fnmatch
    os.makedirs(OUTDIR, exist_ok=True)
    json.dump(meta(), open(os.path.join(OUTDIR, 'koti.json'), 'w'), indent=1, ensure_ascii=False)
    for name, (fn, W, H, ax, ay) in SPRITES.items():
        if ONLY and not any(fnmatch.fnmatch(name, p) for p in ONLY): continue
        sc, co = setup_scene(); fn()
        if ax is None: frame_fit(sc, co, W, H)
        else: frame_anchor(sc, co, W, H, ax, ay)
        render_pair(sc, os.path.join(OUTDIR, name), 192 if name.startswith('tila') else 64)
        print('VALMIS', name, W, H)
