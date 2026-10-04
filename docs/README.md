# 绿宝石工程文档导航

第一次接手，请按 **范围 → 当前状态 → 架构 → 本次领域Skill → 可运行示例** 阅读。这里是现行文档入口；不需要把所有历史计划读一遍才开始工作。

## 先回答你最需要的问题

| 问题 | 权威入口 |
| --- | --- |
| 项目是什么、怎么启动？ | [README](../README.md) |
| 本轮做什么、什么留给后续？ | [SCOPE](project/SCOPE.md)、[ENGINE_ROADMAP](../ENGINE_ROADMAP.md) |
| 已完成什么、还差什么、下一步？ | [STATUS](project/STATUS.md)；必须对照代码和验证证据 |
| 内容在哪里、导入怎么运行？ | [内容管线](development/CONTENT_PIPELINE.md)、[导入索引](development/IMPORT_SCRIPTS.md) |
| 怎么分层、该改哪个模块？ | [ARCHITECTURE](../ARCHITECTURE.md)、[作者指南](development/AUTHORING.md) |
| 新AI怎么接手一个领域？ | [Skill路由](project/SKILLS.md)及[examples](../examples/README.md) |
| 怎么测试、哪些证明可以复用？ | [测试指南](development/TESTING.md)、[VALIDATION](project/VALIDATION.md) |
| 最近改动及历史决策？ | [CHANGELOG](project/CHANGELOG.md)、[history](history/engine-roadmap-a-e.md) |

## 按领域找规格

| 领域 | 规格及架构 |
| --- | --- |
| 应用服务/公共命令 | [APPLICATION](architecture/APPLICATION.md)、[PLUGINS](architecture/PLUGINS.md)、[NETWORK](architecture/NETWORK.md) |
| 世界/时间/天气 | [状态与访问](engine/world/STATE_AND_LIFECYCLE.md)、[时间](engine/world/WORLD_TIME.md)、[天气](engine/world/WEATHER.md)、[遇敌与接触](engine/world/ENCOUNTERS_AND_CONTACTS.md)；[持久房间布局](engine/world/ROOM_LAYOUTS.md)为待实现设计 |
| 地形/移动/HM | [地形](engine/field/FIELD_TERRAIN.md)、[高度](engine/field/FIELD_ELEVATION.md)、[机关](engine/field/FIELD_DEVICES.md)、[野外行动](engine/field/FIELD_ACTIONS.md)、[输入](engine/field/MOVEMENT_INPUT.md)、[桥梁](engine/field/BRIDGES.md)、[移动架构](architecture/MOVEMENT.md) |
| 剧情/演出 | [剧情语言](engine/story/STORY_LANGUAGE.md)、[剧情内容架构](architecture/STORY_CONTENT.md)、[逐字对话](engine/presentation/DIALOGUE.md)、[原作转写流程](../skills/emerald-story-reconstruction/SKILL.md)、[剧情导演](architecture/CUTSCENES.md) |
| 战斗 | [架构](architecture/BATTLE.md)、[机制矩阵](engine/battle/MECHANISM_MATRIX.md)、[状态与行动](engine/battle/STATES_AND_ACTIONS.md)、[插件行动增强](engine/battle/AUGMENTS.md)、[语义审计](engine/battle/MOVE_AUDIT.md)、[规则覆盖](engine/battle/GEN3_RULE_COVERAGE.md) |
| 精灵/物品/育成 | [形态](engine/creatures/FORMS.md)、[育成](architecture/GROWTH.md)、[库存](engine/items/INVENTORY.md)、[野外物品](engine/items/FIELD_ITEMS.md)、[招式学习](engine/items/MOVE_LEARNING.md) |
| Actor | [ACTORS](engine/actors/ACTORS.md) |
| 设施及非战斗活动 | [FACILITIES](engine/facilities/FACILITIES.md)；完整开拓区、选美、游戏厅仍是后续业务 |
| 视觉/声音 | [表现架构](architecture/PRESENTATION.md)、[外观/相机/环境](engine/presentation/APPEARANCE_AND_VIEW.md)、[动画合同](engine/presentation/ANIMATION_CONTRACT.md)、[资源帧片段](engine/presentation/SPRITE_CLIPS.md)、[真实音频](engine/presentation/AUDIO.md)、[插件UI](engine/presentation/UI_CONTRACT.md) |
| 插件后续接口需求 | [PLUGIN_ROADMAP](project/PLUGIN_ROADMAP.md)；计划不能当现有能力 |
| 玩家联线（可选） | [PLAYER_LINK](architecture/PLAYER_LINK.md)为待实现设计；现有[NETWORK](architecture/NETWORK.md)只控制一份单机会话 |

## 每种文档只负责一件事

Skill保存稳定接手流程、术语、真实示例和查错入口；当前进度只写STATUS。架构解释职责和依赖，领域规格解释合同/参数/政策，examples提供可以执行的入门行为，validation保存当时检查的证据。

history是旧设计和旧范围，不控制当前任务。CHANGELOG和VALIDATION中带日期/版本的段落也是历史事实，不能按旧测试数认定当前通过。原C参考在只读work/pokeemerald，生成审计是索引，不等于已经完成全部语义。

相关短规格已按所有权合并：世界状态与访问生命周期、战斗状态/行动/AI、野外物品与快捷。旧路径到新路径见[document-paths.json](project/document-paths.json)。根DEVELOPMENT_LOG和FINAL_VALIDATION仅保留入口，避免维护两份进度。文件移动时同步真实链接与关键词；`npm run check:docs`会检查链接和Skill片段。
