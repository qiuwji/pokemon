# 设施与活动扩展

## 这套框架解决什么

设施是一个有身份、局部状态、玩家行动、结果和结算的活动会话。公共层不判断开拓区、华丽大赛或游戏厅名称。连战、评审和转轮各有独立注册规则；它们共用进入/退出、冻结查询、事务、事件和保存边界。

当前实装见[STATUS](../../project/STATUS.md)：本体两场连战练习，以及可选[JSON设施插件](../../../src/plugins/facility-content/README.md)的连战、轮次表演与转轮模板。它们可以只改JSON配置运行，均不是完整原作开拓区、选美、老虎机规则；完整规则和资源仍需按原作依据逐步补充。

## 代码职责

| 位置 | 所有权 |
| --- | --- |
| src/engine/facilities.js · FacilityRegistry | 活动schema、定义、资格、注册和资源引用校验 |
| 同文件 · FacilitySession | 会话身份、局部状态、阶段、一次性转换计划、场次票据和完成记录 |
| src/packs/emerald/application/facility-application.js | 受控随机采样、资源草稿与提交、临时队伍、战斗接线和事实通知 |
| src/packs/emerald/facilities.js | 连战规则和示例定义、第三世代临时等级投影 |
| src/packs/emerald/facility-interface.js | 通用选队/行动菜单；只查询并发命令 |
| examples/facility.test.js、tests/fixtures/extensions/facility.js | 通过公开注册验证非战斗活动；测试数据不部署 |

表现不参与规则。状态提交与通知分开：表现失败不能退回已扣的成本、局部进度或已使用的随机数。真正的规则/成本/容量失败则保持会话、经济和随机状态不变。

## 插件注册

`api.content.register('facilityActivities', id, activity)`定义活动规则；`api.content.register('facilities', id, definition)`定义某个设施。

活动字段：parameters参数schema、state局部状态schema、initial初值、actions行动表，可选validate定义/引用检查，可选onBattle战后规则。每个行动有label、schema、可选draws、when和同步decide。when接收深冻结的{data,parameters}，同步返回布尔；查询只列出当前合法行动，命令提交复查同一条件。插件when和decide均在宿主规则评估守卫内运行，不能发事件或递归操作；UI隐藏按钮不能代替命令校验。

`decide`收到深冻结的parameters/data/input/rolls/world。world含金钱、旗标、队伍、时钟和位置，不提供可写游戏对象或RNG。draws声明每个样本的上界n，宿主提供[0,n)整数。禁止回调异步、直接写状态或递归发命令。

规则返回`{data,cost?,reward?,pendingReward?,battle?,outcome?}`：

- data必须符合局部状态schema。
- cost/reward/pendingReward只含非负money与正整数items；实际物品和容量走唯一库存服务。
- reward立即结算；pendingReward进入领取阶段，容量不足仍可重试或退出。交易身份由宿主生成，插件不能自行伪造领取ID。
- battle含已注册trainerId及可选weather；这是可选能力。没有onBattle的活动不能发起战斗。
- outcome为win/loss/quit，结束并记录结果。新操作、分数、评审、转轮、参赛者等由各活动data和输入schema表达，不扩展核心分支。

设施字段：name、activity、parameters、可选requires和team。无team的活动不选队；team规定min/max、levelCap、物种/装备重复限制、禁止物种、装备/背包可用性和场间恢复。参赛个体UID与活动局部参赛顺序不要混为地图对象ID。

自定义输入与复杂舞台通过已有插件页面/action/表现注册构建，页面读facilities查询并发下列公共命令；通用菜单只提交空输入行动。完整选美的appeal/jam、评审顺序、类别、排名和资源等需要自己的业务规则与界面，本框架没有自动提供这些原作算法。

## JSON模板路径

`registerFacilityContent(api,pack)`编译纯数据包为已有facilityActivities/facilities/trainer注册，支持battle-sequence、score-contest、reel-machine；每个设施生成独立活动，轮带长度决定本活动宿主RNG采样范围，没有动态执行字符串。三个模板在engine/extensions/facility-templates中各自负责一种规则，只返回状态/成本/奖励/战斗计划。原生连战也复用同一battleSequence策略，避免两份结算规则；app.js不认识设施名称。

JSON字段、上限、启用入口、实装边界及错误排查集中在[插件作者说明](../../../src/plugins/facility-content/README.md)。核心测试tests/facility-content.test.js验证编译器和失败路径；examples/facility-content.test.js单独验可选插件装配。只读校验：`node tools/check-facility-content.mjs [文件]`，引用和规则语义走真实注册器，不仅JSON解析。新增不同算法须注册新活动/扩展独立模板；不向通用设施类添加识别本作名字的分支。

## 命令、查询与事件

| 命令 | 输入 |
| --- | --- |
| core.facility.enter | `{id,team:[uid,...]}` |
| core.facility.action | `{action,input?:JSON字符串}` |
| core.facility.claim / core.facility.quit | `{}` |

插件调用需要facilities权限，走`api.commands.dispatch`。网络使用同一命令入口。core.query的facilities是冻结投影；宿主也有facilityView。`core:facility-event`是提交后的entered/progress/finished事实，携带会话身份、设施、阶段和局部状态，可用于独立动画/音效。

## 临时规则与保存

连战使用选队的副本和独立库存。原个体UID保留以便观察，但HP、PP、经验、等级、装备消费不会写回原队伍；经验增长禁用，普通训练家奖励/拾取/战败剧情不运行。完成奖励才进入世界库存与金钱。其他插件的世界状态按其各自生命周期继续管理，这不是复制整个世界的模拟器。

活动期间禁止保存、导出、载入、重开、队伍管理和普通野外行动；退出/结算后恢复。直接关闭网页只能回到此前存档，不能从活动中途续玩。持久状态是`facilities:{nextId,results}`，完成记录含id/facility/outcome/data；引用插件加入保存依赖，缺插件保护原文。活动会话不序列化，当前保存版本由README公布，无历史迁移。

## 验证与作者示例

`tests/facilities.test.js`覆盖公共连战、非战斗表演/转轮、冻结输入、RNG与成本失败回滚、容量重试、陈旧计划/结果、败北/退出、权限、保存/插件重载及表现失败。`tests/ui-composition.test.js`有页面到命令的冻结数据检查。最新专项证据见docs/validation/2026-10-03-facilities；真实浏览器观察尚未执行。

新增活动先复制最接近的示例结构，再换独立schema和规则。禁止把华丽大赛评审、狩猎行动或老虎机算法塞入战斗类；确实缺少公共操作时记录具体合同缺口，受控演进。

## 结算异常的恢复

战斗结果提交失败后，应用层恢复结算前状态与RNG，调用`FacilitySession.cancelBattle(ticket)`解除匹配场次等待，回到ready。玩家可退出或重新行动；入场时已付成本保留，失败结果不记完成、不发奖励。取消会失效旧转换计划和票据，不能用旧结果推进新的场次。notify在commit完成后运行；通知/退出表现故障不能回滚已完成的经济和设施转换。此轮复审改动已加入专项测试但未执行，当前范围见[验证记录](../../project/VALIDATION.md)。
