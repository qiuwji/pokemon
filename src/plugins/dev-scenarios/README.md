# 开发测试员（dev-scenarios）

开发/联调用的**快捷场景**插件，**默认关闭**。它在若干地图放置一个"测试员"（Scientist1）对象，交互后弹出菜单，可传送、恢复队伍、发起野生遭遇、练习战，以及**逐招式演示**——直接服务战斗演出专项，省去每次改完代码重跑开场。

## 启用

- URL：`?plugins=dev-scenarios`（或 `?dev-scenarios=1`）
- 或游戏内插件管理里勾选"开发测试员"（写入 localStorage 选择）

不启用时零影响：不注册对象、不注册训练家、不注册剧情。

## 入口

在以下地图的**已验证可站立格子**放置"测试员"，站在其下方按确认键打开菜单：

| 地图 | 测试员 | 落点 |
| --- | --- | --- |
| 未白镇 `LittlerootTown` | (10,1) | (10,2) |
| 古辰镇 `OldaleTown` | (8,1) | (8,2) |
| 101 号道路 `Route101` | (8,1) | (8,2) |
| 103 号道路 `Route103` | (4,2) | (4,3) |
| 研究所 `LittlerootTown_ProfessorBirchsLab` | (1,2) | (1,3) |
| 宝可梦中心 `OldaleTown_PokemonCenter_1F` | (1,2) | (1,3) |

## 菜单

原生选择框现在**可滚动**（`[data-modal-page="story-choice"] .menu-grid` 有 `max-height`+`overflow-y:auto`），键盘上下会把选中行滚进视野，所以菜单项多也不会被裁掉、全部可达。当前测试员是一个整列表：

- **进度·拿到图鉴（未白镇）** / **进度·古辰镇（图鉴+跑步鞋）** / **进度·橙华市（小光教学前）** / **进度·小光教学完成（橙华道馆）**：把存档跳到对应章节。按 id 调用核心内容包 `emerald:progress.<章节>`（`src/content/stories/progress.json`，由核心拥有这些 flag 与奖励账本；插件的剧情命名空间不允许直接写核心 flag）。
- **训练家入场（抛球）**：传到未白镇并直接开打，看训练家入场抛球 + 双方宝可梦出现。
- **遇敌演示**：野生遭遇若干物种，看该物种自身招式动画。
- **招式演示**：按分类逐招式开一场单招演示训练家（Lv20 低攻 dummy 只带该招）。
- **传送**：未白镇/古辰镇/101/103/研究所/宝可梦中心。
- **治疗画面（宝可梦中心）** / **获得道具（特写）** / **恢复队伍** / **关闭**。

**菜单页“开发者”**（暂停菜单里）：按钮“加入一只 Lv20 测试宝可梦”，用于测**换人**动画（加完进战斗后在“宝可梦”里替换）。

> 要换场景再次与"测试员"交互即可。

## 覆盖的招式

`tackle pound scratch quick_attack slash ember flamethrower water_gun bubble absorb razor_leaf thunder_shock thunderbolt mud_slap rock_throw sand_attack growl leer howl harden focus_energy poison_sting string_shot peck`

## 实现（只用公开接口）

- `api.content.register("mapExtensions", ...)` 放"测试员"对象。
- `api.content.register("trainers", "move.<id>", { party:[{ species, level, moves:[id] }] })` 注册单招演示训练家。
- `api.story.registerBundle(...)` 注册 `choice` 菜单与 `scene`/`battle`/`heal` 脚本；`entries` 以 `interact` + `selector.objectId` 接真实入口。

无私有导入、无逐插件分支、默认关闭零影响。

测试：`examples/dev-scenarios.test.js`（真实宿主装配）：传送、练习战、**招式演示训练家**、野生遭遇、六张图入口逐个触发。

## 章节回退与森林重放

回退到四个早期章节时，核心`emerald:progress`内容会请求完整重放森林救援。已打赢的历史奖金和超级球记录保留，因此重新进入完整过场和训练家战，但不再发第二份奖励；普通已胜利的故障续接与章节重放分开判定。标记保存并在确认新的胜利后清除，不依赖测试插件持续启用。旧版已经跳转的存档需刷新后再选择一次目标章节，应用新的重放标记。

验证包括真实击败森林手下→通过地图测试员选择四个早期章节→保存读档→左右入口的完整过场和再次战斗，以及奖金/道具不重复发放。
