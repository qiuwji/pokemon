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
