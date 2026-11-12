"""Solmu – katupakkaus 1 ja kerrostalot.
Ajo:  python kit.py -- sheet <kansio>      (jokainen palikka erikseen)
      python kit.py -- scene <kansio>      (katukulman dioraama)
      python kit.py -- blend <kansio>      (kaikki palikat .blend- ja .glb-tiedostoiksi)
Blenderin Scripting-välilehdellä ajettuna rakentaa katukulman muokattavaksi."""
import bpy, math, sys, os, random
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['gui', os.path.expanduser('~')]
MODE, OUTDIR = argv[0], argv[1]
os.makedirs(OUTDIR, exist_ok=True)

# =================== MATERIAALIT ===================
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def hexc(h, a=1.0):
    h = h.lstrip('#'); return tuple(lin(int(h[i:i+2], 16) / 255) for i in (0, 2, 4)) + (a,)

MATS = {}
def mat(name, col, rough=0.8, metal=0.0, emit=None, estr=0.0, trans=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(col); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if trans: b.inputs['Transmission Weight'].default_value = trans; b.inputs['IOR'].default_value = 1.2
    if emit: b.inputs['Emission Color'].default_value = hexc(emit); b.inputs['Emission Strength'].default_value = estr
    MATS[name] = m; return m

def wmat(name, c1, c2, scale=3.0, rough=0.85, metal=0.0, cut=0.5):
    """Kuluma: kaksi väriä kohinalla (ruoste, patina, likaiset seinät)."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 4
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = cut - 0.06; cr.color_ramp.elements[0].color = hexc(c1)
    cr.color_ramp.elements[1].position = cut + 0.06; cr.color_ramp.elements[1].color = hexc(c2)
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], cr.inputs['Fac'])
    nt.links.new(cr.outputs['Color'], b.inputs['Base Color'])
    MATS[name] = m; return m

def M():
    return {
      'rust':    wmat('ruoste', '#5e321e', '#a8602f', 4.0, 0.9, 0.3),
      'iron':    wmat('valurauta', '#3a4a5c', '#4a3330', 6.0, 0.7, 0.3),
      'patina':  wmat('patina', '#a8602f', '#4f9a86', 3.0, 0.5, 0.6, 0.45),
      'copper':  mat('kupari', '#c87a3e', 0.35, 1.0),
      'wood':    wmat('puu', '#6a4a30', '#45301f', 8.0, 0.9),
      'woodG':   wmat('puuH', '#77705f', '#55524a', 6.0, 0.95),
      'concrete':wmat('betoni', '#8a8576', '#6b675c', 2.5, 0.95),
      'concD':   wmat('betoniT', '#55524a', '#3b3a33', 3.0, 0.95),
      'plaster': wmat('rappaus', '#c9a46a', '#a8865a', 2.0, 0.95),
      'brick':   wmat('tiiliT', '#7a4438', '#5a3028', 5.0, 0.95),
      'metal':   wmat('peltiH', '#7a8490', '#5a6878', 4.0, 0.6, 0.3),
      'paint':   wmat('maaliV', '#4f7d86', '#2d4a55', 3.0, 0.7, 0.2),
      'carP':    wmat('autoP', '#8a3a2a', '#5e321e', 3.5, 0.6, 0.3, 0.55),
      'tire':    mat('rengas', '#141414', 0.95),
      'asphalt': wmat('asfaltti', '#3b3a33', '#2e2d28', 1.5, 0.95),
      'pave':    wmat('laatta', '#6b675c', '#55524a', 1.2, 0.95),
      'glass':   mat('lasi', '#cfeff2', 0.05, trans=1.0),
      'glassD':  mat('lasiT', '#16262e', 0.15, 0.4),
      'winD':    mat('ikkunaT', '#141c28', 0.2, 0.3),
      'winL':    mat('ikkunaV', '#ffcf7a', 0.5, emit='#ffb860', estr=4.0),
      'winC':    mat('ikkunaS', '#a8fbee', 0.5, emit='#5fc7d0', estr=2.0),
      'moss':    wmat('sammal', '#3f6a26', '#79a83a', 9.0, 1.0),
      'mossD':   mat('sammalT', '#24391c', 1.0),
      'grass':   wmat('nurmi', '#4f7a2c', '#3f6a26', 5.0, 1.0),
      'vine':    wmat('kounos', '#2f5a24', '#4f7a2c', 7.0, 1.0),
      'stem':    mat('jalka', '#d9ccaa', 0.7),
      'soil':    mat('multa', '#2a1d16', 1.0),
      'sign':    mat('kyltti', '#2c3a4a', 0.6, emit='#d9845a', estr=0.3),
      'cyan':    mat('hehkuS', '#34b8ac', 0.5, emit='#34b8ac', estr=3.0),
      'pink':    mat('hehkuP', '#c4428f', 0.5, emit='#c4428f', estr=3.0),
      'orange':  mat('hehkuO', '#d9702a', 0.5, emit='#d9702a', estr=3.0),
      'violet':  mat('hehkuV', '#7a4ae0', 0.5, emit='#5a3ad0', estr=2.2),
      'thread':  mat('rihma', '#a8fbee', 0.5, emit='#5fc7d0', estr=5.0),
      'water':   mat('vesi', '#1d6a78', 0.1, emit='#1d6a78', estr=0.8),
      'amber':   mat('meripihka', '#e8a02a', 0.5, emit='#ffcf7a', estr=4.0),
    }
GLOW = {'cyan': '#a8fbee', 'pink': '#ffa6d6', 'orange': '#ffc46a', 'violet': '#d6b0ff'}

# =================== RAKENNUSAPURIT ===================
ROOT = None
def link(o):
    for c in list(o.users_collection): c.objects.unlink(o)
    bpy.context.scene.collection.objects.link(o)
    if ROOT is not None: o.parent = ROOT
    return o

def box(loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.scale = size; bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); return link(o)

def cyl(loc, r, d, m, v=12, rot=(0, 0, 0), r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=d, location=loc, rotation=rot)
    o = bpy.context.object; o.data.materials.append(m); return link(o)

def sphere(loc, r, m, scale=(1, 1, 1), seg=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(4, seg // 2), radius=r, location=loc)
    o = bpy.context.object; o.scale = scale; bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); return link(o)

def torus(loc, R, r, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=16, minor_segments=6, location=loc, rotation=rot)
    o = bpy.context.object; o.data.materials.append(m); return link(o)

def rod(a, b, r, m, v=6):
    a, b = Vector(a), Vector(b); d = b - a
    o = cyl((a + b) / 2, r, d.length, m, v)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y'); return o

def cap(loc, r, h, m):
    """Sienen lakki: litistetty puolipallo."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=r, location=loc)
    o = bpy.context.object
    me = o.data
    for v in me.vertices:
        if v.co.z < 0: v.co.z = 0
        v.co.z *= h / r
    o.data.materials.append(m); return link(o)

def glow_light(loc, col, energy):
    L = bpy.data.lights.new('hehku', 'POINT'); L.energy = energy; L.color = hexc(col)[:3]; L.shadow_soft_size = 0.1
    o = bpy.data.objects.new('hehku', L); o.location = loc; return link(o)

def shroom(x, y, z, h, r, strain, light=0.0, tilt=0.0, mm=None):
    mm = mm or M()
    top = (x + math.sin(tilt) * h, y, z + math.cos(tilt) * h)
    rod((x, y, z), top, max(0.012, r * 0.16), mm['stem'])
    cap(top, r, r * 0.6, mm[strain])
    if light: glow_light((top[0], top[1], top[2] + r * 0.6), GLOW[strain], light)

def cluster(x, y, z, n, size, strain, seed, light=0.0, spread=None):
    rnd = random.Random(seed); mm = M(); spread = spread or size * 1.4
    for i in range(n):
        s = size * (0.45 + rnd.random() * 0.7)
        shroom(x + (rnd.random() - 0.5) * spread, y + (rnd.random() - 0.5) * spread, z, s * 1.4, s * 0.6, strain,
               light if i == 0 else 0, (rnd.random() - 0.5) * 0.5, mm)

def moss_patch(x, y, z, w, d, seed, n=10, h=0.04, m='moss'):
    rnd = random.Random(seed); mm = M()
    for i in range(n):
        sx, sy = w * (0.15 + rnd.random() * 0.3), d * (0.15 + rnd.random() * 0.3)
        box((x + (rnd.random() - 0.5) * (w - sx), y + (rnd.random() - 0.5) * (d - sy), z + h / 2), (sx, sy, h * (0.5 + rnd.random())), mm[m])

def vines(x, y, z0, z1, face, seed, width=0.6, m='vine'):
    """Köynnös seinällä: pystysuuntaisia lehtiklönttejä. face = seinän normaali (nx, ny)."""
    rnd = random.Random(seed); mm = M(); nx, ny = face
    z = z0
    while z < z1:
        off = (rnd.random() - 0.5) * width
        px, py = x + (ny * off if nx == 0 else 0), y + (nx * off if ny == 0 else 0)
        s = 0.18 + rnd.random() * 0.25
        box((px + nx * 0.06, py + ny * 0.06, z), (s if nx == 0 else 0.1, s if ny == 0 else 0.1, s * 1.2), mm[m])
        z += s * (0.6 + rnd.random() * 0.6)

def grass_tufts(x, y, w, d, seed, n=14):
    rnd = random.Random(seed); mm = M()
    for i in range(n):
        h = 0.12 + rnd.random() * 0.25
        box((x + (rnd.random() - 0.5) * w, y + (rnd.random() - 0.5) * d, h / 2), (0.08, 0.08, h), mm['grass'])

def new_root(name, loc=(0, 0, 0), rotz=0.0):
    global ROOT
    e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e)
    ROOT = e; return e

def place(root, loc, rotz=0.0):
    root.location = loc; root.rotation_euler = (0, 0, rotz)

# =================== PALIKAT ===================
def kpl01_penkki():
    m = M()
    for sx in (-0.75, 0.75):           # valurautaiset sivukehykset
        box((sx, 0, 0.22), (0.1, 0.5, 0.44), m['iron'])
        box((sx, 0.22, 0.65), (0.06, 0.08, 0.5), m['iron'], rot=(math.radians(-12), 0, 0))
        box((sx, -0.2, 0.3), (0.06, 0.08, 0.06), m['iron'])
    for i, yy in enumerate((-0.18, -0.06, 0.06, 0.18)):   # istuinlaudat, yksi puuttuu
        if i == 2: continue
        box((0, yy, 0.46), (1.72, 0.11, 0.07), m['woodG'] if i % 2 else m['wood'])
    box((0.35, 0.27, 0.62), (1.0, 0.04, 0.1), m['wood'], rot=(math.radians(-12), 0, 0))   # selkänoja, osa katkennut
    box((-0.45, 0.29, 0.72), (0.8, 0.04, 0.1), m['woodG'], rot=(math.radians(-12), math.radians(6), 0))
    moss_patch(-0.3, -0.05, 0.48, 0.9, 0.4, 11, 6, 0.03)
    cluster(0.1, 0.06, 0.44, 3, 0.09, 'cyan', 12, light=4)
    grass_tufts(0, 0, 2.0, 0.9, 13, 10)

def kpl02_katulamppu():
    m = M(); t = math.radians(5)
    box((0, 0, 0.15), (0.35, 0.35, 0.3), m['iron'])
    top = Vector((math.sin(t) * 5.0, 0, 0.3 + math.cos(t) * 5.0))
    rod((0, 0, 0.3), top, 0.12, m['iron'])
    arm = top + Vector((1.1, 0, 0.25)); rod(top, arm, 0.08, m['iron'])
    rod(arm, arm + Vector((0.25, 0, -0.15)), 0.08, m['iron'])
    hp = arm + Vector((0.35, 0, -0.25))
    cyl(hp + Vector((0, 0, 0.1)), 0.42, 0.18, m['metal'], 10, r2=0.14)        # kupu
    for i, (dx, dy, s) in enumerate([(0, 0, 0.13), (0.12, 0.05, 0.08), (-0.1, -0.06, 0.09), (0.03, -0.12, 0.06)]):
        sphere(hp + Vector((dx, dy, -0.08 - s)), s, m['cyan'], seg=8)           # hehkuva sienirypäle lampun paikalla
    rod(hp + Vector((0.05, 0, -0.2)), hp + Vector((0.08, 0.02, -0.75)), 0.012, m['thread'])
    glow_light(hp + Vector((0, 0, -0.35)), GLOW['cyan'], 60)
    vines(0.08, 0, 0.3, 2.6, (1, 0), 21, 0.15)
    moss_patch(0, 0, 0.3, 0.4, 0.4, 22, 5, 0.03)

def kpl03_bussikatos():
    m = M()
    for x in (-1.45, 1.45):
        for y in (-0.6, 0.6): box((x, y, 1.2), (0.08, 0.08, 2.4), m['metal'])
    box((0, 0, 2.45), (3.2, 1.5, 0.1), m['metal'])
    box((-0.6, 0.6, 1.3), (1.7, 0.03, 1.8), m['glass'])                        # takalasi, toinen puolikas rikki
    box((0.85, 0.6, 0.75), (1.1, 0.03, 0.7), m['glass'])
    for k, (x, z) in enumerate([(0.55, 1.35), (0.9, 1.5), (1.2, 1.25)]):       # sirpaleet
        box((x, 0.6, z), (0.18, 0.03, 0.12), m['glass'], rot=(0, math.radians(30 * k), 0))
    box((1.42, 0, 1.3), (0.03, 1.1, 1.8), m['glass'])
    box((-1.42, 0, 1.6), (0.05, 0.9, 1.0), m['sign'])                           # aikataulutaulu
    box((0, 0.35, 0.45), (2.0, 0.35, 0.06), m['wood']); box((0, 0.35, 0.22), (0.1, 0.1, 0.44), m['iron'])
    moss_patch(0, 0, 2.5, 3.0, 1.4, 31, 14, 0.08)
    for k in range(5):                                                          # katolta roikkuvat köynnökset
        x = -1.3 + k * 0.6; h = 0.4 + (k % 3) * 0.35
        box((x, -0.72, 2.45 - h / 2), (0.15, 0.06, h), m['vine'])
    cluster(-1.2, 0.3, 0.0, 4, 0.12, 'violet', 33, light=6)

def kpl04_kioski():
    m = M()
    box((0, 0, 1.25), (2.4, 1.8, 2.5), m['paint'])
    box((0, 0, 2.6), (2.6, 2.0, 0.2), m['metal'])
    for k in range(10):                                                          # rullaluukku
        box((0, -0.91, 0.75 + k * 0.12), (1.9, 0.04, 0.09), m['rust'])
    box((0, -0.92, 0.6), (2.1, 0.08, 0.1), m['metal'])
    box((0, -1.15, 2.2), (2.4, 0.6, 0.05), m['rust'], rot=(math.radians(-18), 0, 0))   # markiisi
    box((0, -0.92, 2.95), (2.0, 0.08, 0.5), m['sign'])                           # tyhjä kyltti
    box((0.7, -0.98, 2.95), (0.35, 0.05, 0.3), m['amber'])                        # yksi kirjain hehkuu yhä
    moss_patch(0, 0, 2.7, 2.5, 1.9, 41, 12, 0.08)
    vines(1.2, 0.2, 0.1, 2.3, (1, 0), 42, 0.9)
    cluster(-1.0, -1.05, 0.0, 3, 0.11, 'orange', 43, light=5)

def kpl05_auto():
    m = M()
    box((0, 0, 0.55), (3.8, 1.65, 0.6), m['carP'])                               # kori
    box((-0.25, 0, 1.12), (2.2, 1.5, 0.55), m['carP'])                           # ohjaamo
    box((0.86, 0, 1.12), (0.04, 1.4, 0.45), m['glassD'], rot=(0, math.radians(-35), 0))
    box((-1.36, 0, 1.12), (0.04, 1.4, 0.45), m['glassD'], rot=(0, math.radians(25), 0))
    for sy in (-0.76, 0.76): box((-0.25, sy, 1.12), (1.9, 0.02, 0.38), m['glassD'])
    for x in (-1.25, 1.25):
        for y in (-0.78, 0.78):
            cyl((x, y, 0.3), 0.34, 0.22, m['tire'], 12, rot=(math.radians(90), 0, 0)).scale = (1, 1, 1)
    box((1.92, 0, 0.6), (0.06, 1.5, 0.2), m['metal']); box((-1.92, 0, 0.55), (0.06, 1.5, 0.2), m['metal'])
    for sy in (-0.55, 0.55): box((1.93, sy, 0.75), (0.04, 0.25, 0.12), m['glassD'])
    moss_patch(-0.25, 0, 1.4, 2.0, 1.4, 51, 10, 0.07)
    moss_patch(1.3, 0, 0.86, 1.0, 1.5, 52, 6, 0.04)
    cluster(-0.4, -0.7, 1.0, 4, 0.14, 'orange', 53, light=8)                    # sienet ikkunasta
    cluster(0.3, 0.7, 0.95, 3, 0.1, 'pink', 54, light=4)
    grass_tufts(0, 0, 4.4, 2.2, 55, 18)

def kpl06_vesisailio():
    m = M()
    for x in (-0.7, 0.7):
        for y in (-0.7, 0.7): rod((x, y, 0), (x * 0.8, y * 0.8, 1.2), 0.05, m['rust'])
    box((0, 0, 1.2), (1.9, 1.9, 0.08), m['rust'])
    cyl((0, 0, 2.05), 0.9, 1.6, m['patina'], 16)
    for z in (1.5, 2.1, 2.7): torus((0, 0, z), 0.91, 0.03, m['copper'])
    cyl((0, 0, 3.05), 0.95, 0.45, m['patina'], 16, r2=0.1)
    rod((0.85, 0, 1.6), (0.85, 0, 0.1), 0.05, m['copper'])                       # vuotava putki
    box((0.85, 0, 0.02), (0.6, 0.5, 0.02), m['water'])
    cluster(0.6, 0.3, 0.0, 4, 0.12, 'cyan', 61, light=5)
    moss_patch(0, 0, 3.15, 0.8, 0.8, 62, 5, 0.05)

def kpl07_aita():
    m = M()
    for x in (-1.5, 0, 1.5): box((x, 0, 0.6), (0.16, 0.16, 1.25), m['woodG'])
    for z in (0.35, 0.95): box((0, 0.07, z), (3.0, 0.06, 0.12), m['wood'])
    rnd = random.Random(71)
    for k in range(18):
        x = -1.42 + k * 0.167
        if k in (6, 7): continue                                                  # aukko
        h = 1.15 if k not in (3, 12) else 0.55 + rnd.random() * 0.2
        box((x, 0.11, h / 2), (0.14, 0.06, h), m['woodG'] if k % 3 else m['wood'], rot=(0, math.radians((rnd.random() - 0.5) * 6), 0))
    vines(0.8, 0.13, 0.1, 1.0, (0, 1), 72, 1.2)
    grass_tufts(0, 0.2, 3.2, 0.6, 73, 20)

def kpl08_sahkokaappi():
    m = M()
    box((0, 0, 0.1), (1.1, 0.5, 0.2), m['concD'])
    box((0, 0, 0.85), (1.0, 0.4, 1.3), m['metal'])
    box((0, -0.05, 1.53), (1.06, 0.48, 0.06), m['metal'])
    box((-0.3, -0.46, 0.85), (0.48, 0.03, 1.2), m['metal'], rot=(0, 0, math.radians(-50)))   # raollaan oleva ovi
    box((0.15, -0.19, 0.85), (0.6, 0.02, 1.1), m['glassD'])
    rnd = random.Random(81)
    for k in range(6):                                                            # hehkuvat rihmat kaapista maahan
        a = Vector((0.1 + rnd.random() * 0.3, -0.22, 0.4 + rnd.random() * 0.8))
        b = Vector((-0.6 + rnd.random() * 1.6, -0.6 - rnd.random() * 1.2, 0.01))
        mid = (a + b) / 2 + Vector((0, -0.1, 0.15))
        rod(a, mid, 0.03, m['thread']); rod(mid, b, 0.03, m['thread'])
    glow_light((0.2, -0.6, 0.5), GLOW['cyan'], 15)
    cluster(0.6, -1.3, 0, 3, 0.08, 'cyan', 82)

def kpl09_pyorateline():
    m = M()
    for k in range(4):
        x = -1.2 + k * 0.8
        rod((x, -0.3, 0), (x, -0.3, 0.7), 0.06, m['metal']); rod((x, 0.3, 0), (x, 0.3, 0.7), 0.06, m['metal'])
        rod((x, -0.3, 0.7), (x, 0.3, 0.7), 0.06, m['metal'])
    # hylätty pyörä nojaa telineeseen
    bx = -0.4
    for y in (-0.55, 0.55): torus((bx, y, 0.34), 0.33, 0.06, m['tire'], rot=(math.radians(90), 0, 0))
    pts = {'r': (bx, -0.55, 0.34), 'f': (bx, 0.55, 0.34), 's': (bx, -0.2, 0.75), 'h': (bx, 0.42, 0.82), 'b': (bx, 0.0, 0.34)}
    for a, b in (('r', 's'), ('s', 'h'), ('b', 's'), ('b', 'h'), ('r', 'b'), ('h', 'f')): rod(pts[a], pts[b], 0.05, m['rust'])
    rod((bx - 0.25, 0.42, 0.85), (bx + 0.25, 0.42, 0.85), 0.02, m['rust'])
    box((bx, -0.2, 0.79), (0.08, 0.2, 0.04), m['tire'])
    rnd = random.Random(91)
    for k in range(14):                                                            # köynnökset kietoutuvat
        t = rnd.random(); a, b = rnd.choice([('r', 's'), ('s', 'h'), ('b', 's')])
        p = Vector(pts[a]).lerp(Vector(pts[b]), t)
        box(p + Vector((rnd.random() * 0.06, 0, 0)), (0.16, 0.16, 0.16), m['vine'])
    grass_tufts(0, 0, 3.0, 1.2, 92, 18)
    cluster(0.8, 0.4, 0, 3, 0.09, 'pink', 93, light=4)

def kpl10_sienirengas():
    m = M()
    cyl((0, 0, 0.02), 1.9, 0.04, m['grass'], 20)
    rnd = random.Random(101)
    for k in range(10):                                                            # rikkoutunut laatoitus reunalla
        a = rnd.random() * 6.28; r = 2.0 + rnd.random() * 0.5
        box((math.cos(a) * r, math.sin(a) * r, 0.03), (0.45, 0.45, 0.06), m['pave'], rot=(0, 0, a + rnd.random()))
    for k in range(11):
        a = k / 11 * 6.28 + rnd.random() * 0.2; r = 1.3 + (rnd.random() - 0.5) * 0.2
        s = 0.12 + rnd.random() * 0.14
        shroom(math.cos(a) * r, math.sin(a) * r, 0.04, s * 1.6, s, 'violet', 6 if k % 3 == 0 else 0, (rnd.random() - 0.5) * 0.4, m)
    for k in range(18):                                                            # leijuvat itiöt
        a = rnd.random() * 6.28; r = rnd.random() * 1.3
        sphere((math.cos(a) * r, math.sin(a) * r, 0.4 + rnd.random() * 1.6), 0.03, m['violet'], seg=6)
    moss_patch(0, 0, 0.04, 1.6, 1.6, 102, 6, 0.03, 'mossD')

# =================== KERROSTALOT ===================
def windows_on(face_c, axis, length, floors, z0, fh, cols, seed, lit=0.18, cyanp=0.03, balcony=None, depth=0.06):
    """Ikkunarivit seinälle. axis: 'x' (seinä kulkee x-suunnassa) tai 'y'. face_c=(x,y) seinän keskikohta pinnassa, normaalin suuntaan."""
    m = M(); rnd = random.Random(seed)
    cx, cy, nx, ny = face_c
    for f in range(floors):
        z = z0 + f * fh + fh * 0.55
        for c in range(cols):
            t = (c + 0.5) / cols - 0.5
            px, py = (cx + t * length, cy) if axis == 'x' else (cx, cy + t * length)
            q = rnd.random(); wm = m['winL'] if q < lit else (m['winC'] if q < lit + cyanp else m['winD'])
            sz = (min(1.3, length / cols * 0.55), depth, 1.25) if axis == 'x' else (depth, min(1.3, length / cols * 0.55), 1.25)
            box((px + nx * 0.02, py + ny * 0.02, z), sz, wm)
            box((px + nx * 0.05, py + ny * 0.05, z - 0.68), (sz[0] + 0.15 if axis == 'x' else 0.1, 0.1 if axis == 'x' else sz[1] + 0.15, 0.08), m['concrete'])
            if balcony and f > 0 and c % balcony[0] == balcony[1]:
                bw = length / cols * 0.9
                bp = (px + nx * 0.6, py + ny * 0.6)
                box((bp[0], bp[1], z0 + f * fh + 0.05), (bw if axis == 'x' else 1.2, 1.2 if axis == 'x' else bw, 0.15), m['concrete'])
                box((bp[0] + nx * 0.58, bp[1] + ny * 0.58, z0 + f * fh + 0.6), (bw if axis == 'x' else 0.06, 0.06 if axis == 'x' else bw, 0.9), m['metal'])
                if rnd.random() < 0.3: moss_patch(bp[0], bp[1], z0 + f * fh + 0.13, 1.0, 1.0, seed + f * 31 + c, 4, 0.12, 'moss')
                if rnd.random() < 0.15: cluster(bp[0], bp[1], z0 + f * fh + 0.13, 3, 0.15, rnd.choice(['cyan', 'pink', 'orange']), seed + c + f * 7, light=10)

def talo_a_lamelli():
    """1960-luvun lamellikerrostalo, 4 kerrosta, parvekkeet."""
    m = M(); L, D, F, FH = 24.0, 10.0, 4, 3.0; Hh = F * FH + 0.6
    box((0, 0, Hh / 2), (L, D, Hh), m['concrete'])
    for k in range(5): box((-L / 2 + 2.4 + k * 4.8, -D / 2 - 0.02, Hh / 2), (0.25, 0.08, Hh), m['concD'])   # elementtisaumat
    windows_on((0, -D / 2, 0, -1), 'x', L, F, 0.3, FH, 10, 201, balcony=(2, 0))
    windows_on((0, D / 2, 0, 1), 'x', L, F, 0.3, FH, 10, 202)
    windows_on((L / 2, 0, 1, 0), 'y', D, F, 0.3, FH, 3, 203)
    windows_on((-L / 2, 0, -1, 0), 'y', D, F, 0.3, FH, 3, 204)
    box((0, 0, Hh + 0.3), (L + 0.2, D + 0.2, 0.6), m['concD'])
    box((0, 0, Hh + 0.62), (L - 0.4, D - 0.4, 0.05), m['asphalt'])
    for x in (-6, 6): box((x, -D / 2 - 0.3, 1.2), (2.0, 0.6, 2.4), m['concD']); box((x, -D / 2 - 0.62, 1.1), (1.0, 0.05, 2.1), m['rust'])  # porraskäytävät
    moss_patch(0, 0, Hh + 0.65, L - 1, D - 1, 205, 22, 0.15)
    vines(L / 2, -D / 2 + 1.5, 0.2, 8.0, (1, 0), 206, 2.0)
    vines(-L / 2 + 3, -D / 2, 0.2, 5.5, (0, -1), 207, 1.6)
    box((0, -D / 2 - 0.02, Hh - 1.0), (L * 0.95, 0.06, 0.5), m['rust'])           # ruostevalumat räystäästä
    cluster(L / 2 - 0.5, -D / 2 - 0.6, 0, 5, 0.25, 'cyan', 208, light=12)

def talo_b_pistetalo():
    """Pistetalo, 8 kerrosta, nurkkaparvekkeet ja masto katolla."""
    m = M(); W, F, FH = 13.0, 8, 3.0; Hh = F * FH + 0.6
    box((0, 0, Hh / 2), (W, W, Hh), m['concrete'])
    box((0, 0, Hh / 2), (W + 0.1, 1.2, Hh), m['concD'])                         # pystynauhat
    box((0, 0, Hh / 2), (1.2, W + 0.1, Hh), m['concD'])
    for i, face in enumerate([(0, -W / 2, 0, -1, 'x'), (0, W / 2, 0, 1, 'x'), (W / 2, 0, 1, 0, 'y'), (-W / 2, 0, -1, 0, 'y')]):
        windows_on(face[:4], face[4], W, F, 0.3, FH, 4, 211 + i, lit=0.15, balcony=(4, 3) if i in (0, 2) else None)
    box((0, 0, Hh + 0.3), (W + 0.2, W + 0.2, 0.6), m['concD'])
    box((0, 0, Hh + 1.6), (4, 3, 2.6), m['concD'])                               # konehuone
    rod((1.5, 1, Hh + 2.9), (1.5, 1, Hh + 9), 0.08, m['metal'])                  # masto
    for z in (Hh + 5, Hh + 7): rod((0.8, 1, z), (2.2, 1, z), 0.04, m['metal'])
    glow_light((1.5, 1, Hh + 9.2), '#e0504a', 8); sphere((1.5, 1, Hh + 9.1), 0.15, mat('punainen', '#e0504a', 0.5, emit='#e0504a', estr=6))
    moss_patch(0, 0, Hh + 0.65, W - 1, W - 1, 215, 18, 0.15)
    vines(-W / 2, -W / 2 + 2, 0.2, 14.0, (-1, 0), 216, 2.5)
    vines(W / 2 - 2, -W / 2, 0.2, 10.0, (0, -1), 217, 2.0)

def talo_c_kivitalo():
    """Vanha kolmikerroksinen kivitalo, katutasossa liiketila, aumakatto."""
    m = M(); L, D, F, FH = 18.0, 11.0, 3, 3.4; Hh = F * FH + 0.4
    box((0, 0, Hh / 2), (L, D, Hh), m['plaster'])
    box((0, -D / 2 - 0.03, 1.8), (L, 0.06, 3.6), m['brick'])                     # tiilinen katutaso
    for k in range(3):                                                             # näyteikkunat
        x = -6 + k * 6
        box((x, -D / 2 - 0.08, 1.7), (3.6, 0.06, 2.4), m['glassD'] if k != 1 else m['winL'])
        box((x, -D / 2 - 0.1, 3.1), (3.9, 0.12, 0.2), m['wood'])
    box((-6, -D / 2 - 0.9, 3.3), (4.2, 1.6, 0.06), m['rust'], rot=(math.radians(-15), 0, 0))   # markiisi
    box((3, -D / 2 - 0.09, 1.2), (1.1, 0.06, 2.3), m['wood'])                     # ovi
    windows_on((0, -D / 2, 0, -1), 'x', L, F - 1, FH + 0.3, FH, 7, 221, lit=0.25, depth=0.1)
    windows_on((L / 2, 0, 1, 0), 'y', D, F, 0.3, FH, 4, 222, lit=0.2, depth=0.1)
    windows_on((-L / 2, 0, -1, 0), 'y', D, F, 0.3, FH, 4, 223, lit=0.2, depth=0.1)
    windows_on((0, D / 2, 0, 1), 'x', L, F, 0.3, FH, 7, 224, lit=0.2, depth=0.1)
    box((0, 0, Hh + 0.15), (L + 0.6, D + 0.6, 0.3), m['wood'])                    # räystäs
    # aumakatto
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, Hh + 0.3))
    o = bpy.context.object; me = o.data
    for v in me.vertices:
        v.co.x *= L + 0.4; v.co.y *= D + 0.4
        if v.co.z > 0: v.co.x *= 0.55; v.co.y *= 0.05; v.co.z = 3.6
        else: v.co.z = 0
    o.data.materials.append(M()['rust']); link(o)
    for x in (-4, 4): box((x, 1.5, Hh + 3.0), (0.8, 0.8, 1.6), m['brick'])        # savupiiput
    moss_patch(0, -D / 4, Hh + 1.2, L * 0.6, D * 0.3, 225, 10, 0.2)
    vines(-L / 2, -D / 2 + 1, 0.2, 9.5, (-1, 0), 226, 3.0)
    vines(L / 2 - 1.5, -D / 2, 3.6, 10.0, (0, -1), 227, 1.4)
    cluster(-6, -D / 2 - 0.6, 0, 4, 0.2, 'pink', 228, light=10)

KIT = [('kpl01_penkki', kpl01_penkki, 'Penkki'), ('kpl02_katulamppu', kpl02_katulamppu, 'Katulamppu'),
       ('kpl03_bussikatos', kpl03_bussikatos, 'Bussikatos'), ('kpl04_kioski', kpl04_kioski, 'Kioski'),
       ('kpl05_auto', kpl05_auto, 'Hylätty auto'), ('kpl06_vesisailio', kpl06_vesisailio, 'Vesisäiliö'),
       ('kpl07_aita', kpl07_aita, 'Aita'), ('kpl08_sahkokaappi', kpl08_sahkokaappi, 'Sähkökaappi'),
       ('kpl09_pyorateline', kpl09_pyorateline, 'Pyöräteline'), ('kpl10_sienirengas', kpl10_sienirengas, 'Sienirengas')]
TALOT = [('talo_a_lamelli', talo_a_lamelli, 'Lamellitalo'), ('talo_b_pistetalo', talo_b_pistetalo, 'Pistetalo'),
         ('talo_c_kivitalo', talo_c_kivitalo, 'Kivitalo')]

# =================== KOHTAUS JA RENDERÖINTI ===================
CAM_ROT = (math.radians(60), 0, math.radians(45))
def setup_scene(world_str=1.0):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    sc = bpy.context.scene
    w = bpy.data.worlds.new('w'); w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = hexc('#2a3a52')
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = world_str * 2.2
    sc.world = w
    sun = bpy.data.lights.new('aurinko', 'SUN'); sun.energy = 3.2; sun.color = hexc('#ffc890')[:3]; sun.angle = math.radians(8)
    so = bpy.data.objects.new('aurinko', sun); so.rotation_euler = (math.radians(50), 0, math.radians(-20)); sc.collection.objects.link(so)
    fill = bpy.data.lights.new('tayte', 'SUN'); fill.energy = 1.1; fill.color = hexc('#8fb0d0')[:3]
    fo = bpy.data.objects.new('tayte', fill); fo.rotation_euler = (math.radians(60), 0, math.radians(45)); sc.collection.objects.link(fo)
    cam = bpy.data.cameras.new('kamera'); cam.type = 'ORTHO'
    co = bpy.data.objects.new('kamera', cam); co.rotation_euler = CAM_ROT; sc.collection.objects.link(co); sc.camera = co
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.filter_width = 0.01; sc.cycles.max_bounces = 5
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0.55
    sc.render.film_transparent = True
    return sc, co

def frame_to(sc, co, ppm, pad=0.6):
    """Kamera ja resoluutio niin, että kaikki näkyy ja 1 metri = ppm pikseliä."""
    bpy.context.view_layer.update()
    R = co.rotation_euler.to_matrix(); Rt = R.transposed()
    xs, ys, pts = [], [], []
    for o in sc.objects:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c); pts.append(p); q = Rt @ p; xs.append(q.x); ys.append(q.y)
    w, h = max(xs) - min(xs) + pad * 2, max(ys) - min(ys) + pad * 2
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    co.location = R @ Vector((cx, cy, 0)) + R @ Vector((0, 0, 200))
    co.data.clip_end = 1000
    sc.render.resolution_x = max(8, int(round(w * ppm))); sc.render.resolution_y = max(8, int(round(h * ppm)))
    co.data.ortho_scale = max(sc.render.resolution_x, sc.render.resolution_y) / ppm

def render_pair(sc, path, samples=96):
    sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.render.filepath = path + '_c.png'; bpy.ops.render.render(write_still=True)
    m = bpy.data.materials.new('id'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    oi = nt.nodes.new('ShaderNodeObjectInfo'); em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(oi.outputs['Random'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    vl = bpy.context.view_layer; vl.material_override = m
    hidden = [o for o in sc.objects if o.type == 'LIGHT']
    for o in hidden: o.hide_render = True
    bg = sc.world.node_tree.nodes['Background'].inputs['Strength']; old = bg.default_value; bg.default_value = 0
    sc.cycles.samples = 1; sc.cycles.use_denoising = False; mb = sc.cycles.max_bounces; sc.cycles.max_bounces = 0
    sc.render.filepath = path + '_id.png'; bpy.ops.render.render(write_still=True)
    vl.material_override = None
    for o in hidden: o.hide_render = False
    bg.default_value = old; sc.cycles.max_bounces = mb

def ground_block(x0, y0, w, d, m):
    box((x0, y0, -0.15), (w, d, 0.3), m)

def build_scene():
    """Katukulma: kaksi taloa kadun varrella, kuja, jalkakäytävä, viherkaista ja kaikki palikat."""
    global ROOT
    m = M(); ROOT = None
    box((0, 0, -0.25), (52, 40, 0.5), m['concD'])                                      # dioraaman pohja
    box((0, -8.5, 0.02), (52, 8, 0.04), m['asphalt'])                                  # katu
    for k in range(9): box((-22 + k * 5.5, -8.5, 0.05), (2.2, 0.18, 0.02), mat('viiva', '#8a8576', 0.9))
    box((0, -3.4, 0.1), (52, 2.2, 0.2), m['pave'])                                    # jalkakäytävät
    box((0, -4.55, 0.1), (52, 0.12, 0.2), m['concrete'])
    box((0, -13.6, 0.1), (52, 2.2, 0.2), m['pave'])
    box((0, -12.45, 0.1), (52, 0.12, 0.2), m['concrete'])
    box((10, -17.3, 0.05), (32, 5.4, 0.1), m['grass'])                               # viherkaista
    grass_tufts(10, -17.3, 31, 5, 300, 50)
    for k, (x, y) in enumerate([(-2, -17.5), (20, -18.2), (24.5, -16.5)]):             # puut
        rod((x, y, 0), (x, y, 2.6), 0.2, m['wood'])
        for j in range(4): sphere((x + (j % 2 - 0.5) * 1.1, y + (j // 2 - 0.5) * 1.1, 3.4 + j * 0.3), 1.3, m['moss'], seg=8)
    for name, fn, loc in [('A', talo_a_lamelli, (-12.5, 6.5, 0)), ('C', talo_c_kivitalo, (14.5, 7.0, 0))]:
        r = new_root(name); fn(); place(r, loc, 0)
    props = [(kpl02_katulamppu, (-19, -4.2, 0.2), 0), (kpl02_katulamppu, (3, -4.2, 0.2), 0), (kpl02_katulamppu, (21, -4.2, 0.2), 0),
             (kpl01_penkki, (-5, -2.9, 0.2), 0), (kpl03_bussikatos, (9, -2.7, 0.2), 0),
             (kpl04_kioski, (-23, -1.0, 0), 0), (kpl05_auto, (-7, -10, 0.05), math.radians(6)),
             (kpl06_vesisailio, (-19, 9, 13.2), 0),
             (kpl07_aita, (2.6, 1.5, 0), math.pi / 2), (kpl07_aita, (2.6, 4.6, 0), math.pi / 2),
             (kpl08_sahkokaappi, (0.6, -1.2, 0), 0), (kpl09_pyorateline, (24.0, -1.5, 0), math.pi / 2),
             (kpl10_sienirengas, (10, -17.3, 0.1), 0)]
    for i, (fn, loc, rot) in enumerate(props):
        r = new_root('p%d' % i); fn(); place(r, loc, rot)
    ROOT = None

if MODE == 'sheet':
    for name, fn, label in KIT + TALOT:
        sc, co = setup_scene(); new_root(name); fn(); globals()['ROOT'] = None
        ppm = 14 if name.startswith('kpl') else 4
        frame_to(sc, co, ppm, 0.4 if ppm > 10 else 1.5)
        render_pair(sc, os.path.join(OUTDIR, name), 64)
        print('VALMIS', name, sc.render.resolution_x, sc.render.resolution_y)
elif MODE == 'scene':
    sc, co = setup_scene(); build_scene()
    ppm = float(argv[2]) if len(argv) > 2 else 6.0
    frame_to(sc, co, ppm, 1.0)
    render_pair(sc, os.path.join(OUTDIR, 'katukulma'), 128)
    print('VALMIS katukulma', sc.render.resolution_x, sc.render.resolution_y)
elif MODE == 'blend':
    for name, fn, label in KIT + TALOT:
        sc, co = setup_scene(); new_root(name); fn(); globals()['ROOT'] = None
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUTDIR, name + '.glb'), export_format='GLB', use_selection=True, export_lights=False)
    sc, co = setup_scene(); build_scene(); frame_to(sc, co, 6.0, 1.0)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUTDIR, 'katukulma.blend'))
    print('VALMIS blend')
else:   # ajettu Blenderin sisällä ilman argumentteja
    sc, co = setup_scene(); build_scene(); frame_to(sc, co, 6.0, 1.0)
