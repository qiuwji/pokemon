---
name: emerald-actor-behaviors
description: 为现有绿宝石Actor框架编写NPC自主行为、日程、感知互动和姿态模板，复用持久身份与统一移动占位。
---

# Actor行为与作息接手

## 本领域核心名词

- **模板 / 实例 UID**：模板定义外观、行为及记忆schema；实例用core:actor.N持久定位，不用地图对象ID代替。
- **perception / goal**：perception是冻结感知结果；goal是期望终点，由统一寻路与通行政策执行。
- **意图 / 预约**：意图描述要走/转向/更新记忆等动作；预约保护移动两端格子，防止穿人重叠。
- **pose / data**：pose只表达姿态；data是schema校验的业务记忆，不存逐帧插值。


先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)、[ACTORS](../../docs/engine/actors/ACTORS.md)。时间任务读[WORLD_TIME](../../docs/engine/world/WORLD_TIME.md)，高度/占位读[FIELD_ELEVATION](../../docs/engine/field/FIELD_ELEVATION.md)。伙伴跟随不是当前任务的默认范围。

## 实际模板和行为合同

通过actorTemplates、npcBehaviors、npcPoses注册模板、同步decide行为和姿态。行为context的identity/state/perception/time/environment冻结；状态受模板schema校验。move/goal/pose/state/interaction意图由已有Actor运行端口验证后提交。

看[actors.test.js](../../tests/actors.test.js)的公开spawn、自主跨相邻地图、goal接近玩家、邻接互动与保存；这是当前可运行代表例。角色身份是core:actor.N，不是地图静态对象map:id；命令/脚本/NPC投影引用同一个仓储，禁止另造对象覆盖。

## 添加一个业务行为

先定义小而明确的schema状态机，例如phase、目的地、对目标的关系记忆；关系/情绪的业务效果经插件action/状态服务完成，不让decide直接给钱或改队伍。姿态与速度/碰撞分离，新增姿态走注册数据，不修改枚举分支。

寻路复用world规则/高度/对象预约；无路等待或改变目标，不能穿墙或把teleport当正常行走。主动互动先邻接再发请求事实，是否开对话、改变关系由业务决定。移动帧不持久化，记忆更新不能重启动画。

作息通过 `actorSchedules` 注册，模板 `schedule` 引用返回ID；每个游戏日覆盖start=0，start为每日分钟，days使用游戏day%7而非设备星期。到达后才采用条目行为，未到达继续统一导航。具体字段见ACTORS日程合同，日程合同测试见[Actor日程合同测试](../../tests/actor-schedules.test.js)，测试搜索 `Visible scheduled actors`。

作息用保存的游戏本地时间。`offscreen:hold` 为默认，显式 `relocate` 才允许源/目的地图都不可见时补齐当前位置；忙、脚本控制、移动预约和占位时等待。冷加载在显示投影前补齐，跳过旧时段但不重播行为或奖励。日程从时钟派生，不保存第二份phase/RTC；门/HM/交通不是BFS自动能力，不能隐式创建全世界后台模拟。

## 验收与记录

真实注册→公开spawn→感知/目标→移动或邻接互动→状态变化→保存重载。验证玩家/静态NPC/Actor及两端预约碰撞、坏状态不半写、移除清理、姿态reducedMotion和失效查询。日程模板另验证时钟回退、重载/跨日及不可见区域政策。

更新STATUS与Actor规格；当前示例不等于全作NPC日常。保持跟随延期，只有明确的新跟随任务才补专属业务。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/actor.test.js](../../examples/actor.test.js)。在项目根执行 `node --test examples/actor.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../tests/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/actor.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("plugin actor identity and memory survive save restore", async () => {
  const plugin = manifest("actor-demo", api => {
    api.content.register("npcBehaviors", "idle", { decide: () => ({ pose: "still" }) });
    api.content.register("actorTemplates", "guide", {
      name: "向导", actor: "ProfBirch", behavior: "actor-demo:idle",
      schema: objectSchema({ visits: { type: "integer", minimum: 0 } }, ["visits"]),
      initialState: { visits: 0 },
    });
  });
  const { game, bus } = session([plugin]);
  const result = await bus.execute("core.actor.spawn", {
    template: "actor-demo:guide", position: { map: "LittlerootTown", x: 8, y: 10, dir: "down" },
  });
  assert.equal(result.ok, true);
  const uid = result.actor.uid;
  assert((await bus.execute("core.actor.update", { uid, data: JSON.stringify({ visits: 1 }) })).ok);
  game.loadDocument(game.exportDocument());
  assert.equal(game.actors.view(uid).data.visits, 1);
  assert.equal(await bus.execute("core.actor.remove", { uid }), true);
  assert.equal(Object.hasOwn(game.actors.list(), uid), false);
});
```

此例证明注册/身份/记忆/保存/移除。日程、跨图步行与离屏政策使用[actor-schedules.test.js](../../tests/actor-schedules.test.js)的完整生产链路，不把上面的短身份示例当日程证明。

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `Invalid actor template` | actor贴图、behavior引用、schema或initialState非法；用注册返回值，外观需实际存在。 |
| `Unknown actor template` | spawn使用未注册的完整模板ID。 |
| `Invalid actor location` | 地图/坐标/方向/高度不合法；先核对网格和通行，不能直接改仓储。 |
| `角色无法出现在这个位置。` | 公开spawn返回ok:false；格子被占、不可通行或会话忙，选合法位置。 |
| `Persistent actors require actor commands` | 试图通过worldPatch修改持久Actor；改用core.actor.update/remove。 |
| `Actor schedule requires unambiguous full-day coverage` | 每个days周期必须有start=0，同一天不能存在相同start；跨午夜使用当天0分钟条目。 |
| `Invalid actor schedule entry` | 核对目标图/坐标/水/warp、行为和姿态注册ID、days和config；运行时目标被占会等待，不是注册失败。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [src/engine/actor-repository.js](../../src/engine/actor-repository.js) | `rg -n "class ActorTemplateRegistry" dist tests docs package.json` |
| [src/packs/emerald/application/actor-application.js](../../src/packs/emerald/application/actor-application.js) | `rg -n "class ActorApplication" dist tests docs package.json` |
| [tests/actors.test.js](../../tests/actors.test.js) | `rg -n "Public spawn" dist tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。

## 稳定接触事实

主动interaction请求和玩家碰撞可通过统一 `core:field-contact` 事实消费；payload及去重/预约/高度、读档和战斗凭证合同见[遇敌与接触](../../docs/engine/world/ENCOUNTERS_AND_CONTACTS.md)。setup注册监听，接触在命令完成或帧末发布。Actor.data保存关系/行为记忆，不能保存一份核心野生个体；需要捕捉时通过encounter.prepare关联UID。文件改名搜索 `FieldContacts` 和 `core:field-contact`。


移动姿态可声明elapsed时钟或stride循环时钟；后者按统一GridMotion的progress/foot采样两步周期，不能在插件每格另起计时器。字段与原跑步导入见[移动输入合同](../../docs/engine/field/MOVEMENT_INPUT.md)。
