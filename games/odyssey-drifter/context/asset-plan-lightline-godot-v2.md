# 《光线之上》Godot Demo 功能资产规划 v2

状态：Gate 2 迭代占位资产，不构成 Visual Lock。  
原则：先规划“物体做什么、如何改变状态”，不规划精细造型。

## 保留的稳定 ID

- `game.odyssey-drifter.procedural.godot-demo-kit`：Godot 程序化资产总入口。
- `game.odyssey-drifter.character.aja-placeholder`：阿迦身体提示代理。
- `game.odyssey-drifter.mechanic.lightline-placeholder`：从编辑线到承重桥的状态表现。
- `game.odyssey-drifter.environment.breathing-city-placeholder`：降级为远景深度与终灯指向，不再承载虚假玩法暗示。
- `game.odyssey-drifter.ui.demo-interface`：一句目标、终灯进度、局部错误与辅助操作。
- `game.odyssey-drifter.audio.demo-pulses`：起线、接通、锚定、踏线和失败的程序化音调。

## 新增功能资产 ID

| 稳定 ID | Demo 功能 | 关键状态 | 后续替换边界 |
|---|---|---|---|
| `game.odyssey-drifter.environment.light-platforms-v2` | 当前起点、下一亮台、已完成平台 | open / target / connected / completed | 替换几何材质，不改四态接口 |
| `game.odyssey-drifter.environment.anchor-gates-v2` | 必需锚与第五轮路线锚 | inactive / required / borrowed / missed | 替换环造型，不改序号与开合 |
| `game.odyssey-drifter.environment.hazard-fields-v2` | 雾谷与上沿危险 | idle / intersecting / rejecting | 替换体积表现，不改碰撞语义 |
| `game.odyssey-drifter.environment.terminal-beacon-v2` | 全局终灯与 0/5–5/5 进度 | dormant / charging / complete | 替换终灯设计，不改五段进度 |

## 可读性规则

- 只有当前可交互物体使用脉冲；完成物体使用稳定常亮；背景不脉冲。
- 所有亮起锚都进入规则，非必需锚必须暗下或隐藏。
- 危险区必须有明确边界、方向纹理和接触反馈，不能只靠颜色。
- 起点、锚、终点使用不同轮廓，不能都是同一种发光圆环。
- 已完成光桥永久留在世界中，支撑“连续五站”的空间记忆。

## visual-director 后续把关

Gate 2 通过后细化：isometric 构图比例、平台与城市形状语言、危险体积材质、阿迦轮廓、正式色板、光桥 shader、声音和字体。本阶段禁止把占位配色视为最终视觉规范。
