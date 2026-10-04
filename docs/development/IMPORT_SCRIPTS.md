# 导入脚本索引

从需要的产物找脚本，而不是重跑所有导入。原C参考`work/pokeemerald/`和`sources/`只读，固定修订与获取信息见[项目位置](../../skills/emerald-project-handoff/references/project-map.md)。Python图像转换需要Pillow；内容候选检查需要Node。所有路径均从项目根描述。

## 分类、输入、输出和参数

下表“预演”是实际支持`--check`的脚本。内容读写机制及字段所有权见[内容管线](CONTENT_PIPELINE.md)和[机器可读声明](../../tools/imports/ownership.json)。生成文件和PNG会被替换，正式运行前先看预演、保留Git差异。

| 工作流 / 脚本 | 读取 → 写入 | 参数 / 前置依赖 | 预演 |
| --- | --- | --- | --- |
| 区域 `import-emerald.py` | maps/layouts、物种/招式/属性表、对象和精灵图 → 选定地图/物种/招式/actor字段及PNG | source；现有内容包。选区/中文表仍为脚本内默认清单，参数化待后续 | 是 |
| 区域 `import-grid.py` | tilesets/layouts/图块动画 → 网格边框、图集定义、PNG、跑步actor | source；地图及原作header必须存在，先地图导入 | 是 |
| 区域 `import-encounters.py` | wild_encounters.json陆地表 → 地图陆地遭遇字段 | source；所需物种先导入。不再写进化 | 是 |
| 区域 `import-water-encounters.py` | 同上水上表 → 地图水上遭遇字段 | source；所需水上物种先导入 | 是 |
| 区域 `import-weather.py` | 所有地图header/坐标事件 → rules/gen3/map-weather.js | 可选source；原作地图header不能为空，不依赖可玩地图数量 | 是 |
| 区域 `import-map-cycling.py` | 所有地图header → rules/gen3/map-cycling.js | 可选source；原作地图header不能为空 | 是 |
| 图鉴 `import-species.py` | species_info/learnsets/PNG → 单个物种及PNG | source及一个或多个`species-id:中文名:图鉴号`；需要招式表。未导入招式保留unavailableLearnset | 是 |
| 图鉴 `import-species-metadata.py` | species_info/egg_moves/tmhm_learnsets → 物种成长/遗传/机器字段 | 可选source，默认仓库参考；物种和当前招式已就位。完整遗传遗漏审计待后续 | 是 |
| 图鉴 `import-evolutions.py` | evolution.h → evolutions及露力丽后代政策 | source；相关物种先导入。只保留已导入目标，完整遗漏报告待后续 | 是 |
| 图鉴 `import-detail-sprites.py` | 已导入精灵前PNG → pack/detail-sprite-frames.js | 无source；先导入精灵图，支持`--target` | 是 |
| 物品 `import-item-metadata.py` | items.h → rules/gen3/item-metadata.js | 可选source；至少解析到一个物品 | 是 |
| 物品 `import-held-items.py` | items.h → rules/gen3/held-catalog.js | 可选source；至少解析到一个持有物品 | 是 |
| 机器 `import-machine-learning.py` | tms_hms/tmhm_learnsets → rules/gen3/machine-learning.js | 可选source及`--config`；数量政策来自gen3.json，机器/学习表不能为空 | 是 |
| 战斗 `import-move-metadata.py` | battle_moves/battle_util → 已导入招式目标/接触/声音字段 | source；先有招式表，候选招式须在此参考中存在；共用严格解析器 | 是 |
| 战斗 `import-rule-metadata.py` | battle_moves/pokedex_entries/battle_util → rules/gen3/reference-metadata.js | 可选source及`--config`；数量/Nature Power清单来自gen3.json，共用严格解析器 | 是 |
| 人物 `import-movement.py` | 原作交通/水面/鸟PNG → actor定义与PNG | source；现有pack。保留后续姿态字段 | 是 |
| 人物 `import-actor-animations.py` | object_event_anims及现有Acro PNG → Acro动画/帧数 | source；先导入movement素材 | 是 |
| 孵化 `import-egg-assets.py` | egg目录的四张PNG → egg-front/icon/hatch/shard.png | 可选source；只导入图像，不生成成长规则 | 是 |
| 音频 `import-audio.py` | direct_sound_samples WAV → audio资源及来源记录 | 可选source；不是整部原作BGM转换器，记录实际参考修订 | 是 |

表中19个入口都支持`--target /另一份/dist`；所有入口共用ImportSession，不是只跳过最后一次JSON写入。资源写入也必须暂存后提交。独立生成器无需内容清单；内容读写器需要已有清单。可选source从脚本位置定位参考，不依赖当前工作目录。

## 推荐顺序

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
- 六个原作规则数据生成器使用统一`@generated`头，含实际只读参考Git修订；业务处理器仍为手写，不可覆盖。其他地图/物种清单、本地化、动画区间共源与遗漏审计尚待治理，预演通过不能冒充全部12项工具需求完成。
- `work/*.py`历史一次性脚本不是受支持导入入口，仍可能依赖已删除的旧content.json；本轮不执行它们。复现或归档作为后续工具治理任务，不能继续字符串替换核心源码。

## 参数与生成物示例

```sh
python3 /项目路径/tools/import-weather.py --check
python3 /项目路径/tools/import-audio.py /参考路径/pokeemerald --target /临时路径/dist --check
python3 /项目路径/tools/import-machine-learning.py --config /配置路径/rules.json --check
```

`--config`默认读取[gen3.json](../../tools/imports/config/gen3.json)。可设置expectedTMCount、expectedHMCount、expectedMoveCount；null表示不限定数量，但空表仍失败。naturePowerMoves为完整参考招式生成器需要的ID列表。扩展参考规则时另建配置，不改解析器里的数字。

两个招式入口共用[battle_moves.py](../../tools/imports/battle_moves.py)，未知target、缺少数值字段或空表会在写前报错。原C DEPENDS归一为user-or-selected；基础pack的flags保留FLAG_标识，规则参考表用小写标识。插件招式不需要经过此原作导入器。原来的import-rule-metadata.mjs与import-growth.py已删除，用上表新名称，不保留兼容入口。

源文件读取失败、原作表缺失、配置数量不符或越权输出都会停止且不提交已暂存资源。预演只列出字节不同的文件；只报告头部/格式差异也可能出现，核对Git和数据语义后再提交。

`check:docs`核对本表、ownership和真实入口文件的一致性，重命名/增删脚本必须一起更新。它不验证表中的源码说明语义；解析/产物行为由针对性测试和临时导入对照证明。
