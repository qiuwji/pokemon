# 原作界面与游戏外插件面板

## 2026-10-06 · 截图问题修正

详情的front.png可以带黑色VRAM预留槽，不能按高度当作动画。`tools/import.py detail-sprites`读取anim_front.png和normal.pal，生成独立`*-detail.png`、帧元数据与输入哈希；静态降级只取首帧。原生详情播放一次后返回首姿态，插件仍可定义循环。工具验证覆盖真实土狼犬双帧的前景/透明背景、预演和重复生成无差异。

Start的遮罩透明，但菜单窗口明确保留原作窗口图和填充；队伍卡片字体/hover有局部样式，避免通用modal按钮染色。持有道具居中、数值与经验条按原label/data窗口对齐。队伍底图/空位黄绿色来自固定参考调色板，不用任意滤镜改色。真实排版、颜色和动画观感仍由用户端到端验收。

队伍小图标的调色板从pokemon_icon.c的gMonIconPaletteIndices和graphics.c的gMonIconPalettes解析，不能使用物种normal.pal。区域/物种/详情导入器复用pixel_assets.py的同一解析，避免再次导入时恢复错误颜色；详情导入器可局部修复已有图标，源哈希与透明像素比较均记录。

游戏画布采用GBA原240×160和3:2比例。像素输出仍由PixelDisplay处理；页面和战斗输入继续走既有UI控件及命令，不在CSS里写规则。原生选择区域的replace/hide能力保留。

## 代码放哪

- `src/packs/emerald/ui/emerald-theme.css`：外层画面、窗口、Start与六席队伍的基础样式。
- `src/packs/emerald/ui/native-pages.css`：独立页面的240×160坐标、原作背景层与文字窗口；在基础主题之后加载。
- `src/packs/emerald/ui/native-view.js` / `summary-view.js` / `flight-view.js`：纯显示数据和导航，不能写领域状态。
- `src/packs/emerald/ui-shell.js`：为modal标注data-modal-page和data-gender，不依靠内容猜页面类别。
- `src/packs/emerald/interface.js`：装配页面；Start按进度显示原作纵向菜单，图鉴和队伍未解锁时不出现；设置页承载已支持的文字速度、声音和窗口边框，扩展功能承载工程入口。菜单项仍通过原页面工厂执行。
- `src/adapters/plugin-manager-dom.js`：游戏外dialog。只写下次启动配置，不操作核心状态；BrowserInput在面板开启时屏蔽游戏按键/触控/道具快捷。
- `src/adapters/plugin-settings.js` / `plugin-loader.js`：配置存取、启动动作与catalog装配；具体优先级见[内容管线](CONTENT_PIPELINE.md)。

## 原作素材生成

`tools/ui/export-theme.py`从固定只读参考导出窗口1–20、队伍卡片、男女背包及口袋sprite、详情四页/蛋、图鉴、训练家卡片/徽章、电脑/森林壁纸、商店、选初始精灵、地区地图、战斗血框、精灵球与物品图标。

不能把PNG直接当完整画面：图块配对应tilemap、palette及bank后解码；原作屏幕只显示240×160。地区地图是8bpp/8位仿射索引；PC图块有256基址，壁纸由55个frame tiles和8个bg tiles拼接；透明色取索引0。导出器校验图块和调色板引用越界，source.json记录输入/输出SHA-256。item-icons.js为同步查表产物，人工不要修改。

```sh
python3 tools/ui/export-theme.py --check
python3 tools/ui/export-theme.py
# 不在默认work/pokeemerald时添加 --source /path/to/pokeemerald
```

依赖Pillow；只写generated/assets/ui及该目录source.json。不改变地图网格、人物、C源码或内容清单。运行时不依赖work；source.json保存所有输入/输出SHA-256。新增页面样式应继续使用独立data-modal-page，不恢复根据menu-grid压缩整页的旧样式。

## 当前实现与待验

当前页面工厂复用领域操作，新增原作素材、屏幕布局与导航；没有用UI重写背包、PC、成长或战斗规则。完整界面库存如下。

| 页面 | 控制器 / 原作定位入口 | 核准的关键位置或行为 |
| --- | --- | --- |
| Start / 设置 | interface、options-interface / start_menu.c、option_menu.c | 纵向入口；左右切换速度/20种边框；声音控制注入音频适配器 |
| 队伍 / 能力 | party-interface、summary-view / party_menu.c、pokemon_summary_screen.c | 六席；详情sprite中心(40,64)，No. y16、名字y96、物种y112；招式类型x88、名称x120、PP x192 |
| 背包 / 使用目标 | bag-interface / item_menu.c、item_menu_icons.c | 精灵包中心(68,66)，物品图标中心(24,88)；items/balls/machines/berries/key顺序；左右换袋、上下选物 |
| 图鉴 | dex-interface / pokedex.c | 预览中心(96,80)；见过/捕获计数与列表；未见物种不展示sprite |
| 电脑 | box-interface / pokemon_storage_system.c | 每页6×5；图标中心(100+24列,44+24行)；取出/满队交换走现有命令 |
| 训练家 | trainer-interface / trainer_card.c | 名字(24,41)、金钱(24,65)、图鉴(24,81)、时间(24,97)、肖像(153,40)、徽章y120 |
| 商店 / 保存 | shop-interface、save-interface / shop.c、save.c | 商店保留地图透底；保存上方统计+底部提示+是/否；导入/导出/重开折叠为工程工具 |
| 初始精灵 | starter-interface / starter_choose.c | 三球中心(60,64)/(120,88)/(180,64)，手指及三帧球；预览后二次确认 |
| 时钟 / 飞空目的地 | time-interface、movement-interface / wallclock.c、region_map.c | 原作表盘+确认；已到访目的地叠到地区图，插件目的地保留列表回退 |
| 战斗 | battle-interface、BattleDirector / battle_interface.c、pokeball.c | 四方向2×2菜单；PP/属性右栏；投球、摇晃、释放按目标席位定位 |
| 工程与插件页 | 对应*-interface、ExtensionDOM | 原作窗口/配色；仍为自研功能，不伪造原作页面 |

**当前边界**：实际页面布局、中文字体、长文换行、触摸与听音仍待用户端到端验收。训练家卡背面完整成绩、PC全操作、物品丢弃/数量选择、未导入华丽大赛招式元数据等仍没有原作完整业务；设置没有伪装已支持战斗风格/立体声/按键模式。并非全作所有界面逐像素完成。

保存与运行权限的核心测试不应导入可选产品插件；产品专项放examples。变更字段与验证记录更新STATUS和对应合同，避免把CSS通过检查写成视觉还原完成。

## 宝可梦选择与野外招式入口

参考固定原作 `src/party_menu.c` 的 `SetPartyMonFieldSelectionActions` / `CursorCb_FieldMove` 与 `src/data/party_menu.h` 的窗口/图标坐标。原作源码入口：[party_menu.c](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/party_menu.c)。

菜单 → 宝可梦 → 选择一只 → 操作菜单。查看能力在先，已学野外招式按四个招式槽的顺序排列，随后交换、道具、取消；战斗中改为替换/查看能力/取消。蛋不显示野外招式与道具。野外招式不是背包页操作，背包HM用于学习招式。

`party-menu-view.js`只格式化快照与导航：左侧(8,24)80×56，右侧(96,8+24n)144×24，空席保留；图标使用已有32×64原作两帧icon，选中动画尊重reduced-motion。`export-theme.py`增加原作slot字节tilemap与独立palette重映射，正常/选中/蛋/空位分别导出，不手画替代。所有UI图层按240×160相对布局；真实浏览器字体和视觉对齐仍待用户验收。

`MovementApplication.partyFieldMoveOptions(uid)`返回选中个体的可用项；即使没有徽章仍显示已学招式，点击后给原因。`core.movement.party-action {uid,move,destination?}`重新解析UID和当前招式/资格，交给现有野外行动、冲浪或飞行领域执行。普通飞空术下一步选择已到访目的地；自由飞行插件通过fieldActions.partyMove关联起降，不修改队伍页面分支。潜水依现有dive/surface链接与模式判定选择下潜或浮出水面，不凭菜单创造潜水区域。

`core.party.swap {firstUid,secondUid}`通过领域交换任意两个成员，页面不重排存档数组。party.list原生replace/hide与native控件保留，party.actions/content带选中UID供扩展使用。

容器注记用data-modal-page，导航按钮用data-page且装配器只绑定button[data-page]。两者不能复用同名属性，否则容器onclick会在子按钮事件冒泡时重新打开旧页。输入的externalBlocked回调由BrowserInput构造保存，键盘/触摸/连续移动/道具快捷均检查；外部插件面板不开启时沿用原操作。

## 输入、文字与战斗演出的交接

确认音效由UI shell/战斗输入入口在实际操作前播放；实体点击用捕获阶段处理，仅接受isTrusted，程序调用.click()不再重复响。页面处理器不另播confirm；购买、获得物品、叫声仍使用语义音效。首次场景确认也响；对话确认只播放一次；移动/战斗忙时不会误响。短音效预解码不阻塞启动。声音关闭时保持安静，不自动替玩家开启。

NPC对白默认typewriter；告示牌、物品/家具查看在数据显式写mode:"instant"，不由UI根据名字或文字内容猜。行内停顿和reduced-motion继续遵循对话合同。

BattleDirector消费已经提交的快照，捕捉结果消息留到完整摇晃和释放/封球之后，再保留阅读时间。原规则四次判定成功对应原作三次可见摇晃（pokeball.c / SpriteCB_BallThrow_Shake）；失败按既有shakes显示，不重新抽签。ball/capture事件保留所用item，仅供选原作球图。

演出音效通过纯pack函数battle-audio.js输出{id,at}，通用timed-cues.js使用注入Timeline推进，不在sample/draw里播放，不会每帧重复响。投球、摇晃、挣脱和入场/换人释放已接原SE资源；未导入逐招式音效仍安静，不以通用撞击替代。原作入场四种图案及选取仍复用battle-transitions与对应绘制器，未改规则。

插件原生region与native句柄保留，动画关闭/换页由ownModalResource释放。新页面按data-modal-page/data-native-layout归属，不能给导航按钮和容器复用data-page。页面布局的新变动应以本文源码关键词定位；最新测试证据看STATUS，不能从本节推断视觉已验收。

## 地图名提示策略

MapNameDOM只管理提示生命周期，app按有效地图元数据调用。`indoor:true`不弹名称，室外默认显示，可通过`showMapName:false`关闭；进入室内立即取消上一个室外提示的定时器并隐藏。位置标题和AI观察仍保留地图名称。
