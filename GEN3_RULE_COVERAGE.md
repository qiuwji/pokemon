# 第三世代特性与持有道具规则覆盖

更新：2026-10-02。原始元数据与结算依据：pret/pokeemerald，固定修订 `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。包含 76 个正式使用的特性、66 种持有效果、70 个带持有效果的物品；另注册 174 个可携带的中性物品。NONE 与未使用的 CACOPHONY 不作为正式特性。

当前状态：战斗、野外、移动、育成领域与可玩界面已集成；P3/P5 工程范围已验收。当前仍是 9 张原作地图加插件观察室、58 种精灵的序章切片。目录规则覆盖与完整原作内容分别记录。

统一入口：`RulePipeline` + `AttachedRules`。战斗采用席位作用域；经验、遭遇、亲密度与蛋采用队伍/UID 作用域。持有道具参数从注册定义读取，新物品可以复用既有持有效果。

## 验证与行为边界

- `tests/gen3-rules.test.js`：原作数值顺序与整数取整、免疫、接触、即时树果、换人/逃跑、偷盗/吼叫/自爆/OHKO、重定向和种族专属物品。
- `tests/traits.test.js`：连击、压力、消耗一次、道具交换、反伤/吸取、阶段挂钩和错误回滚。
- `tests/field-traits.test.js`：遇敌、等级/性格/性别、携带概率、捡拾各等级段、经验池、复制与天气形态。
- `tests/growth-domain.test.js`：安抚之铃、永恒之石、交易道具、孵化加速、进化组合条件、蛋继承与育成账本。
- 浏览器通过持有道具装备、存档恢复、双打入场树果恢复与消费。

第三世代行为：结实只防一击必杀；避雷针重定向，不授予电免疫或特攻提升；粗糙皮肤为最大 HP 的 1/16；安抚之铃先对正向亲密度取整；物理/特殊由招式属性决定；双打对双方敌人招式在 +2 前减半，全场地震不减半。Emerald 的 IV 继承位置删除差异保留为明确的 `ivInheritance: "emerald"` 策略，可切换不同规则包。

Enigma Berry 默认保持原作未装入 e-Reader 数据时的中性携带行为；没有导入 e-Reader 的自定义数据。道具“可携带”不等于都可在背包主动使用，当前主动使用内容仍由 `ItemService` 的 contexts/effects 声明。复杂招式中仍有 14 项显式不可用，检查工具会列出，不能把它们计入已完成招式。天气形态可在事件视图中表达，当前切片未包含漂浮泡泡的美术。

## 特性逐项入口

| 标识 | 领域阶段/规则 |
|---|---|
| stench | encounter-rate |
| drizzle | entry |
| speed_boost | round-end |
| battle_armor | critical-check |
| sturdy | immunity |
| damp | move-check |
| limber | status-check、entry |
| sand_veil | accuracy、weather-immunity、encounter-rate |
| static | contact、encounter-select |
| volt_absorb | immunity |
| water_absorb | immunity |
| oblivious | attraction-check |
| cloud_nine | weather |
| compound_eyes | accuracy、wild-held-rarity |
| insomnia | status-check、entry |
| color_change | after-hit |
| immunity | status-check、entry |
| flash_fire | immunity、base-damage |
| shield_dust | secondary |
| own_tempo | confusion-check |
| suction_cups | switch-check |
| intimidate | entry、encounter-permission |
| shadow_tag | switch-check、escape-check |
| rough_skin | contact |
| wonder_guard | immunity |
| levitate | immunity |
| effect_spore | contact |
| synchronize | status-applied、creation-nature |
| clear_body | stage-check |
| natural_cure | leave |
| lightning_rod | target-selection |
| serene_grace | secondary-chance |
| swift_swim | speed-base |
| chlorophyll | speed-base |
| illuminate | encounter-rate |
| trace | entry |
| huge_power | attack |
| poison_point | contact |
| inner_focus | flinch-check |
| magma_armor | status-check、entry、hatch-rate |
| water_veil | status-check、entry |
| magnet_pull | switch-check、escape-check、encounter-select |
| soundproof | immunity |
| rain_dish | round-end |
| sand_stream | entry |
| pressure | pp-cost、encounter-level |
| thick_fat | attack |
| early_bird | action-permission |
| flame_body | contact、hatch-rate |
| run_away | escape-check |
| keen_eye | stage-check、encounter-permission |
| hyper_cutter | stage-check |
| pickup | after-battle |
| truant | action-permission |
| hustle | attack、accuracy、encounter-level |
| cute_charm | contact、creation-gender |
| plus | attack |
| minus | attack |
| forecast | types、form |
| sticky_hold | item-transfer-check |
| shed_skin | round-end |
| guts | burn-modifier、attack |
| marvel_scale | defense |
| liquid_ooze | drain-check |
| overgrow | power |
| blaze | power |
| torrent | power |
| swarm | power |
| rock_head | recoil-check |
| drought | entry |
| arena_trap | switch-check、escape-check、encounter-rate |
| vital_spirit | status-check、entry、encounter-level |
| white_smoke | stage-check、encounter-rate |
| pure_power | attack |
| shell_armor | critical-check |
| air_lock | weather |

## 持有效果逐项入口

| 持有效果 | 物品 | 领域阶段/规则 |
|---|---|---|
| restore_hp | berry_juice、oran_berry、sitrus_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_par | cheri_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_slp | chesto_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_psn | pecha_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_brn | rawst_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_frz | aspear_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_status | lum_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| restore_pp | leppa_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_confusion | persim_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| confuse_spicy | figy_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| confuse_dry | wiki_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| confuse_sweet | mago_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| confuse_bitter | aguav_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| confuse_sour | iapapa_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| attack_up | liechi_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| defense_up | ganlon_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| speed_up | salac_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| sp_attack_up | petaya_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| sp_defense_up | apicot_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| critical_up | lansat_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| random_stat_up | starf_berry | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| restore_stats | white_herb | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| cure_attract | mental_herb | entry、after-hit、after-action、status-applied、stage-applied、confusion-applied、attraction-applied、round-end |
| leftovers | leftovers | round-end |
| shell_bell | shell_bell | after-action |
| evasion_up | bright_powder、lax_incense | accuracy |
| macho_brace | macho_brace | speed、ev-modifier |
| quick_claw | quick_claw | action-order |
| choice_band | choice_band | move-availability、attack、move-start |
| focus_band | focus_band | damage |
| scope_lens | scope_lens | critical-stage |
| lucky_punch | lucky_punch | critical-stage |
| stick | stick | critical-stage |
| flinch | kings_rock | after-hit |
| bug_power | silver_powder | attack |
| steel_power | metal_coat | attack |
| ground_power | soft_sand | attack |
| rock_power | hard_stone | attack |
| grass_power | miracle_seed | attack |
| dark_power | black_glasses | attack |
| fighting_power | black_belt | attack |
| electric_power | magnet | attack |
| water_power | mystic_water、sea_incense | attack |
| flying_power | sharp_beak | attack |
| poison_power | poison_barb | attack |
| ice_power | never_melt_ice | attack |
| ghost_power | spell_tag | attack |
| psychic_power | twisted_spoon | attack |
| fire_power | charcoal | attack |
| dragon_power | dragon_fang | attack |
| normal_power | silk_scarf | attack |
| deep_sea_tooth | deep_sea_tooth | attack |
| deep_sea_scale | deep_sea_scale | defense |
| light_ball | light_ball | attack |
| metal_powder | metal_powder | defense |
| thick_club | thick_club | attack |
| soul_dew | soul_dew | attack、defense |
| can_always_run | smoke_ball | escape-check |
| lucky_egg | lucky_egg | experience-modifier |
| double_prize | amulet_coin | entry |
| friendship_up | soothe_bell | friendship-modifier |
| prevent_evolve | everstone | evolution-check |
| dragon_scale | dragon_scale | EvolutionService validates held-item conditions and consumes the item on a trade commit. |
| up_grade | up_grade | EvolutionService validates held-item conditions and consumes the item on a trade commit. |
| exp_share | exp_share | experienceDistribution divides shared experience before personal modifiers. |
| repel | cleanse_tag | encounter-rate |

## v0.9.0 跨领域验收

P5 已接入育成界面与演出，见 GROWTH_ARCHITECTURE.md：不变石、安抚之铃、孵化特性、香炉与交换持有物覆盖完成。当前内容切片、未导入招式和位级 RNG 差异均列明；框架与三世代目录覆盖不等同于全部地图/招式素材完成。
