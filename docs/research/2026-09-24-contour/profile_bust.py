"""Faceless profile bust for the five tab packs.

Run:
  blender --background --python docs/research/2026-09-24-contour/profile_bust.py

One mesh (head, neck, shoulders). Gold trim is a separate object and is
rendered again as the trim mask. Chalk has no gold; its mask is the
same soft silhouette rim the other chalk icons use.
"""
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "prototype", "glyph-preview"))
PREVIEW = os.environ.get("PREVIEW", "") == "1"
RES = 640 if PREVIEW else 1280

PACKS = {
    "f": dict(body=(0.012, 0.012, 0.013, 1), rough=0.55, metal=0.0, spec=0.35, gold=True, glow=0.0, trans=0.0),
    "n": dict(body=(0.01, 0.01, 0.012, 1), rough=0.08, metal=0.15, spec=0.6, gold=True, glow=2.2, trans=0.0),
    "k": dict(body=(0.93, 0.93, 0.92, 1), rough=0.28, metal=0.0, spec=0.45, gold=False, glow=0.0, trans=0.0),
    "i": dict(body=(0.78, 0.88, 0.95, 1), rough=0.18, metal=0.0, spec=0.5, gold=True, glow=0.4, trans=0.82),
    "r": dict(body=(0.96, 0.90, 0.78, 1), rough=0.22, metal=0.0, spec=0.5, gold=True, glow=0.15, trans=0.0),
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def look_at(obj, target):
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def build_bust():
    mb = bpy.data.metaballs.new("BustBall")
    # Convert uses the viewport resolution, so keep it fine enough for a smooth bust.
    mb.resolution = 0.018
    mb.render_resolution = 0.01
    obj = bpy.data.objects.new("Bust", mb)
    bpy.context.collection.objects.link(obj)

    def ball(co, radius):
        el = mb.elements.new()
        el.type = "BALL"
        el.co = co
        el.radius = radius
        return el

    def egg(co, sx, sy, sz, radius):
        el = mb.elements.new()
        el.type = "ELLIPSOID"
        el.co = co
        el.radius = radius
        el.size_x = sx
        el.size_y = sy
        el.size_z = sz
        return el

    # Slightly flattened sphere for the head. No face, hair, or features.
    egg((0.0, -0.02, 1.62), 0.96, 0.82, 1.08, 0.92)
    # Short neck, blended so it does not read as a separate ball.
    ball((0.0, 0.02, 1.02), 0.42)
    ball((0.0, 0.05, 0.78), 0.50)
    # Rounded shoulders, wider than the head, like a trophy bust.
    egg((0.0, 0.08, 0.38), 1.35, 0.72, 0.52, 0.95)
    egg((-0.72, 0.04, 0.36), 0.62, 0.48, 0.42, 0.62)
    egg((0.72, 0.04, 0.36), 0.62, 0.48, 0.42, 0.62)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    mesh = bpy.context.active_object
    mesh.name = "Bust"
    bpy.ops.object.shade_smooth()
    sub = mesh.modifiers.new("Sub", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 2
    return mesh


def curve_band(name, location, scale, bevel, tilt=0.0):
    bpy.ops.curve.primitive_bezier_circle_add(radius=1.0, location=location)
    cu = bpy.context.active_object
    cu.name = name
    cu.scale = scale
    cu.rotation_euler[0] = tilt
    cu.data.bevel_depth = bevel
    cu.data.bevel_resolution = 6
    cu.data.resolution_u = 24
    bpy.ops.object.convert(target="MESH")
    band = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    return band


def hug_surface(band, target, offset):
    wrap = band.modifiers.new("Hug", "SHRINKWRAP")
    wrap.target = target
    wrap.wrap_method = "NEAREST_SURFACEPOINT"
    wrap.offset = offset
    bpy.context.view_layer.objects.active = band
    band.select_set(True)
    bpy.ops.object.modifier_apply(modifier=wrap.name)


def build_trim(bust):
    # Own object: a band on the shoulder rim and one around the blank head.
    # Thick enough to still read after the icon is drawn at 42 px.
    shoulder = curve_band("TrimShoulder", (0.0, 0.1, 0.72), (1.22, 0.78, 1.0), 0.07, tilt=1.05)
    head = curve_band("TrimHead", (0.0, -0.02, 1.55), (1.02, 0.88, 1.0), 0.055, tilt=1.2)
    for band in (shoulder, head):
        bpy.ops.object.select_all(action="DESELECT")
        hug_surface(band, bust, 0.045)
    bpy.ops.object.select_all(action="DESELECT")
    shoulder.select_set(True)
    head.select_set(True)
    bpy.context.view_layer.objects.active = shoulder
    bpy.ops.object.join()
    trim = bpy.context.active_object
    trim.name = "Trim"
    return trim


def principled(name, color, rough, metal, spec, emission=0.0, transmission=0.0, ao_mix=True):
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
    if not ao_mix:
        return mat
    # Soft contact darkening in the neck and under the shoulder swell.
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.inputs["Distance"].default_value = 0.35
    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    mix.inputs["Fac"].default_value = 0.55
    rgb = nt.nodes.new("ShaderNodeRGB")
    rgb.outputs[0].default_value = color
    nt.links.new(rgb.outputs["Color"], mix.inputs["Color1"])
    nt.links.new(ao.outputs["Color"], mix.inputs["Color2"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def gold_material(glow):
    return principled(
        "Gold",
        (1.0, 0.76, 0.32, 1),
        rough=0.12,
        metal=1.0,
        spec=0.7,
        emission=glow,
        ao_mix=False,
    )


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def scene_setup(cam_target):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24 if PREVIEW else 96
    scene.cycles.use_denoising = False
    # Apt Blender is built without OpenImageDenoise. Leave denoising off.
    scene.render.resolution_x = RES
    scene.render.resolution_y = RES
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        pass

    bpy.ops.object.camera_add(location=(2.55, -4.90, 2.28))
    cam = bpy.context.active_object
    look_at(cam, cam_target)
    cam.data.lens = 85
    scene.camera = cam

    def area(loc, energy, size, color=(1, 1, 1)):
        bpy.ops.object.light_add(type="AREA", location=loc)
        L = bpy.context.active_object
        L.data.energy = energy
        L.data.size = size
        L.data.color = color
        look_at(L, cam_target)
        return L

    # Upper right key, soft, matching the other icons.
    area((2.4, -1.2, 3.4), 900, 2.4, (1.0, 0.96, 0.9))
    area((-2.2, -1.6, 1.6), 140, 3.0, (0.75, 0.82, 1.0))
    area((0.2, 2.4, 2.2), 220, 1.6, (1.0, 0.9, 0.7))

    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.04, 0.045, 0.05, 1)
    bg.inputs["Strength"].default_value = 0.35


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def hide(obj, hidden):
    obj.hide_render = hidden


def main():
    os.makedirs(OUT, exist_ok=True)
    clear_scene()
    bust = build_bust()
    trim = build_trim(bust)
    from mathutils import Vector
    scene_setup(Vector((0.0, 0.0, 1.16)))

    only = os.environ.get("PACK", "")
    for art, spec in PACKS.items():
        if only and art != only:
            continue
        body = principled("Body_" + art, spec["body"], spec["rough"], spec["metal"], spec["spec"], transmission=spec["trans"])
        assign(bust, body)
        hide(bust, False)
        if spec["gold"]:
            assign(trim, gold_material(spec["glow"]))
            hide(trim, False)
        else:
            hide(trim, True)
        beauty = os.path.join("/tmp" if PREVIEW else OUT, f"{art}-profile.png")
        render_to(beauty)
        print("wrote", beauty)
        if PREVIEW:
            continue
        if spec["gold"]:
            hide(bust, True)
            assign(trim, principled("TrimWhite", (1, 1, 1, 1), 0.4, 0, 0.5, emission=2.0))
            mask_path = os.path.join(OUT, f"{art}-profile-trim-rgba.png")
            render_to(mask_path)
            print("wrote", mask_path)
            hide(bust, False)
        # Chalk trim is built afterwards by the system Python chalk mask.


if __name__ == "__main__":
    main()
