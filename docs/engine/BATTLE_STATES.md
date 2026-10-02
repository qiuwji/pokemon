# 战斗状态接口

`content.register('battleStates', id, definition)` 注册定义；定义包含 scope、schema、hooks、duration（回合数或 null）、stack（reject/refresh/add）、maxStacks、excludes 与 clearOn（leave/faint）。所有战斗结束均清空战斗实例，不能把它用作永久养成存档。永久状态用已有插件持久状态接口。

四种锚点：creature 为 UID（可在换人后保留、离场时不触发场上挂钩）；seat 为席位；side 为队伍一侧；field 为全场。来源记录 source.seat/uid/moveId。每场战斗独立持有实例，动作故障由战斗检查点统一恢复。

效果操作：applyBattleState（id、target:self/opponent、data、duration）、removeBattleState、updateBattleState（只能在状态挂钩内更新当前实例数据，须满足 schema）。规则挂钩与能力/持有道具共用阶段和排序，插件收到冻结的 `battleState` 记录，可读取 stacks/remaining/data/source；数值返回值，行为返回已注册操作。

生命周期阶段：state-applied、state-tick（每回合一次）、state-removed；本状态定义只接收对应实例的生命周期，其他状态不误触发。到期发生在回合末；当回合施加的有限状态亦计入本回合。leave/faint 根据定义清理，end 强制清理；remove 事实事件含 reason。

第三世代默认示例：substitute 属于席位，消耗 maxHP/4（至少 1），承伤不溢出；reflect/light_screen 属于 side，5 回合、换人保留；mist 限制敌方能力下降；taunt 属于席位，2 回合。来源为只读参考 battle_script_commands.c（setsubstitute/setreflect/settaunt）与 battle_util.c 回合计时器。复杂例外及所有原作招式组合仍按机制清单逐项补充，注册表存在不能当作所有原作行为已通过验证。
