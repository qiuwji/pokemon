# 表现扩展架构

规则层负责结果，表现层消费 detached 快照，宿主负责 Canvas、DOM 与音频。演出不调用伤害、捕捉或游戏随机数；其时钟独立于规则。

## 战斗效果与招式脚本

`PresentationRegistry` 在启动时注册 effect 绘制函数和 move 脚本，随后封闭。脚本包含 duration、可选 lunge、tracks，每个轨道声明 effect、anchor（actor / targets / field）、start / end 和 JSON 参数。注册时检查效果引用、时间范围和数量。未知效果明确报错，绘制故障隔离且恢复 Canvas 状态。

`BattleDirector` 解释脚本、逐目标生成视觉数据，并输出精灵姿态。`battle-canvas` 只按注册表绘制，没有逐效果扩展的 if-else。绿宝石包 animations.js 定义 44 个脚本（当前 87 招式中匹配 25 个），其余保留通用回退；新增逐招式脚本不修改规则或 renderer。示例：

```js
registry.effect('custom:trail', drawTrail);
registry.move('water_gun', {
  duration: 900,
  tracks: [{effect:'custom:trail', anchor:'targets', start:0, end:1}]
});
```

插件对应 API 为 `api.presentation.effect(localId, {draw})`、`api.presentation.move(localId, {moveId, animation})`。脚本可覆盖一个基础招式；多个插件覆盖同一招式拒绝启动，避免依赖加载顺序决定结果。插件绘制回调不能通过查询或命令修改游戏。

领域事件增加实际能力变化 delta、每次命中的 moveId / moveType / hit，以及逐目标 successful，避免双打中一个目标命中、另一个未命中却都显示撞击。快照带有效天气、地形及精简临时状态，数组和能力等级复制后与领域对象分离。

支持 17 种属性颜色，持续雨/晴/沙尘/冰雹、中毒/灼伤/麻痹/睡眠/冰冻表现、能力升降箭头、连击逐次反馈、保护盾、训练家入场。替身/反射壁/光墙已有表现数据槽；对应规则仍需单独注册，不能靠画盾实现领域效果。背景按 terrain 选择专属资源，缺少专属资源时使用格子绘制的地形色板。

## 野外与转场

environment-canvas 仅分发注册天气画师；WeatherDirector 按注入时钟混合当前/下一层，跨域状态由引擎决定。视觉时间不消耗游戏 PRNG。世界 RTC/前台周期见 [WEATHER.md](../engine/world/WEATHER.md)。角色影子按当前插值位置绘制；昼夜色调对室外应用，室内保持正常。原有图集逐帧动画继续以 8×8 图块、16×16 metatile 绘制，当前户外图集包含 48 个动画 tile 配置，无整景图片。情绪气泡增至 10 类，剧情合同与绘制共享语义词汇。

`NPCBehaviorRegistry` 提出方向、移动与姿态意图；NPCSystem 统一验证格子、范围、玩家与角色的占位。新增行为通过 content 的 npcBehaviors 注册，回调拿冻结的上下文，不拿 NPCSystem；故障仅暂停该次行为。内置 still/wander/horizontal/vertical/patrol/look/jog/hop/spin/sleep/cheer。会话销毁清除 NPC 缓存。

`TransitionPatterns` 提供 fade/shutter/blinds/mosaic/wave/iris，支持插件 `api.presentation.transition`。TransitionController 保留遮盖—提交—揭开时序；无论何种图案，opacity=1 强制整面覆盖，减少动态效果时使用 fade。画面覆盖 Canvas、菜单与战斗 HUD。

## 通用场景演出

`SceneDirector` 管理单个场景的校验、时间、互斥和 finally 释放；`SceneDOM` 绘制注册定义。剧情使用 `{type:'presentation', id, payload}`，与其他模态指令不能并行。奖励仍由独立 reward 指令负责，场景展示不写进度。插件通过 `api.presentation.scene(id,{duration,schema,draw?,field?,sound?})` 注册，draw和field至少一个。

徽章、联盟入场、选美舞台、战斗塔、标题、图鉴已有 6 个演出示例，可在主菜单“场景演出”检查。这些不是完整道馆、联盟、选美或战斗塔玩法。菜单页面采用短 steps 动画，减少动态效果时禁用。

应用/网络统一命令 `core.presentation.play` 的输入为 `{id, payload?: JSON字符串}`；内层 payload 再由场景的严格 schema 校验。插件需要 presentation 权限。UI 门面自动编码，剧情直接使用数据对象。这样网络不需要放宽全局命令 schema。

## 音频端口

`AudioAdapter` 只播放注册的真实资源文件，支持解码缓存、采样循环区间、music/sound/master 通道、淡入淡出、静音/后台续播与销毁。插件 audio 注册、sound 提出自有声音请求；规则/未提交事务不能播放。页面使用具名 sound(id)，音频不改变领域结果。完整合同与实际资源来源见 [AUDIO.md](../engine/presentation/AUDIO.md)。

合成提示音和示范旋律已删除。现有 7 个参考 WAV 供临时 UI/战斗采样映射及初始精灵鸣叫，原作 BGM/SE 编曲尚未导入，不用缺失资源宣称音频保真。地图显式指定 music/battleMusic；未配置时安静。

## 验证与边界

初次表现扩展检查点（0.13）的312项全量测试、内容检查通过。当时新增检查覆盖脚本错误、插件覆盖、逐席位效果、17 属性色、持续视觉、转场完全遮盖、NPC 意图碰撞与错误隔离、音乐循环销毁、场景重入与 UI 编码。浏览器验证详情互动、徽章演出与音乐开关。

当前仍使用程序化像素效果，不是原作几百招式逐帧资源的完整复刻。完整图鉴世界、原作 BGM、特殊设施玩法和各地精细背景属于后续内容工作；当前支持/禁用状态以注册器和语义审计为准，不用早期14项禁用清单描述现在。

外观图层、二维视口/投影和独立环境叠层的注册、生命周期及当前边界集中见[外观与视图](../engine/presentation/APPEARANCE_AND_VIEW.md)。

逐字对话采用描述→字素时间轨道→纯采样→DOM宿主，文字效果独立注册；确认/取消的领域等待由UI shell拥有。详见[对话合同](../engine/presentation/DIALOGUE.md)。当前验证见[进度](../project/STATUS.md)，历史检查点不代表本轮全部浏览器验收。

资源帧片段独立于野外方向动画：SpriteClips保存资源/裁切/时长与显式绑定，SpriteCanvas消费时间采样并负责Canvas播放，共享UI宿主清理页面资源。原生详情页与插件共用接口，资源统计与原作时序边界见[帧片段合同](../engine/presentation/SPRITE_CLIPS.md)。

## 注册场景的纯镜头通道

field(frame)消费冻结SceneFrame：id、payload、duration、start、progress（0–1）和reducedMotion，纯同步返回{x?,y?,zoom?}。x/y是相对镜头焦点的世界像素偏移（绝对值≤64），zoom为0.25–4倍率；缺省0/0/1。静态cameraProfile与该倍率组合，不改变世界坐标。reducedMotion时宿主跳过field回调并返回中性变换，场景结束/失败也回到中性；错误或异步回调只报告一次并禁用该场景剩余镜头采样，不中断主渲染循环或计算规则。

SceneDirector统一拥有场景时钟和镜头采样，SceneDOM只消费可选draw，不为field-only场景遮住世界。ViewApplication将纯变换组合到投影；实际Renderer、可见地图计算和公开project/unproject共享投影，不能各写一套屏幕偏移。纯变换不发布业务事件、不提交规则，注册回调不能使用命令或事务。

闪光/淡变无需新增引擎分支：通过draw注册叠层并尊重reducedMotion；缩放/震动通过field注册确定性采样。原作具体曲线、场景脚本和素材由业务内容提供。跨地图提交仍走TransitionController覆盖边界；这套接口不让颜色遮盖擅自成为逻辑传送。

真实入门例见[scene-story.test.js](../../examples/scene-story.test.js)，Node端口验收见[story-presentation.test.js](../../tests/story-presentation.test.js)。如果源码更名，搜索`fieldTransform`、`api.presentation.scene`、`Escort members`。

剧情中field-only场景声明独立field-presentation资源，可以与move、escort或cameraTo/cameraFollow并行；两段镜头片段不可重叠，完整parallel等待所有分支结束再继续。带draw的场景保留全屏/模态互斥，不能借字段同时绕过两种合同。

## 内嵌视觉宿主

插件Canvas引用注册presentation，VisualTimeline进行纯时间采样，VisualCanvas只画冻结frame，LayoutDOM持有页面/区域/HUD作用域实例；ExtensionDOM在统一帧调用render，文档可见性事件在无后台帧时仍暂停时间。隐藏页签暂停、结束静帧、reducedMotion与失败销毁共用合同；有限feedback亦使用相同取样和schema，循环只经显式Canvas挂载。点击经宿主坐标变换→action事务，表现不决定规则。参数、作者示例与生命周期见[UI合同](../engine/presentation/UI_CONTRACT.md)。

## 原生战斗阶段与水面反射（2026-10-07）

BattleDirector可注入layout与viewport；缺省沿用通用320×224布局。Emerald的battle-presentation提供240×160坐标、物种偏移、原作训练家资源和entryPhases。BattleSession顺序执行入场阶段与可等待的presentation.dialogue，退场计划可先播放presentation并等待dialogue，再在覆盖提交点清空战斗画面。奖励、捕捉和货币仍由原结算所有者拥有；失败通过原checkpoint恢复，不能让演出写规则。

原生教程的demonstrateBattleAction/demonstrateBagItem调用相同菜单选择、招式选择和背包使用处理；wait/submit为窄端口，提交走BattleApplication.applyAction，与手动行动共享插件事件和结算。autoBattle只锁定玩家输入，不隐藏菜单。无UI的测试端口可直接提交固定动作。

Renderer注入reflectionSurface/reflectionResource/reflectionScale/reflectionColumns；reflection-canvas消费和人物相同的AppearanceFrame与运动采样，检查紧邻地形、垂直翻转并保留精灵包围框。原作48帧伸缩由包采样，actorImage窄绘制端口按定点列索引读取独立反射贴图，避免Canvas缩放抹掉微动；离开水边从移动第一帧起不再使用旧步起点。反射不拥有NPC坐标、保存、行为或随机数。地形分类/源配色均在Emerald包，通用渲染器不写地图或角色ID。

场景NPC固定路径可通过地图连接连续移动；NPCSystem迁移scene pin并隐藏旧投影，FieldDirector使用目的地相对起点保持像素/步态与两侧预约。当前地图同名角色优先，避免旧场景pin污染新场景；失败移动不迁移。`ignoreTerrain`仅用于显式NPC路径，沿World有效连接/占位移动而忽略地形、跳崖与高度门槛；玩家路径和自动寻路不得使用。
