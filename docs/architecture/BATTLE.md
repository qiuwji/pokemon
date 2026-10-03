# 战斗的现行职责与扩展边界

战斗领域接收目录、队伍/席位配置、规则和可复现RNG，计算行动及结果；应用服务负责把结果交给世界/设施，表现只播放已经产生的语义事件。默认政策是Gen3，目录登记不等于所有原作语义已经验证。当前完成度见[STATUS](../project/STATUS.md)、[机制矩阵](../engine/battle/MECHANISM_MATRIX.md)及[效果审计](../engine/battle/MOVE_AUDIT.md)。

## 谁拥有哪种职责

| 模块 | 职责 |
| --- | --- |
| dist/engine/battle.js · Battle | 战斗会话装配与公开行动；不把业务扩展堆回executeMove |
| battle/roster.js · BattleRoster | 联盟、控制者、席位、队伍、候补及在场身份 |
| battle/targeting.js、decisions.js | 合法目标与各席位行动收集、预留及取消 |
| battle/round.js · RoundResolver | 提交后行动顺序、替换暂停/恢复、回合末及结束检查 |
| battle/moves.js · MoveExecutor、move-effects.js | 招式执行步骤与统一效果/op校验、分阶段操作 |
| rule-pipeline.js、rules/attachments.js、battle/traits.js | 命名阶段、数值修饰、特性/持有物附着规则 |
| battle/state-registry.js、major-status.js、volatiles.js | 席位/联盟/战场状态、个体异常和临时状态各自生命周期 |
| battle/action-lifecycle.js、replacement-requests.js | 蓄力/重复/硬直、延迟作用及中途替换请求 |
| battle/checkpoint.js、events.js、outcomes.js、spoils.js | 失败恢复、快照事实、联盟结束判定及本场收益 |
| packs/emerald/application/battle-application.js | 注册遭遇创建、战斗启动、应用结果提交及UI/保存协调 |
| engine/battle-session.js、presentation/battle-* | 领域事实到播放时序，再到布局/逐帧绘制 |

领域不导入DOM或内容包。应用只注入明确端口，兄弟服务由composition连接。战斗策略只读冻结观察及合法行动集合，人类/AI共用目标、资格和失败检查。

## 身份与行动

精灵UID标识个体，控制者ID标识队伍和行动权，席位ID标识战场位置，联盟ID用于共同胜负。一个精灵换场仍是同一UID；席位换人后占据者变了。命令的actor/seat、目标座位与队伍索引必须按当前合同解析，不能混写。

支持注册训练家完整队伍、单打/双打便利配置及显式多控制者/多联盟席位组织。画面上一只倒下不等于队伍耗尽；还有合法后备就进入替换。多阵营代表例也不等于三打距离、轮盘或在线多人政策已经提供。

决策先校验并预留，未结算不花PP/RNG。准备完成后按优先级、速度及既有平局政策执行；中途替换暂停保留后续行动，不偷偷免费完成整个回合。失败检查点恢复涉及的HP/PP/身份/状态/选择/随机数。

## 效果、规则与状态

招式引用moveEffects中的定义，阶段为primary、beforeDamage、afterDamage、secondary等；注册器汇合多个operation模块，未知效果/操作应在发生费用前拒绝。primary与伤害路径不能混合。具体15个常用op的参数、注册例及完整表读取方式见[战斗Skill](../../skills/emerald-battle-rules/SKILL.md)。

状态有明确作用域、来源、到期和离场清理。特性/持有物只在声明阶段响应；来源UID与席位不能互换。蓄力、连续行动和延迟攻击用ActionLifecycle，禁止内容自己复制一个定时器。详情见[状态与行动合同](../engine/battle/STATES_AND_ACTIONS.md)。

天气通过BattleWeatherRegistry注册，世界天气由应用映射进场，不共享任意可写对象。形态通过[形态合同](../engine/creatures/FORMS.md)提供有效投影；插件行动增强通过[独立合同](../engine/battle/AUGMENTS.md)提供资格、招式替换、费用、限次和语义事件；形态状态与行动增强分别归自己的所有者。完整Mega/Z规则仍由对应业务定义，不因单个示例就算完成。

## 应用结果与设施隔离

普通胜负经过BattleApplication的结果计划，处理奖励/战败剧情及保存；提交有自己的唯一身份。设施调用装配提供的受控战斗入口，以临时队伍/库存及专属结果所有者运行，不执行普通训练家奖品/战败世界逻辑。活动奖励由设施账本结算，不能两边各发一次。见[设施合同](../engine/facilities/FACILITIES.md)。

表现消费结果快照，不决定命中、伤害、捕获或换人。回合事件包含来源/目标席位和结果，注册视觉/时序按这些事实播放。长剧情目前没有通用“战斗暂停后自动续同一命令树”的合同；战后故事由独立结果流程关联，内容不要在battle命令后直接假定获胜。

## 验证与阅读入口

公开注册训练家看tests/encounter-content.test.js（搜索`trainer-pack`、`core.battle.start`）；多队伍看team-battle.test.js；状态/生命周期看battle-states、control-states及action-lifecycle测试；失败与权限看plugins。入门完整例为[examples/battle-effect.test.js](../../examples/battle-effect.test.js)。

当前版本/测试数量只写README和验证记录。早期P1–P3限制及当时设计已移至[历史战斗演进](../history/battle-evolution.md)，它不决定现行能力。未变化的证明复用，受影响的规则/命令/保存边界针对性检查，框架阶段最后系统与浏览器验收。
