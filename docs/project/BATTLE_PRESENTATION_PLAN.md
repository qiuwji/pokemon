# 战斗复刻专项

2026-10-08用户要求：入场、作战、招式特效、结束转场与文本按绿宝石复刻，同时保持高内聚、低耦合；由内核提供能力，内容通过公开能力还原。用户明确否决原作指令解释器及旧招式降级路线。本页替代原先“逐指令导入 + 通用回退”的规划。

固定只读参考为 `work/pokeemerald` 修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。本项目中文是自身本地化；尚未指定中文ROM作为逐字基准。游戏仍使用自研领域内核，不加载ROM。

## 架构及所有权

```text
领域结果快照
    ↓
公开 presentation.sequence 注册 → 内容 prepare（同步、冻结查询）
    ↓
FrameSequenceBuilder 编译姿态 / 资源精灵 / HP展示 / 声音时间点
    ↓
合同校验 → 不可变帧数据 → 注入时钟播放器
    ↓
BattleDirector 播放与清理 → Canvas / HUD / Audio 适配
```

- **内核合同与工具**：[frame-sequence-contracts.js](../../src/engine/extensions/frame-sequence-contracts.js)、[frame-sequence-builder.js](../../src/engine/extensions/frame-sequence-builder.js)、[frame-tracks.js](../../src/engine/extensions/frame-tracks.js)。只处理有界声明、纯编译和边界；不识别招式名、原作指令、C回调或寄存器。
- **绿宝石内容**：[battle/sequences.js](../../src/packs/emerald/battle/sequences.js)统一装配；[move-choreography.js](../../src/packs/emerald/battle/move-choreography.js)拥有每招时间点；[move-tracks.js](../../src/packs/emerald/battle/move-tracks.js)拥有原素材帧与轨迹；[controller-animation.js](../../src/packs/emerald/battle/controller-animation.js)拥有HP/倒下政策。它们消费与外部作者相同的公开能力。
- **播放**：[frame-sequence.js](../../src/presentation/frame-sequence.js)按帧取不可变数据；[BattleDirector](../../src/presentation/battle-director.js)仅协调快照、隐藏、声音与消息交接。既有入场、动作、捕捉取样分别归入 battle-opening/actions/capture，不再堆在导演方法里。
- **绘制**：[frame-sprite-canvas.js](../../src/presentation/frame-sprite-canvas.js)处理图集、翻转、仿射比例与双系数混色；Canvas在逻辑分辨率绘制后统一放大。240×160及5位色量化由绿宝石装配提供，内核不写硬件特判。

编译回调不进入渲染循环。运行时没有原作脚本解释器、指令分发、跳转或原作任务槽。原作中的等待与轨迹转换成内容代码明确表达的时间点；数值保真仍需要对照来源。

## 当前实现与证据

当前是**实现中**，不是全战斗1:1完成声明。已编排7招：拍击、撞击、抓、叫声、摇尾巴、火花、水枪。素材导出包含 impact/scratch/noise_line/small_ember/small_bubbles/water_impact，透明索引与图块帧排列保留。12个对应原作SE及效果音通过既有音频工具渲染并装入统一音频包。

原作总表审计覆盖354招及MOVE_NONE；[审计](../../generated/packs/emerald/battle-animation-audit.json)的 `choreography` 只表示新编排已接入，不能解释成逐帧或听音已验收。`selectedSourcePrograms` 是离线来源记录，运行时代码不导入它。[导出manifest](../../generated/packs/emerald/battle-animation-manifest.json)记录固定修订、来源/输出hash和音频时长输入。

血条使用来源中的48像素步进与低HP定点细分；伤害先闪烁再更新条。普通命中不再补写“攻击命中了”；会心和属性效果分别在HP之后出现，内容声明64帧等待。倒下演出等待64帧后下落/擦除，消息在隐藏后交接。HUD保留上一行有效文本，并在入场帧刷新时显示已放出的席位；整数HP和血条分数分别刷新。

2026-10-08后续切片按用户明确的完整开战链推进：地图触发→遇敌转场→场景展开/双方入场→投球→精灵展开→血框滑入。普通本地单/双打的slide/send和战败训练家return已迁入[opening-choreography.js](../../src/packs/emerald/battle/opening-choreography.js)，使用公开scenes、sprites、poses和statusBoxes通道。源WIN0从80/81展开至48/113，再每帧展开3/4像素；双方及分割BG每帧移动2像素。真实入场前景读取anim_tiles/map及原palette，不再只画静态战斗板；BG3按原512像素屏块导出，不重复240像素裁片。投球采用明确的三段轨迹、训练家图集、闭/半开/全开球图、16个来源球粒子、展开及调色。先完成展开再播cry；血框从±115以5像素/帧滑入，双打第二球/玩家第二框分别延后26/20帧。

地图转场末尾直接揭开已stage的第一帧，不再额外叠加220ms的战斗画面淡入。第一事件只编译一次，退出时stage/框姿态随导演reset清理。胜利训练家回场为2像素/帧，战内败北/奖金对白继续由原结算所有者交接；本地战败的两页whiteout对白覆盖普通结果与野外结果所有者。[退出编排](../../src/packs/emerald/battle/exit-choreography.js)提供逐级颜色扣减、黑屏提交和地图恢复帧，控制器不含硬件分支。五类胜利音乐已按固定MIDI/音色/音量装入原声包，播放完成通知决定wild胜利曲时机，trainer结果阶段才切胜利曲；不会因为规则已算出win就提前切歌。逐曲fadePreviousMs=0提供来源的直接切曲。

此次通用扩展只提供裁剪、图集旋转/调色、HUD位移、不可变转场帧、演出完成通知与旧曲退出时长。原作资源/帧数/颜色/物种及训练家政策全部在pack；不加入VM，也不增加默认降级演出。[关键帧检查](../../tests/battle-opening-sequences.test.js)覆盖窗口/图层/球图/cry/血框/双打、边界及失败清理；[生产例](../../examples/battle-entry-exit.test.js)通过真实公开命令完成胜利/失败/重入与战败，不伪造胜负。本批实际命令、结果和数量见[入场退出证据](../validation/2026-10-08-battle-entry-exit/manifest.json)。

用户随后提供截图，要求整理文本与UI框排列。血框按`InitBattlerHealthboxCoords`的主精灵中心转为左上坐标，名字/性别和等级各有独立区域；首次绘制和刷新共用同一标题生成。pack样式集中使用240像素宽度单位，固定HP条48像素、文本行距和按钮游标留白，移除菜单的重复外边框，并收拢队伍提示；不向内核加入这些具体布局。窗口皮肤及中文字体仍沿用现有素材，尚未人工验收，也不计为原生UI逐像素完成。

[专项测试](../../tests/battle-sequences.test.js)验证编译只执行一次、帧率独立、严格边界、已编排招式时序/镜像、叫声双打目标、无覆盖/未命中不替代、HP细分、倒下文本和启动失败清理。[公开作者例](../../examples/battle-sequence.test.js)通过真实注册/战斗命令运行，并验证准备回调不能派发战斗命令。系统结果、实际命令和数量见[本批证据](../validation/2026-10-08-battle-presentation/manifest.json)；历史失败和过期记录保留，最终状态以匹配当前输入的记录为准。

## 已删除的路线

旧内置招式表及 `legacy-move-animations.js` 已删除；属性到通用粒子/突进的自动选择也已撤掉。未编排招式没有默认替代特效，剩余347招是显式缺口。显式的外部 effect/move/battle 注册合同仍可使用；它们不会被自动用于补足原作覆盖。

演出选择按优先级、匹配具体程度和ID稳定排序，只准备选中的定义。错误报告并隔离，不继续选次优演出来掩盖问题。同选择器和优先级的冲突拒绝注册。

## 尚未达到1:1的内容

| 范围 | 当前边界及后续验证 |
| --- | --- |
| 7招首片 | 帧/引用合同已验证，未与原机逐帧画面比对；叫声仍缺原作两段变调cry，SE缺声像/混音对照。不能把素材来源等同完整观感一致 |
| 其余347招 | 未编排；按实际招式补资源、共享轨迹与内容调度，禁止回到通用降级表 |
| 入场 | 普通本地单/双打已迁入新帧路径；尚缺物种各自的前/背精灵动作与两帧切图、闪光、虚弱/双打cry变调、完整特殊球粒子/颜色及特殊战斗入口。不得据通用动作完成而标记整段1:1 |
| 换人/捕捉 | 仍需迁到公开帧能力并逐帧核对；此次仅开战投球，不把捕捉/中途换人计作覆盖 |
| 画面与UI | 原血框/状态素材、精确窗口/扫描线、调色板变化、背景/精灵遮挡及全套经验条演出尚未完整实现；持久状态/天气图元也需核对来源 |
| 结束/文本 | 普通胜利/whiteout对白、五类胜利曲和退出帧已接入；尚缺原BG/OBJ交替调色的半帧相位（当前合成表面统一调色）、硬件音频淡出对照、文本速度/停顿/控制符及特殊结果脚本 |
| 转场 | 已有少量来源转场，尚非原作28种及完整选择政策 |

能力缺口先明确输入、输出、所有者和可验证边界，再补通用能力；内容随后使用该能力。比如背景平移/窗口遮罩/调色板变化应是通用视觉通道，原作哪个招式何时使用由pack声明，不给导演加入招式分支。

## 来源及持续验收

- 招式脚本：`data/battle_anim_scripts.s`；轨迹及任务：`src/battle_anim_*.c`；精灵模板：`src/data/battle_anim.h`。
- 伤害/消息顺序：`data/battle_scripts_1.s` 的 `BattleScript_HitFromAtkAnimation`；倒下顺序：`BattleScript_FaintAttacker/Target`。
- HP：`src/battle_interface.c` 的 `CalcNewBarValue`；倒下：`src/battle_controller_player.c` 与 `src/battle_controller_opponent.c`。
- 入场/结束/转场：`src/battle_intro.c`、`src/pokeball.c`、`src/battle_setup.c`、`src/battle_transition.c`；文本：`src/battle_message.c`。

每个切片记录实际来源、分支、帧/声音/消息时间点及剩余差异；按公开入口验证规则不重复结算、失败清理、reducedMotion及资源引用。`tools/battle/export-animations.py --check`只读比较，核心测试不依赖参考目录；来源工具测试单独执行。用户既有禁止自动操作游戏要求继续生效，画面与听音由用户人工验收，离线帧/合同测试不能冒充这一验收。

相关合同：[演出合同](../engine/presentation/ANIMATION_CONTRACT.md) · [战斗架构](../architecture/BATTLE.md) · [测试指南](../development/TESTING.md) · [验证记录](../development/EVIDENCE.md)。

2026-10-08功能收口：删除常驻队伍文字；训练家入场使用原作条/四状态六球图，65帧纯编排与挑战对白并行，原三种条音效按帧发出；双方投球分别滑出，末帧保持走公共播放器，野生入场无队伍条。地图音乐按用户澄清另做地图政策。证据见[功能收口批次](../validation/2026-10-08-battle-map-music-complete/manifest.json)。原机画面/声像/听音仍待人工，不改变其余347招未覆盖结论。
