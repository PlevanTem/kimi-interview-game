extends Node3D

const GameModel = preload("res://scripts/game_model.gd")
const AssetResolver = preload("res://scripts/asset_resolver.gd")
const LINE_Y := 0.32
const START_RADIUS := 0.95
const GOAL_RADIUS := 0.88
const ANCHOR_RADIUS := 0.62

const STATIONS := [
	Vector3(-7.0, 0.0, -1.8), Vector3(-4.2, 0.0, 1.2),
	Vector3(-1.3, 0.0, -1.1), Vector3(1.8, 0.0, 1.5),
	Vector3(5.0, 0.0, -1.2), Vector3(8.2, 0.0, 1.2),
]

var stages := [
	{"objective": "把光牵到亮台", "anchors": [], "hazards": [], "beat": false},
	{"objective": "避开吞光雾谷", "anchors": [], "hazards": [{"kind": "fog", "rect": Rect2(-3.55, -0.65, 1.55, 1.18)}], "beat": false},
	{"objective": "穿过亮环 0/1", "anchors": [{"pos": Vector3(0.15, LINE_Y, 0.25), "route": -1, "order": 0}], "hazards": [], "beat": false},
	{"objective": "等第二次踏线再松开", "anchors": [], "hazards": [], "beat": true},
	{"objective": "选一条亮环路线，避开雾与裂光冠", "anchors": [
		{"pos": Vector3(5.72, LINE_Y, -1.78), "route": 0, "order": 0},
		{"pos": Vector3(7.42, LINE_Y, -1.25), "route": 0, "order": 1},
		{"pos": Vector3(5.78, LINE_Y, 1.18), "route": 1, "order": 0},
		{"pos": Vector3(7.35, LINE_Y, 1.85), "route": 1, "order": 1},
	], "hazards": [
		{"kind": "fog", "rect": Rect2(6.15, -0.05, 1.10, 0.92)},
		{"kind": "crown", "rect": Rect2(6.15, -1.12, 1.10, 0.76)},
	], "beat": true},
]

var model: LightlineGameModel
var assets: LightlineAssetResolver
var camera_3d: Camera3D
var camera_focus := Vector3.ZERO
var camera_focus_target := Vector3.ZERO
var line_mesh := ImmediateMesh.new()
var line_view: MeshInstance3D
var station_nodes: Array[MeshInstance3D] = []
var target_columns: Array[MeshInstance3D] = []
var anchor_nodes: Array[MeshInstance3D] = []
var anchor_labels: Array[Label3D] = []
var hazard_nodes: Array[MeshInstance3D] = []
var completed_bridge_nodes: Array[Node3D] = []
var beacon_rings: Array[MeshInstance3D] = []
var beacon_label: Label3D
var aja: Node3D
var aja_body: MeshInstance3D
var aja_head: MeshInstance3D
var aja_left_arm: MeshInstance3D
var aja_right_arm: MeshInstance3D
var aja_left_foot: MeshInstance3D
var aja_right_foot: MeshInstance3D

var title_panel: Control
var pause_panel: Control
var result_panel: Control
var hud: Control
var progress_label: Label
var objective_label: Label
var local_feedback: Label
var controls_label: Label
var mode_button: Button
var result_title: Label
var result_body: Label

var start_tone: AudioStreamPlayer
var connect_tone: AudioStreamPlayer
var anchor_tone: AudioStreamPlayer
var tap_tone: AudioStreamPlayer
var fail_tone: AudioStreamPlayer

var click_mode := false
var gesture_active := false
var bridge_committed := false
var rewind_clock := 0.0
var rejection_clock := 0.0
var tap_phase := 0

func _ready() -> void:
	model = GameModel.new()
	assets = AssetResolver.new()
	_build_camera()
	_build_world()
	_build_aja()
	_build_audio()
	_build_ui()
	_show_title()

func _physics_process(_delta: float) -> void:
	model.fixed_tick()
	if model.state == GameModel.State.TRAVERSE:
		aja.position = _sample_polyline(model.line_points, model.traverse_progress) + Vector3(0, 0.12, 0)
		if model.traverse_progress >= 0.995:
			model.finish_traverse()
			_update_world_states()
			local_feedback.text = "亮台已点亮 · 点击下一座光台继续"
	elif model.state == GameModel.State.CONNECTED:
		_update_beat_cue()
	elif model.state == GameModel.State.REST:
		if model.elapsed_in_state >= 2.6:
			_advance_after_rest()
	elif model.state == GameModel.State.REWIND:
		rewind_clock += GameModel.FIXED_STEP
		if rewind_clock >= 0.78:
			model.finish_rewind()
			gesture_active = false
			bridge_committed = false
			_update_world_states()
			local_feedback.text = model.last_failure

func _process(delta: float) -> void:
	if model.state != GameModel.State.PAUSED:
		camera_focus = camera_focus.lerp(camera_focus_target, minf(delta * 2.8, 1.0))
		camera_3d.position = camera_focus + Vector3(11.0, 13.7, 11.0)
		camera_3d.look_at(camera_focus, Vector3.UP)
		_animate_functional_world()
		_animate_aja()
	if rejection_clock > 0.0:
		rejection_clock = maxf(0.0, rejection_clock - delta)
	_update_line_view()
	_update_hud()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		_toggle_pause(); get_viewport().set_input_as_handled(); return
	if event.is_action_pressed("restart"):
		_restart_run(); get_viewport().set_input_as_handled(); return
	if event.is_action_pressed("cancel_line"):
		_cancel_line(); get_viewport().set_input_as_handled(); return
	if model.state == GameModel.State.REST and event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_advance_after_rest(); return
	if model.state in [GameModel.State.TITLE, GameModel.State.PAUSED, GameModel.State.TRAVERSE, GameModel.State.REWIND, GameModel.State.RUN_SUCCESS, GameModel.State.RUN_FAILURE, GameModel.State.REST]:
		return
	if event is InputEventMouseMotion and gesture_active and model.state == GameModel.State.WEAVE:
		_extend_line(_mouse_to_harness_plane(event.position))
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var world_point := _mouse_to_harness_plane(event.position)
		if click_mode and event.pressed:
			if gesture_active:
				_release_gesture()
			elif model.state == GameModel.State.CONNECTED:
				gesture_active = true
			else:
				_begin_gesture(world_point)
		elif not click_mode:
			if event.pressed:
				if model.state == GameModel.State.CONNECTED:
					gesture_active = true
				else:
					_begin_gesture(world_point)
			else:
				_release_gesture()

func _build_camera() -> void:
	camera_3d = Camera3D.new()
	camera_3d.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera_3d.size = 18.5
	camera_3d.near = 0.1
	camera_3d.far = 80.0
	add_child(camera_3d)
	camera_focus = (STATIONS[0] + STATIONS[1]) * 0.5
	camera_focus_target = camera_focus
	camera_3d.position = camera_focus + Vector3(11.0, 13.7, 11.0)
	camera_3d.look_at(camera_focus, Vector3.UP)
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.012, 0.018, 0.055)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.2, 0.28, 0.58)
	env.ambient_light_energy = 1.0
	environment.environment = env
	add_child(environment)

func _build_world() -> void:
	assets.resolve_record(AssetResolver.PLATFORMS_V2)
	assets.resolve_record(AssetResolver.ANCHORS_V2)
	assets.resolve_record(AssetResolver.HAZARDS_V2)
	assets.resolve_record(AssetResolver.BEACON_V2)
	for station in STATIONS:
		var platform := MeshInstance3D.new()
		platform.mesh = assets.mesh(AssetResolver.PLATFORMS_V2, "platform")
		platform.position = station
		add_child(platform)
		station_nodes.append(platform)
		var column := MeshInstance3D.new()
		var column_mesh := CylinderMesh.new()
		column_mesh.top_radius = 0.11; column_mesh.bottom_radius = 0.32; column_mesh.height = 2.25
		column.mesh = column_mesh
		column.position = station + Vector3(0, 1.18, 0)
		add_child(column)
		target_columns.append(column)
	line_view = MeshInstance3D.new()
	line_view.mesh = line_mesh
	add_child(line_view)
	_build_terminal_beacon()

func _build_terminal_beacon() -> void:
	var base := STATIONS[-1] + Vector3(0, 4.0, 0)
	for i in range(5):
		var ring := MeshInstance3D.new()
		ring.mesh = assets.mesh(AssetResolver.BEACON_V2, "beacon_ring")
		ring.position = base + Vector3(0, float(i) * 0.32, 0)
		ring.rotation_degrees = Vector3(90, 0, 0)
		add_child(ring)
		beacon_rings.append(ring)
	beacon_label = Label3D.new()
	beacon_label.text = "终灯 0/5"
	beacon_label.font_size = 38
	beacon_label.position = base + Vector3(0, 1.15, 0)
	beacon_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	add_child(beacon_label)

func _build_aja() -> void:
	aja = Node3D.new(); add_child(aja)
	aja_body = _mesh_child(aja, "aja_body", "aja_body", Vector3(0, 0.58, 0))
	aja_head = _mesh_child(aja, "aja_head", "aja_body", Vector3(0, 1.22, 0))
	aja_left_arm = _mesh_child(aja, "aja_limb", "aja_cloak", Vector3(-0.24, 0.67, 0))
	aja_right_arm = _mesh_child(aja, "aja_limb", "aja_cloak", Vector3(0.24, 0.67, 0))
	aja_left_foot = _mesh_child(aja, "aja_limb", "aja_cloak", Vector3(-0.13, 0.16, 0))
	aja_right_foot = _mesh_child(aja, "aja_limb", "aja_cloak", Vector3(0.13, 0.16, 0))
	aja_left_foot.scale = Vector3.ONE * 0.7; aja_right_foot.scale = Vector3.ONE * 0.7
	aja_left_arm.rotation_degrees.z = -28; aja_right_arm.rotation_degrees.z = 28
	aja.position = STATIONS[0] + Vector3(0, 0.12, 0)

func _mesh_child(parent: Node3D, mesh_semantic: String, material_semantic: String, position_value: Vector3) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = assets.mesh(AssetResolver.AJA, mesh_semantic)
	node.material_override = assets.material(AssetResolver.AJA, material_semantic)
	node.position = position_value
	parent.add_child(node)
	return node

func _build_audio() -> void:
	start_tone = _audio(320.0, 0.09)
	connect_tone = _audio(560.0, 0.18)
	anchor_tone = _audio(710.0, 0.12)
	tap_tone = _audio(440.0, 0.08)
	fail_tone = _audio(150.0, 0.28)

func _audio(frequency: float, duration: float) -> AudioStreamPlayer:
	var player := AudioStreamPlayer.new()
	player.stream = assets.tone(frequency, duration)
	add_child(player)
	return player

func _build_ui() -> void:
	assets.resolve_record(AssetResolver.UI)
	var layer := CanvasLayer.new(); add_child(layer)
	hud = Control.new(); hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); hud.mouse_filter = Control.MOUSE_FILTER_IGNORE; layer.add_child(hud)
	progress_label = _label(hud, Vector2(28, 22), Vector2(260, 42), 24)
	objective_label = _label(hud, Vector2(300, 20), Vector2(680, 48), 26); objective_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	local_feedback = _label(hud, Vector2(360, 620), Vector2(560, 48), 20); local_feedback.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	controls_label = _label(hud, Vector2(858, 674), Vector2(395, 26), 15); controls_label.text = "Esc 暂停 · R 重开 · 右键收线"; controls_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	mode_button = Button.new(); mode_button.position = Vector2(1075, 24); mode_button.size = Vector2(175, 38); mode_button.pressed.connect(_toggle_input_mode); layer.add_child(mode_button)
	title_panel = _full_panel(layer)
	var title := _label(title_panel, Vector2(330, 170), Vector2(620, 72), 44); title.text = "光 线 之 上"; title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var promise := _label(title_panel, Vector2(360, 255), Vector2(560, 65), 21); promise.text = "牵光成桥，陪阿迦连续点亮五座平台。"; promise.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var start := Button.new(); start.text = "开始"; start.position = Vector2(515, 360); start.size = Vector2(250, 56); start.pressed.connect(_start_run); title_panel.add_child(start)
	pause_panel = _full_panel(layer)
	var pause_title := _label(pause_panel, Vector2(440, 250), Vector2(400, 56), 36); pause_title.text = "停 息"; pause_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var resume := Button.new(); resume.text = "继续"; resume.position = Vector2(515, 335); resume.size = Vector2(250, 52); resume.pressed.connect(_toggle_pause); pause_panel.add_child(resume)
	var restart := Button.new(); restart.text = "重新开始"; restart.position = Vector2(515, 405); restart.size = Vector2(250, 48); restart.pressed.connect(_restart_run); pause_panel.add_child(restart)
	result_panel = _full_panel(layer)
	result_title = _label(result_panel, Vector2(300, 190), Vector2(680, 70), 40); result_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_body = _label(result_panel, Vector2(350, 285), Vector2(580, 90), 20); result_body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; result_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var again := Button.new(); again.text = "重新点灯"; again.position = Vector2(515, 405); again.size = Vector2(250, 54); again.pressed.connect(_restart_run); result_panel.add_child(again)

func _label(parent: Node, pos: Vector2, dimensions: Vector2, font_size: int) -> Label:
	var node := Label.new(); node.position = pos; node.size = dimensions; node.add_theme_font_size_override("font_size", font_size); node.add_theme_color_override("font_color", Color(0.92, 0.96, 1.0)); parent.add_child(node); return node

func _full_panel(parent: Node) -> Control:
	var panel := ColorRect.new(); panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); panel.color = Color(0.01, 0.016, 0.052, 0.96); parent.add_child(panel); return panel

func _show_title() -> void:
	model.state = GameModel.State.TITLE
	title_panel.visible = true; pause_panel.visible = false; result_panel.visible = false; hud.visible = false

func _start_run() -> void:
	title_panel.visible = false; pause_panel.visible = false; result_panel.visible = false; hud.visible = true
	_clear_completed_bridges(); model.reset_run(); aja.position = STATIONS[0] + Vector3(0, 0.12, 0); _prepare_stage(); local_feedback.text = "从阿迦脚下发亮的开口光座起线"

func _restart_run() -> void:
	_clear_completed_bridges(); model.reset_run(); gesture_active = false; bridge_committed = false; aja.position = STATIONS[0] + Vector3(0, 0.12, 0)
	title_panel.visible = false; pause_panel.visible = false; result_panel.visible = false; hud.visible = true; _prepare_stage(); local_feedback.text = "终灯归零 · 从当前亮座起线"

func _prepare_stage() -> void:
	_clear_stage_objects()
	bridge_committed = false; gesture_active = false; tap_phase = 0
	var stage: Dictionary = stages[model.station_index]
	for i in range(stage.anchors.size()):
		var info: Dictionary = stage.anchors[i]
		var node := MeshInstance3D.new(); node.mesh = assets.mesh(AssetResolver.ANCHORS_V2, "anchor"); node.position = info.pos; node.rotation_degrees = Vector3(90, 0, 0); node.set_meta("anchor_index", i); add_child(node); anchor_nodes.append(node)
		var label := Label3D.new(); label.font_size = 28; label.billboard = BaseMaterial3D.BILLBOARD_ENABLED; label.position = info.pos + Vector3(0, 0.7, 0); add_child(label); anchor_labels.append(label)
	for hazard in stage.hazards:
		var rect: Rect2 = hazard.rect
		var node := MeshInstance3D.new()
		if hazard.kind == "fog":
			var box := BoxMesh.new(); box.size = Vector3(rect.size.x, 0.22, rect.size.y); node.mesh = box; node.position = Vector3(rect.position.x + rect.size.x * 0.5, 0.12, rect.position.y + rect.size.y * 0.5)
		else:
			var spike_mesh := BoxMesh.new(); spike_mesh.size = Vector3(rect.size.x, 0.7, rect.size.y); node.mesh = spike_mesh; node.position = Vector3(rect.position.x + rect.size.x * 0.5, 0.42, rect.position.y + rect.size.y * 0.5)
		node.set_meta("kind", hazard.kind); node.set_meta("rect", rect); add_child(node); hazard_nodes.append(node)
	camera_focus_target = (STATIONS[model.station_index] + STATIONS[model.station_index + 1]) * 0.5
	_update_world_states()

func _clear_stage_objects() -> void:
	for node in anchor_nodes: node.queue_free()
	for node in anchor_labels: node.queue_free()
	for node in hazard_nodes: node.queue_free()
	anchor_nodes.clear(); anchor_labels.clear(); hazard_nodes.clear()

func _begin_gesture(point: Vector3) -> void:
	if model.state != GameModel.State.OBSERVE: return
	var start: Vector3 = STATIONS[model.station_index] + Vector3(0, LINE_Y, 0)
	if point.distance_to(start) > START_RADIUS:
		local_feedback.text = "从亮座起线"
		var platform := station_nodes[model.station_index]; platform.scale = Vector3.ONE * 1.18
		return
	gesture_active = model.begin_weave(start)
	if gesture_active: start_tone.play(); local_feedback.text = "牵到唯一的竖直亮台"

func _extend_line(point: Vector3) -> void:
	point.y = LINE_Y
	var stage: Dictionary = stages[model.station_index]
	for i in range(anchor_nodes.size()):
		if _anchor_is_available(i) and point.distance_to(anchor_nodes[i].position) <= ANCHOR_RADIUS and not model.borrowed_anchors.has(i):
			var info: Dictionary = stage.anchors[i]
			if model.borrow_anchor(i, info.pos, int(info.route)):
				anchor_tone.play(); local_feedback.text = "亮环闭合"
				_update_anchor_states()
	model.append_point(point)
	_update_hazard_states(false)
	var goal: Vector3 = STATIONS[model.station_index + 1] + Vector3(0, LINE_Y, 0)
	if point.distance_to(goal) <= GOAL_RADIUS and model.connect_line(goal):
		connect_tone.play(); local_feedback.text = "现在松开" if not stage.beat else "保持片刻，看阿迦第二次踏线"
		_update_world_states()

func _release_gesture() -> void:
	if not gesture_active: return
	gesture_active = false
	if model.state == GameModel.State.WEAVE:
		local_feedback.text = "牵到亮台再松开"
		model.cancel_line(); return
	if model.state != GameModel.State.CONNECTED: return
	var stage: Dictionary = stages[model.station_index]
	var anchors_ok := _anchors_satisfied()
	var fog_hit := _line_hits_kind("fog")
	var crown_hit := _line_hits_kind("crown")
	var outcome := model.release(true, anchors_ok, fog_hit, crown_hit, bool(stage.beat))
	if outcome.success:
		_commit_bridge(); local_feedback.text = "光线变成了桥 · 阿迦正在过桥"
	elif outcome.counts_failure:
		_show_failure(outcome.reason)
	else:
		local_feedback.text = outcome.reason

func _cancel_line() -> void:
	if model.state not in [GameModel.State.WEAVE, GameModel.State.CONNECTED]: return
	model.cancel_line(); gesture_active = false; bridge_committed = false; local_feedback.text = "光线已收回"; _update_world_states()

func _commit_bridge() -> void:
	bridge_committed = true
	completed_bridge_nodes.append(_make_bridge(model.line_points, true))
	_update_world_states()

func _show_failure(reason: String) -> void:
	fail_tone.play(); rejection_clock = 0.78; gesture_active = false; bridge_committed = false
	_update_hazard_states(true)
	if reason.begins_with("漏过"):
		for node in anchor_nodes:
			if not model.borrowed_anchors.has(int(node.get_meta("anchor_index"))): node.material_override = assets.material(AssetResolver.ANCHORS_V2, "anchor_missed")
	var rewinds := model.register_failure(reason)
	local_feedback.text = reason
	if rewinds: rewind_clock = 0.0
	else: _show_result(false)

func _advance_after_rest() -> void:
	if model.state != GameModel.State.REST: return
	if model.completed_count >= GameModel.MAX_STATIONS:
		model.advance_station(); _show_result(true); return
	model.advance_station(); _prepare_stage(); local_feedback.text = "下一座亮台已升起"

func _toggle_pause() -> void:
	if model.state == GameModel.State.PAUSED:
		model.resume(); pause_panel.visible = false; hud.visible = true
	elif model.pause():
		pause_panel.visible = true; hud.visible = false

func _toggle_input_mode() -> void:
	click_mode = not click_mode

func _show_result(success: bool) -> void:
	hud.visible = false; pause_panel.visible = false; result_panel.visible = true
	if success:
		result_title.text = "终灯 5/5"
		result_body.text = "五座平台和五段光桥仍留在世界里。\n阿迦停下，看见了整条共同走过的路。"
	else:
		result_title.text = "本段连续失稳三次"
		result_body.text = "%s\n重新开始后，所有规则保持不变。" % model.last_failure

func _update_world_states() -> void:
	for i in range(station_nodes.size()):
		var semantic := "platform_open"
		if i <= model.completed_count: semantic = "platform_completed"
		if i == model.station_index and model.state not in [GameModel.State.RUN_SUCCESS, GameModel.State.TITLE]: semantic = "platform_open"
		if i == model.station_index + 1 and model.station_index < 5: semantic = "platform_connected" if model.state in [GameModel.State.CONNECTED, GameModel.State.TRAVERSE] else "platform_target"
		station_nodes[i].material_override = assets.material(AssetResolver.PLATFORMS_V2, semantic)
		target_columns[i].visible = i == model.station_index + 1 and model.station_index < 5 and model.state not in [GameModel.State.REST, GameModel.State.RUN_SUCCESS]
		if target_columns[i].visible: target_columns[i].material_override = assets.material(AssetResolver.PLATFORMS_V2, "platform_target")
	_update_anchor_states(); _update_hazard_states(false); _update_beacon()

func _update_anchor_states() -> void:
	if model.station_index >= stages.size(): return
	var stage: Dictionary = stages[model.station_index]
	for i in range(anchor_nodes.size()):
		var info: Dictionary = stage.anchors[i]
		var available := _anchor_is_available(i)
		anchor_nodes[i].visible = available or model.borrowed_anchors.has(i)
		anchor_labels[i].visible = anchor_nodes[i].visible
		if model.borrowed_anchors.has(i):
			anchor_nodes[i].material_override = assets.material(AssetResolver.ANCHORS_V2, "anchor_borrowed")
		elif available:
			anchor_nodes[i].material_override = assets.material(AssetResolver.ANCHORS_V2, "anchor_required")
		else:
			anchor_nodes[i].material_override = assets.material(AssetResolver.ANCHORS_V2, "anchor_inactive")
		if model.station_index == 2: anchor_labels[i].text = "%d/1" % model.borrowed_anchors.size()
		elif model.station_index == 4 and model.chosen_route >= 0: anchor_labels[i].text = "%d/2" % model.borrowed_anchors.size()
		else: anchor_labels[i].text = "选择" if available else ""

func _anchor_is_available(index: int) -> bool:
	if model.station_index >= stages.size(): return false
	var info: Dictionary = stages[model.station_index].anchors[index]
	if int(info.route) < 0: return true
	if model.chosen_route < 0: return int(info.order) == 0
	return int(info.route) == model.chosen_route

func _anchors_satisfied() -> bool:
	if model.station_index == 2: return model.borrowed_anchors.size() == 1
	if model.station_index == 4: return model.chosen_route >= 0 and model.borrowed_anchors.size() == 2
	return true

func _update_hazard_states(rejecting: bool) -> void:
	for node in hazard_nodes:
		var kind: String = node.get_meta("kind")
		var hit := _line_hits_rect(node.get_meta("rect"))
		var semantic := "%s_idle" % kind
		if rejecting and hit: semantic = "%s_rejecting" % kind
		elif hit: semantic = "%s_intersecting" % kind
		node.material_override = assets.material(AssetResolver.HAZARDS_V2, semantic)

func _update_beacon() -> void:
	for i in range(beacon_rings.size()):
		var semantic := "beacon_dormant"
		if i < model.completed_count: semantic = "beacon_complete" if model.completed_count == 5 else "beacon_charging"
		beacon_rings[i].material_override = assets.material(AssetResolver.BEACON_V2, semantic)
	beacon_label.text = "终灯 %d/5" % model.completed_count

func _update_beat_cue() -> void:
	if not bool(stages[model.station_index].beat): return
	var phase := 0
	if model.elapsed_in_state >= 0.82: phase = 2
	elif model.elapsed_in_state >= 0.25: phase = 1
	if phase > tap_phase:
		tap_phase = phase; tap_tone.pitch_scale = 1.0 if phase == 1 else 1.28; tap_tone.play()
		local_feedback.text = "第一次踏线" if phase == 1 else "第二次踏线 · 现在松开"

func _animate_functional_world() -> void:
	var pulse := 1.0 + sin(Time.get_ticks_msec() * 0.004) * 0.06
	if model.station_index < 5:
		station_nodes[model.station_index].scale = Vector3.ONE * pulse
		station_nodes[model.station_index + 1].scale = Vector3(1.0, 1.0 + (pulse - 1.0) * 1.8, 1.0)
	for node in hazard_nodes:
		if node.get_meta("kind") == "fog": node.position.y = 0.12 + sin(Time.get_ticks_msec() * 0.003 + node.position.x) * 0.06

func _animate_aja() -> void:
	var t := Time.get_ticks_msec() * 0.001
	aja_body.rotation.z = sin(t * 2.0) * 0.035
	if model.state == GameModel.State.CONNECTED and bool(stages[model.station_index].beat):
		var foot_raise := 0.16 if tap_phase == 1 else (0.28 if tap_phase == 2 else 0.0)
		aja_right_foot.position.y = 0.16 + foot_raise
		aja_body.scale.y = 0.86 if tap_phase == 2 else 1.0
		aja_left_arm.rotation_degrees.z = -42 if tap_phase == 2 else -28
		aja_right_arm.rotation_degrees.z = 42 if tap_phase == 2 else 28
	else:
		aja_right_foot.position.y = 0.16; aja_body.scale.y = 1.0

func _update_line_view() -> void:
	line_mesh.clear_surfaces()
	if model.line_points.size() < 2: return
	var count := model.line_points.size()
	if model.state == GameModel.State.REWIND: count = maxi(2, int(float(count) * (1.0 - clampf(rewind_clock / 0.78, 0.0, 0.95))))
	var semantic := "bridge_valid" if model.state in [GameModel.State.CONNECTED, GameModel.State.TRAVERSE, GameModel.State.REST] else "bridge_preview"
	if _line_hits_kind("fog") or _line_hits_kind("crown"): semantic = "bridge_invalid"
	_draw_ribbon(line_mesh, model.line_points, count, 0.08 if not bridge_committed else 0.14, assets.material(AssetResolver.LIGHTLINE, semantic))

func _make_bridge(points: Array[Vector3], crossbars: bool) -> Node3D:
	var root := Node3D.new(); add_child(root)
	var mesh := ImmediateMesh.new(); var view := MeshInstance3D.new(); view.mesh = mesh; root.add_child(view)
	_draw_ribbon(mesh, points, points.size(), 0.15, assets.material(AssetResolver.LIGHTLINE, "bridge_valid"))
	if crossbars:
		for i in range(1, points.size(), maxi(1, points.size() / 9)):
			var bar := MeshInstance3D.new(); var box := BoxMesh.new(); box.size = Vector3(0.42, 0.045, 0.09); bar.mesh = box; bar.material_override = assets.material(AssetResolver.LIGHTLINE, "bridge_valid"); bar.position = points[i] + Vector3(0, 0.03, 0); root.add_child(bar)
	return root

func _draw_ribbon(mesh: ImmediateMesh, points: Array[Vector3], count: int, width: float, material: Material) -> void:
	if count < 2: return
	mesh.surface_begin(Mesh.PRIMITIVE_TRIANGLE_STRIP, material)
	for i in range(count):
		var previous: Vector3 = points[maxi(0, i - 1)]; var following: Vector3 = points[mini(count - 1, i + 1)]
		var direction := (following - previous).normalized(); var normal := Vector3(-direction.z, 0, direction.x)
		mesh.surface_add_vertex(points[i] + normal * width); mesh.surface_add_vertex(points[i] - normal * width)
	mesh.surface_end()

func _line_hits_kind(kind: String) -> bool:
	for node in hazard_nodes:
		if node.get_meta("kind") == kind and _line_hits_rect(node.get_meta("rect")): return true
	return false

func _line_hits_rect(rect: Rect2) -> bool:
	if model.line_points.size() < 2: return false
	for i in range(1, model.line_points.size()):
		for sample in range(13):
			var point := model.line_points[i - 1].lerp(model.line_points[i], float(sample) / 12.0)
			if rect.has_point(Vector2(point.x, point.z)): return true
	return false

func _sample_polyline(points: Array[Vector3], progress: float) -> Vector3:
	if points.is_empty(): return Vector3.ZERO
	if points.size() == 1: return points[0]
	var lengths: Array[float] = []; var total := 0.0
	for i in range(1, points.size()): var length := points[i - 1].distance_to(points[i]); lengths.append(length); total += length
	var target := total * clampf(progress, 0, 1); var traversed := 0.0
	for i in range(lengths.size()):
		if target <= traversed + lengths[i]: return points[i].lerp(points[i + 1], (target - traversed) / maxf(lengths[i], 0.001))
		traversed += lengths[i]
	return points[-1]

func _mouse_to_harness_plane(screen_position: Vector2) -> Vector3:
	var origin := camera_3d.project_ray_origin(screen_position); var direction := camera_3d.project_ray_normal(screen_position)
	if absf(direction.y) < 0.0001: return STATIONS[model.station_index] + Vector3(0, LINE_Y, 0)
	var distance := (LINE_Y - origin.y) / direction.y
	var point := origin + direction * distance; point.y = LINE_Y; return point

func _update_hud() -> void:
	if not is_instance_valid(progress_label): return
	progress_label.text = "点亮终灯 %d/5" % model.completed_count
	if model.station_index < stages.size():
		objective_label.text = stages[model.station_index].objective
		if model.station_index == 2: objective_label.text = "穿过亮环 %d/1" % model.borrowed_anchors.size()
		elif model.station_index == 4 and model.chosen_route >= 0: objective_label.text = "穿过所选亮环 %d/2" % model.borrowed_anchors.size()
	mode_button.text = "点击模式" if click_mode else "长按模式"

func _clear_completed_bridges() -> void:
	for node in completed_bridge_nodes: node.queue_free()
	completed_bridge_nodes.clear()
