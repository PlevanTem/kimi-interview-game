class_name LightlineGameModel
extends RefCounted

enum State { TITLE, OBSERVE, WEAVE, CONNECTED, TRAVERSE, REST, REWIND, PAUSED, RUN_SUCCESS, RUN_FAILURE }

const FIXED_STEP := 1.0 / 60.0
const MAX_STATIONS := 5

var state: State = State.TITLE
var state_before_pause: State = State.TITLE
var station_index := 0
var completed_count := 0
var segment_failures := 0
var elapsed_in_state := 0.0
var traverse_progress := 0.0
var line_points: Array[Vector3] = []
var borrowed_anchors: Array[int] = []
var chosen_route := -1
var last_failure := ""
var simulation_step := 0

func reset_run() -> void:
	station_index = 0
	completed_count = 0
	segment_failures = 0
	simulation_step = 0
	last_failure = ""
	_reset_segment(State.OBSERVE)

func begin_weave(start: Vector3) -> bool:
	if state != State.OBSERVE:
		return false
	state = State.WEAVE
	elapsed_in_state = 0.0
	line_points = [start]
	borrowed_anchors.clear()
	chosen_route = -1
	return true

func append_point(point: Vector3, minimum_distance := 0.11) -> bool:
	if state != State.WEAVE:
		return false
	if line_points.is_empty() or line_points[-1].distance_to(point) >= minimum_distance:
		line_points.append(point)
		return true
	return false

func borrow_anchor(anchor_id: int, point: Vector3, route_id := -1) -> bool:
	if state != State.WEAVE or borrowed_anchors.has(anchor_id):
		return false
	if chosen_route >= 0 and route_id >= 0 and route_id != chosen_route:
		return false
	borrowed_anchors.append(anchor_id)
	line_points.append(point)
	if route_id >= 0:
		chosen_route = route_id
	return true

func connect_line(goal: Vector3) -> bool:
	if state != State.WEAVE or line_points.size() < 2 or line_points[-1].distance_to(goal) > 0.95:
		return false
	line_points.append(goal)
	state = State.CONNECTED
	elapsed_in_state = 0.0
	return true

func release(endpoint_ok: bool, anchors_ok: bool, fog_hit: bool, crown_hit: bool, beat_required: bool) -> Dictionary:
	if state == State.WEAVE:
		return {"success": false, "counts_failure": false, "reason": "牵到亮台再松开"}
	if state != State.CONNECTED:
		return {"success": false, "counts_failure": false, "reason": "当前不能放势"}
	if not endpoint_ok:
		return {"success": false, "counts_failure": false, "reason": "牵到亮台再松开"}
	if not anchors_ok:
		return {"success": false, "counts_failure": true, "reason": "漏过亮环；让光穿过它"}
	if fog_hit:
		return {"success": false, "counts_failure": true, "reason": "雾谷吞掉了光；把路线抬离雾谷"}
	if crown_hit:
		return {"success": false, "counts_failure": true, "reason": "光线撞上裂光冠；绕开上沿"}
	if beat_required and elapsed_in_state < 0.82:
		return {"success": false, "counts_failure": false, "reason": "还没到第二次踏线；继续等阿迦"}
	if beat_required and elapsed_in_state > 1.75:
		return {"success": false, "counts_failure": true, "reason": "错过第二次踏线；看阿迦脚环松开"}
	state = State.TRAVERSE
	elapsed_in_state = 0.0
	traverse_progress = 0.0
	return {"success": true, "counts_failure": false, "reason": "光线变成了桥"}

func cancel_line() -> void:
	_reset_segment(State.OBSERVE)

func fixed_tick() -> void:
	if state in [State.TITLE, State.PAUSED, State.RUN_SUCCESS, State.RUN_FAILURE]:
		return
	simulation_step += 1
	elapsed_in_state += FIXED_STEP
	if state == State.TRAVERSE:
		traverse_progress = clampf(elapsed_in_state / 2.25, 0.0, 1.0)

func finish_traverse() -> bool:
	if state != State.TRAVERSE:
		return false
	completed_count += 1
	segment_failures = 0
	state = State.REST
	elapsed_in_state = 0.0
	return true

func advance_station() -> bool:
	if state != State.REST:
		return false
	if completed_count >= MAX_STATIONS:
		state = State.RUN_SUCCESS
		return false
	station_index = completed_count
	_reset_segment(State.OBSERVE)
	return true

func register_failure(reason: String) -> bool:
	last_failure = reason
	segment_failures += 1
	if segment_failures >= 3:
		state = State.RUN_FAILURE
		return false
	state = State.REWIND
	elapsed_in_state = 0.0
	return true

func finish_rewind() -> void:
	var retained_reason := last_failure
	_reset_segment(State.OBSERVE)
	last_failure = retained_reason

func pause() -> bool:
	if state in [State.TITLE, State.PAUSED, State.RUN_SUCCESS, State.RUN_FAILURE]:
		return false
	state_before_pause = state
	state = State.PAUSED
	return true

func resume() -> bool:
	if state != State.PAUSED:
		return false
	state = state_before_pause
	return true

func state_name() -> String:
	return State.keys()[state]

func _reset_segment(next_state: State) -> void:
	state = next_state
	elapsed_in_state = 0.0
	traverse_progress = 0.0
	line_points.clear()
	borrowed_anchors.clear()
	chosen_route = -1
