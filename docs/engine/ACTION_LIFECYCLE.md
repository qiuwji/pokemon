# 行动生命周期与延迟结算

招式效果定义可包含 `action`：

- `{kind:'charge',skipWeather?:'sun',hidden?:'air'|'underground'|'underwater',hiddenByMove?:{moveId:mode}}`：第一回合扣 PP，续行不重复扣 PP。`onCharge` 可执行已有效果操作，例如火箭头槌防御提高。
- `{kind:'repeat',minTurns:2,maxTurns:3,confuseAfter:true}`：由战斗 RNG 决定长度，引擎续行；内容不接管回合循环。
- `{kind:'recharge'}`：成功后占用下一回合恢复行动。
- `hitsHidden` 与 `hiddenMultiplier`：配置可攻击的隐匿状态及倍率。

行动锁绑定席位与精灵 UID；换人、倒下、失败或战斗结束解除。人类锁定席位不再要求前端选择；双打其他未锁定席位仍正常选择。所有人类席位暂时自动时，BattleSession 顺序呈现事件并推进一次自动回合，直到需要玩家选择。动作故障由原检查点回滚锁、队列、历史与 RNG。

`futureAttack` 是共享效果操作：登记目标席位、来源 UID、招式、预先计算的基础伤害及到期回合。默认第三世代 future_sight 第三回合结算，目标换人仍攻击该席位，来源换人保留施放者身份。施放不做命中判定；落点再判断命中并进行随机伤害。参考 battle_script_commands.c::Cmd_trysetfutureattack、battle_util.c::HandleWishPerishSongOnTurnEnd 与 data/battle_scripts_1.s::BattleScript_MonTookFutureAttack。

历史最多 64 条，由战斗服务记录席位/UID/招式/成功状态和目标；规则不获可写队列。`copyLastMove` 经行动替换接口模仿最近成功招式，复用执行器、扣原选择招式 PP，禁止再次模仿 mirror_move 的递归。新多回合招式可添加效果定义，无需修改回合循环。

公开快照含 actionLifecycle（locks/delayed/history），用于界面提示和插件只读判定。当前不是原作完整控制状态实现：Encore/Disable/Torment、所有复制禁止列表、全套延迟技能与结算细节继续按 B3 清单补充。已有测试证据见 DEVELOPMENT_LOG.md。


## 实际承伤与准备阶段

`BattleActionLifecycle.received` 在回合开始清空，按接收 UID 分别记录最后一次物理/特殊伤害与总类最后来源、席位、来源 UID、招式、整数 HP 伤害及是否致命。替身吸收不算实际 HP 承伤。该账本参与行动回滚，公开快照提供只读投影，不用于重算数值。

效果定义可声明 `retaliation: physical|special`，执行器据有效来源选择目标，再进入通用目标重定向；`retaliate` 准备固定双倍伤害。复仇与真气拳仅查询本回合账本。`preparation` 为调度前的表现消息，不能改变行动顺序或领域结算。

保护/看穿/挺住共享连续使用政策与来源历史；成功率表放在 BATTLE_POLICY。挺住在替身之后约束直接承伤，保留 1 HP，不保护毒或天气持续伤害。参考连续成功表只有四个条目，本项目对更长连用饱和使用最后一个概率，避免复刻原参考潜在数组越界；这是明确的健壮性决定。

依据：`battle_script_commands.c` 的 `Cmd_counterdamagecalculator`、`Cmd_mirrorcoatdamagecalculator`、`Cmd_setprotectlike`，以及 `data/battle_scripts_1.s` 的 FocusPunch/Revenge 脚本。验证见 reactive-status.test.js。


## 临时道具与有效特性

BattleHeldItems 在每场战斗持有 `used` 与 `knocked` 账本，参加检查点，不保存到精灵本体。消费记入回收账本；拍落结束后归还；戏法与偷取改变持有者并受政策、黏着和已拍落资格约束。BattleTraits.setAbility 是临时特性统一入口：有有效形态时更新覆盖值，否则记录原特性并暂时更新，离场/结束恢复。规则与 UI 查询均使用有效特性。

`landed` 类型历史区别于本回合 HP 承伤账本，供纹理2等跨回合查询。它记录成功影响的招式类型，离场/倒下清理，观察不消耗 RNG。纹理2使用有效候选抽样，未复制参考源码的缺陷回退路径，故不承诺原版随机位序。
