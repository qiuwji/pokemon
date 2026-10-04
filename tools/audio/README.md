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

在项目根对生成包先预演：

```sh
python3 emerald-littleroot-bgm/install.py --check
python3 emerald-littleroot-bgm/install.py
```

安装器校验音频哈希，复制资源/插件，通过现有内容manifest找music等于MUS_LITTLEROOT的元数据并绑定注册cue；登记的插件默认关闭。已有其他曲目不覆盖，重复安装无修改，写入异常回滚已替换文件。它是明确的内容安装操作，不给mapExtensions虚构修改music字段的能力，不修改引擎。重新导入地图恢复原作常量后需再安装。

游戏打开`?plugins=emerald-first-bgm`，正常进入未白镇或相同原曲的已导入房屋，点击♪开启声音；安装后刷新页面。若端口为5175，地址为`http://127.0.0.1:5175/?plugins=emerald-first-bgm`。测试包不影响领域/RNG，其他场景的曲目及完整战斗/剧情恢复不由本单曲包补齐。

## 验证边界

检查真实PCM、loop在资源范围、试听插件注册和内容选曲、安装预演不写及重复安装；受影响测试用audio-scene和插件装配例。正常游戏开启声音后的听感与固定原作对照仍必须人工听音记录，不能用音频时长或DOM代替。Skill入口见[音乐指南](../../skills/emerald-story-reconstruction/references/music-import.md)。
