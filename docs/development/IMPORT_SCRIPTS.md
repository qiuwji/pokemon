# 导入脚本索引

从需要的产物找脚本，而不是重跑所有导入。原C参考`work/pokeemerald/`和`sources/`只读，固定修订与获取信息见[项目位置](../../skills/emerald-project-handoff/references/project-map.md)。Python图像转换需要Pillow；内容候选检查需要Node。所有路径均从项目根描述。统一入口为`python3 tools/import.py COMMAND [SOURCE] [OPTIONS]`；`--list`按领域列出命令。实现位于tools/imports/commands/{region,dex,battle,items,actors,audio}，不保留旧的平铺脚本入口。表中的脚本名称为ownership的逻辑ID。

剧情规格的原文、入口、移动及 special/C 追踪另用[提取与回校验流程](STORY_EXTRACTION.md)。该工具不导入游戏内容，不能用一次文本抽取证明动画/分支还原。

## 分类、输入、输出和参数

下表“预演”是实际支持`--check`的脚本。内容读写机制及字段所有权见[内容管线](CONTENT_PIPELINE.md)和[机器可读声明](../../tools/imports/ownership.json)。生成文件和PNG会被替换，正式运行前先看预演、保留Git差异。

| 工作流 / 脚本 | 读取 → 写入 | 参数 / 前置依赖 | 预演 |
| --- | --- | --- | --- |
| 区域 `import-emerald.py` | maps/layouts、物种/招式/属性表、对象和精灵图 → 选定地图/物种/招式/actor字段及PNG | 可选source、--maps/--species/--profile；现有包。区域/中文名来自slice及locale | 是 |
| 区域 `import-grid.py` | tilesets/layouts/图块动画 → 网格边框、图集定义、PNG、跑步actor | 可选source、--maps/--profile；先地图导入，动画区间从配置读取 | 是 |
| 区域 `import-opening-art.py` | wallclock PNG/调色板/tilemap、src/wallclock.c偏移表、`field_door.c`门帧图组与`metatile_labels.h` → 男女时钟资源、生成的wall-clock.js、生成的door-anims.js、门metatile 900起及来源哈希 | source/--target/--strict；先grid；重新生成图集后重跑，重复运行不累加派生帧 | 是 |
| 区域 `import-encounters.py` | wild_encounters.json陆地表 → 地图陆地遭遇字段 | 可选source、--maps；所需物种先导入，校验槽位数，不再写进化 | 是 |
| 区域 `import-water-encounters.py` | 同上水上表 → 地图水上遭遇字段 | 可选source、--maps；所需水上物种先导入，校验槽位数 | 是 |
| 区域 `import-weather.py` | 所有地图header/坐标事件 → rules/gen3/map-weather.js | 可选source；原作地图header不能为空，不依赖可玩地图数量 | 是 |
| 区域 `import-map-cycling.py` | 所有地图header → rules/gen3/map-cycling.js | 可选source；原作地图header不能为空 | 是 |
| 图鉴 `import-species.py` | species_info/learnsets/PNG → 单个物种及PNG | 可选source与旧式条目，或--species/--profile；未导入招式保留unavailableLearnset并报告 | 是 |
| 图鉴 `import-species-metadata.py` | species_info/egg_moves/tmhm_learnsets → 物种成长/遗传/机器字段 | 可选source、--species；先有物种/招式。遗传和机器招式遗漏逐条报告 | 是 |
| 图鉴 `import-evolutions.py` | evolution.h → evolutions及露力丽后代政策 | 可选source、--species/--profile；缺目标/附加物种报告，局部导入保留其他家族 | 是 |
| 图鉴 `import-detail-sprites.py` | anim_front.png/normal.pal、icon.png/原作共享图标调色板 → detail/icon PNG、来源哈希、帧元数据 | 可选source、--species/--target；缺动画时只取front首帧，局部导入保留其他元数据；拒绝纯色/无透明背景帧 | 是 |
| 物品 `import-item-metadata.py` | items.h → rules/gen3/item-metadata.js | 可选source；至少解析到一个物品 | 是 |
| 物品 `import-held-items.py` | items.h → rules/gen3/held-catalog.js | 可选source；至少解析到一个持有物品 | 是 |
| 机器 `import-machine-learning.py` | tms_hms/tmhm_learnsets → rules/gen3/machine-learning.js | 可选source及`--config`；数量政策来自gen3.json，机器/学习表不能为空 | 是 |
| 战斗 `import-move-metadata.py` | battle_moves/battle_util → 已导入招式目标/接触/声音字段 | 可选source、--moves；先有招式表，候选招式须在此参考中存在；共用严格解析器 | 是 |
| 战斗 `import-rule-metadata.py` | battle_moves/pokedex_entries/battle_util → rules/gen3/reference-metadata.js | 可选source及`--config`；数量/Nature Power清单来自gen3.json，共用严格解析器 | 是 |
| 人物 `import-movement.py` | 原作交通/水面/鸟PNG → actor定义与PNG | 可选source、--actors/--profile；资源/帧定义来自配置，保留后续姿态字段 | 是 |
| 人物 `import-actor-animations.py` | object_event_anims及现有跑步/Acro PNG → 配置的Actor动画/帧数 | 可选source、--profile；先导入movement素材，姿态/序列映射来自配置 | 是 |
| 孵化 `import-egg-assets.py` | egg目录的四张PNG → egg-front/icon/hatch/shard.png | 可选source、--profile；只导入图像，不生成成长规则 | 是 |
| 音频 `import-audio.py` | direct_sound_samples WAV → audio资源及来源记录 | 可选source、--profile；不是整部原作BGM转换器，记录实际参考修订 | 是 |
| 剧情 `import-script-text.py` | 各地图scripts.inc的`.string` → 原作对白label参考JSON | 可选source、--maps、--out（相对路径落在--target内）；只读抽取，不写游戏内容，供逐字转写对照 | 否 |

新地图分两步导入：`emerald` 写入地图数据并标记 `pendingGrid`，`grid` 补图集与 border 后清除该标记。标记是显式的未完成态，不放宽 tileset/border 校验。指向 `MAP_DYNAMIC` 的 warp 在运行时才设定，导入器按遗漏报告并交给剧情接管。

表中21个入口都支持`--target /另一份/dist`；所有内容入口共用ImportSession，不是只跳过最后一次JSON写入。`import-script-text.py`只抽取原作文本供人工转写对照，不写内容清单，因此没有内容归属。资源写入也必须暂存后提交。独立生成器无需内容清单；内容读写器需要已有清单。可选source从脚本位置定位参考，不依赖当前工作目录。

## 推荐顺序

成品音乐另见[音频生产工具](../../tools/audio/README.md)：`tools/audio/render-bgm.py --config ... --renderer ... --output ... --check`预演单曲MIDI/voicegroup转换计划，去掉--check生成可安装包；`install.py --check`预演内容安装。此链不归上表21个采样/内容导入入口，不把完整BGM生产混进import-audio.py。参考只读，使用固定渲染器构建，资源保留原曲身份且loop按PCM帧计算；第一章6首地图曲（MUS_LITTLEROOT/ROUTE101/OLDALE/BIRCH_LAB/POKE_CENTER/POKE_MART）已按midi.cfg各自音量渲染并默认启用安装；战斗曲、剧情切曲与SE/汇编/fanfare政策仍待开发。

A：区域与野外资源

```text
import-emerald → import-grid → 所需物种 → import-encounters / import-water-encounters
                            → import-movement → import-actor-animations
```

B：图鉴、战斗与成长

```text
已有招式/参考表 → import-species → import-species-metadata → import-move-metadata
                                                     → import-evolutions → import-detail-sprites
```

箭头表示前置资料，非要求每次全部执行。`import-emerald`不再偷偷调用grid；只改遭遇时运行encounters即可。导入候选在写任何内容/图片前检查，出现未知物种、招式、地图或未分类脚本先补输入/声明，不能删检查。

## 破坏性与归属

- 正式运行会更新其声明的生成物；`--check`绝不写入。不要把生成物里的手工更改当作长期业务数据。
- 不同脚本共写物种或地图时按字段分工，不能用“最后执行者优先”解决冲突。具体范围以ownership.json为准，越界提交失败。
- 当业务需要变更写入范围，同次更新所有权、管线文档和保留/越权测试；不要直接让一个脚本写所有section。
- 六个原作规则数据生成器使用统一`@generated`头，含实际只读参考Git修订；业务处理器仍为手写，不可覆盖。默认区域/物种、人物/音频/蛋资源映射和图块动画区间来自slice配置，中文名在独立locale文件。导入器报告所选内容的缺失依赖；预演不证明原作完整内容已经导入。
- 旧`work/`一次性重构/调试脚本、临时QA存档和日志已清理；它们依赖旧content.json或历史结构。当前导入和控制入口均在tools，不能继续用字符串替换脚本改写核心源码。

## 参数与生成物示例

```sh
python3 /项目路径/tools/import.py weather --check
python3 /项目路径/tools/import.py audio /参考路径/pokeemerald --target /临时路径/dist --check
python3 /项目路径/tools/import.py machine-learning --config /配置路径/rules.json --check
```

`--config`默认读取[gen3.json](../../tools/imports/config/gen3.json)。可设置expectedTMCount、expectedHMCount、expectedMoveCount；null表示不限定数量，但空表仍失败。naturePowerMoves为完整参考招式生成器需要的ID列表。扩展参考规则时另建配置，不改解析器里的数字。

两个招式入口共用[battle_moves.py](../../tools/imports/battle_moves.py)，未知target、缺少数值字段或空表会在写前报错。原C DEPENDS归一为user-or-selected；基础pack的flags保留FLAG_标识，规则参考表用小写标识。插件招式不需要经过此原作导入器。原来的import-rule-metadata.mjs与import-growth.py已删除，用上表新名称，不保留兼容入口。

源文件读取失败、原作表缺失、配置数量不符或越权输出都会停止且不提交已暂存资源。预演只列出字节不同的文件；只报告头部/格式差异也可能出现，核对Git和数据语义后再提交。

`check:docs`核对本表、ownership和真实入口文件的一致性，重命名/增删脚本必须一起更新。它不验证表中的源码说明语义；解析/产物行为由针对性测试和临时导入对照证明。

## 选择、依赖与遗漏审计

默认配置见[slice.json](../../tools/imports/config/slice.json)，中文内容见[zh-CN.json](../../tools/imports/locales/zh-CN.json)。复制profile并指定locale相对路径即可扩展区域/物种/资源，无需修改脚本。参数选择优先于profile默认；元数据/遭遇/进化默认处理当前pack中的全部记录，不限于初始切片。详情帧读取目标包图片，不会偷偷读取正式dist图片。

```sh
python3 tools/import.py emerald --profile /路径/region.json --maps LittlerootTown --species mudkip --check
python3 tools/import.py species-metadata --species treecko --check
python3 tools/import.py evolutions --species mudkip --strict --check
python3 tools/import.py encounters --maps Route101 --strict --check
```

预演末尾JSON的omissions逐条包含kind、owner、reference、reason。learnset/eggMoves/machineMoves未导入招式、进化目标/附加物种缺失均可追踪；--strict在有遗漏时写前失败。选择不存在、源表缺失、遭遇权重长度不符、未知进化方法等始终失败，不受strict控制。选择无遭遇表的地图也会报告，严格批次应只选择需要导入该表的地图。

字段归属依旧以ownership为准；catalog的entry/category也由同一声明管理。`--list`与文档检查消费它，避免维护第三套脚本路径。不存在旧脚本路径兼容层。生成数据本身没有自动版本迁移。

## E2E场景的可携带生成

[验证表模块](../../tools/imports/e2e_terrain.py)、[图块选择](../../tools/imports/config/e2e-terrain.json)、[场景配方](../../tools/imports/config/e2e-scenes.json)与[统一生成器](../../tools/fixtures/generate.py)均受版本控制。原work/e2e-terrain.py及两个旧make脚本已被这些文件替代；不依赖被忽略目录，不再读取content.json或给正式地图添加测试入口。

```sh
python3 tools/fixtures/generate.py --check
python3 tools/fixtures/generate.py --scenes E2ETestField
```

只写generated/fixtures/world.json。terrain表记录水/冰/岩壁的视觉来源；泥坡、凸坡、横/竖轨道另以原图集行为属性和渲染截图确认。水动画区间与grid导入共读tile-animations.json，花动画不算水。自动检查只能证明索引/动画/行为合同；外观另做图片观察，不把生成成功当视觉还原。安装图像工具依赖用`python3 -m pip install -r tools/requirements.txt`。干净副本无work/的生成与第二次无差异预演由Python可携带性测试覆盖。

剧情工具入口为`tools/story/extract.py extract/verify/movement`；movement子命令连接`tools/story/movement.py`，先回校验固定来源再输出命令。参数及支持范围见[提取流程](STORY_EXTRACTION.md)，不写游戏数据。opening-art同时导出原作转场精灵球，固定透明色与调色板，纳入opening-art-source.json来源清单。门帧不再写死是哪几扇：脚本按`field_door.c`的图组和`metatile_labels.h`，只为本内容实际走到的门格追加派生metatile，`door-anims.js`是运行时唯一门表，未列入的门不播放；重新运行按图集尾部的自有门图块整体替换，不累加。
