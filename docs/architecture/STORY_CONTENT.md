# 剧情内容架构与持续扩充

本文解释当前实现的职责和边界；字段合同见[剧情语言](../engine/story/STORY_LANGUAGE.md)，当前验证与后续工作见[STATUS](../project/STATUS.md)。本工程把原作转写为自己的数据命令，不执行ROM或解释C字节码。

## 内容与执行分开

```text
原作资料 → 地区内容包 ─┐
插件 registerBundle ─┴→ StoryCatalog → StoryEngine → StorySession / CommandRunner
                                                      ↓
                                      应用领域端口 / 对话和场景导演
```

| 模块 | 唯一职责 |
| --- | --- |
| StoryCatalog | 冻结内容、解析脚本/对白引用、校验参数与调用环、展开公共调用、建立对象投影 |
| StoryEngine | 按触发类型索引候选；检查selector/条件/依赖；明确优先级，同级冲突报错 |
| CommandRunner | 执行前预检整个命令树；顺序/并行资源约束；传播暂停与领域结果 |
| StoryProgram | 将显式稳定节点编译为后继图，不读取DOM或游戏规则 |
| StorySession | 持久游标、指令预算、稳定检查点与战斗关联回执；不重新计算胜负或奖励 |
| StoryApplication | 连接既有领域端口、检查点和控制权交接；不存放地区台词 |
| story-dialogue-ports | 对话确认、选择政策和历史写入；选择后果由独立命令执行 |
| DialogueDOM / ChoiceDOM | 安全DOM、逐字/选项输入及可取消时钟；无领域状态写入 |
| FieldDirector | 实际通行下的演员移动、镜头和清理；稳定点可取演员快照 |

业务事实、completed和会话游标是不同状态：事实说明奖励等操作确已发生；completed说明整段入口结束；cursor说明暂停位置。不能因为奖励已发生就补记失败演出完成，也不能让唯一后续入口依赖可能失败的尾部对白。

## 代码和数据放哪里

```text
dist/content/manifest.json              # 同一装配清单，stories是可选分类
  stories/signs.json                   # 显式告示牌绑定与文本
  stories/oldale.json                  # 赠药成功/满包/重复领取代表流程
  stories/clock.json                   # 原作墙钟交互绑定
  stories/dialogues.json               # 现有序章/训练家/NPC本地化文本

dist/packs/emerald/story.js             # 本作事件装配，不放地区实现
  story/regions/*.js                   # 尚需状态构建的现有序章切片
  story/common/*.js                    # 治疗、普通交互和战后桥接
  story/training.js                    # 项目训练场业务
  animation-profiles.js                # 招式表现内容，另有所有者
```

新地区优先在content/stories下编写bundle，并在同一manifest登记；增长后可以拆脚本、对白及来源文件，不要求每个小地区产生五个文件。插件通过api.story.registerBundle登记同样的数据，不在app.js逐地区导入。原作资料位于只读work/pokeemerald；来源记录放项目内容/文档，不写回参考。

对象身份使用objectId或map+localId；完整原C label也可以做selector.script。坐标描述空间，不代替角色身份。原作NPC投影保留sourceLocalId/script；项目练习员明确自己是原创。引用未转写脚本必须保留references中的pending分类，近似文案与项目演绎不能标成原作已还原。

## 已可用的组合

- typed参数化call在编译时展开，参数是词法输入；`{$param:"amount"}`引用整个JSON值，`{{who}}`只在对白中插入声明的标量。无eval或任意对象路径。
- 默认最高priority候选独占入口；通用兜底显式为-100。同优先级同时命中抛出入口ID，装配顺序不决定覆盖结果。
- projections依据已保存事实产生对象位置/可见性视图，既有WorldState覆盖仍归其服务；投影不发奖励，也不修改基础地图。
- mapEnter带map及reason（start/travel/restore）；进入后排队，界面/演出/战斗结束才取得控制。只保留当前目的地，丢弃过期到图消息。
- reward.onResult显式接收ok/alreadyGranted/inventoryFull；只有库存原子提交成功才写领取事实。意外错误继续抛出，不能当作业务满包。
- durable脚本用稳定node编译后继图；checkpoint保存位置、事实、随机状态、游标与受控演员。恢复时在门转场遮盖下重建演员，然后继续节点。
- durable battle在战斗前留ready检查点，交接后暂停命令树。确定结果由关联token提交到唯一会话，重复/不匹配回执不推进；结果提交后自动续接。训练家奖金仅胜利提交。
- 已确认完成的dialog及选项进入有界历史；菜单回看纯文本，不重跑剧情或奖励。

调用环、缺脚本/对白、参数类型、非法节点/分支、并行资源和引用错误均有明确诊断。静态目录校验在装配时进行；依赖实际输入/领域政策的整树预检在执行第一项业务前进行。预检不意味着整段业务原子回滚。

## 稳定点和失败政策

脚本声明durable:true时每条命令（含子分支）必须有唯一node；call生成带调用点前缀的子节点。修改脚本不能随意重命名已有节点。最多2048个展开命令，调用深度16，会话执行步数10000。暂停不能位于parallel；嵌套持久脚本用call，不再启动第二份会话。

存档仅承诺稳定ready状态。活跃战斗不导出/载入；磁盘保存的是战斗前检查点，不承诺战斗中途恢复。移除所需插件或节点时明确拒绝该存档并保留原文，不静默跳过。读档后在可用场景续接，运行中故障保留游标，菜单“继续剧情”可重试；普通移动在待续会话结束前被阻止。

领域已经提交的奖励/捕捉不因后续对白故障撤销。可重试操作须有稳定幂等身份；不能在未记录结果的任意扣费/交易后设置检查点并宣称安全。动画只保存结束态，不保存Promise、DOM或帧毫秒。资源统一在finally/pagehide释放。

## 还没有实现的内容与语言

| 事项 | 当前边界 / 后续归属 |
| --- | --- |
| 全作地图、74个原始NPC全部脚本、精确原文 | 后续按固定参考逐地区转写；pending不是完成 |
| 全部C MapScripts、TEMP寿命、goto/special | 需要逐调用点映射；mapEnter和投影不等于完整解释器 |
| 原作古辰镇员工方向移动/入图位置/音乐 | 本轮只迁移赠药领域结果代表流程，完整原作行为仍待转写 |
| 子脚本可返回任意值、可变调用帧局部变量 | 当前call仅typed词法输入并展开；结果靠所属领域onResult，不存在任意return |
| 任意领域结果、自定义剧情处理器 | 当前公开命令集合及注册领域合同，不开放可写核心后门 |
| 当前所有旧式短剧情自动变持久会话 | 保留实际短事件；作者显式编写durable节点才具备稳定恢复 |
| 原生与插件统一细粒度授权写政策 | 新bundle限制直接旗标/变量/奖励写为自身命名空间；既有高级story.register权限并未被本轮全面重设 |

原作转写例和搜索方法见[接手Skill](../../skills/emerald-story-reconstruction/SKILL.md)，最小端到端组合见[story-bundle.test.js](../../examples/story-bundle.test.js)。测试与浏览器验收分开：headless证明领域提交/续接，不证明全部原作动画或观感。

## 战斗等待的失败收尾

结果计划创建或提交失败时，应用层回滚本次结算，并通过`StorySession.cancelBattle(progress, waiting)`将**同一个等待会话**恢复为ready。游标仍指向战斗节点，玩家通过菜单继续时重新挑战；不自动走胜利分支，不重放部分奖励，不把失败回执写成completed。此状态允许保存和导出。已经执行的战斗回合不会被撤回，结算检查点不是战前完整重置。转场失败但领域提交成功时保留结果并继续剧情，不能回滚已成功结算。合同与责任见[应用层](APPLICATION.md)。
