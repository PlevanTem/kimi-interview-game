# 《千名之海》Tech Fit v1

状态：等待人工 Tech Fit Lock。本文不是技术锁定，也不是正式 Demo 完成声明。

## 结论

推荐 `Three.js + React Three Fiber + TypeScript`，置信度中高。它不是因为仓库“以前就用了 Web 3D”而胜出，而是因为：浏览器链接优先、规则状态必须可确定性测试、首个风险切片无需后端、且渲染层需要在视觉生产前保持可替换。独立 spike 已证明状态层与 3D 呈现可以分离、可以静态构建并经 HTTP 提供；视觉交互仍未验证。

反驳：Babylon.js 对 3D 场景、动画、导航、GUI、拾取和调试的集成更完整。如果盐岬港很快扩大到大量 NPC 路径、动画状态与场景作者工具，Babylon 可能比推荐路线更省总成本。当前它落后 1.05 分，不是能力弱，而是新增架构尚未 spike，迁移与范围膨胀风险更高。

## 独立评分

评分 0–100；总分按权重相乘后求和。产品玩法要求先于现有仓库技术。

| 路线 | 浏览器交付 25% | 确定性测试 25% | 场景/NPC 工具 20% | 资产/视觉 15% | 可逆迭代 15% | 总分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Three.js + R3F + TypeScript | 96 | 95 | 80 | 90 | 96 | **91.65** |
| Babylon.js + TypeScript | 94 | 88 | 95 | 94 | 80 | **90.60** |
| Godot 4 GDScript Web | 74 | 86 | 96 | 92 | 74 | **84.10** |

## 推荐栈的最小边界

- Three.js `0.180.x` 的 WebGL2 渲染基线；WebGPU 仅保留未来可选路径。
- React `19.x` + React Three Fiber `9.x` 负责呈现与界面，不持有权威玩法规则。
- TypeScript `5.x` 纯函数/状态服务持有身份、事实、权限、记忆、日程与重置。
- Vite `6.x` 产出静态 HTTPS 可部署文件。
- 首个灰盒不引入物理库、运行时生成式 AI、后端或多人网络。
- 模型与纹理通过 glTF 和稳定资产 ID 进入；视觉生产仍受 Gate 3 约束。

## 决策型 spike

位置：`runs/run-20260903-sea-of-thousand-names-tech-fit-v1/spikes/web-native-r3f/`

已证明：

- 4/4 自动化测试通过：两种身份派生不同通行权限/责任；必须先观察再声明；伊翁只记录离港前公开事实；重置快照确定。
- Vite 构建通过：49 个模块；JavaScript 1065.93 kB，gzip 296.19 kB。
- 本地 HTTP 端点返回 200 且存在预期根节点。

未证明：

- 当前没有连接可控浏览器，因此没有 WebGL 画面、按钮联动、控制台、键鼠或响应式布局证据。
- 斜俯视只用于架构 spike；第一人称、近距第三人称和斜俯视仍待下一轮可读性验证。
- 没有证明 5 个 NPC 的导航/感知成本、目标设备帧率、最终资产质量或玩法是否有趣。

构建警告：首包超过 Vite 500 kB 提示。进入灰盒后必须建立初始 JS、场景资产和峰值帧时预算，并在引入正式资产前尝试按场景/调试工具拆包。不能把 gzip 296.19 kB 当成性能已通过。

## 路线判定与回退

### A. Three.js + R3F

适合当前约束：静态链接、快速规则迭代、DOM 信息层、纯 TypeScript 测试、可拆除渲染绑定。

失败信号：下一轮相机/门槛 spike 仍无法让玩家在空间内读懂“当前身份—权限来源—伊翁所知”，且需要开发接近完整编辑器的内部工具。

### B. Babylon.js

优势：官方能力清单覆盖场景图、动画、碰撞、拾取、GUI、导航/人群、glTF 与 Inspector，较适合更重的 NPC/场景生产。

失败信号：即使使用集成工具，规则层与场景层仍无法干净隔离，或首个最小构建/编辑流程显著拖慢日常迭代。

### C. Godot 4 Web

优势：场景编辑、动画、导航与资源系统最完整，也最接近传统游戏工作室生产方式。

代价：Godot 4 Web 导出受 Compatibility/WebGL2 路线约束；多线程需要跨源隔离，单线程更兼容但有性能取舍；WASM/PCK 和独立编辑器链条削弱了本项目的链接优先与可逆性。

## 母版锚点与可编辑插槽

锁定技术后仍不得改变的母版锚点：权威规则不在渲染组件中；身份同时产生权限和责任；事实有来源与知情者；伊翁离港时锁定有限传闻；固定种子重置；成功/失败可追溯。

可编辑插槽：相机适配器、输入映射、React UI、R3F 场景绑定、模型/纹理/灯光/字体/声音/动画、NPC 路径实现和部署目标。只要纯规则契约与结构化内容不变，这些插槽可替换为 Babylon 或 Godot 适配层。

## 原始资料

- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Three.js WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
- [React Three Fiber：加载模型](https://r3f.docs.pmnd.rs/tutorials/loading-models)
- [Babylon.js Specifications](https://www.babylonjs.com/specifications/)
- [Godot 4.7：Exporting for the Web](https://docs.godotengine.org/en/4.7/tutorials/export/exporting_for_web.html)

## Tech Fit Lock 所需人工决定

人类需明确选择三条路线之一。批准推荐路线后，下一阶段才是：建立正式灰盒、实现完整开始/游玩/暂停/重开/成功/失败循环，并以 Gate 2 的玩法证据而非视觉完成度验收。
