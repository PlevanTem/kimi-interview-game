# 游戏工作区

`games/` 是所有具体游戏创意的唯一归属地。根目录负责生产系统、共享契约与验证设施；这里负责隔离每一个游戏的创意、实现、资产和证据。

新游戏必须先写入 `registry.json`，再复制 `_template/` 的结构为 `games/<game-id>/`。`game-id` 使用英文 kebab-case，并在生命周期内保持稳定。

标准目录：

```text
games/<game-id>/
├─ manifest.json  # 身份、状态、Gate、所有者与路径
├─ context/       # Brief、概念、Style Bible、资产注册表、评测、迭代账本
├─ runs/          # 每轮输入、输出、决策、Gate 和证据
├─ assets/        # 该游戏独占的贴图、声音及其他文件资产
├─ src/           # 该游戏独占、按 Tech Fit Lock 选定技术实现的源码
├─ tests/         # 状态机、E2E、视觉与性能测试
└─ docs/          # 面向该游戏的设计、操作与发布说明
```

不要从一个游戏直接引用另一个游戏的目录。确实被两个以上游戏复用的内容，经过审查后提升到根级共享层；提升时必须记录版本、使用者、许可证和回归测试。

仓库根级的 Vite/React/Three.js 代码是生产系统的可运行参考适配器，不是新游戏默认技术。新游戏在 Gate 1 锁定概念后，先以 `technology-decision.json` 比较玩法所需能力，再由人类完成 Tech Fit Lock。
