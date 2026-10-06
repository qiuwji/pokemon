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

- **训练家入场（抛球）**：传到未白镇并直接开打，看训练家入场抛球 + 双方宝可梦出现；胜负/白屏返程也可用（故意用"叫声"不输出即送死）。
- **遇敌演示**：以野生形式遭遇若干物种（土狼犬/蛇纹熊/刺尾虫/拉鲁拉丝/傲骨燕/长翅鸥），用来看该物种自身招式的动画。
- **招式演示**：按"普通·火·水·草·电·岩地·变化"分类，逐招式开一场**单招演示训练家**——每场只有一个 Lv20 低攻 dummy（wurmple）只带该招式，招式的观感可**确定性**触发。
- **治疗画面（宝可梦中心）**：直接播放落地 + 治疗节拍（不扣钱）。
- **获得道具（特写）**：发一个伤药，弹出道具特写。
- **传送**：未白镇/古辰镇/101/103/研究所/宝可梦中心。
- **恢复队伍**、**关闭**。

**菜单页“开发者”**（暂停菜单里）：按钮“加入一只 Lv20 测试宝可梦”，用于测**换人**动画（加完进战斗后在“宝可梦”里替换）。

> 子菜单取消即关闭（静态检查禁止剧情 `call` 环）；要换场景再次与"测试员"交互即可。

## 覆盖的招式

`tackle pound scratch quick_attack slash ember flamethrower water_gun bubble absorb razor_leaf thunder_shock thunderbolt mud_slap rock_throw sand_attack growl leer howl harden focus_energy poison_sting string_shot peck`

## 实现（只用公开接口）

- `api.content.register("mapExtensions", ...)` 放"测试员"对象。
- `api.content.register("trainers", "move.<id>", { party:[{ species, level, moves:[id] }] })` 注册单招演示训练家。
- `api.story.registerBundle(...)` 注册 `choice` 菜单与 `scene`/`battle`/`heal` 脚本；`entries` 以 `interact` + `selector.objectId` 接真实入口。

无私有导入、无逐插件分支、默认关闭零影响。

测试：`examples/dev-scenarios.test.js`（真实宿主装配）：传送、练习战、**招式演示训练家**、野生遭遇、六张图入口逐个触发。
