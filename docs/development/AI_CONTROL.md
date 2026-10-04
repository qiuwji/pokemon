# AI观察、操作与测试游戏

AI 控制的完整用法以[插件使用指南](../../dist/plugins/ai-control/README.md)为准，包含真实移动回执、行动条件、事件游标、连续执行、状态附带和长轮询。本页保留共享连接与测试插件说明。

两个独立插件：`ai-control`默认启用，提供精简只读观察和公开命令目录；`test-harness`默认关闭，只在显式测试环境装配。都只使用PluginAPI。旧十个插件未恢复，核心不依赖这两个产品模块。

## 启动与连接

在项目根运行`npm run dev`，打开`http://127.0.0.1:5173/?control=1`。若换端口，以实际端口为准。这会连接同源`/control`本地开发通道；也可正常打开游戏，在“扩展连接”页面手动连接默认HTTP地址。不要同时开启自动连接和第二条手动连接。

`npm run dev`的Python服务器只监听127.0.0.1。HTTP桥接采用现有协议1的hello/命令/结果，转交同一个NetworkGateway和CommandBus，不解析规则、不读写存档。浏览器以有界长轮询等待命令，结果经同一通道返回；WebSocket接口继续可用。静态部署没有Python控制通道，需要另配已有WebSocket传输。

先建立一次浏览器连接，后续AI可通过命令行读取JSON并操作，无需每步截图。命令行只用Python标准库：

```sh
python3 tools/control.py --url http://127.0.0.1:5173/control
python3 tools/control.py --command ai-control:observe --input '{"detail":"world"}'
python3 tools/control.py --command ai-control:commands
python3 tools/control.py --command core.field.move --input '{"direction":"up","running":false}'
python3 tools/control.py --command core.ui.input --input '{"action":"confirm"}'
```

默认URL是5173；其他端口给每次调用加--url。返回JSON包含`ok/result`或`error`；进程0表示命令成功，1表示失败。移动返回结构化回执，必须检查 result.moved/status；进程成功仅表示命令处理完成。

## AI如何观察与行动

1. `ai-control:observe {detail:"summary"}`是默认精简视图：位置、忙碌、当前对话/模态、可点击按钮、队伍简表、时间及战斗。`world`额外给附近最多9×9格、对象、道路连接、传送点和野外行动；`party/bag/collection/battle`按需补培养、道具、图鉴/盒子和对手；`all`含全部详情、旗标和剧情事实。命令目录只需开始时读一次，接口改变再读取。
2. 格子是世界领域当前覆盖与占位的真实只读投影，不是可通行保证。碰撞、高度、预约、移动模式和剧情条件仍由正常动作判定。更大区域用`core.world.bounds`/`core.world.cells`，按目录schema传参；不要一次读取整个世界。
3. 有对话先`core.ui.input {action:"confirm"}`；逐字时第一次揭示，后续确认推进。选择/菜单按最新observe.ui.buttons的ID调用`{action:"activate",id:"ui-..."}`。按钮换页、重建或内容变化后ID过期，必须重新观察；禁用项拒绝执行。菜单可用menu/back/navigate动作，方向字段只给navigate。
4. 野外走格子用`core.field.move`并检查moved/status，交互用`core.field.interact`；战斗使用当前快照席位/目标和`core.battle.action`，伙伴使用UID。首次伙伴选择走`core.starter.choose`，不跳过正常资格或剧情。
5. 操作可加`--state summary`附带执行后状态，连续移动用`core.control.walk`；移动插值、对话等待或剧情演出时，观察仍可用。--wait只等待命令就绪，不会重试已执行且失败的处理器。观察可用不代表当前每个动作都可执行。

按钮入口不提供任意CSS选择器或脚本执行。读取替换存档、导入和重开按钮标为local，仅由本地UI操作，语义通道会显示禁用；文本输入/文件选择、画面观感及音频质量仍需正常UI工具验收；当前语义控制只涵盖按钮、菜单、对话和现有领域命令。

长剧情命令可能等待玩家输入。此时用`--submit`提交而不等待结果，随后观察并确认/选择；最后用`--result 请求ID`查询完成状态。不要在同一静态场景里先阻塞等待该命令结果，再期待后续步骤替它确认。

## 请求顺序、重试与会话

开发桥为命令分配session和单调sequence，NetworkGateway继续做校验、排队、去重及错误返回。CLI可加`--id stable-id`，网络超时后相同ID和完全相同输入可查复用结果；变更输入会拒绝。不带ID重新执行会创建新动作，可能重复消费。

本地桥只维护一个浏览器连接；重新连接使旧连接失效。请求/队列/缓存均有上限；完成结果缓存不是永久账本。用同源Origin检查并仅本机监听，属于受信任本地开发控制，不是远程多人、认证服务或沙箱。关闭连接不撤回已经被领域接受的动作。

## 测试插件与场景

以`http://127.0.0.1:5173/?control=1&e2e=1&test-harness=1`启动。仅加test-harness=1而没有e2e=1会明确拒绝。它注册8×8测试室及研究所(12,9)的门、固定测试员和选择奖励，不修改原作剧情。需要操作测试室时从门正常走入；自动测试中的直接场景摆位只能算测试准备，不证明玩家走过入口。

`test-harness:prepare {}`通过一次事务给予3个伤药、5个精灵球和15级木守宫；容量失败回滚全部奖励、记忆与RNG，重复准备返回already-prepared。它不任意改旗标/钱/坐标、不关闭领域校验，也没有跳图或直接获胜命令。测试状态导出会包含测试内容依赖；在专用浏览器/存档运行，移除依赖后按正常缺内容保护处理，不能当原作存档使用。

`test-harness:report {}`只读输出准备状态、地点、队伍数、药数量和对话奖励账本。NPC确认后可选领取/离开，领取再交互不重复付奖。这个插件提供可复用准备与观察，不声称一个场景就覆盖所有领域。

提供通用JSON步骤运行器：

```sh
python3 tools/control.py --scenario tools/scenarios/control-smoke.json
python3 tools/control.py --scenario tools/scenarios/test-harness.json
```

场景格式是`{name,steps:[{command,input?,policy?,assert?:[{path,equals或gte}]}]}`，path读取本步result，点号访问字段/数组下标；遇到命令失败、断言失败或超时立即退出1，成功输出步骤/断言统计。测试准备例要求专用场景有接收空间、药未被消耗；不要自动重置玩家存档以满足它。动态按钮/战斗目标需观察后由控制者构造下一命令，不在静态JSON中缓存过期ID。

## 插件作者与维护者

`api.queries.register(localId,{schema,network?,read(view,input)})`注册纯同步读接口，返回命名空间命令ID。它可在忙碌时并发执行，view只有冻结query/store/states；返回值也冻结，不进入事务、不触发保存、不消费RNG。回调中dispatch被拒绝；Promise返回拒绝。写入继续用actions/intent，不能给动作加concurrent绕过锁。

领域观察来自[control-ports.js](../../dist/packs/emerald/control-ports.js)及现有extension-ports，DOM语义端口在[control-dom.js](../../dist/adapters/control-dom.js)，传输在[polling-transport.js](../../dist/adapters/polling-transport.js)，本机桥在[control_relay.py](../../tools/control_relay.py)。没有把这些机制塞入adventure或产品插件。UI输入插件权限是uiControl，AI插件只读无写权限；外部网络入口按原network白名单操作。网络等待某个异步领域命令时，只有已声明concurrent的瞬时查询/UI输入可绕过等待；普通修改仍有序。结果按id/sequence关联，完成顺序可能不同于接受顺序。

测试仍分开：`npm test`验证纯查询、UI合同、传输及核心；`npm run test:plugins`验证[automation.test.js](../../examples/automation.test.js)产品插件与装配；`npm run test:all`阶段回归。测试插件不是测试框架替代品；浏览器/动画/音频与原作还原仍分别验收。C转写流程见[复刻Skill](../../skills/emerald-story-reconstruction/SKILL.md)。
