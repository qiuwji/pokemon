# 招式学习、TM/HM 与库存合同

状态：领域/命令/背包/插件组合已针对性验证；原作机器获得剧情、学习开机/音效演出、遗忘老人和完整道具用途仍待补。完整原作复刻目标不因此收口。

## 来源与数据

只读参考 pret/pokeemerald，修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`：

- `include/constants/tms_hms.h`：50 TM + 8 HM 顺序。
- `src/data/pokemon/tmhm_learnsets.h`、`src/pokemon.c::CanMonLearnTMHM`：物种兼容；蛋不可学习。
- `src/party_menu.c::ItemUseCB_TMHM/Task_LearnedMove`：已有招式拒绝、四槽选择、成功学习才消耗 TM、HM 不消耗、友情事件。
- `src/pokemon_summary_screen.c::CanReplaceMove`：普通学习不能遗忘 HM。
- `src/daycare.c`：父方机器招式继承遍历 TM + HM，复用相同兼容表。

`tools/import-machine-learning.py` 只读参考，生成 `rules/gen3/machine-learning.js`：58 机器、411 个参考表条目（含原作特殊/旧字母占位，不等于 411 个可玩物种），保存来源与修订。`tools/import-item-metadata.py` 导入 309 个原作道具及 pocket/holdable；本包加蓝色能量方块，当前目录 **310 道具**。目录不是主动使用覆盖率。

`packs/emerald/database.js` 是浏览器/插件与无浏览器会话共用的数据装配：合并 354 招式；原作物种的 machineMoves 使用完整参考表。基础 content/species 中的切片机器列表受 87 招式切片限制，不能作为完整兼容资格。新插件物种自行声明 machineMoves；引用/重复项启动时校验。该字段也供既有遗传服务使用，规则来源只有一份。

## 职责与提交

`engine/growth/move-learning.js::MoveLearningService` 处理学习方式、队伍 UID、物种/条件资格、道具所有权、四槽替换、禁止遗忘与原子消费。它不认识 TM 编号、原作物种名、DOM 或动画。道具回复/捕捉仍由 ItemService 的受限草稿处理，学习不会绕过该服务的保护字段。

注册的 learningMethods：

```js
{
  move: "surf",
  item: "plugin:disc", // 可省略，表示导师等无物品途径
  consume: 1,          // 非负整数；无 item 时必须为 0
  species: ["plugin:creature"], // 可选、已有物种引用
  eligible: ({ mon, species, flags, position }) => mon.level >= 10,
  protectMove: false, // true 将该招式登记为普通学习不能覆盖
  friendship: false // 成功时使用宿主注入的纯友情计算
}
```

`eligible` 同步返回 boolean，输入深度冻结，不改变规则状态；插件包装还禁止在该回调里提交命令。任何不正确引用/字段/消费或异步结果都明确拒绝。

`prepare(state, methodId, uid)` 返回只读计划，包括招式、费用、是否需要替换和 replaceable 索引。未满足条件返回 `{ok:false,reason}`。计划由创建服务的 WeakMap 持有真实状态/目标/费用；客户端不能伪造或传入草稿。

`commit(plan,{state,index?,cancel?})` 检查状态/背包身份、队伍内容、资格环境和库存未变化。取消、已会、蛋、缺物品、不兼容、受保护槽位、过期或重放都不会写入。成功时添加/替换招式且 PP 设为新招式基础值，费用与友情同批提交。四槽时必须选择可忘记的索引；有空槽时不能偷偷指定覆盖已有槽位。当前不保存学习计划；执行公开命令时重新预检。

原作允许濒死的非蛋学习机器招式。本包注入已有 FriendshipService 的 learn 事件与已支持的持有物修饰；捕获地点/球种增量尚无完整个体字段，不能宣称全部友情细节复刻完成。

普通手动等级学习复用 protectedMoves；UI 禁用 HM 槽位，核心也拒绝。允许放弃新招式。交易后研究员的自动选择跳过受保护槽位，无可用槽位则放弃，避免无限循环。遗忘老人须以后以明确领域操作提供，不删除这项守卫。

## 应用、UI 与插件

PartyApplication 唯一协调学习；InventoryApplication 的道具预览通过有限 learningView 端口查询；adventure 只增加数据装配，公开方法由 public-ports 登记。背包依据 item.learningMethod 显示资格、确认与替换，不包含 TM 编号分发；新增机器道具可直接复用页面。

- `core.learning.teach {method,uid,index?}`：同一个校验命令供 UI/网络/授权插件调用，插件权限 learnMove；战斗/忙碌/对话中拒绝。
- 插件 `api.content.register("learningMethods",...)` 注册方法，item.learningMethod 指向同一个方法，方法 item 必须对应该道具；机器道具仅 field/party 且 effects 为空。
- 事务动作 `ctx.intent({kind:"learnMove",method,uid,index?})` 同样要求 learnMove。后续意图失败会恢复招式、费用、友情和插件数据；自定义事件/表现反馈由事务成功后发布。
- `api.commands.dispatch("core.learning.teach",...)` 用于事务以外的调用；事务内用 intent，不能嵌套 dispatch。
- 新物种通过 machineMoves 声明原作机器资格，或者作者登记独立导师方式。

示例：

```js
const method = api.content.register("learningMethods", "lesson", {
  move: "surf", item: "school:disc", consume: 1,
  eligible: ({ flags }) => flags.lessonUnlocked === true,
});
api.content.register("items", "disc", {
  name: "训练光盘", price: 100, shopStock: false,
  contexts: ["field"], target: "party", effects: [], learningMethod: method,
});
api.actions.register("teach", {
  schema: {type:"object",properties:{uid:{type:"string"}},required:["uid"],additionalProperties:false},
  run(ctx, {uid}) { ctx.intent({kind:"learnMove",method,uid}); },
});
```

此例插件 ID 必须为 school，并声明 learnMove 权限。机器和关键道具不会因目录存在就自动出现在商店；shopStock:false 和价格 0 在应用层也不可购买。当前普通商店仍是演示库存，完整商店配置是后续业务。

## 验证与后续

新 14 个场景各有通过证据：完整机器表、濒死学习/PP/友情/TM 消耗、HM 所有权/重复使用、蛋/不兼容、四槽/HM/取消、伪造/过期/重放/重载、导师与只读/同步资格、等级保护、公共 UID/锁/保存、插件命令/事务/权限、背包点击、后续意图回滚、activate 读隔离、新物种资格和父方继承。相关 109 项首次通过；兼容表与声明改动后受影响成长/装配/UI/架构 47 项通过。记录见 DEVELOPMENT_LOG / FINAL_VALIDATION。

关键道具行动绑定/鱼竿与自行车库存资格现已接入，研究装备/旧旗标旁路及默认引擎示范道具已删除，见docs/engine/items/FIELD_ITEMS.md。天气首轮见 WEATHER.md。正式道具获得/快捷键、其余野外 HM 和每日业务继续；不把目录与接口当完整业务。机制/资格/公共命令/库存/保存/规则来源变化使对应证据失效；无变化的模块不重复全工程。

槽位迁移更新（2026-10-03）：数量资格读取冻结派生投影，保存仅写槽位；所选消费位置经公开命令重新验证，计划成本交由统一库存领域。当前保存版本（见README/pack），旧版本拒绝。组合证据见 [库存验收](../../validation/2026-10-03-inventory-integration/manifest.json)，本模块未变更的规则/表现证据继续沿用。
