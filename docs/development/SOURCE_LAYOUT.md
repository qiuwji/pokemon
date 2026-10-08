# 源码与生成资源直接运行

2026-10-06按用户要求取消复制构建。工程只有两类运行输入，不生成dist，没有build/prebuild命令，也没有合并后的部署树。GitHub Pages仅在运行器临时目录打包同样的src/generated，不写回仓库；见[发布说明](GITHUB_PAGES.md)。

| 目录 | 内容 | 如何修改 |
| --- | --- | --- |
| `src/` | 手写引擎、适配器、插件、页面；清单、剧情、可编辑内容；字体与许可 | 修改源码/内容；混合元数据的原作字段仍受ownership控制 |
| `generated/` | grid/tileset JSON、生成规则模块、PNG、音频、来源清单、测试地图 | 修改工具/配置，再预演及重新生成 |

两棵目录各保留一份文件。生成输入保留在Git，干净检出无需原作资料、Pillow或音频渲染器就能运行游戏与Node检查；重新导入才需要相应参考及工具。业务修改看src，派生修改看generated，后者由.gitattributes标记便于review。

## 手写运行时的职责位置

`src/packs/emerald`只包含内容、纯政策和编排，使用`engine/extensions`公开作者能力。`src/game/emerald/assembly`构造具体引擎/表现服务，`application`按状态所有者协调用例，`commands`适配命令，`presentation`接线本作宿主生命周期。`src/ui/emerald`持有浏览器页面、DOM交互、视图与CSS。搬迁后不在旧pack位置保留转出口；改页面无需修改内容边界。依赖守卫见[architecture.test.js](../../tests/architecture.test.js)。

## 启动和引用

`npm run dev`直接提供src与generated的文件，根地址跳转至src/index.html并保留查询参数。页面base定位项目根，主入口为src/app.js；模块按真实目录相对导入生成的规则和资源模块。浏览器资源URL指向generated/assets或generated/plugins，CSS依自身位置引用对应目录；字体仍从src/assets读取。子路径部署需同时提供这两棵目录，以src/index.html为页面入口。

服务不复制、不转换、不创建输出目录；保存修改后下一次请求读取当前文件。它只开放两棵目录中的文件，保留既有/control协议，不开放仓库元数据或目录列表。没有自动浏览器刷新。

内容清单在src/content/manifest.json。共同的contentFileURL按generated:true读取generated/content，其余读取src/content，片段路径仍禁止上跳、绝对路径和重复记录。Node与浏览器使用相同加载合同，保留项目URL前缀。插件目录在src/plugins/catalog.json，生成的音频模块以显式相对路径引用generated/plugins。

## 工具和验证

`npm run check`和`npm run test:all`直接读取源码与生成数据，不执行构建。覆盖率统计src运行时模块，生成数据不作为手写逻辑覆盖率目标。删除dist不会影响启动、测试或导入；没有工具会自动生成它。

导入器为候选计算建立临时只读链接视图，避免大素材复制；视图只供工具读取，不作为游戏目录。候选通过完整内容校验及ownership检查后，写回各文件的唯一所有者。--check不修改输入；显式--target可输出独立测试/转换资料，不建立项目部署树。音频安装、UI导出和骑乘资源导出继续写generated并更新src的清单，不覆盖只读原作。

验收覆盖无dist的核心/插件测试、模块引用、内容及资源加载、HTTP直接读取与修改、路径边界、导入预演不写及幂等性。HTTP读取不是浏览器游玩或视觉/听音验收。原来的复制构建器与专用测试已删除。
