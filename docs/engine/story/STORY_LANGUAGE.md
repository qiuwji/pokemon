# 数据化剧情接口

本页描述当前可调用合同。地区内容包、显式绑定、子脚本及稳定点恢复见[剧情内容架构](../../architecture/STORY_CONTENT.md)。原作完整内容仍需按地区转写。

剧情注册支持 `build(state, context)` 或 `commands` 数组，二者必须选一个。简单剧情优先数组；构建器只读取冻结快照。执行器在执行第一条命令前检查整棵命令树。

- `where: {map,x,y,width,height}`：限定触发矩形，支持 `step`，与 `requires`、`after`、`once` 组合。区域必须位于已注册地图内。
- `requires` / `if.condition`：已有旗标、事件、奖励、all/any/not；新增 `compare: {query:{id,input},op,value}`。`op` 支持 eq/ne/gt/gte/lt/lte；数值比较只接受数值。
- 查询：money、itemCount、partyCount（排除蛋）、hasSpecies、variable、map、positionX/Y。插件通过 `content.register('conditionQueries', id, {schema,read})` 注册纯只读标量查询。
- `flag: {key,value}`：key为非空字符串，禁止`__proto__`/`constructor`/`prototype`；value仅允许布尔、字符串或有限数值。与reward.flags共用校验，整树预检先于任何命令写入。
- `setVariable: {name,operation:'set'|'add',value}`：变量由剧情领域持有，保存于 `story.variables`。值为标量；add 仅支持数值。
- `if: {condition,then:[...],else:[...]}`：选择一条分支执行。
- `choice: {name,prompt,variable?,cancel?,options:[{id,label,commands:[...]}]}`：由 UI 端口返回选项 ID。变量记录选项 ID，再执行该分支。只有声明 `cancel` 时返回键才选择该选项；没有取消选项时必须做出选择。
- 地图对象 `trainerId`、`sightRange`：沿当前朝向检查距离与通行障碍，胜利奖励已记录的训练家不会再次主动拦截；先感叹气泡、走近、对话，再发起注册战斗。双打拦截要求两只可用伙伴。
- `worldPatch`、`battle`、`reward`、移动与演出命令仍通过所属领域服务执行；内容不得直接修改队伍、地图数组或背包。

```js
api.story.register('gate', {
  trigger: 'step', once: true,
  where: {map:'demo:meadow',x:2,y:3,width:1,height:1},
  requires: {compare:{query:{id:'itemCount',input:{item:'potion'}},op:'gte',value:1}},
  commands: [{type:'choice',name:'看守',prompt:'要打开门吗？',cancel:'leave',
    variable:'demo.gate.choice',options:[
      {id:'open',label:'打开',commands:[
        {type:'worldPatch',operations:[{kind:'object',map:'demo:meadow',id:'gate',hidden:true}]},
        {type:'reward',id:'demo.gate.reward',money:100}
      ]},
      {id:'leave',label:'稍后再来',commands:[]}
    ]}]
});
```

这不是原作脚本字节码解释器：原作事件需转写为这套公开命令。当前区域检查是到达格后触发；离开区域、跨区域状态可用变量与后续条件实现。训练家视线依据只读参考 `src/trainer_see.c` 的方向、距离与清路机制；设施专用拦截、双方训练家同时靠近仍属于设施内容后续接线。

## 注册参数与常用命令

公开注册：`api.story.register(localId,definition)`返回完整事件ID；definition提供trigger及commands/build二选一，可选match、where、requires、after、once。match和build只读冻结上下文。after是完整事件ID数组，引用必须存在且不能成环。执行器按trigger索引并选择满足条件的最高priority入口，默认0；同优先级重叠报Ambiguous story trigger。通用兜底显式-100，不能依赖注册顺序覆盖。selector可匹配map/objectId/script/kind/reason/localId。

条件的常见结构：`{flag:'key',equals:true}`、`{event:'owner:id'}`、`{reward:'owner:gift'}`，以及`{all:[条件,...]}`、`{any:[...]}`、`{not:条件}`。compare查询输入须符合该查询schema；读取变量用`{query:{id:'variable',input:{name:'变量名'}},op:'eq',value:'值'}`。

### 演出完成与业务里程碑

`story.completed`表示整段事件执行到末尾；`story.rewards`表示一次原子奖励已经提交，两者不能互换。`after`仅用于必须完整执行前置事件的顺序约束。若业务旗标/奖励先于对话提交，不要再要求该对话的completeEvent来解锁唯一的后续入口，否则表现失败会令业务前进、入口却关闭。此类后续条件应依赖`{reward:'稳定奖励ID'}`或相应领域事实；失败的演出不能补记为完成。

序章图鉴资格依赖`rival.prize`已领取，胜利对话失败或重载不阻塞博士；原作图鉴与随后赠球分成professor.pokedex/professor.pokeballs两笔：球袋满只拒绝赠球，不撤销图鉴也不阻塞跑步鞋。`Reward inventory plan expired`发生在reward提交之前，不能据此认定同一奖励的旗标已写入；更早已提交的命令仍保留。

训练家奖励统一用[trainerRewardId](../../../src/packs/emerald/trainers.js)：`trainer.<trainerId>.prize`，包括练习、双打、混战和通用结算。视线资格读取同一ID，交互重战仍可开放但不重复付奖。事件ID如`trainer.practice.prize`另属completed，不是奖励账本的别名。

每行均需`type`；表中省略它，仅列其余参数。角色ID是当前场景对象ID或持久Actor UID，player是保留角色名；精灵UID不是角色ID。

| type | 参数与行为 |
| --- | --- |
| dialog | name，lines字符串或{runs}数组；speed为毫秒/字素，mode为typewriter/instant；支持停顿/颜色/注册文字效果，等待最终确认。完整参数见[对话合同](../presentation/DIALOGUE.md) |
| if | condition条件，then命令数组，else可选命令数组 |
| choice | name、prompt；options为2–16个{id,label,commands?}；variable可选，cancel可选且必须对应option.id |
| sequence / parallel | commands数组；parallel校验角色/镜头/模态资源冲突，不能并行切场景 |
| setVariable | name，value有限数值/字符串/布尔/null；operation为set/add（默认set），add仅数值 |
| flag | key，value；写当前旗标，只应用于明确持久业务，不代替TEMP生命周期 |
| reward | id稳定奖励ID，money可选非负安全整数，items可选{itemID:正整数}，flags可选布尔表；容量失败不记账 |
| captureMonster | monster完整精灵；通过统一PartyStorageService接收，队伍6/盒子200容量失败在写入前拒绝，重复UID不再次接收 |
| lossPenalty | 无参数；按原作 DoWhiteOut 将金钱减半（`floor(money/2)`，与队伍无关），非法数值在写入前拒绝 |
| completeEvent | id已注册事件ID；正常resolve在末尾自动追加，不需要重复写 |
| battle | trainerId引用已登记训练家；或species、level（1–100）及可选options；同一会话规则，非任意C trainerbattle模式。`options.borrowedParty`（`[{species,level}]`）临时替换玩家出战队伍（如小光教学借用的蛇纹熊，战斗后自动还原真实队伍，并配一枚借来的精灵球）；`options.capture:"cinematic"`强制捕捉并作为演出，精灵不入玩家队伍/盒子，且禁用会心一击；`options.autoActions`（`[{kind,index/item...}]`）让玩家席位按固定顺序自动行动、隐藏战斗菜单——整场演示只观看。以上均为通用选项，不按物种或训练家特判 |
| worldPatch | operations数组；每项按WorldState合同定义kind/map/坐标/变更及scope，不直接改地图数据 |
| fieldAction | id已注册行动，input可选对象，variable可选保存ok结果；未指定variable时失败抛错 |
| move | actor默认player，path方向数组或to:{x,y,map?}二选一，running可选，mode/jump可选；jump为表现跳步，不绕过通行；keepFacing保持移动前朝向；ignoreActors为最多32个明确角色ID的脚本占位例外，正常移动不应用；地形/高度/边界仍校验，不直接改坐标 |
| approach | actor必填，target默认player；移动到合法邻接格 |
| face | actor默认player，dir方向或target角色；等该角色在途动作结束 |
| escort | actor必填且不能player，to:{x,y,map?}，followers可选1–32个唯一ID（默认[player]）；同图有序相邻队列协调步行，非任意队形 |
| emote | actor必填，kind默认exclamation且需在FIELD_EMOTES中，ms可选 |
| hide | actor必填；当前场景隐藏，不自动表示永久删除 |
| spawn | def:{id,actor,kind?,name?,text?,x,y,dir,movement}在脚本中途加入一个走进场景的演员（对应原作`addobject`，如角色推门进来）；无需遮黑转场，场景结束即移除；id不能为player |
| cameraTo / cameraFollow | cameraTo取actor或position:{map,x,y}，ms可选；cameraFollow回到玩家 |
| teleport / scene | position:{map,x,y,dir?}为合法落点；scene可选kind转场及actors摆位，并可用coverMs/holdMs/revealMs（0–60000）控制遮黑/保持/淡入时长（如战败白屏保持）；真正需要传送时使用，不代替行走 |
| wait | ms必填，有限且0–60000 |
| presentation | id已注册场景，payload可选对象；注册draw叠层/field纯镜头/objects纯对象像素偏移回调，等待场景结束；objects可返回有界frame图片索引(0–4095)，退出即清除，不写规则 |
| weather | 按天气规格的命令字段，走WeatherApplication校验及提交；不是任意battle.weather赋值 |
| heal / starter / shop | 无必需额外参数；分别调用现有治疗、选择伙伴和商店界面端口 |

更低层的captureMonster/lossPenalty是现有战后领域桥接，不作为一般剧情作者任意写精灵/扣钱的捷径。完整处理入口见[StoryApplication](../../../src/game/emerald/application/story-application.js)、[CommandRunner](../../../src/engine/commands.js)、[FieldDirector](../../../src/engine/field-director.js)；文件更名时搜索`class StoryApplication`、`validateFieldCommand`、`Unknown story command`。

预检全部树不等于整段剧情原子回滚；已经成功提交的奖励/世界操作不会因后续演出失败自动撤销。once控制重触发，completed与实际领取账本分开。背包满的原作专用分支需明确结果/容量政策，不能因为事件一次性就提前标记领取。当前语言还没有自动翻译C特殊函数、完整离图回调或任意设施启动命令；按实际缺口单独演进，不能在内容中伪造。

端到端真实交互例见[world-story.test.js](../../../examples/world-story.test.js)，原作转写工作流见[剧情Skill](../../../skills/emerald-story-reconstruction/SKILL.md)。

## 地区剧情包与公共调用

`api.story.registerBundle(localId,bundle)`存入不可变数据，返回完整{id,scripts,dialogues,entries}引用；bundle.version为1。原生通过manifest的stories section登记同一形状。bundle不含执行函数。

| 字段 | 结构 |
| --- | --- |
| scripts | 局部ID→{parameters?:对象DataSchema,durable?:boolean,commands:[]} |
| dialogues | 局部ID→{name,lines,speed?,mode?,bindings?}，完整文本合同见对话规格 |
| entries | 局部ID→{trigger,script,selector?,requires?,priority?,once?,input?,contextParameters?}；contextParameters仅可引用object.id/name/text |
| projections | {map,objectId,requires?,changes:{x?,y?,dir?,hidden?,name?,text?}}数组；对象必须在实际投影中存在 |
| sources | JSON来源记录数组；固定修订/label/项目演绎分类，不自动表示还原完成 |

局部引用在所属bundle中解析：注册owner的area，welcome完整引用为owner:area.welcome。跨包使用完整引用；不能拿对话ID当脚本ID。参数默认空对象schema，传多余字段也会拒绝。

| 新命令 | 字段 / 行为 |
| --- | --- |
| script | id完整脚本引用、input可选对象；数据入口使用它，持久脚本可暂停整个命令树 |
| call | script局部或完整引用、input可选对象；仅在bundle中编译展开，用`{$param:"key"}`传递typed参数 |
| dialog | dialogue局部/完整引用替代name/lines，parameters由调用输入提供；不在运行时嗅探原label字符串 |
| checkpoint | 持久脚本稳定保存点；非动画计时；短事件中不会自动创建会话 |
| screen | id为clock/berry/daycare；clock等待关闭并返回status=confirmed/cancelled/viewed，可声明onResult同名命令分支；berry/daycare仍是打开业务页面，不承诺完整结果会话 |
| identity | name为1–16字符，gender为male/female；开场仅配置一次，走PlayerProfile领域校验 |
| sound / waitSound | sound.cue为已注册sound cue，可选channel；waitSound同channel等待该声部finished，自然结束/静音/停止均释放，不用固定ms猜音长 |
| music | cue为已注册music cue；不传cue恢复地图选曲；剧情finally清理临时覆盖 |
| reward.onResult | {ok:[],alreadyGranted:[],inventoryFull:[]}；按实际返回status执行；未知结果报错，无此字段保留直接失败语义 |
| battle.onResult | durable脚本声明win/loss/escaped/caught所需分支；普通短battle仅发起，不承诺等待胜负 |

choice另支持default选项ID、timeoutMs（1–60000，必须配default）；option增加visibleWhen/enabledWhen/disabledReason。所有选项仍需2–16条原始定义；过滤后必须至少一条可选，cancel/default必须可见可用。选择确认后重新检查条件，写variable并执行对应commands；超时和点击共用一次完成通道。取消只在声明cancel时成立，替换/关闭模态框拒绝旧等待并清理定时器。

持久脚本声明durable:true，每条命令必须有稳定node（含分支和call的子脚本命令）；node在同一脚本中唯一。call展开前缀包含调用点，两个调用不共享游标。最多2048展开命令、16层调用、10000运行步骤。会话存于story.session，checkpoint与战斗前/结果后保存ready游标；不能并行暂停，不能在持久脚本内再启动script会话。`core.story.resume`是宿主菜单/网络的空参数恢复命令。

新插件bundle直接写的flag.key、setVariable.name、choice.variable、reward.id/flags使用owner:或owner.命名空间；核心业务调用走现有领域命令，不借文本/渲染修改核心。旧高级register仍是已有合同，不据此宣称整个插件权限模型已全面重设。

示例：[story-bundle.test.js](../../../examples/story-bundle.test.js)。测试：[story-content](../../../tests/story-content.test.js)、[story-session](../../../tests/story-session.test.js)。搜索锚点：registerBundle、class StoryCatalog、class StorySession、STORY_SUSPENDED。长剧情恢复边界详见架构，不能把当前短序章当作全作持久剧情已转写。


坐标脚本与门格重合时，落地后先允许step剧情接管warp。脚本步行本身不触发自动warp，跨图仍使用显式scene。场景pin维持同一个演员直到释放；定义刷新不得在演出中替换正在移动的对象。状态投影仍是实时声明：同一段可见演出中的中间状态应保持一致摆位，不把C的OnTransition摆位误转成每次flag变化都重置。

调钟提交仅由当前等待中的页面回调授权；关闭页面后回调失效。公用core.time.start仍拒绝剧情忙态。时钟页面拥有淡入淡出，可信提交检查真实在途移动及战斗，不把自己的遮盖动画当成非法移动。
