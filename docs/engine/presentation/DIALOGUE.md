# 对话文本与逐字表现

插件 API 1。剧情负责何时说话、何时继续；对话表现只负责显示。原生字符串对话和插件结构化文本走同一条路线，不需要把计时器、HTML或业务函数放进剧情数据。

## 描述与接口

剧情命令为 `{type:'dialog',name,lines,speed?,mode?}`。`name` 是说话人字符串（可为空，最多128个字符）；`lines` 为1–128句。每句可以是字符串，或 `{runs:[...]}`。run 二选一：

| run | 字段及限制 |
| --- | --- |
| 文字 | `{text,color?,effect?,parameters?}`；text最多4096个UTF-16代码单元，color仅六位十六进制，如 `#ee8866`；effect引用已注册文字效果，parameters是符合它schema的JSON对象 |
| 停顿 | `{pauseMs}`；0–5000整数毫秒，每句累计不超过60000毫秒 |

每句1–512个run，整段文字最多8192个UTF-16代码单元。显示按Unicode字素分组，组合字符及emoji不会拆半。文本用textContent绘制，不解释HTML。颜色、偏移和透明度是表现，不修改语言内容、对话选项或领域结果。

`speed` 表示每个字素的毫秒数，默认30，允许0–1000整数；0为瞬显。`mode` 为 `typewriter`（默认）或 `instant`。瞬显及 reducedMotion 跳过打字与行内停顿，仍等待玩家确认，不自动推进剧情。

```js
{ type:'dialog', name:'博士', speed:40, lines:[{runs:[
  {text:'欢迎',effect:'dialogue.shake'},
  {pauseMs:200}, {text:'来到丰缘！',color:'#ee8866'}
]}] }
```

宿主端口是 `ui.say(name,lines,after?,{speed?,mode?})`，返回等待最终确认的Promise；剧情使用数据命令即可。`after`是现有宿主回调端口，不是插件剧情字段。描述/效果参数在整棵剧情树执行前校验，未知效果或非法速度不会让前置奖励先发出。预检不使整段剧情成为原子事务；运行中的表现故障不会撤销已提交的领域结果。

## 注册文字效果

`api.presentation.textEffect(localId,{schema?,initialData?,sample})` 返回完整命名空间ID。schema必须是对象schema，默认空对象；initialData符合schema。所有效果在启动装配时注册后封闭。内置 `dialogue.shake`、`dialogue.blink` 也使用相同注册表。

`sample(parameters,context)` 是纯同步回调；parameters、context冻结，context为 `{elapsedMs,index,reducedMotion}`。elapsedMs是当前句开始后的视觉时间，index是句中字素索引。返回 `{x?,y?,opacity?}`，缺省为0/0/1，偏移绝对值≤8像素、透明度0–1。非法输出明确报错；不得调用领域命令、事务或随机数。reducedMotion时宿主直接返回无偏移/全不透明，不执行插件sample。

效果不能推进剧情，也不能在计时中发奖励。需要世界行为时在对话之后写独立领域命令。可执行端到端例见 [dialogue.test.js](../../../examples/dialogue.test.js)，它验证真实注册/剧情/参数转发；其中UI替身立即确认，不能当作逐字浏览器验收。

## 所有权、输入与清理

- `engine/dialogue.js` 校验并冻结数据描述，没有浏览器或定时器依赖。
- `presentation/dialogue-player.js` 编译字素时间轨道并纯采样；时钟由宿主注入，不取游戏RNG。
- `presentation/text-effects.js` 注册和采样有边界的视觉值，不修改规则。
- `adapters/dialogue-dom.js` 拥有字素节点与单个可取消帧循环。整句节点一次创建，用visibility逐步显示，保留换行空间；读屏一次播报完整句子，字素节点不重复播报。
- `ui-shell.js` 拥有对话等待、确认与导航。第一次确认若尚未显示完，只补全当前句；下一次确认进入下一句；最终确认才兑现Promise。

播放中的有动效文字可以继续刷新，瞬显只取消打字过程，不取消文字效果。换句、终止、页面pagehide清理帧回调；过期回调不能写新句。`disposeDialogue()`拒绝旧等待、隐藏节点、释放UI锁，不调用完成回调。直接确认和帧回调中的绘制错误也走此清理，防止剧情永久等待；失败后的新对话可以正常开启。

## 验证与排查

定时/跳过/Unicode/停顿/清理、纯回调和真实剧情预检使用 [tests/dialogue.test.js](../../../tests/dialogue.test.js)。页面装配另见 [ui-composition.test.js](../../../tests/ui-composition.test.js)。测试注入时间与浏览器端口，领域装配/剧情执行/奖励使用生产代码，不凭手动修改旗标模拟完成。

| 错误关键字 | 处理 |
| --- | --- |
| `Invalid dialogue description / line / text run / pause` | 检查speed单位/整数、run字段、颜色和停顿限额；不要混入HTML |
| `Unknown text effect` | 使用注册返回的完整ID，检查插件是否已装配；不要只传局部名字 |
| `Invalid text effect sample` | 输出只能含x/y/opacity，且必须是有限数值并在范围内 |
| `read-only callback` | 将行为移到独立action/领域命令，sample只返回视觉结果 |
| `A dialogue is already active` | 等待当前say完成；多段文字放入同一lines，不并行占用同一对话UI |

文件更名时搜索 `dialogueDescription`、`class DialoguePlayer`、`class DialogueDOM`、`textEffect:`。当前验收范围以 [STATUS](../../project/STATUS.md)和相应manifest为准；本合同不宣称原作字库、音效节奏或全部文本已经还原。
