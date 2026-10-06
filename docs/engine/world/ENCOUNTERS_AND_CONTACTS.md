# 插件遇敌、格子查询与接触合同

此页是实际 API 1 的增量合同，当前保存格式以 [pack.js](../../../src/packs/emerald/pack.js) 为准。能力验证见 [encounter-extensions.test.js](../../../tests/encounter-extensions.test.js)，最小完整装配见 [encounter-extension.test.js](../../../examples/encounter-extension.test.js)。这不是已启用的明雷玩法；当前启动数组没有比例生成、野生精灵游走或接触自动战斗插件。

## 插件如何组合“每十格一只、接触才遇敌”

这是一条公开接口组合路径，比例与刷新逻辑由插件拥有，核心不增加明雷专用分支：

1. setup 注册 `encounterPolicies`，对目标地图的 `step` 返回 null；注册持久 `actorTemplates`，并监听 `core:field-contact`。setup 只注册，不生成实体。
2. 在游戏就绪后的合法命令时机，查询 bounds/cells，筛选草格，排除碰撞、warp、占位和不适用的高度。大地图分块查询。
3. 插件计算数量，通过 `core.random.sample` 无放回选位置。例如 `floor(合法草格数 / 10)`；若按全部草格计算密度，也由插件选择分母并处理可用位置不足，不把“10”写入引擎。
4. 逐个 `core.actor.spawn`，然后 `core.encounter.prepare({actor,area:'land'})`。prepare 从当前地区有效表生成一次个体；以返回的 ticket.species 设置 `emerald-species` 外观，使用 `core.appearance.set`。不可先 sample 再 prepare 并期待两次物种一致。
5. 接触监听只处理玩家与本插件凭证 Actor 的事实，再调用 `core.encounter.request({ticket,contact:sequence})`。未接触时不请求；该路由不调用剧情。当前接触是撞到占位实体或相邻主动互动，不是进入重叠格。
6. 插件用自己的 store 记录刷新批次，查询当前 Actor/凭证后再补充，避免重载重复生成。逐步装配不是一笔跨命令事务：prepare 失败时清理本次新建 Actor；后续显示失败可释放未占用凭证再移除 Actor，不能清理已进入战斗的凭证。

所需权限通常为 `actors`、`encounters`、`random`、`appearance`；若插件还主动移动玩家才声明 `movement`。比例选格→地区个体→物种外观→保存的真实组合见 [view-extensions.test.js](../../../tests/view-extensions.test.js)，搜索 `Public density composition`；接触监听→真实战斗见上述遇敌测试，搜索 `Plugin contact listeners`。

## 所有权与术语

- **渠道政策**：在随机抽取之前选择是否调用某种遇敌。`step`是已接线的默认暗雷渠道；其他名称可查询，但不会自动获得世界时机。
- **候选**：种类/等级描述，没有宝可梦UID，也不持有可捕获个体。
- **Actor UID**：世界实体身份，拥有位置、碰撞和行为；不是宝可梦UID。
- **凭证 ID**：遇敌服务拥有的一个野生个体与一个Actor的关联。`core:encounter.N`只可请求一次战斗，不能用Actor或个体UID冒充。
- **接触序号**：会话内已发布的接触事实，不是永久物品、存档令牌或可远程指定的目标位置。读档清空事实且在同一会话保持序号不复用。

通用引擎 `WorldQuery / FieldContacts / EncounterPolicyRegistry / EncounterTickets / EncounterService`互不引用剧情、UI或内容包。应用装配把字段事件、凭证、Actor、战斗与保存连接起来；插件仅使用公共命令/事件。`TriggersApplication`保留剧情、训练家视线的优先级，普通随机遭遇及冷却由独立EncounterApplication拥有。

## 1. 关闭或替换暗雷

`api.content.register("encounterPolicies", localID, definition)`，注册返回命名空间ID。

| 字段 | 合同 |
| --- | --- |
| channel | 字符串；原生暗雷为`step` |
| priority | 可选整数，-10000..10000，默认0；最高的适用政策独占决策，同优先级冲突抛错 |
| when(context) | 可选同步布尔函数；只读，返回其他类型拒绝 |
| decide(context) | 必须同步；返回null关闭此渠道，或`{area,checkRate?,checkSelection?,checkPermission?}` |

area为`land/water/fishing/rock`。三个检查默认true：概率、队伍特性的选种修饰、生成权限修饰。高优先级null不会继续执行低优先级政策，也不会消费随机数。注册并不关闭钓鱼、碎岩、训练家或剧情战斗。上下文包含position、steps、lastEncounterSteps、mode、cell、party、flags、dialog、weather；全部深只读，回调中发命令拒绝。

原生`emerald-step`是规则包定义，保留当前序章的获救旗标、队伍、间隔和草地/冲浪选择；它不是完整Gen3遇敌公式验收。注册内容的priority和地图范围由作者选择；不要通过修改rescued旗标伪装遇敌开关。

## 2. 查询与随机选格

查询命令无写权限要求，支持游戏忙碌期间读取；仍是冻结快照，不能作为稍后生成角色的通行保证。

| 命令 | 输入 | 返回 |
| --- | --- | --- |
| core.world.bounds | `{map?}`，省略为当前地图 | `{id,width,height,indoor,darkness}` |
| core.world.cells | `{map?,x,y,width,height}` | 同一区域与cells；每格含x/y/block/behavior/collision/elevation/warp/occupants |
| core.encounter.table | `{map?,area,rod?}` | 有效注册表或地图原嵌入陆地/水域表；没有表返回null |
| core.encounter.policy | `{channel}` | `{policy,channel,decision}`或null；不抽样 |
| core.random.sample | `{values:JSON.stringify(array),count}`；权限`random` | 按宿主种子无放回抽取输入**位置**，冻结数组；重复输入值不保证值去重 |

cells为行优先序，正尺寸、不得越界、最多4096格。occupants记录id/elevation/reserved，包含真实实体及移动两端预约；隐藏对象不占位。原始地形高度15是多层协议，不能直接等同普通Actor高度或通行资格。格子可通过动态覆盖改变；最终`core.actor.spawn/update`仍重新校验。

选格先通过只读查询筛选，再声明count。例如草格使用公共SDK `src/engine/extensions/terrain-utils.js`的`isGrass(cell.behavior)`，还要排除碰撞、warp和occupants。`Math.floor(validCells.length / 10)`属于插件业务比例，不写进引擎。values最多4096项、64KiB，count为0..256且不大于数组长度。零抽取不消耗随机数，坏输入在抽取前拒绝；成功后持久化宿主随机源。生产插件不自行调用Math.random，也不导入Random取得第二份核心随机状态。

table按照注册优先级、条件和rod选取；默认land/water回退到地图数据。rod只接受fishing下的old/good/super。结果的source是registered/map，地图嵌入表id为null。天气/队伍特性与个体生成仍由EncounterService处理。

## 3. 候选和准备个体

写命令需要manifest的`encounters`权限，并要求稳定野外状态。不要在规则、渲染或插件事务回调中dispatch。

| 命令 | 输入 | 结果 |
| --- | --- | --- |
| core.encounter.sample | `{map?,area,rod?}` | `{ok:true,sample:{species,level,map,area,table}}`或`{ok:false,reason}`；只抽样，不签发个体 |
| core.encounter.prepare | `{actor,area,rod?}` | `{ok:true,ticket}`或资格失败；actor必须是当前地图可见的持久Actor |
| core.encounter.release | `{ticket}` | 释放尚未占用的凭证，返回boolean；保留Actor，作者可另用actor.remove清理 |
| core.encounter.request | `{ticket,contact}` | 异步开启真实野生战斗；成功`{ok:true}`，资格失败`{ok:false,reason}` |

prepare在Actor当前地区有效表中选种、等级并生成一次个体；忽略暗雷概率和威吓等暗雷拦截，仍采用队伍的选种/等级/性格/性别/持物生成修饰。不得先sample再重新prepare并假定两次种类相同。界面应以ticket.species/level选择视觉；可见物种外观绑定见 [外观合同](../presentation/APPEARANCE_AND_VIEW.md)，不要复制monster到Actor.data。

ticket查询只提供id/actor/map/area/table/species/level/claimed，不公开可写monster。`api.query().encounters`列出凭证，`api.query().actors`查角色。遇敌仓储持有唯一野生个体，当前保存合同保存该仓储与Actor关联，校验未知内容、重复个体UID、缺失Actor和多个凭证关联同一Actor。相关内容依赖随档记录。Actor可以跨图，但凭证的来源map保持准备时地区；request要求角色、玩家和来源map一致。

## 4. 接触与战斗生命周期

监听`api.events.on("core:field-contact", listener)`；监听器在setup注册。payload包含sequence、kind、direction、interaction，以及subject/target的id/map/x/y/elevation。

已接线两类：玩家尝试撞到可到达的实体(`bump`)，Actor提交稳定相邻主动交互(`request`)。同一对实体不分方向去重；持续按键或持续主动互动不重复发布。分离、位移、换图、高度变化会失效；双方尚在移动、墙/warp阻挡、不同高度和预约中的源格不产生实际接触。通用blocked野外行动优先，已接管位移等行动不会同时发布撞击接触。事件在输入命令完成或帧末发布，避免NPC提交半途开启战斗。

凭证请求检查**当前已发布且仍有效**的player↔对应Actor事实，不接受自行编造序号或另一角色的接触。需要至少一只可战斗伙伴及队伍/盒子剩余收纳空间。本期单体野生战斗最多两个战斗席位，与原生野生Battle约束一致。

开始前占用凭证；重复请求受命令串行及占用保护。开始前失败释放占用且保留个体；若演出失败但战斗已成立，不解除正在进行的所有权。捕获把同一个个体转入队伍/盒子；win/escaped/loss都释放凭证并移除关联Actor。loss在当前地图恢复队伍，是此插件渠道的明确默认政策，不假装已还原原作金钱惩罚/宝可梦中心返程。原生暗雷和剧情战斗继续原有结果路径。

该渠道的准备、请求和结算不调用StoryRunner，不写剧情旗标/事件/奖励账本。胜利经验与捕捉在Battle内结算，金币/战后特性通过共同领域服务执行；插件可据已提交结果再安排自己的业务。

| 事实事件 | 主要payload |
| --- | --- |
| core:encounter-attempt | channel/policy/area/steps/encounter，仅实际执行step抽取后 |
| core:encounter-fault | channel/reason |
| core:encounter-sampled | 候选描述 |
| core:encounter-prepared | ticket视图 |
| core:encounter-started | id/actor/contact |
| core:encounter-released | id/actor/reason；主动释放或Actor移除 |
| core:encounter-resolved | id/actor/species/result；战斗退出提交后 |

用户自定义比例生成、离图补充、角色游走、视觉、探索记忆是上层插件业务。本期没有重叠触发、任意接触规则注册、逃跑后保留同一个Actor的自定义结算政策、多体野生遭遇或热卸载；不能把这些写成已支持。

## 排查与验证

- `Ambiguous encounter channel policy`：同一渠道有同优先级且均适用的最高政策，收窄when或明确不同优先级。
- `Invalid world query region`：越界、非正尺寸或超过4096格；先读bounds，分区域查询。
- `Core command permission denied`：未声明encounters/random/actors/movement中的相应权限；查询不需要追加写权限。
- `Unknown encounter ticket`：已释放/消耗或错误ID；刷新query，不把ActorUID当凭证。
- `{ok:false,reason}`：资格失败是正常结果，不抛异常；确认可见Actor、地图、实时接触、队伍和收纳空间。

文件改名时搜索`core.encounter.prepare`、`EncounterTickets`、`core:field-contact`。运行对应专项与[测试指南](../../development/TESTING.md)，变更保存/公共路由在检查点运行全量；浏览器视觉和完整明雷玩法仍另验。
