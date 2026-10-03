# 关键道具与野外行动绑定

当前范围：非消耗型关键道具、五个原作行动入口、背包/命令/插件接线和库存资格已实现并针对性验证。正式获得剧情、Select 注册快捷键、全部原作关键道具用法、骑行道路业务及完整素材仍未完成。

## 职责与依赖

- `engine/items.js`：消耗型道具效果草稿和受保护字段；不认识伤药、精灵球或具体游戏内容。`createItemService(definitions)` 必须显式传入目录。没有注入道具的 Battle 使用空目录，不能凭背包中的字符串调用隐藏示范道具。
- `engine/item-actions.js`：验证道具到已注册野外行动的纯数据绑定，提供所有权检查、只读行动预览和执行选择。不会另建一套效果、地图规则、导演、事务或计划签发机制。
- `engine/field-actions.js`：继续拥有输入校验、只读规则、一次性计划、环境指纹、提交和事实事件。背包、地图、队伍、资格等在动画期间改变，计划失效。
- `InventoryApplication`：消耗型道具、学习预览和关键道具入口的协调；经有限端口调用野外行动，不导入兄弟应用，也不访问整个 game。
- `FieldActionApplication`：现有世界/旅行/路线/钓鱼操作及新的 `movement {mode}` 预检、动画与提交。只有该宿主适配器提交移动操作，插件不能传函数或绕过移动资格。
- `MovementApplication`：统一移动预览与直接切换条件；不再提供研究装备领取用例。`field-capabilities.js` 保存绿宝石的库存、徽章和招式政策，载入校验使用相同资格。
- `bag-interface.js`：读取声明的行动、可用性与名称；单行动直接执行，多行动展示选择。没有自行车/鱼竿 ID 分发，页面不直接改状态。adventure 仍为 147 行装配入口。

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
- 成功事实复用 `core:field-action {id,target,outcome}`；命令完毕沿用 `core:command-complete`。不新增重复成功事件。

## 绿宝石规则与来源

固定只读参考 `work/pokeemerald` revision `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`：item_use.c 的 Bike/CanFish/Rod，bike.c 的 GetOnOffBike，overworld.c 的 IsBikingAllowed，field_player_avatar.c 的 IsPlayerFacingSurfableFishableWater，metatile_behavior.c 的水域/桥面判定和各地图 map.json 的 allow_cycling。

- mach_bike / acro_bike 各自提供 cycling 行动，要求对应物品实际库存。使用任意已持有自行车时，若正骑两种原作自行车之一则下车，否则骑上所选车。直接移动菜单换模式也检查各自库存。
- 自行车道标记或四类轨道上不能下车/换车；原作地图许可优先于室内/室外判断。生成的 518 条许可仅是元数据，不代表 518 张地图已开放。自定义地图显式 allowBike 可覆盖；没声明且非原作地图时，上层启动政策为室外允许、室内禁止。通用移动核心不包含这个默认政策。
- old_rod / good_rod / super_rod 分别绑定原鱼竿档位；实际鱼竿与可战斗非蛋队伍缺一不可。资格检查不抽随机数，正式钓鱼会话仍使用原轮数/窗口/特性与遭遇服务；使用或取消不会消耗鱼竿。
- 岸边钓鱼须玩家高度 3、前方合法可钓水域、无图块碰撞并存在高度不匹配；冲浪时允许无碰撞水域或非边缘水上桥，潜水/水下/瀑布拒绝。这是规则检查，不按画面蓝色或整个场景图判断。
- surf/fly 不再被 fieldTraining 开放；仍需相应徽章与队伍招式。bike、fieldTraining、oldRod 等旧旗标没有资格作用，也没有回退路径。
- 保存仍是版本 8，未增加新的持久字段；库存/模式继续保存，活动模式必须满足注册资格和地图条件。没有旧存档迁移。物品绑定由当前目录重建，不把函数、临时计划或动画锁写进存档。

当前骑车 cue 的短像素脉冲是项目表现政策；原作骑行 BGM、逐帧上下车精灵、所有特殊钓点/丑丑鱼点与获得剧情保留为后续业务，不以当前演出代替完整还原。

## 验证、证据复用与下一步

新增 13 项专项各有通过证据：注册/不可变绑定、库存和规则拒绝、空道具战斗、旧旗标旁路、原车切换/保存、原许可、轨道/道路约束、动画期间库存变化、鱼竿/合法水域、无资格存档、内容插件与背包点击、原高度/桥边、只读查询与权限。相关范围首轮 186 中 182 通过，4 项分别修正并通过；新增 2 项也通过，未重复整工程。内容/公开类型/249 JS 模块检查通过。原始记录和文件 hash 在 `docs/validation/2026-10-03-item-actions/`。

两类修复：测试错把未注册命令查询当作抛异常、使用不存在的水域常量；旧保存夹具没有真实冲浪资格，补资格时曾追加到已有四招式导致五槽，现改为合法替换并保留全部保存/地形断言。没有删校验或跳过测试。

注册结构、领域资格/操作、应用端口、保存、命令、UI 行为或规则来源变化时对应证据失效；不相关领域沿用已有结果。下一步 Select 注册道具与统一物品获得/容量业务、正式野外 HM 空缺（推石/闪光/草丛居合斩）、每日时间业务和完整移动保真。原战斗、设施、现代扩展、Actor 作息、接手指南与 E 最终回归继续；不开发伙伴跟随。
