# 内容边界与动画路径评估

2026-10-08，以下评估保留重构前的事实。当前收口结果见文末；静态/离线验证不表示原作音画验收完成。

## 内容包的职责

当前 src/packs 有147个JS模块；按静态import语句解析目标统计，引用src/engine 287次（73个文件）、src/presentation 16次（11个文件）、src/adapters 9次（5个文件）。这些数量描述位置，不能把所有engine引用都视为内部实现绑定。

当前[架构说明](../../ARCHITECTURE.md)把packs/emerald定义为规则配置、应用装配、地图业务与页面的集合，并没有定义为纯内容。用户提出的纯内容方向，需要改变这个边界。混放是事实：ui-shell构造ControlDOM/DialogueDOM/ChoiceDOM，network-interface构造具体传输，animations构造PresentationRegistry并安装具体画师。

应该分开内容、规则装配、应用用例、演出装配与浏览器UI；实际落位需要单独实施，不采用只搬文件或转出口掩盖内部绑定。内容仅消费有版本和边界测试的公开编排/注册合同，宿主在组合入口构造具体服务，再向应用注入窄端口。公开构建工具可直接导入，可信宿主不必全部绕行plugin-host；插件沙箱和宿主依赖管理是两个不同职责。

现有架构测试保护engine无DOM/pack/presentation依赖，以及presentation无pack依赖；没有保护未来的纯内容层。应用ports约束可读依赖，仍不等同于实际实现可替换。无环也不等于低耦合。

## 战斗动画路径

普通本地单/双打入场slide/send与训练家回场已经进入[序列注册](../../src/packs/emerald/battle/sequences.js)。[导演](../../src/presentation/battle-director.js)仍支持编译帧、显式注册的旧轨道、未命中时的opening/actions/capture采样；append注册允许帧与旧轨道同时运行，因此它们不是严格互斥的四级降级。

其余347招仍未编排；旧内置招式表和属性选通用特效已删除。旧开场/换人/捕捉模块的存在由这些事件自身的未迁移路径决定，不由招式数量决定；可以按事件族独立退役。外部显式注册的旧合同应单独决定迁移，不混同默认复刻覆盖。

优先缺陷：PresentationRegistry.prepareSequence没有匹配时返回null，编译异常报告后也返回null；BattleDirector.sample在无animation时允许旧演出。已选中序列失败可能被旧视觉掩盖。应区分未覆盖、有效编译、拒绝/失败，失败不尝试另一套演出。导演当前还控制HP插值、隐藏、训练家/球状态与帧映射，不能称为已经只剩播放职责。

## 合并范围

有限片段统一不可变帧合同、时钟、声音时间点、取消与失败清理；战斗导演只协调语义事件、对白和演出交接。换人、捕捉、状态等逐族迁移后删除其旧采样，而不是等354招全部完成。

Scene/Travel/Growth/Door导演包含不同的提交点、失败恢复和对象隐藏生命周期，不应合成一个包含所有业务分支的超级导演。可共享播放机制，保留各自用例协调。持续天气、输入驱动行为和音频渐变也不适合无边界地预编译为巨量帧；音乐的包络应由音频时钟消费。FrameSequence目前使用席位/HP等战斗通道，跨领域复用需要定义通用底座及领域帧合同，而不是直接把其他领域塞进BattleFrame。

优先顺序：阻断失败回退；归一战斗有限片段；移出UI/具体画师与装配；建立纯内容依赖检查及替换宿主代表验证；再提取跨领域确实重复的播放器能力。目标是共享能力且保持所有权，不使用原作指令VM。

## 本次尚未收口的功能

普通战斗常驻“对方队伍”文字及其样式已移除。六球状态与原作条素材已准备，入场状态条尚未通过统一帧通道接入；已撤回另设HUD计时器的临时接线，避免新增长期播放路径。

用户的音乐要求明确为地图间切换。已核对固定参考overworld.c的TransitionMapMusic/GetMapMusicFadeoutSpeed及m4a.c的FadeOutBody：步行换曲淡出速度8，骑车4并以4淡入；warp目标室内2、其他4，屏幕覆盖与BGM停止后才提交换图，同曲连续播放。运行时接线尚未实现，不计作完成，也不扩展战斗音乐范围。源码中的speed为16级音量每级间隔的声驱动tick；映射到浏览器时钟及听音差异需明确验证。

验证记录见[本批manifest](../validation/2026-10-08-party-tray-map-music/manifest.json)。仅静态/离线证据；未操作游戏，未听音验收。

## 本轮收口（功能提交之后）

前序功能已先提交：原生入退场、队伍状态条、HUD和地图切曲为0290f9e，中心治疗、入场重播与选择框遮盖修复为cfaebf2。上述“尚未实现”段记录评估时状态，当前功能证据见[中心与入场修复](../validation/2026-10-08-center-and-entry-fix/manifest.json)。

84个涉及宿主/UI职责的文件迁出packs：game/emerald按assembly、application、commands和presentation划分，ui/emerald拥有页面及DOM生命周期。story.js只保留事件内容，StoryEngine实例/查询移到宿主；map-music只保留政策，控制器移到宿主；布局、捕获时间和内容规则工具使用公开纯作者端口。pack不导入实现层，不保留旧路径转出口，边界测试覆盖全部内容模块。

战斗统一经compileBattleClip准备、frameSequencePlayer采样、battle-frame映射；显式轨道只作为编译输入。匹配序列失败抛错，不回退；append在准备期合成。Scene/Travel/Growth/Door继续保留业务生命周期，尚未把所有跨领域演出归一；换人/捕捉等原作帧内容也仍待转写。当前回归与质量证据见[架构批次](../validation/2026-10-08-architecture-cleanup/manifest.json)。
