# 从 pokeemerald 的 C / 数据脚本转写到网页工程

本指南给第一次接手的模型使用。目标是迁移原作的**行为和内容**到已有引擎，不是将整个GBA代码库编译成网页，也不是逐行把指针和全局变量改写成JS。读取文件、检索、编辑、执行Python/Node和观察浏览器即可完成工作。

## 哪部分机械，哪部分需要判断

| 原作内容 | 迁移方式 | 判断点 |
| --- | --- | --- |
| JSON地图、常量表、PNG/WAV及数值元数据 | 现有导入脚本按profile生成，再校验引用和遗漏 | 网格/图集、来源修订、字段所有权、本地化 |
| scripts.inc中的条件、标签、文本、移动数组 | 先展开流程图，再转地区bundle与现有命令 | 触发时机、临时变量寿命、取消/失败/重入 |
| C special、任务回调与战斗结算 | 追踪读写和等待点，映射到领域公开接口 | 谁拥有状态、何时提交、如何恢复、是否真有框架缺口 |
| GBA显存、OAM、DMA、硬件输入与任务调度 | 保留可观察表现，使用网页适配器/导演 | 不迁移硬件内存布局，不拿动画决定规则 |
| BGM/SE序列、voicegroup、采样及音频调用 | 按[音乐导入流程](music-import.md)生产成品并转写选择/恢复政策 | WAV采样不等于整曲，保留音色、速度、引子/循环与等待语义 |

批量表导入可以机械化；涉及special或异步结果的剧情不能靠正则翻译保证正确。出现未知命令时保留pending来源记录，不用空实现、忽略条件或直接teleport声称完成。

## 先定位项目与资料

从[项目地图](../../emerald-project-handoff/references/project-map.md)找到项目根，确认package.json和dist/engine。项目是现有自研ES模块网页工程。先看docs/project/SCOPE.md、STATUS.md和工作树，不新建第二套工程。

在项目根运行：

```sh
git status --short
git -C work/pokeemerald rev-parse HEAD
python3 tools/import.py --list
```

参考修订应为`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。`work/pokeemerald/`、`sources/`只读；所有新增代码、记录和资源放在其外。参考缺失时按project-map取得固定修订，再读源码；不使用最新分支冒充固定来源。不会写C也能转写数据切片，但必须追踪它调用的C函数，而不是凭宝可梦常识补齐。

## 一条切片的完整流程

1. **选可验证入口**：例如“古辰镇员工介绍商店并赠药，满包可以重试”。记录地图、对象local_id/script、坐标、入图回调、前置flag/var和最终事实。
2. **查全依赖**：map.json → scripts.inc入口label → goto/call/include及文本/移动label → special索引 → C实现和它启动的任务。另查flag/var常量、奖励与训练家定义。
3. **写来源分支表**：每条分支列条件、等待点、领域操作、成功/失败结果、状态写入和重入路径。先确认`VAR_RESULT`是谁写、何时写；不能把waitstate删除后继续执行。
4. **选落点**：使用下表；原作业务尽量只改内容/政策。缺公共能力时留下“原作行为→现合同缺口→期望接口→验收例”，明确归框架任务；内容作者不绕过领域。
5. **导入必要资料**：选择地图/物种/profile，先--check，再正式导入；只执行相关工具。核对diff和遗漏，不为加一句对白重导全部资源。
6. **转写业务**：bundle中的稳定命名、条件、对白、移动和领域操作；长剧情使用durable/node/onResult。剧情、规则、动画各用所属接口，不复制C全局状态为新的真相。
7. **验证行为**：真实对象/到达触发→公开操作→成功或失败→重入→保存恢复。测试选择、碰撞、满包、战斗输赢及解锁等实际结果；浏览器观察另记。
8. **留下交接**：按[切片模板](story-slice.md)记录固定来源、已实现分支、待实现分支、实际检查及下一步；更新STATUS和受影响规格。Skill不记录易过时完成数字。

推荐检索：

```sh
rg -n 'OldaleTown_EventScript_MartEmployee|FLAG_RECEIVED_POTION_OLDALE|VAR_RESULT' work/pokeemerald/data/maps/OldaleTown work/pokeemerald/include
rg -n 'ScrCmd_special|ScrCmd_waitstate|ScrCmd_giveitem' work/pokeemerald/src
rg -n 'giveitem|special|waitstate' work/pokeemerald/asm/macros work/pokeemerald/data/specials.inc
rg -n 'registerBundle|onResult|inventoryFull' dist/content/stories dist/engine/story-catalog.js docs/engine/story
```

搜索找不到具体实现时继续追宏展开；例如giveitem可能是宏组合，不能因为没有名为ScrCmd_giveitem的函数就判定原作缺实现。

## 代码放在哪里

| 责任 | 落点与写法 |
| --- | --- |
| 默认地图/图集/物种等基础数据 | dist/content/manifest.json对应分类文件；Node统一loadContentSync，浏览器统一loadContent；不要恢复content.json |
| 默认地区剧情/对白/对象绑定 | dist/content/stories/的bundle并登记manifest；script身份显式绑定，禁止用includes猜台词 |
| 必须运行时构建的短事件 | dist/packs/emerald/story/regions或common，由现有runtime装配；不让story.js或adventure.js重新成为巨型业务文件 |
| 默认Gen3通用政策 | 对应dist/packs/emerald定义或engine/rules/gen3合同；生成文件有@generated，改输入/生成器而非手工补生成物 |
| 独立扩展或现代规则 | dist/plugins/普通manifest，通过api注册、只读查询和受控命令/intent；catalog装配，不改app逐插件接线 |
| 新通用框架缺口 | dist/engine所属领域、窄应用端口及相应适配器；须明确任务，不从业务包直接访问内部状态 |
| 图像/音频 | dist/assets及来源记录；地图按metatile/grid，PNG整场景不能代替地图 |
| 测试 | 通用核心合同放tests；产品插件专属测试及作者例放examples；共享夹具在tests/helpers，不跨层导入 |

## 脚本命令怎样映射

以下是行为映射，字段细节查[剧情语言](../../../docs/engine/story/STORY_LANGUAGE.md)，不创造同名C解释器。

| C / 事件语义 | 当前网页落点 | 容易漏的差异 |
| --- | --- | --- |
| 对象script / MapScripts / coord_events | bundle.entries选择器、事件trigger及生命周期 | 入图刷新与坐标到达不等价 |
| checkflag/goto_if_set | requires或if条件 | flag和completed/reward账本不能混用 |
| compare/goto_if_eq | compare只读查询与if | 保留原数值含义，区分VAR_RESULT与长期变量 |
| setvar/addvar | setVariable | TEMP寿命先查C，不能全部持久化 |
| msgbox/text / yesno/multichoice | dialogues、dialog、choice及后果commands | 多角色每句name，取消不是自动完成或领取 |
| giveitem / givepokemon | reward.onResult或接收领域接口 | 满包/容量失败先分支，成功才设置领取事实 |
| trainerbattle / waitstate | 领域battle；长剧情durable与battle.onResult | 不能把普通battle当成等待胜负；异步回调必须关联结果 |
| applymovement/waitmovement | move/face/approach/escort及sequence/parallel | 原方向分支和合法路径必须保留，parallel不能争抢演员 |
| warp / fade / shake | 合法scene/teleport、注册presentation | 正常走路跨道路不能替换成传送；演出不写规则 |
| special | 继续追data/specials.inc和src，调用领域公开接口 | 未追实现前不翻译成空命令或奖励 |
| lock/release / hideobject | 导演资源生命周期、对象覆盖 | 交互锁由所有者释放，隐藏的visit/permanent政策要有依据 |

## 导入工具的实际用法

完整参数、前置依赖、归属和破坏性见[IMPORT_SCRIPTS](../../../docs/development/IMPORT_SCRIPTS.md)。以下在项目根运行；选取的资料必须在固定参考中存在。

```sh
python3 tools/import.py emerald --help
python3 tools/import.py emerald work/pokeemerald --maps OldaleTown --check
# 审阅预演后，去掉 --check 执行同一选择；地图网格是下一条独立工具。
python3 tools/import.py grid work/pokeemerald --maps OldaleTown --check
node --test examples/story-bundle.test.js
npm run check:docs
```

大切片可复制tools/imports/config/slice.json，按其中真实字段改maps/species/locale，再--profile指定它。本地化放tools/imports/locales或对白目录，不写长中文常量进解析器。--target可用于临时dist，但需先准备它所需的内容清单/现有依赖；它不会自动复制完整工程。

音频分两条链：`python3 tools/import.py audio work/pokeemerald --check`复制profile所选WAV；原作整曲BGM/SE需要序列与音色离线转换。[音乐指南](music-import.md)列出真实参考路径、工具缺口、产物归属、播放绑定与验收，不能用mid2agb或wav2agb冒充成品音乐导入器。

## 测试与质量边界

测试准备可以构造场景，但测试动作必须通过真实注册、事件入口和领域命令；不要mock整场战斗或假造结果。对原作还原的断言来自来源分支表，而不是重新写一遍实现公式。至少覆盖本切片成功、关键失败、不重复奖励/费用、重入和保存恢复；本次未涉及的领域沿用仍匹配的证据，不每轮重跑全作。

核心代码与产品插件测试分开：`npm test`核心，`npm run test:plugins`插件作者例/装配，`npm run test:all`阶段回归。`npm run check`验证引用、类型、语法、文档和lint。测试数减少要说明撤下了哪个产品用例，不能删除原作失败分支来凑通过。

实际游戏可通过[AI控制与测试通道](../../../docs/development/AI_CONTROL.md)观察和操作。对话、选择、移动和战斗仍由正常命令执行；测试插件只在显式测试环境启用。JSON状态证明领域结果，截图/实际输入证明画面与交互；控制通道通过不等于动画保真。

代码质量要求：规则单一所有者、职责单一、单向依赖、稳定身份、引用预检、失败不半写；禁止为了一个地图ID在核心添加分支，禁止直接写window.game/存档，禁止skip失败或关闭合同，禁止新增旧开发格式兼容。只有真正表达不了原作行为时才申请框架扩展；复用已有接口优先于叠加一套“C兼容层”。
