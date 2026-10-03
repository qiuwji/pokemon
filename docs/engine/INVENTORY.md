# 槽位库存核心合同

状态：2026-10-03，领域服务、原作政策、公开数据类型及真实插件启动校验已实现并针对性验证。**当前 AdventureState.bag 仍是原来的计数字典，获得/消耗/页面/保存的统一迁移尚未完成。** 不能据此声称游戏已限制背包容量，不能把槽位服务与旧 bag 同时持久化。下一阶段接线见 [INVENTORY_DESIGN.md](INVENTORY_DESIGN.md)。

## 职责与政策

- `engine/inventory-registry.js`：校验、复制并冻结口袋定义和物品到口袋的路由。普通缺省口袋由内容包明确注入；通用引擎不认识绿宝石口袋名或数字。
- `engine/inventory.js`：唯一槽位数据、容量/数量预检、批量草稿、所选位置移除、一次性提交。无 DOM、规则随机数、地图、玩家或金钱依赖。
- `engine/rules/gen3/inventory.js`：原作五口袋容量及堆叠政策，依据只读修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881` 的 `global.h`、`items.h`、`item.c`。普通30、重要30、球16、机器64、树果46；堆叠99，树果999；机器/树果禁止同物品第二槽，其余可重复。
- `packs/emerald/extensions.js`：已有目录 seal 中校验 `inventoryPockets` 与所有 item.pocket 引用。未知口袋启动失败；插件与内置同合同。

注册定义：`{label,capacity,stackLimit,allowDuplicates}`，每个字段必需，不接受未声明字段。容量/堆叠上限是正安全整数，其乘积也不能溢出。物品未声明 pocket 时使用构造注册表时明确指定的 defaultPocket；未知显式引用不能退回默认。

## 数据与操作

唯一数据为 `emptyInventory()` 返回的 `{pockets:{}}`。已分配口袋必须有容量长度的数组，每个位置是 null 或 `{item,count}`；禁止稀疏数组、0数量槽、错口袋、未知物品、超限堆叠及不允许的重复。移除最后物品后可省略整个空口袋。`view()` 会投影所有已注册口袋的空位、政策、占用和只读数量，不把这些查询数据保存成第二份真相。

```js
import { InventoryRegistry } from "./dist/engine/inventory-registry.js";
import { InventoryService, emptyInventory } from "./dist/engine/inventory.js";
const registry = new InventoryRegistry(
  { tools: { label: "工具", capacity: 2, stackLimit: 5, allowDuplicates: true } },
  { items: { potion: {} }, defaultPocket: "tools" }
);
const inventory = new InventoryService(registry);
const container = emptyInventory();
inventory.apply(container, [{ kind: "add", item: "potion", count: 7 }]);
// 两个槽为5和2，不是强制总数量≤5。
const plan = inventory.prepare(container, [{
  kind: "remove", item: "potion", count: 1,
  slot: { pocket: "tools", index: 1, item: "potion" }
}]);
if (plan.ok && inventory.check(plan, container)) inventory.commit(plan, container);
```

上述是独立领域使用示例，不是目前 game 的公共命令。

`prepare(container,operations)` 先校验整批指令，再顺序计算草稿；追加先填已有堆叠，后填空位。批量可先移除再追加，以支持满包时交换持物。任何一步容量不足、数量不足或所选位置改变时整批失败，原容器不变。失败返回 `{ok:false,code,reason}`；代码为 full/insufficient/stale-slot，非法结构或引用抛合同错误。移除可指定明确位置，先移除所选匹配槽，再按顺序处理余量；不会自动压缩其它堆叠，因此保留分散槽位。

成功计划只暴露冻结的 `{ok:true,changes}`；私有 WeakMap 保存草稿、容器身份和槽位指纹。伪造计划、重放、容器被换成副本、准备后槽位变化都不能提交。`check()` 不消耗，`commit()` 的每次尝试都会消耗计划；成功只替换该容器的 pockets。调用者不得保存旧 slots 数组作为长期写入口。指纹对口袋字典键排序，槽位顺序仍是语义数据。

`quantity()` / `counts()` 读取有效容器；`view()` 同时执行全量结构校验。外部恢复数据先 `validate()`，不能凭一个数量查询替代恢复校验。输入命令和保存数据沿用 JSON 边界，未提供旧计数字典转换函数或历史兼容。

## 插件及尚未接入的边界

插件可在 setup 注册口袋，再把返回的带命名空间ID填到新物品 pocket：

```js
const pocket = api.content.register("inventoryPockets", "materials", {
  label: "材料", capacity: 12, stackLimit: 50, allowDuplicates: true
});
api.content.register("items", "wood", {
  name: "木材", pocket, price: 0,
  contexts: [], target: "party", effects: []
});
```

这已通过实际 createEmeraldPlugins→seal→InventoryRegistry→InventoryService 组合证明。**当前游戏奖励仍写计数字典，因此这个示例尚不保证新口袋在游戏背包页显示或限制其领取数量。** 下一阶段必须同时迁移应用生产者/消费者、控制者战斗库存、条件查询、插件事务/依赖和保存，再做真实获得/使用/重载证明。新 inventoryPockets 注册不允许据此宣称整个插件库存链已完成。

PC存物、金字塔背包和个体能量方块盒是独立容器业务，后续可复用这些原语，但不套用普通背包政策。当前演示 blue_pokeblock 仍按明确默认普通口袋路由，不声称原作盒子已实现。

## 验证证据

新增12项分别通过：政策/引用、坏结构、重复堆叠、碎片/选槽、整批失败、单堆限制、私有计划/重放/替换、只读视图、槽位序列化及实际插件目录。初轮相关38项36通过、2个新夹具错误使用不存在的 tm01；改用目录的 tm_focus_punch 后只复查这2项通过。注册结构增强仅复查对应拒绝项，类型夹具更新后严格检查通过；原 check 内容/类型/254模块通过。记录见 [证据清单](../validation/2026-10-03-inventory-core/manifest.json)。没有执行当前游戏背包容量验收、完整系统或浏览器回归。
