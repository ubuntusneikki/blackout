"""Solmu – isometrisen huoneen tyylitesti.
Aja Blenderissä:  blender --background --python room.py -- <ulos.png> [id]
tai Blenderin Scripting-välilehdellä (silloin kohtaus jää auki muokattavaksi)."""
import bpy, math, sys, random
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
import os
OUT = argv[0] if argv else os.path.join(os.path.expanduser('~'), 'solmu_huone.png')
IDPASS = len(argv) > 1 and argv[1] == 'id'
RES = (192, 176)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
random.seed(4)

# ---------- materiaalit ----------
def hexc(h, a=1.0):
    h = h.lstrip('#'); r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), a)

def mat(name, col, rough=0.8, metal=0.0, emit=None, estr=0.0, trans=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(col)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if trans: b.inputs['Transmission Weight'].default_value = trans; b.inputs['IOR'].default_value = 1.2
    if emit: b.inputs['Emission Color'].default_value = hexc(emit); b.inputs['Emission Strength'].default_value = estr
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    return m

def brick_mat(name, c1, c2, mortar, scale=6.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.9
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.inputs['Color1'].default_value = hexc(c1); br.inputs['Color2'].default_value = hexc(c2)
    br.inputs['Mortar'].default_value = hexc(mortar); br.inputs['Scale'].default_value = scale
    br.inputs['Mortar Size'].default_value = 0.025
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['Object'], br.inputs['Vector'])
    nt.links.new(br.outputs['Color'], b.inputs['Base Color'])
    return m

M = {
  'brick':  brick_mat('tiili', '#4a3330', '#33242a', '#1a1214', 5.0),
  'floor':  brick_mat('lattia', '#5a4030', '#4a3426', '#2a1d16', 3.0),
  'wood':   mat('puu', '#6a4a30', 0.85),
  'woodD':  mat('puuT', '#45301f', 0.9),
  'copper': mat('kupari', '#c87a3e', 0.35, 1.0),
  'metal':  mat('metalli', '#2c3a4a', 0.5, 0.8),
  'metalD': mat('metalliT', '#1a222c', 0.6, 0.6),
  'glass':  mat('lasi', '#cfeff2', 0.04, 0.0, trans=1.0),
  'soil':   mat('multa', '#2a1d16', 1.0),
  'moss':   mat('sammal', '#3f6a26', 1.0),
  'stem':   mat('jalka', '#d9ccaa', 0.7),
  'cork':   mat('korkki', '#8a6a48', 1.0),
  'lampE':  mat('lamppu', '#ffcf7a', 0.5, emit='#ffcf7a', estr=12),
  'sky':    mat('taivas', '#7a4a5a', 1.0, emit='#c86a5a', estr=1.5),
  'skyT':   mat('taivasY', '#1b2a4a', 1.0, emit='#3a4a7e', estr=1.2),
  'ledG':   mat('ledV', '#6ae07a', 0.5, emit='#6ae07a', estr=6),
  'ledA':   mat('ledA', '#e8a02a', 0.5, emit='#e8a02a', estr=6),
  'rackIn': mat('kaappiS', '#2e1c20', 1.0, emit='#5a1e14', estr=0.6),
}
STRAINS = {
  'cyan':   ('#34b8ac', '#a8fbee'),
  'pink':   ('#c4428f', '#ffa6d6'),
  'orange': ('#d9702a', '#ffc46a'),
  'violet': ('#8a4ad0', '#d6b0ff'),
}
for k, (c, e) in STRAINS.items():
    M['cap_' + k] = mat('lakki_' + k, c, 0.5, emit=c, estr=2.2)

# ---------- apurit ----------
def box(name, loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); return o

def cyl(name, loc, r, d, m, verts=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o

def cap(name, loc, r, h, m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=r, location=loc)
    o = bpy.context.object; o.name = name
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for v in o.data.vertices:
        if v.co.z < -0.0001: v.select = True
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
    o.scale = (1, 1, h / r); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); return o

def mushroom(x, y, z, h, r, strain, light=True):
    cyl('jalka', (x, y, z + h / 2), r * 0.18, h, M['stem'], 8)
    cap('lakki', (x, y, z + h), r, r * 0.55, M['cap_' + strain])
    if light:
        L = bpy.data.lights.new('hehku', 'POINT'); L.energy = 40 * r; L.color = hexc(STRAINS[strain][1])[:3]
        L.shadow_soft_size = 0.05
        lo = bpy.data.objects.new('hehku', L); lo.location = (x, y, z + h + r * 0.4); sc.collection.objects.link(lo)

def shelf_fungus(x, y, z, r, strain, face=(1, 0)):
    o = cap('kaapa', (x, y, z), r, r * 0.35, M['cap_' + strain])
    o.rotation_euler = (0, 0, math.atan2(face[1], face[0]))

def glass_box(cx, cy, z0, w, d, h, frame=M['copper']):
    box('lasi', (cx, cy, z0 + h / 2), (w, d, h), M['glass'])
    t = 0.035
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('runko', (cx + sx * w / 2, cy + sy * d / 2, z0 + h / 2), (t, t, h + t), frame)
    for z in (z0, z0 + h):
        for sy in (-1, 1): box('runko', (cx, cy + sy * d / 2, z), (w + t, t, t), frame)
        for sx in (-1, 1): box('runko', (cx + sx * w / 2, cy, z), (t, d + t, t), frame)

# ---------- huone (aukileikattu nurkka) ----------
R = 2.8
box('lattia', (0, 0, -0.05), (R, R, 0.1), M['floor'])
box('seinaV', (-R / 2 - 0.05, 0, 1.25), (0.1, R, 2.5), M['brick'])
box('seinaO', (0, R / 2 + 0.05, 1.25), (R, 0.1, 2.5), M['brick'])
# ikkuna takaseinässä
box('ikkunaK', (0.65, R / 2 - 0.0, 1.55), (1.0, 0.14, 0.8), M['copper'])
box('ikkunaT', (0.65, R / 2 - 0.02, 1.55), (0.88, 0.14, 0.68), M['sky'])
box('ikkunaY', (0.65, R / 2 - 0.03, 1.73), (0.88, 0.14, 0.32), M['skyT'])
box('ikkunaP', (0.65, R / 2 - 0.08, 1.55), (0.03, 0.06, 0.68), M['copper'])
# kaupungin siluetti ikkunassa
for i, (bx, bh) in enumerate([(0.3, 0.25), (0.46, 0.4), (0.62, 0.18), (0.78, 0.33), (0.95, 0.22)]):
    box('talo', (bx, R / 2 - 0.09, 1.21 + bh / 2), (0.13, 0.02, bh), M['metalD'])

# hylly vasemmalla seinällä
for z in (0.55, 1.25):
    box('hylly', (-R / 2 + 0.3, -0.1, z), (0.5, 2.2, 0.06), M['wood'])
for y in (-1.15, 0.95):
    box('tolppa', (-R / 2 + 0.52, y, 0.7), (0.05, 0.05, 1.4), M['woodD'])

# terraario ylähyllyllä
tx, ty, tz = -R / 2 + 0.3, 0.35, 1.28
glass_box(tx, ty, tz, 0.4, 0.7, 0.5)
box('multa', (tx, ty, tz + 0.05), (0.38, 0.68, 0.1), M['soil'])
box('sammal', (tx, ty, tz + 0.105), (0.38, 0.68, 0.01), M['moss'])
mushroom(tx, ty + 0.05, tz + 0.1, 0.28, 0.12, 'cyan')
mushroom(tx + 0.05, ty - 0.2, tz + 0.1, 0.16, 0.07, 'cyan', False)
mushroom(tx - 0.08, ty + 0.25, tz + 0.1, 0.1, 0.05, 'cyan', False)

# lasipurkit ylähyllyllä
for i, (y, s) in enumerate([(-0.45, 'pink'), (-0.85, 'violet')]):
    jx = -R / 2 + 0.3
    cyl('purkki', (jx, y, 1.28 + 0.17), 0.13, 0.34, M['glass'], 16)
    cyl('korkki', (jx, y, 1.28 + 0.37), 0.09, 0.06, M['cork'], 12)
    cyl('multa', (jx, y, 1.28 + 0.04), 0.12, 0.08, M['soil'], 16)
    mushroom(jx, y, 1.36, 0.12, 0.06, s)
    mushroom(jx + 0.04, y - 0.05, 1.36, 0.07, 0.04, s, False)

# alahyllyllä akvaario
ax, ay, az = -R / 2 + 0.3, -0.25, 0.58
glass_box(ax, ay, az, 0.42, 0.9, 0.45, M['metal'])
water = mat('vesi', '#1d6a78', 0.1, emit='#1d6a78', estr=0.6, trans=0.6)
box('vesi', (ax, ay, az + 0.17), (0.4, 0.88, 0.32), water)
box('pohja', (ax, ay, az + 0.03), (0.4, 0.88, 0.06), M['soil'])
mushroom(ax, ay + 0.2, az + 0.06, 0.2, 0.08, 'orange')

# palvelinkaappi lattialla takaseinää vasten
rx, ry = -0.35, R / 2 - 0.4
box('kaappi', (rx, ry, 0.9), (0.6, 0.6, 1.8), M['metalD'])
box('kaappiS', (rx, ry - 0.31, 0.9), (0.5, 0.02, 1.6), M['rackIn'])
for k in range(7):
    box('led', (rx + 0.22, ry - 0.33, 0.25 + k * 0.22), (0.03, 0.02, 0.03), M['ledG'] if k % 3 else M['ledA'])
for k, z in enumerate([0.55, 0.85, 1.15, 1.4]):
    shelf_fungus(rx - 0.18 + (k % 2) * 0.1, ry - 0.33, z, 0.09 + 0.03 * (k % 2), 'orange', (0, -1))
L = bpy.data.lights.new('kaappiV', 'POINT'); L.energy = 8; L.color = hexc('#ffc46a')[:3]
lo = bpy.data.objects.new('kaappiV', L); lo.location = (rx, ry - 0.5, 0.9); sc.collection.objects.link(lo)

# työpöytä ja kupariputki
box('poyta', (0.7, 0.5, 0.75), (1.0, 0.6, 0.06), M['wood'])
for sx in (-1, 1):
    for sy in (-1, 1): box('jalka', (0.7 + sx * 0.45, 0.5 + sy * 0.25, 0.37), (0.05, 0.05, 0.74), M['woodD'])
box('laatikko', (0.95, 0.5, 0.9), (0.3, 0.3, 0.25), M['woodD'])
mushroom(0.5, 0.45, 0.78, 0.09, 0.05, 'cyan')
cyl('putki', (-R / 2 + 0.1, 0.0, 2.15), 0.04, R, M['copper'], 10, rot=(math.pi / 2, 0, 0))
cyl('putki2', (0.0, R / 2 - 0.1, 2.15), 0.04, R, M['copper'], 10, rot=(0, math.pi / 2, 0))
cyl('putkiA', (-R / 2 + 0.3, 0.35, 1.97), 0.03, 0.36, M['copper'], 10)

# sammalta nurkissa
for i in range(40):
    a = random.random(); x = -R / 2 + 0.05 + random.random() * 0.6 * a; y = R / 2 - 0.05 - random.random() * 0.8
    box('sammal', (x, y, 0.01), (0.08, 0.08, 0.02 + random.random() * 0.03), M['moss'])
for i in range(16):
    box('sammalS', (-R / 2 + 0.005, -1.4 + random.random() * 0.9, random.random() * 0.5), (0.02, 0.1, 0.08), M['moss'])

# riippuva lamppu
cyl('johto', (0.7, 0.5, 2.3), 0.008, 0.6, M['metalD'], 6)
cyl('varjostin', (0.7, 0.5, 1.95), 0.15, 0.1, M['copper'], 14)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, location=(0.7, 0.5, 1.88)); bpy.context.object.data.materials.append(M['lampE'])
L = bpy.data.lights.new('lamppu', 'POINT'); L.energy = 120; L.color = hexc('#ffcf7a')[:3]; L.shadow_soft_size = 0.2
lo = bpy.data.objects.new('lamppu', L); lo.location = (0.7, 0.5, 1.8); sc.collection.objects.link(lo)

L = bpy.data.lights.new('ikkunaV', 'AREA'); L.energy = 40; L.size = 0.9; L.color = hexc('#c88a9a')[:3]
lo = bpy.data.objects.new('ikkunaV', L); lo.location = (0.65, R / 2 - 0.2, 1.55); lo.rotation_euler = (math.radians(90), 0, 0); sc.collection.objects.link(lo)

# ---------- maailma, kamera, renderöinti ----------
w = bpy.data.worlds.new('w'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = hexc('#1c3040')
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 2.2
sc.world = w

cam = bpy.data.cameras.new('kamera'); cam.type = 'ORTHO'; cam.ortho_scale = 4.3
co = bpy.data.objects.new('kamera', cam); sc.collection.objects.link(co)
# isometrinen (2:1) kulma: 60° kallistus, 45° kierto. Katsotaan huoneen avointa nurkkaa kohti.
co.rotation_euler = (math.radians(60), 0, math.radians(45))
d = 10; co.location = Vector((0, 0, 0.9)) + co.rotation_euler.to_matrix() @ Vector((0, 0, d))
sc.camera = co

sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = 2 if IDPASS else 160
sc.cycles.use_denoising = not IDPASS
sc.cycles.filter_width = 0.01          # ei reunojen pehmennystä: terävät pikselit
sc.cycles.max_bounces = 6
sc.render.resolution_x, sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0.9
sc.render.film_transparent = True

if IDPASS:  # kohdetunnisteet ääriviivoja varten
    m = bpy.data.materials.new('id'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    oi = nt.nodes.new('ShaderNodeObjectInfo'); em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(oi.outputs['Random'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    bpy.context.view_layer.material_override = m
    for o in sc.objects:
        if o.type == 'LIGHT': o.hide_render = True
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    sc.cycles.max_bounces = 0

sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('VALMIS', OUT)
