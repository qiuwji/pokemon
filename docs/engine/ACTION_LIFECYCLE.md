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
