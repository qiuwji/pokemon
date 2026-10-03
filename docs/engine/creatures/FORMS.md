# 运行时形态

按同一领域合并的现行接口说明。进度与验证以STATUS和对应证据为准；下文保留必要的分项合同。

## 有效形态与临时精灵数据

`content.register('forms', id, definition)`：声明基础 species、name、scope（world/battle）、baseStats（只含非 HP 能力）、types、ability、sprites（front/back 资源 ID）、heldItem 条件、oncePerController（仅 battle）、clearOn（leave/faint）。注册时校验精灵/能力/道具/资源引用。

基础精灵始终保留原 species、IV、EV、能力、招式和最大 HP。有效视图根据注册形态重新计算非 HP 能力；变身等临时操作可以添加覆盖层。战斗公式、类型、特性归属、速度、当前招式和表现读取有效值；扣血、状态、库存、经验等持久操作仍写领域本体。没有直接修改本体再猜测如何还原。

- 野外：`core.creature.form {uid,form}` / `core.creature.form.restore {uid}`，需要 forms 权限。world 形态保存 ID；重新加载与升级后重新推导能力。转移出玩家保管范围或进化导致基础物种变化时，保存协调器调用 reconcile 清除已不适用的形态。
- 战斗：`core.battle.action {kind:'form',form,seat?}`，需要 battle 权限，在选择行动时可用，不消费回合。注册条件与每控制器次数由引擎校验。引擎还提供 activateForm 效果操作，供规则/招式在标准阶段调用。
- 查询：core.query 的 forms / effectiveParty 与战斗快照提供有效信息；基础 party 保留身份值。表现消费 form / sprites，渲染器支持独立前后图；形态事件有闪光过渡。
- 清理：battle 形态结束必定清空；是否在换人/倒下恢复由定义决定。world 形态保留。临时招式/变身覆盖在换人/倒下/结束恢复，扣除的原始选择招式 PP 保留。

变身通过同一服务复制目标非 HP 能力、IV、类型、能力与当前招式（各自最多 5 PP）；模仿只覆盖临时招式槽。检查点覆盖覆盖层及每控制器使用记录。参考 battle_script_commands.c::Cmd_transformdataexecution / Cmd_mimicattackcopy；永久 Sketch 后续由招式学习领域提交，不把临时形态写成永久学习。

Mega 可由独立插件注册 battle 形态、石头/资格和入口，使用 oncePerController；本接口本身不把 Mega 放入绿宝石默认规则。HP 变化属于进化/永久能力成长等领域，本形态合同有意保持最大 HP，避免临时数据与持久 HP 不一致。完整 Mega 的专属规则与素材由插件声明并独立验收。
