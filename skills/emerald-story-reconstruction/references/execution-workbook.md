# 从原脚本到可玩的切片：执行工作单

用于首次接手、能力较弱的执行模型，以及曾漏掉入口/失败/重入的任务。按下面产物推进，不需要照抄全文进交接。一个切片可以包含多个事件，但范围必须能说清玩家从哪里开始、最后观察到什么。已有可靠记录可复用并核对当前文件，不重复提取全作。

## 1. 定位：确认正在改真正的实现

在实际项目根运行 `git status --short`、`git -C work/pokeemerald rev-parse HEAD`。先读 SCOPE/STATUS 和本地区记录，确认用户范围、只读来源、已有改动与未完成项。固定参考为 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`；不要修改它。

输出四项：实际项目路径；来源修订；本次入口/终点；现有实现位置。搜索例：

```sh
rg -n 'OldaleTown_EventScript_MartEmployee|FLAG_RECEIVED_POTION_OLDALE' work/pokeemerald/data work/pokeemerald/src work/pokeemerald/include
rg -n 'MartEmployee|oldale|inventoryFull' src/content/stories src/packs/emerald tests
```

先查看当前 JSON 的 bundle.id 和 scripts/entries，不根据地名拼出引用。若来源目录缺失，按项目定位恢复固定资料；若实现文件改名，搜索注册 ID。不要创建第二套目录或重新覆盖已有玩家剧情。

## 2. 取证：把改变结果的依赖追完整

从 map.json 中对应 object_events / coord_events / map_scripts 的真实入口出发。记录完整原表序号/local_id、script、graphics_id、位置、movement_type 和范围。沿 scripts.inc 的 goto/call/include 追分支；宏追 asm/macros；special 追 data/specials.inc 的 C 实现及其任务回调；flag/var 常量与清理追 include/constants 和调用者。

对每个等待点回答：谁启动任务、谁写结果、谁完成等待、完成前哪些状态不能提交。找到 text 或最后一个 setflag 不代表追踪结束。`giveitem` 可能是宏，不一定存在同名 ScrCmd；不能把找不到函数当作可删除该行为。

先填写本链的表：

| 来源入口/分支 label | 触发前置 | 等待及结果产生者 | 成功后果 | 失败/取消后果 | 本访问/重入/读档 |
| --- | --- | --- | --- | --- | --- |
| 实际 label | 原 flag/var 与坐标/朝向 | 原命令、C 函数/回调 | 领域提交及 flag 时机 | 是否扣费/记账/解锁 | 临时清理、对象位置、可再触发条件 |

表中不适用的分支写“不存在，来源依据…”，未追清的写“待追”；不要把空白当成无失败。男/女、方向、背包容量及输赢在来源有差异时分列。

动作另列：演员身份 → 起点/朝向 → movement label → 每格方向/原地动作/帧数 → 并行及等待 → 终点/隐藏。用 extract.py 的 movement 子命令转换已核实的数组；未知指令先追 C。OnTransition 摆位不等于可见行走，applymovement 不能只写终点。

提取 profile/packet/review 的流程和参数见[提取规范](../../../docs/development/STORY_EXTRACTION.md)。生成后 verify，审阅完整再 ready；这些结果不替代游戏行为验证。

## 3. 映射：每个分支都有所属合同

读取[剧情语言](../../../docs/engine/story/STORY_LANGUAGE.md)，对照当前 `StoryApplication` handlers 和 `StoryCatalog`，不创造字段。形成“来源分支 → 真实入口/命令 → 状态所有者 → 寿命 → 用例”映射。

| 来源行为 | 当前选择 | 需要额外确认 |
| --- | --- | --- |
| MapScripts 初始化摆位 | 地区内容 mapEnter / placement / visit patch 的已有模式 | 首帧前生效、不抢正常移动输入；原 TEMP 清理时机 |
| 对象交互 / coord_event | entry.selector.objectId / step.where 与 requires | 完整来源身份、地图边界、触发优先级、剧情门格先后 |
| checkflag / compare | requires / if；数值用 compare 查询 | 布尔 flag、永久 var、临时 var 不混同 |
| giveitem | reward + onResult | ok、alreadyGranted、inventoryFull 分支；成功才记领取事实 |
| 等待战斗并继续 | durable + 稳定 node + battle.onResult | 结果关联、失败恢复；短 battle 只有发起语义 |
| applymovement / waitmovement | move.path / sequence / parallel | 实际等待、方向分支、演员与镜头冲突、失败释放 |
| special | 已有领域命令/注册入口 | C 结果和时机；不支持时记录能力缺口 |
| warp / 相邻道路 | 合法 scene/门转场 / 连接上的真实逐格移动 | 不用传送代替来源行走；落点、朝向、高度及遮盖提交 |

奖品账本、completeEvent 与原作领取 flag 各有语义。允许取消再来的互动不要靠 once:true 去重。插件不能写核心 flag；原作内容由原作 owner 持有。长流程已提交的奖励不会被后续对白失败自动撤回，恢复入口须依赖真正已提交的事实。

## 4. 接入：从玩家入口检查装配

默认地区内容落 `src/content/stories/`，在 manifest 的 stories 分类装配；原生对象显式绑定按现有 native-object-bindings 模式。独立扩展用 api.story.registerBundle，与 app 的启动代码无逐插件分支。

逐项核对：

- bundle、entry、script、dialogue、reward 的 ID 分别是什么；局部引用由哪个 bundle 解析，跨包是否为完整引用。
- 接口参数、choice.cancel、onResult 的状态是否与真实合同一致；其他错误继续抛出。
- 对象是否真的存在，script/local ID/图形是否对得上；坐标是否在当前地图内，路径是否含真实碰撞/高度/门格。
- 入口是否有前置条件，正常交互/到达能否选中；不是只在测试里调用内部 runStory。
- visit 终点、永久推进、离图清理与读档恢复各由哪个服务保存。

先跑现有对应作者例或地区测试，确认装配方式可用，再写本链的成功路径并立即从真实入口验证。追加失败/重入分支时保持同一入口和领域提交，不另造测试专用实现。

## 5. 验证：按来源后果写断言

测试可安排队伍、flag、初始站位、模拟 UI 和时钟；实际动作必须走生产注册/触发/领域命令。不要直接写预期 reward/胜负来证明执行成功，也不使用复制实现的公式作唯一断言。

| 来源情况（存在才测） | 必须观察的后果 |
| --- | --- |
| 前置不满足 | 入口不触发/采用原有对白；不发奖励、不消耗、不锁住 |
| 成功 | 正确分支、领域实际到账、推进事实、演员终点与解锁 |
| 取消 / 容量不足 / 失败 | 不提前标领取，不误推进；符合原作的重试入口仍存在 |
| 同访问再触发 | 不重复费用/奖励；临时摆位和介绍资格正确 |
| 离图重入 | TEMP/visit 清理与永久状态分离，演员身份仍对应来源 |
| 保存后重载 | 领取/推进不重复；当前访问位置及长流程 ready 游标可恢复 |
| 异步演出 | 中间帧仍有同一演员和预约；未到终点不续接；失败最终释放输入/资源 |
| 战斗后续 | 实际结果关联对应会话，胜/负/逃跑/捕捉按声明分支续接 |

具体测试文件从地区名或 label 搜索，不复制旧完成数字。先运行新增及受影响测试；阶段收口 `npm run test:all`、`npm run check`。工具改动再测对应工具。未做画面/听音验收必须注明，不能用同步时钟证明流畅。

## 6. 交接：填写覆盖结果而不是笼统的完成声明

用[切片模板](story-slice.md)。每行来源分支连接到实现文件和验证用例；已实现未验证、待实现、项目演绎分别标明。记录真实命令与日志、源码/来源 hash、未验收画面/声音、具体下一任务；更新 STATUS 和受影响规格。

交付语句示例：“员工带路与伤药成功/满包/同访问重试已接真实入口并通过 X；男女或方向分支 Y 未完成；声音恢复待用户确认。”只有所有已承诺的分支及约定验收完成，才将该切片标完成。

## 贯穿例：古辰镇商店员工（用于核对，不能照抄成新实现）

来源 `data/maps/OldaleTown/scripts.inc` 的 `OldaleTown_EventScript_MartEmployee`、各方向 Movement、ExplainPokemonMart 和 BagIsFull；当前内容 `src/content/stories/oldale.json`，演员绑定/入图摆位在相应 native 文件；相关用例搜索 `Oldale|employee|inventoryFull`。固定来源和当前内容都需重新读取，不以本段代替证据。

原脚本在介绍前就设置FLAG_TEMP_1，满包后同访问再次交互会走ExplainPotion，并非因为未领药就立即重试giveitem；须追清TEMP的离图清理再定义后续访问重试。这正是分支表不能只写“满包可重试”的原因。

必须核对：已领药/临时资格 → 面向/切曲 → 按玩家方向逐格带路并等待 → 商店介绍 → giveitem 结果 → 成功标领取或满包可重试 → 本访问终点、重入清理。三种不同的交付不要混为一谈：

- 只写介绍台词：还缺带路、结果分支和重入。
- 给药并设 flag：若先设 flag，满包就可能永久漏奖。
- 完整入口/分支测试：可以证明业务后果；画面、逐字中文和声音仍按约定分别验收。

同一方法用于其他地区：替换真实入口、特殊结果和动作，不把员工的路径/奖励/临时政策推广为全作规则。
