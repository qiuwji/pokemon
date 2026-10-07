# 原作提取证据（自动生成）

固定修订：`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。此文件只展示源数据，不是已完成的游戏剧情。

入口 13；标签 26；未解析引用 0。

中文译文、分支解释和待办写在 review.json；不要手改本文件。

## 地图入口及对象

### Route104_PrettyPetalFlowerShop

来源：`data/maps/Route104_PrettyPetalFlowerShop/map.json`，SHA-256 `b31bf4a12f9d1077e9580a51b1104f58d4a504e45c409fb083e14e32aa5478c0`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_FLOWER_SHOP_OWNER",
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 0,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_PrettyPetalFlowerShop_EventScript_ShopOwner",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_3",
      "x": 7,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_PrettyPetalFlowerShop_EventScript_WailmerPailGirl",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_1",
      "x": 11,
      "y": 6,
      "elevation": 4,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 2,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_PrettyPetalFlowerShop_EventScript_RandomBerryGirl",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 2,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "1"
    },
    {
      "x": 3,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "1"
    }
  ]
}
```

## `Common_EventScript_ShowBagIsFull`

`data/event_scripts.s:696`，类型 `script`，SHA-256 `99ab96b552bd8585c97aeb817963f38f13ee8bce4d8b0d11b7fdeff3b3b14450`。

```asm
Common_EventScript_ShowBagIsFull::
	msgbox gText_TooBadBagIsFull, MSGBOX_DEFAULT
	release
	end
```

## `Route104_PrettyPetalFlowerShop_EventScript_AlreadyMet`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:29`，类型 `script`，SHA-256 `5ca4eb15c63ede7c8a9ce00c796c566c74ffb69b6623ce623651e75106bd8e92`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_AlreadyMet::
	msgbox Route104_PrettyPetalFlowerShop_Text_LearnAboutBerries, MSGBOX_YESNO
	call_if_eq VAR_RESULT, YES, Route104_PrettyPetalFlowerShop_EventScript_ExplainBerries
	call_if_eq VAR_RESULT, NO, Route104_PrettyPetalFlowerShop_EventScript_DontExplainBerries
	release
	end
```

## `Route104_PrettyPetalFlowerShop_EventScript_AlreadyReceivedBerry`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:93`，类型 `script`，SHA-256 `5d681d4a2de1619096e8667505348cfbd199fe9a58c0fccaeed89587bbb3a0cb`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_AlreadyReceivedBerry::
	msgbox Route104_PrettyPetalFlowerShop_Text_MachineMixesBerries, MSGBOX_DEFAULT
	release
	end
```

## `Route104_PrettyPetalFlowerShop_EventScript_DontExplainBerries`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:40`，类型 `script`，SHA-256 `e0a2e2d7eed528836ec4e2938fba0b84bbb9743162b917c546d6741190a25a57`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_DontExplainBerries::
	msgbox Route104_PrettyPetalFlowerShop_Text_FlowersBringHappiness, MSGBOX_DEFAULT
	return
```

## `Route104_PrettyPetalFlowerShop_EventScript_ExplainBerries`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:36`，类型 `script`，SHA-256 `d7026564b512b15d12f9e1db8571e1b7e6e1c617def67ef1cf715bd9338d66f1`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_ExplainBerries::
	msgbox Route104_PrettyPetalFlowerShop_Text_BerriesExplanation, MSGBOX_DEFAULT
	return
```

## `Route104_PrettyPetalFlowerShop_EventScript_GiveWailmerPail`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:70`，类型 `script`，SHA-256 `eadf54d98cc1bdbf23d3cb000cb9fac03957821e2c8f82b6ed63534c5b641f74`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_GiveWailmerPail::
	msgbox Route104_PrettyPetalFlowerShop_Text_YouCanHaveThis, MSGBOX_DEFAULT
	giveitem ITEM_WAILMER_PAIL
	msgbox Route104_PrettyPetalFlowerShop_Text_WailmerPailExplanation, MSGBOX_DEFAULT
	setflag FLAG_RECEIVED_WAILMER_PAIL
	release
	end
```

## `Route104_PrettyPetalFlowerShop_EventScript_MoveShopOwner`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:12`，类型 `script`，SHA-256 `7c006b3952cf26abc4cf936fc8305cc2f291f04194fa6dd50aacb8c8d33cae1d`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_MoveShopOwner::
	setobjectxyperm LOCALID_FLOWER_SHOP_OWNER, 4, 6
	end
```

## `Route104_PrettyPetalFlowerShop_EventScript_RandomBerryGirl`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:78`，类型 `script`，SHA-256 `a5caccc1e66e8b9a24ded90ea934a5a0023f5346d446bfcf9585c72ac80f9d31`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_RandomBerryGirl::
	lock
	faceplayer
	dotimebasedevents
	goto_if_set FLAG_DAILY_FLOWER_SHOP_RECEIVED_BERRY, Route104_PrettyPetalFlowerShop_EventScript_AlreadyReceivedBerry
	msgbox Route104_PrettyPetalFlowerShop_Text_ImGrowingFlowers, MSGBOX_DEFAULT
	random 8
	addvar VAR_RESULT, FIRST_BERRY_INDEX
	giveitem VAR_RESULT
	goto_if_eq VAR_RESULT, 0, Common_EventScript_ShowBagIsFull
	setflag FLAG_DAILY_FLOWER_SHOP_RECEIVED_BERRY
	msgbox Route104_PrettyPetalFlowerShop_Text_MachineMixesBerries, MSGBOX_DEFAULT
	release
	end
```

## `Route104_PrettyPetalFlowerShop_EventScript_SellDecorations`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:44`，类型 `script`，SHA-256 `a97a7224626c87fd4c5ec6216527fae4b3b62214e48fcb66cfdfa9cd50659aa6`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_SellDecorations::
	message gText_PlayerWhatCanIDoForYou
	waitmessage
	pokemartdecoration2 Route104_PrettyPetalFlowerShop_Pokemart_Plants
	msgbox gText_PleaseComeAgain, MSGBOX_DEFAULT
	release
	end

	.align 2
```

## `Route104_PrettyPetalFlowerShop_EventScript_ShopOwner`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:16`，类型 `script`，SHA-256 `b8000d11936d1a2141d892ef79b63de5d26118508b5dc1e9cf01449e58c5f997`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_ShopOwner::
	lock
	faceplayer
	goto_if_set FLAG_TEMP_1, Route104_PrettyPetalFlowerShop_EventScript_SellDecorations
	msgbox Route104_PrettyPetalFlowerShop_Text_ThisIsPrettyPetalFlowerShop, MSGBOX_DEFAULT
	goto_if_set FLAG_MET_PRETTY_PETAL_SHOP_OWNER, Route104_PrettyPetalFlowerShop_EventScript_AlreadyMet
	setflag FLAG_MET_PRETTY_PETAL_SHOP_OWNER
	msgbox Route104_PrettyPetalFlowerShop_Text_IntroLearnAboutBerries, MSGBOX_YESNO
	call_if_eq VAR_RESULT, YES, Route104_PrettyPetalFlowerShop_EventScript_ExplainBerries
	call_if_eq VAR_RESULT, NO, Route104_PrettyPetalFlowerShop_EventScript_DontExplainBerries
	release
	end
```

## `Route104_PrettyPetalFlowerShop_EventScript_WailmerPailGirl`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:62`，类型 `script`，SHA-256 `49aefe756259609676941c984aca50dae908a6cf057e8ef93b807618135cd93b`。

```asm
Route104_PrettyPetalFlowerShop_EventScript_WailmerPailGirl::
	lock
	faceplayer
	goto_if_unset FLAG_RECEIVED_WAILMER_PAIL, Route104_PrettyPetalFlowerShop_EventScript_GiveWailmerPail
	msgbox Route104_PrettyPetalFlowerShop_Text_WailmerPailExplanation, MSGBOX_DEFAULT
	release
	end
```

## `Route104_PrettyPetalFlowerShop_MapScripts`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:1`，类型 `script`，SHA-256 `507ba3d44ab388a8ab5ff2ef08012bf3b9f38206fd988381bf1bba5770689961`。

```asm
Route104_PrettyPetalFlowerShop_MapScripts::
	map_script MAP_SCRIPT_ON_TRANSITION, Route104_PrettyPetalFlowerShop_OnTransition
	.byte 0
```

## `Route104_PrettyPetalFlowerShop_OnTransition`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:5`，类型 `script`，SHA-256 `ba076ff43d79b4b68b91e7c1515b8101f983db889ed39a015b51337990f9b063`。

```asm
Route104_PrettyPetalFlowerShop_OnTransition:
	setflag FLAG_LANDMARK_FLOWER_SHOP
	goto_if_unset FLAG_MET_PRETTY_PETAL_SHOP_OWNER, Route104_PrettyPetalFlowerShop_EventScript_MoveShopOwner
	goto_if_unset FLAG_BADGE03_GET, Route104_PrettyPetalFlowerShop_EventScript_MoveShopOwner
	setflag FLAG_TEMP_1
	end
```

## `Route104_PrettyPetalFlowerShop_Pokemart_Plants`

`data/maps/Route104_PrettyPetalFlowerShop/scripts.inc:53`，类型 `script`，SHA-256 `d339b219f0ad3451d4aaef36f05204007bc4ca21d045030c36636f9dfee03e55`。

```asm
Route104_PrettyPetalFlowerShop_Pokemart_Plants:
	.2byte DECOR_RED_PLANT
	.2byte DECOR_TROPICAL_PLANT
	.2byte DECOR_PRETTY_FLOWERS
	.2byte DECOR_COLORFUL_PLANT
	.2byte DECOR_BIG_PLANT
	.2byte DECOR_GORGEOUS_PLANT
	pokemartlistend
```

## `Route104_PrettyPetalFlowerShop_Text_BerriesExplanation`

`data/text/berries.inc:153`，类型 `text`，SHA-256 `e98a13327d425851599186f15794c6695d22c7c7c9ace004a0bddf5c7fdd3f3f`。

```asm
Route104_PrettyPetalFlowerShop_Text_BerriesExplanation:
	.string "BERRIES grow on trees that thrive\n"
	.string "only in soft, loamy soil.\p"
	.string "If you take some BERRIES, be sure to\n"
	.string "plant one in the loamy soil again.\p"
	.string "A planted BERRY will soon sprout,\n"
	.string "grow into a plant, flower beautifully,\l"
	.string "then grow BERRIES again.\p"
	.string "I want to see the whole wide world\n"
	.string "filled with beautiful flowers.\l"
	.string "That's my dream.\p"
	.string "Please help me, {PLAYER}{KUN}. Plant BERRIES\n"
	.string "and bring more flowers into the world.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
BERRIES grow on trees that thrive
only in soft, loamy soil.

If you take some BERRIES, be sure to
plant one in the loamy soil again.

A planted BERRY will soon sprout,
grow into a plant, flower beautifully,
then grow BERRIES again.

I want to see the whole wide world
filled with beautiful flowers.
That's my dream.

Please help me, {PLAYER}{KUN}. Plant BERRIES
and bring more flowers into the world.
```

## `Route104_PrettyPetalFlowerShop_Text_FlowersBringHappiness`

`data/text/berries.inc:167`，类型 `text`，SHA-256 `85ac08821cb29765b9ce1f9bcdf1eb9587e1ffe835716a0351789216748b9b09`。

```asm
Route104_PrettyPetalFlowerShop_Text_FlowersBringHappiness:
	.string "Flowers bring so much happiness to\n"
	.string "people, don't they?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Flowers bring so much happiness to
people, don't they?
```

## `Route104_PrettyPetalFlowerShop_Text_ImGrowingFlowers`

`data/text/berries.inc:188`，类型 `text`，SHA-256 `9d984e7db005cb0c49700e101adc4fa057b9f527e79bb2d2fd7ecca09519d03a`。

```asm
Route104_PrettyPetalFlowerShop_Text_ImGrowingFlowers:
	.string "I'm trying to be like my big sisters.\n"
	.string "I'm growing flowers, too!\p"
	.string "Here you go!\n"
	.string "It's for you!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm trying to be like my big sisters.
I'm growing flowers, too!

Here you go!
It's for you!
```

## `Route104_PrettyPetalFlowerShop_Text_IntroLearnAboutBerries`

`data/text/berries.inc:146`，类型 `text`，SHA-256 `d6716378caedf30036afd267dbf350a4aa430183654808e64dc3d2f760b79fe8`。

```asm
Route104_PrettyPetalFlowerShop_Text_IntroLearnAboutBerries:
	.string "Your name is?\p"
	.string "{PLAYER}{KUN}.\n"
	.string "That's a nice name.\p"
	.string "{PLAYER}{KUN}, would you like to learn about\n"
	.string "BERRIES?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Your name is?

{PLAYER}{KUN}.
That's a nice name.

{PLAYER}{KUN}, would you like to learn about
BERRIES?
```

## `Route104_PrettyPetalFlowerShop_Text_LearnAboutBerries`

`data/text/berries.inc:142`，类型 `text`，SHA-256 `0387371998fbcfa384dbf7772c1f2fb76c41e519730d6d732b16845e90073aa9`。

```asm
Route104_PrettyPetalFlowerShop_Text_LearnAboutBerries:
	.string "{PLAYER}{KUN}, would you like to learn about\n"
	.string "BERRIES?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
{PLAYER}{KUN}, would you like to learn about
BERRIES?
```

## `Route104_PrettyPetalFlowerShop_Text_MachineMixesBerries`

`data/text/berries.inc:194`，类型 `text`，SHA-256 `140a446d377b987a3205f8961a6f059e29c261f833e489a1284030894df849c9`。

```asm
Route104_PrettyPetalFlowerShop_Text_MachineMixesBerries:
	.string "You can plant a BERRY and grow it big,\n"
	.string "or you can make a POKéMON hold it.\p"
	.string "But now they have a machine that mixes\n"
	.string "up different BERRIES and makes candies\l"
	.string "for POKéMON.\p"
	.string "I want some candy, too.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
You can plant a BERRY and grow it big,
or you can make a POKéMON hold it.

But now they have a machine that mixes
up different BERRIES and makes candies
for POKéMON.

I want some candy, too.
```

## `Route104_PrettyPetalFlowerShop_Text_ThisIsPrettyPetalFlowerShop`

`data/text/berries.inc:137`，类型 `text`，SHA-256 `c09d7490680ea4949c438fa8e4e23287ea7e7ba9739dd69242f52eab4fa67929`。

```asm
Route104_PrettyPetalFlowerShop_Text_ThisIsPrettyPetalFlowerShop:
	.string "Hello!\p"
	.string "This is the PRETTY PETAL flower shop.\n"
	.string "Spreading flowers all over the world!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hello!

This is the PRETTY PETAL flower shop.
Spreading flowers all over the world!
```

## `Route104_PrettyPetalFlowerShop_Text_WailmerPailExplanation`

`data/text/berries.inc:178`，类型 `text`，SHA-256 `4ddf494208ab98380d9c43436afc49cf92616c935d3b90efc115042276d2032c`。

```asm
Route104_PrettyPetalFlowerShop_Text_WailmerPailExplanation:
	.string "While BERRY plants are growing,\n"
	.string "water them with the WAILMER PAIL.\p"
	.string "Oh, another thing.\p"
	.string "If you don't pick BERRIES for a while,\n"
	.string "they'll drop off onto the ground.\l"
	.string "But they'll sprout again.\p"
	.string "Isn't that awesome?\n"
	.string "It's like they have the will to live.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
While BERRY plants are growing,
water them with the WAILMER PAIL.

Oh, another thing.

If you don't pick BERRIES for a while,
they'll drop off onto the ground.
But they'll sprout again.

Isn't that awesome?
It's like they have the will to live.
```

## `Route104_PrettyPetalFlowerShop_Text_YouCanHaveThis`

`data/text/berries.inc:171`，类型 `text`，SHA-256 `78733c75430e0884ed1ff1ece93b9704b43442f2c334c5798176f6e6163ed1ae`。

```asm
Route104_PrettyPetalFlowerShop_Text_YouCanHaveThis:
	.string "Hello!\p"
	.string "The more attention you give to flowers,\n"
	.string "the more beautifully they bloom.\p"
	.string "You'll like tending flowers. I'm sure\n"
	.string "of it. You can have this.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hello!

The more attention you give to flowers,
the more beautifully they bloom.

You'll like tending flowers. I'm sure
of it. You can have this.
```

## `gText_PlayerWhatCanIDoForYou`

`data/text/mart_clerk.inc:8`，类型 `text`，SHA-256 `e5f08834d3b1ec79d8049b9bc23aeae863c56506057954786debf04af37bd70f`。

```asm
gText_PlayerWhatCanIDoForYou::
	.string "{PLAYER}{KUN}, welcome!\p"
	.string "What can I do for you?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
{PLAYER}{KUN}, welcome!

What can I do for you?
```

## `gText_PleaseComeAgain`

`data/text/mart_clerk.inc:5`，类型 `text`，SHA-256 `fe1de7dabd55bee9265f5a0c7a40f29bacf44004a1487279d6aa32b842c901aa`。

```asm
gText_PleaseComeAgain::
	.string "Please come again!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Please come again!
```

## `gText_TooBadBagIsFull`

`data/text/obtain_item.inc:14`，类型 `text`，SHA-256 `9e6e7490c48e78972689967a9e3f698eeef741b2ac1d03a76c72dd2e67d06592`。

```asm
gText_TooBadBagIsFull::
	.string "Too bad!\n"
	.string "The BAG is full…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Too bad!
The BAG is full…
```

## special / C 继续追踪

仅词法定位，possibleCalls 不是已证明的调用图。

## 指令宏（需要继续追踪宏调用时读取）

### `addvar`

`asm/macros/event.inc:163`

```asm
	.macro addvar destination:req, value:req
	.byte SCR_OP_ADDVAR
	.2byte \destination
	.2byte \value
	.endm
```

### `call_if_eq`

`asm/macros/event.inc:1858`

```asm
	.macro call_if_eq a:req, b, c
	trycompare call_if, EQUAL, \a, \b, \c
	.endm
```

### `dotimebasedevents`

`asm/macros/event.inc:348`

```asm
	.macro dotimebasedevents
	.byte SCR_OP_DOTIMEBASEDEVENTS
	.endm
```

### `end`

`asm/macros/event.inc:20`

```asm
	.macro end
	.byte SCR_OP_END
	.endm
```

### `faceplayer`

`asm/macros/event.inc:718`

```asm
	.macro faceplayer
	.byte SCR_OP_FACEPLAYER
	.endm
```

### `giveitem`

`asm/macros/event.inc:1947`

```asm
	.macro giveitem item:req, amount=1
	setorcopyvar VAR_0x8000, \item
	setorcopyvar VAR_0x8001, \amount
	callstd STD_OBTAIN_ITEM
	.endm
```

### `goto_if_eq`

`asm/macros/event.inc:1824`

```asm
	.macro goto_if_eq a:req, b, c
	trycompare goto_if, EQUAL, \a, \b, \c
	.endm
```

### `goto_if_set`

`asm/macros/event.inc:1795`

```asm
	.macro goto_if_set flag:req, dest:req
	checkflag \flag
	goto_if TRUE, \dest
	.endm
```

### `goto_if_unset`

`asm/macros/event.inc:1790`

```asm
	.macro goto_if_unset flag:req, dest:req
	checkflag \flag
	goto_if FALSE, \dest
	.endm
```

### `lock`

`asm/macros/event.inc:908`

```asm
	.macro lock
	.byte SCR_OP_LOCK
	.endm
```

### `map_script`

`asm/macros/map.inc:14`

```asm
	.macro map_script type:req, script:req
	.byte \type
	.4byte \script
	.endm
```

### `message`

`asm/macros/event.inc:892`

```asm
	.macro message text:req
	.byte SCR_OP_MESSAGE
	.4byte \text
	.endm
```

### `msgbox`

`asm/macros/event.inc:1938`

```asm
	.macro msgbox text:req, type=MSGBOX_DEFAULT
	loadword 0, \text
	callstd \type
	.endm
```

### `pokemartdecoration2`

`asm/macros/event.inc:1172`

```asm
	.macro pokemartdecoration2 products:req
	.byte SCR_OP_POKEMARTDECORATION2
	.4byte \products
	.endm
```

### `pokemartlistend`

`asm/macros/event.inc:1158`

```asm
	.macro pokemartlistend
	.2byte ITEM_NONE
	release
	end
	.endm
```

### `random`

`asm/macros/event.inc:1213`

```asm
	.macro random limit:req
	.byte SCR_OP_RANDOM
	.2byte \limit
	.endm
```

### `release`

`asm/macros/event.inc:918`

```asm
	.macro release
	.byte SCR_OP_RELEASE
	.endm
```

### `return`

`asm/macros/event.inc:25`

```asm
	.macro return
	.byte SCR_OP_RETURN
	.endm
```

### `setflag`

`asm/macros/event.inc:322`

```asm
	.macro setflag flag:req
	.byte SCR_OP_SETFLAG
	.2byte \flag
	.endm
```

### `setobjectxyperm`

`asm/macros/event.inc:862`

```asm
	.macro setobjectxyperm localId:req, x:req, y:req
	.byte SCR_OP_SETOBJECTXYPERM
	.2byte \localId
	.2byte \x
	.2byte \y
	.endm
```

### `waitmessage`

`asm/macros/event.inc:885`

```asm
	.macro waitmessage
	.byte SCR_OP_WAITMESSAGE
	.endm
```

## 未解析引用

```json
[]
```
