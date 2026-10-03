# 地形与强制移动合同

状态：2026-10-03，C2 首轮已针对性验证；桥面高度首轮见 FIELD_ELEVATION.md；完整自行车操作、桥面形变和破冰/地板机关尚未收口。

## 所有权与分层

- `engine/field-terrain.js`：具名规则、严格结果合同、确定性排序与只读上下文。不包含地图 ID、自行车名称、动画绘制或随机数。
- `packs/emerald/terrain-rules.js`：Gen3 地形政策。原作行为码集中于 `engine/terrain.js`。别的内容包可提供其他规则。
- `FieldSession`：落步、强制续移动队列、碰撞和中断边界。每格仍通过既有 World、移动服务、步数、剧情/训练家/遭遇入口。
- `GridMotion`：从已提交的位置和移动计划取样；pose、跳跃、锁朝向和冻结脚步仅为表现数据，不影响规则结果。
- 应用层：判断对话、剧情、战斗、旅行、野外行动、育成和场景演出是否允许续行，发射 `core:terrain-motion` 事实/停止/故障事件。脚本移动和显式旅行可结束旧续行；相邻地图保持连续。

## 插件入口

```js
api.content.register("terrainRules", "east-flow", {
  priority: 10,
  when: c => c.cell.behavior === 64,
  after: () => ({ direction: "right", duration: 160 })
});
```

上下文提供 from、当前目标 cell、sourceCell、dir、mode、technique、momentum 和精简地图元信息。不会每步复制整张地图；相邻地图的 map.id 表示目标地图，from.map 表示来源地图。所有快照均只读，回调必须同步。

`before` 可返回 allowed/duration/jump/keepFacing/freezeAnimation/pose，null 表示不介入。高优先级拥有各字段；任意拒绝最终拒绝。优先级相同按 ASCII ID 顺序，与机器语言环境无关。原 World 的对象占用、单向边界与 ledge 检查仍生效。

`after` 返回 direction，以及可选 duration/jump/keepFacing/freezeAnimation/pose/resetMomentum/mode，或 null。首个匹配的非 null 决策决定续行。重复位置+方向、超过强制步数上限、碰撞或故障会释放队列，不无限锁住输入。预检错误在位置提交前抛出；落步后的错误记录为故障并停止，已完成位置不回滚。

移动定义可声明 `techniques`，每项包含 name、pose 和可选 jump/keepFacing/freezeAnimation/oneStep。服务校验技巧可用性，一次性技巧在完成步提交后解除；不会写入长期存档。通过 `core.movement.technique` 设置，通过 `core.query.movementTechnique` 查询。当前 UI 提供显式技巧选择；这不等同于已实现原作 B 键时序。

## 本次落实及原作依据

固定参考修订见 ENGINE_ROADMAP.md；只读 `work/pokeemerald/src/field_player_avatar.c` 的 ForcedMovement_*、`bike.c` 的泥坡/轨道/抬轮处理，以及 `metatile_behavior.c` 的 bit attributes。

已落实：冰面/滑地/传送带/水流续行、朝向与脚步差异、泥坡动量资格/下滑、禁骑/禁跑、Acro 抬轮/跳跃与轨道轴向资格。冲浪地形和野生遭遇旗标分别按固定源码表核对，水流/瀑布不因“可冲浪”而自动允许遇敌；普通浅水/水洼不再误判为冲浪格。

时长沿用当前项目毫秒政策（冰面/滑地 96，传送带 160，水流 64），不是逐 GBA 帧对齐证据。当前技巧展示仍复用自行车帧/跳跃位移；完整抬轮原帧、按键节奏、站立连续跳跃、转向跳、薄冰/裂冰/裂地板、桥面形变与逐地图机关定义待完成；桥面高度和通行首轮见 FIELD_ELEVATION.md。

寻路使用同一入格资格；剧情脚本逐格行走不会自动执行地形续行。需要自然地形路线的上层行为必须使用普通行走或显式安排续移动，不能把 BFS 路线视为所有惯性地形的最优控制求解。

## 验证证据与失效条件

`tests/field-terrain.test.js` 15 项：排序/只读、非法和异步定义、冰面与步数、暂停/脚本覆盖、阻挡/循环、流向与朝向、相邻地图、水流/上下岸/遇敌资格、泥坡、技巧/轨道/寻路、禁跑/禁骑、错误释放、阻挡滑地朝向保持、插件注册和真实应用命令。全部获得针对性通过证据。

相关边界 movement/motion/cutscene/field-actions/world-state/application-services/plugins/ui-composition/architecture 共 91 项一次通过。公开类型检查通过，模块语法 209 文件通过。浏览器素材/逐原作机关及整体回归待 E。

失效条件：地形结果字段/排序、入格与落步边界、动画结束提交、输入锁、跨地图定位、移动技巧生命周期、世界碰撞/路径规划、插件包装或地形遇敌旗标改变时重查相应范围。
