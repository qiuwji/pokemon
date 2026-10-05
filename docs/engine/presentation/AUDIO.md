# 资源音频合同

## 分层与接口

领域与存档不持有音频节点。内容包/插件注册资源；页面、战斗/场景导演提出语义提示；宿主 AudioAdapter 管理解码、缓存、通道、播放位置与释放。播放失败仅报告宿主错误，不改变战斗/道具/剧情结果。当前没有音符程序、振荡器或合成回退。

原生选曲集中在pack的emeraldMusic：准备中的战斗（BattleSession.enteringBattle）及已发布战斗优先，其次临时storyMusic、剧情阶段曲、地图曲。准备状态只用于表现选曲，finally清理；不可据此提前操作战斗。剧情阶段曲从现有旗标重建，不保存音频节点。FieldSession.onStart的jump仅指成功地形跳跃；onWarpStart在坐标剧情未接管且确实开始传送时发出，正常warp音效由pack选择。脚本指定jump/门动画继续用显式sound，防止和地形音效重复。

公开 AudioCue：

```js
const cue = api.presentation.audio('confirm', {
  kind: 'sound', source: 'assets/my-pack/confirm.wav',
  volume: 0.4, loop: false, maxVoices: 2,
});
api.events.on('my-pack:interaction-finished', () => api.presentation.sound(cue));

api.presentation.audio('theme', {
  kind: 'music', source: 'assets/my-pack/theme.ogg',
  volume: 0.6, loop: true, loopStart: 3.2, loopEnd: 64,
  fadeInMs: 200, fadeOutMs: 200,
});
```

source 必须是 assets 下的 wav/ogg/mp3/m4a 文件。volume 为 0..1；loop 必须显式给出。可选循环区间单位秒，成对提供，必须在解码资源时长内；没有区间则循环完整资源。fadeInMs/fadeOutMs 为 0..10000 毫秒。sound 可指定 maxVoices 1..32，默认 8；全宿主最多 64 声部，超额停止最早声部。注册不会自动发声。

插件 sound(id) 只接受该插件注册的 sound cue，游戏 attach 后调用；规则只读评价和未提交事务中拒绝播放。交互可在提交后的事件监听中提出声音。插件得到具名请求，不获得 AudioContext/节点/任意 URL。scene.sound 可引用 cue；场景导演提出播放请求。请求不保证实际可听：玩家可静音，文件可能失败，宿主需用户手势解锁。

## 宿主播放器

- `unlock()`：用户手势中激活 AudioContext；声音默认关闭，enabled=true 会激活并恢复音乐。
- `preload(ids)` / `load(id)`：按 source 共用解码 Promise，失败移除缓存以允许重试。返回 Promise；预加载不会播放。
- `play(id)`：只播放 sound，返回 Promise<voice|null>。节点由宿主持有；静音/背景/销毁期间不发声，失败通过 onError 报告。
- `setMusic(id|null)`：选择单一 music，同一曲不重复创建；切曲按配置淡出/淡入。音乐由内容指定，不在播放器中判断地图 ID。
- `setVolume('master'|'music'|'sound', value)`：独立通道乘积，0..1，对当前声部即时生效。
- `setSuspended(bool)`：后台停声、保留当前音乐位置；返回前台从该位置续播，循环区间正确折返。页面已连接 visibilitychange。
- enabled=false：停止声音并记音乐位置；再次开启续播。切换其他曲目从头开始。
- `stopVoice(voice, fadeMs=0)` / `stopAll()`：释放或淡出连接，后者取消未完成加载对应的播放请求。
- `dispose()`：关闭上下文、清缓存和声部，幂等；pagehide 同时移除订阅与页面监听。

构造时可注入 createContext/fetchAsset/onError，测试可不启动浏览器。解码异步，不延长领域命令或动画的结算等待；加载中静音/换曲/销毁不会让旧请求晚到后突然发声。使用 AudioBufferSourceNode，循环边界由音频时钟处理，没有用于循环的轮询计时器。声音不参与规则 RNG，reducedMotion 不改变声音/领域结果。

## 绿宝石内容与真实资源

`packs/emerald/audio-library.js` 提供具名 confirm/purchase/attack/hurt/heal/reward 与三个初始精灵 cry。页面用 sound(id) 而非频率参数。地图的 music/battleMusic 直接引用已注册 music cue；缺少资源时为安静，不用示范旋律代替。插件地图同样可指定这些字段。

`python3 tools/import.py audio work/pokeemerald --check`预演复制profile所选的真实WAV；审阅后去掉--check执行。当前默认profile选择sound/direct_sound_samples中的7个文件。原始bytes不重采样/合成，路径、SHA256、时长与修订记在dist/assets/audio/provenance.json。初始三精灵使用对应原采样；UI/战斗通用音效是临时采样映射，**不等于原作SE序列**。参数、写入归属见[导入索引](../../development/IMPORT_SCRIPTS.md)。

完整BGM/SE按[音乐导入Skill指南](../../../skills/emerald-story-reconstruction/references/music-import.md)继续：从固定参考追踪歌曲常量、序列/构建参数、voicegroup/采样，记录引子/循环和来源。现有[成品BGM工具](../../../tools/audio/README.md)通过固定poryaaaa修订离线渲染MIDI循环曲目并安装音频插件，未白镇已接入；完整SE/汇编和全作选择政策尚待补齐。mid2agb和wav2agb不是整曲音频渲染器。运行时只播放成品音频，不用通用MIDI音色或占位旋律声称完成原作音乐。

曲目文件保留原作身份：MUS_LITTLEROOT→mus_littleroot.wav，cue为owner命名空间内的mus_littleroot。按PCM帧计算loopStart/loopEnd，播放器用AudioBufferSourceNode.loop持续重复指定区域；引子不会每轮重播，不通过JS计时器或ended回调重启。未白镇部署包含引子和两遍曲身，重复第二遍以保留已有尾音。

当前emeraldMusic只按map.music/map.battleMusic选择，冲浪/骑车、剧情特殊切曲、fanfare等待及BGM恢复等完整原作政策需追调用分别补齐。API能播放成品不等于这些业务已还原，曲目完成状态归[STATUS](../../project/STATUS.md)。

## 验证和变更边界

以下数量是初次音频API交付时的历史证据，不是当前全工程通过数；最新阶段检查与未验收项见STATUS。

audio-scene 共 11 项分别验证通过：资源切换/缓存/暂停续播、异步失效、严格资源合同/失败重试、声部/通道/结束释放/宿主失败、实际 WAV 文件/内容选曲、插件所有权/评价边界、旧插件版本拒绝、stopAll/启动失败、解码重试/循环范围，以及既有场景与命令。调整 stopAll 世代取消后，仅重查两个受影响异步/音乐项通过。

UI/插件/保存/表现/架构相关 46 项通过；内容引用、公开类型和 235 个模块语法检查通过。最后新增证明未改变类型/内容接口。真实听感和完整原作曲目尚未浏览器验收，留阶段 E。修改音频资源合同、生命周期、事件边界、加载器或频道时重查对应项；旧合成音频验收已失效，其他未变模块沿用证据。


## 剧情声部结束与切曲

AudioAdapter的播放句柄提供`finished` Promise，声部自然结束、停止、静音、悬挂或dispose均完成。剧情`sound {cue,channel}`保存当前具名声部，`waitSound {channel}`等待它；失败解码不遗留等待。`music {cue}`临时覆盖宿主选曲，空cue恢复地图音乐，剧情finally释放覆盖与声部引用。跑步鞋fanfare在提示之后等待真实结束；时长不写在剧情数据里。

合并包manifest把原始输入哈希去重到`sourceInputSets`，每首曲目通过`inputSet`引用，曲目仍分别保留资源哈希/循环帧/渲染设置。新增获得物品、离开楼梯、采访员和男女对手音乐已安装；实际听音和原机逐帧对照仍待用户验收。
