# assets/

**本目录故意为空。**

Gate 3（Visual Lock）尚未由人工批准，因此不生产任何正式文件资产。
本作全部视听内容——天空、五层城市、平台、角色骨骼与布料、余光曲线、
粒子、后期与所有音效——都在运行时由代码生成。

登记的是**生成器**而不是文件，见 `../context/asset-registry.json`：

| 资产 ID 后缀 | 生成器 |
|---|---|
| `procedural.sky` | `src/backdrop.js#sky` |
| `procedural.city` | `src/backdrop.js#cityLayer` |
| `procedural.platform` | `src/world.js#drawPlatform` |
| `procedural.aga` | `src/aga.js#draw` |
| `procedural.lightline` | `src/lightline.js#drawLine` |
| `procedural.audio` | `src/audio.js` |
| `procedural.palette` | `src/palette.js` |

Gate 3 通过后，正式资产放进本目录，并以稳定 ID 登记到 `context/asset-registry.json`；
`src/palette.js` 的令牌可以整体替换而不改动任何玩法代码。
