# 《千名之海》Tech Fit v2：视觉质量优先

状态：等待同场景视觉 bake-off 或人工接受证据不足的风险。技术仍未锁定。

## 结论

加入“高质量和美学效果优先”后，推荐从 Three.js/R3F 调整为 **Babylon.js + TypeScript + Blender/glTF**，但只是暂定。Babylon 92.80，Three/R3F 91.55，差距 1.25；这不足以绕过视觉对比直接锁定。

这不是“Babylon 画质更高”的结论。两者都有足够高的视觉上限。差异在于 Babylon 内建 PBR、HDR 环境光、软/级联阴影、后处理、反射、Node Material、Node Render Graph、动画与 Inspector，更可能让小团队把时间用在构图、光色和动作，而不是组装工具。

## 反驳

Three.js 的自定义视觉上限不低，WebGPU 后处理支持节点组合、MRT、色调映射和 LUT 调色；已有状态 spike 也证明它的规则架构更可逆。如果视觉 bake-off 打平，应选 Three/R3F，而不是为功能表切换引擎。

Godot 的作者体验最好，但浏览器只能走 Compatibility 渲染器。官方架构文档明确指出该路径不提供 SDFGI、体积雾和雾体积等高端功能；它适合桌面优先，不适合当前“浏览器链接优先 + 高视觉目标”的组合。

## 新评分

| 路线 | 美学上限/控制 30% | 美术迭代 20% | 浏览器交付 20% | 玩法测试 15% | 资产管线 10% | 可逆性 5% | 总分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Babylon.js | 95 | 94 | 94 | 88 | 96 | 78 | **92.80** |
| Three.js + R3F | 96 | 78 | 96 | 95 | 90 | 94 | **91.55** |
| Godot 4 Web | 82 | 97 | 72 | 86 | 94 | 72 | **84.30** |

## 高质量的技术定义

- 一套统一的盐蚀石材、氧化青铜、旧帆布与海雾材质语言。
- 暖色日落与冷色海面形成明确的空间层次，门槛和人物轮廓始终可读。
- 胶片式 tone mapping 与克制 bloom；不靠强烈光效掩盖低质量资产。
- 动画强调停顿、视线、让路和拒绝等社会动作，而不是堆动作数量。
- WebGL2 是必达画面；WebGPU 只能渐进增强，不能承载唯一玩法提示。
- 每项画质提升同时记录下载、显存、draw call、frame time 和首帧代价。

## 决策型视觉 bake-off

Three 与 Babylon 使用完全相同的程序化盐岬门、青铜船印、旧帆布、水面、两套固定镜头和颜色数值。只比较：

1. 目标帧构图、材质、光影和色彩的一致性。
2. 调整灯光、雾、阴影、材质和调色需要的时间与代码量。
3. WebGL2 冷启动、首个有效画面、帧时、draw call、纹理内存和 shader stall。
4. 视觉提升是否损害身份权限、门槛与见证者信息的可读性。

若二者视觉与性能持平，选择更可逆且已有状态证据的 Three/R3F。只有 Babylon 显著减少作者工具成本或稳定获得更好的目标帧时，才承担切换成本。

当前缺口：没有连接可控浏览器，无法产出合规的并排截图、控制台与帧时证据。不能用源码功能表冒充画面验证。

## 正式实现边界

无论选择哪条路线，身份、事实、权限、NPC 记忆和重置仍由纯 TypeScript 规则层持有；渲染引擎只消费状态。Blender/glTF、资产 ID、许可证和颜色空间规范构成资产入口。Fun Lock 前只做机制灰盒，Gate 3 前不生产正式视觉资产。

## 原始资料

- [Babylon.js Specifications](https://www.babylonjs.com/specifications/)
- [Three.js WebGPU Post-Processing](https://threejs.org/manual/en/webgpu-postprocessing.html)
- [Godot 4.7 Internal Rendering Architecture](https://docs.godotengine.org/en/4.7/engine_details/architecture/internal_rendering_architecture.html)
- [Godot 4.7 Exporting for the Web](https://docs.godotengine.org/en/4.7/tutorials/export/exporting_for_web.html)
