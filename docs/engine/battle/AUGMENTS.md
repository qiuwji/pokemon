# 插件战斗行动增强合同

这是项目的通用扩展合同，默认第三世代规则不启用任何增强。它让插件替换一次招式行动，同时复用目标选择、行动顺序、PP、库存、使用次数、失败恢复和表现事件。完整 Z 招式、Mega、极巨化等仍须各自的业务规则，不能据此宣称已实现。

## 内容如何注册

使用 `api.content.register("battleAugments", localId, definition)`，保存返回的命名空间ID；先注册替换招式再引用。最小注册见[增强测试夹具](../../../tests/fixtures/extensions/augment.js)，公共装配及断言见[battle-augments.test.js](../../../tests/battle-augments.test.js)。文件改名时搜索 `battleAugments`、`core.battle.augments`、`augmentId`。

| 字段 | 合同 |
| --- | --- |
| name | 非空展示名称 |
| moves | 非空、不重复的已注册招式 ID 白名单；效果须受支持，不能有蓄力/连用/硬直 action 政策 |
| select(context) | 同步返回白名单中的一个 ID；不返回任意属性覆盖对象 |
| requires(context) | 可选；同步返回 boolean，表达资格，不写状态或发命令 |
| limit | 可选 `{scope, key?, max}`；scope 为 battle/alliance/controller/creature；max 为正整数 |
| cost | 可选 `{pp?, item?, count?}`；PP 默认 1，item 为已注册道具，数量默认 1，显式数值须为正整数 |

未知字段、坏引用或互相冲突的共享限次配置启动失败。`scope` 决定限次主体：整场、联盟、控制者或个体 UID。`key` 默认本增强 ID；多个增强可使用同一个明确命名空间 key 共享额度，但同 scope/key 的 max 必须一致。形态系统的限次账本独立，不能假定两者已共享。

context 深只读，包含 actor（当前个体及有效 types）、sourceMove（原招式及 id）、seat、controller（id/alliance/背包数量投影）、turn、weather（种类或 null）。没有可写战斗对象、RNG、DOM或世界写端口。选择/预览可能多次调用，回调应为确定的查询，不累计次数或取随机数。

## 查询、选择与实际消费

```js
const choices = await api.commands.dispatch("core.battle.augments", { index: 0 });
// 这里只展示选择形状；正式页面需处理空列表与取消。
if (choices.length) await api.commands.dispatch("core.battle.action", {
  kind: "move", index: 0, augment: choices[0].id,
});
```

插件须声明 battle 权限；index 为原招式槽 0–3，可指定 seat。查询返回 id/name/index/moveId/cost/remaining；无限次的 remaining 为 null。UI 展示替换招式的目标模式，命令仍引用原槽，不直接发送内部 augmentedMove/sourceMoveId。外部伪造内部字段会被剥离。

1. 选择时验证原招式可用、资格、替换招式目标及资源；多席位待确认选择预留共享额度和同控制者道具。取消释放预留，不花 PP、道具或限次。
2. 行动顺序、目标和实际效果使用替换招式；PP 从原招式槽扣除。cost.pp 是基础费用，仍经过现有 pp-cost 规则，例如压迫感。
3. 执行时重新核对原槽、资格、替换 ID 和资源。目标消失、资格改变或睡眠等无法行动时，不消费增强；不会偷偷改用另一替换招式。
4. 就绪且有目标后，开始招式前提交道具和限次，随后消费 PP。未命中、保护或已开始后的效果失败仍花费；后段规则抛错则由原战斗检查点恢复 PP、库存、随机数和增强账本。

AI 策略候选包含合法增强选择，使用同一执行预检；默认随机 AI 保持原选择策略。多个 AI 同时争用资源不提供联合规划，执行时重新检查，后执行者可能取消。有限次数只属于本场战斗，不进入存档；新战斗重新计数，换人不会清空控制者限次。

## 所有权与表现

BattleAugmentRegistry 拥有定义校验；BattleAugments 拥有预览、资格、预留查询和临时账本；Actions 校验外部选择；Round 使用实际优先级；MoveExecutor 在既有生命周期中提交消费；Checkpoint 恢复账本。没有在 UI 或插件另算伤害/限次。

提交产生 `kind:"augment"` 语义事件，携带 actorSeat/augmentId/sourceMoveId/moveId，之后仍有通常的 move/hurt 等结果事件。插件用 `api.presentation.battle` 注册这个事件的演出，不修改导演分支。动画不决定消耗、命中或伤害，沿用时钟、reducedMotion 和绘制器合同。

## 代表例与查错

当前不装配爆发业务插件。[合同测试](../../../tests/battle-augments.test.js)通过普通属性威力100、优先级1的夹具验证原槽PP、费用、限次及事件；它不是原作Z招式威力表或保护削弱算法。浏览器业务需另按作者指南装配并验收。

| 错误或返回 reason | 排查 |
| --- | --- |
| `replacement must reference a supported immediate move` | 检查 moves 的返回 ID、effect 支持状态，以及 effect.action；目前不接受多回合替换招式 |
| `Conflicting shared battle augment limit` | 相同 scope/key 的 max 不一致，统一声明 |
| `eligibility must return a boolean` | requires 返回对象、undefined 或 Promise；使用同步 boolean |
| `selected an undeclared replacement move` | select 返回值未在 moves 白名单中，先注册再引用返回 ID |
| `原招式当前不可用` / `使用次数已用完或被预留` / `道具不足或已被预留` | 检查原槽 PP、招式限制、同控制者已排队选择和取消状态；不要绕过服务扣费 |

本合同不支持任意新行动种类、替换为多回合招式、任意资源支付回调或完整现代世代语义。需要这些能力时先用领域代表例说明缺口，再扩展明确合同，不让插件导入核心修改内部队列。最新验证范围查 [VALIDATION](../../project/VALIDATION.md)，浏览器操作不由适配器测试代替。
