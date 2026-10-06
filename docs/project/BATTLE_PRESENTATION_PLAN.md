# 战斗画面复刻专项（调研与计划）

目标：让战斗画面与《Pokémon Emerald》原作一致，覆盖 **入场动画、换人、出场结算、对战台词、逐招式战斗动画、转场和战斗 UI**。这是长期专项，分期推进；规则保真仍由[战斗规则 Skill](../../skills/emerald-battle-rules/SKILL.md)与[机制矩阵](../engine/battle/MECHANISM_MATRIX.md)负责。本文是调研结论与排期，不是完成声明。

**进度（已落地）**：
- P1 图元参数化与配方：战斗图元（`ring/contact/projectile/flame/bubbles/status/sparkle/slash/bolt/leaves/beam/rocks`）改为通用参数化绘制（`color/color2/count/…/arc/…`），默认值等于旧行为；每招配方在 pack 用 `parameters` 声明观感。`TYPE_COLORS` 已从表现层移除，改由装配注入 `typeColors` 调色板端口（`battle-palette.js`），表现层零内容名。写了 `tackle/ember/water_gun` 及开局切片（`pound/scratch/slash/cut/quick_attack/growl/leer/tail_whip/howl/harden/focus_energy/mud_slap/bubble/absorb/sand_attack/string_shot/poison_sting/peck/rock_throw/…`）配方，并有开局覆盖回归测试。测试 `tests/pixel-effects.test.js`、`tests/visual-registry.test.js`、`tests/presentation.test.js`、`examples/move-animation.test.js`；定点触发见 `tools/scenarios/battle-moves.json`。
- P2 首片：入场滑入 + 训练家战双方抛球 + 换人“收回→投球→放出”。**分层修正**：表现层不再含任何绿宝石内容——入场地形/球资源由 pack 的 [`battle-intro.js`](../../src/packs/emerald/battle-intro.js)、战斗背景由 [`battle-backgrounds.js`](../../src/packs/emerald/battle-backgrounds.js)、属性→动画 profile 由 [`animation-profiles.js`](../../src/packs/emerald/animation-profiles.js) 的 `emeraldMoveProfile` 提供，`app.js` 注入；`battle-canvas.js`/`battle-director.js` 只做通用绘制与查表。战斗台词改为可注册（`api.presentation.message`）。测试见 `tests/presentation.test.js`、`tests/battle-messages.test.js`。
- P1 起步：新增内容目录 [`battle-messages.js`](../../src/packs/emerald/battle-messages.js)（对应 `battle_message.c` 分类）与 `BattleDirector.resolveMessage` 解析端口（app.js 装配）；领域事件可携带 `message:{id,params}`，已迁移入场、使用了招式、命中结果、未命中、没有效果、倒下、能力升降、捕捉成功、投球、逃脱/无法逃脱、异常/混乱/着迷、形态变化、天气变化等，`text` 保留兼容。测试见 `tests/battle-messages.test.js`（并逐条断言目录输出等于原显示文本）。
- P3 起步：`animations.js` 为当前切片常见招式补充具名脚本（howl/harden/focus_energy/sand_attack/string_shot/poison_sting/peck），减少通用回退；真正的 `battle_anim_scripts.s` 导入管线仍未开始。
- 仍未开始：抛球后的血框滑入、其余台词迁移、逐招式动画导入管线。

## 一、原作的战斗演出结构（只读参考 `work/pokeemerald`）

| 层 | 原作文件 | 规模 | 作用 |
| --- | --- | --- | --- |
| 入场演出 | `src/battle_intro.c` | 551 行 | 按环境选 `BattleIntroSlide1/2/3`；训练家/精灵滑入、投球、血框滑入 |
| 转场 | `include/battle_transition.h`、`src/battle_transition.c`、`src/battle_setup.c` | 28 种 | 普通/洞窟/闪光/水面 × 强弱，选择表在 `battle_setup.c:116-127` |
| 战斗台词 | `src/battle_message.c` | 3078 行，~959 个字符串 | `gBattleStringsTable` + `{B_MSG_*}` 占位符，`BattleStringExpandPlaceholders` |
| 战斗流程 | `data/battle_scripts_1.s`、`src/battle_script_commands.c` | 4562 行 | 招式的消息/伤害/异常/动画按脚本命令次序播放 |
| 招式动画 | `src/battle_anim.c` 与 `battle_anim_{type}.c`、`data/battle_anim_scripts.s` | 脚本 10763 行/356 个 `Move_*` | 每招式一段动画脚本，调用动画指令/粒子/位移 |
| 战斗 UI | `src/battle_interface.c` | — | 血框、HP 条、异常图标、菜单、目标指示布局 |

原作的演出是**数据驱动**：消息与动画都挂在战斗脚本的时序上，不是散落在规则里。

## 二、仓库现状

- 领域：`src/engine/battle.js` 的 `emit(text, kind, meta)` 把结果写成带中文文本的语义事件（全库 128 处 `emit`，kind 有 `entry/move/hurt/faint/switch/heal/ball/capture/level/text/end/learn/choice/vacancy/failed/stage/status/trait/form/weather/state/item/barrier/money/scheduled/wait/charge`）。
- 时序：`src/engine/battle-session.js` 顺序把事件交给 `BattleDirector.play`；进入/退出走 `transitions.run`。
- 演出：`src/presentation/battle-director.js`（392 行）拥有每 kind 的时长、姿态与取样；入场是线性滑入，招式是 `lunge` + 注册脚本取样。
- 招式视觉：`src/packs/emerald/animations.js` 只有 **44 条**具名招式脚本 + 通用回退（contact/projectile/status）；`PresentationRegistry` 支持 `registry.move` 与 `api.presentation.battle` 注册语义事件演出。
- 转场：`src/packs/emerald/battle-transitions.js` 已移植 4 种开场图案（`pokeballs-trail/angled-wipes/slice/white-bars`），其余 24 种未实现。
- UI：`src/packs/emerald/battle-interface.js`（DOM 菜单/HP/状态/经验）、`src/presentation/battle-canvas.js`（Canvas 绘制精灵、招式特效、球）。
- 资源：只有单张 `generated/assets/battle-bg.png` 和球 PNG（`generated/assets/ui/ball-*.png`）；**没有逐地形战斗背景、没有血框/状态图标素材**。
- 音频：`src/packs/emerald/battle-audio.js` 按事件给具名 cue。

## 三、差距分析

### 1. 入场与换人动画
- 原作按 `BATTLE_ENVIRONMENT_*` 分三种滑入（`BattleIntroSlide1/2/3`），训练家先滑入再抛球，野生精灵滑入，随后血框滑入；本仓库是统一线性 lerp（`battle-director.js:198-210`），没有环境区分、没有血框滑入、没有清晰的抛球子阶段。
- 换人（`switch`）当前是缩放+释放特效，未对齐原作的“收回—投球—放出”节奏。

### 2. 出场与结算
- 当前有 `faint/level/learn/text/end` 事件，但经验条填充、升级/学招的消息顺序、胜利/战败收尾与 `battle-exit` 转场都只是近似；原作由 `battle_scripts_1.s` 精确排序。

### 3. 对战台词
- 原作把 959 条文本集中在 `battle_message.c`，用占位符（`{B_ATK_NAME_WITH_PREFIX}` 等）和脚本时序；本仓库把中文直接写死在 128 处 `emit` 调用里，**没有集中目录、没有占位符插值、难以对齐原文与排序**。
- 效率/会心/未命中等必须严格贴合原脚本的出现时机（伤害前还是后）。

### 4. 逐招式战斗动画
- 原作 356 个 `Move_*` 脚本 + 分属性动画指令；本仓库 44 条，其他走通用回退。这是最大缺口。

### 5. 转场与 UI
- 转场缺 24 种，且缺少按地图/环境的选择表（现只有强弱的四选一）。
- 战斗背景只有一张通用图 + 6 组调色板回退；缺逐地形背景、血框、异常/目标图标等原作素材。

## 四、合同/工具缺口（需先补框架或管线）

1. **战斗素材导入管线**：逐地形 `battle-bg-*`、血框（healthbox）、状态图标、训练家战斗图。参考 `tools/import.py` 的 `--check` 模式与所有权合并。
2. **逐招式动画数据导入**：解析 `data/battle_anim_scripts.s` 的动画指令到仓库的纯数据轨迹/效果，或建立“动画指令 → 已注册效果”的映射表；代表例先在少量招式上验证。
3. **战斗台词目录合同**：领域只发**稳定 messageId + 参数**（如 `atk`、`move`），由内容包提供本地化模板与占位符；渲染层插值。这样才能既对齐原文又保持中文可维护。
4. **战斗脚本时序层**：`BattleDirector` 现在是“按事件 kind 播一个演出”，缺少原作的“脚本命令序列”。可在表现层引入一个受限的 `battleSequence`（纯数据步骤表），不改规则。
5. **转场选择表**：按地图/环境/强弱选择 4 类图案，补其余图案的纯采样绘制器。

## 五、分期计划

### P0 · 基准与素材盘点
- 盘点当前单打/双打布局与 128 个 emit 的 messageId 草案。
- 用导入工具导出逐地形战斗背景、血框、状态图标（`--check` 预演零差异后再落）。
- 验收：内容/资源引用通过；浏览器截图仍由用户验收。

### P1 · 战斗台词目录（高收益，先做）
- 引入 `battleMessages` 内容种类：模板 + 占位符（mon/move/stat/status）。
- 把 `battle.js`/`battle-*-*.js` 的硬编码中文改为 messageId + 参数；文本内容放内容包（对照 `battle_message.c`）。
- 校正关键时序：命中/未命中、会心、效果拔群/不理想、异常、能力升降、倒下、逃脱、捕获。
- 验收：`node --test` 断言每个事件返回正确 messageId 与插值；对照原文逐条核对（本项目本地化）。

### P2 · 入场/换人/结算演出
- 按环境实现 `BattleIntroSlide1/2/3` 的滑入；训练家抛球、野生滑入、血框滑入。
- 换人：收回→投球→放出；倒地：下落+叫声+消息；经验条填充、升级、学招、胜利/战败、`battle-exit`。
- 复用 `api.presentation.battle` 注册替换/追加以免改导演分支。
- 验收：固定时钟断言逐帧采样与时长；观感由用户验收。

### P3 · 逐招式战斗动画
- 建立 `battle_anim_scripts.s` 指令→效果映射与导入工具；先覆盖当前切片的招式（初始精灵与野生常用招式）。
- `MOVE_ANIMATIONS` 逐步被导入数据替换；未映射仍走通用回退。
- 验收：招式采样帧与停止；命中/未命中分支。

### P4 · 转场与战斗 UI
- 补 `battle_setup.c` 的选择表与其余图案；逐地形背景。
- 沿用 `battle-interface.js`/`battle-canvas.js`，对齐血框、HP 条、状态/目标图标、2×2 菜单；不重写规则。
- 验收：布局断言 + 用户浏览器验收。

## 六、边界与验收原则

- **规则/表现分离**：演出只消费已提交的语义事件，不重算命中/伤害/捕获，不用游戏 RNG。
- **不伪造完成**：导入成功、单测通过只证明合同；像素/听感一致由用户浏览器验收（本项目禁止 Computer Use，由用户执行）。
- 未映射招式保持通用回退，并明确标注，不宣称 356 招式已还原。
- 增量交付：每期更新 STATUS/受影响的规格与证据，未变领域复用旧证据。

## 七、建议的首个切片

先做 **P1 台词目录 + P2 的野生/训练家单打入场**：这两块改动集中在表现层与内容包，可被 `node --test` 稳定验证，且是后续招式动画与结算对齐的公共基础。P3 的导入管线在 P1/P2 稳定后另立框架任务。

## 相关文档

- [战斗架构](../architecture/BATTLE.md) · [表现架构](../architecture/PRESENTATION.md) · [演出与纯取样合同](../engine/presentation/ANIMATION_CONTRACT.md) · [精灵帧片段](../engine/presentation/SPRITE_CLIPS.md)
- [绿宝石 UI 实施](../development/EMERALD_UI.md) · [创作指南](../development/AUTHORING.md) · [测试指南](../development/TESTING.md)
- 代码入口：[battle.js](../../src/engine/battle.js)、[battle-session.js](../../src/engine/battle-session.js)、[battle-director.js](../../src/presentation/battle-director.js)、[animations.js](../../src/packs/emerald/animations.js)、[battle-transitions.js](../../src/packs/emerald/battle-transitions.js)、[battle-interface.js](../../src/packs/emerald/battle-interface.js)
