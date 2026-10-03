# 网格高度、桥面与对象层合同

状态：C2 高度合同首轮已实现并针对性验证；桥面/木桥升沉与薄冰/裂地板合同已补；完整地图素材与逐原作画面对照仍待完成。

## 可复用策略与所有权

engine/elevation.js 的 ElevationPolicy 是可选网格平面策略。World、NPCSystem、ActorRepository 和 findRoute 都可注入；不注入时保留普通二维格子模式，不往位置写高度。绿宝石在应用装配中选用 rules/gen3/elevation.js 的策略，地图仍使用现有 block 高四位，不增加地图名称判断。

位置可保存 elevation（当前通行平面）及 previousElevation（保留的表现高度）。普通实体高度是 0..14，地图 15 是多层哨兵，不能当作实体的实际平面。普通入图按目的地初始化；连续跨相邻地图保留并推进当前平面。持续 Actor 保存高度；地图内临时动画不另持一份领域高度。

Gen3 政策：0 允许连接其他高度；15 允许从不同平面进入且保留进入者的高度。具体平面只有相同高度能直接通行。落步按 ObjectEventUpdateElevation 政策更新：来源或目的格为 15 时保持；目的为 0 时 current=0，previous 保留；其他具体格同时更新两个值。它是本项目逐格执行语义，不是逐 GBA 帧/内存的仿真证明。

## 一致的消费方

- World 统一入格高度、对象/预约碰撞、面对对象互动。不同具体平面的对象可共享桥上格子；任一方为过渡平面时仍相互碰撞。
- NPC 自主移动、剧情 FieldDirector、持续 Actor 的移动与 BFS 使用同一策略。预约保留源/目标各自高度，包括跨图源格；避免只检查目标坐标的平面。
- BFS 的访问身份包含当前通行平面。目标可声明 elevation；未声明只要求位置可达。NPCIntent.goal 同样接受可选 elevation，adjacent 目标保留这一要求。行为上下文 position 提供高度，Actor 感知/邻接互动和训练家视线不会把桥下对象当作同平面对象。
- 世界批量覆盖及入口恢复保护具体平面：不能改变地形高度使玩家/持续 Actor 无法站立，也不能用同平面的对象覆盖他们。不同平面不因仅坐标相同而被拒绝。对象 changes 可带 elevation/previousElevation，并经过原范围与 pack 策略校验。
- 保存校验检查玩家和持续 Actor 高度。核心查询的 position 和 Actor 视图带这些可选字段；现有 UI 无需直接写状态。

公开 core.actor.spawn/update 的 position 可传 elevation/previousElevation（0..14）。例如在高度 15 的桥格上生成 elevation:2 的角色，当前玩家 elevation:3 可以从桥上经过；原物种或动画帧不决定平面。

通行策略依赖单向，不读取 DOM、Canvas、随机数或动画时钟。Gen3 策略是领域政策；packs/emerald/field-layers.js 的原作绘制优先级是单独表现政策。Renderer 注入 fieldPriority，低优先级对象在地图覆盖层之前画，高优先级在之后画；GridMotion/NPC 视图只提供已提交的高度。这保留逐 8x8/16x16 网格绘制，没有整张场景图片。

## 来源及当前限制

只读 work/pokeemerald，修订 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881：global.fieldmap.h、event_object_movement.c 的 IsElevationMismatchAt/AreElevationsCompatible/ObjectEventUpdateElevation/sElevationToPriority，以及 bike.c 的木桥骑车限制。对象定义高度从原地图 NPC 资料进入 pack 投影；自定义地图元素也可声明。

Fortree 的骑车限制读取玩家保留高度，不能检查原始桥格 15 的奇偶数。桥面下降/回弹和木桥两格升沉政策已补（BRIDGES.md）；全部遮挡资源与完整桥面地图仍未导入；本轮绘制顺序检查不代替浏览器逐像素对照。野外行动和飞行落点继续用其已确认的业务资格，新的高度不是绕过道具/HM/地图条件的手段。

## 验证与失效

tests/field-elevation.test.js 的 8 个场景均有通过证据：可选策略、过渡/多层状态、分层对象与两端预约、同格不同平面的 BFS、相邻连续移动/序列化、NPC 与玩家分层、训练家视线/木桥骑车、渲染覆盖顺序、实际插件 Actor 命令/保存/覆盖保护/目标平面。最后一个组合场景包含多条断言，场景总数为 8。

证据与失败修正见 docs/project/CHANGELOG.md。高度状态/策略、World/NPC 碰撞、搜索身份、入口/保存、目标 schema 和 renderer 覆盖顺序变化时，对应检查失效；仅新增合规图块/对象内容验证该内容即可，不每轮全工程回归。最终浏览器与系统回归保留在 E。
