# 引擎机制与公开接口清单

参考：pret/pokeemerald 修订 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881。进度按模块更新，不把接口存在当成原作行为已经验证。招式结构基线见 MOVE_AUDIT.md / move-audit.json；自动扫描只给出同名登记情况，别名与实际语义须人工核对。

| 领域 | 当前基础 | 必补合同/机制 | 原作依据 | 验收状态 |
| --- | --- | --- | --- | --- |
| 招式与回合 | 席位、阶段管线、常用效果 | 完整原作效果分类；状态作用域/到期；多回合/延迟/历史 | include/constants/battle_move_effects.h；src/data/battle_moves.h；src/battle_script_commands.c；data/battle_scripts_1.s | 结构基线已生成；完整行为未验证 |
| 训练家/遭遇 | 原固定队伍、陆地/水域遭遇 | 公开 trainer/encounter/strategy 注册和 battle.start | src/data/trainers.h；src/data/trainer_parties.h；src/data/wild_encounters.json；src/battle_ai_script_commands.c | A2 针对性验证通过，见 docs/project/CHANGELOG.md |
| 动态世界 | 静态网格、NPC、门/道路 | 持久图块/对象变更、机关、保存恢复 | src/field_control_avatar.c；src/event_object_movement.c；src/scrcmd.c；data/maps/* | A3 与访问覆盖/重进恢复已针对性验证，见 WORLD_LIFECYCLE.md；机关注册/薄冰/裂地板首轮已针对性验证，见 FIELD_DEVICES.md；全房间机关内容仍待补 |
| 剧情 | build、条件标记、一次奖励、演出 | 数据分支/选择/变量查询、区域与视线触发、领域命令组合 | src/scrcmd.c；data/scripts/*；data/maps/*/scripts.inc | A4 数据条件/变量/分支/选择已针对性验证，内容还原待业务阶段 |
| 野外行动 | 步行/跑步/自行车/冲浪/飞行基础 | 目标与资格协议、砍树/碎岩/潜水/攀瀑/钓鱼 | src/field_effect.c；src/fldeff_*；src/field_player_avatar.c | C1 首轮合同/行动/钓鱼针对性验证；普通障碍恢复已接入；正式鱼竿、特殊恢复/草丛居合斩与素材仍待补，见 FIELD_ACTIONS.md |
| 地形/交通 | 格子通行与基本动量 | 原作自行车技巧、流向/滑动/强制位移 | src/bike.c；src/metatile_behavior.c；src/field_player_avatar.c | C2 首轮已针对性验证；桥面高度首轮已验证，见 FIELD_ELEVATION.md；机关注册/薄冰/裂地板首轮见 FIELD_DEVICES.md；Mach/Acro 输入/原帧/裂地板组合见 MOVEMENT_INPUT.md；桥面回弹/双格升沉/独立外观已针对性验证，见docs/engine/field/BRIDGES.md；全地形原帧/骑行道路与实际地图素材待补 |
| 游戏时间 | 外观昼夜、成长小时回调 | 可保存时钟、定时任务、恢复/离线策略 | src/clock.c；src/berry.c；src/field_specials.c | C3 时钟/调度/树果首轮已针对性验证；完整每日业务/潮汐地图与土壤内容待接线，见 WORLD_TIME.md |
| 天气 | 世界选择/坐标/周期/覆盖；独立战斗身份与规则/绘制注册 | 全作脚本/灰采集/原作素材与天气音频 | weather.h；field_weather_effect.c；coord_event_weather.c；battle_util.c；地图 JSON | 18 项证明分别通过，见 WEATHER.md |
| 精灵形态 | 天气形态投影与类型回调 | 有效属性来源、临时形态/重算/恢复 | src/pokemon.c；src/battle_util.c | C4 基础身份/有效投影/变身与模仿已针对性验证；现代形态扩展见 PLUGIN_EVOLUTION.md，非原作机制 |
| 持续 Actor | 全局身份、持久状态、感知/导航/姿态、邻接互动 | 完整日程/作息与业务状态机模板 | 项目通用扩展；原作 NPC 使用移动/事件资料核对 | C6 首轮已针对性验证，见 ACTORS.md |
| 伙伴跟随插件 | 通用 Actor 与导航可复用 | 后续插件根据真实需求组合/补接口 | 项目扩展示例，原版绿宝石无此玩法 | 用户 2026-10-03 指示延后；不在当前实现范围 |
| 设施 | 多席位战斗、场景演出 | 队伍限制、临时等级、连战、设施结果；独立选美领域 | src/battle_tower.c；src/battle_pyramid.c；src/battle_factory.c；src/contest.c；src/safari_zone.c | 未实现完整设施玩法 |
| 精灵/育成 | 创建/IV/EV/性格/遗传/进化 | 全物种规则对照与新增领域服务的保存合同 | src/pokemon.c；src/daycare.c | 既有模块证据沿用；全作仍需核对 |
| 道具/经济 | 受限效果、持有规则、购买 | 野外技能/TM/HM等业务入口、商店配置/库存政策 | src/item_use.c；src/shop.c；src/item.c | 学习/50 TM/8 HM 兼容/库存/插件导师首轮已针对性验证，见 MOVE_LEARNING.md；正式关键道具、商店与完整主动用途待补 |
| 存档 | 当前 envelope、引用校验 | 每个新增领域自有合同、依赖与恢复 | src/save.c；项目浏览器存储约定 | 跟随新模块演进 |

任何引用路径在具体实现前确认存在并读取对应实现；清单不是对源代码内容的替代。当前未把原版 RNG、原版存档二进制兼容或联网通信计入隐含目标。

天气追加首轮已实现并针对性验证：世界来源/周期/保存/覆盖、入战映射、注册战斗政策/视觉、剧情/命令/插件事务，详见 WEATHER.md。全丰缘天气剧情、灰采集、原作素材与音频还未完成；天气、场地、空间保持独立。
