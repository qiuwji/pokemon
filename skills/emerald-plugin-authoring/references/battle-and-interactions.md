# 战斗扩展与宿主驱动实时会话

只读本次涉及的部分。公开类型从 [contracts](../../../src/engine/contracts.d.ts) 查起，公开命令从 [application-commands](../../../src/packs/emerald/application-commands.js) 查起；设计中的字段不能替代这两个入口。

## 战斗：先选择能力

| 需求 | 现有合同 / 锚点 |
| --- | --- |
| 新招式效果、状态或规则 | [战斗架构](../../../docs/architecture/BATTLE.md)、[battle-effect 示例](../../../examples/battle-effect.test.js)；需要原作规则还原时用战斗领域 Skill |
| 替换一次完整招式 | [battleAugments](../../../docs/engine/battle/AUGMENTS.md)、[核心测试](../../../tests/battle-augments.test.js)；`core.battle.augments` |
| 一次行动附加形态、受限派生或修饰 | [battleAttachments](../../../docs/engine/battle/ATTACHMENTS.md)、[代表例](../../../examples/battle-attachment.test.js)；`core.battle.attachments` |
| 放行/禁止行动或改变防御结果 | 同一附加项合同的许可部分、[规则管线](../../../src/engine/rule-pipeline.js)、[许可测试](../../../tests/battle-permissions.test.js) |

现代机制使用这些通用合同组合业务规则；形态变化本身不等于完整机制。默认 Gen3 不变。先区分原作确认事实、插件自定规则和未验证行为；不把名字相似当规则相同，不把“强制接替”当手动换人/逃跑的行动锁。

## 战斗：提交与传输

`api.content.register("battleAttachments", localId, definition)` 的关键字段是 `commitPoint`、`requires`、`parameters` schema、`limit`、`transition:{form}`、`deriveMove`、`modifiers`、`pp` 和 `unavailablePolicy`。字段边界直接读合同与 [注册器](../../../src/engine/battle/attachments.js)，不复制另一份字段白名单。

- 请求最多两项，最多一个形态附加与一个派生附加，不能与旧 `augment` 混用。额度按 `scope + subject + key` 管理；显式同 key 可与增强共用额度。参数 schema 和容量冲突在各自边界校验。
- **公开命令里的每项 `parameters` 是 JSON 字符串；引擎内部是解析后的 JSON 对象。** 不直接把内部 `MoveActionRequest` 复制给传输。例：

```js
await api.commands.dispatch("core.battle.action", {
  kind: "move", index: 0,
  attachments: [
    { id: stanceId },
    { id: focusId, parameters: JSON.stringify({ bonus: 20 }) },
  ],
});
```

- 候选用 `core.battle.attachments {index,seat?}`；先发现候选/参数 schema，再填写参数并提交。参数未填、actor 被替换、额度变化与取消都不应让查询产生写入。
- 选择只预检和预留；`beforeOrder` / `beforeAction` / `moveStart` 才复检并消耗。要影响排序的投影必须在排序前生效；只在招式结算时安装的修饰不能假定影响前面的排序。
- `sourceMove` 是 PP 与身份来源，`effectiveMove` 才是派生后的视图。派生返回仅允许合同列出的有限字段；资格或派生失效走 `continueBase` 时回退基础招式，走 `failAction` 时失败，不能免费保留增强值。`derivedMove/ppClear/committed` 是内部字段，UI 不提交。
- 作用域修饰必须绑定本 actor、本行动、已提交附加项，行动结束/失败即失效。核对阶段不仅在注册白名单里，也确实被所需计算分支消费；固定伤害、多段与预计算分支尤其要检查。
- `decide` 只用于合同允许的许可阶段，返回 `abstain/allow/deny/outcome`；`allow` 不推翻其他禁止。防御 `protected/pass/block/scaledDamage` 走已有命中、免疫、伤害与取整管线；不直接改 HP。只改本次灼伤倍率可在 `burn-modifier` 返回 1，不修改灼伤状态。

最小验证从 [battle-attachment](../../../examples/battle-attachment.test.js) 开始，必要边界查 [battle-attachments](../../../tests/battle-attachments.test.js)：公开参数/组合、提交点、取消与复检失败、源槽 PP、共享额度、排序、无泄漏、后段异常回滚、默认 Gen3。UI 菜单接入、形态特性转换等支持范围以当前代码与合同为准；示例直接提交指令不代表玩家菜单已接通。

## 实时会话：业务归插件，循环归宿主

先读 [INTERACTIONS](../../../docs/engine/INTERACTIONS.md)，再看 [interaction-bar](../../../examples/interaction-bar.test.js)。注册 `api.interactions.register(localId,{version,parameters,state,result,inputs,completion?,init,step,view})`，用 `api.capabilities.interactions` 检测能力。

- `init(context, parameters, random)` 创建 JSON 业务状态；`step(state,{clock,input,context})` 返回 running 或 terminal；`view(state,{clock,viewport,reducedMotion})` 返回 FrameData。全部同步、只读；返回新状态，不修改输入对象。
- **step 不接收 parameters 或 random。** 把需要的已校验参数/随机计划放进 init 返回的状态；需要过程随机时先核对公开能力，不能偷偷读取系统随机或世界 RNG，也不能假定有 `frame.random`。状态中可保存明确的可回放业务数据，不能保存函数、DOM 或核心对象。
- 时间用宿主固定逻辑步的 clock，持续动作看 `held`，瞬时动作看 `pressed/released`，同 tick 多次变化用有序 `edges`。不读取 `Date.now/performance.now`、不监听原始键盘、不自建定时器或 requestAnimationFrame。暂停/恢复由宿主处理，插件只依赖逻辑时间。
- view 只算这一帧。按 [frame-data 校验器](../../../src/engine/frame-data.js) 的真实图元、字段和预算返回数据；资源用注册 ID，不塞 HTML/CSS/draw 回调。绘制层负责缩放、资源和清理，不在 view 中结算奖励。
- completion 保存 `actions.register` 返回的 ID。它一旦用于会话结算便是**宿主专用处理器**，不能当按钮 action 或直接 dispatch；输入为 `{instance,context,outcome,result}`，schema 要匹配，写结果继续用 ctx.intent/ctx.store。结果只在 terminal 后由宿主冻结并提交。
- 完成事实 `core:interaction-completed` 带 `source`；它是提交后通知，不是发奖凭据。需要战斗/世界接续时走现有受控入口，不能在同步结算事务里异步开战或把 source 当权限。
- 当前不保存活动会话，不承诺跨刷新重试幂等、多会话并发或完整原生钓鱼迁移。文档“未实现”列表与实际实现可能不同步，按所需入口查调用点与测试。

## 实时会话：接上正常入口

公开 `core.interaction.start {definition,source?,parameters?}` 的 parameters 也是 JSON 字符串，只在宿主空闲时启动。**若发起方正处于 fieldAction/剧情/设施流程，不能在 action 事务里 dispatch start 解决 busy 锁。**

当前 fieldAction 可以返回计划操作 `{kind:"interaction",id,parameters?,source?}`；这里 parameters 是内部 JSON 对象，见 [野外合同](../../../docs/engine/field/FIELD_ACTIONS.md) 与 [计划适配器](../../../src/packs/emerald/application/field-action-application.js)。这条路径由宿主提交时启动，无需插件接触 InteractionApplication。是否需要设施专用接续，按该领域实际适配器核实。

确认键入口使用 `triggers:["interact"]`、可用空输入的 schema、正确 target 与 plan；不要设 `menu:false`，也不要抢走对象/水面/阻挡的原生交互。直接 dispatch start 的测试不能代替这个入口。

无浏览器验证可用 `core.interaction.input {action,active}`、`advance {ticks}`、`view {}`、`cancel {}`；保持真实桥、事务和存储。专项锚点：[interaction-completion](../../../tests/interaction-completion.test.js)、[interaction-session](../../../tests/interaction-session.test.js)、[interaction-dom](../../../tests/interaction-dom.test.js)。只选本次边界：成功/失败/取消、持续与瞬时输入、失焦后逻辑时间、纯回调拒写、异常释放、完成处理器不能伪造调用、重复结算及自动保存实际落盘。
