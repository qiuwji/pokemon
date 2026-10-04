# 可执行的入门示例

每份领域Skill都嵌入对应文件的完整20–30行代码。这些例子使用生产插件注册、应用服务和公开命令，证明一条最小行为链；不是完整绿宝石内容，也不是浏览器验收。

在项目根执行`npm run test:examples`，或只执行表中的一个文件。首次使用先`npm ci`；Node需支持node:test、structuredClone及本项目ES模块。复制例子时放在examples/下，让相对导入保持正确。

| 接手方向 | 运行文件 | 实际证明 |
| --- | --- | --- |
| 首次接手 | [handoff.test.js](handoff.test.js) | 注册物品→插件事务领取→拒绝重复→保存恢复 |
| 野外行动 | [field-action.test.js](field-action.test.js) | 注册行动→公开命令→永久格子覆盖→重载→未知ID拒绝 |
| 注册剧情镜头 | [scene-story.test.js](scene-story.test.js) | 注册纯field场景→剧情等待→临时缩放→结束恢复→奖励 |
| 资源帧动画 | [sprite-clip.test.js](sprite-clip.test.js) | 注册片段→详情绑定→真实播放器帧切换→停止；Canvas/时钟为端口替身 |
| 对话表现 | [dialogue.test.js](dialogue.test.js) | 注册文字效果→NPC触发→结构化文本/速度转发→确认后奖励；UI替身不证明动画 |
| 世界剧情 | [world-story.test.js](world-story.test.js) | 注册地图NPC→真实交互触发→对话/一次奖励→重试 |
| 战斗 | [battle-effect.test.js](battle-effect.test.js) | 注册效果/招式→真实训练家回合→能力阶段和PP |
| 非战斗设施 | [facility.test.js](facility.test.js) | 注册活动/设施→推进→待领取→结算/去重→重载 |
| 页面插件 | [plugin-page.test.js](plugin-page.test.js) | 详情入口→布局校验→控件action→自有记忆→重载 |
| 遇敌插件 | [encounter-extension.test.js](encounter-extension.test.js) | 关闭step→查询格子→Actor与凭证→接触→真实野生战斗，不经过剧情 |
| 外观/相机/环境插件 | [visual-extension.test.js](visual-extension.test.js) | 外观选择→可见格数租约→独立雾层→释放与重载 |
| Actor | [actor.test.js](actor.test.js) | 模板→公开创建/更新→持久UID和记忆→移除 |
| 原作剧情转写入门 | [story-reconstruction.test.js](story-reconstruction.test.js) | 数据剧情到达触发→选择分支/变量→奖励→重载去重 |
| 失败与验收 | [validation.test.js](validation.test.js) | 后段意图失败→记忆/钱/账本/RNG回滚→只读→重载 |

[helpers/session.js](helpers/session.js)只用于测试：固定时钟、内存存储及无浏览器UI，准备已解锁场景和一只精灵。对话立即完成、选择取首项，未播放真实Canvas/DOM/音频。原作剧情例注入与FieldSession相同的到达回调，不证明玩家行走；页面例dispatch与点击相同的action，不证明鼠标和焦点。夹具的直接赋值是场景安排，禁止复制成生产插件写法。

浏览器插件是普通manifest对象，放到dist/plugins并加入dist/app.js启动数组，具体见[作者指南](../docs/development/AUTHORING.md)。示例中的bus代表玩家/测试入口；插件运行时dispatch同一核心命令仍须声明该命令权限，直接bus通过不能证明权限通过。测试写法、复用证据和最终验收见[测试指南](../docs/development/TESTING.md)。Skill代码块由`npm run check:docs`与真实文件比对，修改时同步二者。
