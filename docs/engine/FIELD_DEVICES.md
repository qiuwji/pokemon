# 野外机关合同

本模块提供玩家格子事件、机关自身状态、局部延迟任务和领域行动请求。地图内容配置机关位置和参数，机制策略返回数据计划，不在 World / FieldSession 中增加地图名称分支。它不是 NPC 作息或离线世界调度。

## 所有权与依赖

- `engine/field-devices.js`：FieldDeviceCatalog 校验定义/摆放；FieldDevices 执行同步策略，拥有 `state.devices` 中的记录、计时游标、定时器与待请求。
- `packs/emerald/field-mechanisms.js`：薄冰与裂地板政策、图块和落点参数规格。通用服务不认识原作机关类别。
- `application/device-application.js`：有限端口连接格子事件、WorldStateService、野外行动与保存；不注入整份 game，也不导入同级应用服务。
- `composition.js`：世界入口和机关访问计划共同预检；地图覆盖与机关记录提交后再发布事实。原 adventure 门面没有增加机关业务。
- `presentation/field-action-director.js`：复用关键帧描述计算玩家表现。Canvas 消费 player 姿态，表现不决定落点、资格或碰撞。

步进开始先发旧格 leave、新格 enter；步进结束发 settle。相同位置多个机关按 ID 排序。各策略读取当前提交的世界投影；同批操作集中交给宿主校验，不假设后一个策略已看见前一个策略的图块变更。当前仅接玩家事件；NPC 自主触发和全世界机关模拟不在本次合同内。

## 插件注册与作者配置

`api.content.register("fieldMechanisms", id, definition)` 返回限定名称。定义包含：

- `scope: "visit" | "permanent"`；`schema`、`initialState` 和 `configSchema`。
- 可选 `activate / enter / leave / settle / timer / interact` 同步回调，至少一项。回调接收深度只读 `{ device, state, event, position, tile, tiles, mode, durationMs, input }`，不能通过策略评价调用宿主命令。
- 回调返回 `{ state?, operations?, timers?, cancelTimers?, requests?, cancelRequests?, facts? }`。不修改传入快照，也不直接渲染。

`api.content.register("fieldDevices", id, { map, x, y, elevation?, footprint?, mechanism, config? })` 只负责摆放。0 高度为通用平面，指定高度的机关不影响另一桥面。

示例：

```js
const policy = api.content.register("fieldMechanisms", "switch", {
  scope: "permanent",
  schema: objectSchema({ on: { type: "boolean" } }, ["on"]),
  initialState: { on: false },
  interact: c => ({
    state: { on: !c.state.on },
    facts: [{ kind: "switch-changed", data: { on: !c.state.on } }],
  }),
});
api.content.register("fieldDevices", "lever", {
  map: "MyRoom", x: 4, y: 3, mechanism: policy,
});
```

`objectSchema` 从公开 `engine/extensions/values.js` 获取。地图必须已注册，插件不要导入 application 内部模块。面对机关可用普通确认键；既有 NPC/标牌优先，其后寻找有 interact 回调的机关。也可用 `core.device.interact {id}`，要求 world 权限并检查面对位置/忙碌状态。查询的 `devices` 含 records、pending、devices，只读；内部定时游标不用于客户端推算规则。

## 提交、计时与保存

每次回调批次先建立草稿，校验状态 schema、任务及请求、世界操作；世界预检失败时不改变机关记录、游标或图块。成功后发布 `core:world-changed` 与 `core:device-fact`。观察者故障不撤销已提交事实。`core:device-fault` 报告错误。

定时器格式 `{ key, delayMs, payload? }`，同机关同 key 替换；取消只操作自身名字。延迟为有限 0–60000ms。到期按 deadline/device/key 排序；较早回调取消或替换其他到期任务后，被替换任务不再执行。回调中新建的零延迟任务留到下一次 advance，避免同帧无限循环。上限为 256 定时器、64 行动请求、1024 已触及机关记录。

局部计时只在野外模拟允许时推进；菜单、剧情、对战、转场、领域演出及后台暂停。WorldClock 的真实时间和离线政策继续独立工作。记录、任务、剩余期限和请求保存；加载当前访问保留，重新入图清除目标地图的 visit 记录及当前所有局部任务/请求，永久记录保留。离开地图不继续播放旧机关回调。

行动请求 `{ key, action, input? }` 必须通过已注册 FieldAction 的输入 schema；等待步进/剧情/对战等锁释放后使用正常的资格、操作预检、演出和提交路径。同 key 去重。尝试前移除请求，完成发布 `core:device-action` 的 outcome 并保存；失败有明确结果，不承诺跨崩溃恰好一次执行或自动重试。位置变化时策略应取消无效请求；宿主仍重新验证动作资格。

## 当前原作政策与表现

参考只读 `work/pokeemerald`，SHA `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`：`src/field_tasks.c` 的 SootopolisGymIcePerStepCallback / CrackedFloorPerStepCallback、对应 Gym/洞穴掉落脚本，以及 metatile 行为定义与属性文件。

- 薄冰第一次裂、裂冰再次破；5 次任务等待折算约 83.33ms。自身 visited 为 visit 状态，图块变化也为 visit 覆盖；当前访问加载保持，重新进入恢复。
- 裂地板延迟 3 帧折算 50ms。离开前未到期限时，后续在旧格开洞；玩家仍在格上则请求 fall。快速度通过/普通步行掉落已验证。**后续 Mach 输入模块已将步长按原作 16/8/4 帧校准，补实际最快持键通过、普通步行禁止绕过掉落、最快松键停洞落下的领域接线，见 MOVEMENT_INPUT.md。仍不宣称逐 GBA 回调相位相同。**
- 地图配置 holeMetatile、薄冰额外 crackedMetatile，以及目标 `{map,x,y,dir}`；保留原 block 的碰撞/高度高位。目标地图/坐标与当前 tileset 图块须有效，运行时另外检查落点通行和占用。
- fall 是隐藏菜单的正常 FieldAction。80 帧名义时间折算约 1333.33ms；玩家逐渐下降/消失，在不透明转场内提交目的地，落地恢复姿态。reducedMotion 缩短等待并取消装饰位移。不是将原作每帧 OAM 与声音时序逐位复现。

默认地图还未摆放完整琉璃道馆和天空之柱机关。桥面形变的双格/外观/时序合同已经补充（见 BRIDGES.md）；道馆阶梯的 8/28/67 计步条件、全房间图块和原作音效编曲仍未完成，不以注册表或测试夹具代替内容还原。

## 验证证据与失效条件

`tests/field-devices.test.js` 首轮 13 项各有通过证据：定义/同步只读边界、世界失败原子性、取消/替换到期任务、失败计时回滚、访问与永久保存、引用/平面、薄冰两次踩踏与读档/重进、暂停与剩余期限、快速通过及步行落下、插件开关公共命令/保存、落下时序/覆盖/reducedMotion、失败落点与普通确认交互、不可变姿态描述。

相关原有 94 项一次通过；普通交互端口及空 warp 快照补齐后 movement/architecture/application 22 项通过。类型检查通过。新样例发现的空 warp 使用 null，避免插件同步策略只读 JSON 收到 undefined；这项修正由真实注册移动的通过测试覆盖。后续输入规则新增 4 个组合用例及影响复查，见 MOVEMENT_INPUT.md。未全工程回归或浏览器画面验收。

修改回调/任务顺序、WorldState 保护、格子事件相位、暂停条件、存档合同、FieldAction 或姿态采样时按影响重查相应用例；其他有效证据沿用。最终系统与真实浏览器检查留到 E。

2026-10-03：新增 footprint/activate/只读 tiles，支持双格桥共同状态；事件前同步局部时钟避免新任务提前。具体桥政策、外观覆盖、验证与差异见 BRIDGES.md。
