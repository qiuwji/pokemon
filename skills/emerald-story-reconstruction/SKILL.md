---
name: emerald-story-reconstruction
description: 将固定的只读 pret/pokeemerald 脚本、C 实现和数据逐切片转写为现有网页绿宝石；从来源分支、演员动作到真实入口、失败重入和保存恢复验证。完整原作内容复刻使用本 Skill，独立玩法插件按插件 Skill。
---

# 绿宝石剧情复刻

目标是在现有网页引擎上补全默认 Gen3 原作业务。当前切片、地区参考稿、导入成功或单测通过都不能代表全作已完成。先读[范围](../../docs/project/SCOPE.md)、[当前状态](../../docs/project/STATUS.md)和[项目定位](../emerald-project-handoff/references/project-map.md)，沿用户任务选择切片。用户指定的范围和验收方式优先。

## 先完成一条可验证的剧情链

首次接手或曾出现“只写对白、漏分支、无法正常触发”时，先读[执行工作单](references/execution-workbook.md)，按阶段产物推进。它给出可直接填写的来源、分支、身份和验证表，以及古辰镇员工的真实落点；它不是只跑成功路径的教程。

| 阶段 | 要形成的具体结果 | 此时不能声称的结果 |
| --- | --- | --- |
| 1 定位 | 实际项目、固定来源修订、当前入口及缺口 | 接手描述等于实现状态 |
| 2 取证 | 入口 label、宏/special 依赖、成功/失败/重入分支、逐演员动作 | 找到 text 或最终坐标就追完原脚本 |
| 3 映射 | 每个分支对应命令、状态所有者和寿命；需要异步结果时明确合同 | 发起 battle 就已等待胜负 |
| 4 接入 | 内容装配、明确对象绑定、合法坐标及真实触发入口 | 手动 runStory 成功就入口可用 |
| 5 验证 | 正常入口、各后果、重入及保存恢复的真实领域断言 | 最终坐标正确就动画/听感一致 |
| 6 交接 | 来源、分支覆盖、已运行证据、待验项、下一可执行任务 | 未验证的部分标为完整还原 |

取证不要求先调查全作；追完当前链影响结果的依赖后先实现它，再推进下一链。入口、关键结果或演员身份尚未确定时继续追源；不要用默认台词、空命令、通用寻路或永久 flag 填空。现合同确实无法表达时记录“来源行为 → 缺口 → 所有者 → 期望结果 → 验收例”，单独处理通用能力；原作地图名和角色名不进入通用引擎。

## 来源和机械提取

只读参考是 `work/pokeemerald/`，固定修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`；`sources/` 也只读。先执行 `git -C work/pokeemerald rev-parse HEAD`。缺失时按项目定位恢复同一参考，不修改参考或偷偷换最新修订沿用旧证据。原作确认事实、项目演绎和待验证猜测分开记录。

读[地区入口](../../docs/regions/README.md)与本次地区文档，再按[提取规范](../../docs/development/STORY_EXTRACTION.md)选 profile、生成 packet/source、填写 review、verify 后才标 ready。显式 entries 只代表限定切片。提取校验只证明来源及审阅结构，special 结果、任务等待、TEMP 寿命和译文仍需读实现。

机械导入与行为转写的命令、文件落点和 C 命令映射集中在[从 C 到网页](references/c-porting.md)。不要为一句对白重导整工程；地图网格、素材和音频使用各自工具，不能用整场景 PNG 代替地图。

## 选真实合同

先核对[剧情语言](../../docs/engine/story/STORY_LANGUAGE.md)、[内容架构](../../docs/architecture/STORY_CONTENT.md)，再复制对应命令的真实字段。默认内容在 `src/content/stories/` 并登记 manifest；必要短构建放 `story/regions` 或 `common`。独立扩展用 `api.story.registerBundle`；不在 app 逐地区/插件接线。

- `completed` 记录整段执行结束，`rewards` 记录原子奖励到账；不能互换。`once:true` 在取消分支正常结束后也会记完成，允许回来领取的互动应按领取事实决定重入。
- 先查谁写 `VAR_RESULT`、什么时候写，再映射 `onResult`。奖励满包不标领取；后续资格不能只依赖可能因对白失败而未记录的 completeEvent。
- 普通短 `battle` 只发起战斗。战后续接用 `durable:true`、稳定 node 和 `battle.onResult`；检查点不能保存动画、DOM 或战斗中间态。`call` 是 typed 展开，禁止递归，不是 C 可变调用栈。
- 长剧情不是整体回滚事务。领域已提交的奖励/补丁可能在后续演出失败后保留；以稳定奖励 ID、条件和阶段设计恢复，不承诺整段撤销。
- 原对象使用来源 local ID/明确绑定，运行期角色使用 Actor。永久状态、visit 覆盖、原 TEMP 清理分别核实；位置与可见性不能只存在 NPC 渲染缓存。

具体演员绑定、方向分支、逐格路径、场景 pin、门格顺序、页面回调、UI/音效和常见报错见[演出专项](references/scene-fidelity.md)。涉及地图/机关按[世界内容](../emerald-world-content/SKILL.md)，特殊领域沿[领域路由](references/c-porting.md)使用对应 Skill；剧情只调用所属领域。

涉及 BGM/SE/叫声及切曲恢复时读[音乐导入](references/music-import.md)。正常游戏实际听到正确曲目、循环、切曲和恢复才算音乐验收；文件生成或注册 cue 不够。用户自行端到端验收时只执行授权代码测试，交付待听/待看清单，不使用 Computer Use 操作游戏。

## 最小可运行入口例


接口锚点：插件API 1，示例使用现有registerBundle/StoryCatalog与执行合同。文件：[story-bundle.test.js](../../examples/story-bundle.test.js)，在项目根执行`node --test examples/story-bundle.test.js`。这是项目分支演示，**没有声称逐字还原上述员工事件**。

[session夹具](../../tests/helpers/session.js)装配真实插件、应用服务和命令，固定时钟/存储、模拟UI取第一个选项。示例通过game.enter后game.interact触发实际对象绑定，浏览器UI由夹具立即确认；它不证明自动移动或动画观感。复制到examples/下的新测试才有正确相对导入。

场景NPC的固定`move.path`现可连续跨地图连接，保持scene pin/步态/两侧占位；抵达后再hide和切换剧情投影，避免边界闪现。角色定位优先当前地图；跨图后face/hide追踪同一pin。来源固定离场确实不检查地形时，显式NPC路径可声明`ignoreTerrain:true`，仅忽略地形/高度/跳崖，仍验证有效地图边界和演员占位；禁止给玩家或自动寻路使用，必须覆盖正常阻挡与失败释放。

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

## 验证和完成边界

从真实触发开始测，不用直接执行内部命令证明入口，也不 mock 整场剧情/战斗或假造胜负。断言来自来源分支表，至少覆盖本链关键成功、前置失败、取消/容量失败（若存在）、不重复提交、重入和保存恢复；方向/性别/等待等变化按来源补用例。演出涉及异步时增加可控制时钟的中间帧与锁释放验证，固定时钟的终点断言只证明领域结果。

测试安排见[测试指南](../../docs/development/TESTING.md)：通用合同在 tests，产品插件在 examples。先跑当前新增和受影响项；阶段收口执行 `npm run test:all` 与 `npm run check`，来源工具改动另跑相应工具测试。未变领域可引用仍匹配的证据，不能删失败分支、skip 或关闭校验凑通过。

观察通道见[AI 控制](../../docs/development/AI_CONTROL.md)。JSON、测试日志、实际画面与听音分别记录；未进行的验收写“待验证”。交付按[切片模板](references/story-slice.md)补来源/分支/动作/证据并更新 STATUS、受影响规格和 CHANGELOG。保留未完成分支和具体下一步，不把改格式写成完成还原。

## 文件改名时定位

| 责任 | 查找入口 |
| --- | --- |
| 地区装配、预检 | `src/game/emerald/assembly/story-runtime.js`，搜索 `createEmeraldStory` |
| bundle、引用、参数与稳定程序 | `src/engine/story-catalog.js`，搜索 `registerBundle`、`Stable story node required` |
| 条件、触发、前置 | `src/engine/story.js`，搜索 `class StoryEngine`；触发应用搜索 `story.resolve("step"` |
| 执行、领域结果及导演生命周期 | `src/game/emerald/application/story-application.js`，搜索 `runStory`、`onResult` |
| 持久游标和战斗关联 | `src/engine/story-session.js`，搜索 `battleResult`、`validateStoryResume` |

接口变化同步规格、Skill 及可执行例；`npm run check:docs`检查链接/片段，例子实际运行一次。项目代码、资源、固定参考、文档和 Skill 一起交接。
