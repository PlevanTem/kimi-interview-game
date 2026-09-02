# Game Workspace Template

复制本目录为 `games/<game-id>/`，将 `manifest.example.json` 重命名为 `manifest.json` 并填写真实值，然后创建以下目录：

- `context/`：该游戏唯一事实源和数据契约实例。
- `runs/`：按 `run-id` 隔离的输入、输出、决策与证据。
- `assets/`：仅保存该游戏独占且已登记的文件资产。
- `src/`：该游戏实现；纯逻辑与渲染保持分离。
- `tests/`：单元、E2E、视觉与性能验证。
- `docs/`：玩法、Art Bible、操作和发布文档。

工作区创建后，先运行 `npm run validate:library`，通过后才能进入 Concept Gate。
