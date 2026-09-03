extends Node3D

const SALT_IVORY := Color("d8c9a7")
const BRONZE := Color("557b68")
const INDIGO := Color("171d33")
const SEA_TEAL := Color("2f7d83")
const RUMOR_CORAL := Color("a75a4d")
const SHADOW_VIOLET := Color("29243c")

var witness: MeshInstance3D
var banner: MeshInstance3D
var elapsed := 0.0

func _ready() -> void:
	build_environment()
	build_harbor()
	if "--capture" in OS.get_cmdline_user_args():
		capture_after_render.call_deferred()


func _process(delta: float) -> void:
	elapsed += delta
	if witness:
		witness.position.x = 1.4 + sin(elapsed * 0.55) * 0.18
	if banner:
		banner.rotation.y = sin(elapsed * 0.8) * 0.035


func build_environment() -> void:
	var world := WorldEnvironment.new()
	world.name = "FilmicEnvironment"
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("6b9dad")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("78a9b5")
	environment.ambient_light_energy = 0.72
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.tonemap_exposure = 1.05
	environment.fog_enabled = true
	environment.fog_light_color = Color("86aeb5")
	environment.fog_light_energy = 0.65
	environment.fog_density = 0.008
	environment.fog_height = 0.0
	environment.fog_height_density = 0.08
	world.environment = environment
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.name = "WarmLateSun"
	sun.rotation_degrees = Vector3(-38.0, -48.0, 0.0)
	sun.light_color = Color("ffd09b")
	sun.light_energy = 2.6
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 32.0
	add_child(sun)

	var camera := Camera3D.new()
	camera.name = "OverviewCamera"
	camera.fov = 46.4
	camera.look_at_from_position(Vector3(9.2, 5.8, 11.5), Vector3(0.0, 1.25, -2.1), Vector3.UP)
	camera.current = true
	add_child(camera)


func build_harbor() -> void:
	create_box("Ground", Vector3(0.0, -0.3, 0.0), Vector3(18.0, 0.6, 15.0), SHADOW_VIOLET, 0.0, 0.96)
	create_box("Path", Vector3(0.0, 0.03, -1.7), Vector3(4.3, 0.18, 10.0), SALT_IVORY.darkened(0.18), 0.0, 0.92)
	create_box("LeftWall", Vector3(-4.15, 1.45, -1.2), Vector3(3.2, 3.4, 1.2), SALT_IVORY, 0.0, 0.88)
	create_box("RightWall", Vector3(4.15, 1.45, -1.2), Vector3(3.2, 3.4, 1.2), SALT_IVORY, 0.0, 0.88)
	create_box("LeftPillar", Vector3(-2.35, 2.0, -1.0), Vector3(1.1, 4.5, 1.4), SALT_IVORY.lightened(0.05), 0.0, 0.82)
	create_box("RightPillar", Vector3(2.35, 2.0, -1.0), Vector3(1.1, 4.5, 1.4), SALT_IVORY.lightened(0.05), 0.0, 0.82)
	create_box("GateLintel", Vector3(0.0, 4.05, -1.0), Vector3(5.7, 0.75, 1.45), SALT_IVORY, 0.0, 0.86)

	var sea := MeshInstance3D.new()
	sea.name = "Sea"
	var sea_mesh := PlaneMesh.new()
	sea_mesh.size = Vector2(24.0, 16.0)
	sea.mesh = sea_mesh
	sea.position = Vector3(0.0, 0.16, -11.0)
	sea.material_override = material(SEA_TEAL, 0.18, 0.24)
	add_child(sea)

	create_box("Dock", Vector3(1.2, 0.36, -6.6), Vector3(3.0, 0.32, 7.0), Color("5b4638"), 0.0, 0.72)
	create_box("ShipHull", Vector3(-2.5, 0.78, -9.2), Vector3(4.6, 0.9, 1.5), Color("352b2a"), 0.0, 0.75)
	create_box("ShipMast", Vector3(-2.5, 2.7, -9.2), Vector3(0.16, 4.2, 0.16), Color("4a372e"), 0.0, 0.82)

	var seal := MeshInstance3D.new()
	seal.name = "BronzeSeal"
	var torus := TorusMesh.new()
	torus.inner_radius = 0.72
	torus.outer_radius = 1.02
	seal.mesh = torus
	seal.position = Vector3(3.35, 1.5, 0.15)
	seal.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	seal.material_override = material(BRONZE, 0.7, 0.38)
	add_child(seal)

	banner = MeshInstance3D.new()
	banner.name = "RumorBanner"
	var cloth := QuadMesh.new()
	cloth.size = Vector2(1.9, 3.0)
	banner.mesh = cloth
	banner.position = Vector3(-3.7, 2.45, 0.05)
	banner.material_override = material(SALT_IVORY.darkened(0.08), 0.0, 0.95)
	add_child(banner)
	create_box("BannerAccent", Vector3(-3.7, 2.45, 0.0), Vector3(0.72, 0.72, 0.08), RUMOR_CORAL, 0.0, 0.8)

	create_character("Traveler", Vector3(-0.8, 1.05, 3.0), INDIGO, 0.55, 1.45)
	witness = create_character("Witness", Vector3(1.4, 0.95, -3.7), SEA_TEAL.lightened(0.18), 0.42, 1.25)


func material(color: Color, metallic: float, roughness: float) -> StandardMaterial3D:
	var result := StandardMaterial3D.new()
	result.albedo_color = color
	result.metallic = metallic
	result.roughness = roughness
	return result


func create_box(name_value: String, position_value: Vector3, size_value: Vector3, color: Color, metallic: float, roughness: float) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.name = name_value
	var shape := BoxMesh.new()
	shape.size = size_value
	instance.mesh = shape
	instance.position = position_value
	instance.material_override = material(color, metallic, roughness)
	add_child(instance)
	return instance


func create_character(name_value: String, position_value: Vector3, color: Color, radius: float, height: float) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.name = name_value
	var capsule := CapsuleMesh.new()
	capsule.radius = radius
	capsule.height = height + radius * 2.0
	instance.mesh = capsule
	instance.position = position_value
	instance.material_override = material(color, 0.0, 0.88)
	add_child(instance)
	return instance


func capture_after_render() -> void:
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var output_dir := ProjectSettings.globalize_path("res://captures")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var error := image.save_png(output_dir.path_join("godot-overview.png"))
	if error != OK:
		push_error("capture_failed:%s" % error)
		get_tree().quit(2)
		return
	print("capture_saved:", output_dir.path_join("godot-overview.png"))
	get_tree().quit()
