# 《光线之上》玩法与交互对标研究

状态：用于 Gate 2 重构提案，不是视觉锁定或资产生产依据。  
研究日期：2026-09-03  
原则：吸收设计原则，不复刻关卡、角色、叙事、美术或专有表达。

## 1. 研究结论

当前 Demo 的问题不是“按钮太少”，而是同一个按钮没有进入足够多的因果关系。成熟作品的共同点是：

1. 输入简单，但每次输入都会改变世界中的结构、物体状态或角色关系。
2. 难度来自组合已知规则，而不是隐藏阈值、等待时间或更窄的操作窗口。
3. 教学发生在可操作的安全情境里；玩家先亲手证明规则，再面对组合题。
4. 角色和环境承担提示职责，文字只做兜底。
5. 同一种材料或能力在不同场景中保持同一物理/逻辑语义。

## 2. 对标拆解

### World of Goo：结构必须真的受力

World of Goo 获得 2009 D.I.C.E. “Outstanding Achievement in Game Design”。其核心不是把两点连上，而是用有限材料搭建会受重力和天气影响的结构，并把足够数量的 Goo 送达目标。

可迁移原则：

- 光线必须成为可推理的结构，不只是轨迹装饰。
- 线长、支点、受力与失败位置应在提交前可见。
- 同一目标应允许多种结构解，但每种解有明确代价。

来源：[D.I.C.E. World of Goo 游戏与奖项记录](https://www.interactive.org/games/video_game_details.asp?idAward=2009&idGame=979)

### Unravel：同一根线因几何关系获得不同用途

Unravel 的官方手册明确描述：纱线既能在两个连接点之间形成可承物/行走的桥，也能作为弹射器、救命绳和攀爬绳。用途不是由额外模式按钮切换，而是由连接方式和角色位置产生。

可迁移原则：

- 保留“驭线”一个主动作，但让线通过绕接、绷紧、下垂和接触机关产生不同功能。
- 不增加“桥模式/牵引模式/导电模式”按钮；世界对象自己解释线在此处做什么。
- 阿迦必须亲自走、拉、扶、压或携带，不能只是沿线播放跑步动画。

来源：[EA《Unravel》官方 PC 手册](https://eaassets-a.akamaihd.net/eahelp/manuals/unravel-manual_PC_ww.pdf)、[EA《Unravel Two》官方介绍](https://www.ea.com/games/unravel)

### COCOON：单一输入不等于单一思考

COCOON 获得 2024 BAFTA Game Design。它用一个主要交互键承载世界嵌套、搬运、组合和机关能力；开发者把教学描述为逐级搭建的“mental staircase”，先让玩家在无压力房间里发现规则，再组合规则。

可迁移原则：

- 每个房间只新增一个因果规则，但最终题必须同时调用之前学会的规则。
- 复杂度放在状态组合和空间关系中，不放在按键数量中。
- 第一间房不解释公式，只让玩家亲手看到“画线 → 机关变化 → 阿迦行动 → 出口打开”。

来源：[BAFTA Game Design 获奖记录](https://www.bafta.org/awards/games/game-design/)、[COCOON 官方介绍](https://annapurnainteractive.com/games/cocoon)、[Game Developer 对主创的谜题设计访谈](https://www.gamedeveloper.com/design/the-challenges-of-laying-worlds-upon-worlds-in-puzzle-game-cocoon)

### INSIDE：关卡本身就是操作说明

INSIDE 获得 2017 BAFTA Artistic Achievement、Game Design、Narrative 和 Original Property。它以极少操作完成环境谜题和无文字引导，挑战围绕玩家可观察、可试错的环境因果展开。

可迁移原则：

- 起始镜头必须同时呈现阿迦、阻碍、可交互机关与出口。
- 首次出现的机关只允许一个可尝试关系；成功后用环境运动完成解释。
- HUD 只说当前目的，不提前泄露解法；长说明页不能代替关卡教学。

来源：[BAFTA 2017 获奖公告](https://www.bafta.org/media-centre/press-releases/winners-announced-for-the-british-academy-games-awards-in-2017/)

### The Last Guardian：伙伴既是解题者，也是提示系统

The Last Guardian 让玩家与 Trico 一起解决环境谜题。官方资料强调其自然动作、视线、回避行为和重复动作提示；它也暴露出伙伴反应不确定会破坏解题确认感的风险。

可迁移原则：

- 阿迦的目光必须指向当前关注物，手脚动作必须直接改变机关。
- 玩家给出合法方案后，阿迦要在固定时间内明确执行，不能用“有灵魂”掩盖响应延迟。
- 提示动作必须是因果动作的预演：先看绞盘，再抓住绞盘；先试推棱镜，再回头等待光线。

来源：[The Last Guardian 官方介绍](https://www.playstation.com/en-gb/games/the-last-guardian/)、[PlayStation Blog：角色动作与提示设计](https://blog.playstation.com/archive/2016/11/22/the-little-details-that-make-the-last-guardian-an-adventure-to-savour-on-ps4/amp/)

### Chicory：绘制动作应改变世界并留下痕迹

Chicory 围绕画笔建立探索、解谜、角色互动和持久世界变化，并入选 2022 BAFTA EE Game of the Year 候选。其辅助系统在玩家需要时提供方向，同时不让颜色辨识成为通关门槛。

可迁移原则：

- 玩家织出的有效线应永久保留到房间完成，并改变道具和环境状态。
- 帮助分层：先由角色/机关给提示，再提供可请求的一句提示，最后才展示路径级提示。
- 所有机关状态同时用形状、运动和声音表达，不能只靠颜色。

来源：[Chicory 官方网站](https://www.chicorygame.com/)、[PlayStation Blog：绘画机制与辅助设计](https://blog.playstation.com/2021/03/17/the-world-is-your-canvas-in-chicory-a-colorful-tale-coming-to-ps5-and-ps4-this-spring/)、[BAFTA 2022 候选公告](https://www.bafta.org/media-centre/press-releases/ee-game-of-the-year-2022-shortlist-released/)

## 3. 对《光线之上》的原创转译

不复制上述作品的关卡或对象；只保留六条原创约束：

1. 线同时传递“可走路径、张力、光脉冲顺序”，三者来自同一条轨迹。
2. 阿迦是一个可改变机关状态的行动节点，而不是自动跑动的计时器。
3. 谜题由绞盘、棱镜和阿迦踏座三类装置组合；不再依赖节拍窗口。
4. 每次提交后 2–4 秒内出现完整因果反馈，不允许 8–15 秒等待结果。
5. 教学只保留可玩的第一房与按需提示，删除重复演示层。
6. 视觉设计后续围绕功能状态建立，不先用装饰掩盖规则不足。

