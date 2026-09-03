# 共享上下文治理

`games/registry.json` 决定当前 active game；该游戏的 `games/<game-id>/context/index.json` 才是生产事实源入口。根级 `game-context/index.json` 只是历史框架夹具。代理必须按 active index 的 `readOrder` 读取当前版本，不能从聊天记录猜测状态。稳定标识符使用英文，面向人的说明使用中文。

Gate 1 通过前，`GameBrief.coreVerb` / `coreVerbs`、概念选择和 `StyleBible.conceptId` 必须为空；只有人工决策可以冻结 Brief。锁定后可以记录一个锚点动词或多个互相支撑的核心动词，不得把单动词当成所有完整游戏的硬规则。资产必须先写入注册表再由稳定 ID 引用。文件资产路径相对仓库根目录，程序化资产使用 `builtin` 定位器。

`GameBrief` 必须把完整游戏愿景与 Demo 验证切片分开。完整游戏不继承统一的 3–5 分钟、单场景或单动词限制；Demo 只实现足以判断最高风险假设的部分，并明确它不能证明什么。

每轮使用唯一 `run-id`，保存输入、输出、人工决策、闸门状态和证据。每次修复在迭代账本记录“问题 → 证据 → 根因 → 修改 → 验证 → 前后结果”；没有验证证据不得关闭。

验证命令：`node scripts/validate-context.mjs`、`node scripts/audit-assets.mjs`、`node scripts/validate-skills.mjs`、`node scripts/quality-report.mjs`。失败均返回非零退出码。
