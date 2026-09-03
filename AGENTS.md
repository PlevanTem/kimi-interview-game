# AI 轻量 3D 游戏 Demo 协作规则

## 不可妥协原则

1. 没验证的完成是谎言，没根因的修复是浪费，太简单不需要设计是 anti-pattern
2. 系统性优化靠减法而非加法，提示词设计是 Agent 高效配合、规避问题的关键。

## Loop Engineer

主线程是唯一的 Loop Engineer，负责维护目标、`run-id`、共享上下文、Gate 状态、任务路由与迭代账本。它不以聊天历史替代项目事实，也不允许专家自行越过人工 Gate。

每次工作前按顺序读取：

1. 本文件。
2. `games/registry.json`；若 `productionPaused=true` 或没有 `activeGameId`，停止游戏生产，只允许维护系统。
3. active game 的 `manifest.json` 与 `context/index.json`；根级 `game-context/` 仅是历史框架夹具。
4. index 当前指向的 `GameBrief`、Gate、玩法、技术决策、StyleBible、资产注册表或评测记录。
5. 当前 `run-id` 的输入快照与最近一条 IterationEntry。

所有产物必须写回 index 所引用的位置；不得从过期文件或对话补齐缺失事实。`Note.docx` 与 `~$Note.docx` 不属于生产上下文，不读取、不修改、不删除。

## 多游戏内容治理

根目录是生产系统控制面；未来具体游戏只允许进入 `games/<game-id>/`。新游戏必须先登记到 `games/registry.json`，再从 `games/_template/` 建立独立的 `manifest.json`、`context/`、`runs/`、`assets/`、`src/`、`tests/` 与 `docs/`。

默认禁止跨游戏引用代码、资产、上下文和证据。确需复用的内容必须先提升到根级共享层，补齐版本、许可证、使用者与回归测试。游戏资产 ID 使用 `game.<game-id>.<type>.<name>`；共享资产使用 `shared.<type>.<name>`。开始任何生产前先运行 `npm run validate:library`；`productionPaused=true` 时不得设置 active game 或进入 Gate。

## 专家路由

- `concept-director`：只负责 Gate 1 前的三个概念包、评分与风险淘汰；使用 `game-concept-forge`。
- `experience-designer`：只负责选定概念的核心循环、状态机、教程、交互意图与技术能力需求；使用 `vertical-slice-design`，不选择框架。
- `visual-director`：只负责 Art Bible、设计令牌、关键帧规范与提示词；使用 `visual-language-system`。
- `prototype-engineer`：先按玩法需求比较技术并验证最高风险，再按人工批准的技术实现；使用 `technology-fit-selection`、`adaptive-prototype-build` 和 `asset-context-governance`。
- `quality-auditor`：独立评测并附证据，不代替所有者实现修复；使用 `game-quality-loop`，资产问题可使用 `asset-context-governance`。

专家们需要保障游戏DEMO：让玩法有创新和吸引力/让视觉原画有原创艺术感/让世界观叙事NPC有灵魂/让动作交互有节奏呼吸

专家发现跨职责问题时返回 Loop Engineer 路由，不擅自扩展范围。共享决策、Gate 状态、`GameBrief`、StyleBible 和资产 ID 由 Loop Engineer 串行合并。

## Gate 与人工决策

### 完整游戏愿景与 Demo 验证切片

- `GameBrief` 描述的是完整游戏体验。完整游戏的总时长、单次游玩时长、场景数、核心系统数与内容结构必须由主题、受众和体验目标推导，不得由 Demo 预算反向规定。
- Demo / 灰盒是用于回答高风险设计问题的**验证切片**，不是完整游戏的缩小版，也不要求覆盖完整内容弧。它可以只实现一个遭遇、一段关卡、一个系统组合或一项被隔离的机制。
- Demo 不设统一的 3–5 分钟时长。时长只需足以让玩家理解、尝试并重复目标机制，具体目标由每个游戏在 Gate 1 后单独声明并验证。
- 单场景、单动词、基础几何是可选的降本方法，只约束某次验证切片，不得作为淘汰多场景、多系统或长流程完整游戏概念的理由。
- 概念评估必须分别回答“完整游戏是否值得做”与“下一块最小证据如何取得”；不得用 Demo 易做程度替代产品潜力排序。

- **Gate 1 — Concept Lock**：必须恰好提供三个候选。只有人类可以选择、退回或冻结概念；未锁定不得进入玩法制作。
- **Tech Fit Lock**：Gate 1 后、灰盒前，根据玩法能力需求比较不超过三个技术方案；未知项用最小机制 spike 验证。只有人类能锁定技术，现有 Web 3D 参考实现不享有默认优先级。
- **Gate 2 — Fun Lock**：使用已批准技术完成灰盒；Demo 的测试闭环须有开始/游玩/暂停/重开及可判定的成功/失败，但这只证明被选假设，不代表完整游戏内容已经完成；由人类确认值得继续，未通过只迭代机制。
- **Gate 3 — Visual Lock**：人类批准目标关键帧和 StyleBible 后才能生产正式资产；锁定后不得未经批准增加色彩、材质或形状语言。
- **Gate 4 — Release Candidate**：质量分数总分至少 85、各分类至少 75、无 P0/P1，且证据齐全时才可放行。

每次 Gate 决策记录 `run-id`、输入版本、决策人、结果、理由与时间。没有人工批准记录即视为未通过。

## 并行边界

可并行：互不依赖的只读研究、候选发散、测试执行、日志分析与独立审查。

必须串行：主题选择、技术锁定、玩法冻结、视觉冻结、共享上下文修改、资产 ID 分配、同一文件修改、Gate 决策与发布放行。并行代理必须拥有不重叠的文件所有权；Loop Engineer 等待全部结果后再合并。若出现冲突或前置决策改变，停止旧分支并重新派发。

## 验证与迭代

- 任何完成声明都要附可复现命令、退出码，以及测试输出、截图或性能数据之一。
- 每个缺陷必须形成 `问题 → 证据 → 根因 → 最小修改 → 验证方法 → 前后结果`；不知道根因时只允许标记待诊断。
- 连续两轮无改善时，回退方案或缩减范围，不继续叠加补丁。
- 只验证受影响行为还不够时，运行完整质量检查；失败不得降级为“基本完成”。
- Demo 范围可以追求轻量和可验证，但不得因此缩短完整游戏愿景；平台、输入、2D/3D、引擎、渲染、物理、联网、AI 与资产管线不得在 Concept Lock 前被写死。每个游戏在 Tech Fit Lock 中独立声明技术、预算和验证命令。
