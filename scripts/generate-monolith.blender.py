import math
import os
import random
from pathlib import Path

import bpy


random.seed(25)


def find_repo_root() -> Path:
    if "__file__" in globals():
        return Path(__file__).resolve().parents[1]
    return Path.cwd()


ROOT = find_repo_root()
OUT = Path(os.environ.get("MONOLITH_OUT", ROOT / "public" / "models" / "monolith-blender.glb"))


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material(name, color, roughness=0.9, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return material


def to_blender_location(location):
    x, y, z = location
    return (x, -z, y)


def to_blender_scale(scale):
    x, y, z = scale
    return (x, z, y)


def cube(name, location, scale, material, bevel=0.018, roughen=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=to_blender_location(location))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = to_blender_scale(scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)

    if bevel > 0:
        bevel_mod = obj.modifiers.new(f"{name}_bevel", "BEVEL")
        bevel_mod.width = bevel
        bevel_mod.segments = 2
        bevel_mod.affect = "EDGES"

    if roughen > 0:
        texture = bpy.data.textures.new(f"{name}_noise", "VORONOI")
        texture.noise_scale = 0.82
        texture.intensity = 0.24
        displace = obj.modifiers.new(f"{name}_stone_breakup", "DISPLACE")
        displace.strength = roughen
        displace.texture = texture

    return obj


def line_block(name, group, x, y, z, width, height, depth, material):
    obj = cube(name, (x, y, z), (width, height, depth), material, bevel=0.003, roughen=0.0)
    obj.parent = group
    return obj


def crack(name, group, x, y, z, length, angle, material):
    obj = line_block(name, group, x, y, z, 0.005, length, 0.006, material)
    obj.rotation_euler[1] = -angle
    return obj


def apply_modifiers(objects):
    for obj in objects:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            except RuntimeError:
                pass


def build_monolith():
    stone = make_material("obsidian_stone", (0.035, 0.035, 0.030, 1.0), 0.94)
    dark = make_material("deep_cut_shadow", (0.006, 0.007, 0.008, 1.0), 1.0)
    warm = make_material("warm_worn_edge", (0.50, 0.39, 0.23, 1.0), 0.82, 0.04)
    hairline = make_material("subtle_hairline_fracture", (0.30, 0.23, 0.14, 1.0), 0.94)

    root = bpy.data.objects.new("monolith_root", None)
    bpy.context.collection.objects.link(root)
    objects = []

    def add(obj):
        obj.parent = root
        objects.append(obj)
        return obj

    add(cube("monolith_core", (0, 0, 0), (1.06, 2.34, 0.42), stone, bevel=0.038, roughen=0.010))
    add(cube("broken_plinth", (-0.03, -1.24, 0.035), (1.28, 0.34, 0.50), stone, bevel=0.045, roughen=0.014))
    add(cube("top_cap", (-0.05, 1.06, 0.035), (1.08, 0.34, 0.48), stone, bevel=0.035, roughen=0.010))
    add(cube("left_mass", (-0.62, -0.34, 0.03), (0.22, 1.18, 0.48), stone, bevel=0.028, roughen=0.009))
    add(cube("right_mass", (0.62, 0.10, 0.02), (0.24, 1.58, 0.46), stone, bevel=0.030, roughen=0.009))

    for index, spec in enumerate([
        (0.02, 0.15, 0.244, 0.74, 1.38, 0.036),
        (0.02, 0.02, 0.282, 0.54, 0.94, 0.038),
        (0.04, -0.10, 0.322, 0.36, 0.56, 0.044),
        (0.05, -0.18, 0.370, 0.20, 0.28, 0.052),
    ]):
        add(cube(f"nested_shadow_{index}", spec[:3], spec[3:], dark, bevel=0.010, roughen=0.001))

    for index, (x, y, z, width, height) in enumerate([
        (-0.36, 0.15, 0.318, 0.035, 1.48),
        (0.40, 0.15, 0.318, 0.035, 1.48),
        (0.02, 0.88, 0.318, 0.76, 0.035),
        (0.02, -0.58, 0.318, 0.76, 0.035),
        (-0.25, 0.03, 0.358, 0.030, 0.94),
        (0.31, 0.03, 0.358, 0.030, 0.94),
        (0.03, 0.49, 0.358, 0.56, 0.030),
        (0.03, -0.43, 0.358, 0.56, 0.030),
        (-0.14, -0.10, 0.402, 0.026, 0.52),
        (0.23, -0.10, 0.402, 0.026, 0.52),
        (0.05, 0.15, 0.402, 0.36, 0.026),
        (0.05, -0.35, 0.402, 0.36, 0.026),
    ]):
        add(cube(f"nested_rim_{index}", (x, y, z), (width, height, 0.070), stone, bevel=0.010, roughen=0.003))

    for index, spec in enumerate([
        (-0.50, -0.72, 0.35, 0.22, 0.13, 0.12),
        (-0.58, -1.02, 0.34, 0.18, 0.18, 0.14),
        (0.50, 0.48, 0.34, 0.18, 0.56, 0.12),
        (0.22, 0.42, 0.41, 0.25, 0.16, 0.12),
        (-0.02, -0.78, 0.40, 0.20, 0.13, 0.11),
    ]):
        add(cube(f"offset_block_{index}", spec[:3], spec[3:], stone, bevel=0.018, roughen=0.006))

    for index, (x, y, z, width, height) in enumerate([
        (-0.55, 0.06, 0.512, 0.012, 1.92),
        (0.53, -0.06, 0.515, 0.012, 1.68),
        (-0.04, 1.22, 0.518, 0.88, 0.010),
        (0.02, -1.06, 0.522, 0.98, 0.012),
        (-0.36, -0.58, 0.528, 0.72, 0.010),
        (0.02, 0.88, 0.528, 0.76, 0.010),
    ]):
        add(line_block(f"worn_edge_{index}", root, x, y, z, width, height, 0.010, warm))

    for index, spec in enumerate([
        (0.61, 0.54, 0.526, 0.24, -0.35),
        (0.63, 0.20, 0.526, 0.18, 0.18),
        (-0.47, 1.06, 0.526, 0.16, -0.62),
        (-0.18, -1.18, 0.536, 0.22, 1.08),
        (0.32, -1.17, 0.536, 0.18, -0.76),
    ]):
        add(crack(f"hairline_crack_{index}", root, *spec, material=hairline))

    apply_modifiers(objects)
    root.rotation_euler[2] = math.radians(1.5)


def export_glb():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
    )


if __name__ == "__main__":
    clear_scene()
    build_monolith()
    export_glb()
    print(f"Wrote {OUT}")
