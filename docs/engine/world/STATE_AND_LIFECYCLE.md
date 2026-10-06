# 动态世界状态与地图生命周期

按同一领域合并的现行接口说明。进度与验证以STATUS和对应证据为准；下文保留必要的分项合同。

## 动态世界合同

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

block 保留原作 16 位 metatile/碰撞/高度编码，必须引用该 tileset 中已有图块。对象只允许定义明确的坐标、角色、方向、互动文字/对白绑定、训练家、移动和条件字段。新对象需要坐标与已注册角色。隐藏不销毁记录，再设 hidden:false 可恢复；永久移动不等同于剧情临时 pose。

对象变化使该对象的自主/剧情固定姿态失效，下一次查询重建，避免碰撞、画面和保存落点不同。不可阻挡或覆盖玩家当前落点。剧情整树预检只检查形状与静态引用，执行时再检查对象存在条件，从而允许先生成、后移动同一对象。worldPatch 不能和角色/场景轨道并行。

保存校验与插件依赖识别覆盖更改的地图、生成对象、角色和训练家引用。查询只返回只读覆盖数据。推石持续会话等缺口由STATUS记录；机关联动与运动演出由独立野外/机关/剧情服务组合本合同，不在 patch 函数中写砍树分支。

## 逻辑与外观分离

2026-10-03 tile patch 新增 appearance（当前图集 metatile ID 或 null）。它仅改变逐格渲染投影 map.appearances，不改 blocks/behavior/碰撞/高度。沿用永久/visit 分层、预检、保存、重进恢复；null 显式清该层外观。桥面应用与证据见docs/engine/field/BRIDGES.md。


---

## 地图访问与覆盖生命周期

状态：首轮合同与针对性验证完成。这里提供世界覆盖的生命周期；薄冰/裂地板/桥面机关、原作临时剧情变量、特殊地图碎岩分支仍待各自政策与内容接线。

## 状态所有者与层次

`engine/world-state.js` 是覆盖和版本的唯一所有者。内容地图保持不可变；`maps` 保存永久覆盖，`visits` 保存访问覆盖，`activeMap` 标识玩家当前访问。投影按原始内容 → 永久字段 → 临时字段组合，图块、行为、对象字段都逐字段合并。临时改变不会覆写永久记录；临时对象修改未声明 hidden/spawn 时继承下层值。

世界操作新增可选 `scope: "permanent" | "visit"`，省略为永久。作用于 `visit` 的操作必须指向当前访问的地图。它复用 `core.world.patch`、剧情 worldPatch 和野外行动 world 操作，不另建绕过命令权限的写入口。

```js
await api.commands.dispatch("core.world.patch", { operations: JSON.stringify([
  { kind: "object", map: "my-pack:cave", id: "my-pack:rock", hidden: true, scope: "visit" },
  { kind: "tile", map: "my-pack:cave", x: 4, y: 3, block: 0, scope: "visit" }
]) });
```

一次批量操作先预检、生成草案，再提交一个世界版本；非法作用域、无效引用、阻塞玩家/持续 Actor 或旧版本均不提交。临时生成的对象不能通过永久修改偷偷转成永久对象，应以明确的永久生成业务另行处理。持续 Actor 始终由 ActorRepository 持有，任一覆盖层都禁止占用 core:actor.N 身份。

## 入图与保存

- WorldStateService.prepareVisit 生成恢复草案；World.entryPreview 使用草案中的图块和对象检查入口，不能先按旧临时状态决定通行再恢复。
- 通过门、相邻地图、飞行、潜水、剧情进入，以及显式同地图重新进入，均重置目标地图的访问层。当前地图内普通移动和反复读取投影不会重置。
- 应用层校验恢复后的落点、持续 Actor 和移动中的两端预约；不安全入口返回失败，位置/永久层/临时层不变。剧情入口失败中止后续命令，飞行失败不预先写玩家坐标。
- 成功提交恢复、移动玩家之后，发 `core:world-visit {map,revision,restoredObjects}`，再进行既有地图通知。监听者查询的是新位置。restoredObjects 是此次被清除覆盖的对象 ID，不保证这些对象都可见，条件标记仍参与投影。
- 保存当前访问及其临时覆盖；读档 bind(resume) 恢复当前访问，不视为重新入图。开发存档的旧可选字段不是兼容承诺。

项目策略：离开地图后保留其最后的访问投影，供相邻场景绘制与预约使用；下一次玩家入图才丢弃。保存也包含这些投影，其插件地图/角色/训练家引用纳入依赖检查。此策略不是原作内存布局的复刻，也不是全世界离线模拟。NPC 独自跨地图不触发玩家的访问重置。

## 原作政策的接线

绿宝石砍树和碎岩使用 visit 隐藏，普通障碍重进恢复；永久剧情对象仍由标记或 permanent 覆盖控制。Rusturf Tunnel 等特例还需配置剧情分支，不能在引擎按地图 ID 判断。

依据只读 work/pokeemerald，修订 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881：

- data/scripts/field_move_scripts.inc：CutTreeDown/SmashRock 调用 removeobject；SmashRock 另有 TryUpdateRusturfTunnelState 特例。
- src/event_object_movement.c：RemoveObjectEventByLocalIdAndMap 设置对象定义的 flag，移除活跃对象；不是所有消失的对象都临时。
- include/constants/flags.h 与 data/maps/Route104/map.json：临时标记定义与临时对象示例。
- src/event_data.c:ClearTempFieldEventData，以及 src/overworld.c:LoadMapFromCameraTransition/LoadMapFromWarp：两种入图路径均清理临时事件数据。

本合同尚未将原作所有 TEMP_FLAGS/TEMP_VARS 自动映射为作用域变量；它们需在剧情状态合同中显式定义。保存恢复本轮验证的是项目的当前访问政策，没有声称兼容原版存档或逐内存位重现。

## 证据与失效条件

见 docs/project/CHANGELOG.md。新增检查覆盖层合并与独立验证、临时生成/隐藏、当前访问保存恢复、相邻地图重进与恢复碰撞、旧草案失效、障碍与持续 Actor 的恢复冲突、移动预约、两层保存保护与插件依赖、入口事实的观察顺序、剧情失败和飞行提交。

只有覆盖结构、入图/重绑、碰撞/预约、保存/依赖、野外/剧情/飞行接线变化时，对应证据失效。新增合规地图或剧情仅验证引用和实际流程；最终浏览器组合验收留到 E。

后续高度接线：入口恢复/世界批量覆盖按 FIELD_ELEVATION.md 的当前平面与预约高度保护角色；不同平面的对象可共享多层桥格。该接线的针对性证据记录于 docs/project/CHANGELOG.md。

## 原作NPC行为绑定

绿宝石切片objectsFor将原作NPC行为映射到运行对象。native来源必须恰好匹配一个条目且有movement_type；缺失/歧义在包内容校验及运行时明确抛出Native NPC binding failed，不以默认朝下静止隐藏错误。已有坐标绑定保持严格匹配；妈妈改用sourceLocalId=LOCALID_PLAYERS_HOUSE_1F_MOM，坐标、朝向、范围由原条目派生（当前2,6、朝右、范围0）。

原创练习员显式声明movement并与原作来源绑定分开；新增原创对象或插件元素必须提供自己的行为，不能利用join失败当默认配置。底层NPC/Actor模块不增加地图名或人物名分支。后续新内容应优先使用稳定原作身份；本次未把整个序章对象目录改为原作脚本解释器，也未修改只读C资料。

## 修改已有NPC与告示牌（2026-10-04）

局部接口增强及后续启动修复已通过全量核心/插件测试和实际浏览器启动验收；完成状态、边界和证据见STATUS。

### 发现对象与修改资格

公开只读命令`core.world.objects({map?,id?})`返回`{map,revision,objects}`，未指定map使用当前地图；指定id只返回该对象，未知ID明确报错。查询可以在忙碌时执行，不要求world写权限。`core.query.objects`也使用同一对象目录。

每项包含稳定id、sourceId、origin、位置、kind、actor、script、dialogue、text、availability、hidden和capabilities。availability区分active（当前投影存在）、inactive（本次条件/覆盖下未显示）、not-instantiated（只有原始NPC资料，未接入运行时）。原始资料尚未实现的对象无修改资格，不能把查到一条来源当作已经实现原作剧情。持续Actor使用actor命令，目录中返回actor-commands-required。

匿名原作NPC采用`core:npc.<地图键>.<原作local_id或原始槽位序号>`；已有业务命名ID保留。原作没有local_id时，使用源列表中从1开始的槽位，即隐式来源身份；移动、改名不改变ID。导入时不得重排这些原始槽位来重新编号；需要重组内容时显式提供固定id/local_id。告示牌使用同样的`core:sign`身份，与NPC占位分开。不要自行拼坐标ID，使用查询返回的ID。

capabilities.fields是允许更改的字段列表，capabilities.hidden表明可否隐藏；它不授予权限，写入仍需manifest.permissions中的world。NPC和sign不能通过kind互相转换。告示牌支持位置、方向、高度、name/text/dialogue及隐藏，不支持NPC移动/训练家字段。这里的位置/隐藏修改的是告示交互区域；原作牌子的画面属于metatile，需要在同一批次另改对应tile，不能把事件移动误认为图块自动移动。

### 对话绑定与读回

普通talk对象和sign允许`changes:{dialogue:注册返回的完整对白ID}`。提交前检查引用及当前状态下的插值；绑定需能独立解析，要求调用parameters的模板不能直接使用。引用的对白通过现有剧情/逐字/历史系统播放。修改层中非空绑定对应明确优先级100的world.dialogue事件，覆盖普通对白与原生告示文本；若另有同级匹配剧情，沿用既有冲突报错规则。商店、治疗、主线特殊对象不允许此字段；它们继续使用原有领域/剧情操作。

`dialogue:null`关闭此次绑定覆盖，之后按既有互动事件处理；它不是撤销整层修改。批量修改仍最多128项，非法对象、对白或字段整批不提交。

按id查询时，如对象有dialogue，额外返回dialoguePreview（按当前状态解析的name/lines/source）和dialogueError；出现解析错误仍能查看其余对象信息。无id的清单只返回引用和原始text，避免整张地图展开大量对白。text不代表对白绑定后的实际台词。后续读回会重新读取当前游戏状态，变量变化可以改变预览。

公开修改增加可选`feedback:true`，成功回执中的changes逐项包含对象读回或1×1有效区域。读取反馈异常时返回`ok:true,revision,feedbackError`，表示业务已提交；不能重放这次修改。默认不展开反馈。`core.world.cells`补revision、appearance、tileset和resource（渲染资源键）；appearance是有效metatile索引，不改变逻辑block。它证明资源引用和碰撞数据，不证明像素画面已经验收。

完整例：[world-editing](../../../examples/world-editing.test.js)。从插件注册到查询、修改、实际告示交互及保存读回；该示例已执行通过，具体结果见STATUS。修改失败、特殊对象资格和依赖另见[核心合同](../../../tests/world-editing.test.js)。

### 有效地图与依赖

Actor的运行时位置初始化、高度、日程到达判定使用WorldStateService.maps；实际路径、感知和每步通行原先已读取有效世界，不另建缓存或导航系统。机关目录在会话绑定时也使用该投影，原有运行时地形上下文继续读取它。日程的注册阶段校验使用基础目录；运行时每步重新判断，地形修改不自动改变日程目标或遭遇表。

世界对象的dialogue引用纳入storyDependencies；保存与导出均记录其插件命名空间，缺失插件先分类为missing_dependency并保护原档。地块覆盖使用该地图所属tileset，保存依赖补记注册tileset及其资源的所有者。当前patch不能给已有地图更换tileset，也不能把数字索引解释成任意插件的地块；跨图集铺设仍属于未实现的结构扩展。

本轮没有增加修改层、撤销、跨批事务、所有权仲裁、地图扩容或区域复制。仍使用permanent/visit、单批原子提交与revision检查，物品布局使用ROOM_LAYOUTS设计中的独立领域提交。


## 世界操作字段的单一声明

WorldStateService的tile字段用于操作白名单、值校验与提取；object的hidden/spawn字段用于白名单、布尔校验和提交提取。validateOperations校验完整批次，prepare直接消费这份结果，不再复制外层字段清单。prepare仍检查对象存在/重复、合并后的完整对象/训练家视线；commit仍验证完整候选状态和revision。这是不同阶段的不变量，不删除防护检查。新增tile或对象顶层可提交字段先更新唯一声明与其语义校验，并证明prepare/提交/序列化后实际保留。
