# 持续 Actor、感知和行为意图

## 分工

actor-repository.js 保存全局身份、模板、地图格子位置、朝向、姿态、可见性和 schema 约束的行为数据。身份是 core:actor.N，序号不重用；位置是已提交的目的格，不保存半帧像素插值。actor-navigation.js 提供只读感知和复用 World 的 BFS，actor-schedules.js 只选择日程，不移动角色。ActorApplication 协调资格、命令、NPC 投影和事实，runtime 端口只暴露 context/resolve/intent/step/commit/reconcile，不注入整服务。

既有 NPCSystem 继续管理临时帧/脚步/预约与静态 NPC。持久角色投影进相同对象列表，跨相邻地图时迁移动画缓存；source/target 两侧预约到动作结束，绘制只用当前地图对象，碰撞用 occupants。脚本控制/朝向/场景结束也提交角色位置。没有另写一套跟随物理。

NPCPoseRegistry 是纯数据视觉取样，名字不限制为旧七种。姿态可以配置原地动画、弹跳高度、周期和现有/注册 actor 精灵资源；不改变碰撞或规则速度。reducedMotion 取消原地步伐和弹跳，保留位置与正常移动插值。逻辑状态与姿态保存，瞬时进度不保存。

## 内容和命令

- content.register("actorTemplates", id, {name,actor,behavior,config?,schema?,initialState?,perceptionRadius?,schedule?})。actor 是精灵资源，behavior 引用 npcBehaviors；schedule 引用 actorSchedules。模板和初始状态启动校验。
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

静态 NPC 继续沿用原 map:id 的临时状态；没有自动把全作每一个静态对象变成持续 Actor。通用视线是项目感知政策，与原训练家直线视线分开。自主决定只更新可见地图，离屏日程按下节显式政策处理，不模拟全部行走。导航目前步行、不自动使用门 warp/HM/交通模式；长期跟随路径历史、门/飞行/潜水交接及伙伴精灵身份绑定属于后续插件。大型行为树/状态机作者工具、视域策略注册和人物业务内容尚未收口。

## 日程注册、时钟与地点交接

日程是一份内容政策，不是第二份时钟或行为状态。通过 `api.content.register("actorSchedules", localId, definition)` 注册，模板的 `schedule` 引用返回 ID。公开类型见 [ActorScheduleDefinition](../../../dist/engine/contracts.d.ts)，搜索 `class ActorScheduleRegistry` 可找到校验实现。

| 字段 | 合同 |
| --- | --- |
| `entries` | 1–64 个条目，每项 `id/start/position` 必填；id 不重复，start 是每日分钟 0–1439 |
| `days` | 可选 0–6 的唯一数组，表示保存的游戏日 `day % 7`；省略为每天，不是设备星期 |
| `position` | `{map,x,y,dir,elevation?}`；目标是合法步行格，不能是静态墙、水或 warp；运行时覆盖和占位另行复检 |
| `radius` | 可选 0–8 的曼哈顿距离，省略为精确格；指定高度时也须在对应平面 |
| `behavior/config/pose` | 到达后采用的注册行为、JSON 配置与姿态；省略行为继承模板。前往目标仍走统一导航 |
| `offscreen` | 缺省 `hold`：不可见时保持位置；显式 `relocate` 才允许补齐到当前条目地点 |

每个游戏日必须有 start=0 的条目，同一天不能重叠 start；注册时拒绝缺口/歧义/未知行为或姿态。读取保存的游戏本地 RTC，不用设备时区；时钟未设置时继续模板行为，不启用日程。周期跨日、离线及回退由 WorldClock 保证，不给 Actor 增加独立时间字段。

可见角色先按目标 BFS 走路，到达范围才切换条目行为；当前脚步不会因为日程变化或记忆更新重启。无路等待。`relocate` 只在源地图与目的地图都不在本帧可见集合时交接；地图级可见集合是保守策略，视野边缘也不弹出角色。对话/战斗/设施、隐藏会话、剧情控制、尚未结束的移动预约或目标占位时等待，不抢控制权。不重播错过的条目，不自动给任何奖励或补做互动。

保存恢复/字段重绑在新场景投影显示前执行同样的补齐，仍检查玩家、NPC、Actor、动态地形和目标 warp；已有 UID 与行为记忆保留。只保存 Actor 原有状态，日程从时钟与内容派生，存档依赖账本包含日程及所有目标/行为/姿态插件。内容引用缺失时拒绝加载，不能静默移除日程。

`core.query.actorRoutines[uid]` / `game.actors.routines()` 返回冻结的当前条目与 `arrived`。离屏补齐后发 `core:actor-relocated`，payload 为 `{before,after,routine:{schedule,id,day}}`；正常步行仍发 actor-moved。两者都是提交后事实，监听者通过自己的公开命令处理业务。

完整代表例：[actor-day-cycle.js](../../../dist/plugins/actor-day-cycle.js)。浏览器用 `?actor-day-cycle=1` 启用定义和菜单查看页；通过公开 `core.actor.spawn` 命令生成 `actor-day-cycle:worker`，没有 setup 时偷偷写世界状态。此例 08:00 工作、18:00 返回，允许离屏地点交接；实验室门不属于自主 BFS，因此双方地图可见时会等待，不能把门前卡住解释为已实现门导航。

这套日程是项目新增可复用政策，不声称原作每位 NPC 具有此作息。专项 [actor-schedules.test.js](../../../tests/actor-schedules.test.js) 覆盖注册、七日选择、跨图步行、暂停/占位、插值/剧情控制、保存、时钟回退与外国插件依赖。当前未验证真实浏览器作息流程，完整 NPC 日常内容仍由后续作者填写。

## 验证

actors.test.js 12 项有针对性通过证据：身份/保存/版本、坏记录原子性、只读感知/遮挡、邻格寻路、公开跨图/插值/两侧预约、行为记忆/接近玩家、错误隔离与移除、世界编辑保护、邻接互动、注册精灵姿态保存和 reducedMotion，以及行走中更新记忆/姿态不重启动画。首轮 7 项一次通过；新增与后续受影响项按变更各自验证。

相关 NPC/cutscene/world-state/application-services/architecture/plugins 52 项一次通过。姿态替换使相关 NPC 帧证据失效后，NPC/cutscene 19 项通过；世界修改/身份加载进一步变化，针对性 8 项通过。公开类型检查通过。没有整工程回归或浏览器伙伴玩法验收；代码行为检查不证明原作人物素材完整。

失效条件：身份 schema/生命周期、NPC 投影与占位、寻路/感知政策、意图/姿态注册、脚本控制提交、世界 patch 保护或存档引用变化。用户 2026-10-03 最新指示将 C5 伙伴跟随延后为插件；当前继续完整作息/日程等通用能力和路线其他未完成项。

## 范围调整

2026-10-03：伙伴跟随仅是插件扩展示例，用户要求暂不实现。现有持续 Actor、感知、导航和姿态保留；不为未开始的跟随插件提前增加专用队列、精灵绑定或交通规则。上文 C5 相关内容是后续插件可能的依赖，不属于当前必须交付的玩法。

高度合同见 FIELD_ELEVATION.md：持续身份保存 current/previous 高度，行为位置/感知、目标 BFS、脚本及自主移动复用网格策略；目标可选 elevation。两端预约保留各自平面，原作多层桥面不再等同单一二维占用。完整桥面内容与形变并未因此完成，跟随插件仍延后。
