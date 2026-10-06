# 战斗行动附加、修饰与许可（B1/B2）

插件可以在一次主招式行动上附加已注册的**附加项**（形态转换、受限招式派生、行动作用域修饰），并通过受限的**许可/防御返回值**参与命中与离场判定。全部由原有战斗所有者完成选择、预留、排序、提交与恢复，不新增第二套战斗循环，不改变默认 Gen3 结果。

## 注册

```js
api.content.register("battleAttachments", "brace", {
  name: "战术姿态",
  commitPoint: "beforeOrder",        // beforeOrder | beforeAction | moveStart
  parameters: { type: "object", properties: { bonus: { type: "integer", minimum: 0, maximum: 100 } }, required: ["bonus"], additionalProperties: false }, // 可选
  requires(context) { return true; }, // 可选，同步布尔谓词
  limit: { scope: "controller", key?: "shared", max: 1 }, // 可选
  transition: { form: "owner:stance" }, // 可选：切换已注册形态
  deriveMove(context) { return { power: 65, category: "special", effect: "hit" }; }, // 可选：受限派生
  modifiers: [{ phase: "damage-modifier", modify: (value, context) => value }], // 可选：行动作用域数值修饰
  pp: "clear", // 可选：本条附加项结算后清空源槽剩余 PP
  unavailablePolicy: "continueBase", // continueBase（默认）| failAction
});
```

注册时校验：提交点合法、谓词/派生/修饰同步、`parameters` schema、`limit` 范围、`transition.form` 是已注册形态、`modifiers.phase` 属于可修饰阶段、策略枚举；未知字段拒绝。跨附加项与增强的同池容量冲突在启动时报错。

## 行动请求与候选查询

请求在 `MoveActionRequest` 上携带 `attachments`（最多两个）：

```json
{ "kind": "move", "index": 0, "attachments": [{ "id": "owner:brace" }, { "id": "owner:focus", "parameters": { "bonus": 20 } }] }
```

- 最多一个形态附加项、最多一个派生附加项；修饰可叠加；不允许与旧 `augment` 混用。
- 公开指令 `core.battle.action` 的 `attachments` 支持最多两项；每项参数用 JSON 字符串（`parameters`），引擎在预检前解析为对象并对照 `parameters` schema。
- UI/AI 只提交注册 ID 与合法参数，不能提交计划、已支付标记或原始属性。
- 候选查询 `core.battle.attachments { index, seat? }` 与实际预检使用同一资格函数，返回 `{id,name,commitPoint,transition,derives,parameters,remaining}`；发现候选时不校验必填参数，只有实际提交才校验。

## 提交点

| 提交点 | 时机 |
| --- | --- |
| `beforeOrder` | 所有必需行动确认后、普通队列排序前 |
| `beforeAction` | 轮到该行动、验证原 actor 仍在席位且存活后、正常发动检查前 |
| `moveStart` | 正常管线确认可以发动该招式、进入招式开始阶段 |

- 选择时只做只读预检，不扣 PP、不改形态、不消耗次数；未提交选择取消时释放预留。
- 到达提交点时逐个复检资格与额度；`continueBase` 跳过该附加项继续基础行动，`failAction` 让整个行动失败。
- 排序读取生效后的投影：`beforeOrder` 的形态变化会影响本回合速度与行动顺序。

## 受限招式派生

`deriveMove(context)` 返回 `{ power?, type?, category?, target?, priority?, effect? }`：

- `power` 0–250 整数、`type` 属于属性表、`category ∈ {physical, special}`、`target` 属于目标模式、`priority` −7–7、`effect` 必须是已注册且无多回合生命周期的效果。
- `sourceMove` 支付 PP 与身份识别；`effectiveMove` 是叠加派生后的目标/命中/伤害/优先级/类别视图，`id` 仍是源招式。类别未声明时继续按 Gen3 属性政策。
- 派生值在提交点复算比对；提交点复检失败且策略为 `continueBase` 时**丢弃派生、回退基础招式**（不会免费使用强化招式）；请求里的 `derivedMove` 是内部字段，伪造被丢弃。

## 行动作用域修饰

`modifiers` 在提交点后、该行动的招式结算期间生效，绑定 actor、行动与阶段；行动结束或失败即失效，不泄漏到其他精灵或下一次行动。

- 可修饰阶段（数值/变换）：`attack/defense/power/base-damage/damage-modifier/damage-preview/pre-type-damage/screen/burn-modifier/speed-base/speed/accuracy/critical-stage/critical-check/secondary-chance/pp-cost/action-order/type/form`。
- 修饰回调同步、收到深冻结值，只返回新值；查询不安装真实来源。
- 例如“本次攻击免除灼伤倍率”在 `burn-modifier` 返回 `1`，不改写灼伤状态。

## 行动许可与防御交互

许可类阶段允许插件注册 `decide` 规则（与 `modify`/`effects` 互斥）：

```js
api.rules.register("hold", {
  phase: "switch-check", // switch-check | escape-check | hit-check | immunity | action-permission | defense-interaction
  decide: (c) => c.forced === false ? { kind: "deny", reason: "战术锁住。" } : { kind: "abstain" },
});
```

- `decide` 返回 `abstain`/`allow`/`deny+reason`/`outcome`；宿主只应用有界的 `allowed`/`reason`/`outcome`，`allow` 不推翻其他来源的禁止。
- 上下文区分 `forced`/`guaranteed`，手动换人、自换、被迫接替、逃跑分别判定，不用一个全局锁。
- `defense-interaction` 统一保护判定：原生 `protected` 作为默认结果 `outcome:"protected"`（未命中），插件可返回 `outcome:"pass"` **覆盖保护**、`outcome:"block"`、或 `{kind:"scaledDamage", numerator, denominator}`；缩放进入正常伤害管线与取整位置一次，不绕过免疫/准确率。
- 候选查询、预检与执行共用同一判定。

## PP 政策

- `pp:"clear"` 让该附加项在真实提交点后把源招式槽剩余 PP 清空；源槽仍先按正常规则支付一次 PP。
- 未声明 `pp` 时行为不变；`ppClear` 是内部字段，伪造请求被丢弃。
- 更细的按次费用仍可用 `pp-cost` 修饰阶段表达（注意自目标招式不套用该阶段）。

## 额度与恢复

- `limit` 使用 `scope + subject + key` 账本，`scope ∈ {battle, alliance, controller, creature}`；显式相同 `key` 的附加项与增强共用一个池。
- 预留从当前 `decisions.pending` 统计（跨机制共享），额度在真实提交点消耗；未命中/被挡不退已提交次数。
- `BattleCheckpoint` 恢复共享额度账本与 `forms.records`，后段规则异常时形态与账本一起回滚。

## 边界与未实现

- 不新增行动类型、不开放任意效果函数、不允许 UI 直接扣 HP/改属性。
- 仍待后续：形态特性转换的入场/转换区分、调制品的任意新 op、把附加项接到战斗 UI 菜单。
- 默认 Gen3 行为不变；不安装任何默认现代玩法。

## 代表例

- [examples/battle-attachment.test.js](../../../examples/battle-attachment.test.js)：候选→携带→形态提交，及派生招式。
- 核心合同：[tests/battle-attachments.test.js](../../../tests/battle-attachments.test.js)（排序/默认/取消/混用/回滚/派生/参数/多附加/共享额度）、[tests/battle-permissions.test.js](../../../tests/battle-permissions.test.js)（许可与防御）。
- 实时会话完成事实：[docs/engine/INTERACTIONS.md](../INTERACTIONS.md)。
