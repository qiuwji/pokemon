---
name: emerald-story-reconstruction
description: 结合现有网页绿宝石架构和只读pret/pokeemerald固定修订，逐区域转写原作地图剧情、条件分支、移动演出与领域调用，记录还原依据并让其他模型持续接手。
---

# 完整绿宝石剧情复刻接手

这份Skill用于长期补全原作业务，不能把当前序章切片当作全作已完成。目标是在现有自研网页引擎上复刻默认Gen3《Pokémon Emerald》，不是执行ROM或直接解释C脚本。先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)、[总接手指南](../emerald-project-handoff/SKILL.md)；实际地区/ROM修订和中文逐字文本要求按范围及任务确认，不凭记忆指定版本。

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
4. 原作内容按现有`dist/packs/emerald/story.js`及对应内容定义装配；独立实验/扩展写`dist/plugins/`，setup通过`api.story.register`注册。完整复刻先读[剧情内容架构](../../docs/architecture/STORY_CONTENT.md)：地区包、对象绑定、公共子脚本、地图回调和稳定暂停点是后续改造方向；检查STATUS及实际合同，不能调用尚未实现的registerBundle或假设battle会等待胜负。新机制交给明确的框架任务，已有机制的内容按地区组织，不在World/adventure加地图名switch。
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

转写应先做来源分支表，再映射角色、方向、移动路径、奖励与容量结果。本引擎reward失败当前会抛错，没有通用“reward结果写变量后分支”命令；原作背包满对话不能靠原样reward数组自动得到。核对现有库存preview/可注册查询能否表达预检；若需要执行结果分支，提出具体框架合同并验证竞态，禁止提前设置领取flag或删容量校验。

当前core剧情切片是否包含这个完整过程只看代码与STATUS；此段是下一位作者的原作转写方法和差异说明，不是已实现声明。保存来源记录可用[切片模板](references/story-slice.md)。

## 最小完整示例

接口锚点：插件API 1，示例按现有StoryEngine/CommandRunner合同。文件：[story-reconstruction.test.js](../../examples/story-reconstruction.test.js)，在项目根执行`node --test examples/story-reconstruction.test.js`。这是项目分支演示，**没有声称逐字还原上述员工事件**。

[session夹具](../../examples/helpers/session.js)装配真实插件、应用服务和命令，固定时钟/存储、模拟UI取第一个选项。这里注入与FieldSession相同的到达回调，测试移动另用现有世界证据；复制到examples/下的新测试才有正确相对导入。

<!-- runnable-example: examples/story-reconstruction.test.js -->
```js
import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
test("data story arrival chooses a branch and persists its variable", async () => {
  const plugin = manifest("branch-demo", api => {
    api.story.register("arrival", { trigger: "step", once: true,
      where: { map: "LittlerootTown", x: 8, y: 10, width: 1, height: 1 },
      commands: [{ type: "choice", name: "向导", prompt: "领取示例奖励？",
        variable: "branch-demo.answer", cancel: "leave", options: [
          { id: "yes", label: "领取", commands: [
            { type: "reward", id: "branch-demo:gift", money: 20 },
          ] },
          { id: "leave", label: "离开", commands: [] },
        ],
      }],
    });
  });
  const s = session([plugin]), before = s.game.state.money;
  assert(s.game.enter({ map: "LittlerootTown", x: 8, y: 10, dir: "down" }));
  // Inject the same arrival callback used by FieldSession; movement is tested separately.
  s.game.step(s.game.world.cell(8, 10));
  await s.settle();
  assert.equal(s.game.state.story.variables["branch-demo.answer"], "yes");
  assert.equal(s.game.state.money, before + 20);
  s.game.loadDocument(s.game.exportDocument());
  s.game.step(s.game.world.cell(8, 10));
  await s.settle();
  assert.equal(s.game.state.money, before + 20);
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

奖励容量失败保留具体reason，修正剧情分支而不关容量策略。choice.cancel必须是options中的ID；界面返回未知选项会报Invalid story choice result。若检索不到错误全文，查关键部分和对应校验器，错误路径会随命令树层级变化。

## 工具、质量及验收

执行说明、导入器风险和代码位置统一见[作者指南](../../docs/development/AUTHORING.md)，测试写法与证据复用见[测试指南](../../docs/development/TESTING.md)。`python3 tools/import.py emerald`从profile和locale读取地图/物种清单，可用--maps/--species选择，现按[内容管线](../../docs/development/CONTENT_PIPELINE.md)的字段所有权合并；先--check，grid另行执行。它不是C剧情自动翻译器，不为新增一个故事重新导入全工程。

数据/插件→真实触发→选择/自动移动→领域提交→解锁→保存恢复要完整。至少验证入口前置不满足、正确分支、取消/重入、奖励容量失败不标领取；涉及战斗/切图还查输赢和位置/角色清理。规则专项与肉眼观察分别记录，不能凭headless等待证明动画流畅。

已验证未变领域直接复用证据，本次只查新增和受影响项；阶段收口再系统和浏览器回归。测试不mock整个剧情结果，不匹配文字冒充原作语义，也不skip失败/加旧存档兼容来过检查。核心缺口单独明确，不让内容任务悄悄改内核。

## 文件移动时定位

| 首选文件 | 搜索词 |
| --- | --- |
| [story.js](../../dist/packs/emerald/story.js) | `STORY_EVENTS`、`talkEvent` |
| [StoryApplication](../../dist/packs/emerald/application/story-application.js) | `class StoryApplication`、`runStory` |
| [StoryEngine](../../dist/engine/story.js) | `class StoryEngine`、`unknown prerequisite` |
| [触发端](../../dist/packs/emerald/application/triggers-application.js) | `story.resolve("step"` |
| [现有示例测试](../../tests/story-language.test.js) | `Data-only plugin story` |

接口变化时更新规格、Skill和对应可执行例；`npm run check:docs`验证链接及片段一致，行为例运行一次并记录。项目代码、文档、Skill、资源及固定参考必须一起交接。
