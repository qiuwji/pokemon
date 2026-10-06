# 宿主驱动实时互动会话

本合同描述插件如何编写实时小游戏（判定条、计时窗口、节奏互动等）。宿主持有时间、输入、随机、绘制与结算；插件只返回业务 JSON 状态和受限结果。**当前实现为 R1 首版**，不保存进行中的会话，原生钓鱼迁移属于后续 R2。

## 插件注册

```js
api.interactions.register("timing", {
  version: 1,
  parameters: DataSchema, // start 命令的合法参数
  state: DataSchema,      // 每 tick 的业务状态
  result: DataSchema,     // 终止结果
  inputs: ["confirm"],    // 语义动作名，不接受键盘/触控原始键
  completion: "owner:finish", // 可选：已注册 action，接收冻结结果
  init(context, parameters, random) { return state; },
  step(state, { clock, input, context }) {
    return { kind: "running", state } |
      { kind: "terminal", state, outcome: "success" | "failure", result };
  },
  view(state, { clock, viewport, reducedMotion }) { return FrameData; },
});
```

注册时校验 schema、输入名、回调类型与策略枚举；`init`/`step`/`view` 必须同步且只接收冻结值。`visual`、`completion` 引用在宿主装配时解析。能力通过 `api.capabilities.interactions`（当前 `1`）识别。

## 生命周期与所有权

```text
running → finishing → completed
running → cancelled
running/finishing → failed
```

- `step` 返回 `terminal` 只表示请求结束；宿主冻结结果后进入 `finishing`，只有宿主保存的结果凭据可以结算。
- `completion` 是一个已注册 action，但它是**宿主专用处理器**：不注册为公开命令，只有宿主在会话进入 `finishing` 后才会用现有插件事务调用，输入为 `{ instance, context, outcome, result }`；容量/权限等按 `ctx.intent` 原有校验。失败标记 `failed` 并保留冻结结果供重试，`reason` 记录原因。直接 dispatch 该 action 会被拒绝。
- 结算提交成功、会话释放占用后，宿主会补一次保存，避免事务期间的保存被 `game.busy` 拦掉、刷新丢结果。
- 同一时刻只有一个活动会话；活动期间 `game.busy` 为真，世界与其它命令暂停。
- 取消不结算、不调用完成处理器。

## 时钟与输入

- 会话逻辑时间固定 60Hz，`clock = { tick, nowMs, elapsedMs, dtMs }`；显示帧率（30/60/144Hz）不改变业务结果。
- 长停顿有限补步（默认最多 8 步），不无限追帧。
- `pausePolicy: pauseOnFocusLoss`（默认）已实现：失焦/页面隐藏显式进入 `paused`，恢复时重建时间基准，后台时间不会被补跑或漏判。
- `init/step/view` 在宿主的只读执行保护下运行：不能 dispatch 命令或写状态；`step`/`view` 抛错会隔离为该会话失败/空帧，不中断主帧循环。
- 输入是语义动作：`held/pressed/released` 与带序号/来源的 `edges`。宿主按**物理来源**（每个按键、每个触屏按钮）分别记录后合并为语义动作；只有最后一个来源松开才释放，触屏方向按钮同样进入该桥。同 tick 按下又松开保留两个边沿，顺序以 `edges` 为准。
- 会话取得输入租约后，方向不再移动主角；`back`（键盘 X/Esc、触控 B）由宿主取消会话。

## 帧数据与绘制

`view` 返回 `FrameData = { nodes, statusText? }`。宿主先做结构校验（种类、有限值、颜色、字符串长度、节点/点数上限，未知字段拒绝），再交给 Canvas 层；非法帧被丢弃为空帧并报告错误，插件不接触 Canvas context、DOM 或 CSS。

| 图元 | 关键字段 |
| --- | --- |
| `rect` | x, y, width, height, color? |
| `panel` | x, y, width, height, background?, border?, borderWidth? |
| `line` | x1, y1, x2, y2, width, color? |
| `circle` | x, y, radius, color?, fill? |
| `ellipse` | x, y, radiusX, radiusY, color?, fill? |
| `arc` | x, y, radius, startAngle, endAngle, width?, color? |
| `polygon` | points[[x,y]…]（≤64）, color?, fill?, width? |
| `text` | x, y, text（≤240）, color?, size?, align? |
| `meter` | x, y, width, height, value(0–1), color?, background? |
| `sprite` | x, y, resource, width?, height?, frame?（横向帧条） |

宿主统一坐标系、像素缩放与层生命周期。

## 公开命令

| 命令 | 作用 |
| --- | --- |
| `core.interaction.start { definition, source?, parameters? }` | 开始一个注册会话；参数为 JSON 字符串；`source` 标记发起方（世界/设施） |
| `core.interaction.input { action, active }` | 设置一个语义动作的按住状态 |
| `core.interaction.advance { ticks }` | 确定性推进 N 个逻辑步（测试/AI） |
| `core.interaction.cancel {}` | 取消当前会话 |
| `core.interaction.view {}` | 查询活动会话与当前帧 |

浏览器由 `app.js` 帧循环按墙钟调用内部 `advance(nowMs)`；命令入口供测试与 AI 注入时钟。公开 `core.interaction.start` 仅在宿主字段空闲时可用（战斗/剧情/菜单/设施占用时拒绝）；父流程（fieldAction/设施/应用适配器）走内部桥启动。

完成后宿主发布公开事实 `core:interaction-completed {instance,definition,source,outcome,result}`（见 [public-events.js](../../src/packs/emerald/public-events.js)）。世界/设施/插件据此接续后续领域结果；需要改地图或启动遭遇时另做受限完成适配器，不把异步战斗塞进同步插件事务。

## 入口

除公开命令外，字段/设施可经薄适配器 `InteractionApplication`（`startInteraction`/`interactionActive`/`interactionInput`/`cancelInteraction`/`interactionAdvance`/`interactionView`）发起与驱动会话；fieldAction 计划可用操作 `{ kind:"interaction", id, parameters?, source? }` 在提交时开始一个注册会话。原生钓鱼迁移到该入口仍属后续。

## 边界

- 不新增浏览器游戏循环；复用现有帧循环、输入适配器与 Canvas 宿主。
- 插件业务状态是普通 JSON，不保存进行中的会话，不写入存档；只有完成后的领域结果与插件记忆随核心存档保存。
- 运行时/租约/事件不在 `StateCheckpoint` 覆盖范围，完成失败只恢复本次领域提交与插件数据。
- 这是受信任插件作者合同，不是 JavaScript 沙箱。

## 代表例

[examples/interaction-bar.test.js](../../examples/interaction-bar.test.js)（`node --test examples/interaction-bar.test.js`）注册判定条→开始→输入→判定→奖励→保存重载；核心桥接另有 [tests/interaction-completion.test.js](../../tests/interaction-completion.test.js)，引擎时钟/边沿/回放见 [tests/interaction-session.test.js](../../tests/interaction-session.test.js)。

## 未实现（后续 R2）

fieldAction/设施入口、世界/遭遇完成适配器、原生钓鱼迁移、活动存档与跨刷新幂等、多会话并发。设计见[扩展评审](../project/PLUGIN_EXTENSION_REVIEW.md)。
