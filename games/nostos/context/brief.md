# 《归航 · NOSTOS》来源简报

本作不是由 `concept-director` 发散三个候选、再经 Gate 1 人工锁定产生的。
它直接来自用户在 2026-09-04 给出的一份指定简报，并明确要求"过往仓库生成的历史内容不用管"。
因此 `gateState.gate1` 记为 `bypassed_by_user_brief`，而不是 `locked`——
**没有人工 Gate 记录就不能声称通过 Gate**，这一点在这里如实记下。

## 用户简报原文要点

- 第一人称步行叙事探索，主题荷马《奥德赛》。
- 玩法范式模仿《What Remains of Edith Finch 艾迪芬奇的记忆》：
  没有战斗、格斗、复杂物理交互；只有在半封闭独立场景内行走漫游、
  触碰物件触发回忆幻象与过场叙事片段，环境叙事为绝对核心，少量简短 NPC 对话。
- 主角是漂泊归乡的远航者奥德修斯，依次游历一系列互相独立的孤岛、海蚀海岸、
  沉船遗迹、残破古希腊神殿，每一处地点触发一段旅途遭遇的记忆。
- 美术：古希腊壁画色调、咸湿海雾、风暴与黄昏交替、石雕风化痕迹、
  胶片颗粒电影光影、壮阔忧郁史诗氛围。
- 范围：多个小型独立孤岛场景，严禁巨型无缝开放世界。
- 硬性约束：禁止自行增加海战、实时战斗、连招动作、大量可拾取物理物件、海量 NPC；
  不要脑补额外游戏机制。
- 需要输出：各场景美术与镜头描述、触发式回忆事件、环境线索清单、叙事片段、情绪基调。

## 交付对照

| 用户点名的输出 | 落在哪 |
|---|---|
| 各场景美术与镜头描述 | `docs/SCENES.md` 每一幕的「美术」「镜头」段 + `docs/ART_BIBLE.md` |
| 触发式回忆事件 | `docs/SCENES.md` 每一幕的「触发式回忆事件」段；实现在 `src/game/vision.ts` |
| 环境线索清单 | `docs/SCENES.md` 每一幕的「环境线索清单」表 |
| 叙事片段 | `docs/SCENES.md` 引文段落；全文在 `src/content/script.ts` |
| 情绪基调 | `docs/SCENES.md` 每一幕开头一行；同时写进 `SceneDef.tone`，有单元测试守着 |

## 尚未完成的事

- 未做 Gate 1 三候选发散与人工概念锁定。
- 未做 Tech Fit Review 的多方案比选（技术路线由用户简报的能力需求直接推导：
  浏览器 WebGL2 + Three.js，理由见 `docs/ART_BIBLE.md` 与 `README.md`）。
- 未做 Gate 2 人工 Fun Lock、Gate 3 Visual Lock、Gate 4 质量放行。
- 因此 `manifest.status` 停在 `concept`，不得对外声称为 graybox 或 release candidate。
