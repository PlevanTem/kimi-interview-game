# 《光线之上》Godot Demo 资产预规划 v1

状态：**仅规划与占位，不构成 Gate 3 Visual Lock。**  
规则：Demo 优先使用程序化几何、Godot 内置材质和项目自有生成图；visual-director 在 Gate 2 后统一细化。

## 资产槽位

| 稳定 ID | 类别 | Demo 占位实现 | 后续替换边界 | 当前批准 |
|---|---|---|---|---|
| `game.odyssey-drifter.procedural.godot-demo-kit` | 程序化资产集合 | 由 resolver 生成几何、材质与 UI token | 保留 ID，替换内部资源工厂 | graybox-only |
| `game.odyssey-drifter.character.aja-placeholder` | 角色 | 胶囊、披挂块、灯笼与姿态节点 | Gate 3 后替换模型、骨骼、动画 | graybox-only |
| `game.odyssey-drifter.mechanic.lightline-placeholder` | 核心光线 | 程序化带状网格、锚点、脉冲 | 替换 shader、纹理与拖尾，不改线势接口 | graybox-only |
| `game.odyssey-drifter.environment.breathing-city-placeholder` | 环境 | 盒体、桥片、雾层和呼吸缩放 | 替换模块化场景与材质 | graybox-only |
| `game.odyssey-drifter.ui.demo-interface` | UI | Godot Control、系统字体、形状状态 | 替换字体、图标、排版 token | graybox-only |
| `game.odyssey-drifter.audio.demo-pulses` | 声音 | 程序化节拍与线鸣；若实现成本过高可静音 | Gate 3 后替换完整声音包 | graybox-only |
| `game.odyssey-drifter.concept.reframe-c-action-v1` | 概念参考 | 已登记 PNG，只供构图和方向参考 | visual-director 决定保留、重做或拒绝 | pending |

## Demo 必须可读的五种状态

- 活动光头：形状开口，不只改变颜色。
- 锚定：锚环闭合并产生结形。
- 张力：松、稳、紧、险分别使用弧度、线宽、节段密度和颤动。
- 阿迦提示：指向、后仰、前伸、脚尖双拍、张臂失衡。
- 回溯：旧光线逆向收束到安全节点，而非普通淡出。

## 本阶段明确不做

- 不设计正式角色服装、面部、材质细节或完整动画树。
- 不确定最终色板、字体、后期、粒子密度或声音风格。
- 不购买、不抓取第三方资产，不引入来源与许可证不明文件。
- 不把占位资产的路径当作身份；场景只能通过稳定 ID resolver 取得资产语义。

## visual-director 后续输入

Gate 2 通过后，visual-director 接收：本规划、C 概念图、用户试玩反馈、录屏/截图、张力状态读错点和性能预算；输出 StyleBible、四张目标关键帧、正式资产清单、提示词与资产替换优先级。
