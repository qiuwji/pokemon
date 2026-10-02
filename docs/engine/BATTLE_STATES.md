# 战斗状态接口

`content.register('battleStates', id, definition)` 注册定义；定义包含 scope、schema、hooks、duration（回合数或 null）、stack（reject/refresh/add）、maxStacks、excludes 与 clearOn（leave/faint）。所有战斗结束均清空战斗实例，不能把它用作永久养成存档。永久状态用已有插件持久状态接口。

四种锚点：creature 为 UID（可在换人后保留、离场时不触发场上挂钩）；seat 为席位；side 为队伍一侧；field 为全场。来源记录 source.seat/uid/moveId。每场战斗独立持有实例，动作故障由战斗检查点统一恢复。

效果操作：applyBattleState（id、target:self/opponent、data、duration）、removeBattleState、updateBattleState（只能在状态挂钩内更新当前实例数据，须满足 schema）。规则挂钩与能力/持有道具共用阶段和排序，插件收到冻结的 `battleState` 记录，可读取 stacks/remaining/data/source；数值返回值，行为返回已注册操作。

生命周期阶段：state-applied、state-tick（每回合一次）、state-removed；本状态定义只接收对应实例的生命周期，其他状态不误触发。到期发生在回合末；当回合施加的有限状态亦计入本回合。leave/faint 根据定义清理，end 强制清理；remove 事实事件含 reason。

第三世代默认示例：substitute 属于席位，消耗 maxHP/4（至少 1），承伤不溢出；reflect/light_screen 属于 side，5 回合、换人保留；mist 限制敌方能力下降；taunt 属于席位，2 回合。来源为只读参考 battle_script_commands.c（setsubstitute/setreflect/settaunt）与 battle_util.c 回合计时器。复杂例外及所有原作招式组合仍按机制清单逐项补充，注册表存在不能当作所有原作行为已通过验证。


## 控制、延迟恢复与场地政策

`rules/gen3/control-states.js` 注册定身法、再来一次、无理取闹、黑色目光、锁定、神秘守护、哈欠、祈愿、扎根、恶梦、寄生种子、灭亡之歌和撒菱。`battle/control-state-operations.js` 执行施加条件和清理，高速旋转通过同一状态服务解除寄生种子和撒菱。

- `clearWithSource: true` 表示来源 UID 离场/倒下时解除，不会因为该席位后来换上另一个精灵而继续生效。
- `selected-move` 是结算前的数值阶段，返回有效招式槽索引。再来一次影响已选但尚未执行的招式；选择时仍通过 `move-availability` 保持 UI、AI 和命令一致。
- `switch-in` 先结算入场场地，再触发可重入的特性 `entry`；例如复制特性不能导致撒菱重复伤害。
- 祈愿绑定席位，持续两次回合末，恢复届时接收者最大 HP 的一半。第三世代不使用施加者最大 HP。
- 寄生种子的接收者绑定施加席位；接收者换人后，新占用者收到吸取，草属性免疫，离场清除被寄生状态。
- 灭亡之歌在施加回合显示 3，四次回合末归零，换人解除；状态批次结束后统一观察倒下，避免同时归零提前结算胜负。

依据：固定参考 `battle_script_commands.c` 的 `Cmd_trysetdisable`、`Cmd_trysetencore`、`Cmd_trysetwish`、`Cmd_setyawn`、`Cmd_setperishsong`、`Cmd_switchineffects`、`AccuracyCalcHelper`；`battle_util.c` 的定时器和持续效果顺序。当前已验证这些机制的组合边界，不代表完整原作所有回合末优先顺序已经验证。


## 持久剧毒与临时计数

精灵 `status` 增加 `toxic`；持久化保留异常类别，`toxic_counter` 战斗席位状态拥有递增计数（最多 15），换人/倒下/结束清理，重新上场从 1 开始。伤害先计算 `max(1, floor(maxHP / 16))` 再乘计数，不能先乘后除。BattleMajorStatus 统一施加、防护、恢复与持续伤害；治疗道具、特性和树果通过共享毒家族匹配同时支持普通中毒与剧毒。

特性检查的 `status` 使用家族 `poison`，`majorStatus` 为实际 `toxic`；同步按第三世代传播普通中毒。公开插件只读规则上下文包含这两个字段与来源信息。依据 `battle_util.c` 的 ENDTURN_BAD_POISON 与特性同步分支；保存验证引用统一 STATUSES。


## 调用与连续行动补充（2026-10-03）

固定参考 battle_script_commands.c 的 IsInvalidForSleepTalkOrAssist、IsTwoTurnsMove、sMovesForbiddenToCopy、trychoosesleeptalkmove、assistattackselect、Sketch 与 rolloutdamagecalculation；battle_util.c 的睡眠取消与 ENDTURN_UPROAR。梦话/打鼾只允许仍在睡眠中的使用者；梦话忽略被调用槽的 PP，但尊重禁用等选择限制。借助可使用其他非蛋成员的招式，即使该成员倒下或有异常。写生使用最近已打印（可失败）的选择招式，永久替换本体槽并恢复该招式基础 PP。

共用 called-moves 端口进入原执行器，被调用动作不再检查行动资格或扣 PP，并且不继承旧连续行动标志。递归上限 8 是项目防故障政策，不是原作规则。原作调用禁表保持；抽取有效候选采用等概率选择，不承诺原作拒绝采样的随机位序一致。元数据提取已有全部 354 招式及原始接触/反射/抢夺旗标和声音表；运行目录尚未整体接入，挥指当前可调用池仍受已导入招式限制，不能声称完整 354 招式已可用。

连续行动政策可声明 stopOnFailure；滚动为五次、逐次威力翻倍，变圆额外翻倍，失败或不能行动立即解锁。吵闹使用同一个 2–5 回合锁，不另造计时器；在状态阶段唤醒非隔音对象，防止再次入睡，锁结束/换人/倒下时清理。三连踢为声明式 hitPowers [10,20,30] 与逐击命中检查，后续一击失败停止，已经造成的伤害保留。多段语义事件包含 hit 序号；具体表现仍待组合验收。


## 拦截、特殊多击与战利品（2026-10-03）

魔法反射/抢夺使用招式原始 flags（已有元数据的招式可回查），也允许内容显式提供空数组取消该旗标。守卫只持续当前回合并消费一次；重新归属的动作仍进入共用执行器，避免双扣选择招式 PP。原作 attackcanceler 与 SnatchedMove 的返回路径允许多个抢夺守卫连续转手，按行动顺序逐一消费。PressurePPLose 的第一个参数是压迫感来源、第二个是被扣 PP 的守卫使用者，因此会扣守卫招式的 PP；不是一概向原选择招式再收一次费用。源码确认见 battle_script_commands.c 962–985、6330、9869 及 battle_util.c 740。

围攻由 beforeDamage 操作提供每击 baseDamage/memberUid 计划；共用伤害服务处理逐击暴击和随机量，共用执行器处理 HP/替身/受击/倒下。基础攻击来自健康、无异常、非蛋队伍成员的本体物种与等级，基础防御来自目标有效物种/形态；此脚本没有普通属性/STAB/墙/天气公式。参考 trydobeatup 与 BattleScript_BeatUpLoop，特殊个体修饰/原作全部边界仍需组合验收。

飞踢失败使用 onMiss 语义阶段，伤害服务计算原作的本可造成伤害（无暴击）一半，至少 1、至多目标最大 HP 一半；类型免疫不反伤。damage-preview 是不提交 HP/替身的数值阶段，挺住/气势头带可修饰预览。参考 EffectRecoilIfMiss、manipulatedamage DMG_RECOIL_FROM_MISS、adjustnormaldamage。气势头带的 RNG 调用位序不保证与原作逐位相同，默认数值范围与资格已验证。

BattleSpoils 持有本场金币账本，只有玩家联盟使用聚宝功才累计 level*5，原作 16 位数值饱和到 65535。胜利时按钱币乘数结算并发出 money 事实；逃跑、捕获、失败不结算（参考 battle_main.c sEndTurnFuncsTable 与 HandleEndTurn_BattleWon、LocalBattleWonReward）。应用结果提交有防重复标记，独立于训练家首次奖励；payDayReward/rewardCurrency 是可覆盖规则政策，默认聚宝功写入钱数上限 999999。一般剧情奖励尚未统一使用货币上限，不能把本项当成全工程货币规格已完成。


## 回合中的替换与接棒（2026-10-03）

BattleReplacementRequests 持有待替换席位/当前 UID/原因及只读候选；规则表 replacementPolicies 指定交接标签、可保留的临时字段和是否绕过离场资格，replacementIndex 指定自动控制器的候选选择。接棒是 Gen3 默认政策；操作 requestReplacement 不接管调度器。人类选择仍发送既有 switch 命令，其他行动在请求期间拒绝；AI 同步选择合法后备。待替换标记不可由输入自行伪造。

RoundResolver 保存尚未执行的同回合行动；遇到待选择立即暂停，既不执行后续攻击，也不结算回合末。选择后恢复原行动顺序/行动身份/回合号；失败检查点同时恢复选择、队伍身份、状态来源、队列、PP、HP 与 RNG。BattleSession 播放事实事件后归还选择权，UI 显示替换入口，不通过动画回调执行领域换人。

参考 battle_script_commands.c switchindataupdate 和 battle_main.c SwitchInClearSetData：接棒保留能力阶段、混乱、聚气、替身、逃脱限制、诅咒、种子、锁定、灭亡计数、扎根；不传递重大异常、着迷、禁用、蓄力/积蓄状态等。水/泥运动现有实现为全场政策，换人也不会清掉。状态可声明 transferOn 标签；来源离场清理型状态还可声明 sourceTransferOn 和 sourceTransferDuration。来源 UID 随接棒交接，锁定来源交接重置为两回合，普通离场仍解除。个体锚定的插件状态可明确随标签移交 UID，避免写入精灵永久存档。

行动历史日志保留诊断记录，但最近招式查询只取当前入场之后的记录；精灵换下再回来不能重新继承上次的招式记忆。每次执行冻结真正的行动者 UID，避免 AI 在招式中换人后把招式记在新成员名下。

完整 354 招式参考元数据现已作为 Emerald 运行目录基础接入，保留已有导入招式的名字/数据；flags 对现有 FLAG_* 与规范名/原始位码有统一解析，sole ["0"] 明确表示零旗标。挥指的原作候选不再受 87 个导入招式限制。招式目录/效果名称覆盖齐全仍不是全部原作行为核对完成；显示名称、专属动画、全部细粒度结算、原作 AI 策略与新增规则组合需业务/系统验收。
