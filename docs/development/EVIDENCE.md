# 自动记录开发验证

[evidence.py](../../tools/evidence.py)运行检查、保存合并的标准输出/错误输出，并生成同一批次的 manifest。它不执行游戏操作，不修改原作来源，也不把测试通过等同于画面或音频验收。

为减少token消耗，默认输出只有manifest路径、状态、退出码和跨层清单，不回传完整日志或hash表。先读摘要，失败时再定位对应日志片段；上下文与验证复用规则见[测试指南](TESTING.md)。

## 新检查直接运行并记录

在项目根执行。下面两次检查共用一个批次；范围、种类和 input 参数保持一致，label 区分检查。

```sh
python3 tools/evidence.py run --scope "花店早期互动" --kind content \
  --out docs/validation/2026-10-08-flower-shop --label focused \
  --input src/packs/emerald/story/regions/flower-shop.js \
  --input tests/native-road-content.test.js \
  -- node --test tests/native-road-content.test.js

python3 tools/evidence.py run --scope "花店早期互动" --kind content \
  --out docs/validation/2026-10-08-flower-shop --label quality \
  --input src/packs/emerald/story/regions/flower-shop.js \
  --input tests/native-road-content.test.js \
  -- npm run check
```

输入是参数数组，不经过 shell；管道、重定向和 shell 展开不属于命令语法。工具只在运行结束后输出摘要，运行期间可另读正在写入的日志。可用 `--timeout 秒数`；超时为124，中断为130，启动失败为127，均保留失败记录。进程及子进程一并终止。

不指定 `--input` 时记录所有当前改动文件，含暂存、未暂存及未忽略的新文件；删除记录为 null。指定文件/目录可以限定本批次，目录按 Git 跟踪及未忽略文件展开。显式指定的文件也可以位于忽略目录。`docs/validation/`输出不参与输入哈希，避免记录自身。显式选择必须包含会影响结论的实现、资源、配置和测试，不能只选择测试文件。默认选择的后续 verify 检查已记录的文件；若要检测某目录后来新增的文件，显式选择该目录。

每条运行记录自动包含：实际参数、起止时间（北京时间）、当时 HEAD、输入/日志 SHA-256、退出码、可识别的 Node/Python 分组统计。完整测试含多个组时分别记录，不将两次局部验证累加成全量。原作参考存在时记录其修订。语义结论、缺口、未执行项用可重复的 `--note "说明"`，仍由作者负责。

## 失败、重试与证据失效

同一 label 重试新增日志和历史记录，不覆盖首次失败。批次状态以每个 label 最后一次记录为准：

| 状态 | 含义 |
| --- | --- |
| recorded-checks-passed | 记录的检查在相同输入版本下退出码均为0；不代表全部必要检查已覆盖 |
| failed | 最新检查有非零退出码 |
| stale | 检查对应的输入版本不同，或运行期间输入发生改变 |
| unverified | 只有导入日志等无法确认退出码的记录 |

代码变动后，未重跑的其他 label 保留为 stale，不自动继承此前的通过。输入在运行中被生成器修改时，先查看差异，再针对最终输入复查；生成成功不自动成为最终源码验证。范围或选择改变时新建批次，不改原批次的定义。

```sh
python3 tools/evidence.py verify docs/validation/2026-10-08-flower-shop/manifest.json
```

verify只读核对输入/日志哈希、版本摘要和记录状态的一致性。退出码0表示记录完整；结果中的 recordedStatus 仍可能为 failed/stale/unverified。它不保证 manifest 被人为改写后的真实性，也不代替检查执行。历史 manifest 原样保留，工具拒绝写入其他格式的 manifest。

同一批次顺序执行，独立批次可以并行。运行锁阻止同时写同一 manifest；进程异常退出遗留锁时，确认该批次已无运行进程，再移除 `.evidence.lock`。孤立日志仍保留，不自动覆盖。

## 旧日志及历史引用

```sh
python3 tools/evidence.py collect --scope "历史花店日志归档" --kind content \
  --out docs/validation/2026-10-08-flower-shop-import --label prior \
  --log docs/validation/2026-10-07-native-content/test-all.log
```

collect复制原日志并计算哈希；命令和退出码为 null，输入版本不明，不能标为通过。已经有完整历史 manifest 的检查，优先从本轮说明链接引用原证据，不再复制全套日志。旧目录不能靠迁移或重新计算哈希伪装成新版本验收。

同一代码批次的多个功能共用完整回归结果，各有需要的针对性检查；剧情 packet/source/review 证明原作来源及人工转写，和运行记录用途不同，继续保留。

## 跨层改动清单

manifest按 engine、adapters、application、story、content、pack、generated、tests、tools、docs 等列出整个工作树相对 HEAD 的改动。它可能包含本批次之前已有的修改，和限定的 input 清单分开显示。

`--kind content`表达纯内容的预期，跨 engine/adapters/application 的文件会进入 layersToExplain；这是一份审阅清单，不根据文件数自动判违规。能力扩展用 capability，既有缺陷修复用 fix，多个功能混合用 mixed，开发流程用 workflow。职责判断及拆批规则见[剧情内容架构](../architecture/STORY_CONTENT.md)。
