# 动态世界合同

WorldStateService 独立拥有持久覆盖层，基础地图/图块目录保持只读。运行时 maps 投影供 World 碰撞、NPC 与 Renderer 同时读取；图块动画仍使用原 8px 图集。存档保存 worldState，重新绑定会话重建投影。

公开命令 `core.world.patch` 需要 world 权限；输入 operations 是最多 65536 字符的 JSON 数组字符串。剧情使用 `{type:'worldPatch',operations:[...]}`，不需要访问地图数组。一个批次最多 128 个操作，先试算并验证整批，成功后提交一次 revision。

```js
[
  {kind:'tile',map:'SomeMap',x:4,y:3,block:0,behavior:0},
  {kind:'object',map:'SomeMap',id:'pack:stone',changes:{x:5,y:3}},
  {kind:'object',map:'SomeMap',id:'pack:obstacle',hidden:true},
  {kind:'object',map:'SomeMap',id:'pack:visitor',spawn:true,
   changes:{x:2,y:4,actor:'Boy1',dir:'down',kind:'talk',name:'访客'}}
]
```

block 保留原作 16 位 metatile/碰撞/高度编码，必须引用该 tileset 中已有图块。对象只允许定义明确的坐标、角色、方向、互动文字、训练家、移动和条件字段。新对象需要坐标与已注册角色。隐藏不销毁记录，再设 hidden:false 可恢复；永久移动不等同于剧情临时 pose。

对象变化使该对象的自主/剧情固定姿态失效，下一次查询重建，避免碰撞、画面和保存落点不同。不可阻挡或覆盖玩家当前落点。剧情整树预检只检查形状与静态引用，执行时再检查对象存在条件，从而允许先生成、后移动同一对象。worldPatch 不能和角色/场景轨道并行。

保存校验与插件依赖识别覆盖更改的地图、生成对象、角色和训练家引用。查询只返回只读覆盖数据。该阶段尚未实现推石资格、机关联动和运动演出；这些由后续野外/剧情服务组合本合同完成，不在 patch 函数中写砍树分支。
