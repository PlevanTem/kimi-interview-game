# 后五幕 · 海蚀彩陶风格延伸
Run: run-20260909-late-acts-r1。用户扩展到第三至第七幕；不代表新增 Gate 批准。StyleBible v7 将 v6 的既有色板与三段式非 PBR 材质扩展到全八幕。
## 设计与验收
- 喀耳刻：束髻折襟与腰带；织机有经线、综杆、陶配重；藤由根连续攀上门框，中央留净空。
- 冥界：年轻水手有脸、手、残衣；灰白而非黑色广告牌。界石加工面、框槽、桨纹，中央姓名仍被磨去。
- 塞壬：三维绳股、盘圈负形、绳结与散头，对比深色石座。
- 卡吕普索：已按 [第一人称低多边形修订方案 R1](CALYPSO_ENVIRONMENT_ASSET_PLAN.md) 更新运行时；[实现交接](CALYPSO_IMPLEMENTATION.md) 记录洞居生活 / 四泉草地 / 面海独处三区、肩前辫与无袖长裙、20 树桩和四泉接海。功能回归通过不等于审美批准；软件渲染性能未达标，硬件 GPU 表现待验证，未合并 main。
- 伊萨卡：石基、木门、椽、屋檐与排烟口，烟从火塘上方排出。
- 回忆：后五幕以眼位为舞台原点，完整主体；不让高台标高误差和过近巨幅裁切画面。
- 结尾：最后回忆后回到实景，凝视屋顶烟、沿中轴走向门槛、淡出原有结局。可跳过、暂停冻结、减少动态时静止构图；不新增团聚人物。
## 研究转译（不是历史复原）
[卫城博物馆界石](https://www.theacropolismuseum.gr/en/node/22322)：加工面与铭文边界，改为磨去名字的空白中心，不复制原铭文。
[TRC 配重织机](https://trc-leiden.nl/trc-digital-exhibition/index.php/ancient-greek-loom-weights/item/133-5-how-were-the-loom-weights-used)：配重系在经线束下，不是帆布架。
[Met 陶配重](https://www.metmuseum.org/art/collection/search/252656)：陶质配重形体。
[Met 服装结构](https://www.metmuseum.org/de/essays/the-chiton-peplos-and-himation-in-modern-dress)：折襟、束腰、披衣区分人物。
[Odyssey V](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0218%3Abook%3D5)：四道泉、伐二十株树、赠衣。二十棵雪松是本作改编，不当作原典精确树种。
实拍复查：旧天候仍继承 sculptedStyle=0，统一改为1并收敛光晕/颗粒；随机石块遮泉眼与绳尾，增加物件及水路留白；喀耳刻错开柱位且与织机间距大于2.5m，局部颜料反弹补光保留背光场景的脸部识别。
新增几何为项目原创，无复制馆藏图像。稳定 ID 共用于游戏和工作台。人物为静态雕塑，不冒称骨骼动画。测试截图通过后才验收。
