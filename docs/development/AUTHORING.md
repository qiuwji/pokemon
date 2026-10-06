# 在现有工程中写业务与插件

源码编辑src，资源/网格等派生输入由工具写generated；直接运行两棵输入树，见[目录合同](SOURCE_LAYOUT.md)。


这份指南面向第一次拿到项目的开发者。先读[当前范围](../project/SCOPE.md)和[状态](../project/STATUS.md)，再选[领域Skill](../project/SKILLS.md)。默认任务是在已有框架上写内容，不是重新设计引擎。Skill保存工作方法，本页说明公共写法；状态和验证数量只在项目记录中维护。

目录与任务落点统一见[代码地图](CODE_MAP.md)，以下表格规定修改边界。

## 找到代码该放在哪里

| 任务 | 代码位置 | 修改边界 |
| --- | --- | --- |
| 原作地图、事件、训练家、物种、道具与默认政策 | src/packs/emerald的对应定义文件、src/content/manifest.json及对应分类文件、generated/assets | 使用已有领域注册；原生地区数据放content/stories，动态短事件由story.js装配；不往world或battle里加地图ID分支 |
| 独立玩法/现代机制/新页面 | src/plugins/中的独立模块 | 导出manifest，setup注册；通过查询/命令/intent运行；禁止导入adventure、应用服务或抓window.game |
| 新资源/导出流程 | generated/assets及tools | 以grid/metatile组织地图；保留来源；不能写回work/pokeemerald或sources |
| 必要的新通用规则/生命周期 | src/engine和明确的应用所有者 | 先写缺口合同及验收例，作为框架任务；核心不依赖内容包、DOM、Canvas |
| 新演出/视觉 | 注册定义、src/presentation及src/adapters | 描述、纯取样和绘制分离；不重算规则、不使用游戏RNG；统一时钟及reducedMotion |
| 验证 | 核心合同放tests/；产品插件专属用例和入门例放examples/ | tests不得导入已安装产品插件或examples；共享夹具放tests/helpers、tests/fixtures，替代项明确标注 |

默认领域不支持的能力记录为缺口，不能假装插件API已经支持。复杂UI与现代行动增强按各自领域合同编写；完整NPC日程、部分持续HM及未提供的渲染/替换能力，以STATUS为准。

## 从插件到浏览器入口

最小示例见[examples](../../examples/README.md)。`manifest(id,setup,permissions)`和`session()`只是**测试辅助函数**。生产插件是导出的普通对象，包含id、apiVersion、version、dataVersion、permissions和setup；版本是语义版本字符串如1.0.0。浏览器不会扫描examples自动装载插件。

1. 在`src/plugins/my-feature.js`导出manifest。setup只注册，不开始战斗、查询未就绪游戏或写存档。
2. `api.content.register(kind,"local-id",definition)`返回带插件命名空间的ID。后续引用保存返回值，避免把局部ID当成全局引用。故事、页面、行为和视觉用各自注册入口。
3. 在`src/plugins/catalog.json`登记模块路径和装配配置；app.js统一加载目录，不逐个导入插件。不要把规则、库存或剧情分支移入启动入口。宿主创建目录并seal校验，然后建立EmeraldAdventure并attach扩展端口。
4. 玩家点击布局控件或菜单时，通过已注册action执行。插件外部使用`api.commands.dispatch(id,input)`；action内部通过ctx.store、ctx.states及ctx.intent提交，**不能在事务中再次dispatch**。
5. 查询快照只读；完整个体UID随精灵而保持，不能用席位/队伍数组下标替代。插件保存自有记忆，已有队伍/背包/位置仍由原领域所有者保存。
6. 页签、HUD及表现根据已提交事实更新。等待动画不能改变命中、伤害或奖励结果。真实UI可用性和资源音频需另做浏览器观察。

公开命令/schema实际在[application-commands.js](../../src/packs/emerald/application-commands.js)，权限/意图在[extension-intents.js](../../src/packs/emerald/extension-intents.js)，注册面在[plugin-host.js](../../src/engine/extensions/plugin-host.js)。文件移动时搜索`registerEmeraldCommands`、`validateEmeraldIntent`、`class PluginHost`。网络沿同一命令协议，不提供任意脚本注入，也不因此承诺联机同步。

## 写法与代码质量

一个模块围绕一个状态所有者或一种政策工作。把变化的数据注册为内容，把不可变的时机/结算合同留给框架；避免巨型if/switch按招式、地图、设施或插件ID分发。尚无通用需求时也不要增加空抽象层。

应用服务声明实际需要的窄端口，不注入整个game，不直接调用其他应用类；装配层连接协作。UI只显示查询并调用命令，不直接写game.state。异步完成、读档和换地图后重新解析身份/查询，不保留旧对象引用。

可变状态只在所属领域提交。所有输入、引用和schema在成本扣除及RNG取样之前校验；事务失败回滚相关领域和插件数据。演出失败与规则失败要区分，不能因已提交后的UI异常重复发钱或重抽随机数。对有限会话说明进入、推进、结束、中止、清理和保存政策。

不兼容旧开发档：新必需字段改变当前保存版本及夹具；不要添加迁移回退、宽松解码或默默补字段来掩盖坏档。缺插件/坏档保护原文仍然必要，不能删除。注册失败原子性、只读查询、权限和生命周期守卫不能为了业务例绕过。

来源、公式和先后次序必须引用固定只读参考；“原作确认事实”“本项目选择”“仍待验证”分开写。现代插件不改变默认Gen3。新增领域接口同步公开类型、依赖方向守卫和对应规格；新增UI文件须在现有架构守卫覆盖中。

## 工具和脚本

从包含package.json的项目根运行。读取资料优先`rg`，没有该工具时使用同等文本查找。下面命令的影响不同，执行前确认目标。

| 命令 | 作用 / 输出 / 注意 |
| --- | --- |
| `npm ci` | 安装锁定开发依赖；Node/npm与Python3需可用，项目依赖用于严格类型检查 |
| `npm run dev -- --port 5175` | Python HTTP服务器；浏览器打开http://127.0.0.1:5175/；端口已占时先观察，不重复启动同一服务 |
| `npm run dev -- --host 0.0.0.0` | 监听所有网卡，供同一局域网的其他设备用http://<本机IP>:5173/访问；会把控制通道一并暴露，仅限可信网络；首次触发系统防火墙放行 |
| `node --test examples/battle-effect.test.js` | 运行一个真实端到端无浏览器例；按实际任务选择文件 |
| `node --test --test-name-pattern="case关键词" tests/领域.test.js` | 只复查匹配用例；确认有实际匹配，不把零用例视为通过 |
| `npm run check:contracts` | TypeScript严格检查公开合同消费；不验证规则语义 |
| `npm run check:docs` | 本地文档链接及Skill代码片段同步；不执行游戏规则 |
| `npm run check` | 内容启动引用、公开类型和src/generated语法；阶段合并/收口或相关合同改变时执行 |
| `node tools/audit-mechanisms.mjs work/pokeemerald` | 读取固定C参考，更新docs/engine/battle下生成审计；登记/无引用不等于规则已验证 |
| `python3 tools/import.py emerald work/pokeemerald` | 先加--check预演；通过内容清单及字段所有权合并选定内容，不自动调用grid；详见[导入索引](IMPORT_SCRIPTS.md) |
| `python3 tools/import.py encounters work/pokeemerald` | 先加--check预演；只写地图陆地遭遇字段，禁止触碰进化；详见[内容管线](CONTENT_PIPELINE.md) |
| `python3 tools/import.py audio work/pokeemerald` | 复制选定真实WAV并记录来源hash，写generated/assets/audio；不是整部原作BGM自动转换 |

其他导入工具按`tools/`实际参数解析和输出路径读取，不根据名字猜用法。宽导入器需要在临时**项目副本**中生成、比较和挑选本次数据，不在参考目录创建输出，也不对主树整包覆盖。不需要重新下载已提供资料；缺参考时按[项目导航](../../skills/emerald-project-handoff/references/project-map.md)的固定修订获取。

## 提交一个可接手结果

实现一个完整行为链，按[测试指南](TESTING.md)证明它以及重要失败边界。更新STATUS、受影响规格和CHANGELOG；有接口变化时同步Skill及实际示例。记录未执行项及下一步，不以测试通过泛称完整原作已完成。交接须包含代码、资源、docs、skills和参考获取信息，不能只发Skill文件。

## 新地区剧情与对话

内容数据放src/content/stories并登记manifest；插件通过registerBundle，不修改app.js硬接剧情。对象绑定用selector.objectId或map+localId/script，公共call传schema参数，对话用目录及显式bindings；条件/选择结果仍由领域命令处理。持久脚本需要durable、每条稳定node、checkpoint和battle.onResult，不把动画帧或闭包写存档。完整示例、字段与错误说明读[剧情架构](../architecture/STORY_CONTENT.md)、[剧情语言](../engine/story/STORY_LANGUAGE.md)和[组合例](../../examples/story-bundle.test.js)。

观察、AI控制及测试插件参考[AI控制指南](AI_CONTROL.md)。纯只读扩展注册queries，业务修改继续用actions/intent；产品模块测试放examples，核心只依赖最小测试夹具。
