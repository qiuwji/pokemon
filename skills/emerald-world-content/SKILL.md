---
name: emerald-world-content
description: 给现有绿宝石工程添加网格地图、连接、动态对象、机关、分支剧情和时间业务，复用世界及剧情注册接口。
---

# 世界、地图与剧情内容接手

## 本领域核心名词

- **metatile**：组合小图块的地图格子；blocks、behavior、碰撞和高度共同定义规则及外观。
- **connection / warp**：connection把相邻区域连接为连续世界；warp把入口传送至另一个落点。
- **visit / permanent**：visit覆盖在本次访问结束时清理；permanent覆盖跨访问、保存保留。
- **事件完成 / reward账本**：completed记录事件已执行；rewards用稳定奖励ID去重，领取失败不能记账。
- **where / after**：where限定触发矩形；after要求前置事件已完成，引用完整事件ID。


先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)。本任务默认只编辑内容/插件、资源和相应测试，不在World或adventure按地图ID加业务。

## 按任务读取

地图/对象读[WORLD_STATE](../../docs/engine/world/STATE_AND_LIFECYCLE.md)和[访问生命周期](../../docs/engine/world/STATE_AND_LIFECYCLE.md)；剧情读[STORY_LANGUAGE](../../docs/engine/story/STORY_LANGUAGE.md)，涉及全作组织或新增核心机制另读[剧情内容架构方案](../../docs/architecture/STORY_CONTENT.md)，新增内容优先用registerBundle，同一目录校验；完整原作业务仍按STATUS确认；机关读[FIELD_DEVICES](../../docs/engine/field/FIELD_DEVICES.md)；时间/天气读[WORLD_TIME](../../docs/engine/world/WORLD_TIME.md)、[WEATHER](../../docs/engine/world/WEATHER.md)。高度或交通另读对应规格，不默认加载全部。

实际参考：[世界剧情例](../../examples/world-story.test.js)注册地图、NPC及一次奖励；菜单/HUD扩展合同见[宿主测试](../../tests/plugins.test.js)。验证：[world-state](../../tests/world-state.test.js)、[story-language](../../tests/story-language.test.js)、[field-devices](../../tests/field-devices.test.js)。

## 内容编写

地图用metatile网格、行为/碰撞/高度、共享tileset和明确对象定义，区分地图目录键与map.id。connections用于连续道路，warps用于入口；不要把连续道路强制切整张背景图。所有入口/引用在编译目录校验。

世界变化用批量world操作及明确visit/permanent作用域；玩家、Actor和移动预约使用同一投影和高度，图块appearance不偷偷改变通行。入图先检查恢复后的落点再提交；保存当前访问与重新入图不同。

剧情用事件ID、条件/after、变量、choice/if、领域命令、完成及reward账本关联。稳定reward ID防重复，容量失败不标领取。completed是整段演出完成，rewards是已提交业务；关键后续入口依赖实际业务里程碑，不把已提交旗标和可能失败的尾部completeEvent混成双重唯一条件。训练家奖品与视线资格共用trainerRewardId；新增捕获/领取不能裸写队伍或盒子，调用所属收纳服务。编排走路/朝向/镜头/遮盖，不用teleport代替应有演出；并行不争抢角色/世界资源。

时间业务用保存的本地游戏时钟与调度/业务所有者，不从浏览器设备时区重新推断，也不在render里随机刷新。明确离线、暂停、到期和重载政策。天气、潮汐、机关、Actor日程有独立状态职责，不能混成一个万能定时器。

## 代表性验收

完成“进入新区域→触发一个机关/分支→挑战注册训练家→领取一次奖励→保存重载”。只新增本次需要的内容，走实际公开入口；验证连接/碰撞/条件/失败不写/重载一致。原作完整地理和剧情还原另按参考验收，框架可运行不能算全作完成。

交接更新STATUS、模块规格与证据。只读参考和生成输出分离，保留资源来源；未变领域证据复用。

## 分类内容与导入入口

基础内容从[manifest](../../dist/content/manifest.json)及其分类文件装配，不再读取旧content.json。地图属性与网格分离；Node消费者统一loadContentSync，浏览器统一loadContent。修改原作资料先读[内容管线](../../docs/development/CONTENT_PIPELINE.md)和[导入索引](../../docs/development/IMPORT_SCRIPTS.md)，运行支持的--check再正式导入；不得越过字段所有权。未实现地图/脚本在references中明确分类，不能据此宣称已实现。原始npcs资料仍不等于全部运行时Actor；运行时扩展继续走mapExtensions。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/world-story.test.js](../../examples/world-story.test.js)。在项目根执行 `node --test examples/world-story.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../tests/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/world-story.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("registered NPC triggers a once-only data story", async () => {
  const plugin = manifest("story-demo", api => {
    api.content.register("mapExtensions", "guide", {
      map: "LittlerootTown", elements: [{ id: "story-demo:guide",
        x: 8, y: 9, actor: "Boy1", dir: "down", kind: "talk",
        name: "向导", text: "欢迎。", movement: { mode: "still", rangeX: 0, rangeY: 0 } }],
    });
    api.story.register("gift", {
      trigger: "interact", once: true,
      match: ({ object }) => object?.id === "story-demo:guide",
      commands: [
        { type: "dialog", name: "向导", lines: ["这是一份项目示例礼物。"] },
        { type: "reward", id: "story-demo:gift", money: 20 },
      ],
    });
  });
  const s = session([plugin]), before = s.game.state.money;
  assert(s.game.enter({ map: "LittlerootTown", x: 8, y: 10, dir: "up" }));
  await s.bus.execute("core.field.interact", {});
  await s.settle();
  assert.equal(s.dialogs[0].name, "向导");
  assert.equal(s.game.state.money, before + 20);
  assert(s.game.state.story.completed.includes("story-demo:gift"));
  await s.bus.execute("core.field.interact", {});
  await s.settle();
  assert.equal(s.game.state.money, before + 20);
});
```

## 需要逐字文本或行内效果时

先读[对话合同](../../docs/engine/presentation/DIALOGUE.md)：speed为毫秒/字素，文字效果纯采样，不推进剧情。向既有剧情写结构化runs即可；无需自己启动计时器或改ui-shell。整棵剧情预检效果引用，真正的奖励/行为另写命令。

完整例：[examples/dialogue.test.js](../../examples/dialogue.test.js)，在项目根执行 `node --test examples/dialogue.test.js`。沿用上述真实装配夹具；UI替身立即确认，此例只证明注册→NPC触发→参数转发→剧情完成，实际时间/确认/取消另由tests/dialogue.test.js验证。

<!-- runnable-example: examples/dialogue.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("registered text effect reaches an NPC dialogue through the story application", async () => {
  const plugin = manifest("speech-demo", api => {
    const effect = api.presentation.textEffect("float", {
      sample: (_, c) => ({ y: Math.sin(c.elapsedMs / 120 + c.index) }),
    });
    api.content.register("mapExtensions", "guide", {
      map: "LittlerootTown", elements: [{ id: "speech-demo:guide",
        x: 8, y: 9, actor: "Boy1", dir: "down", kind: "talk", name: "向导",
        text: "你好", movement: { mode: "still", rangeX: 0, rangeY: 0 } }],
    });
    api.story.register("greeting", {
      trigger: "interact", once: true,
      match: ({ object }) => object?.id === "speech-demo:guide",
      commands: [{ type: "dialog", name: "向导", speed: 40, lines: [{ runs: [
        { text: "你好", effect }, { pauseMs: 200 }, { text: "！", color: "#ee8866" },
      ] }] }, { type: "reward", id: "speech-demo:thanks", money: 5 }],
    });
  });
  const s = session([plugin]), before = s.game.state.money;
  assert(s.game.enter({ map: "LittlerootTown", x: 8, y: 10, dir: "up" }));
  await s.bus.execute("core.field.interact", {}); await s.settle();
  assert.equal(s.dialogs[0].lines[0].runs[0].effect, "speech-demo:float");
  assert.deepEqual(s.dialogs[0].options, { speed: 40, mode: "typewriter" });
  assert.equal(s.game.state.money, before + 5);
  assert(s.game.state.story.completed.includes("speech-demo:greeting"));
});
```

## 场景表现与队列

镜头位移/縮放用注册场景field，叠层用draw；先读[表现合同](../../docs/architecture/PRESENTATION.md)，无需改渲染器。镜头坐标和反投影共用服务，采样不写规则。多个NPC临时排队用escort.followers；成员必须有序相邻，parent parallel占用所有成员。它不是常驻伙伴跟随或任意队形控制；前往不同落点可用既有move/parallel。

完整例：[examples/scene-story.test.js](../../examples/scene-story.test.js)，项目根执行 `node --test examples/scene-story.test.js`。它使用真实剧情/服务与手动等待端口，证明注册镜头演出结束后才发奖励；浏览器还原须另验。真实切图仍用scene的遮盖提交，不能用纯色画面隐藏直接坐标写入。

<!-- runnable-example: examples/scene-story.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("a registered field scene focuses the view and gates a subsequent reward", async () => {
  const plugin = manifest("scene-demo", api => {
    api.presentation.scene("focus", {
      duration: 800, schema: objectSchema(),
      field: frame => ({ zoom: 1 + Math.sin(frame.progress * Math.PI) }),
    });
  });
  const { game } = session([plugin]), money = game.state.money;
  let finish;
  game.timeline.wait = () => new Promise(resolve => { finish = resolve; });
  const normal = game.cameraProjection();
  const running = game.runStory([
    { type: "presentation", id: "scene-demo:focus" },
    { type: "reward", id: "scene-demo:after", money: 5 },
  ]);
  await new Promise(setImmediate);
  assert.equal(game.state.money, money);
  assert.equal(game.cameraProjection({}, 400).width, normal.width / 2);
  assert(game.storyBusy); finish(); await running;
  assert.equal(game.state.money, money + 5);
  assert.equal(game.storyBusy, false);
  assert.deepEqual(game.cameraProjection(), normal);
});
```

## 秘密基地与长期房间编辑

先读[持久房间布局设计](../../docs/engine/world/ROOM_LAYOUTS.md)，再核对STATUS是否已有实际实现。world.patch的一批覆盖可保存，但不提供多格家具/旋转/布局库存的共同提交；插件store与另一次world.patch也不是原子事务。长期布局应有单一所有者，世界占位/碰撞/导航/交互从同一投影派生，不把设施局部data当房间存档。设计中的注册/命令尚未实现时，先做对应框架任务，再转写secret_base.c/decoration.c业务；原作放置权限与现代旋转扩展分别记录。代表验收和失败路径以该设计页为入口，不为家具名称在导演中增加分支。

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `Story region outside map:` | where越界或map目录键不存在；按注册地图width/height修正，不用截图坐标。 |
| `events.<id>: unknown prerequisite` | after引用未注册或漏命名空间的事件；<id>是实际报错中的事件ID。 |
| `Parallel story conflict:` | 并行命令占用了同一角色/镜头/资源；改为串行或拆开资源。 |
| `Expected finite JSON data` | 冻结上下文带undefined、NaN或函数；对象填写name/text等实际必要字段，不要用undefined占位。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [dist/engine/story.js](../../dist/engine/story.js) | `rg -n "class StoryEngine" dist tests docs package.json` |
| [dist/engine/world-state.js](../../dist/engine/world-state.js) | `rg -n "validateOperations" dist tests docs package.json` |
| [tests/story-language.test.js](../../tests/story-language.test.js) | `rg -n "Data-only plugin story" dist tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。

## 地区包的写入位置

原生对白/脚本/绑定放dist/content/stories并登记manifest；插件用api.story.registerBundle(localId,{version:1,scripts,dialogues,entries,projections?,sources?})。最小组合见[story-bundle例](../../examples/story-bundle.test.js)，参数和限制统一读剧情语言，不另维护一套字段表。局部脚本/对白引用在bundle内解析，跨包用注册返回的完整ID。

地图准备对象用纯projections；进入自动剧情用mapEnter，selector.reason区分start/travel/restore。触发后由宿主排队，不在渲染时执行命令。条件重叠用明确priority，默认0、通用兜底-100；同级同时命中报错，不依赖注册顺序。长剧情需durable+稳定node，公共call词法展开；稳定checkpoint和battle.onResult恢复规则见架构。旧短事件不自动获得战斗等待能力。

新bundle直接写的旗标/变量/奖励使用自身owner命名空间；领域操作使用已有公开合同。原始来源npcs和运行时Actor仍不是全部自动统一，未转写script继续明确pending。

## 修改已有世界

先读[现行世界编辑合同](../../docs/engine/world/STATE_AND_LIFECYCLE.md)，用core.world.objects取得对象ID、availability与capabilities，再通过world.patch修改；写命令需要world权限。不要用坐标临时拼ID或直接改地图/剧情目录。原作来源槽位是身份，导入不能重排；已命名业务对象保留ID。not-instantiated是待转写资料，不可当成已实现NPC；持续Actor使用actor命令。

普通talk/sign可以绑定注册的对白，按id查询可看到dialoguePreview及解析错误。商店/治疗/主线使用对应领域入口；对白模板必须能独立解析，不传调用parameters。feedback:true可附有效对象/地块；反馈报错但ok:true时不可重试已提交的写入。对白与图集来源纳入存档依赖，但不支持任意跨图集铺设、撤销、冲突所有权或跨批事务。

完整链路例：[world-editing](../../examples/world-editing.test.js)，在项目根运行`node --test examples/world-editing.test.js`。验证状态与证据查STATUS；不把示例存在当成已通过。它修改原生告示牌而非新增旁边的对象。失败边界见tests/world-editing.test.js；文件移动后搜索`core.world.objects`、`inspectWorldObjects`和`world.dialogue`。

<!-- runnable-example: examples/world-editing.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";

test("a mod discovers, replaces and reads back an existing sign dialogue", async () => {
  let api, dialogue;
  const plugin = manifest("sign-mod", value => {
    api = value;
    const exports = api.story.registerBundle("speech", { version: 1,
      dialogues: { greeting: { name: "告示牌", lines: ["桥梁维修中。"] } },
      scripts: {}, entries: {},
    });
    dialogue = exports.dialogues.greeting;
  }, ["world", "movement"]);
  const s = session([plugin]), map = "LittlerootTown";
  const listing = await api.commands.dispatch("core.world.objects", { map });
  const sign = listing.objects.find(o => o.kind === "sign" && o.x === 15 && o.y === 13);
  assert(sign.capabilities.fields.includes("dialogue"));
  const result = await api.commands.dispatch("core.world.patch", { feedback: true,
    operations: JSON.stringify([{ kind: "object", map, id: sign.id, changes: { dialogue } }]),
  });
  assert.equal(result.changes[0].object.dialogue, dialogue);
  assert(s.game.enter({ map, x: 15, y: 14, dir: "up" }));
  await api.commands.dispatch("core.field.interact", {}); await s.settle();
  assert.equal(s.dialogs.at(-1).lines[0].runs[0].text, "桥梁维修中。");
  s.game.loadDocument(s.game.exportDocument());
  assert.equal((await api.commands.dispatch("core.world.objects", { map, id: sign.id })).objects[0].dialogue, dialogue);
});
```
