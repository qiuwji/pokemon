# 插件 API 1：启动注册、受限事务和声明式界面

当前工程版本 v0.15.0，插件 API 1，开发存档 envelope 8。插件是项目内受信任 ES 模块，在启动时装配。它不是第三方代码沙箱，不支持运行中的安装/热卸载。项目内插件也须遵守接口边界，不能自行访问 DOM、全局游戏实例或存储。

## 依赖方向与生命周期

`app.js` 选择插件 → `PluginHost` 校验 manifest/依赖并暂存注册 → `ExtensionCatalog.seal()` 校验领域引用 → 创建游戏 → `attachEmeraldExtensions()` 注入应用端口 → 创建界面。

manifest 包含 `id / apiVersion / version / dataVersion / permissions / dependencies / setup`。ID 为小写命名空间，注册局部 ID 得到 `plugin-id:local-id`。API 版本必须为 1，插件版本为三段数字，依赖声明指定主版本。重复、缺依赖、环依赖和失败的 setup 都中止启动，失败的暂存不污染基础内容。

核心引擎不导入绿宝石、浏览器或表现模块。插件宿主只接收 state/query/random/applyIntent/present/changed 端口；项目内的宽应用门面仍是可信装配层的有意取舍。插件 API 不暴露该门面。

## 14 项能力及入口

| 能力 | 提供的入口 | 使用范围 |
| --- | --- | --- |
| 内容注册 | `api.content.register(kind,id,definition)` | species/moves/items/inventoryPockets/learningMethods/weather/battleWeather/abilities/heldItems/moveEffects/actors/resources/tilesets 等 |
| 世界扩展 | maps/mapExtensions/movement/destinations | 网格地图、NPC 元素、门和连接；已有地图仅追加元素/门/连接 |
| 状态定义 | `api.states.register`，`ctx.states` | 按精灵 UID 保存，自定义 schema，step/round/manual/permanent 生命周期 |
| 行为注入 | `api.actions.register`，`api.rules.register`，`api.story.register` | 事务行动、标准规则阶段、剧情命令构建 |
| 数值修饰 | rules 的 phase/priority/when/modify | 与原特性、道具共用规则管线；只读上下文 |
| 事件 | `api.events.on`，`ctx.emit` | 提交后发布事实，自定义事件必须属于自己的命名空间 |
| 查询 | `api.query()` / `view.query()` / `ctx.query()` | 脱离领域对象且深冻结的世界、队伍、背包、剧情、育成和战斗投影 |
| 行动交互 | `api.actions.register` / `api.commands.dispatch` | 参数 schema 校验；UI、插件与网络共用 CommandBus |
| 页面与页签 | `api.ui.page` / `api.ui.entry` | 注册页面，在 `monster.detail` / `menu` 插槽加入入口 |
| 导航 | entry.page、通用页面 back | 由适配器负责导航、关闭与焦点 |
| 布局交互 | 页面 render 返回声明式节点 | text/heading/image/button/select/meter/panel/row/grid；图片可以绑定点击行动 |
| HUD | `api.ui.hud` | 常驻信息；状态改变时刷新，不把整份存档每帧序列化 |
| 持久化 | `ctx.store.set` / `view.store.get` | 每个插件独立记录，dataVersion/validateData，当前版本严格校验；保存读取跟随核心存档 |
| 表现 | `api.presentation.register/play` / `ctx.feedback` / `api.ui.theme` | page/field/battle 独立动画时钟与 Canvas 反馈；受控像素主题 token |

地图来自 16px 网格和 8px tile/metatile 图集，不是整张场景截图。注册地图可引用既有 tileset/actor；新图集、角色和宝可梦位图通过资源文件供应。基础内容、地图引用、网格尺寸、招式效果、道具效果和进化条件在启动时统一校验。

## 事务、查询和失败处理

所有状态写入由同步事务执行：读取冻结输入 → 修改自有数据草稿 → 暂存状态/核心意图 → 校验 → 一起提交 → 发事件/反馈/刷新/保存。失败时用 StateCheckpoint 恢复原对象身份、核心数据与规则随机数。自定义数据是有界 JSON，禁止函数、原型键、循环、无限数值和超大嵌套。

插件不能直接修改核心亲密度、库存或装备。权限词汇由内容包注入通用宿主。manifest 先声明权限，再通过 `ctx.intent` 请求 friendship/useItem/equip/setLead/reward/createMonster/learnMove/weather。绿宝石适配器逐项校验形状、范围、UID、库存及容量，调用原领域服务。权限不是操作系统沙箱，只是受信任插件协作合同。

规则修饰、页面 render、when、数据校验、状态生命周期均要求同步。规则/界面读取回调内禁止发命令；过期事务上下文不能继续写。事务期间禁止嵌套命令。事件监听如需写状态，提交后发起下一条命令。事件链有界，监听器和界面/绘制故障被隔离；已经提交的领域结果不会因渲染故障回滚。

插件状态附在 UID 上，换位、寄存、交换不会变成槽位索引。移除只提供自有记忆的插件后保留其数据；恢复插件可继续读。存档引用插件地图/精灵/道具等核心内容时记录 contentDependencies，缺失依赖时保护原存档并明确提示，禁止用空白新档覆盖。坏格式/错误内容也保护原文，可导出恢复。多个页面的普通过期写入用存储基线比较拒绝；这是乐观冲突检测，不承诺跨进程原子事务。

## 典型消费方

`dist/plugins/companion-care.js` 是独立详情互动页。注册入口、图片/按钮行动、情绪数据、excited 状态、亲密度修饰、喂食核心意图、互动事件和像素爱心反馈。点击图片抚摸，按钮玩耍/喂食；无需给原详情页加入这些玩法分支。

`dist/plugins/field-journal.js` 是第二个独立消费方。注册小饼干、新网格房间/观察员、研究所门、一次性剧情奖励、手记页面/详情入口、菜单入口、步数 HUD 和事件驱动计数。实验室东侧 (12,9) 入口从 (12,8) 向下进入，返回也落在通行网格。

```js
const plugin = {
  id: 'my-plugin', apiVersion: 1, version: '1.0.0', dataVersion: 1,
  permissions: [],
  setup(api) {
    const action = api.actions.register('remember', {
      schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      run(ctx) { ctx.store.set('visits', (ctx.store.get('visits') || 0) + 1); }
    });
    const page = api.ui.page('notes', {
      title: '旅途笔记',
      render(view) { return { kind: 'panel', children: [
        { kind: 'text', text: `访问 ${view.store.get('visits') || 0} 次` },
        { kind: 'button', text: '记录', action }
      ]}; }
    });
    api.ui.entry('menu', { slot: 'menu', label: '旅途笔记', page });
  }
};
```

详情页 context 包含 uid，控件输入合并该 context，action.schema 必须声明 uid。菜单页面 context 为空。页面节点不接受原始 HTML、任意 CSS 或 DOM 回调。

## 范围与验收

282 项自动检查通过，包含两个独立插件、失败回滚、规则管线、保存/缺失依赖、事务生命周期、异步回调拒绝、严格意图和地图引用。浏览器验证互动后保存恢复、插件房间进出、NPC 剧情与奖励；截图在 outputs/plugin-interaction.png 和 plugin-world.png。

插件能组合现有领域能力。全新领域语义仍需核心提供合同，例如实时动作物理、服务器权威同步、新的竞赛规则或任意三方脚本沙箱；不能把扩展注册接口等同于无限规则兼容。网络编码和传输见 NETWORK_ARCHITECTURE.md，表现注册表/逐招式脚本扩展已完成，见 PRESENTATION_ARCHITECTURE.md。

## 表现扩展补充

`api.presentation.effect/move/scene/transition/audio/sound` 分别注册绘制器、按 moveId 的多轨脚本、带 schema 的独立场景、转场模式和音频声明。绘制回调不获得可写领域对象；故障由宿主隔离。演出请求使用 `core.presentation.play` 命令，须声明 presentation 权限。现有 register/play 与 ctx.feedback 提供页面/野外/战斗反馈。原作未开放设施只有场景演出槽位；新设施规则仍需对应领域合同。

公共类型消费检查和最终数据保护验收见 FINAL_VALIDATION.md；282 是 P6 阶段检查点，不是当前全量数量。

音频仅接受资源文件，插件 sound 只能请求自有已注册音效，规则评价/未提交事务拒绝。完整合同见 docs/engine/AUDIO.md。插件数据旧版本不再自动迁移。

天气注册/只读查询/受权限命令与事务/独立战斗政策及视觉详见 [WEATHER.md](docs/engine/WEATHER.md)。开发版本只接受当前 envelope/dataVersion，旧迁移路径已移除；天气依赖不能静默回退。

关键道具 `items.actions` 可绑定已注册 fieldActions；现有背包自动提供单/多行动入口，core.query 返回持有道具的行动预览，core.item.action 同时用于 UI/网络/授权插件。异步执行复用野外规则/计划/导演与保存，不支持嵌套事务 dispatch。详见 [ITEM_ACTIONS.md](docs/engine/ITEM_ACTIONS.md)。

物品可通过 registerable:true 开放已声明行动的快捷登记，多行动选择/只读预览/公共命令与存档9共用原行动管线。详见 [ITEM_SHORTCUT.md](docs/engine/ITEM_SHORTCUT.md)。槽位库存服务和inventoryPockets注册/引用校验已实现，应用获得/消耗/页面/保存尚未迁移，不能把现有计数字典说成原作完整口袋；当前边界见 [INVENTORY.md](docs/engine/INVENTORY.md)。
