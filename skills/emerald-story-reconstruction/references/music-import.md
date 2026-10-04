# 从原作资料导入绿宝石音乐

这是原作复刻Skill的音频分流指南。接手者需要能读取源码、运行转换工具、修改内容并在浏览器听音。先读[范围](../../../docs/project/SCOPE.md)、[进度](../../../docs/project/STATUS.md)和[音频合同](../../../docs/engine/presentation/AUDIO.md)。本页保存流程和质量约束；曲目完成清单、转换工具选择和实际验收结果归项目文档与资源来源记录。

## 最终交付目标：在游戏里听到正确的原作音乐

当任务要求完成原作音乐时，须持续推进**BGM/SE转换工具 → 实际资源 → 内容注册 → 选曲与恢复业务 → 游戏内实际播放验收**。现有工具或接口不足属于待补开发任务，不能只登记缺口便把音乐任务报完成；确实受外部条件阻塞时，记录具体原因、已完成阶段及可执行下一步。

交付应包含可重跑的转换命令/配置、来源及循环元数据、注册与业务绑定、受影响测试和真实游戏听音记录。新克隆应能依照记录获取依赖并运行，不依赖作者本机隐藏文件。可以按切片推进，但须区分“当前曲目/场景已完成”和“全作音乐已完成”。

## 选曲与恢复业务的落点

为地图、移动模式、战斗、胜负、剧情特殊曲和获得道具短曲建立来源映射：记录触发条件、优先级、结束条件、恢复目标，以及恢复时从头还是续播。恢复目标可能随地图/状态变化，不能固定回到旧地图曲目；具体行为以原作调用和驱动为依据。

默认原作业务放绿宝石内容包的选曲政策与窄应用服务，插件通过公开注册/请求接口扩展；播放器只负责音频生命周期。若当前API不能表达短曲完成、BGM恢复或剧情等待，补所属音频/表现合同及公开扩展点，再完成业务接线。不得将歌曲/地图ID分支塞进通用播放器，不让插件访问音频节点或直接写核心状态。

短曲完成应依托明确的播放/完成协议，区分正常结束、静音、后台暂停、加载失败和取消。根据原作确认是否等待音频完成；声音不可用时仍要让剧情按定义结束或报可恢复错误，不能留下永久等待。用户静音属于正常设置，不能为了验收强制绕过它。

## 游戏内完成判据

| 场景 | 验收结果 |
| --- | --- |
| 启动并进入地图 | 玩家开启声音后实际听到该地图对应原作曲目；从正常内容入口触发，不在控制台单独play代替业务绑定 |
| 引子与循环 | 引子只播一次，至少两次循环无重复引子、错拍或明显接缝，音色/节奏有固定参考依据 |
| 地图/移动模式变化 | 对应选曲或保留规则正确，相同曲目不无故重启；恢复按来源定义 |
| 遇敌→战斗→结束 | 正确战斗及结果曲目，退出后回到当前世界应有的音乐；失败/取消也不遗留战斗曲或播放锁 |
| 剧情切曲与fanfare | 正常剧情触发短曲/特殊曲，结束后正确恢复，剧情等待及解锁均完成 |
| 静音/后台及播放失败 | 开关声音、后台恢复遵循播放器合同；文件失败有明确报告，移动/战斗/剧情仍可继续 |

按本次切片覆盖上述受影响场景；未实现的世界内容明确记待验，不假造流程。全作音乐交付还要逐场景清单确认选曲/恢复覆盖。记录实际启动方式、地图/操作路径、曲目ID、参考依据、浏览器、听音结果和未验项；条件允许时保存录音。JSON观察、截图、文件生成和自动测试均不能单独证明声音已经正确播放。无法进行听音验收时标记“已实现，游戏内音频未验收”，不得标成验证完成。

## 核心名词

- **序列**：音符、节奏、音量、声像、控制及循环指令；MIDI或AGB汇编不是浏览器可播放的成品音频。
- **voicegroup**：原作音色表，引用采样、键位分区、鼓组与方波等硬件音色；不能替换成通用MIDI乐器并声称原作还原。
- **采样 / 整曲**：单个乐器或叫声WAV与完整混音不同，复制采样不会产生BGM或原作SE序列。
- **引子 / 循环段**：可能先播放一次引子，再重复指定区间；循环点由序列和实际渲染帧推导，不凭听感猜数。
- **fanfare**：获得道具等短乐句，须追踪暂停、恢复BGM和剧情等待，不默认等同普通背景音乐切换。

## 已有工具和缺口

`tools/import.py audio`复制profile所选WAV采样；`tools/audio/render-bgm.py`使用固定poryaaaa渲染器，将原作MIDI、voicegroup和采样生成可安装的循环BGM包。两条工具链职责不同，不能拿采样复制代替整曲转换。现有成品链支持带循环标记的MIDI BGM，不解释全部AGB汇编/SE，也没有完成全作选曲与恢复。

在项目根执行：

```sh
python3 tools/import.py audio --help
python3 tools/import.py audio work/pokeemerald --profile tools/imports/config/slice.json --check
# 审阅预演后去掉 --check，执行相同选择。
```

profile的audio是“输出文件名 → sound/direct_sound_samples下源文件”映射。输出归dist/assets/audio；现有provenance.json描述采样，不能冒充BGM清单。入口见[采样导入器](../../../tools/imports/commands/audio/import-audio.py)，写入归属见[ownership.json](../../../tools/imports/ownership.json)。文件移动后搜索`Copy selected real WAV samples`、`session.profile['audio']`。

当前UI/战斗提示音仍是临时真实采样映射，初始精灵叫声使用相应采样；完整SE序列和叫声处理需另补。原作BGM优先复用下面已执行的单曲生产链；不要新建第二套转换器或虚构import-bgm命令。当前曲目与听音进度读STATUS及包内manifest。

## 已执行的单曲生产链与命名

本项目选用[poryaaaa](https://github.com/huderlem/poryaaaa)，固定修订`4000591de6c397b6c80adc07af17144e26b30dfd`，只编译命令行poryaaaa_render。它读取原作voicegroup/采样并模拟m4a音频；产物尚未证明硬件逐位一致。完整获取/编译命令见[音频工具说明](../../../tools/audio/README.md)，在只读参考之外构建，不要求全局安装或GUI子模块。传入显式--renderer路径，不依赖上一模型留下的/tmp可执行文件。

未白镇配置见[littleroot.json](../../../tools/audio/littleroot.json)：音量100、混响50来自midi.cfg，5声部和13379Hz混音来自m4aSoundInit；44100Hz输出与cueVolume是项目配置。新增曲目复制配置，按其实际来源修改song/title/midi/voicegroup及参数，不在生成器里硬编码地图或乐器分支。只有确实使用-X的原曲才考虑对应扩展时钟能力，不能默认改全部曲目；当前生成器没有这项配置，需明确补接口后再用。

在项目根按以下流程生产到一个尚不存在的目录：

```sh
python3 tools/audio/render-bgm.py --config tools/audio/littleroot.json --output /tmp/littleroot-review --check
python3 tools/audio/render-bgm.py --config tools/audio/littleroot.json --renderer /tmp/poryaaaa_render --output /tmp/littleroot-review
python3 /tmp/littleroot-review/install.py --project /实际项目根 --check
python3 /tmp/littleroot-review/install.py --project /实际项目根
```

`/实际项目根`须替换为project-map确认的路径；只有--check预演不写。新配置首次运行须对照来源、检查渲染stderr和资源，再安装。已存在的包不自动覆盖，避免抹掉已接受资源及验收记录。

**命名规则**：保留原作常量身份，例如MUS_LITTLEROOT对应文件`mus_littleroot.wav`、本地cue ID `mus_littleroot`；注册后为`<pack-id>:mus_littleroot`，部署路径`assets/audio/<pack-id>/mus_littleroot.wav`。title单独保存中文名。不要用bgm.wav、music1.wav或场景截图编号命名；若后续增加编码/版本，来源身份、区别及映射须明确记录，不能悄悄覆盖同名已验收资源。将来SE工具同样保留其原作SE常量身份。

包内有具名WAV、plugin.js、manifest.json、install.py、preview.html和README。安装器仅复制包资源、登记默认关闭的插件，并按当前内容清单中相同原曲常量绑定地图；**现有mapExtensions不支持修改music**，不要发明该字段或直接修改冻结db。安装是明确的内容写入，播放器和核心规则不变。根目录现成包以README命令安装，游戏用`?plugins=emerald-first-bgm`启用未白镇试听并点击♪；地图重新导入恢复原曲常量后再安装绑定。

生成器目前预渲染三遍，部署保留引子与两遍曲身，游戏用`loop:true`重复第二遍。MIDI的[ / ]标记配合tempo推导整数PCM帧，再除采样率得到loopStart/loopEnd；不手写近似秒数、不给循环资源加渐隐。持续循环由AudioBufferSourceNode的音频时钟处理，不用setTimeout重播、JS轮询跳转或ended后从头播放。普通试听播放器播到文件末尾停止，不代表游戏没有循环。

未白镇源标记约0.833秒与54.167秒；当前部署循环第二遍约54.167→107.500秒，循环长度约53.333秒。以上近似值仅用于阅读，必须以manifest的帧数为实际播放配置；不能作为其他曲目的默认循环点。

## 从固定参考追踪曲目

参考修订为`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。work/pokeemerald与sources只读，不能在其中编译或生成汇编/音频。需要原构建工具时，将必要输入/工具复制到参考目录之外的临时工作区。最终生成器、参数、产物及来源记录纳入版本控制，不能依赖被忽略的work脚本。

| 要确认什么 | 参考入口 / 搜索词 |
| --- | --- |
| 地图音乐与特殊覆盖 | data/maps/地图/map.json的music；src/overworld.c的Overworld_PlaySpecialMapMusic及剧情调用 |
| 数字ID与序列身份 | include/constants/songs.h、sound/song_table.inc；MUS_LITTLEROOT / mus_littleroot |
| MIDI构建参数 | sound/songs/midi/midi.cfg、根Makefile及tools/mid2agb；文件名、-G、-V、-R |
| 乐器与采样依赖 | sound/voice_groups.inc、sound/voicegroups及keysplits/drumsets；追DirectSoundWaveData到实际采样 |
| 序列和硬件音色行为 | sound/programmable_wave_data.inc、src/m4a.c、src/m4a_1.s及关联表/宏 |
| BGM/SE/短乐句时机 | src/sound.c的PlayNewMapMusic、PlayBGM、PlaySE、PlayFanfare及调用者；脚本继续追src/scrcmd.c |

真实切片：LittlerootTown引用MUS_LITTLEROOT，songs.h定义为405，song_table引用mus_littleroot。midi.cfg对mus_littleroot.mid指定`-E -R50 -G_littleroot -V100`。对应voicegroup含鼓组/键位分区、DirectSound和方波音色；仅用默认MIDI音色渲染会丢失原作配置。

```sh
git -C work/pokeemerald rev-parse HEAD
rg -n 'MUS_LITTLEROOT|mus_littleroot' work/pokeemerald/data/maps/LittlerootTown work/pokeemerald/include/constants/songs.h work/pokeemerald/sound/song_table.inc work/pokeemerald/sound/songs/midi/midi.cfg
rg -n 'voice_keysplit|voice_directsound|voice_square' work/pokeemerald/sound/voicegroups/littleroot.inc
rg -n 'PlayNewMapMusic|PlayFanfare|PlayBGM|PlaySE' work/pokeemerald/src/sound.c work/pokeemerald/src/overworld.c
```

按实际song_table和构建依赖区分MIDI生成与直接维护的汇编，不假设每个SE/BGM都有同名.mid。mid2agb输出AGB汇编，wav2agb输出GBA采样数据，二者都不是整曲转WAV工具。GBA的m4a驱动名与浏览器接受的.m4a音频容器也不是一回事。

## 成品音频导入工作流

先选一首有引子/循环的地图BGM和一条有限长度SE或fanfare验证，再扩大批量清单。离线渲染器应支持原作序列指令、采样/voicegroup、硬件声部、速度、音量、声像、混响与循环。缺支持必须报告，不静默换音色。根据原作资料离线生成波形属于资源生产，游戏运行时仍播放成品文件，不加入临时振荡器旋律回退。

1. **声明输入**：配置曲目符号、来源路径、依赖、类型、转换参数和输出相对路径；不在解析器里硬编码曲目白名单或中文长常量。unused/test曲目保留身份，不默认加入正常游戏。
2. **推导循环**：由序列控制流和速度变化得到引子及循环时刻，转换为实际PCM帧。跨循环延音/混响需验证重复段与边界状态，不直接裁剪第一遍造成截音或接缝。
3. **离线渲染**：在隔离工作区输出无损WAV主文件，再选择部署编码。核对压缩后实际解码时长和循环点；不假设编码前后完全一致，未验证压缩边界时优先使用已验证WAV。
4. **来源记录**：每曲保存符号、固定修订、全部输入及哈希、转换器版本/配置、采样率、帧数、循环起止帧、部署文件哈希和验证状态。cue秒数由对应资源的帧与采样率计算；一次性短曲不伪设无限循环。
5. **原子导入**：接统一工具入口、所有权、--check、选择参数、遗漏报告与严格失败；全部预检再提交。缺采样、未知音色/指令、错误循环要写前失败，不生成静音占位骗过引用检查。不覆盖其他作者文件或现有采样provenance。
6. **注册绑定**：成品放dist/assets/audio并带来源记录，生成cue模块标记@generated。默认包在现有audio-library装配，独立音乐包走插件audio注册。地图music/battleMusic引用真正的cue ID；播放器不认识地图名，不在AudioAdapter硬编码曲目规则。
7. **还原选曲**：分别追地图、冲浪/骑车、遇敌、训练家、胜利、获得道具和特殊剧情的调用及恢复。当前emeraldMusic只读map.music/map.battleMusic，不完整覆盖这些语境；短曲恢复/等待等合同不足时补窄接口并验证，不用定时器猜领域结束。

转换器应输出机器可读清单，预演报告新增/改变/遗漏。具体渲染工具、依赖安装及命令在选定并执行验证后写进[导入索引](../../../docs/development/IMPORT_SCRIPTS.md)，不能让接手模型照抄不存在的命令。产物不依赖本机绝对路径。

## 接入现有播放合同

插件setup中`api.presentation.audio(localId, cue)`返回owner命名空间ID，注册不会自动播放。source为assets下相对路径，支持wav/ogg/mp3/m4a；music类型和loop显式声明，loopStart/loopEnd成对、单位秒。以下track代表转换器的**已验证元数据，不是当前已有文件或原作循环常量**：

```js
// 音乐插件setup内；track来自完成转换并验证的产物元数据。
const music = api.presentation.audio("littleroot", {
  kind: "music", source: track.asset, volume: 0.6, loop: true,
  loopStart: track.loopStartFrame / track.sampleRate,
  loopEnd: track.loopEndFrame / track.sampleRate,
  fadeInMs: 0, fadeOutMs: 0,
});
// 新增地图在music字段引用music；给已有地图配曲先核对扩展合同，
// 不直接修改只读db/map对象。
```

上例音量/淡变值不是原作测量结果。切换是立即、淡变还是短曲恢复须查来源，不给所有曲目默认加交叉淡化。默认包使用既有cue装配；接口见[AUDIO](../../../docs/engine/presentation/AUDIO.md)。实现改名时搜索validateAudioCue、AudioAdapter、emeraldMusic。

## 验证与排错

工具测试覆盖已知曲目、依赖缺失、未知指令、错误循环、预演不写、同输入重导不改和失败不覆盖。报告选中/成功/遗漏，不只断言文件存在。资源检查确认引用、哈希、真实解码、声道/采样率/时长及循环与元数据一致。

运行时复用音频合同测试，只补受影响选择/恢复。浏览器打开声音，听引子→至少两次循环→切图/战斗→返回，检查后台/静音恢复；SE/短曲查结束及BGM恢复。对照固定参考比较旋律、音色、节奏、音量关系与接缝。自动测试不证明听感；“文件导入”“播放器通过”“原作听感通过”分别记。

| 症状 | 排查 |
| --- | --- |
| 注册成功却无声 | 默认静音/未手势解锁、后台、未选择cue、文件加载失败；注册不是播放 |
| 像普通MIDI乐器 | voicegroup、鼓组/键位分区、硬件音色或转换参数丢失 |
| 接缝、重复引子、截尾音 | 实际解码帧、循环位置、延音/混响边界、编码延迟 |
| 地图没有BGM | MUS常量尚未映射到已注册music cue；不以示例旋律补位 |
| 短曲结束BGM不恢复 | fanfare恢复/等待政策未转写，不能全部当作普通setMusic |

完成后同步STATUS、资源来源/验收记录及音频规格。接口变动同步Skill与作者例；文档修改只跑check:docs，代码/工具/资源改动查相应专项，阶段收口再全量回归，复用未变领域证据。
