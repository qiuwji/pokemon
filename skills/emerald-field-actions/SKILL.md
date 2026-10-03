---
name: emerald-field-actions
description: 在现有绿宝石工程中新增或演进HM、关键道具及野外交互，通过资格、目标、计划、演出和提交接口完成扩展。
---

# 野外行动与关键道具接手

## 本领域核心名词

- **资格 allowed**：当前是否允许执行行动，例如徽章、队伍招式、模式和库存条件。
- **目标 target**：在冻结查询上选择对象或位置；不是提交许可。
- **计划 plan**：只含数据的待执行操作，演出前后还须校验是否失效。
- **cue**：已注册的视觉标识；决定演出，不决定世界规则。
- **visit / permanent**：visit覆盖随当前地图访问结束而清理，permanent覆盖保存并跨重入保留；存档加载本次访问不等于重新入图。


先定位项目根并读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)。此Skill不携带完成清单；只读取本任务需要的规格。

## 合同和实际入口

- 读[FIELD_ACTIONS](../../docs/engine/field/FIELD_ACTIONS.md)及[ITEM_ACTIONS](../../docs/engine/items/FIELD_ITEMS.md)：`fieldActions`注册allowed/target/plan，`items.actions`只绑定入口，不复制资格和行为。
- 涉及库存/消耗读[INVENTORY](../../docs/engine/items/INVENTORY.md)，涉及临时世界变化读[访问生命周期](../../docs/engine/world/STATE_AND_LIFECYCLE.md)，涉及高度读[FIELD_ELEVATION](../../docs/engine/field/FIELD_ELEVATION.md)。
- 实际业务定义：[field-actions.js](../../dist/packs/emerald/field-actions.js)。引擎合同：[FieldActionRegistry/Service](../../dist/engine/field-actions.js)。协调者：[FieldActionApplication](../../dist/packs/emerald/application/field-action-application.js)，仅框架任务改它。
- 代表例：[field-actions.test.js](../../tests/field-actions.test.js)中的Cut公共命令、content-only插件、动画期间变化、重进入图与剧情借用场景。

## 添加一个行动

先找只读原作fldeff_*、field_move_scripts、field_player_avatar的资格/目标/生命周期依据。检查徽章、实际持有道具、队伍招式、地图/高度、模式；不要复活研究装备旁路。明确使用者选择及是否扣PP/道具。

通过注册定义返回纯数据计划。临时障碍、永久剧情改变和跨地图状态分别选已有生命周期，不能全部写永久flag。预览可用不等于提交时仍可用：动画期间对象/库存/位置/资格变化必须使计划失效。

演出消费计划和已确定事实；移动/切图按既有导演和遮盖时提交，finally释放锁。新视觉注册cue，不在画师按行动ID分支。页面、快捷、剧情、插件和网络复用`core.field.action`/`core.item.action`，不直接改库存/坐标。

## 最小验收

对象、道具和地形先尝试同一fieldActions入口：`triggers`选择交互、`items.actions`声明道具绑定、`displace`提交一格对象移动及可选玩家跟进、`fieldEffects`声明持续状态与保留政策。先读[FIELD_ACTIONS](../../docs/engine/field/FIELD_ACTIONS.md)的参数和所有权边界；独立组合是[interaction-workshop](../../dist/plugins/interaction-workshop.js)，对应[测试](../../tests/field-interactions.test.js)。文件移动搜索`Object and follower interpolation`、`fieldEffects`、`occupancy`。不要往World/FieldSession加石块种类、招式、道具或徽章分支，不通过世界覆盖写持久Actor坐标。

局部照明不等于战争迷雾；接触遭遇、外观与相机的未来合同先核对[PLUGIN_ROADMAP](../../docs/project/PLUGIN_ROADMAP.md)，不能把计划API当作已经可用。

新增注册→公开命令→真实世界变化/反馈→保存或重进恢复。验证一个正确执行、一个资格/目标失败、一次计划失效，以及影响到的库存/入口恢复边界；失败不写状态或耗RNG。复杂HM会话状态若尚无接口，登记框架缺口并按明确框架任务补，不能用特殊flag掩盖。

更新STATUS和对应规格，保留草丛/推石/闪光等具体业务的参考差异；一个代表例不等于全部HM完成。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/field-action.test.js](../../examples/field-action.test.js)。在项目根执行 `node --test examples/field-action.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../examples/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/field-action.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
test("plugin field plan commits through the public command", async () => {
  const plugin = manifest("paint-demo", api => {
    api.content.register("fieldActions", "paint", {
      name: "涂色", duration: 100, cue: "field-cut",
      allowed: () => true,
      target: context => context.position,
      plan: context => ({ kind: "world", operations: [{
        kind: "tile", map: context.position.map, x: 1, y: 1,
        behavior: 2, scope: "permanent",
      }] }),
    });
  });
  const { game, bus } = session([plugin]);
  const result = await bus.execute("core.field.action", { id: "paint-demo:paint" });
  assert.equal(result.ok, true);
  assert.equal(game.world.map.behavior[game.world.map.width + 1], 2);
  const saved = game.exportDocument();
  game.loadDocument(saved);
  assert.equal(game.world.map.behavior[game.world.map.width + 1], 2);
  assert.equal((await bus.execute("core.field.action", { id: "paint-demo:typo" })).ok, false);
});
```

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `Field action requires rule callbacks` | 注册时需同时提供allowed、target、plan同步函数。 |
| `Unknown field action` | 检查注册返回的完整命名空间ID；公开命令可能返回ok:false/reason而非抛错。 |
| `Invalid field action` | 核对name、duration、cue和schema；cue也必须存在。 |
| `World patch would block the player` | 图块/对象变更堵住玩家或角色预约；修正操作和目标，不能关闭占位校验。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [dist/engine/field-actions.js](../../dist/engine/field-actions.js) | `rg -n "class FieldActionRegistry" dist tests docs package.json` |
| [dist/packs/emerald/application/field-action-application.js](../../dist/packs/emerald/application/field-action-application.js) | `rg -n "prepareOperation" dist tests docs package.json` |
| [tests/field-actions.test.js](../../tests/field-actions.test.js) | `rg -n "content-only" dist tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。
