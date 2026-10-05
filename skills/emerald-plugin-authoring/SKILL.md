---
name: emerald-plugin-authoring
description: 通过现有插件公开API扩展绿宝石的内容、规则、状态、页面交互、持久化和表现，或用代表例定位真实接口缺口。
---

# 插件玩法与界面接手

## 本领域核心名词

- **命名空间**：注册局部ID返回owner:localID；跨内容引用应保存返回值，而非拼错字符串。
- **action / intent**：action接收输入并提交一组事务意图；intent请求既有领域写入，须有对应权限。
- **store / states**：store保存插件自有记忆；states保存附着对象、可到期的状态；不复制核心队伍/库存。
- **slot / page / layout**：slot是宿主提供的位置；page注册页面；layout是渲染端接受的声明式控件树。
- **事务 / 事实事件**：事务失败恢复领域及插件数据；事件和视觉反馈在成功提交后才发出。


先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)、[PLUGIN_ARCHITECTURE](../../docs/architecture/PLUGINS.md)。现代能力/复杂UI缺口读[PLUGIN_EVOLUTION](../../docs/project/PLUGIN_ROADMAP.md)，但先核对实际代码；历史外部评审不能当当前状态。

## 最小真实锚点

[页面例](../../examples/plugin-page.test.js)串联详情入口、action和自有记忆；[plugins.test.js](../../tests/plugins.test.js)用测试专用夹具验证状态、互动、保存及失败回滚。[世界剧情例](../../examples/world-story.test.js)演示内容/世界。[ANIMATION_CONTRACT](../../docs/engine/presentation/ANIMATION_CONTRACT.md)描述注册演出和纯取样。

## 编写插件

manifest声明命名空间、当前apiVersion/dataVersion、权限和依赖。setup只注册，不在注册时开始行动/发网络/写存档。保留目录引用、重复/未知ID启动拒绝；插件数据严格当前schema，不引入历史迁移旁路。

页面/入口/HUD通过ui注册，点击控件调用action；context携带UID，schema明确允许输入。查询深冻结；写入通过commands或事务intent，不能抓全局game、DOM、localStorage或直接写队伍。ctx.store自有记录和通用states表示插件记忆/状态，既有领域值仍由原所有者修改。

事件是提交后事实，事务失败恢复领域和插件数据；只读规则回调不能发命令，异步表现不参与规则结果。注册视觉/招式/语义事件编排，复用纯时序、时钟和reducedMotion；音频注册真实资源，不能退回合成提示音。

当前宿主区域/布局节点/主题能力以代码和规格为准；不能给未知slot/节点编造支持。大型现代机制同时核对资格、行动增强、资源/PP、限次、清理和事件；不能把形态变换当整个Mega/Z系统。一次招式增强可用[battleAugments合同](../../docs/engine/battle/AUGMENTS.md)和[招式增强合同测试](../../tests/battle-augments.test.js)，搜索`core.battle.augments`定位查询；替换范围、消费点及不支持项按该规格。实际公开合同缺口归框架任务，不让插件导入核心绕过。

## 插件剧情与对话

扩展地区、NPC或告示牌时，用api.story.registerBundle注册同一目录合同，返回完整脚本/对白/入口引用；不向app.js逐剧情加分支。真实组合例见[story-bundle](../../examples/story-bundle.test.js)，字段见[剧情语言](../../docs/engine/story/STORY_LANGUAGE.md)，职责/恢复边界见[剧情架构](../../docs/architecture/STORY_CONTENT.md)。

selector绑定对象/原label，priority明确竞争关系；公共call使用schema参数，对话bindings只读取声明标量。直接旗标/变量/奖励写用自身命名空间。选择后果由领域命令提交，不放文字效果/渲染回调；reward.onResult处理真实容量结果，不能提前标记领取。

需要战后自动继续时，脚本声明durable并为每条分支命令设稳定node，checkpoint只放稳定点，battle.onResult接确认结果；短battle只发起，不能假定等待胜负。调用复用用call，不创建嵌套会话；活跃战斗不保存，未知节点/缺依赖不静默跳过。原作业务转写另用剧情Skill，不把框架能力视为全部原作已完成。

## 既有页面与复杂交互

使用 `api.ui.region(id,{slot,mode?,render,when?,priority?})` 直接挂入宿主区域，使用 `api.ui.component(id,{schema,render})` 复用声明式组合。表单字段通过name一次提交，页签由适配器持有临时选择；插件store保存业务记忆，库存仍查核心。宿主名称、字段参数、主题/布局及生命周期查[UI_CONTRACT](../../docs/engine/presentation/UI_CONTRACT.md)。测试锚点是[表单测试夹具](../../tests/fixtures/extensions/form.js)及[plugin-ui测试](../../tests/plugin-ui.test.js)，文件移动搜索 `ui.region`、`resolveLayout`、`Real bag page`。

默认区域追加；party.list、battle.actions/moves/targets支持mode:replace/hide，button.native复用context.controls提供的原控件。按[UI合同](../../docs/engine/presentation/UI_CONTRACT.md)调整布局/顺序/文本，不接收DOM，不向render里放命令；原禁用状态与原战斗授权继续由宿主管理。查[native-ui-regions测试](../../tests/native-ui-regions.test.js)确认失败回退、竞争优先级和关闭后句柄失效。不要假定能替换原生HUD、注册任意DOM控件、热卸载，或让普通插件事务在战斗/设施期间执行。真正缺口按领域合同补，不通过页面回调绕过规则。

## 验收

涉及暗雷替换、动态实体接触、外观、相机或迷雾时，先读[公开能力演进](../../docs/project/PLUGIN_ROADMAP.md)的现状表，再核对实际公共类型与测试。不要用剧情触发器代替接触路由，用能力倍率伪装关闭遭遇，用更换移动模式伪装换装，或把视觉雾当作探索状态。未实现的合同应按领域任务补注册/查询/命令/生命周期与代表测试，不让玩法插件导入应用服务。

一个插件通过已有页面入口完成点击→真实行为→状态/反馈→保存重载。验证无权限拒绝、重复/坏引用、事务后段失败回滚、缺插件保护原档、相应表现释放。新UI控件需真实浏览器焦点/取消/输入观察；代码结构通过不能代替可用性。

更新STATUS和领域规格，明确实现能力与后续内容。网络控制复用[NETWORK_ARCHITECTURE](../../docs/architecture/NETWORK.md)的命令协议，不另造任意脚本注入或承诺多人同步。

## 玩家联线与单机控制

需要两个玩家实际交换/对战时，先读[玩家联线设计](../../docs/architecture/PLAYER_LINK.md)并核对STATUS。现有NetworkGateway只控制一份存档，连接内去重不保证跨重连成交；core.trade的本地伙伴池不是远端所有者。设计中的联线API尚未实现，先完成会话、持久决策和领域托管框架，再写业务插件；不能通过远端JSON改队伍或整档覆盖。验收使用两份独立存档和断线/重启后的真实领域状态，而非双方都显示成功。现有网络例和规则证据继续复用，只验证新增边界。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/plugin-page.test.js](../../examples/plugin-page.test.js)。在项目根执行 `node --test examples/plugin-page.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../tests/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/plugin-page.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
import { validateLayout } from "../dist/engine/extensions/ui-registry.js";
test("detail entry renders a clickable action with persistent memory", async () => {
  let api;
  const plugin = manifest("page-demo", value => {
    api = value;
    const action = api.actions.register("pet", { schema: objectSchema(),
      run: ctx => ctx.store.set("pets", (ctx.store.get("pets") || 0) + 1),
    });
    const page = api.ui.page("care", { title: "互动示例",
      render: () => ({ kind: "button", text: "抚摸", action }),
    });
    api.ui.entry("care", { slot: "monster.detail", label: "互动", page });
  });
  const { game, host } = session([plugin]);
  const entry = host.ui.inSlot("monster.detail").find(e => e.owner === "page-demo");
  const page = host.ui.pages.get(entry.page);
  const layout = page.render(host.runtime.view("page-demo", { uid: game.state.party[0].uid }));
  validateLayout(layout, { actions: host.actions, resources: {}, themes: host.ui.themes });
  await api.commands.dispatch(layout.action, {});
  assert.equal(api.store.get("pets"), 1);
  game.loadDocument(game.exportDocument());
  assert.equal(api.store.get("pets"), 1);
});
```

此例验证详情页入口、合法控件、与点击相同的action提交和保存；真实鼠标/焦点/返回键须按浏览器清单另验，不能把dispatch写成已验点击。

## 遇敌与动态世界扩展

读[遇敌/接触合同](../../docs/engine/world/ENCOUNTERS_AND_CONTACTS.md)。插件可注册encounterPolicies关闭指定地图的step暗雷，查询地图格子/有效地区表，经宿主种子无放回选格，创建Actor并prepare唯一个体凭证，最后监听稳定接触请求战斗。比例、游走和视觉属于插件业务；不要复制个体、伪造接触、在绘制中发命令，或调用剧情作为旁路。准备和结果渠道不触发原生剧情。

这是独立验收例，使用原有地区表和占位标记，未实现完整可见野生宝可梦插件；外观、相机和环境组合合同见[外观与视图](../../docs/engine/presentation/APPEARANCE_AND_VIEW.md)，探索可见性后续查PLUGIN_ROADMAP。ActorUID/个体UID/凭证ID是三个不同身份。

<!-- runnable-example: examples/encounter-extension.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("a plugin controls step encounters and opens a contact-owned wild battle", async () => {
  let api;
  const plugin = manifest("visible-demo", value => {
    api = value;
    api.content.register("encounterPolicies", "quiet", { channel: "step", priority: 100,
      when: c => c.position.map === "Route101", decide: () => null });
    api.content.register("actorTemplates", "marker", {
      name: "Encounter marker", actor: "ProfBirch", behavior: "still" });
  }, ["actors", "encounters", "movement"]);
  const { game } = session([plugin]);
  game.enter({ map: "Route101", x: 5, y: 11, dir: "up" });
  const region = await api.commands.dispatch("core.world.cells", { x: 5, y: 10, width: 1, height: 1 });
  assert.equal(region.cells[0].collision, 0);
  const { actor } = await api.commands.dispatch("core.actor.spawn", {
    template: "visible-demo:marker", position: { map: "Route101", x: 5, y: 10, dir: "down" } });
  const { ticket } = await api.commands.dispatch("core.encounter.prepare", { actor: actor.uid, area: "land" });
  const story = structuredClone(game.state.story);
  assert.equal(game.battle, null);
  assert.equal((await api.commands.dispatch("core.encounter.policy", { channel: "step" })).decision, null);
  await api.commands.dispatch("core.field.move", { direction: "up" });
  const contact = api.query().contacts[0].sequence;
  assert((await api.commands.dispatch("core.encounter.request", { ticket: ticket.id, contact })).ok);
  assert.equal(game.battle.enemy.species, ticket.species);
  assert.deepEqual(game.state.story, story);
});
```

## 外观、相机与独立环境层

先读[外观与视图合同](../../docs/engine/presentation/APPEARANCE_AND_VIEW.md)。外观配方、持久身份选择、临时覆盖租约与规则结果分开；不通过worldPatch或更换移动模式伪装玩家换装。身体/服饰共享方向与时钟，姿态图集和透明衣服素材由插件内容提供。持久Actor可使用appearance模板和emerald-species参数外观，密度明雷通过地区凭证保持个体唯一所有权。

相机profile定义逻辑格数/缩放；租约选择焦点和优先级，剧情镜头覆盖后回到有效选择。绘制和指针反变换必须复用同一投影，不能另写320×224偏移计算。普通雾气使用独立environmentLayers，可与逻辑天气叠加；战争迷雾的探索记忆与视线政策尚未实现，不能承诺灰层就是探索系统。临时租约不会保存，插件需要持久偏好时用自己的store记录业务意图并在合法时机重新申请。

下面是公开API的最小组合例，不安装完整换装/明雷玩法；browser真实画面与点击需另验。若源码移动，搜索`AppearanceSelections`、`core.camera.acquire`、`environmentLayers`。

<!-- runnable-example: examples/visual-extension.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("a plugin composes appearance, camera range and independent fog", async () => {
  let api;
  const plugin = manifest("visual-demo", value => {
    api = value;
    api.content.register("appearances", "outfit", { name: "示例外观",
      variants: { default: { layers: [{ kind: "actor", actor: "ProfBirch", y: -16 }] } },
    });
    api.content.register("cameraProfiles", "wide", { name: "远景", columns: 30, rows: 20 });
    api.content.register("environmentLayers", "mist", { name: "雾层", visual: "weather.fog", opacity: 0.3 });
  }, ["appearance", "camera", "environment"]);
  const { game } = session([plugin]);
  const before = structuredClone(game.state.position);
  await api.commands.dispatch("core.appearance.set", { target: { kind: "player" }, appearance: "visual-demo:outfit" });
  const camera = await api.commands.dispatch("core.camera.acquire", { profile: "visual-demo:wide" });
  const mist = await api.commands.dispatch("core.environment.acquire", { layer: "visual-demo:mist" });
  assert.equal((await api.commands.dispatch("core.camera.view", {})).width, 480);
  assert.equal(api.query().view.environment.length, 1);
  assert.deepEqual(game.state.position, before);
  await api.commands.dispatch("core.camera.release", { token: camera.token });
  await api.commands.dispatch("core.environment.release", { token: mist.token });
  game.loadDocument(game.exportDocument());
  assert.equal(api.query().view.environment.length, 0);
  assert.equal(game.appearanceFrame({ kind: "player" }, {}).appearance, "visual-demo:outfit");
});
```

## 资源帧动画

按[帧片段合同](../../docs/engine/presentation/SPRITE_CLIPS.md)注册 `api.presentation.sprite`。片段是已注册resource、裁切和帧时长，不是绘制函数或规则行为；species/view绑定用于详情页替换。不要在UI按物种添加分支或重复加载图片。缺多帧素材时保持单帧，不凭资源高度宣称原作动画时序已还原。

真实组合例：[examples/sprite-clip.test.js](../../examples/sprite-clip.test.js)，项目根执行 `node --test examples/sprite-clip.test.js`。它使用Canvas/时钟端口，验证真实插件→选择→播放器→停止；浏览器视觉、缩放与页面关闭须另验。宿主清理由ownModalResource管理，不让插件自己握住页面节点。

<!-- runnable-example: examples/sprite-clip.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
import { SpriteCanvas } from "../dist/adapters/sprite-canvas.js";
test("a registered detail clip is selected, sampled and cleaned up by the real player", () => {
  const plugin = manifest("sprite-demo", api => {
    api.presentation.sprite("detail", {
      width: 64, height: 64, loop: true,
      match: { species: "mudkip", view: "detail" },
      frames: [0, 64].map(y => ({ resource: "poochyena-front",
        rect: { x: 0, y, width: 64, height: 64 }, durationMs: 50 })),
    });
  });
  const { game } = session([plugin]), before = structuredClone(game.state);
  let now = 0, pending = null;
  const draws = [], canvas = { width: 64, height: 64, getContext: () => ({
    clearRect() {}, drawImage: (...args) => draws.push(args),
  }) };
  const player = new SpriteCanvas({ canvas,
    assets: { "poochyena-front": { width: 64, height: 256 } },
    clock: { now: () => now, request: fn => { pending = fn; return 1; },
      cancel: () => { pending = null; } },
  });
  player.play(game.spriteClips.find("mudkip", "detail"));
  assert.equal(draws.at(-1)[2], 0); now = 50; pending();
  assert.equal(draws.at(-1)[2], 64); player.stop();
  assert.equal(pending, null);
  assert.deepEqual(game.state, before);
});
```

## 内嵌 Canvas 与视觉生命周期

按[UI合同](../../docs/engine/presentation/UI_CONTRACT.md)注册presentation视觉，再在页面/区域/HUD返回canvas节点。树仅保存visual、尺寸和schema参数，不能塞draw函数；draw使用冻结frame和第三参数assets，循环由宿主帧驱动。点击由宿主产生pointer坐标并调用action，schema须声明context/input/pointer。不要在绘制里发命令、取游戏RNG或自行启动计时器。隐藏页签暂停，页面重建重新挂载，关闭释放；循环定义不能用于一次性play/feedback。

[最小完整例](../../examples/plugin-canvas.test.js)在项目根运行 `node --test examples/plugin-canvas.test.js`；[Canvas端口夹具](../../tests/helpers/canvas-extension-fixture.js)只替代外部DOM，不替代注册器、时间采样或命令事务。当前默认插件清单查catalog和STATUS；需要浏览器验收时按作者指南注册自己的示例，生产插件放dist/plugins，入口只装配。文件改名搜索 `class VisualTimeline`、`class VisualCanvas`、`kind: "canvas"`。

<!-- runnable-example: examples/plugin-canvas.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
import { canvasAdapter } from "../tests/helpers/canvas-extension-fixture.js";
test("a plugin mounts a looping clickable visual with saved interaction and host cleanup", async () => {
  let api;
  const frames = [], plugin = manifest("canvas-demo", value => {
    api = value;
    const visual = api.presentation.register("portrait", { duration: 100, loop: true,
      draw: (_ctx, frame) => frames.push(frame.progress),
    });
    const action = api.actions.register("touch", { schema: objectSchema({ pointer: objectSchema({
      x: { type: "number" }, y: { type: "number" }, source: { type: "string" },
    }, ["x", "y", "source"]) }, ["pointer"]), run: (ctx, input) => ctx.store.set("point", input.pointer) });
    const page = api.ui.page("portrait", { title: "互动", render: () => ({
      kind: "canvas", width: 200, height: 100, visual, action, alt: "互动画像",
    }) });
    api.ui.entry("portrait", { slot: "monster.detail", page, label: "互动" });
  });
  const s = session([plugin]), a = canvasAdapter(s);
  a.ext.showPage("canvas-demo:portrait"); a.frame(0); a.frame(125);
  assert.deepEqual(frames, [0, 0.25]);
  await a.root.querySelector("button").onclick({ detail: 0 });
  assert.deepEqual(api.store.get("point"), { x: 100, y: 50, source: "keyboard" });
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(api.store.get("point").x, 100);
  a.shell.closeModal(); a.frame(200);
  assert.equal(a.ext.layout.canvases.size, 0);
});
```

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `Core command permission denied` | 插件没有命令要求的权限，或该命令不对插件开放；核对注册permission。 |
| `Undeclared core permission` | ctx.intent的kind未在manifest.permissions声明；只增加实际使用的权限。 |
| `Invalid UI definition` | slot不存在或page/render/title/label缺失；先核对UI_SLOTS和宿主表，不凭页面名称猜slot。 |
| `Unknown layout action` | 控件action不是已注册完整ID；使用actions.register返回值。 |
| `Expired` | 保留了上次事务ctx；每次在run中新获取context，不闭包缓存store写端口。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [dist/engine/extensions/plugin-host.js](../../dist/engine/extensions/plugin-host.js) | `rg -n "class PluginHost" dist tests docs package.json` |
| [dist/engine/extensions/ui-registry.js](../../dist/engine/extensions/ui-registry.js) | `rg -n "UI_SLOTS" dist tests docs package.json` |
| [examples/plugin-page.test.js](../../examples/plugin-page.test.js) | `rg -n "monster.detail" dist tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。

## 浏览器装配入口

受信任本地插件在dist/plugins/catalog.json登记模块/导出名/默认启用及工厂输入；不再向app.js增加逐插件分支。见[内容管线的插件部分](../../docs/development/CONTENT_PIPELINE.md)。新增后验证实际host装配；仅登记文件不证明功能。E2E插件必须显式测试环境启用，不能默认暴露发奖命令。此处没有热卸载或远程沙箱。

## 只读查询与AI消费方

纯观察使用api.queries.register(localId,{schema,network?,read(view,input)})；冻结view支持query/store.get/states.list，回调同步且禁止dispatch。不要用action事务承载频繁观察，也不要给写动作开放concurrent绕过锁。查询与action的局部命令名不可重复。默认AI插件位于dist/plugins/ai-control，真实移动回执、连续执行、事件游标和命令附状态见[插件指南](../../dist/plugins/ai-control/README.md)。以moved判断移动，不把accepted或网络ok当作走动；查询用detail选择字段并保存nextCursor，gap时刷新状态。长轮询由传输承担，不能在插件事务里嵌套异步路线。测试插件、语义UI端口和命令行通道见[AI控制指南](../../docs/development/AI_CONTROL.md)；当前默认装配只查catalog，Skill不维护固定名单。

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
