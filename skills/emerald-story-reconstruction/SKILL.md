---
name: emerald-story-reconstruction
description: 将只读pret/pokeemerald的C实现、事件脚本与数据转写为现有网页绿宝石内容和领域调用；说明导入工具、音乐资源转换、代码落点、异步结果、测试与持续交接，适用于完整原作的逐区域复刻。
---

# 完整绿宝石剧情复刻接手

这份Skill用于长期补全原作业务，不能把当前序章切片当作全作已完成。目标是在现有自研网页引擎上复刻默认Gen3《Pokémon Emerald》，不是执行ROM或直接解释C脚本。先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)、[总接手指南](../emerald-project-handoff/SKILL.md)；实际地区/ROM修订和中文逐字文本要求按范围及任务确认，不凭记忆指定版本。

## C代码复刻入口

首次从C版接手先读[从C/脚本到网页的完整流程](references/c-porting.md)：区分机械导入与行为转写，按来源依赖追踪、分支表、代码落点、命令映射、工具和验证推进。该参考覆盖地图/剧情及special调用到战斗、成长、设施等领域的路由；具体规则仍由各领域Skill负责，不将所有C逻辑搬进剧情。

涉及原作BGM、SE、叫声或剧情切曲时读[绿宝石音乐导入流程](references/music-import.md)：含已执行的poryaaaa单曲生成链、配置/编译/安装命令、原作身份命名、按帧设置持续循环及游戏内验收。采样复制走tools/import.py audio，MIDI循环BGM走tools/audio/render-bgm.py；完整SE和全作选曲/恢复仍须逐场景补齐，不将单曲可听误记为全作音乐完成。

音乐任务的交付终点是**通过正常地图、战斗和剧情流程，在游戏中实际听到正确曲目，并完成循环、切曲及恢复验收**。接手者需补足转换工具和选曲/恢复业务；只生成文件、注册cue或通过自动测试不能报完成。具体完成判据与未验收记录见上述音乐指南。

## 本领域核心名词

- **MapScripts / EventScript**：原作入图/刷新等地图回调与对象交互、区域触发脚本，不能全部转成一次性step事件。
- **flag / var**：原作布尔旗标和数值变量；有永久与临时寿命。原常量名是来源身份，不等于JS可以直接使用的字段。
- **special**：脚本调用的C领域函数，可能产生结果、界面或异步任务；须继续追到实现，不能当作普通对话。
- **completed / reward账本**：本引擎记录事件完成及已发奖励的两种身份；领取失败不记账，不能拿事件完成替代原作领取flag。
- **还原切片**：一个区域或剧情链中的完整可观察结果，包含入口、分支、演出、失败及重入；不硬性限定每次只改一个事件。

## 接手时先确认什么

项目定位见[project-map](../emerald-project-handoff/references/project-map.md)。检查工作树和当前资料，沿STATUS选仍未完成的切片；交接描述只是线索，代码和匹配证据才是依据。保存版本以package/pack为准，本工程不兼容旧开发档。

只读参考是`work/pokeemerald/`，固定修订`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`；`sources/`若提供也只读。可以读取、检索，不能修改、改名、移动或删除。先执行`git -C work/pokeemerald rev-parse HEAD`确认修订，缺失时按project-map获取或接收同一参考，不能偷偷换最新分支后沿用旧证据。

原作确认事实、本项目设计选择及待验证猜测分开记录；参考目录有素材不等于可以无来源批量导入。公式、动作顺序和旗标时机来自实际脚本/C实现及验证，不由模型记忆补齐。

## 地区文档与机械提取

开始转写地区前，读取 [地区参考入口](../../docs/regions/README.md) 及本次地区文档，再按 [提取与回校验标准](../../docs/development/STORY_EXTRACTION.md) 获取固定来源证据。地区文档是定位线索，台词翻译与动作说明可能不准确；原始脚本/C 和核实证据优先，不能以文档写“全部场景”就视为全分支已核实或已实现。

使用 `python3 tools/story/extract.py extract --profile tools/story/slices/littleroot-opening.json --out docs/regions/evidence/littleroot-opening --check` 预演，再去掉 --check。其他地区复制 profile 选择 maps/entries/functions；默认地图全量入口，显式 entries 只代表限定切片。packet.json/source.md 由工具生成，review.json 由提取者填写；不手改原码和原文。

交接前运行 extract.py verify --packet 加 --review，审阅完成再 --ready。检查来源哈希、完整标签、入口清单、原文及占位符；C 特殊函数、任务回调、宏等待和译文含义仍须读源码判断。校验通过只证明提取稿与来源一致及审阅结构齐全，不证明网页演出正确。真实触发/逐格朝向/门及对象遮挡/音频/保存恢复另验收。

逐场记录触发条件、状态轴、每个演员的起点/逐格动作/原地朝向/并行组/等待/终点/可见性；单独列男/女、玩家方向、取消/失败与重入。不得用“走过来”“动画完成”概括有决定性次序的步骤，不把 setobjectxyperm 的状态摆位当作可见行走，也不把 applymovement 的结束位置当作实际演出已实现。

## 从原作资料找到业务

| 要查什么 | 起始路径 / 继续追踪 |
| --- | --- |
| 地图对象、warp、坐标触发和布局 | work/pokeemerald/data/maps/地图目录/map.json及scripts.inc，data/layouts，data/tilesets |
| 入图/刷新、对话、剧情分支 | 各地图scripts.inc；继续追label、include、goto/call及公共脚本 |
| flag/var/训练家/道具常量 | include/constants下对应头文件；事件变量及清理寿命继续追src/event_data.c和调用者 |
| 原脚本命令、special实际行为 | src/scrcmd.c，data/specials.inc及其引用的src实现；还要查任务等待/VAR_RESULT写入时机 |
| 移动与锁/等待 | movement数组、applymovement/waitmovement；继续追src/event_object_movement.c等实际定义 |
| 战斗/设施/育成/野外能力 | 由对应领域Skill继续读取其规则来源，剧情只发起公开领域操作 |

文件改名时用label或常量名查：`rg -n "OldaleTown_EventScript_MartEmployee|FLAG_RECEIVED_POTION_OLDALE|giveitem" work/pokeemerald/data work/pokeemerald/src work/pokeemerald/include`。名称或路径不存在时先判断参考是否完整，不创造看似同名的实现。

## 转写工作流

1. 为本次切片列出触发入口、参与角色、前置状态、各分支、奖励/费用、结束状态、取消/背包满/失败及重入行为。追踪特殊函数直到知道谁产生结果、何时解锁。
2. 记录来源文件、label、固定修订和依赖；画出分支或用表表示即可，不复制整套C代码。对话本地化与规则还原分开验收。
3. 地图使用metatile网格、碰撞/高度、connections与warps；原对象放地图元素，新运行期角色走Actor身份。入口校验合法落点，不用整场景PNG。
4. 原生地区优先写`dist/content/stories/`的bundle，在现有manifest声明stories片段；`dist/packs/emerald/story.js`只装配现有地区/公共事件，动态短构建放story/regions或common。独立扩展setup通过`api.story.registerBundle`登记同一合同，不改app按地区接线。先读[剧情内容架构](../../docs/architecture/STORY_CONTENT.md)和[剧情语言](../../docs/engine/story/STORY_LANGUAGE.md)，核对真实字段。普通短battle只发起；需要战后续接必须用durable脚本、稳定node及battle.onResult。已有call是typed词法输入展开，不是任意C返回值/可变调用帧。
5. 把条件转成requires/after/if和已注册只读查询；变量转setVariable/choice；对话、行走、镜头及领域动作转现有命令。参数见[剧情语言](../../docs/engine/story/STORY_LANGUAGE.md)，世界合同见[world-content](../emerald-world-content/SKILL.md)。领域结果确实无法表达时登记接口缺口，作为框架任务处理，不能直接改队伍/库存。
6. 显式映射寿命：永久领取/推进标记、地图visit覆盖、原FLAG_TEMP清理、对象可见性各归所属服务。原作TEMP寿命须追C确认，不能默认等于本引擎visit，更不能统统永久化。
7. 演出走move/approach/face/escort/camera和必要门转场；跨相邻道路走连接。不要用teleport跳过本该自动行走的过程；不能并行争抢角色或镜头。finally释放锁由现有导演负责。
8. 完成当前切片的一次成功、关键分支/失败、重入及保存恢复验证，更新STATUS/受影响规格/CHANGELOG和还原证据；下一步写成可执行任务。

命令树会预检全部分支，但**长剧情并非一个整体回滚事务**。奖励/世界提交各有自己的合同；途中失败时之前已经成功的提交可能存在。用稳定reward ID、条件和阶段设计恢复，不承诺runStory会把整段已发生的事件撤销。

`once:true`会在整条事件执行完成后记录完成，即使choice选择了离开。对于“未领取可以再来”的原作互动，不能照抄本Skill的入门例并靠once去重；应按领取flag/奖励账本与分支定义重入政策。

## 一个真实参考切片：古辰镇商店员工

已确认来源：`data/maps/OldaleTown/scripts.inc`中`OldaleTown_EventScript_MartEmployee`、各方向Movement label、ExplainPokemonMart及BagIsFull分支。

- 原脚本先检查已领药及临时flag，再锁定、面向玩家、切跟随音乐；按玩家朝向选择不同NPC/玩家移动数组，并等待完成。
- 商店介绍后`giveitem ITEM_POTION`，检查`VAR_RESULT`；背包满走BagIsFull，**不设置已领取flag**；成功才设置`FLAG_RECEIVED_POTION_OLDALE`并结束。
- 入图MapScripts还会调整对象位置/阻路状态；不能只补这一段对话就声称此区域完整。

转写应先做来源分支表，再映射角色、方向、移动路径、奖励与容量结果。本引擎可用`reward.onResult`明确写ok/alreadyGranted/inventoryFull三种分支，提交仍由库存领域原子执行。不要先preview再提前写领取flag；其他错误继续抛出。当前Oldale数据代表例只覆盖赠药结果，并未转写原作方向移动、入图位置及音乐；应继续补这些业务而不是重写库存或导演。

当前core剧情切片是否包含这个完整过程只看代码与STATUS；此段是下一位作者的原作转写方法和差异说明，不是已实现声明。保存来源记录可用[切片模板](references/story-slice.md)。

## 最小完整示例

接口锚点：插件API 1，示例使用现有registerBundle/StoryCatalog与执行合同。文件：[story-bundle.test.js](../../examples/story-bundle.test.js)，在项目根执行`node --test examples/story-bundle.test.js`。这是项目分支演示，**没有声称逐字还原上述员工事件**。

[session夹具](../../tests/helpers/session.js)装配真实插件、应用服务和命令，固定时钟/存储、模拟UI取第一个选项。示例通过game.enter后game.interact触发实际对象绑定，浏览器UI由夹具立即确认；它不证明自动移动或动画观感。复制到examples/下的新测试才有正确相对导入。

<!-- runnable-example: examples/story-bundle.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "../tests/helpers/session.js";
test("bundle registers an NPC, shared dialogue and choice with durable reward", async () => {
  const plugin = manifest("story-bundle", api => {
    api.content.register("mapExtensions", "guide", { map: "LittlerootTown",
      elements: [{id:"story-bundle:guide",x:8,y:9,actor:"Boy1",dir:"down",
        kind:"talk",name:"向导",text:"",movement:{mode:"still",rangeX:0,rangeY:0}}] });
    api.story.registerBundle("village", {version:1,
      dialogues:{hello:{name:"向导",bindings:{who:{query:{id:"playerName"}}},
        lines:[{name:"向导",text:"欢迎，{{who}}！"},{name:"助手",text:"领取旅行礼物吗？"}]}},
      scripts:{hello:{parameters:objectSchema(),commands:[{type:"dialog",dialogue:"hello"}]},
        gift:{commands:[{type:"call",script:"hello"},
          {type:"choice",name:"向导",prompt:"请选择",cancel:"leave",options:[
            {id:"yes",label:"领取",commands:[{type:"reward",id:"story-bundle:gift",money:20}]},
            {id:"leave",label:"离开",commands:[]}]}]}},
      entries:{guide:{trigger:"interact",selector:{objectId:"story-bundle:guide"},script:"gift"}},
    });
  });
  const s=session([plugin]), before=s.game.state.money;
  s.game.enter({map:"LittlerootTown",x:8,y:10,dir:"up"});
  s.game.interact(); await s.settle();
  assert.equal(s.game.state.money,before+20);
  assert.equal(s.game.dialogueHistory()[0].lines[1].name,"助手");
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.dialogueHistory().length,2);
});
```

## 常见错误与排查

| 报错关键部分 | 原因与处理 |
| --- | --- |
| Story region outside map: | where使用未注册map或矩形越界；查目录键与实际width/height |
| events.<id>: unknown prerequisite | after引用缺失事件；<id>为实际ID，跨插件使用注册返回值 |
| Story dependency cycle at | 事件前置环；重画状态图，不通过删除校验继续运行 |
| Unknown story command: | C命令名被直接当JS命令或拼错；按StoryApplication.handlers/CommandRunner现有合同映射 |
| Scripted actor movement blocked: | 路径碰撞/高度/角色预约不合法；核对方向分支及实际grid，不用teleport绕开 |

Unknown story script/dialogue意味着局部引用拼错或依赖包未装配；Story call cycle拒绝递归；Stable story node required要求持久脚本每个分支有稳定node；Story state namespace denied检查owner前缀。未知读档节点不得删校验强行恢复。

奖励容量失败保留具体reason，修正剧情分支而不关容量策略。choice.cancel必须是options中的ID；界面返回未知选项会报Invalid story choice result。若检索不到错误全文，查关键部分和对应校验器，错误路径会随命令树层级变化。

## 工具、质量及验收

执行说明、导入器风险和代码位置统一见[作者指南](../../docs/development/AUTHORING.md)，测试写法与证据复用见[测试指南](../../docs/development/TESTING.md)。`python3 tools/import.py emerald`从profile和locale读取地图/物种清单，可用--maps/--species选择，现按[内容管线](../../docs/development/CONTENT_PIPELINE.md)的字段所有权合并；先--check，grid另行执行。它不是C剧情自动翻译器，不为新增一个故事重新导入全工程。

数据/插件→真实触发→选择/自动移动→领域提交→解锁→保存恢复要完整。至少验证入口前置不满足、正确分支、取消/重入、奖励容量失败不标领取；涉及战斗/切图还查输赢和位置/角色清理。规则专项与肉眼观察分别记录，不能凭headless等待证明动画流畅。

已验证未变领域直接复用证据，本次只查新增和受影响项；阶段收口再系统和浏览器回归。测试不mock整个剧情结果，不匹配文字冒充原作语义，也不skip失败/加旧存档兼容来过检查。核心缺口单独明确，不让内容任务悄悄改内核。

## 文件移动时定位

| 首选文件 | 搜索词 |
| --- | --- |
| [story.js](../../dist/packs/emerald/story.js) / [内容目录](../../dist/content/stories/dialogues.json) | `STORY_EVENTS`、`emerald:dialogues` |
| [StoryCatalog](../../dist/engine/story-catalog.js) / [StorySession](../../dist/engine/story-session.js) | `registerBundle`、`class StorySession`、`Stable story node required` |
| [StoryApplication](../../dist/packs/emerald/application/story-application.js) | `class StoryApplication`、`runStory` |
| [StoryEngine](../../dist/engine/story.js) | `class StoryEngine`、`unknown prerequisite` |
| [触发端](../../dist/packs/emerald/application/triggers-application.js) | `story.resolve("step"` |
| [现有示例测试](../../tests/story-language.test.js) | `Data-only plugin story` |

接口变化时更新规格、Skill和对应可执行例；`npm run check:docs`验证链接及片段一致，行为例运行一次并记录。项目代码、文档、Skill、资源及固定参考必须一起交接。

剧情目录/事件引擎的接线与区域预检位于`dist/packs/emerald/story/runtime.js`（搜索`createEmeraldStory`）。新增地区通常只改内容清单/地区包，不把目录装配搬回adventure.js；职责见[剧情架构](../../docs/architecture/STORY_CONTENT.md)。

## 长剧情接手时的具体约束

声明durable:true后，用稳定node而不是数组下标描述检查点。battle前保存ready游标，onResult接确定结果后自动续接；不能把未声明durable的短battle当作等待命令。checkpoint只在演员/领域操作稳定完成处使用；不能放parallel，嵌套公共流程用call，不再创建script会话。保存不包含动画时钟、DOM或战斗中间态。

新增切片至少验证真实入口→参数化公共对白→领域成功/满包→重入，以及长剧情的战斗后续接或失败重载。恢复节点改名须明确开发存档失效；不得为了兼容未发布旧节点增加散落回退。实际测试参考story-content.test.js、story-session.test.js，路径改名搜索`Stable story checkpoints`、`Battle receipts are correlated`。

本地化写对白目录；多角色用每句name/portrait/expression，插值声明bindings，条件台词用入口requires/if而非播放器读状态。记录只收最终确认dialog及已选项，历史回看不触发奖励。内容来源保持原作确认/项目演绎/pending三类，不能把换了数据格式当作原作完整还原。
