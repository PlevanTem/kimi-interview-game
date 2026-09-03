class_name LightlineAssetResolver
extends RefCounted

const DEMO_KIT := "game.odyssey-drifter.procedural.godot-demo-kit"
const AJA := "game.odyssey-drifter.character.aja-placeholder"
const LIGHTLINE := "game.odyssey-drifter.mechanic.lightline-placeholder"
const CITY := "game.odyssey-drifter.environment.breathing-city-placeholder"
const UI := "game.odyssey-drifter.ui.demo-interface"
const AUDIO := "game.odyssey-drifter.audio.demo-pulses"
const PLATFORMS_V2 := "game.odyssey-drifter.environment.light-platforms-v2"
const ANCHORS_V2 := "game.odyssey-drifter.environment.anchor-gates-v2"
const HAZARDS_V2 := "game.odyssey-drifter.environment.hazard-fields-v2"
const BEACON_V2 := "game.odyssey-drifter.environment.terminal-beacon-v2"

const RECORDS := {
	DEMO_KIT: {"type": "procedural_collection", "version": 2, "source": "project-procedural", "license": "project-owned", "style_tags": ["graybox"], "size_budget_bytes": 0, "dependencies": [], "approval": "graybox-only", "entrypoint": "asset_resolver.gd"},
	AJA: {"type": "procedural_character", "version": 2, "source": "project-procedural", "license": "project-owned", "style_tags": ["readable-body-cue", "graybox"], "size_budget_bytes": 0, "dependencies": [DEMO_KIT], "approval": "graybox-only", "entrypoint": "mesh"},
	LIGHTLINE: {"type": "procedural_mechanic", "version": 2, "source": "project-procedural", "license": "project-owned", "style_tags": ["bridge-state", "graybox"], "size_budget_bytes": 0, "dependencies": [DEMO_KIT], "approval": "graybox-only", "entrypoint": "material"},
	CITY: {"type": "procedural_environment", "version": 2, "source": "project-procedural", "license": "project-owned", "style_tags": ["distant-depth-only"], "size_budget_bytes": 0, "dependencies": [DEMO_KIT], "approval": "graybox-only", "entrypoint": "mesh"},
	UI: {"type": "built_in_ui", "version": 2, "source": "godot-built-in", "license": "MIT", "style_tags": ["minimal-hud"], "size_budget_bytes": 0, "dependencies": [], "approval": "graybox-only", "entrypoint": "Control"},
	AUDIO: {"type": "procedural_audio", "version": 2, "source": "project-procedural", "license": "project-owned", "style_tags": ["event-tone"], "size_budget_bytes": 0, "dependencies": [], "approval": "graybox-only", "entrypoint": "tone"},
	PLATFORMS_V2: {"type": "procedural_environment", "version": 1, "source": "project-procedural", "license": "project-owned", "style_tags": ["functional-platform", "four-state"], "size_budget_bytes": 0, "dependencies": [DEMO_KIT], "approval": "graybox-only", "entrypoint": "mesh/material"},
	ANCHORS_V2: {"type": "procedural_environment", "version": 1, "source": "project-procedural", "license": "project-owned", "style_tags": ["functional-anchor", "four-state"], "size_budget_bytes": 0, "dependencies": [DEMO_KIT], "approval": "graybox-only", "entrypoint": "mesh/material"},
	HAZARDS_V2: {"type": "procedural_environment", "version": 1, "source": "project-procedural", "license": "project-owned", "style_tags": ["functional-hazard", "three-state"], "size_budget_bytes": 0, "dependencies": [DEMO_KIT], "approval": "graybox-only", "entrypoint": "mesh/material"},
	BEACON_V2: {"type": "procedural_environment", "version": 1, "source": "project-procedural", "license": "project-owned", "style_tags": ["terminal-progress", "six-state"], "size_budget_bytes": 0, "dependencies": [DEMO_KIT], "approval": "graybox-only", "entrypoint": "mesh/material"},
}

func has_id(asset_id: String) -> bool:
	return RECORDS.has(asset_id)

func resolve_record(asset_id: String) -> Dictionary:
	assert(has_id(asset_id), "Unknown asset id: %s" % asset_id)
	return RECORDS[asset_id]

func material(asset_id: String, semantic: String) -> StandardMaterial3D:
	resolve_record(asset_id)
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	match semantic:
		"platform_open": mat.albedo_color = Color(0.25, 0.65, 1.0, 0.72)
		"platform_target": mat.albedo_color = Color(0.92, 0.93, 0.55, 1.0)
		"platform_connected": mat.albedo_color = Color(1.0, 0.67, 0.22, 1.0)
		"platform_completed": mat.albedo_color = Color(0.42, 1.0, 0.68, 1.0)
		"bridge_preview": mat.albedo_color = Color(0.35, 0.76, 1.0, 0.86)
		"bridge_valid": mat.albedo_color = Color(0.78, 1.0, 0.67, 1.0)
		"bridge_invalid": mat.albedo_color = Color(1.0, 0.28, 0.42, 1.0)
		"anchor_inactive": mat.albedo_color = Color(0.18, 0.22, 0.3, 0.4)
		"anchor_required": mat.albedo_color = Color(0.42, 0.82, 1.0, 0.95)
		"anchor_borrowed": mat.albedo_color = Color(1.0, 0.76, 0.24, 1.0)
		"anchor_missed": mat.albedo_color = Color(1.0, 0.24, 0.38, 1.0)
		"fog_idle": mat.albedo_color = Color(0.18, 0.32, 0.58, 0.55)
		"fog_intersecting": mat.albedo_color = Color(0.5, 0.18, 0.58, 0.85)
		"fog_rejecting": mat.albedo_color = Color(0.72, 0.08, 0.3, 0.95)
		"crown_idle": mat.albedo_color = Color(0.52, 0.2, 0.32, 0.82)
		"crown_intersecting": mat.albedo_color = Color(1.0, 0.62, 0.28, 1.0)
		"crown_rejecting": mat.albedo_color = Color(1.0, 0.9, 0.9, 1.0)
		"beacon_dormant": mat.albedo_color = Color(0.16, 0.22, 0.4, 0.62)
		"beacon_charging": mat.albedo_color = Color(0.36, 0.78, 1.0, 0.95)
		"beacon_complete": mat.albedo_color = Color(1.0, 0.85, 0.35, 1.0)
		"aja_body": mat.albedo_color = Color(0.92, 0.79, 0.54, 1.0)
		"aja_cloak": mat.albedo_color = Color(0.24, 0.19, 0.44, 1.0)
		"aja_lantern": mat.albedo_color = Color(1.0, 0.62, 0.15, 1.0)
		_: mat.albedo_color = Color(0.65, 0.68, 0.76, 1.0)
	if semantic in ["platform_target", "platform_connected", "platform_completed", "bridge_valid", "anchor_required", "anchor_borrowed", "beacon_charging", "beacon_complete", "aja_lantern"]:
		mat.emission_enabled = true
		mat.emission = mat.albedo_color
		mat.emission_energy_multiplier = 2.2
	return mat

func mesh(asset_id: String, semantic: String) -> PrimitiveMesh:
	resolve_record(asset_id)
	match semantic:
		"aja_body":
			var capsule := CapsuleMesh.new(); capsule.radius = 0.22; capsule.height = 0.95; return capsule
		"aja_head":
			var sphere := SphereMesh.new(); sphere.radius = 0.2; sphere.height = 0.4; return sphere
		"aja_limb":
			var limb := CapsuleMesh.new(); limb.radius = 0.045; limb.height = 0.55; return limb
		"platform":
			var cylinder := CylinderMesh.new(); cylinder.top_radius = 0.65; cylinder.bottom_radius = 0.82; cylinder.height = 0.22; return cylinder
		"anchor":
			var torus := TorusMesh.new(); torus.inner_radius = 0.25; torus.outer_radius = 0.38; return torus
		"beacon_ring":
			var ring := TorusMesh.new(); ring.inner_radius = 0.42; ring.outer_radius = 0.53; return ring
		"spike":
			var prism := PrismMesh.new(); prism.size = Vector3(0.28, 0.7, 0.28); return prism
		_:
			var box := BoxMesh.new(); box.size = Vector3.ONE; return box

func tone(frequency: float, duration: float, volume := 0.16) -> AudioStreamWAV:
	resolve_record(AUDIO)
	var sample_rate := 22050
	var sample_count := int(sample_rate * duration)
	var bytes := PackedByteArray(); bytes.resize(sample_count * 2)
	for i in range(sample_count):
		var fade := 1.0 - float(i) / float(sample_count)
		var value := int(sin(TAU * frequency * float(i) / float(sample_rate)) * fade * volume * 32767.0)
		bytes.encode_s16(i * 2, value)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.stereo = false
	stream.data = bytes
	return stream

