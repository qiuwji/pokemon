# 内容文件、清单与导入边界

本页描述当前可执行合同。原作完整地图/台词仍在业务开发范围，缺少业务不能靠关闭引用检查隐藏。

## 从哪里修改

```text
dist/content/
  manifest.json                    唯一装配清单；版本1
  maps/<地图>/map.json              名称、尺寸、图集、连接、warp、原作对象与遭遇
  maps/<地图>/grid.json             生成的blocks/behavior/border；平面数组
  tilesets/<图集>.json              生成的metatile、查找表、动画、实际atlas尺寸
  species/<物种>.json               单个物种定义
  actors.json / moves.json          Actor素材描述与切片招式表
  evolutions.json / type-chart.json  进化定义与属性表
  references.json                  未实现地图/脚本与明确空脚本的分类
  stories/*.json                   手写剧情包/对白/绑定；可选stories分类
```

没有旧content.json回退，也不生成另一份可写聚合JSON。运行时仍得到原来的db对象形状，所以战斗/世界/剧情领域不需要了解文件组织。新增的references仅用于源资料完整性审计，不是可执行剧情注册器。

地图的密集数组与属性分离，格子顺序仍是`y * width + x`。`generated:true`表示导入生成的数据片段；不表示可以随意删除。`gridSize:16`是metatile像素尺寸，不是图集行数；图集的实际PNG尺寸、columns与tileCount由检查工具核对。

## 清单与加载合同

清单每项含`section/path`，可选`key/generated`。路径相对manifest，仅允许本地JSON相对路径；禁止上跳、绝对路径、重复文件、未知字段和原型键。原八个section必须全部声明；stories为可选第九分类，key是包记录键（包内id另有命名空间）。`key`指定单条记录，没有key则文件是一张完整表。

同一地图的两个片段这样登记：

```json
{"section":"maps","key":"NewArea","path":"maps/NewArea/map.json"}
{"section":"maps","key":"NewArea","path":"maps/NewArea/grid.json","generated":true}
```

同一目标字段只能出现一次，后加载文件不能覆盖前一个片段。文件缺失、坏JSON、重复字段和不合法引用会中止加载，并报告文件URL或内容路径。浏览器采用并行完整加载，尚未实现按区域懒加载；本次改造解决组织和正确性，不声称已解决全作资源流送。

- 浏览器：[content-loader.js](../../dist/adapters/content-loader.js)，通过manifest URL解析全部资源，保留部署子路径。
- Node工具和测试：[content-io.mjs](../../tools/content-io.mjs)的`loadContentSync()`，每次读取独立数据。
- 共同纯合同：[content-manifest.js](../../dist/engine/content-manifest.js)和[引用校验](../../dist/engine/content-references.js)。

```js
import { loadContentSync } from "../../tools/content-io.mjs";
const db = loadContentSync(); // 示例位置：tests/helpers/；其他位置调整相对路径
```

## 引用、未实现项与原作对象

清单装配检查warp位置/高度/目的地/目的索引及入口唯一性、connection方向/偏移/目的地、场景对象位置与显式actor引用。原作缺失区域和尚未转写的script必须在references中给出原因；拼错或未分类引用会报错。`ignoredScripts`表示有依据的无脚本对象，例如原作`0x0`，不能用于掩盖普通NPC的未实现剧情。

待实现清单是明确的内容债，并不是实现证明。它不会让缺失区域可进入，也不会执行C脚本。当前pack的对象/剧情逻辑与原作npcs资料尚未统一；新增可运行对象继续使用公开`mapExtensions.elements`和剧情注册，不能只写一个原作script字符串就宣称NPC完成。

`npm run check`检查内容、实际图集、严格公开类型和所有运行时模块；同一check链也检查文档。导入前置校验复用pack语义和引用检查。

## 导入如何保护数据

所有受支持导入脚本统一使用[ImportSession](../../tools/imports/context.py)。写入范围由[ownership.json](../../tools/imports/ownership.json)声明，不由脚本名或“我知道不会影响”决定。原作目录只读，输出归dist；`--target`可指向另一份输出目录。内容脚本需要现有清单，独立规则/资源生成器可写空的临时目标。

```sh
python3 tools/import.py encounters /绝对路径/pokeemerald --check
python3 tools/import.py encounters /绝对路径/pokeemerald
```

1. 加载清单，计算完整候选数据与资源，不立即写文件。
2. 检查变更字段是否属于当前脚本，再校验完整候选内容。
3. `--check`报告将改变的文件和内容字段，不创建或改写输出。
4. 按解析后的JSON值判断内容是否变化；未变片段与清单保留原始字节（缩进、换行和键序），不重新格式化无关作者文件。只编码并替换真正变化的片段；新增记录同时登记清单。
5. 替换前暂存全部输出；普通写入异常恢复旧字节并清理暂存文件。

每个文件替换是原子的；多文件之间的机器断电/进程强杀不属于数据库级原子事务。先预演、用Git检查变更并提交，不把本地导入器当持久事务数据库。

地图导入保留既有遭遇/图集字段与未选地图，物种导入保留其他阶段的元数据，遭遇导入不得触碰进化。不得恢复整体覆盖content.json的旧实现，也不得以吞异常或删校验绕过候选数据检查。

## 测试夹具与插件

五张E2E地图在[独立夹具](../../dist/fixtures/world.json)，不在正式清单中。默认插件清单不启用测试支持；只有明确`?e2e=1`的测试环境才加载夹具并通过公开内容注册形成命名空间地图，不给正式未白镇插入测试入口。

插件装配来自[catalog.json](../../dist/plugins/catalog.json)，新增受信任本地插件无需修改app.js。配置项指定模块、导出名、默认启用、开关与工厂输入；`?plugins=id1,id2`追加启用，`?disable-plugins=id`关闭。`requires`用于装配依赖检查和排序；实际插件manifest依赖仍由PluginHost校验。加载失败明确报错，没有热卸载、远程沙箱或旧档迁移。

游戏外顶部「插件」面板保存下次启动的开关，点击「保存并重启」才重建宿主；当前游戏不热切换。优先级：URL disable > URL enable/单独flag=1 > 本地开关 > catalog默认。重启按钮去掉一次性插件URL开关，保留control/e2e等环境参数。设置键为 `emerald.plugin-selection.v1`，与玩家存档分开；禁用带存档依赖的插件仍走缺依赖保护，不把它当坏档覆盖。

catalog可配置 `name/description` 用于面板，以及 `startup:["owner:action"]`。启动动作必须属于该插件命名空间，通过既有命令总线在游戏装配后执行；setup仍只注册。动作应幂等、走领域意图；失败显示原因而不停止其他插件的初始化。开关/优先级/启动/面板合同见 [plugin-settings.test.js](../../tests/plugin-settings.test.js)。

## 验证与维护

[content-manifest.test.js](../../tests/content-manifest.test.js)验证浏览器/Node一致、部署前缀、缺文件/坏JSON、重复字段、引用与PNG尺寸；[Python写入测试](../../tools/tests/test_content_store.py)验证不写预演、所属范围、无关文件保留和提交故障回滚。[独立输出与共享解析测试](../../tools/tests/test_import_outputs.py)验证二进制预演、输出归属、空表拒绝、配置失败不落盘及原作解析。[插件加载测试](../../tests/plugin-loader.test.js)使用真实模块及目录验证默认隔离、显式测试环境和依赖排序。

接口改变时同次更新本页、导入索引、相关Skill和测试。当前数字/执行结果只以[STATUS](../project/STATUS.md)及[VALIDATION](../project/VALIDATION.md)为准。

## 剧情内容所有权

stories由内容作者维护，现有十九个导入器不拥有它；统一Python/Node/浏览器装配保留这一分类。新增片段必须登记manifest，目录/局部引用校验由StoryCatalog完成，check-content同时检查原生目录。NPC来源script的pending清单独立说明原作还原债，不因为新增项目对白自动删除。写法、结果和稳定节点见[剧情合同](../engine/story/STORY_LANGUAGE.md)。
