# 可保存的登记道具与快捷操作

已实现并针对性验证：登记/取消、使用时重新资格检查、缺物品清理、单/多行动插件、背包登记界面、键盘 C/触屏 SELECT、公共命令和当前保存格式。原作其他关键道具与完整道具获得剧情不是本模块的完成范围；槽位容量与应用接线现已完成，见 INVENTORY.md。

## 单一职责

`engine/item-shortcut.js` 只拥有选择生命周期，接收 selection/quantity/setSelection/inspect/perform/emit 有限端口；不读取整个 game、DOM、地图 ID、徽章、按键或 RNG。动作的资格、计划/指纹、导演与提交仍归 ItemActionService/FieldActionService。

`ItemShortcutApplication` 是第 20 个职责应用，保存 registeredItem 字段的写入用例，协调锁、UI 更新、事实与保存；不导入兄弟应用。注册/取消从背包模态界面允许，战斗、剧情、移动和对话时拒绝；快捷使用也要求模态界面已关闭。adventure 仍为 149 行组合入口，新增端口由 public-ports 显式路由，未增转发或核心用例。

## 内容与状态合同

字段 `item.registerable?:boolean`：true 只用于 target=field、已有 actions 的物品。绿宝石两辆车和三种鱼竿声明 true；普通伤药、球和机器不能登记。插件可显式为自己的行动道具声明 true，不写死关键道具 ID 或口袋名称。

当前保存版本 **10** 要求 `state.registeredItem`：

```js
null
// 或某物品的一条已声明行动
{item:"my-pack:device",action:"activate"}
```

两个字段必须恰好为字符串并引用当前目录的 registerable 物品及有效绑定；不能携带 input/函数/旧资格快照。null 是明确的未登记状态，缺字段不回退，旧 envelope 不迁移。每次新进度建立 null；载入/重开后的服务通过实时端口读取新 state，不留旧对象引用。

登记检查实际库存和声明，不要求此时能执行。例如站在陆地可以登记鱼竿，面向合法岸边水域后才能使用。重复登记相同内容不再发事实，即使导入 JSON 的字段顺序不同。物品从背包消失时可保留登记；只读查询不清理，在下一次快捷使用时清空并保存，不调用行动。这对应原作 UseRegisteredKeyItemOnField 的生命周期，不是旧格式兼容。

保存依赖也包含已登记物品，即使其数量已为零。所需插件缺失时仍保护原文，不能悄悄清空登记后加载一个不同进度。

## 公共查询、命令与反馈

`game.registeredItemView()` / 插件只读状态 / core.query 的 registeredItem 返回：selection、owned、usable，可选 name/reason。查询没有写入、随机抽取或自动解除登记。

- `core.item.register {item,action}`：登记已声明的绑定。
- `core.item.unregister {}`：明确取消。
- `core.item.shortcut {}`：异步，使用登记项；当下重新检查库存、地图和行动条件。

UI、网络、插件使用同一命令；插件权限为 useItem。事务动作中不能嵌套 dispatch，异步场景由事务外命令调用。最终动作继续发 core:field-action，命令完成继续发 core:command-complete。

登记改变的事实：`core:item-registration {selection,cause}`，cause 为 register/unregister/missing-item，payload 冻结。取消没有登记的状态/再次登记同一项不会重复发事实。失败的资格不改变选择、不消耗物品。

可信 JS 插件不是代码沙箱；上述权限限制的是合作接口。插件不得直接修改核心存档对象。

## 页面与输入

背包通过 registerable/actions 元数据提供登记按钮；一个绑定直接登记，多个绑定展示选择。登记已有同一条绑定会取消；不是立刻执行行动。鼠标/方向菜单采用原界面焦点导航，没有在页面写库存或场景状态。

浏览器宿主把 C 和触屏 SELECT 映射到同一 useRegisteredItem 端口；忽略键盘自动重复、文本框输入和 Ctrl/Command/Alt 组合。菜单/对话、剧情、战斗及移动期间不启动。调用前清理旧方向/跑步状态，失败由提示反馈；销毁时通过 AbortController 解除键盘和触屏监听。移动或动画核心不认识 C/SELECT。

SELECT 与 A/B 使用两行像素控制布局，避免三个按钮横向挤压方向盘。新版真实浏览器画面/手机窄屏仍待 E，不以输入端口替身证明像素布局已视觉验收。

## 原作依据与差异

只读参考 revision 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881：item_menu.c Task_ItemContext_Register / UseRegisteredKeyItemOnField、item.c 注册车种更新。原作保存单一物品编号，本项目保存命名空间物品 + 绑定 ID，以支持插件多行动；不缓存可用性。C 是浏览器映射，原作按键为 SELECT。

原作对联合房间/战斗金字塔/对战水管等特殊会话还有快捷道具限制。相关设施尚未实现，后续设施会话应通过共用行动许可/锁合同表达，不添加地图 ID 分支。目前不宣称完整设施限制或车店交换业务已完成。

## 验证与继续开发

新增13项（含原生商店元数据修复）各有通过记录；相关209项初次208通过、1个页面装配失败。正确的 ui-composition.test.js 检查发现此前 BASE_ITEMS 合并把普通消费品也设为 shopStock:false，修复为包内明确库存；失败项与新增商店正反检查通过。旧专项清单中的 ui-assembly.test.js 并不存在，本轮实际验证页面装配，未来选取范围以真实文件为准。

对话锁/导入字段顺序的收尾改变只检查对应项。npm run check 内容/严格类型/251模块通过，商店收尾内容再次通过。证据、范围及源码 hash 见 docs/validation/2026-10-03-item-shortcut/manifest.json。没有重复全部测试或冒充 E 浏览器验收；最新全量基线仍为1851e9d 556项。

选择身份、内容声明、资格/锁、路由/依赖/保存或输入/UI改变才使对应证据失效。后续槽位库存迁移会影响 quantity 与保存边界，须重查此模块的相关组合，但不另建快捷系统。

槽位迁移更新（2026-10-03）：数量资格读取冻结派生投影，保存仅写槽位；所选消费位置经公开命令重新验证，计划成本交由统一库存领域。当前保存10，旧版本拒绝。组合证据见 [库存验收](../validation/2026-10-03-inventory-integration/manifest.json)，本模块未变更的规则/表现证据继续沿用。
