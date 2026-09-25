"""Profile medallion for the five tab packs.

Run:
  blender --background --python docs/research/2026-09-24-contour/profile_medallion.py

A bevelled disc, a separate torus rim, and a raised head-and-shoulders
relief in the recessed field. The rim is the only gold object. Its own
render pass is the trim mask. Chalk has no gold; its mask is the chalk
outline rule, applied afterwards.
"""
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "prototype", "glyph-preview"))
PREVIEW = os.environ.get("PREVIEW", "") == "1"
RES = 640 if PREVIEW else 1280

# Disc diameter 2, thickness 0.32. Field is the recessed circle.
DISC_R = 1.0
DISC_T = 0.32
FIELD_R = 0.72
RECESS = 0.04
RELIEF_H = 0.10
HEAD_R = 0.62 * FIELD_R
RIM_MINOR = 0.045

PACKS = {
    "f": dict(body=(0.012, 0.012, 0.013, 1), relief=(0.045, 0.045, 0.048, 1), rough=0.55, rrough=0.38, metal=0.0, spec=0.35, gold=True, glow=0.0, trans=0.0),
    "n": dict(body=(0.01, 0.01, 0.012, 1), relief=(0.03, 0.03, 0.034, 1), rough=0.08, rrough=0.06, metal=0.15, spec=0.6, gold=True, glow=2.0, trans=0.0),
    "k": dict(body=(0.90, 0.90, 0.89, 1), relief=(0.98, 0.98, 0.97, 1), rough=0.28, rrough=0.18, metal=0.0, spec=0.45, gold=False, glow=0.0, trans=0.0),
    "i": dict(body=(0.72, 0.84, 0.94, 1), relief=(0.86, 0.93, 0.98, 1), rough=0.22, rrough=0.12, metal=0.0, spec=0.5, gold=True, glow=0.35, trans=0.72),
    "r": dict(body=(0.93, 0.86, 0.74, 1), relief=(0.98, 0.94, 0.84, 1), rough=0.22, rrough=0.14, metal=0.0, spec=0.5, gold=True, glow=0.12, trans=0.0),
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def look_at(obj, target):
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def cyl(name, radius, depth, loc, verts=128):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    return obj


def apply_mod(obj):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def boolean(host, tool, op):
    mod = host.modifiers.new("Bool", "BOOLEAN")
    mod.operation = op
    mod.object = tool
    mod.solver = "EXACT"
    apply_mod(host)
    bpy.data.objects.remove(tool, do_unlink=True)


def bevel(obj, width, segs=3):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segs
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(28)
    apply_mod(obj)
    bpy.ops.object.shade_smooth()


def build():
    # Coin facing +Z, then tilted as a group.
    disc = cyl("Disc", DISC_R, DISC_T, (0, 0, 0))
    bevel(disc, 0.05, 4)
    cutter = cyl("Recess", FIELD_R, 0.24, (0, 0, DISC_T / 2 - RECESS / 2 + 0.12))
    boolean(disc, cutter, "DIFFERENCE")

    z = DISC_T / 2 - RECESS + RELIEF_H / 2
    head = cyl("Head", HEAD_R, RELIEF_H, (0.0, 0.16, z), verts=96)
    shoulder = cyl("Shoulder", 0.78, RELIEF_H, (0.0, -0.58, z), verts=96)
    boolean(head, shoulder, "UNION")
    clip = cyl("Clip", FIELD_R - 0.02, RELIEF_H + 0.08, (0.0, 0.0, z))
    boolean(head, clip, "INTERSECT")
    relief = head
    relief.name = "Relief"
    bevel(relief, 0.018, 2)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=DISC_R + 0.01,
        minor_radius=RIM_MINOR,
        major_segments=160,
        minor_segments=32,
        location=(0, 0, 0),
    )
    rim = bpy.context.active_object
    rim.name = "Rim"

    rig = bpy.data.objects.new("Rig", None)
    bpy.context.collection.objects.link(rig)
    for obj in (disc, relief, rim):
        obj.parent = rig
    # 25 degrees back from upright, turned 20 degrees.
    rig.rotation_euler = (math.radians(65), 0.0, math.radians(20))
    return disc, relief, rim


def principled(name, color, rough, metal, spec, emission=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = spec
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = spec
    if transmission > 0 and "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
        bsdf.inputs["IOR"].default_value = 1.45
    if emission > 0 and "Emission Strength" in bsdf.inputs:
        color_in = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[color_in].default_value = (1.0, 0.78, 0.32, 1)
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def scene_setup():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 20 if PREVIEW else 80
    scene.cycles.use_denoising = False
    scene.render.resolution_x = RES
    scene.render.resolution_y = RES
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        pass

    target = Vector((0.0, 0.0, 0.0))
    bpy.ops.object.camera_add(location=(0.15, -5.7, 0.78))
    cam = bpy.context.active_object
    look_at(cam, target)
    cam.data.lens = 85
    scene.camera = cam

    def area(loc, energy, size, color=(1, 1, 1)):
        bpy.ops.object.light_add(type="AREA", location=loc)
        lamp = bpy.context.active_object
        lamp.data.energy = energy
        lamp.data.size = size
        lamp.data.color = color
        look_at(lamp, target)

    area((2.3, -1.4, 2.6), 380, 2.2, (1.0, 0.96, 0.9))
    area((-2.4, -1.8, 1.2), 90, 3.0, (0.75, 0.82, 1.0))
    area((0.4, 2.2, 1.4), 110, 1.8, (1.0, 0.92, 0.75))

    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.04, 0.045, 0.05, 1)
    bg.inputs["Strength"].default_value = 0.35


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    clear_scene()
    disc, relief, rim = build()
    scene_setup()
    only = os.environ.get("PACK", "")
    for art, spec in PACKS.items():
        if only and art != only:
            continue
        body = principled("Body_" + art, spec["body"], spec["rough"], spec["metal"], spec["spec"], transmission=spec["trans"])
        rel = principled("Relief_" + art, spec["relief"], spec["rrough"], spec["metal"], spec["spec"], transmission=spec["trans"])
        assign(disc, body)
        assign(relief, rel)
        solo = os.environ.get("SOLO", "")
        disc.hide_render = solo in ("relief", "rim")
        relief.hide_render = solo in ("rim",)
        if spec["gold"]:
            assign(rim, principled("Gold", (1.0, 0.78, 0.35, 1), 0.16, 1.0, 0.55, emission=spec["glow"]))
        else:
            assign(rim, principled("CeramicRim", spec["body"], spec["rough"], 0.0, spec["spec"]))
        rim.hide_render = solo == "relief"
        folder = "/tmp" if PREVIEW else OUT
        beauty = os.path.join(folder, f"{art}-profile.png")
        render_to(beauty)
        print("wrote", beauty)
        if PREVIEW or not spec["gold"]:
            continue
        disc.hide_render = True
        relief.hide_render = True
        assign(rim, principled("TrimWhite", (1, 1, 1, 1), 0.4, 0.0, 0.4, emission=2.0))
        mask_path = os.path.join(OUT, f"{art}-profile-trim-rgba.png")
        render_to(mask_path)
        print("wrote", mask_path)


if __name__ == "__main__":
    main()
