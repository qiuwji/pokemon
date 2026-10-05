# 原作界面与游戏外插件面板

游戏画布采用GBA原240×160和3:2比例。像素输出仍由PixelDisplay处理；页面和战斗输入继续走既有UI控件及命令，不在CSS里写规则。原生选择区域的replace/hide能力保留。

## 代码放哪

- `dist/packs/emerald/ui/emerald-theme.css`：原作颜色、窗口边框、Start菜单、队伍/背包/详情与战斗样式。由index.html在通用style.css之后加载。
- `dist/packs/emerald/ui-shell.js`：为modal标注data-modal-page和data-gender，不依靠内容猜页面类别。
- `dist/packs/emerald/interface.js`：装配页面；Start保留原作七项纵向菜单，设置/扩展页承载工程工具和扩展入口。菜单项仍通过原页面工厂执行。
- `dist/adapters/plugin-manager-dom.js`：游戏外dialog。只写下次启动配置，不操作核心状态；BrowserInput在面板开启时屏蔽游戏按键/触控/道具快捷。
- `dist/adapters/plugin-settings.js` / `plugin-loader.js`：配置存取、启动动作与catalog装配；具体优先级见[内容管线](CONTENT_PIPELINE.md)。

## 原作素材生成

`tools/ui/export-theme.py` 从只读pokeemerald导出text_window/1.png、party_menu背景、男女bag背景、summary_screen信息背景。原32×32tilemap采用30×20可见区，解码8px图块、翻转位及调色板bank，输出240×160；输入引用越界直接报错。window按索引0透明，8px九宫格用于CSS border-image。

```sh
python3 tools/ui/export-theme.py --check
python3 tools/ui/export-theme.py
# 不在默认work/pokeemerald时添加 --source /path/to/pokeemerald
```

依赖Pillow；只写dist/assets/ui及该目录source.json。不改变地图网格、人物、C源码或内容清单。运行时不依赖work；source.json保存所有输入/输出SHA-256。新增页面样式应继续使用独立data-modal-page，不恢复根据menu-grid压缩整页的旧样式。

## 当前实现与待验

已接原作素材和色调、Start七项纵向入口、原作固定六席队伍窗口、背包男女背景、详情配色、战斗2×2菜单及外部插件面板。页面仍支持现有工程信息与扩展区域；不是完整原作所有页面的逐像素复制。未进行游戏浏览器操作，字体大小、列表长内容、触屏、战斗栏布局与各页滚动由用户验收，收到反馈后针对页面修改。

保存与运行权限的核心测试不应导入可选产品插件；产品专项放examples。变更字段与验证记录更新STATUS和对应合同，避免把CSS通过检查写成视觉还原完成。

## 宝可梦选择与野外招式入口

参考固定原作 `src/party_menu.c` 的 `SetPartyMonFieldSelectionActions` / `CursorCb_FieldMove` 与 `src/data/party_menu.h` 的窗口/图标坐标。原作源码入口：[party_menu.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/party_menu.c)。

菜单 → 宝可梦 → 选择一只 → 操作菜单。查看能力在先，已学野外招式按四个招式槽的顺序排列，随后交换、道具、取消；战斗中改为替换/查看能力/取消。蛋不显示野外招式与道具。野外招式不是背包页操作，背包HM用于学习招式。

`party-menu-view.js`只格式化快照与导航：左侧(8,24)80×56，右侧(96,8+24n)144×24，空席保留；图标使用已有32×64原作两帧icon，选中动画尊重reduced-motion。`export-theme.py`增加原作slot字节tilemap与独立palette重映射，正常/选中/蛋/空位分别导出，不手画替代。所有UI图层按240×160相对布局；真实浏览器字体和视觉对齐仍待用户验收。

`MovementApplication.partyFieldMoveOptions(uid)`返回选中个体的可用项；即使没有徽章仍显示已学招式，点击后给原因。`core.movement.party-action {uid,move,destination?}`重新解析UID和当前招式/资格，交给现有野外行动、冲浪或飞行领域执行。普通飞空术下一步选择已到访目的地；自由飞行插件通过fieldActions.partyMove关联起降，不修改队伍页面分支。潜水依现有dive/surface链接与模式判定选择下潜或浮出水面，不凭菜单创造潜水区域。

`core.party.swap {firstUid,secondUid}`通过领域交换任意两个成员，页面不重排存档数组。party.list原生replace/hide与native控件保留，party.actions/content带选中UID供扩展使用。

容器注记用data-modal-page，导航按钮用data-page且装配器只绑定button[data-page]。两者不能复用同名属性，否则容器onclick会在子按钮事件冒泡时重新打开旧页。输入的externalBlocked回调由BrowserInput构造保存，键盘/触摸/连续移动/道具快捷均检查；外部插件面板不开启时沿用原操作。
