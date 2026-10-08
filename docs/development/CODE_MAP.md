# 新接手者的代码地图

先读[范围](../project/SCOPE.md)和[当前状态](../project/STATUS.md)，再按下面的任务入口打开文件。目录位置说明职责，STATUS说明完成度；不需要先读遍引擎。运行与检查见[作者指南](AUTHORING.md)，固定参考只读。

## 各层放什么

```text
src/
├── app.js                 浏览器启动装配，不写某个地图或招式的业务
├── content/               可编辑内容；manifest.json是唯一加载清单
│   ├── maps/<地图>/       map.json属性、grid.json生成的网格
│   └── stories/           按地区/流程拆分的对白、脚本、入口和投影
├── game/emerald/           宿主装配、应用用例、命令与服务生命周期
├── ui/emerald/             浏览器页面、视图与CSS
├── packs/emerald/          纯内容、原作业务政策、原生角色绑定
│   └── story/             地区动态触发、剧情描述、公共演出
│       ├── regions/       按地区选择事件，不存整章对白
│       └── common/        共用交互、战后处理、scenes.js短演出
├── engine/                通用领域规则、合同、状态及插件注册
├── presentation/          无规则写入的动画取样、布局和绘制
├── adapters/              浏览器DOM、Canvas、输入、音频及资源适配
└── plugins/<插件>/        可独立装配业务；catalog.json登记入口
```

`generated/`保存网格、图集、生成模块与素材；代码、服务和测试直接访问两棵目录，不复制生成dist。详见[目录合同](SOURCE_LAYOUT.md)。

`tools/`是导入/提取/校验入口；`tests/`验证内核及公开合同，`examples/`验证可选插件及作者示例；`skills/`是稳定接手流程。`work/`是参考或临时产物，不是可部署代码，也不能成为核心测试必需的依赖。

引擎已有battle、growth、creatures、extensions等子域；其余单模块按状态所有者命名。不要为整理目录一次性挪动所有文件。新规则先放已有子域；只有职责发生变化才移动模块，并同时改import、文档和测试。旧验证日志保留当时的路径，不改历史证据。

## 按任务找最小修改集合

| 我要改什么 | 第一落点 | 继续查什么 |
| --- | --- | --- |
| 某个地区台词、条件、走位 | [content/stories](../../src/content/stories/players-house.json)中对应bundle；新增文件登记manifest | [剧情语言](../engine/story/STORY_LANGUAGE.md)、[原作转写Skill](../../skills/emerald-story-reconstruction/SKILL.md) |
| 救博士追逐 | [route101.json](../../src/content/stories/route101.json)；step入口在story/regions/littleroot.js | 原作Route101/scripts.inc与[移动转换工具](../../tools/story/movement.py)；不要再向公共scenes.js追加地区长剧情 |
| 人物身份/初始出现 | [native-cast.js](../../src/packs/emerald/native-cast.js)、[opening-objects.js](../../src/packs/emerald/opening-objects.js) | native-object-bindings.js绑定来源local ID；阶段摆位写bundle.projections，动画写commands |
| 进图后人物站错/重复触发卡住 | [WorldApplication.prepareEntry](../../src/game/emerald/application/world-application.js)、剧情入口与requires | 普通地图NPC按新访问重建；持久Actor从Actor领域恢复；visit patch决定本次访问，不能靠NPC缓存充当进度 |
| 队伍选择与所选个体野外招式 | [party-menu-view.js](../../src/ui/emerald/party-menu-view.js)、[party-field-moves.js](../../src/packs/emerald/party-field-moves.js) | 原生布局/导航与规则描述分开；执行走movement.party-action，扩展关联搜partyMove |
| 原作菜单/文字/图标位置 | [界面说明](EMERALD_UI.md)、对应*-interface.js及ui/*-view.js | 原C窗口/精灵坐标；tools/ui/export-theme.py导出原图块/palette，不把规则写进CSS或app |
| 战斗动画/捕捉/音效时机 | pack的battle/sequences、opening-choreography、exit-choreography、move-choreography、controller-animation；公开frame-sequence-builder、通用timeline转场帧、color-offset-dom | [战斗专项](../project/BATTLE_PRESENTATION_PLAN.md)；内核编译有界帧，播放器读不可变数据；开战/退出政策留pack，动作/capture取样与播放生命周期分开，未覆盖招式无替代特效 |
| 插件改已有UI | [UI合同](../engine/presentation/UI_CONTRACT.md)、对应*-interface.js | UIRegistry管注册，ExtensionDOM管区域仲裁，LayoutDOM管控件；native-ui-controls只把原控件转换为宿主句柄 |
| 画面清晰度/尺寸 | [pixel-display.js](../../src/adapters/pixel-display.js)、canvas-renderer.js | PixelDisplay持有尺寸监听生命周期；规则格子仍是16px，绿宝石战斗逻辑视口240×160，通用默认320×224；不要改地图分辨率 |
| 战斗规则或新招式 | [battle-rules Skill](../../skills/emerald-battle-rules/SKILL.md) | move-effects/operations、规则阶段；动画走presentation注册，不放进规则函数 |
| JSON设施/比赛/游戏厅 | [设施作者指南](../../src/plugins/facility-content/README.md) | 配置已有模板；模板外规则读facility Skill，不能把设施业务塞进app.js |
| 导入原作资源/音乐 | [导入索引](IMPORT_SCRIPTS.md)、[音乐指南](../../skills/emerald-story-reconstruction/references/music-import.md) | 统一入口tools/import.py；先--check；运行时用真实资源与音频cue |

## 一段剧情怎样到达屏幕

`manifest → StoryCatalog → 地区入口匹配 → StoryApplication → FieldDirector / 领域命令 → UI/表现`。

对白数据、事件条件、演员动作分别有自己的位置。脚本移动的终点是本次演出事实，不等于下一次进图的出生点；重新访问应由内容投影/访问覆盖/持久Actor决定。修复重复触发时至少走两次入口，必要时在中间保存恢复，检查输入锁也已释放。

本次整理将公共短演出归入story/common/scenes.js，将Route101入场追逐归入地区JSON；没有更换启动器或增加一套平行剧情引擎。文件改名时搜索上表中的类名、bundle ID或原作label，不靠旧绝对路径猜。

原生地区角色选择：`native-cast-data.js` 编写按地图索引的出现条件/性别差异，`native-cast.js` 统一投影，`native-object-bindings.js` 绑定C对象身份及源位置。不要再在nativeCast按地图逐个增加分支。当前Mod审查与尚未实施的存档解绑见[计划](../project/MOD_REVIEW_PLAN.md)。

存档暂停/恢复落点为 `src/game/emerald/assembly/save/`，通用装配器为 `src/engine/content-suspension.js`；流程见[存档合同](../engine/SAVES.md)。地图名定时提示由 `src/adapters/map-name-dom.js`拥有。

2026-10-07表现落点：`src/packs/emerald/battle-presentation.js`原生战斗坐标、入场和教学/败北内容；`src/presentation/battle-director.js`时序与纯采样；`src/presentation/reflection-canvas.js`倒影裁切；`src/packs/emerald/field-reflections.js`地形/配色策略。真实菜单演示在battle-interface/bag-interface，`tools/ui/export-theme.py`导出PNG和`generated/presentation/battle-assets.js`元数据。组合验证见`tests/emerald-scene-fidelity.test.js`。

2026-10-07接续：`stories/oldale.json`与`native-cast-data.js`负责古辰镇等待对手；`field-director.js`/`npcs.js`负责通用场景演员跨图和显式NPC路径。`field-reflections.js`提供原作伸缩/定点列取样，`reflection-canvas.js`控制紧邻水面与站立旧位置清理；双主角跑步时序由petalburg/slice导入配置维护。专项入口`tests/oldale-rival.test.js`、`tests/emerald-scene-fidelity.test.js`、`tests/running-animation.test.js`。


2026-10-07 通用能力扩展：行为节奏由 `npc-behaviors.js` 校验、`npcs.js` 调度；`motion-results.js` 生成移动结果，`field-session.js`/`field-director.js` 接入，WorldApplication 发布 `core:motion`。Actor 事务形状位于 `extension-intents.js`，应用调用位于 `extension-ports.js`；`actor-transaction-effects.js` 负责运行缓存恢复，通用 PluginRuntime 只使用 commit/rollback 端口。合同与代表例见 [ACTORS](../engine/actors/ACTORS.md)。

移动结果及闭合原因：`src/engine/motion-results.js` / `blocked-reasons.js`；跟随验证产品：`src/plugins/patrol-lab/`；复刻执行工作单：`skills/emerald-story-reconstruction/references/execution-workbook.md`。
