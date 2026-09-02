# Concept Forge

Concept Forge 是一套“创意与玩法先行，再选择技术并生产内容”的 AI 游戏 Demo 生产系统。它把概念、玩法、技术决策、视觉语言、资产、质量证据和每次纠偏纳入版本化管理。

系统不预设 Web、原生、2D、3D、引擎、输入方式或资产管线。每个游戏先锁定体验与核心机制，再根据能力需求比较技术候选、验证最高风险并由人类完成 Tech Fit Lock。仓库附带的 Vite、React、TypeScript、Three.js 和 React Three Fiber 页面只是一个已验证的参考适配器，不是新游戏默认值。

## 当前状态

当前处于 **Repository Bootstrap**，游戏生产工作流已由人类暂停，`games/registry.json` 中没有 active game。系统曾生成以下三个候选用于验证框架，但它们目前只是启动证据，不构成已登记或已锁定的游戏：

- **共振庭院**：用声波脉冲连接节拍节点，形成连锁共振；视觉记忆点是从冷寂到暖亮的同心波纹。
- **折径**：沿预设轴折叠微缩空间，为自动前进的光点接通断路；视觉记忆点是纸雕世界的三维折叠。
- **影迹信标**：转动信标，用投影出的影子桥护送旅者；视觉记忆点是聚光灯下不断重构的几何剪影。

当前参考页面保持主题中立，仅用于证明一种 Web 3D 路线及系统验证设施可以工作，不代表最终游戏主题或技术结论。恢复生产时，必须先创建 `games/<game-id>/` 独立工作区并登记，再进入该游戏自己的 Gate 1 与 Tech Fit Review。

## 快速开始

建议使用 Node.js 20 LTS 或 22，以及已安装的 Playwright Chromium。

```bash
npm install
npm run dev
```

打开终端显示的本地地址。以下操作只属于 Web 3D 参考适配器：

- `W` `A` `S` `D`：移动
- `Space`：与附近锚点交互
- `Esc`：暂停/继续
- `R`：重开
- `M`：静音

## 质量验证

```bash
npm run quality:framework
npm run validate:library
npm run test:e2e
npm run test:performance
```

`quality:framework` 验证上下文、资产、技能、代码、单元测试与构建。完整的 `npm run quality` 还要求 Gate 4 的正式质量报告；在游戏尚未通过 Gate 4 时，它按设计返回非零，防止把半成品误报为发布候选。

发布门槛为总分至少 85/100、任一类别不低于 75、没有 P0/P1，并附带测试输出、截图或性能数据。所有修复都必须留下“问题 → 证据 → 根因 → 修改 → 验证 → 结果”。

## 如何理解项目

- [架构与工作模式](docs/architecture.md)：工作流、数据流、文件系统、职责边界与纠偏路径。
- [多游戏内容治理](docs/content-governance.md)：游戏库注册、目录隔离、命名和共享提升规则。
- [技术选择治理](docs/technology-selection.md)：如何从策划和玩法需求推导技术候选、风险验证与锁定条件。
- [共享上下文治理](docs/context-governance.md)：单一事实源、读取顺序和资产引用规则。
- [质量评分与放行](docs/quality-system.md)：评分权重、证据要求和 Gate 4 条件。
- [变更记录](CHANGELOG.md)：功能、决策、修复与验证记录。
- [`game-context/index.json`](game-context/index.json)：所有代理开始工作的唯一上下文入口。
- [`games/registry.json`](games/registry.json)：正式游戏工作区与 active game 的唯一注册表。

项目级专家位于 `.codex/agents/`，可复用技能位于 `.agents/skills/`。未来每个游戏独立位于 `games/<game-id>/`；未经登记的目录会被校验器拒绝。仓库根目录现有的 `Note.docx` 不属于生产上下文，系统不会读取、修改或删除它。

## 许可与发布

当前项目为私有原型，尚未声明开源许可，也未公开部署。Gate 4 通过后输出静态 `dist/`、操作说明、最终报告、关键截图与完整迭代证据。
