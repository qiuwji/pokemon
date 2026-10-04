---
name: emerald-facility-content
description: 在绿宝石工程中编写选美、游戏厅、狩猎区、对战设施等业务，使用设施会话、队伍政策、临时规则和进度奖励合同。
---

# 设施框架与内容接手

## 本领域核心名词

- **设施 definition / 活动 activity**：设施配置地点、参数和选队政策；活动定义自身状态及合法行动，同一活动可被多个设施复用。
- **会话**：当前设施的一次进入至退出过程；活动进度和临时队伍与原世界状态分开。
- **transition**：同步decide返回的纯数据计划，由宿主校验、收付款及提交，回调不能自行改钱或开战。
- **pendingReward / reward**：pendingReward暂停等待领取；reward在本次操作中结算，两者不能混在一个计划。
- **ticket / 账本**：ticket只接受所属设施战斗的结果；稳定交易ID及结束账本防重复结算。


先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)和[设施规格](../../docs/engine/facilities/FACILITIES.md)。以STATUS和实际代码确认会话框架是否已存在；场景导演的徽章/联盟/选美/战斗塔名称不证明设施规则存在。

## 领域边界

设施会话负责进入、资格/选队、局部进度、退出/终止和一次结算；精灵/库存/战斗/时间/剧情各自服务仍持有自己的状态。选美评审、狩猎行动和对战开拓规则分别是业务政策，不塞进一个识别设施名称的巨型switch。

设施临时队伍/等级/道具限制必须明确生效范围和恢复方式。原个体UID/经验/学习/装备的改变哪些带回世界、哪些不能带回，由政策规定；临时战斗不能悄悄修改唯一原队伍。禁止用全局flags补一套平行的保存状态。

持久房间装修/秘密基地不使用临时设施会话保存布局；先由world-content按[布局合同](../../docs/engine/world/ROOM_LAYOUTS.md)确认状态与空间所有者。设施可以承担装修比赛等活动，但布局、库存与活动成绩仍分别由各领域持有；该布局合同目前是设计，不是可调用API。

## 开发顺序

按规格找实际注册器、会话所有者、公开命令、查询、事件和保存合同。现有facilityActivities注册局部状态和同步行动，facilities注册参数/资格/可选选队政策；不是必须开战的框架。无team定义允许零只精灵，适合游戏厅等活动。确实表达不了的业务列出合同缺口，不能在Skill里编造API。

在内容/插件注册活动与设施；战斗型引用现有队伍/战斗服务，非战斗型返回自己的状态/成本/奖励计划；通过公共入口开始、进行一次行动、结算/中止，表现消费会话事实。普通战斗奖励和设施奖励不能都发一次；使用稳定的结算身份，重试不能重复领。

原作依据按本设施读取contest_*、battle_frontier_*、safari_zone等相关源文件和脚本。通用活动可承载非战斗行动和自有状态，但连战/转轮/表演代表例不代表完整选美/狩猎/老虎机规则已经填充，所需扩展先写明确合同缺口。

## 最小验收

进入失败原队伍/库存不变；成功进入符合队伍政策；两场或两个阶段推进真实会话；胜利一次奖励，失败/主动退出释放锁并恢复政策规定的世界状态；保存恢复/不允许保存的阶段明确；错误不留下半个设施状态。

代表例、公开合同和这些失败路径通过后再逐步填设施内容。更新STATUS和证据，设施场景素材、完整规则保真及浏览器观察分别记录。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/facility.test.js](../../examples/facility.test.js)。在项目根执行 `node --test examples/facility.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../tests/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/facility.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("non-battle facility progresses and settles once", async () => {
  const plugin = manifest("stage-demo", api => {
    const activity = api.content.register("facilityActivities", "appeal", {
      parameters: objectSchema(),
      state: objectSchema({ score: { type: "integer", minimum: 0 } }, ["score"]),
      initial: { score: 0 },
      actions: { perform: { label: "表演", schema: objectSchema(),
        decide: c => ({ data: { score: c.data.score + 3 }, pendingReward: { money: 30 } }),
      } },
    });
    api.content.register("facilities", "hall", { name: "表演示例", activity, parameters: {} });
  });
  const { game, bus } = session([plugin]), before = game.state.money;
  assert(bus.executeSync("core.facility.enter", { id: "stage-demo:hall", team: [] }).ok);
  assert((await bus.execute("core.facility.action", { action: "perform" })).ok);
  assert.equal(game.facilityView().active.data.score, 3);
  assert(bus.executeSync("core.facility.claim", {}).ok);
  assert.equal(game.state.money, before + 30);
  assert.equal(game.facilityActive, false);
  assert.equal(bus.executeSync("core.facility.claim", {}).ok, false);
  game.loadDocument(game.exportDocument());
  assert.equal(game.facilityView().results[0].outcome, "win");
});
```

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `Invalid facility activity` | 检查parameters/state/schema、initial及actions；初始值必须符合state。 |
| `Invalid facility action` | label、schema、同步decide缺失，或draws范围非法；samples由宿主生成，不在回调随机。 |
| `Conflicting facility transition` | battle、outcome、reward/pendingReward组合互斥；一次只请求允许的阶段转换。 |
| `Facility is not ready` | 当前在战斗或待领取阶段，不能重复推进；先完成对应阶段。 |
| `Core command permission denied` | 插件dispatch设施命令需声明facilities权限；测试直接bus不能代替权限验证。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [dist/engine/facilities.js](../../dist/engine/facilities.js) | `rg -n "class FacilitySession" dist tests docs package.json` |
| [examples/facility.test.js](../../examples/facility.test.js) | `rg -n "facilityActivities" dist tests docs package.json` |
| [tests/facilities.test.js](../../tests/facilities.test.js) | `rg -n "Non-battle plugin activity" dist tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。

设施回调字段和计划互斥规则见FACILITIES规格。自定义行动输入通过core.facility.action的input JSON字符串；通用设施页面只提交空输入，复杂布局由插件页面接入相同命令。活动过程当前不允许保存/导出，只保存结束账本；不要替作者默默启用中途恢复。
