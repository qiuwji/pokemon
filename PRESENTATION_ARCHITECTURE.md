# 表现扩展架构（0.13）

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

共用 environment-canvas 绘制天气；环境时间只改变视觉，不消耗游戏 PRNG。角色影子按当前插值位置绘制；昼夜色调对室外应用，室内保持正常。原有图集逐帧动画继续以 8×8 图块、16×16 metatile 绘制，当前户外图集包含 48 个动画 tile 配置，无整景图片。情绪气泡增至 10 类，剧情合同与绘制共享语义词汇。

`NPCBehaviorRegistry` 提出方向、移动与姿态意图；NPCSystem 统一验证格子、范围、玩家与角色的占位。新增行为通过 content 的 npcBehaviors 注册，回调拿冻结的上下文，不拿 NPCSystem；故障仅暂停该次行为。内置 still/wander/horizontal/vertical/patrol/look/jog/hop/spin/sleep/cheer。会话销毁清除 NPC 缓存。

`TransitionPatterns` 提供 fade/shutter/blinds/mosaic/wave/iris，支持插件 `api.presentation.transition`。TransitionController 保留遮盖—提交—揭开时序；无论何种图案，opacity=1 强制整面覆盖，减少动态效果时使用 fade。画面覆盖 Canvas、菜单与战斗 HUD。

## 通用场景演出

`SceneDirector` 管理单个场景的校验、时间、互斥和 finally 释放；`SceneDOM` 绘制注册定义。剧情使用 `{type:'presentation', id, payload}`，与其他模态指令不能并行。奖励仍由独立 reward 指令负责，场景展示不写进度。插件通过 `api.presentation.scene(id,{duration,schema,draw,sound?})` 注册。

徽章、联盟入场、选美舞台、战斗塔、标题、图鉴已有 6 个演出示例，可在主菜单“场景演出”检查。这些不是完整道馆、联盟、选美或战斗塔玩法。菜单页面采用短 steps 动画，减少动态效果时禁用。

应用/网络统一命令 `core.presentation.play` 的输入为 `{id, payload?: JSON字符串}`；内层 payload 再由场景的严格 schema 校验。插件需要 presentation 权限。UI 门面自动编码，剧情直接使用数据对象。这样网络不需要放宽全局命令 schema。

## 音频端口

`AudioAdapter` 只播放注册的真实资源文件，支持解码缓存、采样循环区间、music/sound/master 通道、淡入淡出、静音/后台续播与销毁。插件 audio 注册、sound 提出自有声音请求；规则/未提交事务不能播放。页面使用具名 sound(id)，音频不改变领域结果。完整合同与实际资源来源见 [AUDIO.md](docs/engine/AUDIO.md)。

合成提示音和示范旋律已删除。现有 7 个参考 WAV 供临时 UI/战斗采样映射及初始精灵鸣叫，原作 BGM/SE 编曲尚未导入，不用缺失资源宣称音频保真。地图显式指定 music/battleMusic；未配置时安静。

## 验证与边界

312 项全量测试、内容检查通过。新增检查覆盖脚本错误、插件覆盖、逐席位效果、17 属性色、持续视觉、转场完全遮盖、NPC 意图碰撞与错误隔离、音乐循环销毁、场景重入与 UI 编码。浏览器验证详情互动、徽章演出与音乐开关。

当前仍使用程序化像素效果，不是原作几百招式逐帧资源的完整复刻。完整图鉴世界、原作 BGM、特殊设施玩法和各地精细背景属于后续内容工作；14 个明确未实现招式机制仍由规则层禁用。
