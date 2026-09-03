# 《千名之海》GitHub 候选分支说明 v1

## 分支边界

- 分支：`feat/sea-of-thousand-names-action-demo-v1`
- 用途：在不合入 `main` 的前提下，保存并评审《千名之海》动作冒险 Demo、设计 v2、技术锁定证据、预视觉参考和角色动作实验室。
- Gate：Gate 1 与 Tech Fit 已由人类锁定；Gate 2、Gate 3、Gate 4 均未通过。
- 发布：本分支只同步源码和证据，不创建 PR、不触发主分支合并、不修改仓库可见性，也不宣称 GitHub Pages 已发布。

## 评审入口

```powershell
npm.cmd --prefix games/odyssey-reimagined install
npm.cmd --prefix games/odyssey-reimagined run dev -- --host 127.0.0.1
```

- 主 Demo：`http://127.0.0.1:5173/`
- 角色动作实验室：`http://127.0.0.1:5173/?lab=character`

## 当前可验证内容

- 标题舞台、观察客符、身份声明、守卫教学战、潮门誓卫、三条名线、拆名结算、传闻传播与离港成功。
- 船长/朝圣者的规则差异、公开/绑定/斩断的不同传播结果、暂停/失败/重开。
- 程序化角色模型、十二动作调试入口、四组镜头、线框/骨架/武器轨迹和渲染统计。

## 提交前验证

- `npm.cmd run validate:library`：通过。
- `npm.cmd run validate:context`：通过。
- `npm.cmd run audit:assets`：通过。
- `npm.cmd run lint`：通过。
- 根项目与游戏包两套生产构建：通过。
- 游戏规则与角色契约 Vitest：9/9 通过。
- Playwright：2/2 通过，串行运行角色实验室与完整船长路线。

## 已知限制

- 当前是 graybox / previsual candidate，不是正式美术资产。
- 只有船长路线完成浏览器端到端自动化；另一身份和三种结算由规则测试覆盖，仍需补浏览器路径。
- 游戏主 JavaScript chunk 约 1.10 MB，预视觉 PNG 合计约 11.8 MB；进入 Gate 4 前必须拆包和转换 WebP/AVIF。
- 没有生产音频、完整手柄映射、移动端与 21:9 回归，也没有公开部署证据。

## 人工评审问题

1. 青色招架、金色闪避、守势与名线是否无需解释即可区分？
2. 身份是否改变了实际战斗决策，而不只是文本和数值？
3. 拆名后的三种处置是否足以支撑继续游玩的动机？
4. 如果答案是否定的，停留在 Gate 2 修改机制；不要提前批准正式资产生产。
