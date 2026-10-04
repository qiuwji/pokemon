---
name: emerald-project-handoff
description: 接手现有绿宝石网页复刻工程，定位项目、确认范围和进度、选择领域任务并留下可验证的交接记录。适用于首次接手和跨领域任务分流。
---

# 绿宝石项目接手与持续开发

## 本领域核心名词

- **领域**：一组拥有独立规则和状态的能力，如战斗、库存、剧情；业务不能越过其公开边界直接写状态。
- **应用服务**：协调多个领域完成用例的所有者；通过声明的窄端口协作。
- **内容包 / 插件**：内容包提供默认绿宝石数据；插件通过命名空间注册增加内容、规则和界面。
- **代表例 / 证据**：代表例证明一条真实链路；证据记录具体源码、检查范围和结果，不代表完整原作已完成。


所需能力：读取/修改文件、运行项目检查、检查浏览器结果；不依赖某个模型的专属工具。代码与文档必须和本Skill一起提供。

## 定位与范围

先读[项目导航](references/project-map.md)，找到包含`emerald-web-engine` package和dist/engine的项目根。不要根据上一个机器的绝对路径另建项目。若从符号链接读Skill，先解析到仓库真实目录再解析相对文档链接。

从项目根读取[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)、[架构](../../ARCHITECTURE.md)。范围由最近用户决定和SCOPE控制；当前进度只能在STATUS/代码/证据确认，不能把Skill、旧路线或聊天里的已完成当成事实。

## 接手流程

- 检查工作树、现有改动、任务和运行状态；不要重置别人的未提交工作，也不要因为观察超时重启确认仍在运行的任务。
- 对照当前代码与验证记录，区分框架/示例/完整业务/浏览器各自完成度。发现文档差异先记录并修正。
- 根据[领域路由](../../docs/project/SKILLS.md)只读本次领域的规格和示例。沿现有技术路线推进，不重写成模拟器或另一套引擎。
- 选一个完整可观察结果；数据/注册→公开操作→状态提交/反馈→保存恢复或结束清理。涉及多个领域可以组合，不能为凑一个功能绕过核心。
- 内容作者从内容/插件接口扩展；确实表达不了需求时给出接口缺口、预期合同和验收例，把核心调整归入明确的框架任务。不要按业务ID增加核心分支。

## 原作与验证

来源路径和固定修订在project-map。`work/pokeemerald/`及`sources/`只读。原作事实、待验证推测、本项目设计决定分开记录；公式/次序/时序不能凭模型记忆补齐，现代插件不混入默认Gen3。

复用仍有效的验证证据；本次只查新增和受影响边界，失败/修改后只重查对应范围。框架阶段最后按release-validation做系统和浏览器验收。狭窄单测不能证明完整原作或完整浏览器流程。

## 工作结束

更新STATUS和DEVELOPMENT_LOG，必要时更新对应规格/证据；写改动、验证结果、未验证部分、问题、失效条件及下一步。已实现未验证不标已验证。保留持久数据唯一所有权、失败原文保护及分层依赖。交付代码、文档、资源与Skill，不依赖聊天历史。

## 分类内容与导入入口

基础内容从[manifest](../../dist/content/manifest.json)及其分类文件装配，不再读取旧content.json。地图属性与网格分离；Node消费者统一loadContentSync，浏览器统一loadContent。修改原作资料先读[内容管线](../../docs/development/CONTENT_PIPELINE.md)和[导入索引](../../docs/development/IMPORT_SCRIPTS.md)，运行支持的--check再正式导入；不得越过字段所有权。未实现地图/脚本在references中明确分类，不能据此宣称已实现。原始npcs资料仍不等于全部运行时Actor；运行时扩展继续走mapExtensions。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/handoff.test.js](../../examples/handoff.test.js)。在项目根执行 `node --test examples/handoff.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../examples/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/handoff.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "./helpers/session.js";
test("first plugin uses registered content and public reward transaction", async () => {
  let api;
  const plugin = manifest("handoff-demo", value => {
    api = value;
    const item = api.content.register("items", "snack", {
      name: "示例点心", price: 10, contexts: ["field"], target: "party",
      effects: [{ op: "restoreHP", amount: 10 }], icon: "◇", description: "项目示例。",
    });
    api.actions.register("gift", { schema: objectSchema(), run(ctx) {
      ctx.intent({ kind: "reward", reward: { id: "handoff-demo:gift", items: { [item]: 1 } } });
    } });
  }, ["reward"]);
  const { game } = session([plugin]);
  await api.commands.dispatch("handoff-demo:gift", {});
  assert.equal(api.query().bag["handoff-demo:snack"], 1);
  await assert.rejects(api.commands.dispatch("handoff-demo:gift", {}), /Core intent rejected/);
  assert.equal(api.query().bag["handoff-demo:snack"], 1);
  const document = game.exportDocument();
  assert(document.state.contentDependencies.includes("handoff-demo"));
  game.loadDocument(document);
  assert.equal(api.query().bag["handoff-demo:snack"], 1);
});
```

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `Invalid plugin manifest` | 检查版本是否为如1.0.0的语义版本、apiVersion/dataVersion及permissions，别用version:1。 |
| `Game is not ready` | setup阶段只能注册；查询和dispatch必须在宿主装配、attach之后调用。 |
| `Core intent rejected` | 某个意图被领域拒绝；重复领取也会拒绝。检查奖励账本/目标/容量，保留原状态。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [package.json](../../package.json) | `rg -n "emerald-web-engine" dist tests docs package.json` |
| [dist/packs/emerald/extensions.js](../../dist/packs/emerald/extensions.js) | `rg -n "createEmeraldPlugins" dist tests docs package.json` |
| [dist/packs/emerald/extension-ports.js](../../dist/packs/emerald/extension-ports.js) | `rg -n "attachEmeraldExtensions" dist tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。

## 剧情与对话任务的路由

新增原作剧情先读story-reconstruction，新增地图/事件组合读world-content；接口统一在剧情语言/剧情架构，对话字段在对话合同。原生数据放content/stories并登记manifest，插件用registerBundle；既有动态短事件分地区装配。不要沿旧聊天重新把全部事件写回story.js，或假定普通battle会等待结果。当前验证/待办仅查STATUS，不在本Skill维护易变测试数。

若当前任务明确要求暂缓验证，只记录未执行范围和已有阶段证据；不能为了补齐模板自动重跑，也不能把未执行写成通过。恢复开发时依据变更范围决定受影响检查，阶段回归和浏览器验收分别记录。
