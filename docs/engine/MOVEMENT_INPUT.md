# 可注册移动输入与音速自行车

本合同增加逻辑输入规则，不把键盘、地图 ID 或自行车状态机写进 World / BrowserInput。它与已有 MovementRegistry 的资格、通行、技巧和默认步长共存。

## 分层与作者接口

- `engine/movement-input.js`：MovementInputRegistry 校验策略；MovementInputSession 持有会话记忆、上次按键、局部计时与碰撞反馈。状态是短期操作状态，不写进存档。
- `engine/rules/gen3/bike-input.js`：原作 Mach 自行车规则与 60Hz 步长常量。只返回计划，不操作地图、浏览器、存档或 RNG。
- MovementApplication 采样当前会话、检查暂停与移动锁，执行计划；跨应用步进端口在 composition 中接至 WorldApplication，保持机关请求与世界保护的统一入口。
- BrowserInput 只把物理键映射为 `{direction, secondary, running}`；Shift 同时对应野外 B 和步行跑步。触屏方向同样发送逻辑状态。菜单/战斗导航沿既有入口；窗口失焦和 UI 清输入清除控制记忆。触屏 B 长按/越野技巧在后续 Acro 工作中接入。

插件登记：

```js
const rule = api.content.register("movementInputs", "my-controls", {
  schema: objectSchema({ count: { type: "integer" } }, ["count"]),
  initialState: { count: 0 },
  decide(c) {
    return {
      state: { count: c.state.count + 1 },
      action: c.busy || !c.input.direction ? null : {
        kind: "step", direction: c.input.direction,
        durationMs: 73, technique: "hover",
      },
    };
  },
});
api.content.register("movement", "hover", {
  name: "悬浮", actor: "MyActor", durations: [90], inputRule: rule,
  techniques: { hover: { name: "悬浮", pose: "hover" } },
  allowed: c => !c.map.indoor,
  traverse: c => c.cell.collision === 0,
});
```

`objectSchema` 使用公开 extensions/values.js，actor 必须已注册。没有 inputRule 时使用普通方向步进，running 仍经 MovementService 的资格和模式选择。引用缺失在内容装配时失败。

策略上下文深度只读：mode、state、timeMs、input、previousInput、busy、blocked、position、cell、momentum。回调必须同步，插件评价期间不能重入宿主命令。返回 `{state, action?}`，state 通过策略 schema；action 为 step 或 turn，含 direction、可选 durationMs 与已注册 technique。busy 时不能返回动作。时长须为有限正数且不超过 60 秒；World/地形仍能拒绝通行或指定更优先的动作表现，不会因为输入策略绕过碰撞。

`core.field.input {direction?, secondary?, running?}` 要求 movement 权限；省略 direction 表示松开方向。公开消息可在其他命令执行时采样，但应用锁决定是否允许行为。`core.field.input-reset {}` 清控制记忆。宿主按自己的时钟采样，客户端不能注入 now、速度、位置或领域结果。网络客户端如需持续操控，应持续发送逻辑快照；单条消息不是永久遥控托管。

已有 `core.field.move` 仍是一次明确步进；它没有松键/连续控制历史，自动化要验证真实骑车过程应使用 field.input。

## 原作 Mach 政策

只读参考 `work/pokeemerald` SHA `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`：src/bike.c 的 GetMachBikeTransition / TrySpeedUp / TrySlowDown / sMachBikeSpeedCallbacks，以及 event_object_movement.c 的 sStep1Funcs / sStep2Funcs / sStep4Funcs。

- 加速回调对应 16 / 8 / 4 帧每格，折算约 266.67 / 133.33 / 66.67ms；替代此前 128/96/64 的项目速度。
- counter 上限 2；速度按 counter + (counter >> 1) 更新。最快时松键继续按原方向滑行，逐步 4/8/16 帧减速，然后停下。
- 静止且面向与输入不同，先执行一帧原地转向；行进转弯保持速度，不能套用旧“方向变化就降至首档”的简化规则。
- 碰撞反馈清速度；轨道朝向约束阻止非法转身，移动中对应减速处理。转向不增加行走步数、遭遇或成长时钟。
- GridMotion 以完整截止时间比较完成，避免小数帧相加/相减误差造成到期后多锁一帧；sample 与 moving 一致。

本模块不是全原作输入状态机完成。Acro 的 6 帧转向等待、4 帧方向+B历史、40 帧蓄跳、原地跳、侧跳/转向跳、原作图像帧仍待下一项。骑行道路强制下行/成绩、完整水陆步长和全部强制地形的原帧时序也未核对。禁止把当前 Mach 证据扩大成整个移动系统逐帧复刻。

## 裂地板的行动优先级

机关请求优先于新的普通步进。WorldApplication 检查 devicePending，防止玩家持键在步进结束与掉落启动之间离开格子。受控剧情和动作自身仍走各自输入锁，不用新增地图分支。

裂地板记录进入时是否为最快 Mach 步长。最快且仍持续按方向时允许穿过；打开后以局部 watch 任务检测停止，离格取消 watch；松键/改模式/离格碰撞后仍在格上则请求落下。普通步行不能利用同一帧输入顺序逃走。输入记忆不保存，读档不会恢复玩家现实世界的按键或惯性。

这是与当前连续毫秒模拟连接的领域政策，不宣称完全重放 GBA 的 VAR_ICE_STEP_COUNT、任务/精灵回调执行相位或每个硬件帧。真实 Mach 通过、步行持键落下与最快松键落下已验证；原作整个天空之柱地图仍待业务导入。

## 验证与失效条件

新 movement-input 7 项通过：加速/滑行、转向/碰撞、busy/暂停/换模式、轨道、同步只读/无效计划、截止时间、浏览器逻辑按键/菜单/失焦。新增机关组合 4 项通过：实际 Mach + 步行持键、最快停洞、插件输入规则/技巧/公共命令/禁止朝向抽搐、前方阻挡不能停洞悬浮。

受影响 movement/terrain/application/architecture 首次 37 项中 36 通过；旧速度断言更新后，只重查该项通过，小数截止检查在此时修正。后续机关/野外行动/剧情/应用/架构 63 项中 62 通过；保存计时夹具此前只把 field.tick 推到未来而没有推进共享时钟，统一其暂停/时钟后只重查该项通过。公开类型检查通过。未重复全工程检查或浏览器系统验收。

改动输入边沿/策略记忆、暂停/清输入、field busy/转向、步长/截止时间、机关请求优先级或其插件边界时重查受影响用例。其他已经验证且未改变模块沿用记录；最终 E 做统一回归与真实浏览器检查。
