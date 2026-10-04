# 分领域接手入口

代码仓库的`skills/`是Skill的权威副本，和代码/规格/进度一起交付；支持Markdown阅读的其他模型也可以直接使用。先读[范围](SCOPE.md)和[当前状态](STATUS.md)，再选一个任务对应的Skill，不需要每轮加载全部领域资料。

| 使用场景 | Skill |
| --- | --- |
| 首次接手、任务选择、跨领域定位 | [emerald-project-handoff](../../skills/emerald-project-handoff/SKILL.md) |
| 新HM、关键道具、野外互动 | [emerald-field-actions](../../skills/emerald-field-actions/SKILL.md) |
| 完整原作剧情转写、区域业务还原 | [emerald-story-reconstruction](../../skills/emerald-story-reconstruction/SKILL.md) |
| 新地图、机关、剧情、时间业务 | [emerald-world-content](../../skills/emerald-world-content/SKILL.md) |
| 新招式、状态、AI、训练家、战斗规则 | [emerald-battle-rules](../../skills/emerald-battle-rules/SKILL.md) |
| 新设施与设施规则 | [emerald-facility-content](../../skills/emerald-facility-content/SKILL.md) |
| 新玩法插件、页面交互、表现扩展 | [emerald-plugin-authoring](../../skills/emerald-plugin-authoring/SKILL.md) |
| NPC行为、作息、角色互动 | [emerald-actor-behaviors](../../skills/emerald-actor-behaviors/SKILL.md) |
| 验证、阶段验收、可携带交接 | [emerald-release-validation](../../skills/emerald-release-validation/SKILL.md) |

本机可在默认Skill目录建立指向这些目录的符号链接，不复制另一份易过时文件。换机器必须一起提供仓库；新的读者通过总Skill内project-map定位。当前Skill不是自动调度器，不会自行启动多个模型或向其他任务发消息。

每份Skill有核心名词、一个实际20–30行示例、常见报错及搜索兜底。统一写法及工具说明见[作者指南](../development/AUTHORING.md)，验证与证据复用见[测试指南](../development/TESTING.md)。例子见[examples](../../examples/README.md)，`npm run check:docs`防止片段与文件脱节。

秘密基地/房间编辑先用world-content读取[持久布局设计](../engine/world/ROOM_LAYOUTS.md)，其中多格占位、原子编辑与保存属于尚未实现的框架任务，不是设施活动的局部data。玩家联线先用plugin-authoring读取[会话/所有权设计](../architecture/PLAYER_LINK.md)；单机控制接口不能证明跨存档交换。两类完整业务后续按STATUS分派，不能把设计里的名字当可调用API。
