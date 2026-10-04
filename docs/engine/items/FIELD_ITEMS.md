# 野外关键道具与快捷入口

按同一领域合并的现行接口说明。进度与验证以STATUS和对应证据为准；下文保留必要的分项合同。

## 可保存的登记道具与快捷操作

已实现并针对性验证：登记/取消、使用时重新资格检查、缺物品清理、单/多行动插件、背包登记界面、键盘 C/触屏 SELECT、公共命令和当前保存格式。原作其他关键道具与完整道具获得剧情不是本模块的完成范围；槽位容量与应用接线现已完成，见docs/engine/items/INVENTORY.md。

## 单一职责

`engine/item-shortcut.js` 只拥有选择生命周期，接收 selection/quantity/setSelection/inspect/perform/emit 有限端口；不读取整个 game、DOM、地图 ID、徽章、按键或 RNG。动作的资格、计划/指纹、导演与提交仍归 ItemActionService/FieldActionService。

`ItemShortcutApplication` 是独立职责应用，保存 registeredItem 字段的写入用例，协调锁、UI 更新、事实与保存；不导入兄弟应用。注册/取消从背包模态界面允许，战斗、剧情、移动和对话时拒绝；快捷使用也要求模态界面已关闭。adventure 保持薄装配入口，新增端口由 public-ports 显式路由，未增转发或核心用例。

## 内容与状态合同

字段 `item.registerable?:boolean`：true 只用于 target=field、已有 actions 的物品。绿宝石两辆车和三种鱼竿声明 true；普通伤药、球和机器不能登记。插件可显式为自己的行动道具声明 true，不写死关键道具 ID 或口袋名称。

当前保存版本（见README/pack） 要求 `state.registeredItem`：

```js
null
// 或某物品的一条已声明行动
{item:"my-pack:device",action:"activate"}
```

两个字段必须恰好为字符串并引用当前目录的 registerable 物品及有效绑定；不能携带 input/函数/旧资格快照。null 是明确的未登记状态，缺字段不回退，旧 envelope 不迁移。每次新进度建立 null；载入/重开后的服务通过实时端口读取新 state，不留旧对象引用。

登记检查实际库存和声明，不要求此时能执行。例如站在陆地可以登记鱼竿，面向合法岸边水域后才能使用。重复登记相同内容不再发事实，即使导入 JSON 的字段顺序不同。物品从背包消失时可保留登记；只读查询不清理，在下一次快捷使用时清空并保存，不调用行动。这对应原作 UseRegisteredKeyItemOnField 的生命周期，不是旧格式兼容。

保存依赖也包含已登记物品，即使其数量已为零。所需插件缺失时仍保护原文，不能悄悄清空登记后加载一个不同进度。

## 公共查询、命令与反馈

`game.registeredItemView()` / 插件只读状态 / core.query 的 registeredItem 返回：selection、owned、usable，可选 name/reason。查询没有写入、随机抽取或自动解除登记。

- `core.item.register {item,action}`：登记已声明的绑定。
- `core.item.unregister {}`：明确取消。
- `core.item.shortcut {}`：异步，使用登记项；当下重新检查库存、地图和行动条件。

UI、网络、插件使用同一命令；插件权限为 useItem。事务动作中不能嵌套 dispatch，异步场景由事务外命令调用。最终动作继续发 core:field-action，插件命令完成通知使用公开的 core:command-settled（空载荷），内部 core:command-complete 不可订阅。

登记改变的事实：`core:item-registration {selection,cause}`，cause 为 register/unregister/missing-item，payload 冻结。取消没有登记的状态/再次登记同一项不会重复发事实。失败的资格不改变选择、不消耗物品。

可信 JS 插件不是代码沙箱；上述权限限制的是合作接口。插件不得直接修改核心存档对象。

## 页面与输入

背包通过 registerable/actions 元数据提供登记按钮；一个绑定直接登记，多个绑定展示选择。登记已有同一条绑定会取消；不是立刻执行行动。鼠标/方向菜单采用原界面焦点导航，没有在页面写库存或场景状态。

浏览器宿主把 C 和触屏 SELECT 映射到同一 useRegisteredItem 端口；忽略键盘自动重复、文本框输入和 Ctrl/Command/Alt 组合。菜单/对话、剧情、战斗及移动期间不启动。调用前清理旧方向/跑步状态，失败由提示反馈；销毁时通过 AbortController 解除键盘和触屏监听。移动或动画核心不认识 C/SELECT。

SELECT 与 A/B 使用两行像素控制布局，避免三个按钮横向挤压方向盘。新版真实浏览器画面/手机窄屏仍待 E，不以输入端口替身证明像素布局已视觉验收。

## 原作依据与差异

只读参考 revision 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881：item_menu.c Task_ItemContext_Register / UseRegisteredKeyItemOnField、item.c 注册车种更新。原作保存单一物品编号，本项目保存命名空间物品 + 绑定 ID，以支持插件多行动；不缓存可用性。C 是浏览器映射，原作按键为 SELECT。

原作对联合房间/战斗金字塔/对战水管等特殊会话还有快捷道具限制。相关设施尚未实现，后续设施会话应通过共用行动许可/锁合同表达，不添加地图 ID 分支。目前不宣称完整设施限制或车店交换业务已完成。

## 验证与继续开发

新增13项（含原生商店元数据修复）各有通过记录；相关209项初次208通过、1个页面装配失败。正确的 ui-composition.test.js 检查发现此前 BASE_ITEMS 合并把普通消费品也设为 shopStock:false，修复为包内明确库存；失败项与新增商店正反检查通过。旧专项清单中的 ui-assembly.test.js 并不存在，本轮实际验证页面装配，未来选取范围以真实文件为准。

对话锁/导入字段顺序的收尾改变只检查对应项。npm run check 内容/严格类型/251模块通过，商店收尾内容再次通过。证据、范围及源码 hash 见 docs/validation/2026-10-03-item-shortcut/manifest.json。没有重复全部测试或冒充 E 浏览器验收；最新全量基线仍为1851e9d 556项。

选择身份、内容声明、资格/锁、路由/依赖/保存或输入/UI改变才使对应证据失效。后续槽位库存迁移会影响 quantity 与保存边界，须重查此模块的相关组合，但不另建快捷系统。

槽位迁移更新（2026-10-03）：数量资格读取冻结派生投影，保存仅写槽位；所选消费位置经公开命令重新验证，计划成本交由统一库存领域。当前保存版本（见README/pack），旧版本拒绝。组合证据见 [库存验收](../../validation/2026-10-03-inventory-integration/manifest.json)，本模块未变更的规则/表现证据继续沿用。


---

## 关键道具与野外行动绑定

当前范围：非消耗型关键道具、五个原作行动入口、背包/命令/插件接线和库存资格已实现并针对性验证。正式获得剧情、全部原作关键道具用法、骑行道路业务及完整素材仍未完成。

## 职责与依赖

- `engine/items.js`：消耗型道具效果草稿和受保护字段；不认识伤药、精灵球或具体游戏内容。`createItemService(definitions, inventory)` 必须显式传入目录与库存政策。没有注入道具的 Battle 使用空目录，不能凭背包中的字符串调用隐藏示范道具。
- `engine/item-actions.js`：验证道具到已注册野外行动的纯数据绑定，提供所有权检查、只读行动预览和执行选择。不会另建一套效果、地图规则、导演、事务或计划签发机制。
- `engine/field-actions.js`：继续拥有输入校验、只读规则、一次性计划、环境指纹、提交和事实事件。背包、地图、队伍、资格等在动画期间改变，计划失效。
- `InventoryApplication`：消耗型道具、学习预览和关键道具入口的协调；经有限端口调用野外行动，不导入兄弟应用，也不访问整个 game。
- `FieldActionApplication`：现有世界/旅行/路线/钓鱼操作及新的 `movement {mode}` 预检、动画与提交。只有该宿主适配器提交移动操作，插件不能传函数或绕过移动资格。
- `MovementApplication`：统一移动预览与直接切换条件；不再提供研究装备领取用例。`field-capabilities.js` 保存绿宝石的库存、徽章和招式政策，载入校验使用相同资格。
- `bag-interface.js`：读取声明的行动、可用性与名称；单行动直接执行，多行动展示选择。没有自行车/鱼竿 ID 分发，页面不直接改状态。adventure 仍为 149 行装配入口。

## 公开内容合同

普通物品的 target 仍是 party/enemy。关键道具用 target=field，contexts 只能是 field，effects 为空，不能兼有学习方式。每个道具声明 1–32 个行动；本地 id 不重复，fieldAction 必须已有，input 是固定 JSON 并符合被引用行动的 schema。运行时规则在行动的 allowed/target/plan 中根据只读上下文决定，不放进道具数据。

```js
const action = api.content.register("fieldActions", "unlock", {
  name: "开启大门", cue: "field-cut", duration: 600, menu: false,
  // 行动可由其他入口调用，因此其自身也应定义必要的道具资格。
  allowed: c => c.bag["gates:key"] > 0 || {reason:"需要大门钥匙。"},
  target: c => {
    const door = c.objects.find(o => o.id === "gates:door");
    return door ? {map:c.position.map, objectId:door.id} : null;
  },
  plan: (c, t) => ({kind:"world", operations:[
    {kind:"object",map:t.map,id:t.objectId,hidden:true,scope:"permanent"}
  ]}),
});
api.content.register("items", "key", {
  name:"大门钥匙",price:0,holdable:false,shopStock:false,
  contexts:["field"],target:"field",effects:[],
  actions:[{id:"use",fieldAction:action,input:{}}],
});
```

示例插件 ID 为 gates；门对象与获得钥匙的剧情由业务内容提供。引用、重复、非法目标、输入和额外绑定字段在启动编译时拒绝。此层复用已有 fieldActions 内容注册，不增加重复的通用动作目录。

- 查询：`game.itemActionOptions(item)`；插件 `core.query` / 只读状态投影的 itemActions 只列出已持有、已声明的入口。
- 命令：`core.item.action {item,action}`，异步，UI/网络/插件同一路由；插件要求 useItem 权限。action 是该物品的本地绑定 ID，不能传任意输入替换绑定或指定任意命令。
- `core.field.action` 仍由 movement 权限控制独立野外行动；它自己的规则同样检查资格。物品绑定不会自动限制一个故意声明为无条件的独立行动。
- 事务插件动作中不能嵌套 dispatch；异步场景通过事务外的 command 调用，不承诺跨动画事务回滚。需要事务性 HP/库存操作时使用已有领域 intent，不把异步动作塞入任意效果回调。
- 成功事实复用 `core:field-action {id,target,outcome}`；插件命令完毕监听 `core:command-settled`（空载荷）；`core:command-complete`仅供宿主内部。不新增重复成功事件。

## 绿宝石规则与来源

固定只读参考 `work/pokeemerald` revision `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`：item_use.c 的 Bike/CanFish/Rod，bike.c 的 GetOnOffBike，overworld.c 的 IsBikingAllowed，field_player_avatar.c 的 IsPlayerFacingSurfableFishableWater，metatile_behavior.c 的水域/桥面判定和各地图 map.json 的 allow_cycling。

- mach_bike / acro_bike 各自提供 cycling 行动，要求对应物品实际库存。使用任意已持有自行车时，若正骑两种原作自行车之一则下车，否则骑上所选车。直接移动菜单换模式也检查各自库存。
- 自行车道标记或四类轨道上不能下车/换车；原作地图许可优先于室内/室外判断。生成的 518 条许可仅是元数据，不代表 518 张地图已开放。自定义地图显式 allowBike 可覆盖；没声明且非原作地图时，上层启动政策为室外允许、室内禁止。通用移动核心不包含这个默认政策。
- old_rod / good_rod / super_rod 分别绑定原鱼竿档位；实际鱼竿与可战斗非蛋队伍缺一不可。资格检查不抽随机数，正式钓鱼会话仍使用原轮数/窗口/特性与遭遇服务；使用或取消不会消耗鱼竿。
- 岸边钓鱼须玩家高度 3、前方合法可钓水域、无图块碰撞并存在高度不匹配；冲浪时允许无碰撞水域或非边缘水上桥，潜水/水下/瀑布拒绝。这是规则检查，不按画面蓝色或整个场景图判断。
- surf/fly 不再被 fieldTraining 开放；仍需相应徽章与队伍招式。bike、fieldTraining、oldRod 等旧旗标没有资格作用，也没有回退路径。
- 当前保存为版本10，registeredItem继续必需，bag改为唯一槽位结构，见本文件的登记道具部分；库存/模式继续保存，活动模式必须满足注册资格和地图条件。没有旧存档迁移。物品绑定由当前目录重建，不把函数、临时计划或动画锁写进存档。

当前骑车 cue 的短像素脉冲是项目表现政策；原作骑行 BGM、逐帧上下车精灵、所有特殊钓点/丑丑鱼点与获得剧情保留为后续业务，不以当前演出代替完整还原。

## 验证、证据复用与下一步

新增 13 项专项各有通过证据：注册/不可变绑定、库存和规则拒绝、空道具战斗、旧旗标旁路、原车切换/保存、原许可、轨道/道路约束、动画期间库存变化、鱼竿/合法水域、无资格存档、内容插件与背包点击、原高度/桥边、只读查询与权限。相关范围首轮 186 中 182 通过，4 项分别修正并通过；新增 2 项也通过，未重复整工程。内容/公开类型/249 JS 模块检查通过。原始记录和文件 hash 在 `docs/validation/2026-10-03-item-actions/`。

两类修复：测试错把未注册命令查询当作抛异常、使用不存在的水域常量；旧保存夹具没有真实冲浪资格，补资格时曾追加到已有四招式导致五槽，现改为合法替换并保留全部保存/地形断言。没有删校验或跳过测试。

注册结构、领域资格/操作、应用端口、保存、命令、UI 行为或规则来源变化时对应证据失效；不相关领域沿用已有结果。Select登记已接入；下一步统一物品获得/槽位容量业务、正式野外 HM 空缺（推石/闪光/草丛居合斩）、每日时间业务和完整移动保真。原战斗、设施、现代扩展、Actor 作息、接手指南与 E 最终回归继续；不开发伙伴跟随。

登记/取消/快捷操作与插件多行动已针对性验证，新增registerable元数据，见本文件的登记道具部分。非消耗动作和消耗效果仍归原领域服务，不为快捷操作新增效果或导演。

槽位迁移更新（2026-10-03）：数量资格读取冻结派生投影，保存仅写槽位；所选消费位置经公开命令重新验证，计划成本交由统一库存领域。当前保存版本（见README/pack），旧版本拒绝。组合证据见 [库存验收](../../validation/2026-10-03-inventory-integration/manifest.json)，本模块未变更的规则/表现证据继续沿用。
