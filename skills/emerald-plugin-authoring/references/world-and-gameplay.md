# 世界入口、剧情与组合玩法

按本次任务读对应合同。原作内容完整转写使用原作剧情 Skill；Actor 自主日程用 Actor Skill，设施业务用设施 Skill。这份参考只说明插件如何接入已有领域，不把原作业务都搬到插件宿主。

## 野外行动与移动

入口和阶段按 [FIELD_ACTIONS](../../../docs/engine/field/FIELD_ACTIONS.md)：资格、目标、计划、演出、提交由宿主管理；先看 [field-action](../../../examples/field-action.test.js)。

- 手动确认用 `triggers:["interact"]`；移动受阻可用 `blocked`。自动入口的 schema 必须接受空输入，需要参数的业务走显式入口。**interact 不设 menu:false**：确认页按选中 ID 在 `fieldActionOptions()` 中反查，隐藏后会静默失效。资格/目标未匹配时保留原生交互。
- target 只描述目标，plan 只返回合法领域操作，不在回调中改世界或 dispatch。演出后再次检查目标、资格和占位；选择不代表已提交。实时小游戏可用 `{kind:"interaction",id,parameters?,source?}` 计划，细节见 [会话参考](battle-and-interactions.md)。
- 自定义移动用 movement + fieldActions；越障/非地面交互在 navigation 声明，不向 World 添加插件 ID/徽章分支。`requiresLanding` 退出走统一提交，不能先改 walk 再检验落地。
- 原生宝可梦菜单入口用 `partyMove` 注册招式关联，`core.movement.party-options {uid}` / `party-action {uid,move,destination?}`；执行时复核该个体学会招式、蛋、徽章、目标与 UID，不能借队伍另一只替代。多个同招式行动按实际预检/priority 选择。

较复杂锚点：[high-flight 实现](../../../src/plugins/high-flight/index.js)、[作者说明](../../../src/plugins/high-flight/README.md)、[专项](../../../examples/high-flight.test.js)。它证明现有组合方式，不代表所有 HM 都支持。测试非法落地保持原模式、原移动恢复、跨图、持久模式存读档；准备队伍/徽章只算夹具，不算演过原作。

骑乘素材先追只读 C 模板的尺寸/调色板/偏移，通过 [export-flight-art.py](../../../tools/plugins/export-flight-art.py) 的实际参数和 --check 导出透明资源及来源 hash；不拿战斗精灵图替代野外素材，不靠未跟踪 work 文件维持运行。

## 剧情与对话

用 `api.story.registerBundle` 注册脚本、对白、入口，保存返回引用；看 [story-bundle](../../../examples/story-bundle.test.js)、[STORY_LANGUAGE](../../../docs/engine/story/STORY_LANGUAGE.md)、[剧情架构](../../../docs/architecture/STORY_CONTENT.md)。

- selector 按稳定 objectId/原 label 绑定，priority 明确竞争；公共 call 使用 schema 参数，dialogue bindings 只读声明标量。旗标、变量、奖励用自有命名空间；选择后果归领域提交，不放文本效果/render 回调。
- 奖励容量结果由 reward.onResult 处理，不能先标记领取。需要战后继续时用 durable、每条命令稳定 node、checkpoint 和 battle.onResult；短 battle 只发起，不意味着已经等待胜负。
- 复用用 call，不创建第二套事件循环或嵌套会话。读档/切图恢复按稳定节点与依赖检查；未知节点不静默跳过。

## 修改已有世界

读 [STATE_AND_LIFECYCLE](../../../docs/engine/world/STATE_AND_LIFECYCLE.md)，锚点 [world-editing](../../../examples/world-editing.test.js)。先 `core.world.objects` 查询 ID、availability 与 capabilities，再 `core.world.patch` 提交可变字段；写入要求 world 权限，不能自己拼坐标 ID 或直接改地图/剧情目录。

原作来源槽位是身份，导入不重排；已命名对象保留 ID。not-instantiated 是未转写资料，不能当已存在 NPC。持续实体用 Actor 合同。

普通 talk/sign 可绑定已注册、可独立解析的对白；查询核对 dialoguePreview 与解析错误。商店/治疗/主线用对应领域入口。feedback 失败但 ok:true 时不能重试已提交 patch；跨图集铺设、撤销、所有权冲突、跨批事务支持范围按合同核实。

## 遇敌与动态 Actor

读 [ENCOUNTERS_AND_CONTACTS](../../../docs/engine/world/ENCOUNTERS_AND_CONTACTS.md)，看 [encounter-extension](../../../examples/encounter-extension.test.js)。

使用 encounterPolicies 控制指定渠道的 step 暗雷，查询有效地区表/格子，经宿主随机政策选格，生成 Actor 并 prepare 个体凭证，再消费真实稳定接触去 request 战斗。**Actor UID、精灵 UID、ticket ID 是不同身份**；不要复制个体、伪造 contact、用剧情旁路开战或在绘制中发命令。游走/密度/外观是插件业务，占位与接触路由仍归宿主。

关闭暗雷不能靠把倍率调得极小冒充；视觉雾不能冒充探索记忆。先核对当前公开能力与 [PLUGIN_ROADMAP](../../../docs/project/PLUGIN_ROADMAP.md)，缺失政策单列框架任务。

## 设施、观察与玩家联线

- 设施先看 [facility 示例](../../../examples/facility.test.js) 与 [设施内容插件](../../../src/plugins/facility-content/README.md)，通过设施会话/队伍政策/结果结算组合；需要实时会话时核实设施适配器，不能直接改临时队伍或奖励账本。
- 高频观察用 `api.queries.register`；只读 view 可 query/store.get/states.list，回调同步。不要用 action 事务做每帧查询或开放 concurrent 绕过写锁。
- AI 控制沿现有协议，读 [AI_CONTROL](../../../docs/development/AI_CONTROL.md) 与 [ai-control 插件](../../../src/plugins/ai-control/README.md)。移动以 moved 而非 accepted/network ok 为准；分页保留 nextCursor，事件 gap 时刷新快照，长轮询属于传输，不在同步事务里嵌套路线。
- 真正跨玩家交换/对战读 [PLAYER_LINK](../../../docs/architecture/PLAYER_LINK.md) 并核对 STATUS。单机 NetworkGateway、连接内去重、本地 trade 伙伴池不代表远端所有权/跨重连成交；设计 API 未落地前不能用远端 JSON 改队伍或整档覆盖冒充。此类验收需要两份独立存档和断线/重启后的领域结果。

涉及插件停用时按 [SAVES](../../../docs/engine/SAVES.md) 验证同一存储启停链路；不能清掉依赖或删未知精灵/道具来通过校验。自有 extensions 保留，暂停区恢复不能覆盖停用期间的新进度；临时租约和运行会话不等于持久数据。
