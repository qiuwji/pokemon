# 原作 BGM 离线资源生产

现有`tools/import.py audio`继续负责复制WAV采样。这里是独立的单曲成品BGM生成器，不修改参考或运行时规则，也不是所有AGB音效指令的解释器。初次配置为未白镇，产物在项目根emerald-littleroot-bgm。

渲染器使用[poryaaaa](https://github.com/huderlem/poryaaaa)的原作音色表/采样加载及m4a模拟，固定修订`4000591de6c397b6c80adc07af17144e26b30dfd`。源资料为只读pokeemerald修订`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。音量100、混响50来自midi.cfg，5声部/13379Hz混音来自src/m4a.c；44100Hz输出和cue音量0.6是本项目试听配置。不是通用MIDI音色，也尚未证明硬件逐位保真。

## 构建和复生成

需要Python3.9+及C11编译器。首次可在参考之外获取固定渲染器：

```sh
git clone https://github.com/huderlem/poryaaaa.git /tmp/emerald-poryaaaa
git -C /tmp/emerald-poryaaaa checkout 4000591de6c397b6c80adc07af17144e26b30dfd
```

在该临时渲染器目录编译macOS命令行目标，无需GUI子模块或全局安装：

```sh
clang -O2 -std=c11 -I plugin -I third_party cmd/poryaaaa_render.c \
  plugin/m4a_engine.c plugin/m4a_channel.c plugin/m4a_tables.c \
  plugin/m4a_reverb.c plugin/voicegroup_loader.c \
  -framework CoreAudio -framework AudioToolbox -framework CoreFoundation \
  -lm -o /tmp/poryaaaa_render
```

Linux使用同一源文件，平台链接参数按渲染器CMakeLists改为`-lm -lpthread -ldl`；Linux命令本轮未验证。需要完整官方构建时按固定修订的README配置CMake及子模块，仅构建poryaaaa_render目标。

回项目根执行；使用新输出路径，不覆盖已验收包：

```sh
python3 tools/audio/render-bgm.py --output /tmp/emerald-littleroot-bgm --check
python3 tools/audio/render-bgm.py --renderer /tmp/poryaaaa_render --output /tmp/emerald-littleroot-bgm
```

如果输入不是约定参考修订，或MIDI无合法循环、渲染器报采样/音色错误、输出静音，则拒绝产物。配置在littleroot.json；新增曲目用独立配置的title/song/midi/voicegroup和来源参数，不改生成器中的地图分支。音频文件与cueLocalId从原作常量小写派生，例如MUS_LITTLEROOT→mus_littleroot.wav及mus_littleroot；cueVolume来自配置。当前CLI支持MIDI有循环曲目，完整SE/汇编/fanfare转写仍待另做能力。

生成器读取MIDI tempo与循环标记，以PCM帧记录循环；输出引子与两遍曲身，循环第二遍保留已有尾音。记录全部sound来源文件哈希、渲染器修订及二进制哈希。发布文件为无损16bit/双声道WAV，未加淡出、归一化或替代音色。

根目录的具名试听资源为emerald-littleroot-bgm/mus_littleroot.wav。用户已确认游戏内可听；持续循环听音和固定原作对照另记。游戏用AudioBufferSourceNode.loop持续循环第二遍，不用计时器重播引子。普通preview.html音频控件播到文件末尾停止，与游戏持续循环行为不同。

## 装到游戏

游戏只装**一个**音频包。每首曲子先用上面的渲染器单独渲成曲目包，再由合并安装器统一装配：

```sh
python3 tools/audio/render-bgm.py --config tools/audio/tracks/route101.json \
  --renderer /tmp/poryaaaa_render --output /tmp/audio-build/bgm-route101
python3 tools/audio/bundle-audio.py --build /tmp/audio-build --check
python3 tools/audio/bundle-audio.py --build /tmp/audio-build
```

`tools/audio/pack.json`是唯一的装配清单：`music`逐首列出原曲常量、对应曲目配置和选曲用途（`map-music`/`battle-wild`/`battle-trainer`/`battle-rival`），`sounds`列一次性音效。音色组、音量与声部全部取自原作`midi.cfg`（例如`se_select`为`rs_sfx_1 -V080 -P5`），不在生成器里硬编码。

音效配置带`oneShot:true`：原作SE没有循环标记，渲染器整段渲一遍，cue为`kind:"sound"`、`loop:false`，不套用曲子的引子+两遍曲身策略。安装结果固定为：

```text
generated/assets/audio/emerald-audio/music/<原曲常量小写>.wav
generated/assets/audio/emerald-audio/sounds/<音效常量小写>.wav   # 音效渲染后才有
generated/assets/audio/emerald-audio/manifest.json                # 来源、循环帧、哈希、验证状态
generated/plugins/emerald-audio.js                               # 一个插件注册全部 cue
```

合并安装器逐首校验参考修订、渲染器修订与音频哈希，把资源复制到统一目录，重写catalog只保留`emerald-audio`（默认启用），并删除被取代的单曲插件模块与资源目录。重复安装无改动，`--check`不写盘，写入异常回滚。地图内容始终保留原作常量（如`MUS_ROUTE101`），运行时按原曲身份解析cue，因此重新导入地图不需要再装一次。

选曲政策在`src/packs/emerald/audio-library.js`：`ORIGINAL_SONG_CUES`是常量到cue的唯一映射，`emeraldMusic`先读地图`music`，战斗时按`emeraldBattleSong`取`MUS_VS_WILD`/`MUS_VS_TRAINER`/`MUS_VS_RIVAL`，与原作`GetBattleBGM`一致。声音仍由玩家点击♪开启。

剧情曲也登记pack.json的story用途：MUS_HELP配置在tracks/mus-help.json，按midi.cfg的help音色组/-V078/-R50渲染，仍循环第二遍曲身。求救音乐跨对白持续及存读档恢复由pack剧情阶段旗标选曲；战斗准备时切入战斗曲，不等入场转场的中点。曲目生成、选择和播放是不同验收环节，听感仍由实际游戏试听确认。

## 验证边界

检查真实PCM、loop在资源范围、试听插件注册和内容选曲、安装预演不写及重复安装；受影响测试用audio-scene和插件装配例。正常游戏开启声音后的听感与固定原作对照仍必须人工听音记录，不能用音频时长或DOM代替。Skill入口见[音乐指南](../../skills/emerald-story-reconstruction/references/music-import.md)。

音乐淡入淡出在 `pack.json.musicFades` 统一配置，由bundle-audio写入合并包（当前500/250ms）。修改该策略后重新合并即可，无需重渲染WAV；不要仅编辑生成的插件。SE不继承音乐渐变。
