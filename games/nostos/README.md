# 归航 · NOSTOS

> 一个远航者，和他回家路上的每一次停靠。

本仓库当前交付的第一人称步行叙事探索游戏，以荷马《奥德赛》为背景，玩法范式参照《What Remains of Edith Finch》。八座岛各自独立，环境与遗物承载叙事。

**只有走、看、触碰。** 没有战斗、背包、复杂物理拾取、解谜锁或巨型开放世界。

![实时海岸标题](docs/screenshots/opening-01-title.jpg)

## 运行与操作

在仓库根目录执行（CI使用Node.js 22）：

```bash
npm ci
npm run dev:nostos
```

打开 [http://127.0.0.1:4175](http://127.0.0.1:4175/)，点击「循光归航」。

- 移动：WASD / 方向键 / 手柄左摇杆；快跑：Shift / 手柄左扳机。
- 观察：鼠标 / 手柄右摇杆。
- 触碰：E / Enter / 鼠标左键；点击画面可重新锁定鼠标。
- H：呼唤引路光尘，短暂指向下一处尚未查看的线索或离岛船。
- 空格：推进旁白或跳过回忆；开场中可直接跳过。
- Esc：暂停、查看航程、调整低动态、静音、字幕大小、灵敏度与视野。

首次开始是**约15秒的实时海岸连续镜头**，不是黑场教学。三句独白保留叙事悬念，操作提示随观察、移动和接近木筏出现。支持键盘菜单与低动态模式；手柄已接入，尚未完成实体设备验收。

## 本地分幕审阅

启动开发服务后，可直接打开：

- [第一幕 · 忘食岸](http://127.0.0.1:4175/?preview=lotus)
- [第二幕 · 独眼岬](http://127.0.0.1:4175/?preview=cyclops)

仅本机允许这两个参数，预览不读写或清除正常游戏存档。标准入口仍保留正常存档功能。

需要严格固定端口时：

```bash
npx vite --config games/nostos/vite.config.ts --host 127.0.0.1 --port 4175 --strictPort
```

## 八幕与当前美术进展

0. 无名之海：靛蓝黎明、盐蚀木筏、绳结、断桨、湿岸与唯一导星。
1. 忘食岸：蜜金黄昏、可透光果树、低垂果串、空瓮、灰塘、弃置头盔与庭院残铺。
2. 独眼岬：雷暴逆光、巨骨、羊栏、层岩洞窟与烧尖橄榄木桩。
3. 喀耳刻的柱廊：琥珀室内光与温柔的时间流失。
4. 亡者之岸：无光灰白，肃穆与赎罪。
5. 塞壬水道：铅灰海雾，诱惑与自缚。
6. 卡吕普索之岛：永昼过曝，永生的代价。
7. 伊萨卡：雾正在散，抵达后的空茫。

八幕流程已实现。最近视觉深化集中于第0—2幕和标题/引导，**不代表后五幕已完成同等精度的美术重建**。原有叙事、线索与回忆保持不变。

## 技术与资产

- 浏览器 WebGL2，Three.js、自定义 Fresco 壁画着色，TypeScript + Vite。
- 地形、现实环境与道具主要为固定种子的程序化3D几何，使用材质合批和简化碰撞。
- 表面细节主要由 Canvas2D 生成；回忆母题另包含 `assets/memory-motifs/` 下16张透明PNG。**不再是“零二进制资产”。**
- WebAudio 合成音景，无新增外部音频文件。
- 相机、海浪、雾、幻象与后期为实时效果；固定种子保证几何可复现，不意味着任意时刻的动态画面逐像素相同。
- 静态构建位于 `games/nostos/dist/`。实际体积以构建输出为准，PNG等资源也需计入，不沿用旧版“整包180kB、四个文件”的描述。

## 验证

在仓库根目录运行：

```bash
npm run validate:library
npm run test:nostos
npm run typecheck:nostos
npm run build:nostos
npm run test:e2e:nostos
```

最近一轮：76项单测通过；开场、窄屏/低动态、试水温、两幕全部交互与离岛、60秒资源观察等6个浏览器用例经复测通过。真实地形与碰撞可达性、资产ID和几何预算也有自动检查。

只运行受影响范围，并使用新端口避免复用旧预览：

```powershell
$env:NOSTOS_E2E_PORT='4186'
npx playwright test --config games/nostos/playwright.config.ts --grep '@act12|@opening|@prologue-visual'
```

测试前先构建。完整八幕回归可使用 `--grep '@journey'`；最近这轮未重跑完整八幕。软件渲染下纹理预热后保持稳定，但显卡实机帧率仍待验收，不声称达到Release Candidate标准。

具体命令、退出码与限制见[最新验证记录](runs/run-20260905-nostos-act12-art-r1/verification.json)。

## 资产台

```bash
npm run assets:nostos
```

生成 [docs/asset-library.html](docs/asset-library.html)，单文件可本地打开。页面直接调用源码生成器，展示颜料、材质、天候、程序纹理、几何、植物、地形、音景和剧本等；数量以当前页面为准。

第0幕有独立英雄资产分组，第1、2幕新增7件多材质英雄模型。场景与资产台通过相同ID和工厂解析。回忆PNG及其来源另见 [assets/README.md](assets/README.md)与[资产登记表](context/asset-registry.json)，不要把程序化母题预览误认为所有回忆PNG的自动同步副本。

改动生成器或参数后，游戏开发服务会更新；资产台HTML需要重新生成。资产台预览单独做一次sRGB编码，不进入游戏后期链。

## 天候试衣间

```bash
npm run tuner:nostos
```

生成 [docs/env-tuner.html](docs/env-tuner.html)。工具复用游戏的 `Viewport` / `Stage`，提供固定机位、光照/雾/后期/地形颜色调整、画面统计及参数导出。

入口在 `tools/tuner/main.ts`：`ACT_ID` 决定场景，`SHOTS` 决定机位。导出的改动需写回 `src/content/palette.ts` 或场景地形定义，再重新构建工具；调节审阅页本身不会自动修改游戏源码。

## 文档与事实入口

- [context/index.json](context/index.json)：当前运行、Gate、资产和验证记录入口。
- [世界观](docs/WORLDVIEW.md) · [Art Bible](docs/ART_BIBLE.md) · [分幕叙事](docs/SCENES.md) · [玩法规格](docs/GAMEPLAY.md)。
- [开场与UI规范](docs/OPENING_DIRECTION.md) · [第1、2幕美术深化](docs/ACT12_ART_DIRECTION.md)。
- [资产登记表](context/asset-registry.json) · [实拍截图](docs/screenshots/)。

Fun Lock已获人工确认；Visual Lock与Release Candidate尚未批准。用户授权的视觉试点不会被写成Gate审批。当前注册状态保留 `concept`，原因是概念/技术正式锁定记录仍未齐全，不是“没有可玩游戏”。

## 构建与发布

```bash
npm run build:nostos
npm run preview:nostos
```

[GitHub Pages 工作流](../../.github/workflows/deploy-nostos-pages.yml)在 `main` 的相关路径更新时执行单测、构建并发布 `games/nostos/dist/`。仓库Pages源需配置为GitHub Actions；上线结果以Actions实际状态为准。

`base: './'` 支持子路径部署。需上传整个构建目录，包括生成的PNG和JS/CSS，不能只上传HTML。锁文件使用了npm镜像源；若CI安装失败，应先检查对应错误，不在本轮修改依赖源。

## 目录

```text
assets/       回忆PNG母题及来源说明
context/      当前事实入口、风格规范、资产登记表
src/
  engine/     渲染、后期、天空海面、材质、控制器与音景
  world/      地形、程序化构件、回忆剪影、光尘与合批
  game/       幕流程、交互、进度、开场、分幕定义与本地预览
  content/    调色板与剧本
  ui/         标题、提示、字幕、暂停与情境引导
tools/assets/ 资产台生成器
tools/tuner/  天候试衣间
tests/        单元与浏览器测试
docs/         美术/叙事/玩法文档、工具页面与实拍
runs/         输入快照、迭代与验证证据
```
