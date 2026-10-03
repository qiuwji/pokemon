# 槽位库存与统一应用合同

状态：2026-10-03，核心和真实应用迁移已完成并针对性验证；当前工程0.16.0，保存10。AdventureState.bag和战斗控制者bag都只保存槽位，旧计数字典/旧存档明确拒绝，无迁移、回退或第二份可写数量真相。真实浏览器验收留到E。

## 职责与依据

| 模块 | 唯一职责 |
| --- | --- |
| engine/inventory-registry.js | 校验、复制/冻结口袋政策、物品路由与显式默认口袋 |
| engine/inventory.js | 槽位校验、容量计算、批量草稿、选槽移除、私有一次性计划及只读投影 |
| engine/rules/gen3/inventory.js | 有来源的原作五口袋政策；通用引擎不认识口袋名或原作数字 |
| packs/emerald/inventory.js | 从合并目录构造本作服务；默认政策属于内容包 |
| application/inventory-application.js | 持有库存政策，协调购买、道具、装备、查询；其他应用通过有限端口使用它 |
| 页面/插件/网络 | 冻结查询、明确命令；不直接写容器或提交私有计划 |

只读参考修订731ad5bfd6e6f265508d0efcca0ba42f9dcf5881的global.h、items.h和item.c：普通30、重要30、球16、机器64、树果46；堆叠99，树果999。机器/树果禁止同物品第二槽，其余允许重复。追加先填已有堆叠再填空位；移除优先所选匹配槽、再按顺序移除余量。不自动压缩，保留碎片和位置。

政策为`{label,capacity,stackLimit,allowDuplicates}`；未知字段/口袋/物品在注册或恢复失败。允许内容包和插件声明不同政策，不在消费者各写一套上限。

## 数据与计划

`emptyInventory()`为`{pockets:{}}`。分配的口袋是容量长度的数组，每槽null或`{item,count}`；拒绝稀疏、零数量、超限、错口袋及禁止的重复。最后一项移除后可省略空口袋。view投影所有注册口袋的政策、占用、槽位和数量，不把查询再存一份。

```js
const bag = inventory.create({ potion: 150 }); // 仅作者初始库存模板，实际生成99/51两槽
const plan = inventory.prepare(bag, [{
  kind: "remove", item: "potion", count: 1,
  slot: { pocket: "items", index: 1, item: "potion" }
}]);
if (plan.ok && inventory.check(plan, bag)) inventory.commit(plan, bag);
```

create用于作者内容（例如训练家初始库存），按同一容量生成槽位；不是保存格式转换器。保存恢复必须validate槽位数据，不能传数量模板。

prepare先验证整批命令，再按顺序计算草稿。任一容量/数量/所选位置失败，整批不变，返回`{ok:false,code,reason}`，code为full/insufficient/stale-slot；非法结构或引用抛合同错误。成功暴露冻结changes，私有WeakMap保存草稿、容器身份和指纹。伪造、重放、容器替换和准备后变化不能提交；每次commit尝试消耗计划。check只检查，preview结果永远不能commit。

quantity/counts用于已经校验的容器读取；view执行完整校验。外部数据先validate，不能用数量查询代替恢复校验。核心无DOM、金钱、地图、规则随机数或动画依赖。

## 已接入的生产边界

| 调用点 | 失败/提交语义 |
| --- | --- |
| 商店 | 数量/容量/资格/金钱预检；容量不足不扣款 |
| 剧情reward / 插件reward intent | 全物品组合预检后提交库存、钱、旗标和领取账本；满包不标记已领取，稳定ID防重复 |
| 持物 | 取出新物品和返还旧物品为同批；同口袋可复用释放槽，跨口袋返还不足整批拒绝 |
| 树果 | 种植检查费用；采摘整份产量能放入才清树，不截断产量 |
| 道具/学习/进化 | 库存私有费用计划与已有目标草稿/四槽/HM保护/环境指纹联合校验；费用失败不写个体 |
| 战斗 | 每个控制者持有独立容器；共享控制者预留同一数量，独立控制者分别扣费；目录/政策缺失在开战前拒绝 |
| 训练家模板 | authored bag数量在启动校验容量，创建遭遇时编译槽位；失败恢复创建PRNG，不设任意999总数上限 |
| 野外行动/快捷 | 规则仅收到冻结数量投影；原登记/资格生命周期保持 |
| 保存/事务 | 保存10只存槽位；依赖包含实际物品与口袋所属插件，缺插件保护原文；失败事务恢复槽位/个体/数据，重绑读取当前容器 |

旧grant剧情指令与legacy.*奖励ID已删除；当前业务和夹具使用唯一reward合同。底层CommandRunner仍是通用注册执行器，不在核心增加特定指令兼容。

## 页面与公共查询

背包按注册口袋显示名称、占用/容量及真实堆叠。选择的是`{pocket,index,item}`，普通使用、学习和战斗道具执行时重新检查，点击第二堆会先消耗第二堆。页面不直接读取/写state.bag。UI使用bagView/itemQuantity和既有应用命令。

- `core.query` / api.query：bag为冻结派生数量；inventory为完整冻结口袋视图。
- `core.inventory.preview {additions:[{item,count}]}`：全组合容量检查；只读、网络/插件开放，无写权限，不返回可提交计划。
- `core.item.use`、`core.learning.teach`、kind:item的`core.battle.action`：可带slot；其他战斗行动拒绝slot。
- 条件查询`itemCount {item}` / `itemSpace {item,count}`：剧情可分支“背包能否容纳”，后续领取仍执行真实预检，不能靠查询结果跳过提交检查。

## 插件组合

```js
const pocket = api.content.register("inventoryPockets", "materials", {
  label: "材料", capacity: 12, stackLimit: 50, allowDuplicates: true
});
const wood = api.content.register("items", "wood", {
  name: "木材", pocket, price: 0, contexts: [], target: "party", effects: []
});
// 在带reward权限的action.run(ctx)中，而非setup：
ctx.intent({ kind: "reward", reward: { id: "garden:wood-gift", items: { [wood]: 4 } } });
```

新增口袋/物品已经过实际setup→seal→领取→背包→使用→保存/重载证明，无需修改核心或页面。插件动作仍通过权限、JSON边界和事务，不获得私有库存计划。静态声明不能引用不存在的口袋；保存中的实际口袋所属插件也计入依赖。

## 边界与证据

PC存物、金字塔背包和个体能量方块盒为后续D独立容器业务，不套用普通背包政策。当前演示blue_pokeblock仍走默认普通口袋，不声称原作盒子完成。原作全部道具用途、获得剧情、整理/手动排序、丢弃/卖出流程及浏览器像素保真尚待相应业务。

核心12项的原始证据见[核心记录](../validation/2026-10-03-inventory-core/manifest.json)，它只证明当时核心。迁移后受影响487项首轮484通过，3个旧夹具修正后只复查失败项通过；新增组合与收尾证据见[现行组合记录](../validation/2026-10-03-inventory-integration/manifest.json)。不得将分批证据说成当前全量通过。实现/政策/命令/重绑/状态/素材改变才重查对应范围，最终E统一回归。
