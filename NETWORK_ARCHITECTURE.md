# 网络协议 1 与统一应用命令

v0.11.0；开发存档仍为 envelope 6。网络适配器控制当前单机会话，不提供联机多人、权威服务器、远程认证或连接服务部署。

## 模块职责

- `CommandBus`：命令定义/schema、来源、执行许可、同步输入/串行异步执行、提交完成事件。
- `application-commands.js`：绿宝石应用命令与权限；运行时按 UID 查找个体，调用原领域服务，不在传输层算伤害/库存/进化。
- `command-facade.js`：可信 UI 的兼容适配器，保持既有 game 方法形状，把 UI/输入/WebMCP 的外部状态修改转为应用命令。内部剧情/领域服务仍直接组合领域对象。
- `network-protocol.js`：有界 JSON 编解码、版本、严格消息形状、重试指纹。
- `NetworkGateway`：一个连接会话的顺序、去重、有限队列、忙碌等待及关闭；不持有游戏输入锁。
- `NetworkSession`：协议与传输绑定、hello/结果发送和解绑。
- `WebSocketTransport` / loopback：socket 与可替换测试传输，均实现 onMessage/onClose/send/close。
- `network-interface.js`：可选连接页与本地协议验证；输入/结果属于诊断视图，不修改领域数据。

通用插件宿主由内容包提供权限词汇，避免宝可梦的亲密度/培育名词进入通用宿主约束。插件调用公开 core 命令仍须声明对应权限；UI 是可信客户端；网络命令必须显式 `network: true`。重置/整档导入未对插件或网络开放。

## 使用流程

游戏菜单 → 扩展连接。可使用本地协议验证发送 JSON；也可连接自己提供的 ws/wss 服务。页面关闭不关闭连接，需选择断开连接。默认没有连接，打开菜单不自行向外部服务通信。连接失败/超时不锁游戏；取消连接会使稍后返回的旧连接失效。

连接建立后游戏向控制端发送：

```json
{"protocol":1,"type":"hello","session":"game-随机连接标识","nextSequence":1}
```

控制端用该 session 从序号 1 开始发消息：

```json
{"protocol":1,"type":"command","session":"game-随机连接标识","id":"pet-1","sequence":1,"command":"companion-care:interact","input":{"uid":"目标精灵UID","activity":"pet"},"policy":"reject"}
```

```json
{"protocol":1,"type":"result","session":"game-随机连接标识","id":"pet-1","sequence":1,"ok":true,"result":{"ok":true,"message":"伙伴开心地靠近了你。"}}
```

result 是具体命令的 JSON 结果，示例中的文字不构成稳定协议枚举。`ok: true` 表示命令处理完成，业务结果仍可能是 false 或 `{ok:false,reason}`。异常结果用 `ok:false,error:{code,message}`。不可解码的消息用 type:error，没有请求 ID。

先用 `core.query` 获取冻结的队伍/UID和世界状态，再发送其他命令。业务输入只接受注册 schema 的字段，不能把任意存档或脚本当作命令注入。

## 顺序、去重与忙碌策略

- 请求 JSON 最多 16 KiB；有限嵌套/有限数字/无原型键。响应最多 2 MiB。二进制帧不会隐式解码为命令。
- 请求 sequence 必须等于 nextSequence。同 session、同 id、同消息重发返回同一在途 Promise 或缓存结果，不再执行。对象字段顺序不影响指纹；同 id 不同内容是 request_id_conflict。
- 默认最多 32 个在途/排队请求，保留最近 128 个完成结果。缓存淘汰后，旧 sequence 仍被拒绝，不能重新执行。队列满的请求未接收，可等容量释放后按相同序号重试。
- 格式有效、顺序正确且进入队列的请求消耗序号；未知命令/未授权命令/业务失败也消耗序号。格式错、错 session、乱序、队列满不消耗。
- `policy:reject` 在剧情/移动/战斗动画忙碌时立即返回 busy。`policy:wait` 按 16ms 检查准备条件，最多 3 秒后返回 busy_timeout。只有准备检查可重试，执行器抛 busy 也不会重放可能已部分提交的行为。
- 一个连接按接收顺序执行。等待中的命令会阻挡后续请求；需要玩家确认的剧情应使用 reject，不能排一个无限等待来挡住后面的确认操作。
- 断开取消未执行的队列与忙碌等待，解绑监听器。已经进入领域演出的异步行动由自身 finally 收尾，可能继续完成，不把断开当作回滚承诺。
- 去重只在当前 session 内成立。新连接拿到新 session，不能跨重连用旧请求恢复“一次提交”；需要恢复时先 query，再让扩展决定下一步。存档不保存连接队列或协议缓存。

## 公开命令

| 分组 | 命令 | 主要输入 / 插件权限 |
| --- | --- | --- |
| 查询 | core.query | 空对象；只读，无权限 |
| 世界 | core.field.move / interact | direction/running 或空对象；movement |
| 初始伙伴 | core.starter.choose | species；starter；必须已有求救剧情、尚未领取 |
| 战斗 | core.battle.action | kind/index/item/seat/actor/target；battle；多席位行动用同一规则入口 |
| 队伍 | core.party.lead | uid；setLead |
| 道具 | core.item.use / equip / buy | uid/item，装备可 remove:true；useItem/equip/buyItem |
| 盒子 | core.box.deposit / withdraw / exchange | uid 或 boxUid/partyUid；storage |
| 育成 | core.daycare.deposit / withdraw / collect | uid 或空对象；daycare |
| 交换 | core.trade.prepare / exchange | 空对象或 uid/partnerUid；trade |
| 移动 | core.movement.mode / surf / fly / equipment | mode、destination 或空对象；movement |
| 成长 | core.growth.learn / evolve / cancel | uid、index/skip；进化带 trigger/item/from/to；learnMove/evolution |
| 保存 | core.save.write | show；save |
| 插件 | 声明 network:true 的注册行动 | 使用同一 schema/事务/状态/反馈机制 |

成长命令不会接收来自网络的可伪造领域计划对象。按 UID 重建当前合法计划，再检查 from/to，并由原进化服务验证和提交。盒子/队伍操作在执行时解析 UID，避免排队期间槽位变化使操作对象错误。

领域仍决定库存、目标/行动合法性、容量、移动权限、演出与战后剧情。传输适配器可以替换，规则不跟着 socket 生命周期改变。

## 验收

当前 297 项完整检查（最终执行结果以实现计划中的检查点为准）：协议错误、白名单、重复/乱序、在途去重、队列/断开、等待上限、处理器失败不重试、锁释放、UI/插件/网络同路、UID/进化、权限与步数事件补记。测试同时用 in-memory transport、假 socket 及 Node 标准库测试 peer 的真实 WebSocket handshake/frame；该 peer 位于 tests/helpers，不作为生产服务。

浏览器连接真实本地测试控制端，执行 core.query → 抚摸 → 同 ID 重发 → query，详情页确认只有 1 次互动。断开后原菜单可用；截图 outputs/network-interaction.png。继续验收序章与后续 UI 拆分/表现扩展，不以协议入口完成冒充整个项目目标完成。
