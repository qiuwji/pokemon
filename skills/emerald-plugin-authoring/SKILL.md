---
name: emerald-plugin-authoring
description: 在现有绿宝石工程中制作或修改玩法插件、页面、表现和实时小游戏；定位真实公开接口、接入玩家入口并验证事务与保存。也用于评审插件是否绕过宿主合同；完整原作内容转写按对应领域 Skill 处理。
---

# 绿宝石插件制作

交付一条能被玩家使用的完整链路：**入口 → 预检 → 领域提交 → 反馈 → 保存恢复**。默认复用公开 API；先做最小可用行为，再扩充内容。注册成功、示例通过和真实玩家操作是不同证据。

## 快速接手

1. **定位真实仓库。** 仓库 `skills/` 是权威副本；本机安装可能是符号链接，先解析 Skill 的真实目录，再向上两级找仓库。确认同时存在 `package.json`、`src/engine/extensions/plugin-host.js` 和 `examples/`。相对链接以仓库里的 Skill 为基准。不要把 ChatGPT 的只读 `sources/` 镜像当开发目录，也不要另建一套引擎。
2. **确认本次范围。** 看工作树已有改动，保留他人的工作；读 [SCOPE](../../docs/project/SCOPE.md) 与 [STATUS](../../docs/project/STATUS.md) 中相关部分。用户只要方案或评审时不实现；历史方案和验证记录不代表当前代码。
3. **按下表选一个锚点。** 只读本任务需要的参考、合同和一个最接近的可执行例，不从头加载所有领域文档。先跑这个例确认环境，再改其业务部分。混合玩法先确定状态所有者，再按需补读第二个领域。
4. **核实公开接线。** 对实际输入查注册器、公开 schema、权限和生命周期；类型、文档与代码冲突时查实现及相关测试，明确差异，不能凭名字猜字段。尤其区分引擎内部对象与命令传输格式。
5. **做完一条真实路径。** 生产 manifest → catalog 装配 → 正常玩家入口 → 行为与成本 → 保存。缺口属于通用框架任务，按本次授权处理；不能用私有导入、伪造完成结果或直接写状态掩盖缺口。

## 按任务选参考和示例

| 本次任务 | 先读 | 最接近的可执行例 |
| --- | --- | --- |
| 详情入口、表单、页签、HUD、布局替换 | [界面与表现](references/ui-and-presentation.md) | [plugin-page](../../examples/plugin-page.test.js)、[表单夹具](../../tests/fixtures/extensions/form.js) |
| Canvas、帧动画、外观、相机、环境层 | [界面与表现](references/ui-and-presentation.md) | [plugin-canvas](../../examples/plugin-canvas.test.js)、[sprite-clip](../../examples/sprite-clip.test.js)、[visual-extension](../../examples/visual-extension.test.js) |
| 战斗规则、形态、招式派生、附加项 | [战斗与实时会话](references/battle-and-interactions.md)的战斗部分 | [battle-effect](../../examples/battle-effect.test.js)、[battle-attachment](../../examples/battle-attachment.test.js) |
| 持续输入、计时判定、小游戏 | [战斗与实时会话](references/battle-and-interactions.md)的实时会话部分 | [interaction-bar](../../examples/interaction-bar.test.js) |
| 野外入口、HM、移动玩法 | [世界与玩法](references/world-and-gameplay.md)的野外部分 | [field-action](../../examples/field-action.test.js)、[high-flight](../../examples/high-flight.test.js) |
| NPC、剧情、告示牌、动态遇敌 | [世界与玩法](references/world-and-gameplay.md) | [story-bundle](../../examples/story-bundle.test.js)、[world-editing](../../examples/world-editing.test.js)、[encounter-extension](../../examples/encounter-extension.test.js) |
| 设施、纯观察、AI控制、玩家联线 | [世界与玩法](references/world-and-gameplay.md)的对应部分 | [facility](../../examples/facility.test.js)、[automation](../../examples/automation.test.js) |
| 奖励、持久记忆、事务失败 | 下方边界与 [存档合同](../../docs/engine/SAVES.md) | [handoff](../../examples/handoff.test.js)、[validation](../../examples/validation.test.js) |

## 生产文件与装配

- 手写模块放 `src/plugins/<id>/` 或已有同类文件位置；派生素材放 `generated/plugins` / `generated/assets`。两棵输入树直接运行，**没有 dist 或复制构建步骤**，见 [SOURCE_LAYOUT](../../docs/development/SOURCE_LAYOUT.md)。不手改派生数据；原作 `work/pokeemerald/` 与同步 `sources/` 只读。
- 导出普通 manifest：`id`、`apiVersion:1`、语义版本 `version`、正整数 `dataVersion`、实际需要的 `permissions`、`setup(api)`；依赖及 `validateData` 按 [插件架构](../../docs/architecture/PLUGINS.md) 声明。`setup` 只注册，不查询未装配世界、不发命令、不发奖、不写存档。
- 在 [catalog](../../src/plugins/catalog.json) 登记 `id/module/export/enabled`；`module` 相对 catalog，工厂参数按 [内容管线](../../docs/development/CONTENT_PIPELINE.md) 配置。可选玩法遵循用户的启用要求；不要向 `app.js` 添加逐插件分支。开发准备动作使用已注册自身动作及合法 startup 配置，不能默认暴露测试发奖入口。
- `manifest()`、`session()` 来自 `tests/helpers/session.js`，**只用于测试**；生产代码不导入测试夹具或产品测试。插件可复用现有公开辅助函数，不能导入 adventure、应用服务或私有引擎对象绕过 API。
- `register(localId, ...)` 返回完整 `owner:localId`；保存返回值用于跨内容引用。UID 标识个体，seat/队伍下标标识当前位置；异步结束、换人、换图、读档后重新查询，不保留旧领域对象。

## 读、写与表现的边界

| 需要什么 | 使用什么 | 重要限制 |
| --- | --- | --- |
| 看世界、队伍、背包 | `api.query()` / 回调里的 `view.query()` | 深冻结快照；不把整份存档每帧重新投影 |
| 高频业务观察 | `api.queries.register(id,{schema,read})` | 同步、只读；与 action 的局部名不能重名 |
| 用户操作或领域写入 | `api.actions.register(id,{schema,run})` + `ctx.intent` | 同步事务，权限与意图合同由宿主校验 |
| 插件持久记忆 | `ctx.store`、已注册 `ctx.states` | 不复制核心队伍/库存；状态按 UID 与生命周期管理 |
| 页面与动画 | `api.ui` / `api.presentation` | 只展示已提交事实，不重算规则或取游戏 RNG |
| 战斗精灵/姿态与声音编排 | `api.presentation.sequence` + FrameSequenceBuilder | prepare同步、深冻结，在只读守卫下编译一次；播放仅消费数据。scenes控制裁剪/背景，statusBoxes控制框位移，sprites支持旋转/tint；转场帧保持黑屏提交所有权，fadePreviousMs允许新曲直接替换旧曲。见[公开例](../../examples/battle-sequence.test.js)、[完整生产战斗例](../../examples/battle-entry-exit.test.js)与[演出合同](../../docs/engine/presentation/ANIMATION_CONTRACT.md) |
| 持续小游戏 | `api.interactions.register` | 宿主驱动时钟、语义输入、帧数据与完成事务 |

所有对象 schema 明确 `additionalProperties:false`，数值/字符串/数组给业务边界；这是项目的 [DataSchema 子集](../../src/engine/extensions/values.js)，不支持任意 JSON Schema 关键字。

action 内只用当次 `ctx`，不缓存写端口，不 `await`，不再次 dispatch。事务外的用户操作可 `api.commands.dispatch`；查询、规则、渲染、实时会话纯回调均不得 dispatch 或修改领域状态。schema 通过也不代表拥有资格，提交点仍需按领域合同复检。

Actor 生成/更新/删除通过 `ctx.intent({kind:"actors",operation,...})`，声明 actors 权限。可选同步结果回调 `ctx.intent(value,onResult)` 在提交期间获取冻结结果，写插件记忆或追加意图；不可 await/dispatch，抛错整笔回滚，仍共用128次操作限额。具体字段见 [ACTORS](../../docs/engine/actors/ACTORS.md)。

多项写入走同一事务；后段失败必须恢复领域值、插件记忆和相关 RNG。事实用 `ctx.emit`，反馈用 `ctx.feedback`，成功提交后才发布。区分抛错、`{ok:false,reason}` 和“提交成功但反馈失败”；最后一种不能重试发奖或重抽随机数。

持久数据变化按当前严格 `dataVersion/validateData` 合同处理，不引入历史迁移旁路。停用插件后的硬引用由宿主暂停区保护，插件自有记忆保留；需要持久依赖时验证同一存储的停用、继续游玩与重新启用。临时相机/环境/页面租约及进行中的实时会话不能当成已保存数据。

## 最小可执行锚点

下例与 [plugin-page.test.js](../../examples/plugin-page.test.js) 完全同步。在项目根运行 `node --test examples/plugin-page.test.js`。它证明入口定义、布局、action 和保存重载；**没有证明浏览器点击、焦点或返回键**。复制到新的 `examples/*.test.js` 时保留真实宿主装配，生产 manifest 另放 `src/plugins/`。

<!-- runnable-example: examples/plugin-page.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
import { validateLayout } from "../src/engine/extensions/ui-registry.js";
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

## 选择最小有效验证

按 [TESTING](../../docs/development/TESTING.md) 对本次行为选证明，避免每次重跑全项目：

- 产品用例放 `examples/`，走真实注册器、应用服务和公开命令；核心合同放 `tests/`，使用最小夹具，不导入产品插件。只替代外部时钟/UI/存储等端口。
- 对新增行为至少验证成功路径和关键失败边界：资格/权限拒绝、后段失败不半写、重复提交、实际成本、保存恢复；只选与改动有关的边界，不给低影响文字修改加测试。对含随机判定的用例固定合法夹具与输入，不依赖偶然命中或胜负。
- 参数、组合机制、菜单入口等必须走公开路径；直接调用 `Battle` 或注册表不能证明命令 schema/玩家入口已接通。自动保存测试应检查实际存储内容并据此重载，不能只 `exportDocument()` 再导入证明落盘。
- 新 UI/持续输入另验键盘、触屏、焦点、取消与关闭释放。按用户授权和约束选择浏览器或端口验证；端口模拟、HTTP 200 与程序 dispatch 均不能声称已观察真实画面。
- 本 Skill 的纯文档改动只需元数据、`npm run check:docs` 与受影响示例。插件实现先跑专项；公开类型改变加 `check:contracts`；框架阶段收口才跑 `npm run check` / `npm run test:all`。Python工具仅在导入/内容管线变化时验证。

交付写明实际玩家入口、启用方式、修改与生成文件、执行命令/结果及未验证项；不要预填版本、测试数量或称整个原作已完成。接口变化同步类型、领域规格、Skill 和代表例；进度/验证记录按任务范围更新，历史证据不改写。用户未请求时不额外提交或发布。

## 常见错误与定位

| 现象 | 先检查 |
| --- | --- |
| `Core command permission denied` / `Undeclared core permission` | 公开命令的 plugin/permission 与 manifest 的实际权限；意图 kind 是否声明 |
| `Unsupported schema` / `unknown property` | DataSchema 子集、公开命令 schema 与传输格式，不能用内部类型推导请求 |
| `Unknown layout action` / `Invalid UI definition` | 完整注册 ID、真实 slot 与 layout 节点；不编造 DOM 或槽位 |
| `Expired transaction context` / `Nested plugin transactions` | 缓存了 ctx、事务中 dispatch/await，或在纯回调中写入 |
| 文件和测试都有，玩家看不到入口 | catalog 的 module/export/enabled、宿主实际挂载与正常输入路径 |
| 确认键触发野外行动却静默无响应 | `triggers:["interact"]` 不配 `menu:false`；确认页会通过 `fieldActionOptions()` 反查过滤后的列表 |
| 操作成功，刷新后结果丢失 | 自动保存实际落盘、忙碌锁释放时机；别用手动导出代替验证 |

链接移动时先在真实项目根搜索，不新建同名假接口：

| 合同所有者 | 代码锚点 / 搜索词 |
| --- | --- |
| 注册、只读保护、事务 | [plugin-host](../../src/engine/extensions/plugin-host.js)、[plugin-runtime](../../src/engine/extensions/plugin-runtime.js)；`class PluginHost` / `class PluginRuntime` |
| 公开类型、命令输入、权限 | [contracts](../../src/engine/contracts.d.ts)、[application-commands](../../src/game/emerald/commands/application-commands.js)、[extension-intents](../../src/game/emerald/commands/extension-intents.js)；`PluginAPI` / `registerEmeraldCommands` / `validateEmeraldIntent` |
| 布局与宿主位置 | [ui-registry](../../src/engine/extensions/ui-registry.js)；`UI_SLOTS` / `resolveLayout` |

完整规则边界查 [作者指南](../../docs/development/AUTHORING.md)。设计或历史外部评审中的名字必须先找到当前注册、调用点和行为测试，才能当可用 API。

## 地区地图复用

[公开网格游标](../../src/engine/extensions/region-map.js)接收内容提供的width/height/cells，只负责有界选择；宿主showRegionMap提供destinations、markers和onSelect，不替代travel或野外能力的命令权限。原作区域投影留pack，DOM留UI；普通查看不得修改持久状态。入口、来源与尚未复刻的地图细节见[界面规格](../../docs/development/EMERALD_UI.md)。
