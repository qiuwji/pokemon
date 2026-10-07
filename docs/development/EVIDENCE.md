# 自动记录开发验证

[evidence.py](../../tools/evidence.py)运行检查、保存合并的标准输出/错误输出，并生成同一批次的 manifest。它不执行游戏操作，不修改原作来源，也不把测试通过等同于画面或音频验收。

为减少token消耗，默认输出只有manifest路径、状态、退出码和跨层清单，不回传完整日志或hash表。先读摘要，失败时再定位对应日志片段；上下文与验证复用规则见[测试指南](TESTING.md)。

## 默认入口与当前批次

`npm run evidence -- run ... -- 命令`是生成新证据的标准入口，继续使用已有run子命令。`npm run check:evidence`默认核对全部工具生成记录的日志/摘要完整性，并严格检查`docs/validation/current.json`指向的当前批次输入和通过状态。`npm run check`、`npm test`和`npm run test:all`的post钩子自动调用它；裸检查不会自动收集该次日志，要记录实际检查仍应使用evidence包装。

run结束后自动选中本批次，再检查其完整性与新鲜度；即使命令退出0，若输入变化、其他label已过期，包装命令仍返回非零。包装检查自身运行期间，post钩子允许该在途批次尚未写入结果，结束后由包装器再次校验。异常遗留锁须确认进程已结束后移除，不能把running作为完成证明。

历史工具记录会报告输入过期，后续正常改代码不会让所有旧记录阻塞当前工作；历史日志丢失或被改写仍报错。旧手写格式只统计为不可由本工具验证，既不宣称通过，也不改写或补造hash。默认输入会比较记录基线之后的改动及当前文件hash，提交已验证文件不会使证据失效，新文件和未验证的新提交会失效。显式input只核对所选范围，作者不能借窄选择避开必要依赖。

## 新检查直接运行并记录

在项目根执行。下面两次检查共用一个批次；范围、种类和 input 参数保持一致，label 区分检查。

```sh
npm run evidence -- run --scope "花店早期互动" --kind content \
  --out docs/validation/2026-10-08-flower-shop --label focused \
  --input src/packs/emerald/story/regions/flower-shop.js \
  --input tests/native-road-content.test.js \
  -- node --test tests/native-road-content.test.js

npm run evidence -- run --scope "花店早期互动" --kind content \
  --out docs/validation/2026-10-08-flower-shop --label quality \
  --input src/packs/emerald/story/regions/flower-shop.js \
  --input tests/native-road-content.test.js \
  -- npm run check
```

输入是参数数组，不经过 shell；管道、重定向和 shell 展开不属于命令语法。工具只在运行结束后输出摘要，运行期间可另读正在写入的日志。可用 `--timeout 秒数`；超时为124，中断为130，启动失败为127，均保留失败记录。进程及子进程一并终止。

不指定 `--input` 时记录所有当前改动文件，含暂存、未暂存及未忽略的新文件；删除记录为 null。指定文件/目录可以限定本批次，目录按 Git 跟踪及未忽略文件展开。显式指定的文件也可以位于忽略目录。`docs/validation/`输出不参与输入哈希，避免记录自身。显式选择必须包含会影响结论的实现、资源、配置和测试，不能只选择测试文件。默认选择的后续verify还检查记录基线之后的新改动；限定选择中的目录会检测目录新增文件。

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
npm run evidence -- verify docs/validation/2026-10-08-flower-shop/manifest.json
```

verify只读核对输入/日志哈希、版本摘要和记录状态的一致性。退出码0表示记录完整；结果中的 recordedStatus 仍可能为 failed/stale/unverified。它不保证 manifest 被人为改写后的真实性，也不代替检查执行。历史 manifest 原样保留，工具拒绝写入其他格式的 manifest。

同一批次顺序执行，独立批次可以并行。运行锁阻止同时写同一 manifest；进程异常退出遗留锁时，确认该批次已无运行进程，再移除 `.evidence.lock`。孤立日志仍保留，不自动覆盖。

## 旧日志及历史引用

```sh
npm run evidence -- collect --scope "历史花店日志归档" --kind content \
  --out docs/validation/2026-10-08-flower-shop-import --label prior \
  --log docs/validation/2026-10-07-native-content/test-all.log
```

collect复制原日志并计算哈希；命令和退出码为 null，输入版本不明，不能标为通过。已经有完整历史 manifest 的检查，优先从本轮说明链接引用原证据，不再复制全套日志。旧目录不能靠迁移或重新计算哈希伪装成新版本验收。

同一代码批次的多个功能共用完整回归结果，各有需要的针对性检查；剧情 packet/source/review 证明原作来源及人工转写，和运行记录用途不同，继续保留。

## 跨层改动清单

manifest按 engine、adapters、application、story、content、pack、generated、tests、tools、docs 等列出整个工作树相对 HEAD 的改动。它可能包含本批次之前已有的修改，和限定的 input 清单分开显示。

`--kind content`表达纯内容的预期，跨 engine/adapters/application 的文件会进入 layersToExplain；这是一份审阅清单，不根据文件数自动判违规。能力扩展用 capability，既有缺陷修复用 fix，多个功能混合用 mixed，开发流程用 workflow。职责判断及拆批规则见[剧情内容架构](../architecture/STORY_CONTENT.md)。
