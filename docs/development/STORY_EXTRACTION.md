# 原作地区剧情：提取、审阅与回校验

这份流程交给负责提取的 AI。交付的是**有来源、可核对的剧情规格**，不是凭游戏印象写的故事，也不是“游戏已经实现”的声明。地区笔记位于 `docs/regions/`；英文原文、坐标、动作和等待以固定版本的只读 C/事件脚本为依据，中文是待审阅的本地化。

## 工具和产物

在项目根使用 `python3 tools/story/extract.py`，只需要 Python 标准库与 Git。代码按源文件解析、依赖收集、审阅校验、命令入口分在 `tools/story/`，不依赖浏览器或安装插件。原参考修订必须为 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`；参考有已跟踪改动时拒绝提取，不替你重置它。

| 文件 | 谁维护 | 用途 |
| --- | --- | --- |
| `packet.json` | 提取工具 | 地图原始对象/坐标/告示/warp、入口清单、标签原码、指令顺序与引用、原文控制符、special等待声明、C定义候选和文件哈希 |
| `source.md` | 提取工具 | 同一证据的可读展示；不手改，校验时与 packet 重生成结果比较 |
| `review.json` | 提取 AI / 审阅者 | 入口范围判断、中文译文、来源锚定的事实、分支与验收场景；重新提取不会覆盖它 |
| 地区 `.md` | 地区作者 | 给内容开发者阅读的场次说明，引用证据与审阅结果；进度只放 STATUS |

产物放 `docs/regions/evidence/<地区或切片>/`；临时试提取用项目外临时目录。工具只能写明确指定的产物目录，不编辑游戏内容；拒绝写入 `work/pokeemerald/` 或 `sources/`。导入内容仍用原有导入工具。

`--maps` 选择地图；默认把该地图定义的标签及对象/坐标/告示脚本作为入口，递归追踪跨文件依赖。`--entries` 缩小到指定完整标签，**不代表整张地图覆盖完成**。`entryInventory` 仍列出地图全部交互入口和 included/sourceAvailable，遗漏必须在审阅稿分类。`--functions` 用于补充不经过 special 直接启动的 C 演出，如卡车任务。

## 先用开场切片跑通

```sh
# 预演：只报告规模与产物路径，不写文件。
python3 tools/story/extract.py extract \
  --profile tools/story/slices/littleroot-opening.json \
  --out docs/regions/evidence/littleroot-opening --check

# 提取原文、动作及入口；首次创建待审阅模板。
python3 tools/story/extract.py extract \
  --profile tools/story/slices/littleroot-opening.json \
  --out docs/regions/evidence/littleroot-opening

# 证明机械提取与固定源码一致。
python3 tools/story/extract.py verify \
  --packet docs/regions/evidence/littleroot-opening/packet.json

# 编辑 review.json 后，先检查结构与原文/占位符。
python3 tools/story/extract.py verify \
  --packet docs/regions/evidence/littleroot-opening/packet.json \
  --review docs/regions/evidence/littleroot-opening/review.json

# 审阅完成后检查入口/译文/C 函数分类及验收场景是否仍有遗漏。
python3 tools/story/extract.py verify \
  --packet docs/regions/evidence/littleroot-opening/packet.json \
  --review docs/regions/evidence/littleroot-opening/review.json --ready
```

复制 profile 后修改 maps/entries/functions 数组即可选择下一个地区；只允许这三个键。路径不存在或标签拼错会明确失败，不用简称碰运气。开场 profile 只覆盖其列出的入口及依赖，不涵盖救博士、劲敌战斗和跑步鞋的全部入口；要做这些切片，应增加真实完整入口、或省略 entries 做地图全量提取，再分类后期剧情。

## 提取 AI 的具体工作

1. **确定范围**：写明哪些地图、哪一段起止状态、男/女主及玩家朝向的分支。读取对应 `docs/regions/` 笔记定位，但逐条回查 packet 中的原脚本，不把笔记当事实。
2. **先看入口清单**：核对 MapScripts 的 OnLoad / OnTransition / OnFrame，object_events、coord_events、bg_events、warp_events。原对象的隐藏 flag、local_id、移动类型、活动范围及高度都要保留；不能只提台词。
3. **读完整依赖**：按 instructions/references 顺序读 call/goto、文本与 Movement 标签。条件比较值、状态写入、并行 applymovement 与后续 waitmovement 分别记录；不得压缩为“NPC走过来”。
4. **继续追 special、宏与 C**：specials 给出等待声明，macros 保留指令宏原码，cFunctions 给出定义。possibleCalls/functionReferences 只是词法候选，包含任务回调引用；继续读回调并用 `--functions` 补需要的函数。不是每次调用都有返回结果，也不是注册 waitstate 就已经证明了解锁时机。
5. **编写审阅稿**：entries 分类为 reviewed/pending/out-of-scope，非 pending 必须解释；mapEntries 中未纳入切片的入口也明确分类。C 函数分类同理，未追完的任务保持 pending，不填“已核实”。
6. **逐句翻译**：translations.original 不能改。填写 zh，保留 `{PLAYER}`、`{RIVAL}`、`{STR_VAR_1}` 等占位符及原意；说话人与称呼要按性别分支核对。“劲敌”不能译成“妹妹”，过动猿不能写成土狼犬。参考语言不确定时 reviewed=false 并写疑点，不能拿机器结构检查冒充翻译审校。
7. **按下表写地区规格**：每个事实有来源锚点；每条重要分支有起点、终点、等待、失败/取消/重入政策。不得把定坐标、原地转向、脚步、跳跃、隐藏、开关门混写成一个“移动”操作。
8. **回校验再交接**：结构检查和 --ready 分别记录。最后交付地区 Markdown、packet/source/review、所用 profile 与检查命令。内容开发接手后另做真实触发、表现和存档验证。

| 场次 / 入口 / 前置 | 状态与条件 | 按时间顺序的动作 | 台词 label | 完成写入 | 取消 / 失败 / 重入 | 来源锚点 |
| --- | --- | --- | --- | --- | --- | --- |
| 例：调钟首次交互 | FLAG_SET_WALL_CLOCK 未置 | 对话→黑屏→StartWallClock→等待→delay30→推进→妈妈上下楼→SE_EXIT→移除 | 原始完整 label | INTRO_STATE=6，隐藏搬运者 | 网页取消是项目政策，不能说原作同样可取消 | label + 原码行号；C 回调路径 |

地图动作另附角色逐格表：`演员 / 起点(x,y,朝向) / 每一格或原地动作 / 并行组 / 等待点 / 终点 / 可见性`。并行组必须记录各自路径，不能把 waitmovement 当作“固定等待若干秒”。动画时间来自任务计数、帧率及调色板实现；例如卡车的 90/150/300 帧与停车水平采样表要追 `field_special_scene.c`，不能从台词脚本猜时间。

## review.json 的最小写法

模板自动给出 packetSha256、所有入口、C 函数和原文，不要手写这些清单。下面只展示人工填写的字段，实际保留模板其他内容：

```json
{
  "facts": [
    {
      "summary": "未调钟回到一楼会由地图帧脚本提示，并把玩家送回二楼；不是封锁楼梯碰撞。",
      "sources": [
        {"label": "LittlerootTown_BrendansHouse_1F_EventScript_GoUpstairsToSetClock", "lines": [66, 70, 73, 74]}
      ]
    }
  ],
  "scenarios": [
    {
      "name": "未调钟返回一楼",
      "start": "INTRO_STATE=5，从二楼正常下楼",
      "steps": ["触发一楼 OnFrame", "妈妈提醒", "两人上移", "warp 二楼"],
      "expected": "仍未设钟，落到二楼楼梯入口，恢复控制",
      "sources": [
        {"label": "LittlerootTown_BrendansHouse_1F_EventScript_GoUpstairsToSetClock", "lines": [66, 73, 74]}
      ]
    }
  ]
}
```

**上述行号是格式示意，必须替换成此次 packet 中实际行号**，不得原样复制。C 锚点写 `{function:"Task_HandleTruckSequence",path:"src/field_special_scene.c",lines:[实际行号]}`；宏锚点写 `{macro:"applywaitmovement",lines:[实际行号]}`。行号必须落在提取块内；完整标签不允许省略。

重新提取导致 packetSha256 改变时，旧 review 会明确失败。逐项对照新旧来源后重新填写受影响结论；不要只替换哈希把旧判断冒充重新审阅。原作参考修订变化另作为项目范围决定处理，本工具不会自动换版本。

## 校验到底能证明什么

| 能自动检查 | 需要审阅或游戏验证 |
| --- | --- |
| 单/双冒号标签边界、原码/原文、脚本引用、源文件修订/哈希、地图数据与坐标 | 中文语义和语气是否正确 |
| 原码指令顺序、移动序列、显式等待与 special 声明 | 宏展开后的执行语义、C task 回调的实际解锁/计数 |
| 原文未被改、变量占位符未丢、入口/译文/C 分类不遗漏、锚点行号存在 | 文本概括是否准确，条件分支是否解释完整 |
| 自动生成 source.md 与证据一致、审阅稿是否过时 | 网页动作/朝向/门/角色遮挡/动画/音频与参考一致 |

`--ready` 只说明提取稿达到人工审阅的结构要求，不证明本游戏已复刻完成。未解析引用会使 verify 失败；C 定义候选未找到/存在歧义必须继续定位，不删报错、改参考或补伪代码。

常见错误：Unknown reference label 是拼错/选错修订；Ambiguous reference label 要查条件定义及来源；Packet differs 表示产物被编辑或来源变化；Original text changed / placeholders changed 要恢复原文/占位符；Review belongs to a different packet 表示审阅稿需重新核对。旧地区文档检查脚本若可用可另运行 `python3 tools/story-doc-check.py`，但不能替代本工具的精确来源回校验，也不能证明自然语言动作描述正确。

工具契约测试：`node --test tests/story-reference-tools.test.js`，内含 Python 的小型来源夹具、遗漏/歧义及原文污染检查。工具无需执行整个游戏回归；游戏功能变更仍按 [TESTING](TESTING.md) 验证。
