# 剧情编排表达力评估（2026-10-07）

当前编排足以表达本工程已接入的典型地区剧情：条件入口、对话选项、按方向带路、奖励失败重试、跨地图演员演出，以及战斗前后可恢复的剧情链。它是有边界的业务编排语言；任意原作 C/special 仍要追到领域语义后转写，不能把支持命令数视为全作还原完成率。

## 已有能力及证据

| 能力 | 现有合同 | 代码与行为验证 |
| --- | --- | --- |
| 真实入口与选择 | interact/step/mapEnter，selector/where/requires/after/priority；前置环及歧义拒绝 | [StoryEngine](../../src/engine/story.js)、[语言用例](../../tests/story-language.test.js) |
| 状态与条件 | flag、标量变量、只读查询compare、all/any/not、if/choice | [变量](../../src/engine/story-variables.js)、语言用例及[内容用例](../../tests/story-content.test.js) |
| 可复用内容 | bundle局部/完整引用、参数schema、typed call展开、绑定对白/多说话人 | [StoryCatalog](../../src/engine/story-catalog.js)、[实际对象入口例](../../examples/story-bundle.test.js) |
| 演员演出 | sequence/parallel、move.path/face/approach/escort/camera、scene pin、连接跨图；预检资源冲突 | [CommandRunner](../../src/engine/commands.js)、[FieldDirector](../../src/engine/field-director.js)、[跨图剧情用例](../../tests/oldale-rival.test.js) |
| 领域结果分支 | reward.onResult的ok/alreadyGranted/inventoryFull；所属领域原子提交 | [StoryApplication](../../src/packs/emerald/application/story-application.js)、内容用例；旧原作领取flag不与事件完成混同 |
| 长流程续接 | durable、稳定node、checkpoint、battle.onResult、关联战斗结果、ready游标恢复 | [StorySession](../../src/engine/story-session.js)、[持久会话用例](../../tests/story-session.test.js) |
| 世界与表现 | worldPatch、对象覆盖、天气/领域动作、注册presentation、音乐请求；规则与播放分层 | [公开语言](../engine/story/STORY_LANGUAGE.md)、[表现用例](../../tests/story-presentation.test.js) |

## 实际限制

1. **控制流有意受限。** call展开禁止递归；没有任意C调用帧或通用while/goto。当前限额为2048展开命令、16层调用、10000会话运行步骤。重复访问可用事件/变量表达，复杂循环和special计算留领域。
2. **异步结果须有明确协议。** 普通短battle只发起；要等待胜负后继续，必须使用durable和结果分支。C的任务/VAR_RESULT不是自动可用，需要公开领域命令承接，不能删除waitstate来“跑通”。
3. **长剧情不整体回滚。** 奖励、地图提交已有各自合同；后续对白/动画失败不会撤销已到账奖励。稳定身份、事实条件、检查点和重试入口决定恢复行为。
4. **并行不是任意协程。** 同一演员/镜头资源冲突会预检拒绝；场景切换、模态和持久暂停有并行限制，失败会等待各分支收口后释放场景。
5. **保存不是动画快照。** 保存稳定业务状态与ready游标，不能恢复任意中间帧、DOM或战斗过程。更复杂暂停需求应增加有明确生命周期的通用合同。

暂不需要为普通地区剧情增加第二套DSL。优先补齐来源分支、演员绑定、TEMP/visit寿命和真实入口验证；真实遇到不能表达的special时，用“来源行为、缺失输入/结果、领域所有者、失败/恢复、验收例”提出能力扩展。自动测试证明合同与领域结果，逐帧画面、中文逐字及声音仍需按约定验收。
