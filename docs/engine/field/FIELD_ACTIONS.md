# 野外行动与钓鱼合同

阶段：C1 首轮接口与针对性验证完成。临时障碍访问/恢复合同已接入，见 WORLD_LIFECYCLE.md。完整原作表现、草丛居合斩、特殊地图碎岩剧情和其余关键道具/特殊钓点仍待完成；三种鱼竿和两种自行车的库存/背包接线见docs/engine/items/FIELD_ITEMS.md。不要把本文件当作全作野外机制已完成的声明。

## 分层与入口

- `engine/field-actions.js`：注册、输入 schema、只读资格/目标查询、计划签发、变化检测、一次提交与事实事件。没有徽章、招式、地图名称或渲染依赖。
- `packs/emerald/field-actions.js`：原作资格及行动定义。地图元素用 `kind: cutTree / breakableRock`；潜水点用 `fieldLinks` 注册，不能把任意传送写进移动核心。
- `application/field-action-application.js`：世界、移动、剧情、遭遇和表现端口的协调。操作预检先于演出；UI 只发请求。`adventure.js` 仅装配，显式端口表路由到唯一用例所有者。
- `engine/fishing.js`：独立时钟/输入状态机；`rules/gen3/fishing.js` 提供原作等待、收竿窗口、鱼竿轮数与吸盘/黏着政策。浏览器和网络不决定咬钩结果。
- `presentation/field-action-director.js`：准备、效果、遮盖提交和收尾。野外视觉复用 `PresentationRegistry`，插件通过已有 `api.presentation.effect` 注册绘制器，行动的 `cue` 引用其返回 ID。

公开注册种类：`fieldActions`、`fieldLinks`。公开查询：`core.query` 返回 `fieldActions` 的资格、说明与输入参数。公开命令：

```js
// 使用当前目标；位置、对象与资格在执行时读取。
await api.commands.dispatch("core.field.action", { id: "cut" });
await api.commands.dispatch("core.field.action", {
  id: "fishing", input: JSON.stringify({ rod: "old" })
});
// 这是钓鱼期间可并发执行的输入；不绕过其他游戏行动的锁。
await api.commands.dispatch("core.field.fishing-input", {});
await api.commands.dispatch("core.field.fishing-input", { cancel: true });
```

上述操作使用既有 `movement` 权限，经过统一命令/网络协议；它们不向外提供可伪造的准备计划。可信 JS 插件仍不是第三方代码沙箱。

## 定义与受控操作

行动定义包含 `name / cue / duration / schema? / allowed / target / plan`。回调只接收只读 JSON，必须同步、确定性且无副作用。`allowed` 返回 `true` 或 `{reason}`；`target` 返回 JSON 或 `null`；`plan` 返回以下一种操作：

| 操作 | 行为与验证 |
| --- | --- |
| `world` | 使用既有世界批量覆盖，不允许把玩家格子封死；可请求碎岩遭遇 |
| `travel` | 校验地图、格子、实时占用及目的地移动模式；遮盖后调用地图生命周期 |
| `route` | 预检整条同地图方向序列，演出期间逐格交给既有 FieldDirector；不另写移动算法 |
| `movement` | 共用移动资格预览；收尾时提交标准陆地模式并清理输入，不允许任意冲浪/潜水模式切换 |
| `fishing` | 建立钓鱼会话，按键/时钟进入收竿结算；只在成功后生成一次野生精灵 |
| `effect` | `{id,data}` 启用已注册持续野外效果；`{id,remove:true}` 解除，生命周期由效果定义负责 |
| `displace` | `{object,direction,follow,mode,scope,duration}` 将静止世界对象移动一格；可选择玩家同步跟进 |

不能在插件计划中携带函数、未支持操作或额外字段。准备计划是服务签发的一次性对象；当前格子、模式、资格、队伍、背包、世界版本或对象占用发生变化时，旧计划不再提交。校验失败不消耗招式 PP，也不进行遭遇随机抽取。

`route` 是逐步提交，不是跨多格的事务回滚。输入及自主 NPC 在执行期间锁住；如果外部可信逻辑在途中破坏路线，停止于最后一个合法格子并返回失败，不发完成事件。应通过受控命令写世界，避免直接修改域对象。世界操作本身仍使用既有原子批量提交。

成功事实：`core:field-action {id, target, outcome}`。钓鱼取消/逃脱也是已进行的一次会话，`outcome` 明确区分；失败的资格/过期计划不发成功事件。既有世界覆盖、步数和战斗事件照常经过原端口。

## 物品、对象与地形共用的交互入口

行动可声明 `triggers:["interact"]` 或 `["blocked"]`。前者由确认键选择并展示既有行动确认页；后者在普通移动受阻后选择并执行。`priority` 为整数，较小者先匹配，同优先级按完整ID的字典序；只选择资格和目标均有效的第一个定义。自动触发必须能以空输入通过schema；需要参数的行动仍走显式命令/道具入口。选择不等于提交，演出后会再次核对条件和占位。

`allowed/target/plan` 接收冻结视图，不直接写背包、坐标或地形。物品的 `items.actions` 仍绑定行动ID与输入，并额外检查物品持有；没有另一套物品脚本执行器。对象种类、地形行为值、徽章与招式是内容政策。移动内核不识别箱子、石块或怪力。公开纯辅助函数 `frontCell(position)` 位于 `dist/engine/extensions/field-utils.js`。

独立作者例：[interaction-workshop](../../../dist/plugins/interaction-workshop.js) 注册箱子推动、草地整理、提灯、照明效果和重量感应器，不注册任何剧情。它是可选框架示例，没有默认装入原作地图，也没有完整石块素材。

### 对象位移合同

`displace.object` 为当前地图对象ID，`direction` 为四方向，`follow` 为布尔值，`mode` 引用注册移动模式，`scope` 为 visit/permanent，`duration` 为正数毫秒且不超过60000。预检共用网格移动、通行、高度及其他对象的两端预约；不能跳崖、跨图、穿warp，不能修改正在移动的对象。持久Actor仍由Actor所有者移动，不能通过世界对象覆盖写其坐标。

提交前重新检查；对象覆盖与玩家跟进协调提交，跟进未开始时失败恢复覆盖和位置。对象逻辑位置在提交时生效，纯导演计算从旧格到新格的偏移，玩家沿用既有运动时钟；动画不决定坐标。场景租约暂停自主NPC并阻止普通输入/受控世界命令，位移结束后再解锁。它没有另设一套可与租约并发使用的对象运动仓储；需要连续自由移动的实体使用Actor框架。

提交发出 `core:object-moved {id,kind:"world-object",from,to}`。机关可注册 `occupancy(context)`，收到 `event.payload={subject,stage:"leave"|"enter"|"settle"}`；context.objects 是当前地图冻结占位投影，而不是完整NPC运行对象。压板、称重或其他政策由机关定义处理。失败的机关响应会报告 `core:device-fault`，不撤销已经成功的位移；这是提交后的反馈边界。

## 持续效果与局部照明

`api.content.register("fieldEffects",id,{scope,schema,retain?,presentation?})`：scope 是 visit 或 world，schema 校验自有数据。visit 每次重新进入地图清除；world 可用同步只读 `retain(transition,data)` 决定保留，transition 包含 from/to/reason 及目标地图的 indoor/darkness/presentation。保存重载同一次访问不清空效果，缺定义或不合法数据拒绝当前存档；保存格式12不提供旧版本迁移。

`presentation(data,context)` 返回只读JSON贡献，不能发命令或使用表现随机数。当前照明消费者接受 `{kind:"light-radius",radius}`，地图声明 `darkness:{radius,illuminatedRadius,opacity?}`；半径为0–512的逻辑像素，扩大半径不得小于基础半径，opacity 为0–1。渲染遮罩覆盖所有光源圆并集之外的像素，半径变化由注入时间的LightingDirector插值；reducedMotion直接取目标值，领域效果完全相同。没有darkness的地图不画遮罩。

原生flash只保存启用状态（空数据对象），照明贡献从当前地图的illuminatedRadius派生；跨室内地图保留时不会携带上一张地图的照明半径。自定义提灯可以用自己的数据/表现政策声明固定半径。

这不是带探索记忆的战争迷雾；多环境层与视线政策的下一阶段见[插件后续计划](../../project/PLUGIN_ROADMAP.md)。效果注册不意味着任意JSON都有对应绘制器。

## 内容作者示例

```js
const cue = api.presentation.effect("spark", {
  draw(ctx, visual) { // visual 包含 scope=field、x/y、t、phase、actionId
    ctx.fillStyle = "#ffe596";
    ctx.fillRect(visual.x, visual.y, 3, 3);
  }
});
api.content.register("fieldActions", "open-gate", {
  name: "解除机关", cue, duration: 600,
  allowed: c => !!c.flags.gateKey,
  target: c => {
    const gate = c.objects.find(o => o.id === "my-pack:gate");
    return gate ? { ...gate, map: c.position.map } : null;
  },
  plan: (c, target) => ({ kind: "world", operations: [
    { kind: "object", map: c.position.map, id: target.id, hidden: true }
  ] })
});
```

潜水点 `fieldLinks` 格式为 `{map,x,y,action:"dive"|"surface",to:{map,x,y,dir}}`。同位置、同方向行动不得重复；水下地图须声明 `underwater:true`。移动定义新增通用 `mapRequires` 标量条件，例如 `{underwater:true}`，运行资格和存档校验共用，保存核心不识别潜水模式名称。

剧情可直接编排 `{type:"fieldAction",id:"cut",variable:"treeCleared"}`，可选 `input` 为 JSON 对象。`variable` 保存是否成功，后续通过既有变量查询分支；未指定变量时失败会中止剧情。剧情借用其已有场景租约，不重新打开 NPC 场景，也不解锁剧情。整棵命令树先检查引用/schema，野外行动占独占资源，不允许与移动/切图并行。

## 原作政策与已知差异

参考只读 `work/pokeemerald`，修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`：

- `data/scripts/field_move_scripts.inc`：居合斩第一枚、碎岩第三枚；队伍招式检查不要求使用者当前 HP，野外不扣招式 PP。
- 同文件的 `EventScript_StrengthBoulder`、`src/event_data.c:ClearTempFieldEventData`：怪力第四枚，先启用当前访问效果，随后普通受阻移动推石；重新入图清除。`src/field_player_avatar.c:PushBoulder_Move` 与 `src/event_object_movement.c:UpdateWalkSlowAnim` 提供同步动作及每两帧一像素的慢走依据，当前连续时间演出采用32/60秒预算，不声称逐帧完全一致。
- `src/party_menu.c`、`src/overworld.c:LoadMapFromWarp/SetDefaultFlashLevel/Overworld_ResetStateAfterFly`：闪光第二枚；普通室内转图保留、到室外或旅行清除。原作 `field_screen_effect.c` 的半径表包含24/72；这里由地图声明而非渲染器识别洞窟名称。地图作者须把原作室内/室外类型正确转写为indoor；特殊谜题闪光另属业务。
- `src/field_control_avatar.c:GetInteractedWaterScript / TrySetupDive*`：潜水第七枚、攀瀑第八枚，攀瀑朝北且处于冲浪。
- `src/field_player_avatar.c:Fishing_*`：以 60 帧/秒换算等待；每点 20 帧，收竿窗口为 36/33/30 帧，初始/后续点数及最少轮数政策；首位非蛋吸盘/黏着先做额外咬钩判定。
- `src/wild_encounter.c:GenerateFishingWildMon / FishingWildEncounter`：钓鱼成功后的生成不再执行普通遇敌概率或威吓拦截，鱼竿表可用 `encounters.rod` 区分。

项目政策：引擎使用连续时间与固定种子接口，掉帧时从观察到的相位起算窗口；不是逐帧/逐位 RNG 的完全仿真；钓鱼结束提示固定保留 600ms，是当前可读性政策。鱼竿资格来自对应实际库存，三种鱼竿可从背包使用；研究装备和旧旗标旁路已删除。岸边高度/水下/瀑布/桥边检查见docs/engine/items/FIELD_ITEMS.md。普通砍树/碎岩使用 visit 覆盖，保存当前访问、重新入图恢复；永久特例由剧情/内容政策声明。草丛居合斩及特殊地图碎岩脚本尚待接线。丑丑鱼点位、原作完整鱼竿表和动作精灵资源尚未导入。

## 验证与失效

针对性证据与失败修正见 `docs/project/CHANGELOG.md`。新增测试覆盖计划权限/一次性/变化、公开命令、插件与视觉注册、障碍保存恢复、资格、潜水模式往返、全路线攀瀑预检、钓鱼窗口/轮数/特性/取消、遭遇一次生成、剧情租约与预检、只读 UI。浏览器端地图素材/动作保真留在最终系统验收，不以 DOM 替身检查代替。

只有操作结构、资格/指纹、移动/世界提交、场景锁、钓鱼计时或共享视觉注册合同变化时，上述对应证据需要重查；仅新增合规地图/行动内容，应验证该内容引用与业务流程，不重复全工程回归。
