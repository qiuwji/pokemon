# 项目导航

本机项目根：`/Users/qiuji/Documents/Codex/2026-10-01/new-chat/outputs/emerald-web`。这是定位提示，不是换机器必须复用的路径。迁移后从本Skill真实目录向上两层，确认package.name为emerald-web-engine；通过符号链接读取时先解析真实目录。

| 入口 | 路径及用途 |
| --- | --- |
| 当前范围/进度/领域Skill | [SCOPE](../../../docs/project/SCOPE.md)、[STATUS](../../../docs/project/STATUS.md)、[SKILLS](../../../docs/project/SKILLS.md) |
| 启动/概览 | [README](../../../README.md)、[package.json](../../../package.json)；npm run dev，端口参数见tools/serve.py，浏览器需HTTP |
| 架构/公开类型 | [ARCHITECTURE](../../../ARCHITECTURE.md)、[contracts.d.ts](../../../src/engine/contracts.d.ts) |
| 浏览器组合 | src/app.js；只装配服务和宿主 |
| 核心/应用/内容 | src/engine、src/game/emerald、src/ui/emerald、src/packs/emerald及src/plugins |
| 渲染/音频资源 | src/presentation、src/adapters、generated/assets；素材来源见README及AUDIO规格 |
| 机制与规格 | [文档导航](../../../docs/README.md)、docs/engine和docs/architecture；按当前领域读取 |
| 验证与过程 | [FINAL_VALIDATION](../../../docs/project/VALIDATION.md)、docs/validation、tests、DEVELOPMENT_LOG |
| 原路线历史 | [ENGINE_ROADMAP](../../../ENGINE_ROADMAP.md)；当前范围调整优先于旧追加记录 |

参考在项目根work/pokeemerald，固定修订731ad5bfd6e6f265508d0efcca0ba42f9dcf5881，上游https://github.com/pret/pokeemerald。它不在当前Git源码包里；接手时另附参考或按固定修订获取。sources若存在同样只读，不能把导出结果写回参考。

文件若不存在先确认收到的是完整项目及资源，再核对STATUS中的接口缺口；不要自行创造同名模块并声称是既有能力。运行中的浏览器/端口、Git提交和保存版本以实际环境/README/代码为准，不固化进Skill。

当前文档迁移映射见docs/project/document-paths.json。链接失效时检索`createEmeraldPlugins`、`attachEmeraldExtensions`、`registerEmeraldCommands`；旧根领域文件已搬到docs/architecture，不应按旧路径重新创建另一份规格。
