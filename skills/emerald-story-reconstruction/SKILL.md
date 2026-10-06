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

## 原作界面、文字与演出

涉及菜单布局、sprite/文字坐标或音效时先读[界面实施与来源](../../docs/development/EMERALD_UI.md)。先追原C的window templates、CreateSprite、tilemap/palette及资源build规则，再使用tools/ui/export-theme.py导出；不得以整个场景截图代替网格地图。页面落在对应*-interface.js，纯格式化在ui/；规则依旧通过现有命令执行。

NPC对白逐字、告示牌/家具查看即时显示：在内容中明确mode，不在UI按名字猜。捕捉结果由领域先决定，表现等待摇晃/挣脱结束再宣布；音效由一次性的时间点触发，不能放入每帧sample/draw。四次捕捉判定成功不等于播四次摇晃。统一确认入口已负责音效，页面回调不要重复播放。扩展原生区域、关闭资源生命周期和reduced-motion必须保留。

针对性检查可用node --test tests/native-pages.test.js tests/ui-composition.test.js tests/presentation.test.js；文件改名搜索summaryPage、Capture announces、First field confirm。导出后先--check，应无差异；可执行检查只证明代码与资源合同，不证明像素/听感一致。浏览器或Computer Use仅按当次用户授权执行；用户承担端到端时明确留待验项。

详情sprite用`python3 tools/import.py detail-sprites --check`预演，去掉`--check`导入真正的anim_front.png和normal.pal。front.png可能包含黑色VRAM预留槽，不能按高度生成动画帧。原生详情播放一次并返回首姿态，插件clip仍可循环；参数和资源归属见导入索引。

队伍图标使用原作共享icon调色板，由pixel_assets.py解析pokemon_icon.c/graphics.c，不是物种normal.pal；detail-sprites同时修复已导入图标。别用CSS滤镜掩盖导入偏色。

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

## 角色与动作转写的现有落点

- 原作演员业务数据放native-cast-data.js / opening-objects.js，native-cast.js只作通用条件投影；唯一身份绑定放native-object-bindings.js。使用来源local ID或严格唯一坐标，未知/歧义明确报错，不以静止朝下兜底。条件入图站位用placement，在来源绑定后、目的地首帧前生效，不让延迟mapEnter补丁造成闪现。初始朝向核对native-movement.js的原作表，LEFT_AND_RIGHT与RIGHT_AND_LEFT不同，不能按子串猜。
- local ID存在不等于绑定正确：逐角色核对原表的script、graphics_id、坐标、movement_type与范围，并覆盖男女镜像分支。隐式ID按完整原表序号计算，不能按筛选后演员列表编号；例如邻居孩子是6，3属于搬家过动猿。定向WANDER必须保留方向集合，不能当四方向漫步。至少验证一次移动及重入，不能只断言对象能创建。
- 统一入口`python3 tools/story/extract.py movement --packet <packet> --label <label> --actor <稳定ID> --map <地图>`先回校验固定来源，再调用tools/story/movement.py输出source锚点和commands。完整调用与支持范围见[提取流程](../../docs/development/STORY_EXTRACTION.md)；未知指令先查C语义，再补局部映射/接口，不删除步骤。
- applymovement并行关系仍由作者写parallel/sequence；跟随或推回可显式声明ignoreActors，只忽略指定演员的占位，保留地形/高度/边界。锁朝向用keepFacing，不用逐格插face冒充原作锁。别把例外带入正常玩家移动。
- 会在本场戏改变资格flag的演员须在变化前获得场景pin，否则实时projection可能在行走前重置它。OnTransition摆位宜用入图visit patch；临时对白分支变量在入图重置。原作一次性图鉴与赠球分开记账，不能因赠球满包扣住主线。
- 连续同选项移动可合并为path，共用对白/门动作以call复用；各方向不同的路线留在内容中。不要为了压缩JSON把剧情转回巨型JS条件函数。
- 核准演员结束位置时同时记录本次访问、重入、存读档：阶段常驻位置用projections，本次访问的行走终点用visit对象覆盖，不把NPC缓存当存档。核准原作临时寿命，勿为“恢复位置”一律写永久patch。
- mapEnter中的纯摆位/临时变量初始化由map-setup.js识别，保留正在按住的方向/跑步输入；对白、移动演出与战斗仍接管。新增命令不默认归入初始化白名单。原作剧情曲需覆盖跨对白持续、读档重建及战斗入场优先级，不能只在一个music命令中短暂播放。

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
4. 原生地区优先写`src/content/stories/`的bundle，在现有manifest声明stories片段；`src/packs/emerald/story.js`只装配现有地区/公共事件，动态短构建放story/regions或common。独立扩展setup通过`api.story.registerBundle`登记同一合同，不改app按地区接线。先读[剧情内容架构](../../docs/architecture/STORY_CONTENT.md)和[剧情语言](../../docs/engine/story/STORY_LANGUAGE.md)，核对真实字段。普通短battle只发起；需要战后续接必须用durable脚本、稳定node及battle.onResult。已有call是typed词法输入展开，不是任意C返回值/可变调用帧。
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

转写应先做来源分支表，再映射角色、方向、移动路径、奖励与容量结果。本引擎可用`reward.onResult`明确写ok/alreadyGranted/inventoryFull三种分支，提交仍由库存领域原子执行。不要先preview再提前写领取flag；其他错误继续抛出。当前Oldale数据使用三方向带路数组、入图visit摆位、同访问介绍一次和领取结果；重新进入地图清理临时变量。具体画面/听音与原机细节仍看地区记录，不因数据转写就判全镇完成。

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

## 原作对象与异步演出的易错边界

先区分OnTransition摆位与可见applymovement：前者在入图安排位置，不能因为中途var/flag改变就让实时projection把人物瞬移。相邻中间状态保持同一摆位，需变化的位置通过移动命令或明确的下一次入图条件表达。原生对象有显式或隐式local ID；后者是来源object_events的1起始序号，男女地图顺序不一定相同。绑定须核准来源身份及图形帧，不能拿坐标或通用宝可梦静态图冒充角色动画。

坐标脚本可能就在门格上，应先让step脚本处理已落地位置再决定warp；核对正常走路、脚本移动忽略自动warp和取消/重入三种路径。演出移动必须按实际时钟等到结束，模拟异步界面/帧刷新时也应保持NPC pin身份；不能只用同步递增时钟的最终坐标测试证明无锁死。

页面special必须规定打开、确认/取消、关闭及回调过期。当前clock screen返回confirmed/cancelled/viewed，提交回调由故事生命周期授权；页面和动画不直接改clock，淡入淡出不能阻断自己已授权的提交。原作时钟图块和门帧再生成见[opening-art导入](../../docs/development/IMPORT_SCRIPTS.md)，流程为grid→opening-art；帧素材与姿态复用既有注册合同，不在引擎写地图/角色名分支。

用户若要求自行端到端验收，就仅修代码及授权的代码测试，交付可执行的画面/听音清单并标为待用户验证，不再使用Computer Use操作其游戏。当前切片落点与已知演绎集中在[地区切片](../../docs/regions/LITTLEROOT_OPENING.md)，实际进度仍读取STATUS。

## 工具、质量及验收

执行说明、导入器风险和代码位置统一见[作者指南](../../docs/development/AUTHORING.md)，测试写法与证据复用见[测试指南](../../docs/development/TESTING.md)。`python3 tools/import.py emerald`从profile和locale读取地图/物种清单，可用--maps/--species选择，现按[内容管线](../../docs/development/CONTENT_PIPELINE.md)的字段所有权合并；先--check，grid另行执行。它不是C剧情自动翻译器，不为新增一个故事重新导入全工程。

数据/插件→真实触发→选择/自动移动→领域提交→解锁→保存恢复要完整。至少验证入口前置不满足、正确分支、取消/重入、奖励容量失败不标领取；涉及战斗/切图还查输赢和位置/角色清理。规则专项与肉眼观察分别记录，不能凭headless等待证明动画流畅。

已验证未变领域直接复用证据，本次只查新增和受影响项；阶段收口再系统和浏览器回归。测试不mock整个剧情结果，不匹配文字冒充原作语义，也不skip失败/加旧存档兼容来过检查。核心缺口单独明确，不让内容任务悄悄改内核。

## 文件移动时定位

| 首选文件 | 搜索词 |
| --- | --- |
| [story.js](../../src/packs/emerald/story.js) / [内容目录](../../src/content/stories/dialogues.json) | `STORY_EVENTS`、`emerald:dialogues` |
| [StoryCatalog](../../src/engine/story-catalog.js) / [StorySession](../../src/engine/story-session.js) | `registerBundle`、`class StorySession`、`Stable story node required` |
| [StoryApplication](../../src/packs/emerald/application/story-application.js) | `class StoryApplication`、`runStory` |
| [StoryEngine](../../src/engine/story.js) | `class StoryEngine`、`unknown prerequisite` |
| [触发端](../../src/packs/emerald/application/triggers-application.js) | `story.resolve("step"` |
| [现有示例测试](../../tests/story-language.test.js) | `Data-only plugin story` |

接口变化时更新规格、Skill和对应可执行例；`npm run check:docs`验证链接及片段一致，行为例运行一次并记录。项目代码、文档、Skill、资源及固定参考必须一起交接。

剧情目录/事件引擎的接线与区域预检位于`src/packs/emerald/story/runtime.js`（搜索`createEmeraldStory`）。新增地区通常只改内容清单/地区包，不把目录装配搬回adventure.js；职责见[剧情架构](../../docs/architecture/STORY_CONTENT.md)。

## 长剧情接手时的具体约束

声明durable:true后，用稳定node而不是数组下标描述检查点。battle前保存ready游标，onResult接确定结果后自动续接；不能把未声明durable的短battle当作等待命令。checkpoint只在演员/领域操作稳定完成处使用；不能放parallel，嵌套公共流程用call，不再创建script会话。保存不包含动画时钟、DOM或战斗中间态。

新增切片至少验证真实入口→参数化公共对白→领域成功/满包→重入，以及长剧情的战斗后续接或失败重载。恢复节点改名须明确开发存档失效；不得为了兼容未发布旧节点增加散落回退。实际测试参考story-content.test.js、story-session.test.js，路径改名搜索`Stable story checkpoints`、`Battle receipts are correlated`。

本地化写对白目录；多角色用每句name/portrait/expression，插值声明bindings，条件台词用入口requires/if而非播放器读状态。记录只收最终确认dialog及已选项，历史回看不触发奖励。内容来源保持原作确认/项目演绎/pending三类，不能把换了数据格式当作原作完整还原。

接手调钟或其他special后续剧情时，检查“旧任务已完成、新任务尚未解锁”的空隙；侧栏必须支持无当前任务，不能让进度查询导致启动失败。原作4bpp灰度PNG不等同于索引PNG：复用tools/imports/pixel_assets.py的gbagfx截断/反色语义，验证透明背景及帧裁切；只检查图像尺寸不证明素材正确。

入口地毯/箭头warp依据所在格及下一次向外输入，不是落格立即传送；进入房子必须核对真实落点，不能以相邻可行走格替换而令演员路线偏一格。跨男女/家中的projection必须同时限定地图和性别；同名角色不存在时，不得删除严格校验来隐藏内容错误。战后演员先pin，再写已胜奖励，保留对白/逐步离场，最后hide。新增可获物品用成功分支的明确对白、fanfare及waitSound，满包不得宣称获得。

原作战斗转场选择在battle_setup.c，逐帧机制在battle_transition.c。现有packs/emerald/battle-transitions.js接开场正常地形四种选择，描述与纯采样/绘制分开；generic TransitionController只管理遮盖时序与提交，不放原作表。扫描线硬件/调色板混合与Canvas非等价，不得以单测声称逐像素一比一。相机正常默认15×10格，插件仍可配置视口。


## 重复访问与救援追逐

地区数据的落点见[代码地图](../../docs/development/CODE_MAP.md)。Route101入场必须匹配原coord_events的(10/11,19)，玩家四步向上后朝左；演员初始化、三段完整绕圈及最终相对朝向依据原movement数组，不能用通用寻路代替。选取证据可使用tools/story/slices/route101-rescue.json，移动转换器支持walk_in_place_fast并保留原8帧等待；本次匹配依赖只读固定参考，不让核心测试依赖work目录。

区分重复访问三种所有者：普通地图对象按新访问重新装配，visit覆盖过图清理，持久Actor按自身存储恢复。不能用NPC渲染缓存保存长期摆位。重复的拦路/催促事件先核对原动作是否只是face，不把原地转向写成走一格。至少验证第二次触发和中间存读档后的入口；检查目标站位与输入锁一起恢复，不通过忽略所有碰撞或删除事件解决卡住。
