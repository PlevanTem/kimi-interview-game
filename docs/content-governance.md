# 多游戏内容组织治理

本仓库采用“控制面 + 独立游戏工作区”模型，目的是让未来多个创意可以并行存在，却不会混用上下文、资产、代码和证据。

## 控制面与内容面

- **根目录控制面**：`AGENTS.md`、`.codex/agents/`、`.agents/skills/`、`schemas/`、`scripts/`、共享宿主代码和跨游戏文档。这里描述系统如何工作。
- **游戏内容面**：`games/<game-id>/`。这里描述某一个游戏是什么、如何实现，以及它为什么被放行。
- **框架启动夹具**：现有根级 `game-context/`、`runs/` 与主题中立页面用于证明框架可运行。它们不构成已登记游戏，也不能成为新游戏的隐式上下文。

## 注册优先

创建游戏前，先在 `games/registry.json` 登记稳定的 `game-id`。系统以 registry 判断哪些目录是有效游戏；游离目录会让 `npm run validate:library` 失败。

registry 同时保存唯一 `activeGameId`。当 `productionPaused=true` 时，active game 必须为空；这可以明确区分“维护生产系统”和“生产某个游戏”。

## 工作区所有权

每个游戏独立拥有：

- `manifest.json`：身份、生命周期、Gate 和上下文入口。
- `technology-decision.json`：玩法能力需求、技术候选、风险 Spike、人工批准和验证命令。
- `context/`：Brief、候选、Style Bible、资产注册表、评测与迭代账本。
- `runs/`：每轮输入快照、输出、人工决策、Gate 状态与证据。
- `assets/`：该游戏独占的文件资产。
- `src/`：该游戏独占的逻辑、渲染和 UI。
- `tests/`：单元、E2E、视觉和性能验证。
- `docs/`：该游戏的设计、操作和发布说明。

删除或归档游戏时不能只移动目录：必须同步 registry、manifest、CHANGELOG 和证据索引。

## 命名与引用

- `game-id`：英文 kebab-case，例如 `resonance-garden`。
- 游戏资产 ID：`game.<game-id>.<type>.<name>`。
- 共享资产 ID：`shared.<type>.<name>`。
- `run-id`：在 game workspace 内唯一，并携带日期或递增序号。
- 所有路径保存为仓库相对路径，禁止依赖个人绝对路径。

任何代码、资产、上下文或测试证据默认不能跨游戏引用。只有同时满足以下条件，内容才可提升到共享层：已被至少两个游戏实际使用、公共 API 足够小、有版本和许可证信息、有独立回归测试、变更已写入 CHANGELOG。

## 生命周期

`idea → concept → graybox → visual → integrated → released → archived`

生命周期与 Gate 是不同维度：生命周期方便游戏库分类，Gate 决定生产权限。状态变化必须由 Loop Engineer 串行更新，不能通过移动文件夹暗示状态已经改变。

## 创建顺序

1. 从 `games/_template/` 创建 `games/<game-id>/`。
2. 填写 `manifest.json`，创建六个标准子目录。
3. 将游戏登记到 `games/registry.json`；只有开始生产时才设置 `activeGameId` 并解除暂停。
4. 运行 `npm run validate:library`。
5. 验证通过后，才为该游戏创建首个 `run-id` 并进入 Concept Gate。
6. Concept Lock 后先完成 Tech Fit Review 与人工锁定，再实现灰盒。

这个顺序确保目录结构本身不能绕过人工 Gate，也避免多个创意共享一个模糊的“当前上下文”。
