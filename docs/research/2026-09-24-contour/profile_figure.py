"""Free-standing profile figure for the five tab packs.

Run:
  blender --background --python docs/research/2026-09-24-contour/profile_figure.py

A smooth head sphere over a shoulder dome, with a 0.04 gap between them.
Gold packs get two rings (base ellipse and a head rim facing the camera).
Those rings are the only trim. Chalk's rings are the same white ceramic,
and its mask is the chalk outline rule.
"""
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "prototype", "glyph-preview"))
PREVIEW = os.environ.get("PREVIEW", "") == "1"
RES = 640 if PREVIEW else 1280

PACKS = {
    "f": dict(body=(0.02, 0.02, 0.02, 1), rough=0.50, metal=0.0, spec=0.4, coat=0.0, trans=0.0, gold=True, glow=0.0),
    "n": dict(body=(0.012, 0.012, 0.014, 1), rough=0.12, metal=0.05, spec=0.55, coat=0.0, trans=0.0, gold=True, glow=2.0),
    "k": dict(body=(0.92, 0.92, 0.91, 1), rough=0.35, metal=0.0, spec=0.4, coat=0.25, trans=0.0, gold=False, glow=0.0),
    "i": dict(body=(0.82, 0.90, 0.94, 1), rough=0.35, metal=0.0, spec=0.4, coat=0.0, trans=1.0, gold=True, glow=0.0),
    "r": dict(body=(0.93, 0.89, 0.78, 1), rough=0.30, metal=0.0, spec=0.45, coat=0.15, trans=0.0, gold=True, glow=0.0),
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def shade(obj):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()


def build():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.58, location=(0.0, 0.0, 1.72))
    head = bpy.context.active_object
    head.name = "Head"
    shade(head)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=1.0, location=(0.0, 0.0, 0.35))
    shoulders = bpy.context.active_object
    shoulders.name = "Shoulders"
    shoulders.scale = (1.05, 0.55, 0.75)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.bisect(plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True, use_fill=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    shoulders.data.use_auto_smooth = True
    shoulders.data.auto_smooth_angle = math.radians(60)
    bev = shoulders.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.06
    bev.segments = 4
    bev.limit_method = "ANGLE"
    bev.angle_limit = math.radians(35)
    wn = shoulders.modifiers.new("WN", "WEIGHTED_NORMAL")
    wn.keep_sharp = False
    bpy.ops.object.modifier_apply(modifier=bev.name)
    bpy.ops.object.modifier_apply(modifier=wn.name)
    shade(shoulders)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=1.0, minor_radius=0.035, major_segments=128, minor_segments=24, location=(0.0, 0.0, 0.04)
    )
    base = bpy.context.active_object
    base.name = "BaseRing"
    base.scale = (1.0, 0.55 / 1.05, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    shade(base)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.585, minor_radius=0.022, major_segments=96, minor_segments=16, location=(0.0, 0.0, 1.72)
    )
    ring = bpy.context.active_object
    ring.name = "HeadRing"
    shade(ring)
    return head, shoulders, base, ring


def aim_head_ring(ring, cam_loc):
    axis = Vector(cam_loc) - Vector((0.0, 0.0, 1.72))
    ring.rotation_euler = Vector((0.0, 0.0, 1.0)).rotation_difference(axis).to_euler()


def principled(name, color, rough, metal, spec, coat=0.0, transmission=0.0, emission=0.0, emit_color=(1, 1, 1, 1)):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    spec_name = "Specular IOR Level" if "Specular IOR Level" in bsdf.inputs else "Specular"
    if spec_name in bsdf.inputs:
        bsdf.inputs[spec_name].default_value = spec
    if coat > 0 and "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        if "Coat Roughness" in bsdf.inputs:
            bsdf.inputs["Coat Roughness"].default_value = 0.15
    if transmission > 0 and "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
        bsdf.inputs["IOR"].default_value = 1.45
    if emission > 0 and "Emission Strength" in bsdf.inputs:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = emit_color
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def gold_mat(glow):
    return principled(
        "Gold",
        (1.0, 0.77, 0.34, 1),
        0.25,
        1.0,
        0.5,
        emission=glow,
        emit_color=(1.0, 0.78, 0.34, 1),
    )


def scene_setup(cam_loc):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32 if PREVIEW else 128
    # This Blender build has no OpenImageDenoise. Extra samples stand in for it.
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

    target = Vector((0.0, 0.0, 0.95))
    bpy.ops.object.camera_add(location=cam_loc)
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

    # Key, upper right front. Rim behind left. Weak fill, front left.
    area((2.6, -2.4, 3.2), 280, 3.2, (1.0, 0.97, 0.92))
    area((-2.8, 2.2, 2.4), 420, 2.4, (0.85, 0.90, 1.0))
    area((-1.8, -3.2, 0.6), 40, 3.0, (0.9, 0.92, 1.0))

    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.02, 0.022, 0.026, 1)
    bg.inputs["Strength"].default_value = 0.15


def camera_location():
    # 20 degrees to the right of front, 12 degrees above, aimed at z=0.95.
    # Distance frames a 2.30-tall figure at about 80% of a square 85mm view.
    dist = 7.7
    side, elev = math.radians(20), math.radians(12)
    return (
        dist * math.sin(side) * math.cos(elev),
        -dist * math.cos(side) * math.cos(elev),
        0.95 + dist * math.sin(elev),
    )


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    clear_scene()
    head, shoulders, base, ring = build()
    cam_loc = camera_location()
    aim_head_ring(ring, cam_loc)
    scene_setup(cam_loc)

    white = principled("TrimWhite", (1, 1, 1, 1), 0.5, 0.0, 0.3, emission=1.0, emit_color=(1, 1, 1, 1))
    only = os.environ.get("PACK", "")
    folder = "/tmp" if PREVIEW else OUT
    for art, spec in PACKS.items():
        if only and art != only:
            continue
        body = principled(
            "Body_" + art, spec["body"], spec["rough"], spec["metal"], spec["spec"],
            coat=spec["coat"], transmission=spec["trans"],
        )
        assign(head, body)
        assign(shoulders, body)
        head.is_holdout = False
        shoulders.is_holdout = False
        if spec["gold"]:
            assign(base, gold_mat(spec["glow"]))
            assign(ring, gold_mat(spec["glow"]))
        else:
            assign(base, body)
            assign(ring, body)
        beauty = os.path.join(folder, f"{art}-profile.png")
        render_to(beauty)
        print("wrote", beauty)
        if PREVIEW or not spec["gold"]:
            continue
        head.is_holdout = True
        shoulders.is_holdout = True
        assign(base, white)
        assign(ring, white)
        mask_path = os.path.join(OUT, f"{art}-profile-trim-rgba.png")
        render_to(mask_path)
        print("wrote", mask_path)
        head.is_holdout = False
        shoulders.is_holdout = False


if __name__ == "__main__":
    main()
