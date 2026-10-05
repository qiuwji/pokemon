# 剧情演出编排

本模块让剧情按动作的实际完成顺序推进。内容包声明动作；引擎负责等待、格子规则和控制权；Canvas 负责画面。增加一段相同机制的新剧情，只需增加内容指令，不改角色绘制或战斗计算。

## 文件与职责

| 文件 | 职责 |
| --- | --- |
| `dist/packs/emerald/story/common/scenes.js` | 本作的演出内容：角色 ID、格子位置、对白、指令顺序 |
| `dist/engine/commands.js` | 整树预校验、顺序执行、并行汇合、资源冲突检测 |
| `dist/engine/field-director.js` | 临时控制角色、自动走路、靠近、跟随、朝向、表情和镜头端口 |
| `dist/engine/pathfinding.js` | 有上限的寻路，复用 World 的碰撞、台阶与道路连接规则 |
| `dist/engine/camera.js` | 跟随 / 聚焦 / 平滑回归，使用世界坐标，不修改人物位置 |
| `dist/engine/npcs.js` | NPC 演出作用域、源格/目标格占用、演出中停用自主行动 |
| `dist/presentation/field-canvas.js` | 10种语义气泡的像素绘制 |
| `dist/packs/emerald/application/story-application.js` | 指令处理器、预检/资源声明、剧情控制释放与战斗交接 |

引擎不读取博士、未白镇、绿宝石进度或网页元素。角色用稳定 ID 引用，例如 `birch`，移动后 ID 不变。同一角色在不同地图由地图与 ID 共同定位。

## 已接入的演出

- 101 号道路求救：确认求救声 → 镜头聚焦 → 博士和蛇纹熊并行动作 → 求助对白 → 镜头回归。
- 调查背包：自动走到可调查的格子 → 朝向背包 → 短暂停顿 → 选择伙伴。
- 救助后：战斗退出回到野外 → 蛇纹熊消失 → 博士走近玩家 → 双方转身 → 对话邀请 → 博士领路、玩家跟随离场 → 黑幕下布置实验室入口 → 自动走入实验室 → 完成进度 → 对话与存档。
- 战败送回：转场进入宝可梦中心 → 玩家走到接待区 → 回复表情与治疗 → 对话。
- 日常治疗与奖励：对话、像素表情、治疗/发放、后续对话按顺序执行。

回实验室的中间旅程用转场省略，并未逐格播放整个道路。这也遵循本地原作 `Route101/scripts.inc` 中“博士靠近、感谢对白、warp 回实验室”的结构。具体动作是当前切片的演绎，不是原作全部逐帧演出复刻。

## 指令表

| 指令 | 示例 / 意义 |
| --- | --- |
| `sequence` | `{type:'sequence', commands:[...]}`，一组动作按顺序执行 |
| `parallel` | `{type:'parallel', commands:[...]}`，不同角色/镜头/表情同时播放，全部结束后继续 |
| `wait` | `{type:'wait', ms:200}`，剧情中的明确停顿 |
| `move` | `{type:'move', actor:'player', to:{x:4,y:6}}`，自动寻路；也可指定 `path:['up','left']` |
| `approach` | `{type:'approach', actor:'guide', target:'player'}`，走到目标附近最近的可达邻格 |
| `face` | `{type:'face', actor:'guide', target:'player'}` 或 `dir:'down'` |
| `escort` | `{type:'escort', actor:'guide', to:{x:6,y:8},followers:['friend','player']}`，有序相邻队列协调行走；省略followers时为玩家 |
| `emote` | `{type:'emote', actor:'guide', kind:'exclamation', ms:500}`，气泡词汇见FIELD_EMOTES（共10种） |
| `hide` | `{type:'hide', actor:'enemy'}`，当前演出内隐藏角色；永久消失由进度/内容条件控制 |
| `cameraTo` | `{type:'cameraTo', actor:'guide', ms:400}`，也支持 `position:{map,x,y}` |
| `cameraFollow` | `{type:'cameraFollow', ms:400}`，平滑回到玩家 |
| `scene` | `{type:'scene', position:{map,x,y,dir}, actors:[...]}`，完全遮盖后更换场景、布置角色、揭开 |
| `flag` | `{type:'flag', key:'bridgeOpen', value:true}`，推进存档进度 |

当前注册 `dialog / heal / reward / starter / shop / battle / teleport`。旧grant已删除，奖励使用稳定ID的reward合同并通过统一库存容量预检。`battle` 是进入战斗的交接指令，等待进入动画完成；战斗结果通过 `battleOutcome()` 返回新的演出。不要在其后直接追加假定“战斗已经获胜”的指令。战斗作为一段长剧情中间可恢复的暂停点，尚未实现。

示例：

```js
[
  { type: 'cameraTo', actor: 'guide', ms: 400 },
  { type: 'approach', actor: 'guide', target: 'player' },
  { type: 'parallel', commands: [
    { type: 'face', actor: 'guide', target: 'player' },
    { type: 'face', actor: 'player', target: 'guide' },
    { type: 'emote', actor: 'guide', kind: 'exclamation', ms: 500 },
  ] },
  { type: 'dialog', name: '研究员', lines: ['跟我来，我找到入口了。'] },
  { type: 'cameraFollow', ms: 400 },
  { type: 'escort', actor: 'guide', to: { x: 6, y: 8 } },
  { type: 'flag', key: 'entranceDiscovered', value: true },
]
```

内容包通过 `CommandRunner` 注册新动作类型与校验器，不需要把规则或角色名称塞进引擎。像素表情由语义 `kind` 驱动，不读取剧情标记。

## 必须保持的约束

1. 剧情先校验整棵指令树，再执行第一条。未知动作、非法坐标/时长、重复布置和并行控制同一角色会明确报错。动态不可达路径在运行时失败。
2. 演出期间锁定手动移动、菜单、队伍与存档。对话确认仍然有效。结束时再次清空按键，避免演出期间按住方向导致突然走动。
3. 自主 NPC 暂停；接管的 NPC 仍根据演出时钟插值。剧情步行不触发草丛遭遇、普通脚步剧情或自动门传送。走入房屋用明确 `scene` 指令。
4. 跟随只放行领路角色正在腾出的源格，领路角色的目标格及其他角色的格子仍不可进入。
5. 切换地图和布置角色发生在遮罩完全覆盖时。镜头移动不会修改存档位置；结束前平滑回归玩家。
6. 并行分支即使一条失败，也等其余已经开始的动作结束后再释放控制，避免迟到的异步动作修改下一段场景。
7. `finally` 清理角色覆盖、表情、镜头和输入锁。失败不自动保存中间演出；这不是领域状态事务回滚，出错后恢复依靠最近的存档。
8. 演出不消耗战斗 PRNG，不改变命中、伤害或捕获结果。时钟可注入；测试无需真实等待。

## 当前边界与扩展

- 玩家自动步行支持同一世界中连接的地图。NPC 行走与 escort 当前限定在当前地图；跨场景的 NPC 用 `scene.actors` 布置，不能直接让 NPC 越界走到另一张地图。
- 碰撞、16px 格子和默认地形行为沿用当前 World 规则。新地形机制先扩展规则，再由寻路和演出共享。
- 表情目前10种，角色行走沿用已有帧表。未加入配音、复杂肢体动作、音轨混音、自动跳过、可视化时间轴或编辑器。
- 剧情在完整结束后保存；浏览器关闭时不会从长演出的任意一帧恢复。未来若需要中途存档，应另加剧情游标和可恢复指令协议。
- `tests/cutscene.test.js` 覆盖独立内容包复用、真实地图四方向救助、时序、并行失败、控制释放、存档、寻路、镜头、参数校验和对话边界；原有规则与架构检查仍保留。

## 多角色队列与注册镜头表现

escort的followers为1–32个唯一角色ID，不能包含领路角色；开始时每个成员与前一个成员在同一地图且相邻。它表示临时演出队列，不是常驻伙伴跟随。每步同一就绪点后按队列顺序提交，后排只放行前排正在腾出的源格，不放行其目标格或无关预约；全体完成后再进入下一步，实际落点必须匹配前排源格。领路NPC与跟随成员占用各自actor资源，parallel不能同时控制其中任意一人；跨场景、任意队形和自动重排未提供，用现有move/parallel明确编排。

镜头聚焦/平移继续使用cameraTo，二维静态视口使用cameraProfiles。注册场景可选纯field(frame)返回{x,y,zoom}，用于临时镜头位移/缩放；draw(ctx,frame,assets)用于叠层闪光/淡变，两者可以共用一个场景时钟。完整合同见[表现架构](PRESENTATION.md)。真实切场景仍用scene/teleport的遮盖—提交—揭开，不用纯表现的fade代替安全提交。

[story-presentation.test.js](../../tests/story-presentation.test.js)证明队列占位、并行冲突、纯镜头/反投影、失败隔离和领域不变；[scene-story.test.js](../../examples/scene-story.test.js)串起注册→剧情等待→镜头→后续奖励。浏览器还未验证新镜头及队列。

纯field场景可以与演员移动/镜头平移并行；带draw场景仍按模态互斥。判定由StoryApplication根据注册定义声明资源，核心CommandRunner不读取表现注册表。
