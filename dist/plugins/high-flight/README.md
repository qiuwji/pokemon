# 飞空术 · 自由飞行测试插件

这是可选玩法插件：把原生飞空术的城镇传送替换成自由飞行。起飞后用方向键逐格移动，可以越过墙、建筑、水面、台阶和角色；相连的已加载室外地图可连续飞越，不能飞进室内或尚未接通的区域。

## 使用

1. 游戏外顶部点击「插件」，勾选「飞空术 · 高空测试版」。保存后点击「保存并重启」生效。也可用 `?plugins=high-flight` 临时启用。
2. 队伍留一个空位。启动时自动领取一只30级、会飞空术的大王燕、HM02和白羽徽章；每份存档只领取一次。剧情正在执行时，先结束剧情。
3. 打开游戏菜单 → 宝可梦 → 选中大王燕 →「飞空术」。仅限室外，需要所选宝可梦学会飞空术并拥有白羽徽章。工程工具页「旅行与移动」也保留野外行动入口。
4. 飞行时按方向键移动。打开菜单再次选中该宝可梦 →「飞空术」即尝试降落；也可在旅行与移动里选择「飞空术 · 降落」。脚下为可站立空地、无角色/预约、无传送入口时才可降落；否则保持飞行，换个位置再试。

高空保留原15:10画面比例，视野宽、高各为普通视野的1.5倍；薄雾透明度为0.18。骑乘覆盖在地形前景之上，身体不播放步行动画。reduced-motion关闭浮动及升降位移动画，不改变移动规则。

开关只改变下次启动，未提供热卸载。关闭前先降落并保存；空中存档引用该插件的移动模式，需要重新启用才能继续读它。测试伙伴、徽章和HM属于已领取的普通领域数据，关插件不会扣回。

## 素材从哪里来

骑乘鸟来自只读 `pret/pokeemerald` 的 `graphics/field_effects/pics/bird.png`，原图32×32、单帧。`src/data/field_effects/field_effect_objects.h` 的 `gFieldEffectObjectTemplate_Bird` 和 `src/field_effect.c` 的 `CreateFlyBirdSprite` 确认它用于飞空术，使用玩家调色板槽0；`SpriteCB_FlyBirdSwoopDown` 将主角中心置于鸟中心上方8px。

插件使用原作 `brendan.pal` / `may.pal` 输出男女两套透明PNG，再叠加项目已经导入的 BrendanNormal / MayNormal 角色图。没有使用宝可梦战斗正面图，也没有生成新的AI画图。持续浮动和自由飞行属于本插件设计，原作飞空术只有起降/传送演出，不能把它们称为原作逐帧动画。

从项目根重新导入：

```sh
python3 tools/plugins/export-flight-art.py --check
python3 tools/plugins/export-flight-art.py
# 参考资料不在默认位置时添加 --source /path/to/pokeemerald
```

Pillow依赖在 `tools/requirements.txt`；运行游戏只需已提交的 `assets/`，不依赖work目录。`assets/source.json` 保存输入与产物SHA-256；导入器只拥有本插件的三个资源文件，不修改C资料、图鉴或地图。

## 实现和验证入口

[index.js](index.js)只调用公开注册、查询、事务意图与事件，不导入应用服务，不写核心存档对象。移动、起降资格、外观、相机、雾和测试奖励在此组合。

引擎提供通用移动导航/表现政策；应用服务统一执行落地校验、地面高度恢复和既有地图生命周期。插件关闭时普通走路、冲浪和传送飞空术沿用原有行为。公开模式命令可直接切换状态；队伍入口通过fieldActions.partyMove关联同一已学招式，宿主按当前资格选择起飞/降落，页面没有插件ID分支。带升降演出也可走 `core.field.action {id:"high-flight:takeoff"}` / `high-flight:land`，不是直接 `core.movement.mode`。

项目根运行 `node --test examples/high-flight.test.js`，核心合同独立位于 `tests/movement-navigation.test.js`。代码检查不证明真实画面的骑乘位置、升降节奏或雾效果；这些由玩家端到端验收。
