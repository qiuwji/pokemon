# 数据化剧情接口

剧情注册支持 `build(state, context)` 或 `commands` 数组，二者必须选一个。简单剧情优先数组；构建器只读取冻结快照。执行器在执行第一条命令前检查整棵命令树。

- `where: {map,x,y,width,height}`：限定触发矩形，支持 `step`，与 `requires`、`after`、`once` 组合。区域必须位于已注册地图内。
- `requires` / `if.condition`：已有旗标、事件、奖励、all/any/not；新增 `compare: {query:{id,input},op,value}`。`op` 支持 eq/ne/gt/gte/lt/lte；数值比较只接受数值。
- 查询：money、itemCount、partyCount（排除蛋）、hasSpecies、variable、map、positionX/Y。插件通过 `content.register('conditionQueries', id, {schema,read})` 注册纯只读标量查询。
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

公开注册：`api.story.register(localId,definition)`返回完整事件ID；definition提供trigger及commands/build二选一，可选match、where、requires、after、once。match和build只读冻结上下文。after是完整事件ID数组，引用必须存在且不能成环。执行器每次resolve选择**第一个**满足条件的事件，不会自动执行所有重叠触发；检查注册顺序和互斥条件。

条件的常见结构：`{flag:'key',equals:true}`、`{event:'owner:id'}`、`{reward:'owner:gift'}`，以及`{all:[条件,...]}`、`{any:[...]}`、`{not:条件}`。compare查询输入须符合该查询schema；读取变量用`{query:{id:'variable',input:{name:'变量名'}},op:'eq',value:'值'}`。

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
| completeEvent | id已注册事件ID；正常resolve在末尾自动追加，不需要重复写 |
| battle | trainerId引用已登记训练家；或species、level（1–100）及可选options；同一会话规则，非任意C trainerbattle模式 |
| worldPatch | operations数组；每项按WorldState合同定义kind/map/坐标/变更及scope，不直接改地图数据 |
| fieldAction | id已注册行动，input可选对象，variable可选保存ok结果；未指定variable时失败抛错 |
| move | actor默认player，path方向数组或to:{x,y,map?}二选一，running可选，mode可选；通过真实通行，不直接改坐标 |
| approach | actor必填，target默认player；移动到合法邻接格 |
| face | actor默认player，dir方向或target角色；等该角色在途动作结束 |
| escort | actor必填且不能player，to:{x,y,map?}；领路角色与玩家协调步行 |
| emote | actor必填，kind默认exclamation且需在FIELD_EMOTES中，ms可选 |
| hide | actor必填；当前场景隐藏，不自动表示永久删除 |
| cameraTo / cameraFollow | cameraTo取actor或position:{map,x,y}，ms可选；cameraFollow回到玩家 |
| teleport / scene | position:{map,x,y,dir?}为合法落点；scene可选kind转场及actors摆位；真正需要传送时使用，不代替行走 |
| wait | ms必填，有限且0–60000 |
| presentation | id已注册场景，payload可选对象；纯表现，不能用来写规则 |
| weather | 按天气规格的命令字段，走WeatherApplication校验及提交；不是任意battle.weather赋值 |
| heal / starter / shop | 无必需额外参数；分别调用现有治疗、选择伙伴和商店界面端口 |

更低层的captureMonster/lossPenalty是现有战后领域桥接，不作为一般剧情作者任意写精灵/扣钱的捷径。完整处理入口见[StoryApplication](../../../dist/packs/emerald/application/story-application.js)、[CommandRunner](../../../dist/engine/commands.js)、[FieldDirector](../../../dist/engine/field-director.js)；文件更名时搜索`class StoryApplication`、`validateFieldCommand`、`Unknown story command`。

预检全部树不等于整段剧情原子回滚；已经成功提交的奖励/世界操作不会因后续演出失败自动撤销。once控制重触发，completed与实际领取账本分开。背包满的原作专用分支需明确结果/容量政策，不能因为事件一次性就提前标记领取。当前语言还没有自动翻译C特殊函数、离图回调、通用奖励结果分支或设施启动命令；按实际缺口单独演进，不能在内容中伪造。

端到端真实交互例见[world-story.test.js](../../../examples/world-story.test.js)，原作转写工作流见[剧情Skill](../../../skills/emerald-story-reconstruction/SKILL.md)。
