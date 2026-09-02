# 共享上下文治理

`game-context/index.json` 是单一事实源入口。代理必须按 `readOrder` 读取当前版本，不能从聊天记录猜测状态。稳定标识符使用英文，面向人的说明使用中文。

Gate 1 通过前，`GameBrief.coreVerb`、概念选择和 `StyleBible.conceptId` 必须为空；只有人工决策可以冻结 Brief。资产必须先写入注册表再由稳定 ID 引用。文件资产路径相对仓库根目录，程序化资产使用 `builtin` 定位器。

每轮使用唯一 `run-id`，保存输入、输出、人工决策、闸门状态和证据。每次修复在迭代账本记录“问题 → 证据 → 根因 → 修改 → 验证 → 前后结果”；没有验证证据不得关闭。

验证命令：`node scripts/validate-context.mjs`、`node scripts/audit-assets.mjs`、`node scripts/validate-skills.mjs`、`node scripts/quality-report.mjs`。失败均返回非零退出码。
