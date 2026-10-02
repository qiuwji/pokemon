# 引擎机制与公开接口清单

参考：pret/pokeemerald 修订 731ad5bfd6e6f265508d0efcca0ba42f9dcf5881。进度按模块更新，不把接口存在当成原作行为已经验证。招式结构基线见 MOVE_AUDIT.md / move-audit.json；自动扫描只给出同名登记情况，别名与实际语义须人工核对。

| 领域 | 当前基础 | 必补合同/机制 | 原作依据 | 验收状态 |
| --- | --- | --- | --- | --- |
| 招式与回合 | 席位、阶段管线、常用效果 | 完整原作效果分类；状态作用域/到期；多回合/延迟/历史 | include/constants/battle_move_effects.h；src/data/battle_moves.h；src/battle_script_commands.c；data/battle_scripts_1.s | 结构基线已生成；完整行为未验证 |
| 训练家/遭遇 | 原固定队伍、陆地/水域遭遇 | 公开 trainer/encounter/strategy 注册和 battle.start | src/data/trainers.h；src/data/trainer_parties.h；src/data/wild_encounters.json；src/battle_ai_script_commands.c | A2 针对性验证通过，见 DEVELOPMENT_LOG.md |
| 动态世界 | 静态网格、NPC、门/道路 | 持久图块/对象变更、机关、保存恢复 | src/field_control_avatar.c；src/event_object_movement.c；src/scrcmd.c；data/maps/* | A3 针对性验证通过；动作/机关组合待后续 |
| 剧情 | build、条件标记、一次奖励、演出 | 数据分支/选择/变量查询、区域与视线触发、领域命令组合 | src/scrcmd.c；data/scripts/*；data/maps/*/scripts.inc | 待实现 |
| 野外行动 | 步行/跑步/自行车/冲浪/飞行基础 | 目标与资格协议、砍树/碎岩/潜水/攀瀑/钓鱼 | src/field_effect.c；src/fldeff_*；src/field_player_avatar.c | 待补 |
| 地形/交通 | 格子通行与基本动量 | 原作自行车技巧、流向/滑动/强制位移 | src/bike.c；src/metatile_behavior.c；src/field_player_avatar.c | 待补 |
| 游戏时间 | 外观昼夜、成长小时回调 | 可保存时钟、定时任务、恢复/离线策略 | src/clock.c；src/berry.c；src/field_specials.c | 待补 |
| 精灵形态 | 天气形态投影与类型回调 | 有效属性来源、临时形态/重算/恢复 | src/pokemon.c；src/battle_util.c | 待补；Mega 是独立扩展规则 |
| 持续跟随 | 剧情 escort、NPC 插值 | 探索跟随、地图交接、交通适配 | 项目扩展；复用原作对象移动规则 | 待实现；不称原版已有玩法 |
| 设施 | 多席位战斗、场景演出 | 队伍限制、临时等级、连战、设施结果；独立选美领域 | src/battle_tower.c；src/battle_pyramid.c；src/battle_factory.c；src/contest.c；src/safari_zone.c | 未实现完整设施玩法 |
| 精灵/育成 | 创建/IV/EV/性格/遗传/进化 | 全物种规则对照与新增领域服务的保存合同 | src/pokemon.c；src/daycare.c | 既有模块证据沿用；全作仍需核对 |
| 道具/经济 | 受限效果、持有规则、购买 | 野外技能/TM/HM等业务入口、商店配置/库存政策 | src/item_use.c；src/shop.c；src/item.c | 既有模块证据沿用；完整目录待核对 |
| 存档 | 当前 envelope、引用校验 | 每个新增领域自有合同、依赖与恢复 | src/save.c；项目浏览器存储约定 | 跟随新模块演进 |

任何引用路径在具体实现前确认存在并读取对应实现；清单不是对源代码内容的替代。当前未把原版 RNG、原版存档二进制兼容或联网通信计入隐含目标。
