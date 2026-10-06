# 橙华市与韦莉（小光）教学：实现与接手边界

本页记录本轮从 102 号道路到橙华市、以及小田卷博士之子小光（原作 WALLY）捉拉鲁拉丝教学的实现落点与仍待验收差异。参考固定为 pret/pokeemerald 修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`，`work/pokeemerald/` 只读。

## 原作入口与网页落点

| 原作入口 | 网页落点 |
| --- | --- |
| PetalburgCity_Gym_EventScript_Norman 的 VAR_PETALBURG_GYM_STATE<6 分支 | `story/regions/petalburg.js` 的 `petalburg.norman.first`（诺曼初见、借蛇纹熊、送出精灵球、送往 102 号道路） |
| PetalburgCity_OnFrame VAR_PETALBURG_CITY_STATE=2 的 WallyTutorial + StartWallyTutorialBattle | `petalburg.tutorial`（102 号道路草丛触发）与小光对话，`battle` 命令使用 `options.borrowedParty`/`options.capture:"cinematic"` |
| PetalburgCity_Gym_OnFrame VAR_PETALBURG_GYM_STATE=1 的 ReturnFromWallyTutorial | `petalburg.gym.return`（小光道谢离场、诺曼指点去卡那兹市） |
| Route102_Text_WatchMeCatchPokemon / WallyIDidIt / LetsGoBack | `emerald:dialogues.regions.petalburg.watch|caught|letsgo` |
| PetalburgCity 告示牌、Route102 指示牌 | `stories/signs.json` 的 `petalburgcity.*`、`route102.*` |
| PetalburgCity 水面男 / 绅士 / 小光妈妈、Route102 少年与小男孩 | `native-cast-data.js` 与 `regions.petalburg.*` 对白 |

## 本轮实现的行为

- **地图**：导入 `Route102`、`PetalburgCity`、`PetalburgCity_Gym`、`PetalburgCity_WallysHouse`、`PetalburgCity_House1`、`PetalburgCity_House2`、`PetalburgCity_Mart`、`PetalburgCity_PokemonCenter_1F`，含网格、图集与 `general-petalburg` 门帧扩展（新门 metatile 33、461；门帧扩到 941）。橙华市与 102 号道路之间为正常连接。
- **音乐**：按 `midi.cfg` 生成并安装 `MUS_PETALBURG`（`-G_petalburg -V080 -R50`）与 `MUS_GYM`（`-G_gym -V080 -R50`），登记进唯一音频包与 `ORIGINAL_SONG_CUES`。
- **通用战斗能力**：剧情 `battle` 命令支持 `options.borrowedParty`（临时替换玩家队伍并配借来的精灵球）、`options.capture:"cinematic"`（强制捕捉、精灵不入玩家账本、禁用会心一击）与 `options.autoActions`（玩家席位按固定顺序自动行动、隐藏战斗菜单）。引擎不按小光或拉鲁拉丝特判。
- **剧情**：诺曼道馆初见 → 走位/对白 → 置 `wallyTutorial` → 切到 102 号道路草丛；道馆对话后，玩家与**小光一起走出橙华市**（`move` 走位并跨越城镇连接进入 102 号道路），走到草丛，再由入图对白 + 借用蛇纹熊对野生拉鲁拉丝的教学战（**按原作 `battle_controller_wally.c` 全自动**：攻击、攻击、投球，玩家只观看）；战后 `battleResult` 置 `wallyCaught` 并回到道馆；道馆入图置 `wallyDone`，诺曼指点去卡那兹市。三枚旗标均可存读档恢复。
- **102 号道路视线训练家**：Calvin/Rick/Tiana/Allen 按原作 `trainer_type`+`sight`（3/2/3/3）配置；进入视线时按 `trainer_see.c` 感叹→走近→**双方互相转身面向**→台词→战斗；胜利后由 `petalburg.trainer.result` 播放各自败北台词并只发一次奖金（`trainer.<id>.prize`），已胜出者不再主动拦截，靠近交互则播放败北台词。为此新增蛇纹熊系外的蘑蘑菇物种导入（Tiana 队伍使用）。
- **橙华市室内 NPC**：宝可梦中心（护士/男子/胖子/短裤小子/女子）、友好商店（店员/男子/少年/女子）、民宅 1F/2F、小光家（父/母）均按来源绑定登记为内容 NPC，使用通用 `talk` 入口播放各自对白。

## 与原作的已知差异（未验收项）

- 走位用引擎脚本移动：城内走通路线后**在城镇边缘用普通连接跨步无缝进入 102 号道路**（无场景转场）。城镇侧小光（`wallyInTown`）与道路侧小光是两个互斥投影，跨界时隐藏城镇小光，因此任何时刻只有一个小光。
- 道馆内诺曼初见时小光从门口走入、走到诺曼身边并参与对白；道馆多方向的 `NormanAddressPlayer*`/`NormanFaceDoor*` 分支未逐格转写，对话顺序一致、逐格走位从简。
- 道馆房间机关门与雕像目前是占位告示文本，道馆挑战（含馆主战、房间训练家）尚未实现。
- 走完教学后"带玩家去小光家"（`VAR_PETALBURG_CITY_STATE=4`，原作在击败诺曼之后）不在本切片；`PetalburgCity_WallysHouse` 地图已导入但其内部事件（HM03/对白）未转写。
- 102 号道路的道具（伤药、树果）与隐藏道具、道馆内训练家、Scott 与道馆向导事件尚未转写。
- 隐藏道具背景事件被导入清单显式省略（见 `src/content/references.json` 与导入 omissions）。
- 音乐为离线渲染成品，**听感未由人工验收**；教学战斗的逐帧节奏与画面同样待用户实机确认。

## 验证

- `tests/petalburg-tutorial.test.js`：诺曼交接与旗标存读档；教学战自动跑完（借用蛇纹熊、属性/招式/数量断言）、真实队伍不变、演出捕捉不入玩家账本、回到道馆；返乡后诺曼后续对白；视线训练家与橙华市乔伊治疗。
- `examples/dev-scenarios.test.js`：开发者页/传送/招式演示，以及测试员菜单的 `emerald:progress` 章节跳转。
- `tests/door-animation.test.js`、`tests/chapter-one-music.test.js`、`tests/content-manifest.test.js`、`tests/story-content.test.js` 同步更新并全绿。
