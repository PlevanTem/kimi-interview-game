extends SceneTree

const GameModel = preload("res://scripts/game_model.gd")
const AssetResolver = preload("res://scripts/asset_resolver.gd")

var failures: Array[String] = []

func _initialize() -> void:
	_test_asset_ids()
	_test_first_station_is_forgiving()
	_test_rule_guards()
	_test_five_station_progress()
	_test_pause_failure_and_scene()
	if failures.is_empty():
		print("SMOKE PASS v2: 10 asset IDs, first-stage tolerance, anchor/hazard/beat guards, five stations, pause/failure, and main scene")
		quit(0)
	else:
		for failure in failures: push_error(failure)
		print("SMOKE FAIL v2: %d checks failed" % failures.size())
		quit(1)

func _expect(condition: bool, message: String) -> void:
	if not condition: failures.append(message)

func _test_asset_ids() -> void:
	var resolver := AssetResolver.new()
	for asset_id in [AssetResolver.DEMO_KIT, AssetResolver.AJA, AssetResolver.LIGHTLINE, AssetResolver.CITY, AssetResolver.UI, AssetResolver.AUDIO, AssetResolver.PLATFORMS_V2, AssetResolver.ANCHORS_V2, AssetResolver.HAZARDS_V2, AssetResolver.BEACON_V2]:
		_expect(resolver.has_id(asset_id), "Missing stable asset id: %s" % asset_id)
		var record: Dictionary = resolver.resolve_record(asset_id)
		for field in ["type", "version", "source", "license", "style_tags", "size_budget_bytes", "dependencies", "approval", "entrypoint"]:
			_expect(record.has(field), "Asset %s missing governance field %s" % [asset_id, field])

func _connect_basic(model: LightlineGameModel) -> void:
	_expect(model.begin_weave(Vector3.ZERO), "OBSERVE should accept legal weave")
	model.append_point(Vector3(1, 0, 0), 0.0)
	_expect(model.connect_line(Vector3(1, 0, 0)), "line should connect to explicit goal")

func _test_first_station_is_forgiving() -> void:
	var model := GameModel.new(); model.reset_run(); _connect_basic(model)
	var outcome := model.release(true, true, true, true, false)
	_expect(outcome.success, "first station contract must ignore tension/timing; caller supplies no active hazards")
	_expect(model.state == GameModel.State.TRAVERSE, "first station release should immediately build bridge")

func _test_rule_guards() -> void:
	var fog := GameModel.new(); fog.reset_run(); _connect_basic(fog)
	var fog_outcome := fog.release(true, true, true, false, false)
	_expect(not fog_outcome.success and fog_outcome.counts_failure, "fog intersection must reject")
	var anchor := GameModel.new(); anchor.reset_run(); _connect_basic(anchor)
	var anchor_outcome := anchor.release(true, false, false, false, false)
	_expect(not anchor_outcome.success and anchor_outcome.reason.begins_with("漏过"), "missing required anchor must reject before hazards")
	var crown := GameModel.new(); crown.reset_run(); _connect_basic(crown)
	var crown_outcome := crown.release(true, true, false, true, false)
	_expect(not crown_outcome.success and crown_outcome.reason.contains("裂光冠"), "crown intersection must identify the rejecting object")
	var beat := GameModel.new(); beat.reset_run(); _connect_basic(beat)
	var early := beat.release(true, true, false, false, true)
	_expect(not early.success and not early.counts_failure and beat.state == GameModel.State.CONNECTED, "first tap release must teach without failure")
	for i in range(58): beat.fixed_tick()
	var on_beat := beat.release(true, true, false, false, true)
	_expect(on_beat.success, "second-tap window must accept release")
	var late := GameModel.new(); late.reset_run(); _connect_basic(late)
	for i in range(112): late.fixed_tick()
	var late_outcome := late.release(true, true, false, false, true)
	_expect(not late_outcome.success and late_outcome.counts_failure, "late release must be a clear beat failure")

func _test_five_station_progress() -> void:
	var model := GameModel.new(); model.reset_run()
	for station in range(GameModel.MAX_STATIONS):
		_expect(model.station_index == station, "station index must remain continuous")
		_expect(model.begin_weave(Vector3(station, 0, 0)), "station %d should begin" % station)
		if station == 2: model.borrow_anchor(0, Vector3(station + 0.5, 0, 0))
		if station == 4:
			model.borrow_anchor(0, Vector3(station + 0.3, 0, 0), 0)
			model.borrow_anchor(1, Vector3(station + 0.6, 0, 0), 0)
		model.append_point(Vector3(station + 1, 0, 0), 0.0)
		_expect(model.connect_line(Vector3(station + 1, 0, 0)), "station %d line should connect" % station)
		if station >= 3:
			for i in range(58): model.fixed_tick()
		var outcome := model.release(true, true, false, false, station >= 3)
		_expect(outcome.success, "station %d should release under valid guards" % station)
		for i in range(140): model.fixed_tick()
		_expect(model.finish_traverse(), "station %d should finish traversal" % station)
		_expect(model.completed_count == station + 1, "terminal progress should increment once")
		model.advance_station()
	_expect(model.state == GameModel.State.RUN_SUCCESS, "five completed stations must open terminal beacon")

func _test_pause_failure_and_scene() -> void:
	var model := GameModel.new(); model.reset_run()
	_expect(model.pause(), "OBSERVE should pause")
	var step := model.simulation_step; model.fixed_tick()
	_expect(model.simulation_step == step, "paused model must not advance")
	_expect(model.resume(), "paused model should resume")
	for i in range(3):
		model.register_failure("test failure")
		if i < 2: model.finish_rewind()
	_expect(model.state == GameModel.State.RUN_FAILURE, "third segment failure must enter RUN_FAILURE")
	var packed := load("res://scenes/main.tscn")
	_expect(packed is PackedScene, "main scene must parse")
	if packed is PackedScene:
		var instance: Node = packed.instantiate(); _expect(instance != null, "main scene must instantiate"); instance.free()

