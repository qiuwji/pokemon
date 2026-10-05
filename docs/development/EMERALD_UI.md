# 原作界面与游戏外插件面板

游戏画布采用GBA原240×160和3:2比例。像素输出仍由PixelDisplay处理；页面和战斗输入继续走既有UI控件及命令，不在CSS里写规则。原生选择区域的replace/hide能力保留。

## 代码放哪

- `dist/packs/emerald/ui/emerald-theme.css`：原作颜色、窗口边框、Start菜单、队伍/背包/详情与战斗样式。由index.html在通用style.css之后加载。
- `dist/packs/emerald/ui-shell.js`：为modal标注data-page和data-gender，不依靠内容猜页面类别。
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

依赖Pillow；只写dist/assets/ui及该目录source.json。不改变地图网格、人物、C源码或内容清单。运行时不依赖work；source.json保存所有输入/输出SHA-256。新增页面样式应继续使用独立data-page，不恢复根据menu-grid压缩整页的旧样式。

## 当前实现与待验

已接原作素材和色调、Start七项纵向入口、蓝绿队伍卡片、背包男女背景、详情配色、战斗2×2菜单及外部插件面板。页面仍支持现有工程信息与扩展区域；不是完整原作所有页面的逐像素复制。未进行游戏浏览器操作，字体大小、列表长内容、触屏、战斗栏布局与各页滚动由用户验收，收到反馈后针对页面修改。

保存与运行权限的核心测试不应导入可选产品插件；产品专项放examples。变更字段与验证记录更新STATUS和对应合同，避免把CSS通过检查写成视觉还原完成。
