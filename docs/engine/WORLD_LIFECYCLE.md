# 地图访问与覆盖生命周期

状态：首轮合同与针对性验证完成。这里提供世界覆盖的生命周期；薄冰/裂地板/桥面机关、原作临时剧情变量、特殊地图碎岩分支仍待各自政策与内容接线。

## 状态所有者与层次

`engine/world-state.js` 是覆盖和版本的唯一所有者。内容地图保持不可变；`maps` 保存永久覆盖，`visits` 保存访问覆盖，`activeMap` 标识玩家当前访问。投影按原始内容 → 永久字段 → 临时字段组合，图块、行为、对象字段都逐字段合并。临时改变不会覆写永久记录；临时对象修改未声明 hidden/spawn 时继承下层值。

世界操作新增可选 `scope: "permanent" | "visit"`，省略为永久。作用于 `visit` 的操作必须指向当前访问的地图。它复用 `core.world.patch`、剧情 worldPatch 和野外行动 world 操作，不另建绕过命令权限的写入口。

```js
await api.commands.dispatch("core.world.patch", { operations: JSON.stringify([
  { kind: "object", map: "my-pack:cave", id: "my-pack:rock", hidden: true, scope: "visit" },
  { kind: "tile", map: "my-pack:cave", x: 4, y: 3, block: 0, scope: "visit" }
]) });
```

一次批量操作先预检、生成草案，再提交一个世界版本；非法作用域、无效引用、阻塞玩家/持续 Actor 或旧版本均不提交。临时生成的对象不能通过永久修改偷偷转成永久对象，应以明确的永久生成业务另行处理。持续 Actor 始终由 ActorRepository 持有，任一覆盖层都禁止占用 core:actor.N 身份。

## 入图与保存

- WorldStateService.prepareVisit 生成恢复草案；World.entryPreview 使用草案中的图块和对象检查入口，不能先按旧临时状态决定通行再恢复。
- 通过门、相邻地图、飞行、潜水、剧情进入，以及显式同地图重新进入，均重置目标地图的访问层。当前地图内普通移动和反复读取投影不会重置。
- 应用层校验恢复后的落点、持续 Actor 和移动中的两端预约；不安全入口返回失败，位置/永久层/临时层不变。剧情入口失败中止后续命令，飞行失败不预先写玩家坐标。
- 成功提交恢复、移动玩家之后，发 `core:world-visit {map,revision,restoredObjects}`，再进行既有地图通知。监听者查询的是新位置。restoredObjects 是此次被清除覆盖的对象 ID，不保证这些对象都可见，条件标记仍参与投影。
- 保存当前访问及其临时覆盖；读档 bind(resume) 恢复当前访问，不视为重新入图。开发存档的旧可选字段不是兼容承诺。

项目策略：离开地图后保留其最后的访问投影，供相邻场景绘制与预约使用；下一次玩家入图才丢弃。保存也包含这些投影，其插件地图/角色/训练家引用纳入依赖检查。此策略不是原作内存布局的复刻，也不是全世界离线模拟。NPC 独自跨地图不触发玩家的访问重置。

## 原作政策的接线

绿宝石砍树和碎岩使用 visit 隐藏，普通障碍重进恢复；永久剧情对象仍由标记或 permanent 覆盖控制。Rusturf Tunnel 等特例还需配置剧情分支，不能在引擎按地图 ID 判断。

依据只读 work/pokeemerald，修订 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881：

- data/scripts/field_move_scripts.inc：CutTreeDown/SmashRock 调用 removeobject；SmashRock 另有 TryUpdateRusturfTunnelState 特例。
- src/event_object_movement.c：RemoveObjectEventByLocalIdAndMap 设置对象定义的 flag，移除活跃对象；不是所有消失的对象都临时。
- include/constants/flags.h 与 data/maps/Route104/map.json：临时标记定义与临时对象示例。
- src/event_data.c:ClearTempFieldEventData，以及 src/overworld.c:LoadMapFromCameraTransition/LoadMapFromWarp：两种入图路径均清理临时事件数据。

本合同尚未将原作所有 TEMP_FLAGS/TEMP_VARS 自动映射为作用域变量；它们需在剧情状态合同中显式定义。保存恢复本轮验证的是项目的当前访问政策，没有声称兼容原版存档或逐内存位重现。

## 证据与失效条件

见 DEVELOPMENT_LOG.md。新增检查覆盖层合并与独立验证、临时生成/隐藏、当前访问保存恢复、相邻地图重进与恢复碰撞、旧草案失效、障碍与持续 Actor 的恢复冲突、移动预约、两层保存保护与插件依赖、入口事实的观察顺序、剧情失败和飞行提交。

只有覆盖结构、入图/重绑、碰撞/预约、保存/依赖、野外/剧情/飞行接线变化时，对应证据失效。新增合规地图或剧情仅验证引用和实际流程；最终浏览器组合验收留到 E。
