function RouteControls({ world, actions, variant }) {
  return (
    <div className={`route-controls ${variant}`}>
      <button onClick={actions.observe} className={world.observed ? "is-complete" : ""} data-testid="observe-token">
        <span>观察</span><strong>{world.observed ? "旧款待债已显影" : "检查断裂客符"}</strong>
      </button>
      <div className="claim-row">
        <button onClick={() => actions.claim("captain")} className={world.identity === "captain" ? "selected" : ""}>船长</button>
        <button onClick={() => actions.claim("pilgrim")} className={world.identity === "pilgrim" ? "selected" : ""}>朝圣者</button>
      </div>
      <button onClick={actions.advance}><span>时间</span><strong>推进至日落 {world.sunset}/4</strong></button>
      <button onClick={actions.reset} className="quiet">重置共同状态</button>
    </div>
  );
}

export default RouteControls;
