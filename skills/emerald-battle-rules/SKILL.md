---
name: emerald-battle-rules
description: 演进现有绿宝石战斗规则、招式效果、状态、训练家、遭遇与AI，依据原作资料通过注册和阶段合同扩展。
---

# 战斗规则与保真接手

## 本领域核心名词

- **个体 UID**：精灵终身身份；保存、学习、装备、亲密度用它定位，换场仍不变。
- **控制者 / 席位 / 联盟**：控制者拥有队伍和行动权；席位是场上位置，换人可换占据者；联盟用于胜负联合判定，多控制者可属同盟。
- **RulePipeline**：按命名阶段调用数值修饰与规则钩子的管线；阶段合同决定输入和调用时机。
- **AttachedRules**：把特性、持有物等附着规则接入管线的服务，负责来源、触发和移除。
- **effect / op**：effect是招式引用的效果定义ID；op是定义内单步操作名，例如stages，不可混用。


先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)。读[BATTLE_ARCHITECTURE](../../docs/architecture/BATTLE.md)、[机制矩阵](../../docs/engine/battle/MECHANISM_MATRIX.md)及[MOVE_AUDIT](../../docs/engine/battle/MOVE_AUDIT.md)中本任务涉及的部分；目录登记不等于效果语义完整。

## 现有入口与示例

- 内容/插件注册trainers、encounters、battleStrategies、moveEffects、battleStates、abilities和heldItems；启动校验完整引用。看[encounter-content.test.js](../../tests/encounter-content.test.js)的trainer-pack和真实公共battle.start。
- [Battle](../../src/engine/battle.js)仅装配；[roster](../../src/engine/battle/roster.js)拥有联盟/控制者/席位/队伍。个体UID、席位ID和控制者ID不可互换；控制者各有槽位库存。
- [battle-states.test.js](../../tests/battle-states.test.js)示例替身/墙和插件状态；[control-states.test.js](../../tests/control-states.test.js)示例来源清理/延迟效果。先沿这些合同，不能把新招式塞回executeMove巨型分支。

## 规则工作

从固定修订battle_util、battle_script_commands、效果脚本及常量读取触发、优先级、目标、PP、伤害/状态、换人/倒下/结束清理依据。记录确认事实、项目取舍和待确认；禁止凭现代世代记忆改默认Gen3。

用注册效果/操作、明确结算阶段和状态生命周期表达规则；数值修饰只处理自己阶段。未知效果应注册校验失败；明确未支持行动不消费PP/RNG。临时招式、延迟行动、来源UID和一次结算沿现有所有者，不复制第二份状态。

训练家/遭遇是内容，AI是冻结查询→合法行动的独立策略。人类/AI经过相同预检；完整敌方队伍和联盟仍有活人才能继续，不能按画面上的一个精灵结束。单/双打便利格式不等于三打距离/轮盘，新增格式需显式政策。

领域先产生语义事件，动画注册消费其结果；表现不能计算命中或伤害。增强一次招式行动使用[battleAugments合同](../../docs/engine/battle/AUGMENTS.md)，真实插件见[招式增强合同测试](../../tests/battle-augments.test.js)，测试搜索`Registered plugin augment`。原槽PP、资源和限次由战斗服务持有，不能写一套插件扣费账本；完整Mega/Z业务仍须核对自己的世代规则。

## 验收与交接

战斗演出使用公开 `api.presentation.sequence` 与[帧编排合同](../../docs/engine/presentation/ANIMATION_CONTRACT.md)，参考[真实外部演出例](../../examples/battle-sequence.test.js)。内核只编译、校验和播放有界帧，原作时序、资源、轨迹和消息政策由内容编写。不构建原作指令解释器，不用通用粒子填补未覆盖招式。来源导出和总表审计见[战斗专项](../../docs/project/BATTLE_PRESENTATION_PLAN.md)；编排标记、素材来源、合同通过都不能当作逐帧/听音已验收。

入场可组合scenes的窗口/背景、sprites的图集/旋转/tint和statusBoxes位移；第一事件在遮黑时准备并在播放复用。退场用通用转场帧声明覆盖/颜色，不从动画回调提交奖励。曲目切换使用演出完成通知与AudioCue.fadePreviousMs。完整生产入口、结算/重入/失败验证见[battle-entry-exit.test.js](../../examples/battle-entry-exit.test.js)。物种姿态、特殊球及特殊战斗分支尚须按专项缺口逐项转写。

以一个真实新效果/状态/策略完成公开战斗。验证合法/非法选择、涉及的阶段次序、目标/来源离场、回合期限、失败回滚与PP/RNG；只查影响范围。更新审计对应条目、STATUS和证据，不写“354招式全部完成”之类无法由当前证明支持的结论。

## 两层策略（训练家 + 个体）

保留旧 `battleStrategies.decide(view)→index`（原视图/原索引/原随机消费）。新版训练家策略 `version:2`（`score`/`scoreJoint`/`init` + `parameters`/`memory`）与个体策略 `creatureStrategies`（`version:1`，按 UID）由宿主 `BattleAiRuntime` 合成为 `训练家贡献 + 个体贡献`；`best`/`topBand` 用独立 AI 随机流，不动游戏 RNG。绑定在训练家/队员 `ai`（`strategy` 与 `ai` 不可并存），队员优先、训练家默认。候选由 `BattleCandidateService` 统一生成（招式/目标/旧增强/声明式 `ai.variants`/换人/道具/接替），不消费 PP/道具/额度/RNG。`observed` 结构上不读隐藏数据，`full` 仅测试/特殊规则；未支持效果返回未知。记忆按控制者/UID、知识按观察方保存，`BattleCheckpoint` 一并恢复记忆/知识/AI RNG/决策/计划/解释。接替复用同一服务，规则强制换人仍走 `replacementPolicies`。只读解释查询 `core.battle.ai-view`。野生只带个体策略：配置放**注册遇敌表**的可选 `ai`，`encounter.request` 按 table 解析后经 `startEncounterBattle(..., ai)` 进战斗（暗雷/钓鱼/碎岩/Actor 共用，凭证只存 species/level，不改存档）。难度是内容约定：选不同策略实现 + `parameters` + `choice.band`（野生默认不绑训练家层=弱；训练家按剧情给 id/参数/宽容度），`information` 只区分观察边界、不作难度。代表例见 [ai-strategy.test.js](../../examples/ai-strategy.test.js) 与 [encounter-extensions.test.js](../../tests/encounter-extensions.test.js)。

## 招式注册与效果速查

`api.content.register(kind, localId, definition)` 返回 `插件ID:localId`。先注册 `moveEffects`，再把返回ID放到 `moves.effect`；具体招式基础字段见下方可运行示例。招式的 `target` 是战斗选目标模式；效果的 `target` 只允许 self/opponent，二者不要混用。

效果定义的常用字段：`primary`（纯操作路径）、`beforeDamage`（伤害前）、`afterDamage`（伤害后）、`secondary`（附加效果）、`onCharge`（蓄力时）、`action`（蓄力/连用/硬直政策）。每个阶段是 `[{op, ...参数}]`。`primary`不能和伤害阶段混合；概率来源是招式chance及执行器，不在回调重新掷骰。

以下是现有15个常用op；“无”表示只写 `{op:"名称"}`。**操作不是任意阶段都可安全调用**，还需要对应context；按现有效果及针对性测试选阶段。

| op | 参数 | 用途与常见放置位置 |
| --- | --- | --- |
| stages | target必填self/opponent；changes为能力名→非零整数，绝对值≤6 | primary/secondary/onCharge；能力名atk/def/spa/spd/spe/acc/eva |
| status | status必填poison/toxic/burn/paralysis/sleep/freeze | 给本次对方目标施加异常；primary或secondary，不能假设target:self会改变对象 |
| confuse | 无 | 对方混乱；primary/secondary |
| flinch | 无 | 对方畏缩；通常secondary，必须验证行动次序 |
| focus | 无 | 自身集中精神；primary，效果target:self |
| protect | 无 | 自身本回合保护；primary，效果target:self；连续成功政策不能靠此单op臆测 |
| rest | 无 | 自身回复并睡眠；primary，效果target:self，异常资格由规则检查 |
| restoreHP | amount或fraction，取amount优先，须有限正数 | 回复context.target；自疗定义用target:self；fraction作为比例并封顶HP |
| cureStatus | status为上述异常之一或any | 解除context.target异常；须配置正确效果目标 |
| drain | fraction，0＜值≤1 | afterDamage；按实际造成的伤害吸血，操作scope为action |
| recoil | fraction，0＜值≤1 | afterDamage；反伤，scope为action |
| applyBattleState | id必填已登记状态；target可选self/opponent，默认opponent；data可选，duration按状态合同 | primary等；附着到席位，来源和生命周期由状态服务持有 |
| createSubstitute | 无 | primary，效果target:self；支付HP并创建substitute，不是视觉特效 |
| setWeather | weather必填注册ID；turns可选正整数，缺省无限期限 | primary，通常效果target:self；世界天气与战斗天气不是同一状态 |
| futureAttack | delay必填整数1..10000 | primary，现有效果配bypassHitChecks；延迟结算沿ActionLifecycle，不复制定时器 |

完整清单由 [MoveEffectRegistry](../../src/engine/move-effects.js) 构造器汇合 `MOVE_OPERATIONS`、COMMON_OPERATIONS、traits/state/special及其他operation模块，**并非只读一个常量就完整**。搜索 `new EffectRegistry`、`OPERATIONS`、`.validate` 定位实现/参数校验；也可只读运行：

```sh
node --input-type=module -e 'import {MoveEffectRegistry} from "./src/engine/move-effects.js"; console.log(Object.keys(new MoveEffectRegistry().operations.operations).sort().join("\n"))'
```

自定义moveEffects是现有op的组合；插件公开API目前不提供任意函数注册新op。确需新规则语义时提交框架接口任务，不能让插件导入引擎并覆写注册表。具体类型入口：[contracts.d.ts](../../src/engine/contracts.d.ts)，兜底搜索 `MoveEffectRegistry`、`ContentKind`、`EffectStep`；无类型的部分以校验器和实际例为准，不能把类型声明当额外能力。

## 最小完整示例

接口锚点：插件 API 1；此示例与仓库可执行文件同步。当前工程版本查 package.json，完成度查 STATUS，不能据本段推断全作已完成。

文件：[examples/battle-effect.test.js](../../examples/battle-effect.test.js)。在项目根执行 `node --test examples/battle-effect.test.js`。示例为项目测试行为；不声称是原作完整内容。

[装配夹具](../../tests/helpers/session.js)使用真实注册器、应用服务与命令总线，仅替代浏览器UI/等待并准备测试队伍。复制时保存为 `examples/` 下的新 `.test.js`，相对导入才正确；浏览器装配另见[作者指南](../../docs/development/AUTHORING.md)。

<!-- runnable-example: examples/battle-effect.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("registered move effect runs in a real trainer turn", async () => {
  const plugin = manifest("battle-demo", api => {
    const effect = api.content.register("moveEffects", "focus", {
      target: "self", primary: [{ op: "stages", target: "self", changes: { atk: 1 } }],
    });
    api.content.register("moves", "focus", {
      name: "蓄势示例", power: 0, accuracy: 0, pp: 20,
      type: "normal", effect, priority: 0, chance: 0, target: "self",
    });
  });
  const { game, bus, mon } = session([plugin]);
  // Arrange the move; teaching/learning is a separate domain contract.
  mon.moves = [{ id: "battle-demo:focus", pp: 20 }];
  await bus.execute("core.battle.start", { trainerId: "youngster" });
  const battle = game.battle;
  assert(battle);
  await bus.execute("core.battle.action", { kind: "move", index: 0 });
  assert(battle.events.some(e => e.kind === "stage" && e.actorUid === mon.uid && e.targetUid === mon.uid && e.stat === "atk" && e.amount === 1));
  assert.equal(mon.moves[0].pp, 19);
  assert(mon.hp > 0);
});
```

## 常见错误与排查

报错路径和ID会变化，下列为源码原文或可搜索的关键部分；先区分抛错和 `{ok:false,reason}` 返回。

| 报错或关键部分 | 原因与处理 |
| --- | --- |
| `moves.<id>.effect: unknown effect` | 招式引用的效果未注册或ID不带命名空间；使用content.register返回值。 |
| `effects.<id>: primary cannot mix with damage phases` | 纯primary效果与beforeDamage/afterDamage/secondary/hits等互斥；按纯变化或伤害后效果拆定义。 |
| `effects[0]: unknown operation` | 路径前缀/序号会随阶段变化；op拼错或未注册，按实际操作表核对。 |
| `invalid stage change` | stages必须写target、非空changes；能力名需合法，每项为非零且绝对值不超过6的整数。 |
| `Unknown trainer strategy` | strategy引用缺失或漏命名空间；先注册battleStrategies再引用返回ID。 |

## 文件变动时如何定位

先确认收到完整仓库；链接失效时在项目根使用以下关键词检索，不新建同名假接口：

| 优先文件 | 兜底搜索词 |
| --- | --- |
| [src/engine/move-effects.js](../../src/engine/move-effects.js) | `rg -n "class MoveEffectRegistry" src generated tests docs package.json` |
| [src/engine/battle/roster.js](../../src/engine/battle/roster.js) | `rg -n "class BattleRoster" src generated tests docs package.json` |
| [src/engine/rules/attachments.js](../../src/engine/rules/attachments.js) | `rg -n "AttachedRules" src generated tests docs package.json` |

接口或示例变化时同一任务更新Skill、规格和对应可执行示例，运行 `npm run check:docs` 检查链接/代码片段同步；它不证明游戏行为。代码边界、工具影响和测试写法统一见[作者指南](../../docs/development/AUTHORING.md)和[测试指南](../../docs/development/TESTING.md)。

入场队伍条用公开sprites与holdFinal保持对白期末帧；并行对白由会话交接，不能另建HUD计时器。地图间音乐遵循地图政策与转场资源租约，音频包默认渐变不等于原作切图时序。
