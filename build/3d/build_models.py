# -*- coding: utf-8 -*-
"""
build_models.py â€” VyGo fleet GLB builder (Blender 4.2.x, headless).

Builds two upgraded bus models procedurally and exports GLB:
  - --bus=yutong-c12  -> output/yutong-c12.glb  ("Yutong T12" premium touring coach)
  - --bus=viking      -> output/viking.glb      (Lanka Ashok Leyland Viking, SLTB-style)

App convention (BusInterior3D.jsx / fleetVariants.js):
  - Scene units = METERS. Floor Y = 0. Front = -Z. Centered on X.
  - GLB authored Y-up and exported with export_yup=False (no axis swap), so the
    final file is exactly in app units => variant transforms become identity.
  - Loader "environment strip" rule honored: every MESH world bbox diagonal must
    stay < 8 m (BusInterior3D strips meshes whose diag > max(median*1.5, 8); the
    cutoff floor is 8). Bodies are split into 3 loft chunks; all parts are well
    under the limit. No stage / backdrop / light-rig / collider meshes at all.
  - Materials: plain Principled BSDF only -> tiny self-contained GLB.
"""
import bpy
import bmesh
import sys
import os
from math import radians, pi, sin, cos
from mathutils import Vector, Euler

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
BUS = 'yutong-c12'
for a in sys.argv:
    if a.startswith('--bus='):
        BUS = a.split('=', 1)[1].strip()
if BUS not in ('yutong-c12', 'viking'):
    BUS = 'yutong-c12'

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, 'output')
os.makedirs(OUTDIR, exist_ok=True)
OUT_PATH = os.path.join(OUTDIR, BUS + '.glb').replace('\\', '/')
ROOT_NAME = 'YutongT12' if BUS == 'yutong-c12' else 'Viking'


def log(*a):
    print('[3DBUILD]', *a, flush=True)


# ---------------------------------------------------------------------------
# Scene bootstrap
# ---------------------------------------------------------------------------
def reset_scene():
    if bpy.context.scene:
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
    for blk in list(bpy.data.objects):
        bpy.data.objects.remove(blk, do_unlink=True)
    for blk in list(bpy.data.meshes):
        bpy.data.meshes.remove(blk)
    for blk in list(bpy.data.materials):
        bpy.data.materials.remove(blk)
    bpy.context.scene.name = ROOT_NAME


reset_scene()

# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------
MATS = {}


def mat(name, col=(0.75, 0.75, 0.75), rough=0.5, metal=0.0,
        emit=(0, 0, 0), ei=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (col[0], col[1], col[2], 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if ei > 0:
        bsdf.inputs['Emission Color'].default_value = (emit[0], emit[1], emit[2], 1.0)
        bsdf.inputs['Emission Strength'].default_value = ei
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    MATS[name] = m
    return m


# ---------------------------------------------------------------------------
# Geometry core
# ---------------------------------------------------------------------------
def xfrm(bm, size=(1, 1, 1), pos=(0, 0, 0), rot=(0, 0, 0)):
    sx, sy, sz = size
    mrot = Euler(rot, 'XYZ').to_matrix()
    tpos = Vector(pos)
    for v in bm.verts:
        c = v.co
        v.co = mrot @ Vector((c.x * sx, c.y * sy, c.z * sz)) + tpos


def add_obj(name, matname, bm, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    if matname:
        obj.data.materials.append(MATS[matname])
    if smooth:
        for f in obj.data.polygons:
            f.use_smooth = True
    # Auto-smooth via Edge Split (evaluated at export): smooth faces keep their
    # averaged normals, hard edges > angle get crisp shading.
    sm = obj.modifiers.new('VygoAutoSmooth', 'EDGE_SPLIT')
    sm.split_angle = radians(38)
    sm.use_edge_angle = True
    sm.use_edge_sharp = False
    return obj


def box(name, matname, w, h, d, x=0, y=0, z=0, rx=0, ry=0, rz=0, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    xfrm(bm, (w, h, d), (x, y, z), (rx, ry, rz))
    return add_obj(name, matname, bm, smooth)


def cyl(name, matname, radius, depth, seg=20, x=0, y=0, z=0, rx=0, ry=0, rz=0,
        smooth=True, cap=True):
    """Cylinder with axis along +Y in bmesh space; caller rotates via rot."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg,
                          radius1=1.0, radius2=1.0, depth=1.0)
    xfrm(bm, (radius, depth, radius), (x, y, z), (rx, ry, rz))
    return add_obj(name, matname, bm, smooth)


def loft(name, matname, stations, zshift=0.0, close_lo=False, close_hi=False):
    """stations: ordered [(z, [(x, y), ...]), ...]. zshift offsets the FIRST ring
    along its own axis (used at shared chunk seams to avoid z-fighting)."""
    bm = bmesh.new()
    rings = []
    for i, (z, pts) in enumerate(stations):
        zz = z + (zshift if i == 0 else 0.0)
        ring = [bm.verts.new(Vector((px, py, zz))) for (px, py) in pts]
        rings.append(ring)
    n = len(rings[0])
    for i in range(len(rings) - 1):
        ra, rb = rings[i], rings[i + 1]
        midz = (stations[i][0] + stations[i + 1][0]) * 0.5
        center = Vector((0.0, 1.75, midz))
        for j in range(n):
            j2 = (j + 1) % n
            try:
                f = bm.faces.new((ra[j], ra[j2], rb[j2], rb[j]))
            except ValueError:
                continue
            fc = f.calc_center_median()
            if f.normal.dot(fc - center) < 0:
                f.normal_flip()
    if close_lo:
        f0 = bm.faces.new(rings[0])
        if f0.normal.z > 0:
            f0.normal_flip()
    if close_hi:
        f1 = bm.faces.new(rings[-1])
        if f1.normal.z < 0:
            f1.normal_flip()
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    return add_obj(name, matname, bm)


# ---------------------------------------------------------------------------
# Cross-section rings (x, y-up)
# ---------------------------------------------------------------------------
def ring_yutong(w2, top, floor=0.055):
    return [
        (-w2, floor),
        (-w2 * 0.985, 0.75),
        (-w2 * 1.012, 1.60),
        (-w2 * 1.018, 2.30),
        (-w2 * 1.005, 2.85),
        (-w2 * 0.980, 3.10),
        (-w2 * 0.840, 3.25),
        (-w2 * 0.600, 3.30),
        (-w2 * 0.320, 3.32),
        (0.0, top),
        (w2 * 0.320, 3.32),
        (w2 * 0.600, 3.30),
        (w2 * 0.840, 3.25),
        (w2 * 0.980, 3.10),
        (w2 * 1.005, 2.85),
        (w2 * 1.018, 2.30),
        (w2 * 1.012, 1.60),
        (w2 * 0.985, 0.75),
        (w2, floor),
    ]


def ring_viking(w, top, floor=0.32):
    return [
        (-w, floor),
        (-w * 0.998, 1.35),
        (-w * 1.010, 2.35),
        (-w * 0.985, 2.75),
        (-w * 0.900, 2.90),
        (-w * 0.600, 3.00),
        (-w * 0.300, 3.02),
        (0.0, top),
        (w * 0.300, 3.02),
        (w * 0.600, 3.00),
        (w * 0.900, 2.90),
        (w * 0.985, 2.75),
        (w * 1.010, 2.35),
        (w * 0.998, 1.35),
        (w, floor),
    ]


def stations_yutong(w2=1.262, top=3.30):
    out = []
    for k in range(19):
        z = -6.35 + k * 0.7
        t = 0.0
        if z < -4.6:
            t = min(1.0, (-4.6 - z) / 1.75)
        elif z > 5.6:
            t = min(1.0, (z - 5.6) / 0.65) * 0.05
        ww = w2 * (1.0 - 0.09 * t)
        yy = top * (1.0 - 0.02 * t)
        out.append((z, ring_yutong(ww, yy)))
    return out


def stations_viking():
    zs = [-5.7, -5.1, -4.5, -3.95, -3.45, -3.0, -2.6, -1.9, -1.2, -0.5,
          0.2, 0.9, 1.6, 2.3, 3.0, 3.7, 4.4, 5.1, 5.8]
    tops = [0.62, 0.62, 0.68, 1.10, 2.00, 3.00, 3.02, 3.02, 3.02, 3.02,
            3.02, 3.02, 3.02, 3.02, 3.02, 3.02, 3.02, 3.02, 3.02]
    ws = [1.02, 1.05, 1.10, 1.16, 1.20, 1.215, 1.215, 1.215, 1.215, 1.215,
          1.215, 1.215, 1.215, 1.215, 1.215, 1.215, 1.215, 1.215, 1.215]
    return [(z, ring_viking(w, tp)) for z, tp, w in zip(zs, tops, ws)]


# ---------------------------------------------------------------------------
# Wheel (tire + chrome rim + spokes + hub + cap) â€” axis along X
# ---------------------------------------------------------------------------
def wheel(prefix, x, z, r=0.53, depth=0.30, rim=0.44):
    # tire
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=22, radius1=1.0, radius2=1.0, depth=1.0)
    xfrm(bm, (r, depth, r), (x, r, z), (0, 0, -pi / 2))
    add_obj(prefix + '_Tyre', 'WheelTyre', bm)
    # chrome rim
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=20,
                          radius1=1.0, radius2=1.0, depth=1.0)
    xfrm(bm, (rim, depth - 0.04, rim), (x, r, z), (0, 0, -pi / 2))
    add_obj(prefix + '_Rim', 'WheelRim', bm)
    # spokes (6 radial bars, one mesh)
    bm = bmesh.new()
    for k in range(6):
        a = k * pi / 3
        bmesh.ops.create_cube(bm, size=1.0)
        xfrm(bm, (0.06, 0.20, 0.05), (x, r + 0.26 * sin(a), z + 0.26 * cos(a)),
             (a, 0, 0))
    add_obj(prefix + '_Spokes', 'WheelRim', bm)
    # hub
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=16,
                          radius1=1.0, radius2=1.0, depth=1.0)
    xfrm(bm, (0.13, 0.07, 0.13), (x, r, z), (0, 0, -pi / 2))
    add_obj(prefix + '_Hub', 'WheelHub', bm)
    # cap
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=14,
                          radius1=1.0, radius2=1.0, depth=1.0)
    xfrm(bm, (0.08, 0.06, 0.08), (x + 0.02, r, z), (0, 0, -pi / 2))
    add_obj(prefix + '_Cap', 'WheelCap', bm)


# ---------------------------------------------------------------------------
# YUTONG T12 â€” 12 m premium touring coach
# ---------------------------------------------------------------------------
def build_yutong():
    log('building YUTONG T12 ...')
    mat('PaintGreen', (0.062, 0.45, 0.34), rough=0.32, metal=0.55)
    mat('PaintDarkGreen', (0.035, 0.26, 0.20), rough=0.40, metal=0.50)
    mat('PaintRoof', (0.13, 0.14, 0.16), rough=0.70)
    mat('GoldStripe', (0.83, 0.63, 0.20), rough=0.30, metal=0.90)
    mat('SilverTrim', (0.78, 0.80, 0.85), rough=0.30, metal=0.85)
    mat('DarkPlastic', (0.10, 0.11, 0.13), rough=0.45, metal=0.05)
    mat('DarkRubber', (0.04, 0.04, 0.05), rough=0.92)
    mat('Chrome', (0.90, 0.92, 0.95), rough=0.12, metal=0.98)
    mat('ChromeDark', (0.52, 0.55, 0.60), rough=0.30, metal=0.95)
    mat('Glass', (0.05, 0.09, 0.11), rough=0.08, metal=0.70, alpha=0.92)
    mat('GlassWindshield', (0.07, 0.12, 0.14), rough=0.06, metal=0.65, alpha=0.90)
    mat('GlassLight', (0.24, 0.33, 0.40), rough=0.10, metal=0.50, alpha=0.85)
    mat('GlassDoor', (0.05, 0.09, 0.12), rough=0.08, metal=0.70, alpha=0.84)
    mat('DoorSeam', (0.02, 0.03, 0.04), rough=0.80)
    mat('GlassMirror', (0.22, 0.30, 0.40), rough=0.05, metal=0.95, alpha=0.90)
    mat('HeadLamp', (0.95, 0.98, 1.00), rough=0.15, metal=0.20,
        emit=(0.90, 1.00, 1.00), ei=2.4)
    mat('LEDStrip', (1.0, 1.0, 1.0), rough=0.20, metal=0.10,
        emit=(1.0, 1.0, 1.0), ei=3.2)
    mat('Indicator', (1.0, 0.60, 0.10), rough=0.30, emit=(1.0, 0.62, 0.10), ei=1.8)
    mat('Tail', (0.85, 0.07, 0.07), rough=0.20, emit=(1.0, 0.10, 0.08), ei=2.2)
    mat('TailAmber', (1.0, 0.50, 0.10), rough=0.20, emit=(1.0, 0.50, 0.10), ei=1.6)
    mat('Reverse', (0.93, 0.96, 1.00), rough=0.20, emit=(0.90, 0.95, 1.00), ei=1.4)
    mat('WheelTyre', (0.045, 0.045, 0.05), rough=0.95)
    mat('WheelRim', (0.82, 0.84, 0.90), rough=0.14, metal=0.95)
    mat('WheelHub', (0.30, 0.32, 0.36), rough=0.30, metal=0.85)
    mat('WheelCap', (0.88, 0.90, 0.95), rough=0.10, metal=0.98)
    mat('Plate', (0.93, 0.95, 0.98), rough=0.40, metal=0.10)
    mat('Badge', (1.0, 1.0, 1.0), rough=0.30, metal=0.40)
    mat('Underbelly', (0.06, 0.06, 0.08), rough=0.90)
    mat('Vent', (0.12, 0.13, 0.15), rough=0.70, metal=0.15)

    # -- body: 3 loft chunks (each well under the 8 m strip limit) ----------
    st = stations_yutong()
    loft('BodyFront', 'PaintGreen', st[0:8], close_lo=True)
    loft('BodyMid', 'PaintGreen', st[6:13], zshift=0.0025)
    loft('BodyRear', 'PaintGreen', st[12:19], zshift=0.0025, close_hi=True)

    # roof deck
    for k, (z0, z1) in enumerate(((-6.3, -0.6), (-0.6, 6.2))):
        box('RoofDeck_%d' % k, 'PaintRoof', 0.12, 0.03, z1 - z0, 0.0, 3.295,
            (z0 + z1) / 2)

    # underbody shadow skirt (chunked)
    for k, (z0, z1) in enumerate(((-6.3, -1.5), (-1.5, 3.3), (3.3, 6.3))):
        box('Underbody_%d' % k, 'Underbelly', 1.85, 0.16, z1 - z0, 0.0, 0.26,
            (z0 + z1) / 2)
    # side skirt panels between wheels
    for s in (-1.0, 1.0):
        for k, (z0, z1) in enumerate(((-6.2, -4.25), (-2.4, 0.9), (0.9, 2.7),
                                      (3.4, 6.2))):
            box('Skirt_%s_%d' % ('L' if s < 0 else 'R', k), 'DarkPlastic',
                0.28, 0.46, z1 - z0, s * 1.17, 0.58, (z0 + z1) / 2)

    # -- side windows (8 per side) + pillars --------------------------------
    zc = [-4.55 + i * 1.24 for i in range(8)]
    for i, z in enumerate(zc):
        for s in (-1.0, 1.0):
            box('GlassWin_%s_%d' % ('L' if s < 0 else 'R', i), 'Glass',
                0.055, 0.78, 1.0, s * 1.24, 2.28, z)
    for i in range(len(zc) - 1):
        zm = (zc[i] + zc[i + 1]) / 2
        for s in (-1.0, 1.0):
            box('Pillar_%s_%d' % ('L' if s < 0 else 'R', i), 'PaintGreen',
                0.10, 0.66, 0.16, s * 1.25, 2.30, zm)
    for zz, nm in ((-5.0, 'Front'), (5.25, 'Rear')):
        for s in (-1.0, 1.0):
            box('Pillar%s_%s' % (nm, 'L' if s < 0 else 'R'), 'PaintGreen',
                0.10, 0.66, 0.12, s * 1.25, 2.30, zz)

    # -- windshield (raked two-piece) ---------------------------------------
    for s in (-1.0, 1.0):
        box('Windshield_%s' % ('L' if s < 0 else 'R'), 'GlassWindshield',
            1.00, 1.42, 0.05, s * 0.72, 2.05, -5.75, rx=0.38)
    box('WindshieldDivider', 'Chrome', 0.06, 1.50, 0.06, 0.0, 2.05, -5.35, rx=0.38)
    box('WindshieldTrim', 'PaintRoof', 2.10, 0.06, 0.06, 0.0, 2.95, -5.10, rx=0.38)
    for s in (-1.0, 1.0):
        box('APillar_%s' % ('L' if s < 0 else 'R'), 'PaintDarkGreen',
            0.09, 1.55, 0.09, s * 1.17, 2.10, -5.15, rx=0.38)

    # -- front fascia -------------------------------------------------------
    box('Bumper', 'PaintDarkGreen', 2.48, 0.42, 0.14, 0.0, 0.50, -6.42)
    box('BumperLip', 'DarkRubber', 2.30, 0.08, 0.10, 0.0, 0.22, -6.42)
    box('Grille', 'Chrome', 1.55, 0.34, 0.06, 0.0, 0.72, -6.46)
    for k in range(3):
        box('GrilleSlat_%d' % k, 'DarkPlastic', 1.40, 0.04, 0.02, 0.0,
            0.62 + k * 0.09, -6.48)
    box('BadgeFront', 'Badge', 0.40, 0.14, 0.02, 0.0, 0.72, -6.44)
    for s in (-1.0, 1.0):
        box('HeadHousing_%s' % ('L' if s < 0 else 'R'), 'DarkPlastic',
            0.62, 0.34, 0.10, s * 0.74, 1.12, -6.44)
        box('HeadLamp_%s' % ('L' if s < 0 else 'R'), 'HeadLamp',
            0.50, 0.18, 0.03, s * 0.74, 1.16, -6.45)
        box('LED_%s' % ('L' if s < 0 else 'R'), 'LEDStrip',
            0.44, 0.045, 0.015, s * 0.74, 0.98, -6.45)
        box('Indicator_%s' % ('L' if s < 0 else 'R'), 'Indicator',
            0.14, 0.16, 0.04, s * 1.05, 1.12, -6.43)
        box('Fog_%s' % ('L' if s < 0 else 'R'), 'HeadLamp',
            0.16, 0.12, 0.04, s * 0.62, 0.32, -6.43)
    for k in range(3):
        box('BumperVent_%d' % k, 'DarkPlastic', 0.30, 0.06, 0.03,
            -0.66 + k * 0.14, 0.42, -6.46)
    box('PlateFront', 'Plate', 0.52, 0.13, 0.02, 0.0, 0.42, -6.46)

    # -- tail ---------------------------------------------------------------
    for s in (-1.0, 1.0):
        box('TailLamp_%s' % ('L' if s < 0 else 'R'), 'Tail', 0.50, 0.08, 0.06,
            s * 0.62, 1.55, 6.30)
        box('TailLamp2_%s' % ('L' if s < 0 else 'R'), 'Tail', 0.36, 0.05, 0.06,
            s * 0.58, 1.70, 6.30)
        box('ReverseTail_%s' % ('L' if s < 0 else 'R'), 'Reverse', 0.14, 0.05,
            0.05, s * 0.50, 1.38, 6.30)
        box('TailAmber_%s' % ('L' if s < 0 else 'R'), 'TailAmber', 0.30, 0.04,
            0.05, s * 0.62, 1.15, 6.30)
    box('RearBumper', 'PaintDarkGreen', 2.40, 0.24, 0.10, 0.0, 0.44, 6.40)
    box('RearPlate', 'Plate', 0.50, 0.13, 0.02, 0.0, 0.35, 6.34)
    box('RearDeck', 'DarkPlastic', 1.90, 0.50, 0.08, 0.0, 1.00, 6.28)
    for k in range(4):
        box('EngineSlat_%d' % k, 'Chrome', 1.70, 0.02, 0.03, 0.0,
            1.05 + k * 0.07, 6.25)

    # -- roof -----------------------------------------------------------------
    box('AC_Pod', 'PaintRoof', 1.32, 0.34, 4.40, 0.0, 3.63, -0.30)
    box('AC_Lid', 'Vent', 1.20, 0.03, 4.20, 0.0, 3.81, -0.30)
    box('AC_Intake', 'Vent', 1.10, 0.06, 0.55, 0.0, 3.84, -2.35)
    box('AC_Exhaust', 'Vent', 1.10, 0.05, 0.40, 0.0, 3.84, 1.55)

# -- side trim lines (segmented so each mesh diag stays < 8 m strip cap) ----
    for s in (-1.0, 1.0):
        for k, (z0, z1) in enumerate(((-6.3, -2.1), (-2.1, 2.1), (2.1, 6.3))):
            box('LineSilver_%s_%d' % ('L' if s < 0 else 'R', k), 'SilverTrim',
                0.02, 0.02, z1 - z0, s * 1.28, 0.62, (z0 + z1) / 2)
        for k, (z0, z1) in enumerate(((-5.3, -1.8), (-1.8, 1.8), (1.8, 5.3))):
            box('LineGold_%s_%d' % ('L' if s < 0 else 'R', k), 'GoldStripe',
                0.015, 0.025, z1 - z0, s * 1.285, 0.32, (z0 + z1) / 2)

    # -- wipers ------------------------------------------------------------------
    for s in (-1.0, 1.0):
        box('Wiper_%s' % ('L' if s < 0 else 'R'), 'DarkPlastic', 0.02, 0.02, 0.55,
            s * 0.60, 1.35, -5.05, rx=0.38)

    # -- mirrors ---------------------------------------------------------------
    for s in (-1.0, 1.0):
        box('MirrorArm_%s' % ('L' if s < 0 else 'R'), 'DarkPlastic', 0.03, 0.04,
            0.50, s * 1.45, 2.05, -5.05, ry=0.35 if s < 0 else -0.35)
        box('MirrorHousing_%s' % ('L' if s < 0 else 'R'), 'PaintDarkGreen',
            0.20, 0.16, 0.12, s * 1.72, 2.12, -4.90)
        box('MirrorGlass_%s' % ('L' if s < 0 else 'R'), 'GlassMirror', 0.16, 0.12,
            0.02, s * 1.72, 2.12, -4.82)

    # -- door (right side, mid coach) -------------------------------------------
    d0, d1 = -2.60, -1.60
    box('DoorFrame', 'PaintGreen', 0.04, 2.30, d1 - d0 + 0.12, 1.26, 1.20,
        (d0 + d1) / 2)
    for k, (za, zb) in enumerate(((-2.55, -2.10), (-2.08, -1.66))):
        box('DoorLeaf_%d' % k, 'GlassDoor', 0.045, 1.75, zb - za, 1.25, 1.28,
            (za + zb) / 2)
    box('DoorLower', 'PaintGreen', 0.05, 0.75, d1 - d0, 1.25, 0.42, (d0 + d1) / 2)
    box('DoorSeamFront', 'DoorSeam', 0.03, 2.20, 0.02, 1.25, 1.20, d0)
    box('DoorSeamRear', 'DoorSeam', 0.03, 2.20, 0.02, 1.25, 1.20, d1)

    # -- wheels (front / mid / rear axles) --------------------------------------
    for z in (-3.75, 1.75, 3.55):
        for s in (-1.0, 1.0):
            wheel('Wheel_%s_%s' % ('L' if s < 0 else 'R', str(int(z))), s * 1.30, z)


# ---------------------------------------------------------------------------
# VIKING â€” SLTB-style transit bus
# ---------------------------------------------------------------------------
def build_viking():
    log('building VIKING ...')
    mat('Cream', (0.91, 0.86, 0.75), rough=0.50, metal=0.0)
    mat('CreamLight', (0.95, 0.92, 0.84), rough=0.45)
    mat('SLTBBrown', (0.42, 0.30, 0.18), rough=0.55)
    mat('SLTBBlue', (0.16, 0.35, 0.72), rough=0.35, metal=0.10)
    mat('SLTBDark', (0.10, 0.20, 0.42), rough=0.40, metal=0.05)
    mat('RoofWhite', (0.90, 0.92, 0.94), rough=0.60)
    mat('WheelTyre', (0.045, 0.045, 0.05), rough=0.95)
    mat('WheelRim', (0.70, 0.72, 0.78), rough=0.30, metal=0.80)
    mat('WheelHub', (0.15, 0.16, 0.18), rough=0.50, metal=0.30)
    mat('WheelCap', (0.55, 0.57, 0.62), rough=0.35, metal=0.70)
    mat('Chrome', (0.90, 0.92, 0.95), rough=0.12, metal=0.98)
    mat('DarkPlastic', (0.10, 0.11, 0.13), rough=0.50)
    mat('DarkRubber', (0.04, 0.04, 0.05), rough=0.92)
    mat('Glass', (0.05, 0.09, 0.11), rough=0.08, metal=0.70, alpha=0.92)
    mat('GlassLight', (0.30, 0.38, 0.45), rough=0.10, metal=0.50, alpha=0.85)
    mat('HeadLamp', (0.95, 0.98, 1.00), rough=0.15, emit=(0.95, 1.0, 1.0), ei=2.2)
    mat('HeadLampLow', (0.80, 0.90, 1.00), rough=0.20, emit=(0.60, 0.80, 1.0), ei=1.2)
    mat('Indicator', (1.0, 0.60, 0.10), rough=0.20, emit=(1.0, 0.62, 0.10), ei=1.8)
    mat('Tail', (0.85, 0.05, 0.07), rough=0.20, emit=(1.0, 0.07, 0.07), ei=2.0)
    mat('Reverse', (0.93, 0.96, 1.00), rough=0.20, emit=(0.90, 0.95, 1.00), ei=1.3)
    mat('Plate', (0.93, 0.95, 0.98), rough=0.40, metal=0.10)
    mat('Vent', (0.12, 0.13, 0.15), rough=0.70)
    mat('Underbelly', (0.06, 0.06, 0.07), rough=0.90)

    # -- body: hood + cabin chunks ----------------------------------------------
    st = stations_viking()
    loft('Hood', 'Cream', st[0:3], close_lo=True)
    loft('CabinFront', 'Cream', st[2:9], zshift=0.0025)
    loft('CabinMid', 'Cream', st[8:14], zshift=0.0025)
    loft('CabinRear', 'Cream', st[13:19], zshift=0.0025, close_hi=True)

# roof band + vents
    for k, (z0, z1) in enumerate(((-5.6, -1.9), (-1.9, 1.9), (1.9, 5.6))):
        box('RoofBand_%d' % k, 'RoofWhite', 2.32, 0.16, z1 - z0, 0.0, 3.10,
            (z0 + z1) / 2)
    for k, z in enumerate((-4.0, -1.4, 1.2, 3.8)):
        box('RoofVent_%d' % k, 'Vent', 0.42, 0.12, 0.50, 0.0, 3.16, z)

    # livery: blue belt + brown skirt blocks
    for s in (-1.0, 1.0):
        for k, (z0, z1) in enumerate(((-5.5, -4.2), (-4.2, -1.2), (-1.2, 2.6),
(2.6, 5.5))):
            box('BlueBand_%s_%d' % ('L' if s < 0 else 'R', k), 'SLTBBlue', 0.02,
                0.20, z1 - z0, s * 1.206, 0.95, (z0 + z1) / 2)
        for k, (z0, z1) in enumerate(((-5.5, -4.2), (-4.2, -1.2), (-1.2, 2.6),
                                      (2.6, 5.5))):
            box('BrownBand_%s_%d' % ('L' if s < 0 else 'R', k), 'SLTBBrown', 0.02,
                0.34, z1 - z0, s * 1.206, 0.48, (z0 + z1) / 2)
        for k, (z0, z1) in enumerate(((-5.5, -3.9), (-3.9, -1.2), (-1.2, 1.6),
                                      (1.6, 3.9), (3.9, 5.5))):
            box('BrownSkirt_%s_%d' % ('L' if s < 0 else 'R', k), 'SLTBBrown', 0.50,
                0.26, z1 - z0, s * 1.10, 0.18, (z0 + z1) / 2)

    # side windows (6 per side)
    zc = [-4.1 + i * 1.45 for i in range(6)]
    for i, z in enumerate(zc):
        for s in (-1.0, 1.0):
            box('GlassWin_%s_%d' % ('L' if s < 0 else 'R', i), 'Glass', 0.05,
                0.56, 0.85, s * 1.205, 1.75, z)

    # -- front face -------------------------------------------------------------
    box('Windshield', 'Glass', 2.30, 1.00, 0.04, 0.0, 1.55, -5.42, rx=0.24)
    box('WindshieldDivider', 'Chrome', 0.05, 1.00, 0.06, 0.0, 1.55, -5.40, rx=0.24)
    box('HoodLid', 'Cream', 2.10, 0.10, 1.40, 0.0, 0.62, -4.90)
    box('HoodVent_L', 'Vent', 0.40, 0.05, 0.50, -0.55, 0.67, -5.15)
    box('HoodVent_R', 'Vent', 0.40, 0.05, 0.50, 0.55, 0.67, -5.15)
    box('DriverWindow', 'GlassLight', 0.55, 0.42, 0.05, -0.90, 1.05, -5.68, rx=0.10)
    # double headlight stacks
    for s in (-1.0, 1.0):
        box('HeadHousing_%s' % ('L' if s < 0 else 'R'), 'DarkPlastic', 0.32, 0.50,
            0.16, s * 0.78, 0.85, -5.82)
        box('HeadMain_%s' % ('L' if s < 0 else 'R'), 'HeadLamp', 0.24, 0.14, 0.03,
            s * 0.78, 0.98, -5.87)
        box('HeadLow_%s' % ('L' if s < 0 else 'R'), 'HeadLampLow', 0.24, 0.12,
            0.03, s * 0.78, 0.70, -5.87)
        box('HeadTurn_%s' % ('L' if s < 0 else 'R'), 'Indicator', 0.16, 0.07, 0.03,
            s * 0.78, 1.20, -5.85)
    box('FrontGrille', 'Chrome', 1.15, 0.30, 0.05, 0.0, 0.42, -5.65)
    for k in range(4):
        box('GrilleSlat_%d' % k, 'DarkPlastic', 1.00, 0.035, 0.02, 0.0,
            0.34 + k * 0.06, -5.68)
    box('FrontBumper', 'DarkRubber', 2.34, 0.16, 0.10, 0.0, 0.18, -5.60)
    box('FrontBumper2', 'DarkPlastic', 2.34, 0.06, 0.06, 0.0, 0.08, -5.52)
    box('PlateFront', 'Plate', 0.50, 0.13, 0.02, 0.0, 0.28, -5.62)

    # -- rear -------------------------------------------------------------------
    for s in (-1.0, 1.0):
        box('TailLamp_%s' % ('L' if s < 0 else 'R'), 'Tail', 0.16, 0.50, 0.06,
            s * 1.09, 1.10, 5.95)
        box('ReverseTail_%s' % ('L' if s < 0 else 'R'), 'Reverse', 0.14, 0.12,
            0.05, s * 1.09, 0.62, 5.95)
    box('RearPlate', 'Plate', 0.50, 0.13, 0.02, 0.0, 0.50, 5.95)
    box('RearBumper', 'DarkRubber', 2.30, 0.18, 0.10, 0.0, 0.20, 5.95)

    # -- door + step (right side, ahead of front axle - Viking trait) ----------
    box('DoorFrame', 'Cream', 0.04, 1.90, 1.00, 1.205, 1.15, -2.90)
    box('DoorGlass', 'Glass', 0.03, 1.60, 0.85, 1.215, 1.30, -2.90)
    box('DoorLower', 'SLTBBlue', 0.04, 0.60, 0.90, 1.215, 0.50, -2.90)
    box('StepBlock', 'DarkPlastic', 0.70, 0.20, 1.10, 0.55, 0.18, -2.90)

# underbody (segmented) + wheels (4)
    for k, (z0, z1) in enumerate(((-5.35, -1.8), (-1.8, 1.8), (1.8, 5.35))):
        box('Underbody_%d' % k, 'Underbelly', 1.9, 0.18, z1 - z0, 0.0, 0.28,
            (z0 + z1) / 2)
    for z in (-2.90, 2.90):
        for s in (-1.0, 1.0):
            wheel('Wheel_%s_%s' % ('L' if s < 0 else 'R', str(int(z))), s * 1.28, z,
                  r=0.51, rim=0.40)


# ---------------------------------------------------------------------------
# Build + export + validate
# ---------------------------------------------------------------------------
if BUS == 'yutong-c12':
    build_yutong()
else:
    build_viking()

# finalize: export
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=OUT_PATH,
    export_format='GLB',
    use_selection=True,
    export_yup=False,
    export_apply=True,
)
log('exported', OUT_PATH)

# ---------------------------------------------------------------------------
# Validation: per-mesh world bbox diagonal (must stay below the 8 m strip)
# ---------------------------------------------------------------------------
from mathutils import Vector as _V  # noqa

worst = 0.0
total_tris = 0
mesh_count = 0
bmin = _V((1e9, 1e9, 1e9))
bmax = _V((-1e9, -1e9, -1e9))
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    mesh_count += 1
    total_tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    m = o.matrix_world
    mn = _V((1e9, 1e9, 1e9))
    mx = _V((-1e9, -1e9, -1e9))
    for c in o.bound_box:
        wc = m @ _V(c)
        mn = _V((min(mn.x, wc.x), min(mn.y, wc.y), min(mn.z, wc.z)))
        mx = _V((max(mx.x, wc.x), max(mx.y, wc.y), max(mx.z, wc.z)))
    bmin = _V((min(bmin.x, mn.x), min(bmin.y, mn.y), min(bmin.z, mn.z)))
    bmax = _V((max(bmax.x, mx.x), max(bmax.y, mx.y), max(bmax.z, mx.z)))
    d = (mx - mn).length
    worst = max(worst, d)
    flag = '  <-- CHECK' if d > 7.5 else ''
    if d > 6.0:
        log('  diag %.2f m  %s%s' % (d, o.name, flag))
log('STATS meshes=%d triangles=%d worstDiag=%.2f m totalBBox=(%.2f, %.2f, %.2f)-(%.2f, %.2f, %.2f)' % (
    mesh_count, total_tris, worst, bmin.x, bmin.y, bmin.z, bmax.x, bmax.y, bmax.z))
size = os.path.getsize(OUT_PATH) if os.path.exists(OUT_PATH) else 0
log('OUTPUT %.2f MB' % (size / 1048576.0))
log('DONE')
