# 用 JSON 编写设施玩法

这个插件默认关闭。启用游戏网址参数 `?plugins=facility-content`，然后从冒险菜单进入“设施与活动”。已有 `?control=1` 时追加 `&plugins=facility-content`。正常选队、行动、领取、退出都使用现有界面和公共命令；不改 app.js。

业务作者主要编辑本目录的 [content.json](content.json)，不是 index.js。入口是共享的 JSON 注册器；三个规则模板独立于游戏 UI、原始队伍和经济结算。当前是可运行的扩展框架示例，**不是原作三个领域已经完全还原**。

## 改哪里、怎么验证

1. 编辑 content.json；复制 facilities 中最接近的条目，换一个唯一 id。
2. 在项目根执行 `node tools/check-facility-content.mjs`。其他文件可执行 `node tools/check-facility-content.mjs /绝对路径/新内容.json`。命令只读取文件，使用真实插件/内容注册校验，不写产物。
3. 检查错误，直到条目与物种、招式、训练家、奖励道具的引用都能解析，再刷新启用插件的游戏。
4. 浏览器检查进入、行动、失败、领取及退出。规则自动化示例运行 `node --test examples/facility-content.test.js`；只看校验通过不代表原作画面、音乐或规则保真。

如果拆成多个 JSON 文件，在 plugins/catalog.json 的本插件 arguments 中替换 `json:./facility-content/content.json` 为另一个相对路径。当前一份包可含多个设施；不要把同一个插件身份重复注册两次。代码和素材使用项目相对路径，不能引用某台机器的 work/ 产物。

## 包的结构与身份

顶层 `{version:1, trainers?:[], facilities:[]}`。所有内容是有限 JSON 数据，不能填函数、脚本字符串或任意 JavaScript。facilities 中的 id 是本地身份，例如 tower；注册后成为 `facility-content:tower`。trainers 中 `{id,definition}` 的定义沿用本项目训练家合同：name、script、非负 prize、party；可用 format、requiresPartners、rivals、strategy、actor、bag。party 成员写 species、level，可选 moves、ability、heldItem。

**引用必须写最终身份**：引用本包训练家写 `facility-content:tower-first`，引用本体写 `youngster`，其他插件引用其完整命名空间。不存在的内容在启动前拒绝，不做静默降级。定义只注册一次；不会覆盖本体。

设施共有字段：id、template、name、parameters，可选 requires 条件、team 选队政策。没有 team 就不选队；连战必须有 team。team 支持 min/max（1～6）、levelCap、uniqueSpecies、uniqueHeldItems、bannedSpecies、heldItems、items、healBetween。requires 使用现有条件语言，例如 `{"flag":"pokedex"}`。未知字段、拼错模板、重复 ID 都报错。

## 模板一：battle-sequence

这是开拓区**连战与队伍规则**的底座：parameters 写 trainers（有序训练家 ID 列表，1～100 场）、money（最终奖励）、可选 item（奖励一个已注册道具）。每场都走真正的战斗服务，不另写伤害算法。单打/双打/多阵营由引用的训练家定义决定；选队下限必须满足训练家格式。

行动 next 开始下一场。胜利推进；失败结束；最后一场成功后领取。临时等级、装备/背包限制、场间恢复由 team 决定；世界队伍 HP、PP、经验和装备不会被临时战斗污染，普通训练家奖金也不会再发一次。

本模板能配置连战名单、难度、等级档与奖励。开拓区七座设施的租借/交换、宫殿自主行动、竞技场特殊判定、蛇道房间、工厂队池、金字塔探索和 BP/象征不由这张连战表自动实现，不能把它们假装成同一种连战。新增这些规则需先扩展独立业务模板，再让内容作者填 JSON。

## 模板二：score-contest

这是**轮次评分、组合、妨害、喝彩和排名**的底座，规则清晰且可替换。不是完整 Gen3 华丽大赛评审算法。

| parameters 字段 | 含义 |
| --- | --- |
| rounds | 1～20 轮 |
| appeals | 1～32 个表演，菜单自动生成按钮 |
| opponents | 1～7 个对手，每个 `{name,scores}`；scores 长度等于 rounds |
| crowdThreshold / crowdBonus | 可选，喝彩累计达阈值时加分并清零 |
| prizes | 排名奖励列表 `{rank,reward}`；rank 不重复，必须在选手数范围内 |

表演字段：id（合法行动身份）、label、points；可选 jam、crowd、comboFrom（本表中前序表演 ID）、comboBonus、repeatPenalty。规则为：基础分＋喝彩奖励＋前序组合奖励－连续重复惩罚，最低零；妨害从各对手本轮累计分中扣除，最低零。结算时“严格高于自己分数的人数＋1”是名次，同分同名次。reward 写 `{money,items?:[{id,count}]}`，道具 ID 与容量走库存服务。达到配置名次才待领取，其余直接结束。

体况/宝可方块、原作招式效果全集、选手动态 AI、紧张/兴奋/保护等原作特殊状态、先后手重排、缎带、舞台画面仍属于下一步的独立规则与内容；不能仅把静态对手分数命名为“原作 AI”。完整复刻必须追只读 contest_* C 源码再扩展模板。

## 模板三：reel-machine

这是**投入、随机轮带、分别停轮、赔付线与结算**的底座。

| parameters 字段 | 含义 |
| --- | --- |
| stake | 每次投入的金钱，1～100000 |
| reels | 2～8 个轮带；每个 2～256 个符号，重复符号形成频率权重 |
| lines | 1～32 条赔付线，每条长度等于轮数；每轮偏移 -1/0/1 表示上/中/下格 |
| payouts | `{pattern,multiplier}`；pattern 长度等于轮数，`*` 匹配任意符号 |

spin 由宿主 RNG 各抽一个合法停位、扣款，随后出现 stop-1 等合法按钮。可以任意顺序停轮，每轮只能停一次；最后一轮停下才结算。每条赔付线取匹配规则中**最大的倍率**，不同线累加，最终奖励＝投入×总倍率。中奖进入待领取；没有中奖直接结束。符号、赔付维度及上限均在注册时校验。

当前停止按钮冻结预抽结果，**不是按点击时刻决定停位的原作计时小游戏**。使用世界金钱，不是原作游戏币钱包；原作中奖控制、滑轮/重玩、小游戏动画与游戏币兑换未实现。增加这些能力应走自己的活动/钱包服务，不把算法塞到 UI。

## 生命周期、保存与失败

三个模板使用同一个 FacilitySession。活动期间不能保存/导出；完成或退出后才能保存，关闭网页回到活动前的存档。已提交投入不因中途退出退款。付款失败不会消耗 RNG 或推进活动；领取失败可重试/退出，成功领取只有一次。完成记录随设施插件成为存档依赖，关闭插件时原档受保护，不自动删除数据。

这里只改模板 JSON 的数值/内容仍需考虑已保存的结果是否满足新状态合同，不能任意减少 rounds/对手数后声称旧记录可无条件恢复。本工程不兼容旧开发存档；未来正式发布的数据迁移另按保存合同设计，不在 UI 忽略校验。

## 常见错误

| 错误关键词 | 处理 |
| --- | --- |
| Unknown facility template | template 只允许本页三个已实现模板；新算法先扩展模板 |
| Invalid facility trainer or team size | 引用完整 ID，检查训练家存在以及 team.min 能支持其格式 |
| Invalid score-contest references | 查 comboFrom、scores 轮数、奖励名次范围或重复 ID |
| Invalid reel-machine line, symbol or payout limit | 查每线/图案长度、符号存在、重复线和赔付乘积上限 |
| Unknown or duplicate template reward item | 道具未注册或同一奖励重复列出同一道具 |
| Facility action is not available | 重复投入、重复停轮、阶段不对；先读取 facilityView.actions |

共享编译器在 src/engine/extensions/facility-content.js；三个模板各在 facility-templates/ 中。文件移动时搜索 registerFacilityContent、scoreContest、reelMachine、battleSequence。核心合同测试在 tests/facility-content.test.js，不依赖此可选插件文件；可选插件测试在 examples/facility-content.test.js，两条测试链分别运行。
