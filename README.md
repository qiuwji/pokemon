# 绿宝石 · 丰缘序章与可复用引擎

当前工程版本 **0.29.0**，插件 API / 网络协议版本 **1**，开发存档版本 **14**。这是可继续开发的单机格子探索、队伍回合制捕捉 RPG 项目；当前游戏内容是绿宝石序章切片。

当前阶段为**七个方向的可扩展框架 + 各一个代表例 + 分领域接手Skill**，暂缓全部原作内容填充。先读[范围](docs/project/SCOPE.md)、[真实进度](docs/project/STATUS.md)和[Skill导航](docs/project/SKILLS.md)；设施活动框架与代表例已接线；其余欠账见STATUS，接手文档不作为实现证明。

## 运行与验证

需要 Node.js 22.13+ 和 Python 3.9+。浏览器运行无前端框架或运行时 npm 依赖；TypeScript/ESLint用于开发检查，导入与场景生成使用固定Pillow依赖。

```sh
npm ci
python3 -m pip install -r tools/requirements.txt
npm run dev
# 打开 http://localhost:5173
npm test
npm run check
npm run test:plugins
npm run check:docs
```

`npm test`仅运行核心合同测试（含插件宿主API），本次 **850/850通过**；`npm run test:plugins`独立运行插件作者示例和当前装配清单检查，**21/21通过**，均无失败/跳过。`npm run test:all`显式运行两组；`npm run test:coverage`仅统计核心测试。`npm run check`检查内容引用、图集、公开合同、全部JS语法、文档、ESLint及首批三个JS模块的严格类型。实际范围见[本轮证据](docs/validation/2026-10-04-ai-control/manifest.json)；本轮浏览器已验证本机控制的观察、移动与菜单操作；完整浏览器组合、覆盖率和远端CI未重跑。可部署dist/到静态HTTP服务，ES模块与fetch需要HTTP。

九份Skill各有可运行例、术语、报错与搜索兜底；新人从[文档导航](docs/README.md)和[作者指南](docs/development/AUTHORING.md)进入。当前插件示例组21项已验证，系统与浏览器的结果仍按实际范围记录。

最新应用层复审已补结算失败收尾、旗标预检、捕获入库确认和共享货币模块；故障测试已随此次全量通过。实现范围与后续待办见[当前进度](docs/project/STATUS.md)。

## 已经可玩的内容

原序章：未白镇 → 调查博士背包、三选一伙伴 → 击败蛇纹熊 → 跟随博士回研究所 → 古辰镇、103 号道路与小遥对战 → 返回领取图鉴。原作地图按内容清单装配，基础文件包含 58 种精灵、87 个招式、310 种道具；启动时合并第三世代参考招式，运行目录为 354 个招式。目录数量不代表全部原作语义、素材或道具主动用法均已完成。

- 插件可在页面/原生区域/HUD挂入可点击Canvas，引用注册视觉，循环/暂停/关闭由宿主管理，见[UI合同](docs/engine/presentation/UI_CONTRACT.md)；当前没有预装画廊插件。
- 剧情有序多角色队列与纯注册镜头位移/缩放，实际渲染与坐标反算共用投影；不修改移动规则或存档坐标。
- 详情页可复用帧片段播放、插件替换绑定、静态降级与共享关闭清理；现有3种多帧，默认时序为演示配置，见[帧片段合同](docs/engine/presentation/SPRITE_CLIPS.md)。
- 结构化逐字对话、行内停顿/颜色、可注册文字效果、跳过/确认与关闭清理；见[对话合同](docs/engine/presentation/DIALOGUE.md)。
- 网格图块渲染、连续道路、四向行走/跑步、NPC 自主动作、碰撞/台阶、室内转场与可编排剧情。
- 野生捕捉、六人队伍、盒子、单打训练家后备与替换、双打和本地三阵营练习。救助后可在 101 号道路东侧挑战练习员；双打/混战需要两位可战斗伙伴。
- 第三世代规则管线、76 个特性和 66 种持有效果入口与目录实现、装备和自动消耗。范围及差异见规则清单。
- 注册式野外行动支持自行车、鱼竿、冲浪与飞行：自行车/鱼竿要求实际库存，HM 行动要求徽章与招式。研究装备领取旁路已删除；原作获得剧情尚待地图业务补齐。
- 对象、地形和道具共用资格/目标/计划/提交；可注册受阻行动、对象位移与持续效果。怪力/闪光为规则包政策，箱子/草地/提灯/重量感应器由测试夹具证明组合；地图可声明局部照明。示例尚未默认接入原作业务地图，见[野外合同](docs/engine/field/FIELD_ACTIONS.md)。
- 研究所育成页面：寄存、产蛋、领取、步数孵化、交换；详情页支持装备、进化石，成长流程支持遗传和复杂进化条件。
- 默认启用AI控制插件，通过精简JSON观察与现有命令操作游戏；`?control=1`连接本机开发通道。测试插件需`?control=1&e2e=1&test-harness=1`显式开启，提供测试室、原子准备和结果查询。用法见[AI控制指南](docs/development/AI_CONTROL.md)；核心/插件测试继续分开。
- 扩展连接页面：本地协议验证及可替换 WebSocket 传输。网络消息经过校验进入与 UI 相同的命令系统，控制当前单机。
- 注册式战斗效果与多轨招式脚本，持续天气/异常状态、升降能力、逐次命中、训练家入场、地形背景；野外影子、昼夜、天气和表情。六类转场及六个独立场景演出示例。声音由用户开启，采用真实 WAV 资源；插件可注册音效/音乐，支持通道、循环和暂停续播。原作完整 BGM 尚未导入。

当前有 44 个具体招式脚本，其中 25 个对应已导入的 87 个招式；其他招式使用通用视觉回退。场景菜单中的徽章、联盟、选美、战斗塔、标题、图鉴是演出能力示例，已有独立设施会话、两场连战和非战斗活动合同，完整原作设施玩法尚未开放。

世界天气、地图/坐标/脚本来源、时间联动、独立战斗映射、可注册天气画师与插件命令见 [WEATHER.md](docs/engine/world/WEATHER.md)。世界设置不被战斗招式倒写，天气转换通过纯导演平滑混合。

背包只有槽位真相：五个原作口袋的容量、重复堆叠、选槽消耗、满包拒绝、插件新口袋与保存重载共用领域。商店不会在满包时扣款，奖励不会在失败时标记领取。合同与公共只读预览见 [INVENTORY.md](docs/engine/items/INVENTORY.md)。

关键道具绑定与内容作者示例见 [ITEM_ACTIONS.md](docs/engine/items/FIELD_ITEMS.md)；道具只声明入口，资格/计划/动画/提交复用既有领域。背包支持登记到 C / 触屏 SELECT，保存及公共命令见 [ITEM_SHORTCUT.md](docs/engine/items/FIELD_ITEMS.md)。

## 剧情与对话扩充

原生地区包放`dist/content/stories/`，同一manifest装配；插件通过`api.story.registerBundle`注册。支持显式对象/原脚本绑定、参数化公共call、领域结果分支、条件选项，以及durable稳定节点和战斗结果关联续接。对白按行定义角色、立绘/表情与标量插值，确认后的记录可以保存回看。

字段与用法见[剧情语言](docs/engine/story/STORY_LANGUAGE.md)、[对话合同](docs/engine/presentation/DIALOGUE.md)，职责与限制见[剧情架构](docs/architecture/STORY_CONTENT.md)，完整组合见[story-bundle示例](examples/story-bundle.test.js)。普通短battle不等待胜负；持久脚本必须声明durable与稳定node，不支持活跃战斗中途存档。新增机制不等于原作全部NPC/剧情已经转写。

## 当前引擎机制与进度入口

| 子系统 | 已实现的合同 | 尚未收口 |
| --- | --- | --- |
| 插件遇敌 | 注册step政策、格子/有效表查询、宿主随机选格、接触去重、一次性凭证及直接野生战斗；物种外观可公开绑定 | [合同](docs/engine/world/ENCOUNTERS_AND_CONTACTS.md)；完整密度生成/刷新玩法由插件编写，未默认启用 |
| 外观与视图 | 注册服饰图层、持久外观和临时覆盖；二维相机范围/焦点/缩放；独立环境雾层 | [合同](docs/engine/presentation/APPEARANCE_AND_VIEW.md)；服饰素材属于内容，探索迷雾记忆/视线与3D透视未实现 |
| 应用层 | 25 个职责服务、实时有限依赖、显式公共端口、单一状态所有者 | 新业务继续放入对应服务 |
| 剧情/世界 | 数据条件、变量、选择、区域/视线触发；永久与 visit 覆盖；统一地图入口 | 全丰缘剧情与地图导入 |
| 野外行动/地形 | 资格与目标、砍树/碎岩/潜水/攀瀑/钓鱼；关键道具声明行动、库存/徽章资格；高度、滑动/流向规则 | 完整口袋容量/获得、特殊地图/关键道具 |
| 招式学习 | 注册导师/机器方式、50 TM/8 HM 兼容、四槽/HM 保护、原子消费、插件事务与背包 | 正式获得剧情、学习演出与遗忘老人 |
| 机关/交通 | 可注册多格机关、暂停与计时保存、薄冰/裂地板、桥面升沉；Mach/Acro 原帧输入与技巧 | 机关素材、全地形时序与骑行道路业务 |
| 天气 | 可保存世界选择/坐标/脚本/周期/覆盖、入战映射、注册规则/视觉、平滑混合与插件事务 | 全作天气剧情、原作素材/天气音频 |
| 世界时间/树果 | 可保存 RTC 与游玩时长分离、离线政策、定时任务、分钟/每日事件；树果生命周期 | 每日业务、潮汐房间、完整树果土壤 |
| Actor | 全局身份、跨相邻地图、感知/BFS、互动、姿态、七日作息和显式离屏交接；独立日程插件 | 原作人物日常内容、门/HM 导航；伙伴跟随后续插件化 |
| 动画/音频 | 纯关键帧/缓动/片段/分支取样、可注册战斗事件演出；真实资源音频 API | 多渲染宿主生命周期、完整 BGM/SE、原作动画素材 |
| 战斗/插件 | 多队伍/席位、状态/延迟行动、形态投影、行动增强、受控规则、表单/组件/Canvas界面扩展 | 战斗保真、完整设施与现代玩法、任意UI宿主/原生内容替换 |

**接手顺序**：先读 [当前范围](docs/project/SCOPE.md) 和 [真实进度](docs/project/STATUS.md)，再读 [docs/project/CHANGELOG.md](docs/project/CHANGELOG.md) 和受影响规格，最后核对代码。根文档介绍稳定结构；路线记录待办；日志记录变更与验证，不能把历史阶段验收当作当前完整复刻完成。已通过且未受影响的证据沿用，模块变更使对应证据失效；最终 E 阶段另做系统与浏览器验收。

内部模块的可扩展合同已陆续实现，尚未达到“任何上层业务都无需补核心接口”。现有缺口明确保留，见 [机制矩阵](docs/engine/battle/MECHANISM_MATRIX.md) 和 [插件演进](docs/project/PLUGIN_ROADMAP.md)。

## 结构与复用

```text
内容包 / 插件 → 注册表、只读查询与命令 → 领域服务 → 状态提交与事件
                                                           ↓
浏览器输入 / 网络 → 同一命令入口                  Director → Canvas / DOM / Audio
```

`engine/` 不依赖绿宝石、DOM 或绘图；战斗拆为队伍、行动、回合、招式、临时状态、结算与事件服务。`presentation/` 只消费快照与独立时钟。`adapters/` 管理浏览器输入、画面和音频。`packs/emerald/` 提供本作剧情、规则、内容与页面；`app.js` 装配。UI shell 与页面工厂分离，架构守卫覆盖所有页面的状态写入边界。

插件 API 不暴露可写游戏对象。注册有命名空间、依赖、schema 和引用校验；写入通过同步事务或领域命令，失败恢复状态与随机数；页面用声明式控件，数据按插件命名空间和精灵 UID 保存。可信宿主通过显式的应用端口表调用领域用例，每项端口只有一个所有者；应用服务只接收各自声明的有限依赖。扩展和网络使用受限端口。

| 文档 | 内容 |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 层次、依赖、状态所有权与复用 |
| [MOVE_LEARNING.md](docs/engine/items/MOVE_LEARNING.md) | 学习、TM/HM、库存与插件导师合同 |
| [docs/architecture/APPLICATION.md](docs/architecture/APPLICATION.md) | 应用服务、公共端口与重绑生命周期 |
| [docs/engine/](docs/engine/battle/MECHANISM_MATRIX.md) | 时间、Actor、地形、机关、行动、动画与音频等现行合同索引 |
| [docs/architecture/BATTLE.md](docs/architecture/BATTLE.md) | 队伍、席位、目标和结算 |
| [docs/history/engine-evolution-v0.4.md](docs/history/engine-evolution-v0.4.md) / [docs/architecture/CUTSCENES.md](docs/architecture/CUTSCENES.md) | 道具、效果和剧情编排 |
| [docs/engine/battle/GEN3_RULE_COVERAGE.md](docs/engine/battle/GEN3_RULE_COVERAGE.md) | 特性/持有物实现范围与差异 |
| [docs/architecture/MOVEMENT.md](docs/architecture/MOVEMENT.md) | 模式、通行、速度和旅行 |
| [docs/architecture/GROWTH.md](docs/architecture/GROWTH.md) | 培育、遗传、孵化、复杂进化 |
| [docs/architecture/PLUGINS.md](docs/architecture/PLUGINS.md) | 14 项插件能力及实例 |
| [docs/architecture/NETWORK.md](docs/architecture/NETWORK.md) | 命令、协议、顺序、去重和传输 |
| [docs/architecture/PRESENTATION.md](docs/architecture/PRESENTATION.md) | 效果、招式脚本、环境、场景和音频 |
| [docs/project/VALIDATION.md](docs/project/VALIDATION.md) | 当前检查与实机验收证据 |
| [docs/history/implementation-p0-p7.md](docs/history/implementation-p0-p7.md) | 阶段交付和明确边界 |

### 如何新增内容

地图保存 **16×16 metatile 网格数组**，共享 **8×8 tile 图集**；通过 connections 定义连续道路，通过 warps 定义入口。新地图/NPC/资源可由内容包或插件注册，引用在启动时验证。没有整张场景 PNG 替代地图逻辑。

剧情以 `id/trigger/requires/after/once/build` 注册，关联由条件、依赖与完成/奖励账本表达。build 返回对话、行走、靠近、跟随、表情、镜头、场景布置和顺序/并行指令；整树校验后执行，不在 UI 内写剧情分支。

精灵、招式、道具通过内容数据注册。新效果由唯一操作/招式效果表与规则阶段组合；道具在受限草稿上试算，再校验字段、库存和目标后提交。未知效果明确报错；基础内容中已没有显式禁用效果，但完整语义仍须按机制清单逐项核对。表现独立通过 effect/move/scene/transition/audio 注册，新增视觉不修改绘制分支。

转换工具可读取本地 pret/pokeemerald 源码导出选定数据和图块，不加载或执行 ROM。工具需要 Pillow；内容通过[分类清单](dist/content/manifest.json)装配，全部19个导入入口支持预演和独立目标，按字段/产物所有权更新。详见[内容管线](docs/development/CONTENT_PIPELINE.md)与[脚本索引](docs/development/IMPORT_SCRIPTS.md)。测试地图只在显式?e2e=1环境加载。

#天气合同、插件示例和原作映射见 [WEATHER.md](docs/engine/world/WEATHER.md)。

## 存档

格式 `{version,savedAt,state}`，导出另带 pack。当前保存版本见上方版本说明；写入前校验全份有界 JSON、个体 UID、能力/IV/EV/状态、物种/招式、库存、地图、育成、剧情账本和插件依赖。错误、缺失插件或不支持的版本保护原文，自动保存不能覆盖；玩家可导出原档或明确重新开始。

按用户授权不兼容旧开发档。核心和插件迁移入口已删除；仅接受当前存档格式和已加载插件的当前 dataVersion，不保留旧版本回退。本地与上线来源各有独立存储，转移进度须导出/导入。

## 仍未支持的内容与约束

- 没有完整丰缘地图/剧情、道馆、联盟、选美或战斗塔玩法；省略搬家/调时钟开场，部分台词为网页版改写。
- 战斗状态、替身/反射壁/光墙、多回合和延迟效果已有领域实现；354 招式登记仍不等同完整语义、行动历史、原作 AI、结算顺序和逐帧动画均已核对。见机制/招式审计。
- 原作训练家策略、随机数序列、全部极端整数舍入、全部场外联动和逐帧美术/原版配乐不承诺完全一致；具体规则差异见覆盖清单。Mach/Acro 自行车输入与原帧合同已有验证，全地形时序、骑行道路和正式关键道具操作仍在收口，TM/HM 学习与库存合同已有验证。
- 当前插件为受信任项目内 JS，启动加载；没有任意第三方代码沙箱、热安装/卸载、完整内容编辑器。
- 网络入口不提供生产控制服务、认证、多人权威同步或跨重连的全局一次执行保证。
- 公开合同有声明文件、正反类型消费样例和运行时校验；现有 JS 项目尚未全量转换为严格 TypeScript。

## 素材来源

原作图像/地图/数据来自 [pret/pokeemerald](https://github.com/pret/pokeemerald)，导入固定修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。Pokémon、角色、地图、名称和原图权利属于 Nintendo、Creatures、GAME FREAK；本项目是非官方同人演示，不附带 ROM。新增粒子和演出由代码绘制；音频参考来源与当前临时映射见 docs/engine/presentation/AUDIO.md。

中文界面使用本地 [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)，SIL OFL 1.1；许可在 `dist/assets/licenses/`。制作其他同类游戏可复用引擎和适配器，替换成自有世界、内容、名称和素材。

插件现在可以组合地区表/种子选格/接触战斗、按身份切换外观与服饰图层、二维相机范围/焦点/缩放及独立雾层。见[外观与视图](docs/engine/presentation/APPEARANCE_AND_VIEW.md)和[27行公开组合示例](examples/visual-extension.test.js)。未安装完整明雷或换装业务；3D视角、探索迷雾、逐字对话及详情帧播放器仍按STATUS排期。
