# 归航：海岸扉页与连续开场

本轮由用户授权直接实施。视觉批准状态仍为草案。

## 视觉语言

骨白 #e7d9be 用于标题和当前动作；旧铜 #b8a17b 用于导航刻线；靛蓝 #101c2b 承担界面背景。细线透明度22%，微动缓动 cubic-bezier(.16,1,.3,1)。标题以中文衬线为主，拉丁字距为辅，不添加字体下载。

布局采用左侧文字、右侧真实木筏与绳结、远景导星的层级。航海标记由48条刻度、一个圆与四向星实时生成。UI光标响应仅影响镜头小幅偏转，不移动按钮。星的光晕收敛为小亮点。

## 连续体验

标题可立即操作。点击后菜单淡出，海岸持续可见；十五秒内用三句独白建立归家动机、绳结与记忆关系。镜头按五次平滑函数靠近木筏，终点正好是自由行走起点。空格随时跳过，暂停冻结开场时钟。

第一次操作依次提示看、走、触碰。触碰绳结后教程退出；H引路在停留20秒或教程完成后显示。E触碰产生一次650ms环形扩散，不阻挡输入。十二条船保留到断桨回忆才揭示。

## 布局与可访问性

标题按钮使用原生button，隐藏面板设置inert，Tab在当前面板内循环并有可见焦点。窄屏与低高度屏采用独立排版，普通世界关闭强制宽银幕黑边。开场上下各7vh遮幅在控制权交接时退出。

尊重系统prefers-reduced-motion，标题提供静止镜头开关：取消漂移、推镜、UI动画与触碰扩散，以固定镜头和可跳过文字呈现。测试范围含1280×720、390×844和844×390；手柄与触屏行走未在本轮验证。

## 代码与资产

- game.nostos.ui.navigation_mark → src/ui/navigation-mark.ts
- game.nostos.ui.coastal_title → src/ui/opening.css、src/ui/overlay.ts
- game.nostos.camera.opening → src/game/opening.ts
- 复用第0幕木筏、绳结、海面与天空；本轮无新增位图和音效。

## 复核入口

npm run test:nostos；npm run build:nostos；设置NOSTOS_E2E_PORT=4186后运行Playwright @opening|@prologue-visual。截图位于docs/screenshots/opening-*.jpg。
