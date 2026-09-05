# NOSTOS 资产

现实场景主要使用程序化3D构件、Canvas2D表面纹理与WebAudio音景；回忆使用本目录 `memory-motifs/` 下的16张透明PNG母题。这里不再是空目录。

- PNG加载与场景映射：`../src/world/memory-silhouettes.ts`。
- 程序化英雄资产：`../src/world/props.ts` 与 `../src/world/narrative-assets.ts`。
- 稳定ID、来源、哈希、依赖和审批状态：[`../context/asset-registry.json`](../context/asset-registry.json)。
- 美术规则：[`../docs/ART_BIBLE.md`](../docs/ART_BIBLE.md)。

在仓库根目录运行 `npm run assets:nostos` 更新程序化资产台。修改PNG时应同步检查透明边缘、裁切、哈希和实际回忆画面，不能只检查程序化预览。资产处于迭代审阅状态，不等于已获人工Visual Lock。
