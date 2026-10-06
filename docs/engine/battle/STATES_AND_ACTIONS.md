# 战斗状态、行动生命周期与策略

按同一领域合并的现行接口说明。进度与验证以STATUS和对应证据为准；下文保留必要的分项合同。

## 战斗状态接口

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

共用 called-moves 端口进入原执行器，被调用动作不再检查行动资格或扣 PP，并且不继承旧连续行动标志。递归上限 8 是项目防故障政策，不是原作规则。原作调用禁表保持；抽取有效候选采用等概率选择，不承诺原作拒绝采样的随机位序一致。元数据提取已有全部 354 招式及原始接触/反射/抢夺旗标和声音表；运行目录已接入第三世代354招式；实际可调用池仍按禁表和目录资格过滤，目录规模不能证明全部调用边界与原作语义。

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


---

## 战斗策略与规则观察

训练家 `strategy` 选择已注册策略；`bag` 可提供合法道具库存。random 默认保留既有随机策略；tactical 为可选启发式策略。插件注册 battleStrategies，decide 只返回候选索引，不获得可写战斗/RNG。

视图含 seat、turn、snapshot、candidates、analyses、roll。候选包括可用招式/目标、合法替换和合法道具目标；分析含招式/效果定义、HP、类型、阵营关系与估计伤害。估计使用局部平均骰、无要害，并明确不包含动态威力、固定伤害、完整命中许可与附加效果；它不是实际行动结算，不能拿估计值扣血。自定义策略可自行根据注册定义评分，实际行动统一由 BattleActions 与回合服务校验和执行。

tactical 参考原作“避免无效招式、争取击倒、考虑存活和状态”的策略分类，但没有解释原作 AI 脚本。原作精确 AI 的范围与证据需后续独立维护，不把这种策略等同原作训练家全部决策。

上层两层策略为独立新增合同，旧 `decide(view)→index` 路径保持原视图/原索引/原随机消费不变：
- 训练家策略 `battleStrategies` 支持 `version:2`（`score`/`scoreJoint`/`init` + `parameters`/`memory` schema），控制者层；个体策略 `creatureStrategies`（`version:1`）按 UID 绑定，评价自身招式与目标。绑定在训练家/队员 `ai`（`trainer`/`creature`/`information`/`choice`/`variants`），队员优先、训练家默认、未配置则零贡献；`strategy` 与 `ai` 不可并存。
- 宿主 `BattleAiRuntime` 合成 `训练家贡献 + 个体贡献`，`best` 取最高分、`topBand` 在阈值内用**独立 AI 随机流**采样；不改游戏 RNG。`BattleCandidateService` 统一生成带稳定 ID 的合法候选（招式/目标/旧增强/声明式附加变体/换人/道具/接替），不消费 PP/道具/额度/RNG。
- `observed` 信息模式结构上不读取隐藏数据（对手未登场/未公开的招式、特性、持有物、精确能力值与隐藏派生估计都不在投影内）；`full` 仅用于测试/特殊规则。分析项声明 `coverage`/`confidence`，未支持效果返回未知而非伪造零收益。
- 团队记忆按控制者、个体记忆按 UID、公开知识按观察方保存；完整决策验证后宿主才应用 `nextMemory`。记忆、知识、AI RNG、决策序号、计划缓存与解释记录一并纳入 `BattleCheckpoint`，失败整体回滚。
- 接替三类：倒下候补与自主/接棒接替进入同一决策服务；吼叫等规则强制换人仍按原 `replacementPolicies`。双打按控制者联合评分（每席位保留前若干候选 + 一个基础退路，组合前排除同一候补/道具/共享额度冲突，再叠加 `scoreJoint`）。`core.battle.ai-view` 只读读取已记录的解释，不重新评分或取随机。
- 野生遭遇只带个体策略：配置放在**注册遇敌表**的可选 `ai`，`encounter.request` 按凭证的 table 解析后经 `startEncounterBattle(..., ai)` 传入战斗，凭证仍只存 species/level（不改存档合同）；暗雷/钓鱼/碎岩/Actor 共用该路径。未配置的野生遭遇继续走原随机行为（最弱）。难度是内容约定：选不同策略实现 + `parameters` + `choice.band`（宽容度），`information` 只区分观察边界、不作难度，招式名称/形态特判不进入引擎。


---

## 行动生命周期与延迟结算

招式效果定义可包含 `action`：

- `{kind:'charge',skipWeather?:'sun',hidden?:'air'|'underground'|'underwater',hiddenByMove?:{moveId:mode}}`：第一回合扣 PP，续行不重复扣 PP。`onCharge` 可执行已有效果操作，例如火箭头槌防御提高。
- `{kind:'repeat',minTurns:2,maxTurns:3,confuseAfter:true}`：由战斗 RNG 决定长度，引擎续行；内容不接管回合循环。
- `{kind:'recharge'}`：成功后占用下一回合恢复行动。
- `hitsHidden` 与 `hiddenMultiplier`：配置可攻击的隐匿状态及倍率。

行动锁绑定席位与精灵 UID；换人、倒下、失败或战斗结束解除。人类锁定席位不再要求前端选择；双打其他未锁定席位仍正常选择。所有人类席位暂时自动时，BattleSession 顺序呈现事件并推进一次自动回合，直到需要玩家选择。动作故障由原检查点回滚锁、队列、历史与 RNG。

`futureAttack` 是共享效果操作：登记目标席位、来源 UID、招式、预先计算的基础伤害及到期回合。默认第三世代 future_sight 第三回合结算，目标换人仍攻击该席位，来源换人保留施放者身份。施放不做命中判定；落点再判断命中并进行随机伤害。参考 battle_script_commands.c::Cmd_trysetfutureattack、battle_util.c::HandleWishPerishSongOnTurnEnd 与 data/battle_scripts_1.s::BattleScript_MonTookFutureAttack。

历史最多 64 条，由战斗服务记录席位/UID/招式/成功状态和目标；规则不获可写队列。`copyLastMove` 经行动替换接口模仿最近成功招式，复用执行器、扣原选择招式 PP，禁止再次模仿 mirror_move 的递归。新多回合招式可添加效果定义，无需修改回合循环。

公开快照含 actionLifecycle（locks/delayed/history），用于界面提示和插件只读判定。当前不是原作完整控制状态实现：Encore/Disable/Torment、所有复制禁止列表、全套延迟技能与结算细节继续按 B3 清单补充。已有测试证据见 docs/project/CHANGELOG.md。


## 实际承伤与准备阶段

`BattleActionLifecycle.received` 在回合开始清空，按接收 UID 分别记录最后一次物理/特殊伤害与总类最后来源、席位、来源 UID、招式、整数 HP 伤害及是否致命。替身吸收不算实际 HP 承伤。该账本参与行动回滚，公开快照提供只读投影，不用于重算数值。

效果定义可声明 `retaliation: physical|special`，执行器据有效来源选择目标，再进入通用目标重定向；`retaliate` 准备固定双倍伤害。复仇与真气拳仅查询本回合账本。`preparation` 为调度前的表现消息，不能改变行动顺序或领域结算。

保护/看穿/挺住共享连续使用政策与来源历史；成功率表放在 BATTLE_POLICY。挺住在替身之后约束直接承伤，保留 1 HP，不保护毒或天气持续伤害。参考连续成功表只有四个条目，本项目对更长连用饱和使用最后一个概率，避免复刻原参考潜在数组越界；这是明确的健壮性决定。

依据：`battle_script_commands.c` 的 `Cmd_counterdamagecalculator`、`Cmd_mirrorcoatdamagecalculator`、`Cmd_setprotectlike`，以及 `data/battle_scripts_1.s` 的 FocusPunch/Revenge 脚本。验证见 reactive-status.test.js。


## 临时道具与有效特性

BattleHeldItems 在每场战斗持有 `used` 与 `knocked` 账本，参加检查点，不保存到精灵本体。消费记入回收账本；拍落结束后归还；戏法与偷取改变持有者并受政策、黏着和已拍落资格约束。BattleTraits.setAbility 是临时特性统一入口：有有效形态时更新覆盖值，否则记录原特性并暂时更新，离场/结束恢复。规则与 UI 查询均使用有效特性。

`landed` 类型历史区别于本回合 HP 承伤账本，供纹理2等跨回合查询。它记录成功影响的招式类型，离场/倒下清理，观察不消耗 RNG。纹理2使用有效候选抽样，未复制参考源码的缺陷回退路径，故不承诺原版随机位序。


## 支援与连锁倒下

`pre-type-damage` 在暴击后、STAB/属性前，承载充电与帮助。Weather Ball、Spit Up 的基础伤害乘数从效果上下文传入公式；效果不能以改变威力代替不同整数阶段的乘数。看我嘛优先于引雷并只重定向单体招式。

致命来源来自真实 HP 冲击账本，同命和怨念只响应敌方直接致命招式。倒下观察排空钩子中新产生的倒下对象，再判断所有联盟存活；避免循环已处理过的席位漏结算。二者的行动锁在下一次行动许可阶段（包括睡眠等阻止）清除。

## 捕捉资格与收纳提交

应用装配将既有canCapture规则与PartyStorageService容量相交；自定义宽松规则不能绕过队伍/盒子容量。物品准备和行动执行复查资格；准备阶段拒绝投球不消费精灵球、不推进回合或捕捉随机数。上下文隔离战斗的结算由其结果所有者负责，不能把设施队伍写进主存档。

普通野生战斗在结果commit中接收捕获个体、标记图鉴，然后退出并播放剧情；捕捉播报失败不丢失已接收个体。剧情captureMonster与遭遇凭证结果也复用同一收纳服务，不裸push，界面/演出不拥有容量政策。重复提交用稳定UID与结果计划防重；保存仍只接受有效当前格式，失败读取/写入保护旧原文，容量失败不等于旧存档被清空。
