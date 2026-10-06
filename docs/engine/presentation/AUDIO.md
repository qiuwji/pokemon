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

`packs/emerald/audio-library.js`提供confirm/purchase/reward/door/ledge/ball.throw/ball.shake/ball.open/heal/save/storage.pc及初始精灵cry。核心短音效已指向原SE/fanfare离线渲染资源，不再使用合成提示音。逐招式attack/hurt没有通用替代映射；未导入者保持安静。

门音效按原作`GetDoorSoundEffect`分普通/滑动两类：pack传逻辑ID（`emerald:door`/`emerald:slidingDoor`），由适配器边界的`emeraldDoorSound`解析成已安装的cue；该cue缺失或不是sound时回退到普通开门音而不是静音，非门ID原样透传。

滑动门SE已按原曲身份渲染并装入统一音频包：配置为`tools/audio/tracks/se-sliding-door.json`（音色组/音量/声部取自`midi.cfg`的`se_sliding_door.mid: -E -R50 -G_rs_sfx_2 -V095 -P4`，一次性音效），曲目登记在`tools/audio/pack.json`的`sounds`，cue为`emerald-audio:se_sliding_door`。登记与渲染有顺序要求：合并安装器对已声明未渲染的曲目直接报`Missing rendered track pack`，所以必须先渲染再写`pack.json`，否则文档里的安装命令会失败。回退分支保留给未装该包的构建（例如只装地图内容的最小包）。

采样复制使用tools/import.py audio；MIDI曲目和一次性SE/fanfare使用[音频工具](../../../tools/audio/README.md)，固定来源、音色表、音量/混响/声部设置和哈希记录在合并包manifest。运行时只播放成品资源；不是通用MIDI音色，也没有宣称硬件逐位相同。具体流程见[音乐导入指南](../../../skills/emerald-story-reconstruction/references/music-import.md)。

曲目保留原常量小写身份，例如MUS_LITTLEROOT→mus_littleroot.wav。按PCM帧确定loopStart/loopEnd，通过AudioBufferSourceNode循环曲身，不能用定时器重播引子。音乐选择在emeraldMusic：已准备的战斗优先，再取剧情覆盖或地图；求救阶段按旗标维持MUS_HELP。换曲/后台/静音恢复由适配器处理。完整冲浪/骑车及全作fanfare恢复政策仍需逐流程补充，查看STATUS而非历史数量。

确认入口在UI shell和battle-interface，trusted点击捕获阶段与程序confirm互斥，页面不重复播confirm。输入/捕捉短音效在启动时预解码，不阻塞加载或自动开声音。timed-cues.js按注入时钟等待音效点；battle-audio.js纯映射ball/capture/switch/entry与可用Growl叫声。捕捉消息在最终shake/release之后公布并保留阅读时间；reduced-motion收缩时序、省去重复摇晃声，不改变规则结果。插件演出缩短duration时按时间比例缩放音效点。

## 验证和变更边界

以下数量是初次音频API交付时的历史证据，不是当前全工程通过数；最新阶段检查与未验收项见STATUS。

audio-scene 共 11 项分别验证通过：资源切换/缓存/暂停续播、异步失效、严格资源合同/失败重试、声部/通道/结束释放/宿主失败、实际 WAV 文件/内容选曲、插件所有权/评价边界、旧插件版本拒绝、stopAll/启动失败、解码重试/循环范围，以及既有场景与命令。调整 stopAll 世代取消后，仅重查两个受影响异步/音乐项通过。

UI/插件/保存/表现/架构相关 46 项通过；内容引用、公开类型和 235 个模块语法检查通过。最后新增证明未改变类型/内容接口。真实听感和完整原作曲目尚未浏览器验收，留阶段 E。修改音频资源合同、生命周期、事件边界、加载器或频道时重查对应项；旧合成音频验收已失效，其他未变模块沿用证据。


## 剧情声部结束与切曲

AudioAdapter的播放句柄提供`finished` Promise，声部自然结束、停止、静音、悬挂或dispose均完成。剧情`sound {cue,channel}`保存当前具名声部，`waitSound {channel}`等待它；失败解码不遗留等待。`music {cue}`临时覆盖宿主选曲，空cue恢复地图音乐，剧情finally释放覆盖与声部引用。跑步鞋fanfare在提示之后等待真实结束；时长不写在剧情数据里。

合并包manifest把原始输入哈希去重到`sourceInputSets`，每首曲目通过`inputSet`引用，曲目仍分别保留资源哈希/循环帧/渲染设置。新增获得物品、离开楼梯、采访员和男女对手音乐已安装；实际听音和原机逐帧对照仍待用户验收。

## 场景切曲的渐变

合并音频包的 `tools/audio/pack.json.musicFades` 控制BGM：当前渐入1500ms、渐出1200ms；bundle-audio负责写进实际注册cue和资源manifest，不能只手改生成插件。音效保留即时播放。循环采样边界和WAV内容不变。

AudioAdapter等新曲解码成功后才让旧曲渐出；失败保留旧声并允许重试，快速切场景只接受最新请求。回到仍在播放的原曲会取消待加载替换，不重新从头播放。禁音、后台暂停和释放继续清理全部声音。听感由用户在游戏内验收。
