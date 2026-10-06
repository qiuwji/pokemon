# AI 控制插件使用指南

`ai-control` 默认启用，用结构化 JSON 观察当前单机游戏，并通过公共命令移动、交互、选择和对战。入口是 [index.js](index.js)，装配由 [catalog.json](../catalog.json) 管理，无需修改 app.js。

插件自身只读、无写权限。移动和战斗仍由游戏应用服务判定；插件没有跳图、直接获胜或发放物品的功能。观察接口版本为 2，网络协议为 1。

## 1. 连接游戏

在项目根启动开发服务器，浏览器打开：

```text
http://127.0.0.1:5181/?control=1&plugins=emerald-first-bgm
```

使用服务器实际端口。如果原服务器是在本次改动前启动的，先重新启动它，使 Python 长轮询接口生效。AI 插件默认启用；`control=1` 开启通信；音乐参数可省略。也可以从游戏菜单的“扩展连接”页手动连接同源 `/control`，两种方式选一种。

以下命令从项目根执行，只需要 Python 标准库。所有例子使用 5181；换端口时修改 `--url`。

```sh
python3 tools/control.py --url http://127.0.0.1:5181/control
python3 tools/control.py --url http://127.0.0.1:5181/control --command ai-control:commands
python3 tools/control.py --url http://127.0.0.1:5181/control --command ai-control:observe
```

第一个命令查看连接状态，第二个获取公开命令及输入 schema。命令目录只需在连接或接口变化后读取一次。静态托管不包含 Python 开发通道，可接现有 WebSocket 传输。

## 2. 按需观察

```sh
python3 tools/control.py --url http://127.0.0.1:5181/control --command ai-control:observe --input '{"detail":"world"}'
```

| detail | 内容 |
| --- | --- |
| `summary`（默认） | 位置、UI、行动条件、任务、最近事件、队伍能力值简表、钱、时间和战斗简表 |
| `world` | summary + 附近最多 9×9 格、地图连接/传送点、NPC/告示牌、天气、移动模式和野外行动 |
| `party` | summary + 完整队伍：六项能力、IV/EV、性格/中文名、经验、亲密度、特性、道具和招式详情 |
| `battle` | 完整队伍 + 每个战斗席位的敌我个体、属性、能力、招式、状态和战斗决策信息 |
| `bag` | summary + 持有道具的数量、名称、说明、分类、关键道具标记、场内/场外用途和行动选项 |
| `collection` | summary + 图鉴见过/捕获的数量与名单、盒子分页 |
| `all` | 所有上述信息 + 旗标与剧情进度；诊断时使用，日常避免反复拉全量 |

招式含 `id/name/type/power/accuracy/priority/pp/maxPP/target/effect`。状态查询不消费 RNG、不保存、不修改领域状态。观察和 UI 确认可在长命令等待期间执行。

能力键：`hp` 生命、`atk` 攻击、`def` 防御、`spa` 特攻、`spd` 特防、`spe` 速度。战斗 `stats` 是当前形态的能力值，能力等级等修饰另见 `volatile.stages`，不能把基础能力值误当最终伤害计算结果。当前 AI 战斗投影明确标记 `information: "complete-local-state"`，读取本机对手实际招式，而非推测玩家尚未观察到的招式。

盒子支持 `boxOffset` 和 `boxLimit`，默认从 0 开始返回 20 只；`box.total/hasMore/monsters` 用于确认捕获结果。图鉴是现有内容目录的收集进度，不表示完整 386 种已复刻。

`tasks.current` 给出当前目标、说明和 `destination`；`remaining` 包括可开始和尚未解锁的任务。目标来源是内容包登记的任务，不是 AI 根据坐标猜测。现有业务仍是序章；新剧情需补任务条件、目的地及可选 objectives，不能期待控制插件自动知道未编写的主线。

NPC 信息包含 `canTalk/canInteract/talkedBefore/blocksMovement/inFront/distance`。可聊不代表站在当前位置就能聊，仍需走到交互范围并面向它。`talkedBefore` 只在确认完对象对白后记录并保存；尝试交互、选择商店等不自动算已聊。`interactionReason: "no-active-dialogue"` 表示当前没有匹配对白。动态占位与移动资格仍以真实行动结果为准。

## 3. 移动结果与行动条件

```sh
python3 tools/control.py --url http://127.0.0.1:5181/control --command core.field.move --input '{"direction":"up"}' --state summary
```

外层 `ok` 表示命令是否处理完成。**真正走动必须看 `result.moved` 和 `result.status`**：

| status | 含义 |
| --- | --- |
| `moved` | 逻辑位置已走到目标格；动画可能还在播放 |
| `blocked` | 未移动，例如 wall/object/elevation/boundary/one-way/unavailable |
| `animating` | 上一个野外动作仍未完成，本次未移动、不改变朝向 |
| `busy` | 未移动；对话、战斗、剧情、菜单、设施、其他命令或隐藏页面占用控制 |
| `interacted` | 未移动，但已接受面前物体的行动，例如推石；后续动作由原领域服务完成 |

回执含 `from/to/accepted/reason/availability`，不靠坐标前后对比推断碰撞。`accepted` 不等于 `moved`。

```json
{"ok":true,"result":{"status":"animating","moved":false,"accepted":false,"reason":"animation","availability":{"canMove":false,"remainingMs":96}}}
```

上面仅展示关键字段。`availability.blockers` 提供全部原因、恢复条件及各自剩余时间；`remainingMs` 仅在单个可计时阻塞下有值。对话/选择/战斗等没有可靠倒计时，返回 null 和恢复条件。单独查询用 `core.control.availability`。`canMove/canBattleAct/canUIInput` 分别描述不同操作，不能互相代替。

## 4. 连续执行、打断与取消

```sh
python3 tools/control.py --url http://127.0.0.1:5181/control --command core.control.walk --input '{"directions":["up","up","left"],"running":false,"timeoutMs":10000}' --state world --timeout 12
```

逐格执行并等待真实野外结算，最多 256 个方向、最长 60000ms。返回：

- `status`: completed 或 stopped；控制器已有路线时为 busy。
- `steps`: 实际尝试的指令及各自回执；已移动项含 settled 和 finalPosition。
- `completed`: 实际移动的指令数；不把碰撞/交互算移动。
- `attempted/requested`: 尝试数与请求数。
- `stoppedAt`: 导致停止的零起始指令索引；completed 时为 null。
- `nextIndex`: 已移动指令数。恢复前先读状态，不能在剧情改变位置后盲目续接。
- `reason`: 碰撞、忙碌、事件打断、timeout 或 cancelled。

遇到对话、选择、战斗、传送会停止；默认换图也停止。`continueOnMapChange:true` 仅允许连续道路换图后继续，传送仍停止。强制地形运动由原野外系统处理，不算额外方向指令；finalPosition 是其实际停靠位置。路线不确认对白、不选择奖励、不操作战斗。

路线执行中可从另一次请求查询状态或取消：

```sh
python3 tools/control.py --url http://127.0.0.1:5181/control --command core.control.cancel
```

取消不回滚已经走过的格子；已接受的动画仍由原系统收尾。`timeoutMs` 也不回滚已执行步骤。`--wait` 仅用于普通命令就绪等待，移动命令会直接报告当前阻塞；连续移动由 walk 内部处理，不需要控制者每格固定 sleep。

## 5. 事件增量与命令附状态

事件含 `sequence/type/atMs/data`。主要类型：movement.started/settled/result、map.entered/changed、teleport、interaction.started、dialogue.started/line/completed/closed、choice.opened/selected、battle.started/event/ended。

```sh
python3 tools/control.py --url http://127.0.0.1:5181/control --command ai-control:observe --input '{"detail":"summary","since":42,"limit":16}'
python3 tools/control.py --url http://127.0.0.1:5181/control --command core.control.events --input '{"since":42,"limit":32}'
```

保存 `nextCursor` 用于下一页，`hasMore` 表示还有未读条目；`cursor` 是当前最新事件编号，不能用它跳过未读分页。默认 observe 返回最近 16 条。缓冲保留 256 条，不记录每个动画帧；`gap:true` 表示历史被淘汰或使用了其他会话的游标，需要刷新所需状态。事件缓冲不进存档，连接/页面重载后重新建立观察；已聊对象的事实单独由剧情领域保存。

CLI `--state detail` 将执行后观察放在外层 `state`，不再额外查询一次。`--since` 选择附带状态的事件游标。直接发送网络协议时：

```json
{"protocol":1,"type":"command","session":"来自hello","id":"walk-001","sequence":1,"command":"core.control.walk","input":{"directions":["up","left"]},"observe":"ai-control:observe","observeInput":"{\"detail\":\"world\",\"since\":42}"}
```

observe 必须引用声明为 query 的网络只读命令。输入和查询资格在动作前预检。动作已完成而观察自身失败时保留 `ok/result`，另附 `observationError`；不能因此重放动作。状态是执行结束时的快照，不意味着之后不会继续变化。

浏览器等待命令、CLI 等待结果都采用最长 25 秒的长轮询：有请求/结果立即唤醒，超时才续接。服务器等待期间释放锁，查询/确认/取消不会被等待结果的请求堵住。关闭与重连唤醒旧等待，浏览器取消在途 fetch。仍是一份单机状态的控制通道。

## 6. 对话、菜单与战斗

有对白时使用 `core.ui.input {"action":"confirm"}`；第一次可揭示逐字文本，后续推进。按钮使用本次观察到的 `ui.buttons[].id`：

```sh
python3 tools/control.py --url http://127.0.0.1:5181/control --command core.ui.input --input '{"action":"activate","id":"ui-当前编号-0"}' --state summary
```

按钮换页或重建后 ID 失效，禁用项拒绝。menu/back/navigate 进入、返回和导航菜单；navigate 需要 direction。输入框、文件选择、导入和重开仍走本地 UI。

战斗先 observe detail=battle，再按快照中的 seatId、个体 UID、目标席位与可决策信息发送 `core.battle.action`。例如 move/index 表示招式位置，switch/index 表示队伍位置；准确 schema 以 ai-control:commands 为准。普通交互使用 `core.field.interact`，不在插件中重写领域规则。

长命令可能等待玩家输入，使用 `--submit` 得到请求 ID，再观察并确认/选择，最后 `--result ID` 查结果。观察、语义输入和路线取消可并发，普通领域修改继续有序。超时后用原 ID 查结果，或以完全相同输入和 `--id` 重试；不要换 ID 盲目重放。重连会创建新会话，去重缓存不是永久账本。

## 7. 维护与验收

核心接口在 control-application/control-observation/control-ports，时序执行器与事实缓冲在 engine；插件仅组织公共查询结果。新增规则必须归原领域，不能把它塞到插件或网络网关。

从项目根执行：

```sh
node --test tests/control-movement.test.js tests/control-relay.test.js tests/control-ports.test.js tests/network.test.js
npm run test:plugins
npm run test:all
npm run check
```

核心与产品插件测试分开；实际浏览器还需检查正常移动、对话/选择、路线打断、连接关闭及长轮询。对应记录见项目 docs/project/STATUS.md。测试插件的独立用途见 [AI 与测试通道指南](../../../docs/development/AI_CONTROL.md)。
