# 可复用资源帧片段

插件API1。图像资源、动画时间和浏览器播放分别负责一层；片段只描述如何显示，不修改精灵属性、物种、形态或规则状态。详情页与插件使用同一个播放器，不在页面按物种写动画分支。

## 注册

`api.presentation.sprite(localId,definition)`返回命名空间ID。定义在启动时校验、合并和封闭，运行中不修改片段。

| 字段 | 参数 |
| --- | --- |
| width / height | 逻辑Canvas尺寸，1–512整数；CSS可以等比例缩放，保持像素采样 |
| frames | 1–256个 `{resource,rect?,durationMs}`；resource引用已注册资源ID |
| rect | 可选 `{x,y,width,height}` 源裁切；x/y为0–8192整数，宽高1–8192。省略则使用整张图 |
| durationMs | 每帧1–10000整数毫秒，总片段不超过60000毫秒；等速fps可换算成整数帧时长 |
| loop | 可选布尔，默认false；false结束后保持末帧 |
| match | 可选 `{species,view}`；species必须存在，view是1–64字符用途名。原生详情页使用detail；其他用途由消费端选择 |

不同帧可以来自同一图集的不同裁切，也可以来自不同资源。插件应保存resource注册返回值，不直接填URL。无match的片段可以通过片段ID复用。多个插件绑定同一species/view明确拒绝，不靠加载顺序决定胜者；插件显式绑定可以覆盖绿宝石包默认绑定。

```js
api.presentation.sprite('hello', {
  width:64,height:64,loop:true,match:{species:'poochyena',view:'detail'},
  frames:[0,64].map(y=>({resource:'poochyena-front',
    rect:{x:0,y,width:64,height:64},durationMs:125}))
});
```

## 所有权与生命周期

`engine/extensions/sprite-clip-contracts.js`只校验数据，不依赖表现或浏览器。`presentation/sprite-clips.js`管理封闭目录/绑定、纯时间采样。资源和物种引用在最终目录装配时验证；已解码图像的裁切范围在播放器首次绘制前检查。未知或越界资源明确报错，不偷偷替换图片。

`SpriteCanvas`消费片段、已加载assets、注入clock和reducedMotion，拥有一个可取消帧循环。它不再为每次打开页面重新加载图片；只在帧变化时重绘，以最近邻显示、等比居中适配。单帧资源绘制一次，不建立循环；reducedMotion显示首帧。原生动画所需时间是视觉时间，不用世界RTC或游戏PRNG决定规则。

共享UI shell的 `ownModalResource(dispose)`登记页面资源，返回可提前释放的函数；替换页面、closeModal和pagehide清理。提前释放后不会重复调用，取消后的旧回调不能绘制新片段。此端口属于宿主，不向插件暴露DOM或游戏门面；插件只注册数据。播放中的绘制故障停止循环，由宿主错误端口反馈，不修改规则。

## 原生资源与导入

`tools/import-detail-sprites.py`读取当前content物种及已有PNG头，生成 `dist/packs/emerald/detail-sprite-frames.js`。命令：`python3 tools/import-detail-sprites.py`；可从任意工作目录执行。脚本不编辑只读C参考或图片。生成结果描述已有64px纵向帧图；当前58种里3种多帧，其余为单帧。

`packs/emerald/sprite-clips.js`声明默认125ms帧时长、多帧循环，单帧静态。**此时序是项目演示政策，未复刻原作每种精灵的动画脚本。** 原作图集之外的新尺寸/独立资源使用插件显式片段，不扩展通用播放器中的物种分支；新增原生物种素材后重跑导入并检查生成差异。图集来源沿用项目现有资源记录。

## 验证与接手

真实注册→选取→播放器采样→清理的29行例见 [examples/sprite-clip.test.js](../../../examples/sprite-clip.test.js)。例子替代Canvas和时钟端口，但使用生产插件目录、服务和播放器，不能作为实际浏览器图像证明。

专项 [tests/sprite-clips.test.js](../../../tests/sprite-clips.test.js)覆盖边界/循环/静态/纯度、真实图集范围、插件引用和冲突、绘制失败、过期回调及详情页面退出。资源变化应复查裁切与导入，计时/生命周期变化复查对应证明；未变规则沿用既有证据。

| 错误关键字 | 排查 |
| --- | --- |
| `Invalid sprite clip / frame / rectangle` | 检查尺寸、帧时长、总时长和裁切字段；不要把函数写进片段 |
| `Unknown sprite resource / species` | 检查完整注册ID和最终目录；不要只引用局部名字 |
| `Conflicting sprite binding` | 将同一species/view合并到一个插件或为不同用途选择新view |
| `Missing sprite image / Sprite rectangle outside image` | 检查实际assets和裁切；PNG/元数据变化后重新导入 |

更名时搜索 `validateSpriteClip`、`class SpriteClips`、`class SpriteCanvas`、`ownModalResource`。当前进度/浏览器验收只查 [STATUS](../../project/STATUS.md)，不因接口存在宣称全作帧动画已经复刻。
