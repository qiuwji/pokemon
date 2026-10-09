---
name: emerald-release-validation
description: 对绿宝石工程做针对性验证、框架阶段系统和浏览器验收，维护可复用证据并生成可携带的项目交接。
---

# 验证与交接接手

## 本领域核心名词

- **专项 / 系统 / 浏览器**：专项证明受影响合同；系统验证当前整体；浏览器验证真实输入和表现，不能互相冒充。
- **故障注入**：在真实边界制造失败，断言之前的有效变化也回滚，而非模拟整个领域结果。
- **证据有效范围**：检查对应源码、接口、资源和场景；只有相关变化使该范围证据失效。
- **基线 / manifest**：基线是确定版本的结果；manifest记录源码hash、命令、结果和未执行项，分批结果不是全量。


先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)、[FINAL_VALIDATION](../../docs/project/VALIDATION.md)及本次领域manifest。区分模块证明、公开接口组合、浏览器观察和原作保真；不能用其中一种替代其他。

## 日常验证

从改动决定受影响边界，检查对应测试是否验证真实行为而不是只镜像实现/匹配文字。未变模块沿用匹配来源的有效证据；保存、命令、生命周期、政策或资源改变只使相关范围失效。每次失败保留日志，修正后只重查失败/新增影响，不删断言或关校验。

项目命令以[README](../../README.md)和package.json为准。测试可按文件和test-name-pattern筛选；确认匹配的是实际case，Node零匹配的文件条目不是通过证明。内容检查验证启动目录，严格公开类型和语法是不同范围。检查任务仍运行时先观察同一进程，不因等待超时重复启动。

证据写明源码/提交或hash、命令、范围、通过/失败、修复、未执行、失效条件；不能把多个分批数量相加写成一次全量通过。旧截图/旧版本全量属于历史，不改成当前结果。

## 框架阶段收口

逐域确认注册/声明、状态所有者、命令/冻结查询、失败原子性、保存恢复/清理及一个真实代表例。设施还须实际会话，不以演出名称替代；插件和Actor按公开扩展例检验。缺口写STATUS，不以文档存在宣称已实现。

框架收口后运行当前全量和内容/类型/语法；真实浏览器覆盖输入、连续地图与必要转场、对话/菜单、代表战斗/设施/插件/Actor、保存重载、触屏/reducedMotion和真实资源音频。观察实际规则与表现，不能仅看服务启动或HTTP返回200。

组合验收让上层内容完成“新区域→机关→分支剧情→训练家→奖励→保存重载”，记录被迫改核心的接口缺口。原作全内容和音画仍可暂缓，但必须明确哪些没有验收。

组合验证从[世界剧情例](../../examples/world-story.test.js)、[设施例](../../examples/facility.test.js)和对应领域合同测试选取；文件移动搜索 `registered NPC triggers`、`facilityActivities`。已删除的业务插件及其专属组合测试不再作为当前入口，历史日志仅证明当时版本。真实浏览器跨领域组合仍需在当前内容上验收，不能用这些最小例宣称整条组合链已通过。

## 可携带交接

更新STATUS/DEVELOPMENT_LOG、相应规格和证据。交付当前代码、资源、docs、skills及固定参考获取信息；排除node_modules、运行缓存和个人存档。验证接手者能定位项目、启动、选任务和找到示例。打包/链接的版本与实际源码一致，既有ZIP/部署不能冒充本次成果；对外发布按用户授权办理，不由Skill自行授权。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/validation.test.js](../../examples/validation.test.js)。在项目根执行 `node --test examples/validation.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../tests/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/validation.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("late invalid intent rolls back plugin memory and world money", async () => {
  let api;
  const plugin = manifest("check-demo", value => {
    api = value;
    api.actions.register("bad", { schema: objectSchema(), run(ctx) {
      ctx.store.set("attempts", 1);
      ctx.intent({ kind: "reward", reward: { id: "check-demo:gift", money: 20 } });
      ctx.intent({ kind: "friendship", uid: "missing", amount: 1 });
    } });
  }, ["reward", "friendship"]);
  const { game } = session([plugin]);
  const before = structuredClone(game.state), seed = game.rng.snapshot();
  await assert.rejects(api.commands.dispatch("check-demo:bad", {}));
  assert.equal(game.state.money, before.money);
  assert.equal(api.store.get("attempts"), null);
  assert.deepEqual(game.state.story.rewards, before.story.rewards);
  assert.equal(game.rng.snapshot(), seed);
  const view = api.query();
  assert.throws(() => { view.party[0].hp = 0; }, TypeError);
  game.loadDocument(game.exportDocument());
  assert.equal(api.store.get("attempts"), null);
});
```

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `Example did not settle;` | 剧情或命令锁未释放；查实际忙状态和await路径，不加无限等待。 |
| `Invalid save` | 保存版本/schema/内容引用不符合当前合同或正在忙；修正夹具，禁止旧档回退。 |
| `存档需要插件：` | 缺少档中依赖插件；保留原档、提供依赖，不删dependency字段绕过。 |
| `Callback must be synchronous` | 规则、查询或事务用了async；异步等待归演出/应用协调，不削弱同步合同。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [package.json](../../package.json) | `rg -n "check:contracts" src generated tests docs package.json` |
| [tests/architecture.test.js](../../tests/architecture.test.js) | `rg -n "interface" src generated tests docs package.json` |
| [docs/project/VALIDATION.md](../../docs/project/VALIDATION.md) | `rg -n "证据失效条件" src generated tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。

多存档验证使用`tests/save-slots.test.js`和`tests/launch-flow.test.js`：旧legacy原文字节保留、新游戏独立槽位、刷新选择、自动保存隔离、同槽位多页冲突、坏档/配额拒绝、开始菜单直接点选、所有卡片可达、过期预览重选与设置返回分别验收。状态格式不变，不能把原作单档要求覆盖用户指定的网页版多档扩展，也不能宣称找回已覆盖且无备份的旧进度。
