# 持续 Actor、感知和行为意图

## 分工

actor-repository.js 保存全局身份、模板、地图格子位置、朝向、姿态、可见性和 schema 约束的行为数据。身份是 core:actor.N，序号不重用；位置是已提交的目的格，不保存半帧像素插值。actor-navigation.js 提供只读感知和复用 World 的 BFS。ActorApplication 协调资格、命令、NPC 投影和事实，runtime 端口只暴露 context/resolve/intent/step/commit，不注入整服务。

既有 NPCSystem 继续管理临时帧/脚步/预约与静态 NPC。持久角色投影进相同对象列表，跨相邻地图时迁移动画缓存；source/target 两侧预约到动作结束，绘制只用当前地图对象，碰撞用 occupants。脚本控制/朝向/场景结束也提交角色位置。没有另写一套跟随物理。

NPCPoseRegistry 是纯数据视觉取样，名字不限制为旧七种。姿态可以配置原地动画、弹跳高度、周期和现有/注册 actor 精灵资源；不改变碰撞或规则速度。reducedMotion 取消原地步伐和弹跳，保留位置与正常移动插值。逻辑状态与姿态保存，瞬时进度不保存。

## 内容和命令

- content.register("actorTemplates", id, {name,actor,behavior,config?,schema?,initialState?,perceptionRadius?})。actor 是精灵资源，behavior 引用 npcBehaviors；模板和初始状态启动校验。
- content.register("npcPoses", id, {inPlace?,height?,periodMs?,stepPeriodMs?,actor?})。资源/范围校验，未知姿态意图拒绝。
- npcBehaviors 的同步 decide(context) 继续返回 move/dir/pose/duration。持久角色还有 context.identity、state、perception，以及已有 time/environment；均为冻结 JSON。
- 可选 state 是下一次完整行为记忆，通过模板 schema 校验后提交；可用明确 phase 和关系/情绪字段实现业务状态机，不直接写队伍或背包。
- 可选 goal={map,x,y,adjacent?} 请求导航。使用实际地图/碰撞/占位 BFS；无路时停步，不穿墙。adjacent 到达邻格，适合接近玩家/角色。
- 可选 interaction={target,kind}。落步后同图相邻才发 core:actor-interaction-requested。它表示互动请求；对话、情绪和关系结果由插件行为/命令决定，不自动给任何领域奖励。
- core.actor.spawn {template,position:{map,x,y,dir}}。
- core.actor.update {uid,position?,data?,hidden?,pose?}，data 是 JSON 字符串。
- core.actor.remove {uid}。
- 上述命令使用 actors 权限，共用 UI/插件/网络的 CommandBus。查询 core.query.actors 是只读保存视图。
- core:actor-spawned/updated/removed/moved 和 actor-interaction-requested 为提交后事实。

spawn/位置变更验证真实碰撞、玩家及预约；外部位置/可见性更新增加版本并使相关 NPC 帧失效；行为记忆/姿态更新和内部正常落步不重置插值。世界 patch 禁止以 actor UID 创建第二份对象覆盖，禁止把图块/对象压在持久角色或跨图预约上。存档拒绝越界、无模板/姿态、坏状态、错误身份/序号和第二所有者；保存依赖包含模板、地图与姿态所属插件。

## 已实现与剩余

已实现：动态角色生成/删除、跨相邻地图持续身份和移动、位置/朝向/姿态/行为状态持久化、近距感知/视线遮挡、目标导航、时间与环境查询、主动邻接互动事实、可注册姿态。新增 Actor 能离开静态 NPC 的原点随机范围。可在状态 schema 中定义业务关系/情绪，需由业务自己定义效果。

静态 NPC 继续沿用原 map:id 的临时状态；没有自动把全作每一个静态对象变成持续 Actor。通用视线是项目感知政策，与原训练家直线视线分开。当前自主决定只更新可见地图，离线/不可见区域只更新世界时间，不模拟全部行走；完整日程地点交接/日常生活模板需补。导航目前步行、不自动使用门 warp/HM/交通模式；长期跟随路径历史、门/飞行/潜水交接及伙伴精灵身份绑定属于 C5 下一步。大型行为树/状态机作者工具、视域策略注册和人物业务内容尚未收口。

## 验证

actors.test.js 12 项有针对性通过证据：身份/保存/版本、坏记录原子性、只读感知/遮挡、邻格寻路、公开跨图/插值/两侧预约、行为记忆/接近玩家、错误隔离与移除、世界编辑保护、邻接互动、注册精灵姿态保存和 reducedMotion，以及行走中更新记忆/姿态不重启动画。首轮 7 项一次通过；新增与后续受影响项按变更各自验证。

相关 NPC/cutscene/world-state/application-services/architecture/plugins 52 项一次通过。姿态替换使相关 NPC 帧证据失效后，NPC/cutscene 19 项通过；世界修改/身份加载进一步变化，针对性 8 项通过。公开类型检查通过。没有整工程回归或浏览器伙伴玩法验收；代码行为检查不证明原作人物素材完整。

失效条件：身份 schema/生命周期、NPC 投影与占位、寻路/感知政策、意图/姿态注册、脚本控制提交、世界 patch 保护或存档引用变化。用户 2026-10-03 最新指示将 C5 伙伴跟随延后为插件；当前继续完整作息/日程等通用能力和路线其他未完成项。

## 范围调整

2026-10-03：伙伴跟随仅是插件扩展示例，用户要求暂不实现。现有持续 Actor、感知、导航和姿态保留；不为未开始的跟随插件提前增加专用队列、精灵绑定或交通规则。上文 C5 相关内容是后续插件可能的依赖，不属于当前必须交付的玩法。
