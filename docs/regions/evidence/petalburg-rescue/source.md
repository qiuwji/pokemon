# 原作提取证据（自动生成）

固定修订：`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。此文件只展示源数据，不是已完成的游戏剧情。

入口 6；标签 62；未解析引用 0。

中文译文、分支解释和待办写在 review.json；不要手改本文件。

## 地图入口及对象

### PetalburgCity

来源：`data/maps/PetalburgCity/map.json`，SHA-256 `0018ee193173c55b295f46a11a82dad9db0f37e7717a18261efc587c71d7d20e`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_4",
      "x": 16,
      "y": 18,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_EventScript_WallysMom",
      "flag": "FLAG_HIDE_PETALBURG_CITY_WALLYS_MOM"
    },
    {
      "local_id": "LOCALID_PETALBURG_WALLY",
      "graphics_id": "OBJ_EVENT_GFX_WALLY",
      "x": 15,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_PETALBURG_CITY_WALLY"
    },
    {
      "local_id": "LOCALID_PETALBURG_BOY",
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 8,
      "y": 22,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_EventScript_Boy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GENTLEMAN",
      "x": 20,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_EventScript_Gentleman",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_PETALBURG_WALLYS_DAD",
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 15,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_PETALBURG_CITY_WALLYS_DAD"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 19,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_EventScript_ItemMaxRevive",
      "flag": "FLAG_ITEM_PETALBURG_CITY_MAX_REVIVE"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 3,
      "y": 28,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_EventScript_ItemEther",
      "flag": "FLAG_ITEM_PETALBURG_CITY_ETHER"
    },
    {
      "local_id": "LOCALID_GYM_BOY",
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 12,
      "y": 15,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_EventScript_GymBoy",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_PETALBURG_SCOTT",
      "graphics_id": "OBJ_EVENT_GFX_SCOTT",
      "x": 13,
      "y": 12,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_PETALBURG_CITY_SCOTT"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 8,
      "y": 10,
      "elevation": 3,
      "var": "VAR_PETALBURG_CITY_STATE",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_ShowGymToPlayer0"
    },
    {
      "type": "trigger",
      "x": 8,
      "y": 11,
      "elevation": 3,
      "var": "VAR_PETALBURG_CITY_STATE",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_ShowGymToPlayer1"
    },
    {
      "type": "trigger",
      "x": 8,
      "y": 12,
      "elevation": 3,
      "var": "VAR_PETALBURG_CITY_STATE",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_ShowGymToPlayer2"
    },
    {
      "type": "trigger",
      "x": 8,
      "y": 13,
      "elevation": 3,
      "var": "VAR_PETALBURG_CITY_STATE",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_ShowGymToPlayer3"
    },
    {
      "type": "trigger",
      "x": 4,
      "y": 10,
      "elevation": 3,
      "var": "VAR_SCOTT_PETALBURG_ENCOUNTER",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_Scott0"
    },
    {
      "type": "trigger",
      "x": 4,
      "y": 11,
      "elevation": 3,
      "var": "VAR_SCOTT_PETALBURG_ENCOUNTER",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_Scott1"
    },
    {
      "type": "trigger",
      "x": 4,
      "y": 12,
      "elevation": 3,
      "var": "VAR_SCOTT_PETALBURG_ENCOUNTER",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_Scott2"
    },
    {
      "type": "trigger",
      "x": 4,
      "y": 13,
      "elevation": 3,
      "var": "VAR_SCOTT_PETALBURG_ENCOUNTER",
      "var_value": "0",
      "script": "PetalburgCity_EventScript_Scott3"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 17,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "PetalburgCity_EventScript_GymSign"
    },
    {
      "type": "sign",
      "x": 26,
      "y": 12,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    },
    {
      "type": "sign",
      "x": 21,
      "y": 16,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 17,
      "y": 16,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "PetalburgCity_EventScript_CitySign"
    },
    {
      "type": "sign",
      "x": 22,
      "y": 16,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 27,
      "y": 12,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    },
    {
      "type": "sign",
      "x": 8,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "PetalburgCity_EventScript_WallyHouseSign"
    },
    {
      "type": "hidden_item",
      "x": 11,
      "y": 29,
      "elevation": 3,
      "item": "ITEM_RARE_CANDY",
      "flag": "FLAG_HIDDEN_ITEM_PETALBURG_CITY_RARE_CANDY"
    }
  ],
  "warp_events": [
    {
      "x": 10,
      "y": 19,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY_HOUSE1",
      "dest_warp_id": "0"
    },
    {
      "x": 7,
      "y": 5,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY_WALLYS_HOUSE",
      "dest_warp_id": "0"
    },
    {
      "x": 15,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY_GYM",
      "dest_warp_id": "0"
    },
    {
      "x": 20,
      "y": 16,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY_POKEMON_CENTER_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 20,
      "y": 24,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY_HOUSE2",
      "dest_warp_id": "0"
    },
    {
      "x": 25,
      "y": 12,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY_MART",
      "dest_warp_id": "0"
    }
  ]
}
```

### PetalburgWoods

来源：`data/maps/PetalburgWoods/map.json`，SHA-256 `31038be29e39c493a1e3cdf74a7cccaae7f9d024e55112973528813b5d24b45a`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 19,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_11"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 19,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_12"
    },
    {
      "local_id": "LOCALID_PETALBURG_WOODS_GRUNT",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 26,
      "y": 17,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_PETALBURG_WOODS_AQUA_GRUNT"
    },
    {
      "local_id": "LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE",
      "graphics_id": "OBJ_EVENT_GFX_MAN_2",
      "x": 26,
      "y": 20,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_PETALBURG_WOODS_DEVON_EMPLOYEE"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 45,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgWoods_EventScript_ItemGreatBall",
      "flag": "FLAG_ITEM_PETALBURG_WOODS_GREAT_BALL"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 35,
      "y": 20,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgWoods_EventScript_ItemXAttack",
      "flag": "FLAG_ITEM_PETALBURG_WOODS_X_ATTACK"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 4,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgWoods_EventScript_ItemEther",
      "flag": "FLAG_ITEM_PETALBURG_WOODS_ETHER"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 15,
      "y": 19,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgWoods_EventScript_Boy1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BUG_CATCHER",
      "x": 7,
      "y": 32,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN_LEFT_AND_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "PetalburgWoods_EventScript_Lyle",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BUG_CATCHER",
      "x": 4,
      "y": 14,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN_UP_AND_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "PetalburgWoods_EventScript_James",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_3",
      "x": 30,
      "y": 34,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 2,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgWoods_EventScript_Boy2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 4,
      "y": 26,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgWoods_EventScript_ItemParalyzeHeal",
      "flag": "FLAG_ITEM_PETALBURG_WOODS_PARALYZE_HEAL"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_2",
      "x": 33,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgWoods_EventScript_Girl",
      "flag": "0"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 26,
      "y": 23,
      "elevation": 3,
      "var": "VAR_PETALBURG_WOODS_STATE",
      "var_value": "0",
      "script": "PetalburgWoods_EventScript_DevonResearcherLeft"
    },
    {
      "type": "trigger",
      "x": 27,
      "y": 23,
      "elevation": 3,
      "var": "VAR_PETALBURG_WOODS_STATE",
      "var_value": "0",
      "script": "PetalburgWoods_EventScript_DevonResearcherRight"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 14,
      "y": 32,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "PetalburgWoods_EventScript_Sign1"
    },
    {
      "type": "hidden_item",
      "x": 39,
      "y": 35,
      "elevation": 3,
      "item": "ITEM_POTION",
      "flag": "FLAG_HIDDEN_ITEM_PETALBURG_WOODS_POTION"
    },
    {
      "type": "hidden_item",
      "x": 26,
      "y": 6,
      "elevation": 3,
      "item": "ITEM_TINY_MUSHROOM",
      "flag": "FLAG_HIDDEN_ITEM_PETALBURG_WOODS_TINY_MUSHROOM_1"
    },
    {
      "type": "hidden_item",
      "x": 40,
      "y": 29,
      "elevation": 3,
      "item": "ITEM_TINY_MUSHROOM",
      "flag": "FLAG_HIDDEN_ITEM_PETALBURG_WOODS_TINY_MUSHROOM_2"
    },
    {
      "type": "hidden_item",
      "x": 4,
      "y": 19,
      "elevation": 3,
      "item": "ITEM_POKE_BALL",
      "flag": "FLAG_HIDDEN_ITEM_PETALBURG_WOODS_POKE_BALL"
    },
    {
      "type": "sign",
      "x": 11,
      "y": 8,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "PetalburgWoods_EventScript_Sign2"
    }
  ],
  "warp_events": [
    {
      "x": 14,
      "y": 5,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "2"
    },
    {
      "x": 15,
      "y": 5,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "3"
    },
    {
      "x": 16,
      "y": 38,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "4"
    },
    {
      "x": 17,
      "y": 38,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "5"
    },
    {
      "x": 36,
      "y": 38,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "6"
    },
    {
      "x": 37,
      "y": 38,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104",
      "dest_warp_id": "7"
    }
  ]
}
```

### Route104

来源：`data/maps/Route104/map.json`，SHA-256 `a508508e63e83ad350d6dec54ce5ddba8305e51215f477bb035d21a532994d9a`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_BUG_CATCHER",
      "x": 15,
      "y": 60,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_BugCatcher",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_2",
      "x": 25,
      "y": 49,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Girl1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_LASS",
      "x": 31,
      "y": 24,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "7",
      "script": "Route104_EventScript_Haley",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 27,
      "y": 63,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Boy1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 30,
      "y": 50,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Woman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_3",
      "x": 28,
      "y": 74,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Girl2",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_ROUTE104_BOAT",
      "graphics_id": "OBJ_EVENT_GFX_MR_BRINEYS_BOAT",
      "x": 12,
      "y": 54,
      "elevation": 1,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_ROUTE_104_MR_BRINEY_BOAT"
    },
    {
      "local_id": "LOCALID_ROUTE104_BRINEY",
      "graphics_id": "OBJ_EVENT_GFX_EXPERT_M",
      "x": 12,
      "y": 51,
      "elevation": 4,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_ROUTE_104_MR_BRINEY"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_FISHERMAN",
      "x": 29,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Ivan",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 34,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_CHERI_1",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 35,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_SOIL_2",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 36,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_LEPPA",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 22,
      "y": 41,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_ORAN_2",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 23,
      "y": 41,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_SOIL_3",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 24,
      "y": 41,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_PECHA",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_EXPERT_F",
      "x": 37,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_ExpertF",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 3,
      "y": 22,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_SOIL_1",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 3,
      "y": 23,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_ORAN_1",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 3,
      "y": 24,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_SOIL_4",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 3,
      "y": 25,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_104_CHERI_2",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 39,
      "y": 15,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_ItemPPUp",
      "flag": "FLAG_ITEM_ROUTE_104_PP_UP"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 8,
      "y": 19,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_WhiteHerbFlorist",
      "flag": "FLAG_HIDE_ROUTE_104_WHITE_HERB_FLORIST"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 27,
      "y": 15,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "1",
      "script": "Route104_EventScript_Gina",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 28,
      "y": 15,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "1",
      "script": "Route104_EventScript_Mia",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_RICH_BOY",
      "x": 21,
      "y": 25,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_ROTATE_COUNTERCLOCKWISE",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route104_EventScript_Winston",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 11,
      "y": 44,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP_AND_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route104_EventScript_Cindy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 29,
      "y": 53,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_ItemPokeBall",
      "flag": "FLAG_ITEM_ROUTE_104_POKE_BALL"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
      "x": 18,
      "y": 67,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WALK_SEQUENCE_DOWN_RIGHT_UP_LEFT",
      "movement_range_x": 5,
      "movement_range_y": 6,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "2",
      "script": "Route104_EventScript_Billy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 37,
      "y": 22,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_ItemXAccuracy",
      "flag": "FLAG_ITEM_ROUTE_104_X_ACCURACY"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 35,
      "y": 22,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_11"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 5,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_ItemPotion",
      "flag": "FLAG_ITEM_ROUTE_104_POTION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 5,
      "y": 26,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Boy2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_FISHERMAN",
      "x": 15,
      "y": 59,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Darian",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_ROUTE104_RIVAL",
      "graphics_id": "OBJ_EVENT_GFX_VAR_0",
      "x": 17,
      "y": 50,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route104_EventScript_Rival",
      "flag": "FLAG_HIDE_ROUTE_104_RIVAL"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 17,
      "y": 51,
      "elevation": 3,
      "var": "VAR_ROUTE104_STATE",
      "var_value": "1",
      "script": "Route104_EventScript_RivalTrigger"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 20,
      "y": 50,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route104_EventScript_BrineysCottageSign"
    },
    {
      "type": "sign",
      "x": 27,
      "y": 66,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route104_EventScript_RouteSignPetalburg"
    },
    {
      "type": "sign",
      "x": 23,
      "y": 5,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route104_EventScript_RouteSignRustboro"
    },
    {
      "type": "sign",
      "x": 7,
      "y": 20,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route104_EventScript_FlowerShopSign"
    },
    {
      "type": "sign",
      "x": 17,
      "y": 23,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route104_EventScript_TrainerTipsDoubleBattles"
    },
    {
      "type": "hidden_item",
      "x": 7,
      "y": 6,
      "elevation": 3,
      "item": "ITEM_SUPER_POTION",
      "flag": "FLAG_HIDDEN_ITEM_ROUTE_104_SUPER_POTION"
    },
    {
      "type": "hidden_item",
      "x": 3,
      "y": 9,
      "elevation": 3,
      "item": "ITEM_POKE_BALL",
      "flag": "FLAG_HIDDEN_ITEM_ROUTE_104_POKE_BALL"
    },
    {
      "type": "hidden_item",
      "x": 14,
      "y": 55,
      "elevation": 3,
      "item": "ITEM_POTION",
      "flag": "FLAG_HIDDEN_ITEM_ROUTE_104_POTION"
    },
    {
      "type": "hidden_item",
      "x": 16,
      "y": 72,
      "elevation": 3,
      "item": "ITEM_ANTIDOTE",
      "flag": "FLAG_HIDDEN_ITEM_ROUTE_104_ANTIDOTE"
    },
    {
      "type": "hidden_item",
      "x": 16,
      "y": 64,
      "elevation": 3,
      "item": "ITEM_HEART_SCALE",
      "flag": "FLAG_HIDDEN_ITEM_ROUTE_104_HEART_SCALE"
    }
  ],
  "warp_events": [
    {
      "x": 17,
      "y": 50,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104_MR_BRINEYS_HOUSE",
      "dest_warp_id": "0"
    },
    {
      "x": 5,
      "y": 18,
      "elevation": 0,
      "dest_map": "MAP_ROUTE104_PRETTY_PETAL_FLOWER_SHOP",
      "dest_warp_id": "0"
    },
    {
      "x": 10,
      "y": 30,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_WOODS",
      "dest_warp_id": "0"
    },
    {
      "x": 11,
      "y": 30,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_WOODS",
      "dest_warp_id": "1"
    },
    {
      "x": 10,
      "y": 38,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_WOODS",
      "dest_warp_id": "2"
    },
    {
      "x": 11,
      "y": 38,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_WOODS",
      "dest_warp_id": "3"
    },
    {
      "x": 32,
      "y": 42,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_WOODS",
      "dest_warp_id": "4"
    },
    {
      "x": 33,
      "y": 42,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_WOODS",
      "dest_warp_id": "5"
    }
  ]
}
```

## `Common_Movement_Delay48`

`data/scripts/movement.inc:9`，类型 `movement`，SHA-256 `2f2e0a1b1dbe06471d75d86c6dc4eb62a1fb7a022f3cadd301ffe3db14371e30`。

```asm
Common_Movement_Delay48:
	delay_16
	delay_16
	delay_16
	step_end
```

## `Common_Movement_ExclamationMark`

`data/scripts/movement.inc:5`，类型 `movement`，SHA-256 `ed117b24837038a74b9a58cf9e344e382bb3978048b12fe056ee8bdc536a6873`。

```asm
Common_Movement_ExclamationMark:
	emote_exclamation_mark
	step_end
```

## `Common_Movement_WalkInPlaceFasterDown`

`data/scripts/movement.inc:39`，类型 `movement`，SHA-256 `dc710a76327722587934027c27867bea1f8ab4e6f872d5942a6e045b4dadd9ba`。

```asm
Common_Movement_WalkInPlaceFasterDown:
	walk_in_place_faster_down
	step_end
```

## `Common_Movement_WalkInPlaceFasterLeft`

`data/scripts/movement.inc:27`，类型 `movement`，SHA-256 `553ed9a4637102c976cf05b491238fce869ee1b553f354043ecef1272e3aacf1`。

```asm
Common_Movement_WalkInPlaceFasterLeft:
	walk_in_place_faster_left
	step_end
```

## `Common_Movement_WalkInPlaceFasterRight`

`data/scripts/movement.inc:35`，类型 `movement`，SHA-256 `9aeaa9670d464cddc55bc471ce43e4047e0e0e73ecb793b4bff492a94e42d641`。

```asm
Common_Movement_WalkInPlaceFasterRight:
	walk_in_place_faster_right
	step_end
```

## `Common_Movement_WalkInPlaceFasterUp`

`data/scripts/movement.inc:31`，类型 `movement`，SHA-256 `3a7d3dcff77ca9bcbe619f1495ab097e13432e5e94654e4a65d2bdefc25473cd`。

```asm
Common_Movement_WalkInPlaceFasterUp:
	walk_in_place_faster_up
	step_end
```

## `PetalburgCity_EventScript_Scott`

`data/maps/PetalburgCity/scripts.inc:518`，类型 `script`，SHA-256 `cba5e011887f48aebabd2d49c568220370f5f779c68eb1e45d10f81bab72de04`。

```asm
PetalburgCity_EventScript_Scott::
	applywaitmovement LOCALID_PETALBURG_SCOTT, PetalburgCity_Movement_ScottStartWalkLeft
	playse SE_PIN
	applywaitmovement LOCALID_PETALBURG_SCOTT, Common_Movement_ExclamationMark
	applywaitmovement LOCALID_PETALBURG_SCOTT, Common_Movement_Delay48
	applywaitmovement LOCALID_PETALBURG_SCOTT, PetalburgCity_Movement_ScottApproachPlayer
	applywaitmovement LOCALID_PLAYER, Common_Movement_WalkInPlaceFasterRight
	setvar VAR_SCOTT_STATE, 1
	msgbox PetalburgCity_Text_AreYouATrainer, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_SCOTT, Common_Movement_WalkInPlaceFasterRight
	delay 30
	msgbox PetalburgCity_Text_WellMaybeNot, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_SCOTT, Common_Movement_WalkInPlaceFasterLeft
	delay 30
	msgbox PetalburgCity_Text_ImLookingForTalentedTrainers, MSGBOX_DEFAULT
	closemessage
	call_if_eq VAR_0x8008, 0, PetalburgCity_EventScript_ScottExit0
	call_if_eq VAR_0x8008, 1, PetalburgCity_EventScript_ScottExit1
	call_if_eq VAR_0x8008, 2, PetalburgCity_EventScript_ScottExit2
	call_if_eq VAR_0x8008, 3, PetalburgCity_EventScript_ScottExit3
	setvar VAR_SCOTT_PETALBURG_ENCOUNTER, 1
	removeobject LOCALID_PETALBURG_SCOTT
	releaseall
	end
```

## `PetalburgCity_EventScript_Scott0`

`data/maps/PetalburgCity/scripts.inc:486`，类型 `script`，SHA-256 `ea82e4ca19a526da9f9a6baedea67e88dfba70bf456db1ce1665805fbfa4f97c`。

```asm
PetalburgCity_EventScript_Scott0::
	lockall
	addobject LOCALID_PETALBURG_SCOTT
	setvar VAR_0x8008, 0
	setobjectxy LOCALID_PETALBURG_SCOTT, 13, 10
	goto PetalburgCity_EventScript_Scott
	end
```

## `PetalburgCity_EventScript_Scott1`

`data/maps/PetalburgCity/scripts.inc:494`，类型 `script`，SHA-256 `54f351b8191fb733f9def06315f178945d72203ae47a0bcc4edb64e37663d1ff`。

```asm
PetalburgCity_EventScript_Scott1::
	lockall
	addobject LOCALID_PETALBURG_SCOTT
	setvar VAR_0x8008, 1
	setobjectxy LOCALID_PETALBURG_SCOTT, 13, 11
	goto PetalburgCity_EventScript_Scott
	end
```

## `PetalburgCity_EventScript_Scott2`

`data/maps/PetalburgCity/scripts.inc:502`，类型 `script`，SHA-256 `8265ee7d62cb00fd2b9a0720b66f74478b1d82853d09f46853fc3d781fdc6657`。

```asm
PetalburgCity_EventScript_Scott2::
	lockall
	addobject LOCALID_PETALBURG_SCOTT
	setvar VAR_0x8008, 2
	setobjectxy LOCALID_PETALBURG_SCOTT, 13, 12
	goto PetalburgCity_EventScript_Scott
	end
```

## `PetalburgCity_EventScript_Scott3`

`data/maps/PetalburgCity/scripts.inc:510`，类型 `script`，SHA-256 `053c23bdb88a6d8b39cd71785895c974862301ab7cef8c3a8a9d8d2f11134e58`。

```asm
PetalburgCity_EventScript_Scott3::
	lockall
	addobject LOCALID_PETALBURG_SCOTT
	setvar VAR_0x8008, 3
	setobjectxy LOCALID_PETALBURG_SCOTT, 13, 13
	goto PetalburgCity_EventScript_Scott
	end
```

## `PetalburgCity_EventScript_ScottExit0`

`data/maps/PetalburgCity/scripts.inc:545`，类型 `script`，SHA-256 `1e730019ac8986e0d2f494c7c9c44fa56b5cc8b303b217d4f5357c821f1e83aa`。

```asm
PetalburgCity_EventScript_ScottExit0::
	applymovement LOCALID_PLAYER, PetalburgCity_Movement_PlayerWatchScottExit0
	applymovement LOCALID_PETALBURG_SCOTT, PetalburgCity_Movement_ScottExit0
	waitmovement 0
	return
```

## `PetalburgCity_EventScript_ScottExit1`

`data/maps/PetalburgCity/scripts.inc:551`，类型 `script`，SHA-256 `a18792bb8fea2a9a2e0592d0d3e9461f91016b83560de425ae6f5bfdbb59a9c3`。

```asm
PetalburgCity_EventScript_ScottExit1::
	applymovement LOCALID_PLAYER, PetalburgCity_Movement_PlayerWatchScottExit1
	applymovement LOCALID_PETALBURG_SCOTT, PetalburgCity_Movement_ScottExit1
	waitmovement 0
	return
```

## `PetalburgCity_EventScript_ScottExit2`

`data/maps/PetalburgCity/scripts.inc:557`，类型 `script`，SHA-256 `0ba9c47c32716358edd6e62002f79476e79b60a02e0080f58b183e0f0f62a447`。

```asm
PetalburgCity_EventScript_ScottExit2::
	applymovement LOCALID_PLAYER, PetalburgCity_Movement_PlayerWatchScottExit2
	applymovement LOCALID_PETALBURG_SCOTT, PetalburgCity_Movement_ScottExit2
	waitmovement 0
	return
```

## `PetalburgCity_EventScript_ScottExit3`

`data/maps/PetalburgCity/scripts.inc:563`，类型 `script`，SHA-256 `f2f777cba3080d790e66e607c0f0cbf04c201675c12e0ee972ec8efb2dda443e`。

```asm
PetalburgCity_EventScript_ScottExit3::
	applymovement LOCALID_PLAYER, PetalburgCity_Movement_PlayerWatchScottExit3
	applymovement LOCALID_PETALBURG_SCOTT, PetalburgCity_Movement_ScottExit3
	waitmovement 0
	return
```

## `PetalburgCity_Movement_PlayerWatchScottExit0`

`data/maps/PetalburgCity/scripts.inc:599`，类型 `movement`，SHA-256 `7c9444f02da4e351a2ca7d8463f0b25294a98936fe0a3734127128e910039da7`。

```asm
PetalburgCity_Movement_PlayerWatchScottExit0:
	delay_16
	walk_in_place_faster_down
	delay_16
	delay_16
	delay_8
	walk_in_place_faster_left
	step_end
```

## `PetalburgCity_Movement_PlayerWatchScottExit1`

`data/maps/PetalburgCity/scripts.inc:623`，类型 `movement`，SHA-256 `33f6b355ce104819552e8538fdb5ed8c3dd643989808cf73269b80bbd6ece3bd`。

```asm
PetalburgCity_Movement_PlayerWatchScottExit1:
	delay_16
	walk_in_place_faster_down
	delay_16
	delay_8
	walk_in_place_faster_left
	step_end
```

## `PetalburgCity_Movement_PlayerWatchScottExit2`

`data/maps/PetalburgCity/scripts.inc:646`，类型 `movement`，SHA-256 `57f04c758391d3e8e106621568c2dc39a8da67d157547d6c708ac4a988b585b5`。

```asm
PetalburgCity_Movement_PlayerWatchScottExit2:
	delay_16
	walk_in_place_faster_down
	delay_16
	delay_8
	walk_in_place_faster_left
	step_end
```

## `PetalburgCity_Movement_PlayerWatchScottExit3`

`data/maps/PetalburgCity/scripts.inc:669`，类型 `movement`，SHA-256 `8381b3b3ae7d4e012fa4b1108b42866464a3bf146dc840bb3c4e7be0814b9920`。

```asm
PetalburgCity_Movement_PlayerWatchScottExit3:
	delay_16
	walk_in_place_faster_up
	delay_16
	delay_8
	walk_in_place_faster_left
	step_end
```

## `PetalburgCity_Movement_ScottApproachPlayer`

`data/maps/PetalburgCity/scripts.inc:576`，类型 `movement`，SHA-256 `f9fff27d452c48c73e3081d435fc8599d3fcb55ee070808955a742f8269b3d47`。

```asm
PetalburgCity_Movement_ScottApproachPlayer:
	walk_left
	walk_left
	walk_left
	walk_left
	step_end
```

## `PetalburgCity_Movement_ScottExit0`

`data/maps/PetalburgCity/scripts.inc:583`，类型 `movement`，SHA-256 `4a91ff445d098621a0deee7ac1f3908888ba90a1a2ccaab3e0c0447d4e5a1325`。

```asm
PetalburgCity_Movement_ScottExit0:
	walk_down
	walk_down
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	step_end
```

## `PetalburgCity_Movement_ScottExit1`

`data/maps/PetalburgCity/scripts.inc:608`，类型 `movement`，SHA-256 `d4b8bf97be2886c20b3a026660ea0781bc39467fe7b5a82b7db9d96afa716881`。

```asm
PetalburgCity_Movement_ScottExit1:
	walk_down
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	step_end
```

## `PetalburgCity_Movement_ScottExit2`

`data/maps/PetalburgCity/scripts.inc:631`，类型 `movement`，SHA-256 `88b9c633642ffc8c55b06af6c56983fa1de5f003a508900827b23e76a480a996`。

```asm
PetalburgCity_Movement_ScottExit2:
	walk_down
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	step_end
```

## `PetalburgCity_Movement_ScottExit3`

`data/maps/PetalburgCity/scripts.inc:654`，类型 `movement`，SHA-256 `c7c72673629ff8c47f6771feb42827486acb2988ef36452fecbb770bd5fbbd57`。

```asm
PetalburgCity_Movement_ScottExit3:
	walk_up
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	walk_left
	step_end
```

## `PetalburgCity_Movement_ScottStartWalkLeft`

`data/maps/PetalburgCity/scripts.inc:569`，类型 `movement`，SHA-256 `bd8f1d5a41ddb44205ac806d63a8c2b7fbd47444c2aa1aa8d8c50d8803a66ac0`。

```asm
PetalburgCity_Movement_ScottStartWalkLeft:
	walk_left
	walk_left
	walk_left
	walk_left
	step_end
```

## `PetalburgCity_Text_AreYouATrainer`

`data/maps/PetalburgCity/scripts.inc:726`，类型 `text`，SHA-256 `45607b272614fdcb58b17a1bff1146d0f212a4bc6b73ead34641cdde5d839367`。

```asm
PetalburgCity_Text_AreYouATrainer:
	.string "Excuse me!\p"
	.string "Let me guess, from the way you're\n"
	.string "dressed, are you a POKéMON TRAINER?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Excuse me!

Let me guess, from the way you're
dressed, are you a POKéMON TRAINER?
```

## `PetalburgCity_Text_ImLookingForTalentedTrainers`

`data/maps/PetalburgCity/scripts.inc:738`，类型 `text`，SHA-256 `d73b35f5e26e7015eb5aa05976dc46dd8f424349103680ee0c3b00ef98e78174`。

```asm
PetalburgCity_Text_ImLookingForTalentedTrainers:
	.string "I'm roaming the land in search of\n"
	.string "talented TRAINERS.\p"
	.string "I'm sorry to have taken your time.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm roaming the land in search of
talented TRAINERS.

I'm sorry to have taken your time.
```

## `PetalburgCity_Text_WellMaybeNot`

`data/maps/PetalburgCity/scripts.inc:731`，类型 `text`，SHA-256 `5ddea1f52bccb20b9ef0f5da4ce8132494f115523d50fb80995d119756e0a1b5`。

```asm
PetalburgCity_Text_WellMaybeNot:
	.string "… … … … … …\p"
	.string "Well, maybe not.\n"
	.string "Your clothes aren't all that dirty.\p"
	.string "You're either a rookie TRAINER,\n"
	.string "or maybe you're just an ordinary kid.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
… … … … … …

Well, maybe not.
Your clothes aren't all that dirty.

You're either a rookie TRAINER,
or maybe you're just an ordinary kid.
```

## `PetalburgWoods_EventScript_BagFull`

`data/maps/PetalburgWoods/scripts.inc:78`，类型 `script`，SHA-256 `57c72260e8bda3bb69687466dd0c9693fd97790a2bef9962e7f48cba4c22712a`。

```asm
PetalburgWoods_EventScript_BagFull::
	msgbox PetalburgWoods_Text_YoureLoadedWithItems, MSGBOX_DEFAULT
	goto PetalburgWoods_EventScript_DevonResearcherFinish
	end
```

## `PetalburgWoods_EventScript_DevonResearcherFinish`

`data/maps/PetalburgWoods/scripts.inc:83`，类型 `script`，SHA-256 `ddaf617d967c57d65d71804f13bba632e1d6e5f292b70d077a901dbec1103fc5`。

```asm
PetalburgWoods_EventScript_DevonResearcherFinish::
	msgbox PetalburgWoods_Text_TeamAquaAfterSomethingInRustboro, MSGBOX_DEFAULT
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherStartExit
	msgbox PetalburgWoods_Text_ICantBeWastingTime, MSGBOX_DEFAULT
	closemessage
	return
```

## `PetalburgWoods_EventScript_DevonResearcherIntro`

`data/maps/PetalburgWoods/scripts.inc:60`，类型 `script`，SHA-256 `ee4d051766e0180f578ede88e27b93128ccd7a2d452d3b52eef64216318f0c79`。

```asm
PetalburgWoods_EventScript_DevonResearcherIntro::
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherLookAround
	msgbox PetalburgWoods_Text_NotAOneToBeFound, MSGBOX_DEFAULT
	closemessage
	return
```

## `PetalburgWoods_EventScript_DevonResearcherLeft`

`data/maps/PetalburgWoods/scripts.inc:4`，类型 `script`，SHA-256 `6059561634fced8dc729a69d0305e50b8c0f9d96e56a4802285089a33e25afc4`。

```asm
PetalburgWoods_EventScript_DevonResearcherLeft::
	lockall
	call PetalburgWoods_EventScript_DevonResearcherIntro
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherApproachPlayerLeft
	msgbox PetalburgWoods_Text_HaveYouSeenShroomish, MSGBOX_DEFAULT
	closemessage
	playbgm MUS_ENCOUNTER_AQUA, FALSE
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaEntrance
	msgbox PetalburgWoods_Text_IWasGoingToAmbushYou, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaApproachResearcherLeft
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, Common_Movement_WalkInPlaceFasterUp
	msgbox PetalburgWoods_Text_HandOverThosePapers, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherFleeToPlayerLeft
	msgbox PetalburgWoods_Text_YouHaveToHelpMe, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaApproachPlayer
	msgbox PetalburgWoods_Text_NoOneCrossesTeamAqua, MSGBOX_DEFAULT
	trainerbattle_no_intro TRAINER_GRUNT_PETALBURG_WOODS, PetalburgWoods_Text_YoureKiddingMe
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaBackOff
	call PetalburgWoods_EventScript_DevonResearcherPostBattle
	applymovement LOCALID_PLAYER, PetalburgWoods_Movement_WatchResearcherLeave
	applymovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherExitLeft
	waitmovement 0
	goto PetalburgWoods_EventScript_RemoveDevonResearcher
	end
```

## `PetalburgWoods_EventScript_DevonResearcherPostBattle`

`data/maps/PetalburgWoods/scripts.inc:66`，类型 `script`，SHA-256 `39d420a7990841f1dcae9cab2fea94e74ceaa0d5033d0f220f79dcfc7ef56854`。

```asm
PetalburgWoods_EventScript_DevonResearcherPostBattle::
	msgbox PetalburgWoods_Text_YouveGotSomeNerve, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaRunAway
	removeobject LOCALID_PETALBURG_WOODS_GRUNT
	applywaitmovement LOCALID_PLAYER, Common_Movement_WalkInPlaceFasterDown
	msgbox PetalburgWoods_Text_ThatWasAwfullyClose, MSGBOX_DEFAULT
	giveitem ITEM_GREAT_BALL
	goto_if_eq VAR_RESULT, FALSE, PetalburgWoods_EventScript_BagFull
	goto PetalburgWoods_EventScript_DevonResearcherFinish
	end
```

## `PetalburgWoods_EventScript_DevonResearcherRight`

`data/maps/PetalburgWoods/scripts.inc:32`，类型 `script`，SHA-256 `87b53bae68397861f8f023bfa48cdcff8dc88e505114fc65073f30752601130d`。

```asm
PetalburgWoods_EventScript_DevonResearcherRight::
	lockall
	call PetalburgWoods_EventScript_DevonResearcherIntro
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherApproachPlayerRight
	applywaitmovement LOCALID_PLAYER, Common_Movement_WalkInPlaceFasterLeft
	msgbox PetalburgWoods_Text_HaveYouSeenShroomish, MSGBOX_DEFAULT
	closemessage
	playbgm MUS_ENCOUNTER_AQUA, FALSE
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaEntrance
	msgbox PetalburgWoods_Text_IWasGoingToAmbushYou, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaApproachResearcherRight
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, Common_Movement_WalkInPlaceFasterUp
	msgbox PetalburgWoods_Text_HandOverThosePapers, MSGBOX_DEFAULT
	closemessage
	applywaitmovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherFleeToPlayerRight
	msgbox PetalburgWoods_Text_YouHaveToHelpMe, MSGBOX_DEFAULT
	applywaitmovement LOCALID_PLAYER, Common_Movement_WalkInPlaceFasterUp
	msgbox PetalburgWoods_Text_NoOneCrossesTeamAqua, MSGBOX_DEFAULT
	trainerbattle_no_intro TRAINER_GRUNT_PETALBURG_WOODS, PetalburgWoods_Text_YoureKiddingMe
	applywaitmovement LOCALID_PETALBURG_WOODS_GRUNT, PetalburgWoods_Movement_AquaBackOff
	call PetalburgWoods_EventScript_DevonResearcherPostBattle
	applymovement LOCALID_PLAYER, PetalburgWoods_Movement_WatchResearcherLeave
	applymovement LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE, PetalburgWoods_Movement_DevonResearcherExitRight
	waitmovement 0
	goto PetalburgWoods_EventScript_RemoveDevonResearcher
	end
```

## `PetalburgWoods_EventScript_RemoveDevonResearcher`

`data/maps/PetalburgWoods/scripts.inc:90`，类型 `script`，SHA-256 `b3f465f5b83ded134f817d306bfcdc61fedabd771dbdb47f19ada764b99f9ee1`。

```asm
PetalburgWoods_EventScript_RemoveDevonResearcher::
	removeobject LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE
	setvar VAR_PETALBURG_WOODS_STATE, 1
	releaseall
	end
```

## `PetalburgWoods_Movement_AquaApproachPlayer`

`data/maps/PetalburgWoods/scripts.inc:217`，类型 `movement`，SHA-256 `03734fd2fa3934b5452556e9dfd84be663b31def2f2ee12d3322a61a532a91e9`。

```asm
PetalburgWoods_Movement_AquaApproachPlayer:
	walk_down
	step_end
```

## `PetalburgWoods_Movement_AquaApproachResearcherLeft`

`data/maps/PetalburgWoods/scripts.inc:183`，类型 `movement`，SHA-256 `ca68705af895e84609a431779057ef07b57e1bbded9f03b30f097a7a529358c1`。

```asm
PetalburgWoods_Movement_AquaApproachResearcherLeft:
	walk_fast_down
	walk_fast_down
	step_end
```

## `PetalburgWoods_Movement_AquaApproachResearcherRight`

`data/maps/PetalburgWoods/scripts.inc:204`，类型 `movement`，SHA-256 `796ba6783f4f6486357d3e764650243f5e8451d472ef16b4d80d505a16a87c14`。

```asm
PetalburgWoods_Movement_AquaApproachResearcherRight:
	walk_fast_down
	walk_fast_down
	walk_fast_down
	step_end
```

## `PetalburgWoods_Movement_AquaBackOff`

`data/maps/PetalburgWoods/scripts.inc:188`，类型 `movement`，SHA-256 `49c4dc73597fb8ad019234f9d65c8d00306d36e2defc55004d4d040164fed232`。

```asm
PetalburgWoods_Movement_AquaBackOff:
	lock_facing_direction
	walk_up
	unlock_facing_direction
	step_end
```

## `PetalburgWoods_Movement_AquaEntrance`

`data/maps/PetalburgWoods/scripts.inc:210`，类型 `movement`，SHA-256 `95fdeda9ac691f4262af3578d659688aa502b25f3161a24d7e6871878a12f8f8`。

```asm
PetalburgWoods_Movement_AquaEntrance:
	walk_down
	walk_down
	delay_16
	delay_16
	step_end
```

## `PetalburgWoods_Movement_AquaRunAway`

`data/maps/PetalburgWoods/scripts.inc:194`，类型 `movement`，SHA-256 `8a54d6ad88e8bb1f9cc872a912cc741cac5612da1ac1181b12d6c94b4a4abb12`。

```asm
PetalburgWoods_Movement_AquaRunAway:
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	delay_16
	delay_16
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherApproachPlayerLeft`

`data/maps/PetalburgWoods/scripts.inc:126`，类型 `movement`，SHA-256 `9fc588bf617abd49d55c5427d00b0f73eee0cadf6e2c2a52a54ea179354e1a42`。

```asm
PetalburgWoods_Movement_DevonResearcherApproachPlayerLeft:
	delay_16
	face_player
	walk_down
	walk_down
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherApproachPlayerRight`

`data/maps/PetalburgWoods/scripts.inc:133`，类型 `movement`，SHA-256 `4ae79a6946c9142d330507e30424852e4164a735f78aeb7fb87d29ffd26e385c`。

```asm
PetalburgWoods_Movement_DevonResearcherApproachPlayerRight:
	delay_16
	face_player
	walk_down
	walk_down
	walk_down
	walk_in_place_faster_right
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherExitLeft`

`data/maps/PetalburgWoods/scripts.inc:115`，类型 `movement`，SHA-256 `8017576ddb632b916b16324f26f3c6038e533bb24b315109682674cba17e1bfb`。

```asm
PetalburgWoods_Movement_DevonResearcherExitLeft:
	walk_fast_right
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherExitRight`

`data/maps/PetalburgWoods/scripts.inc:142`，类型 `movement`，SHA-256 `ffc1b386e3ee2d011b50b39413f94878cbca11a47892c118a02e34d06df55090`。

```asm
PetalburgWoods_Movement_DevonResearcherExitRight:
	walk_fast_left
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	walk_fast_up
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherFleeToPlayerLeft`

`data/maps/PetalburgWoods/scripts.inc:159`，类型 `movement`，SHA-256 `8f3eb2e7f98ff38fcf2d885c65914f9f653e998dcb5e46164e09144f3d018ac1`。

```asm
PetalburgWoods_Movement_DevonResearcherFleeToPlayerLeft:
	walk_fast_right
	walk_fast_down
	walk_fast_down
	walk_fast_left
	walk_in_place_faster_up
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherFleeToPlayerRight`

`data/maps/PetalburgWoods/scripts.inc:167`，类型 `movement`，SHA-256 `2b5f3f489134d4ee3683c468f8fe5726897152a152a236e2e6b0d93bee745eb2`。

```asm
PetalburgWoods_Movement_DevonResearcherFleeToPlayerRight:
	walk_fast_down
	walk_fast_right
	walk_in_place_faster_up
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherLookAround`

`data/maps/PetalburgWoods/scripts.inc:96`，类型 `movement`，SHA-256 `f0e893cf2eec2e766279691939df1e3fff016e5c232f4d43e903686ef5947c90`。

```asm
PetalburgWoods_Movement_DevonResearcherLookAround:
	face_up
	delay_16
	delay_4
	face_right
	delay_16
	delay_8
	face_left
	delay_16
	delay_8
	face_down
	delay_16
	face_right
	delay_16
	delay_8
	face_up
	delay_16
	step_end
```

## `PetalburgWoods_Movement_DevonResearcherStartExit`

`data/maps/PetalburgWoods/scripts.inc:173`，类型 `movement`，SHA-256 `6233764cfb5c86110378af39e82e3b4a5bfef341e9be5ea6aedfda57e8d6be6e`。

```asm
PetalburgWoods_Movement_DevonResearcherStartExit:
	walk_in_place_faster_down
	delay_16
	delay_16
	delay_16
	delay_16
	delay_16
	face_up
	step_end
```

## `PetalburgWoods_Movement_WatchResearcherLeave`

`data/maps/PetalburgWoods/scripts.inc:153`，类型 `movement`，SHA-256 `51936cfae79cd0b580aebc30dd6cc3480ae686c783c416fa8027838700898012`。

```asm
PetalburgWoods_Movement_WatchResearcherLeave:
	delay_16
	delay_16
	walk_in_place_faster_up
	step_end
```

## `PetalburgWoods_Text_HandOverThosePapers`

`data/maps/PetalburgWoods/scripts.inc:314`，类型 `text`，SHA-256 `99d145fcfeabc9c66a2911912032ec6ce6ef0cfab023fc100007b099fd5d4b8f`。

```asm
PetalburgWoods_Text_HandOverThosePapers:
	.string "You! DEVON RESEARCHER!\p"
	.string "Hand over those papers!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
You! DEVON RESEARCHER!

Hand over those papers!
```

## `PetalburgWoods_Text_HaveYouSeenShroomish`

`data/maps/PetalburgWoods/scripts.inc:303`，类型 `text`，SHA-256 `0726af244d02bc7214209a477750af7051af1e343ff0af514048b79ff4fe928d`。

```asm
PetalburgWoods_Text_HaveYouSeenShroomish:
	.string "Hello, have you seen any POKéMON\n"
	.string "called SHROOMISH around here?\p"
	.string "I really love that POKéMON.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hello, have you seen any POKéMON
called SHROOMISH around here?

I really love that POKéMON.
```

## `PetalburgWoods_Text_ICantBeWastingTime`

`data/maps/PetalburgWoods/scripts.inc:356`，类型 `text`，SHA-256 `af9e146cacc1422c070a2ddf4f78c03ae602d957b7cb082cd989c29cd78c80bd`。

```asm
PetalburgWoods_Text_ICantBeWastingTime:
	.string "Uh-oh! It's a crisis!\n"
	.string "I can't be wasting time!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Uh-oh! It's a crisis!
I can't be wasting time!
```

## `PetalburgWoods_Text_IWasGoingToAmbushYou`

`data/maps/PetalburgWoods/scripts.inc:308`，类型 `text`，SHA-256 `380af45f42fdc14879a6288f3c5774686eb213c5fb0515b67a2889cae9cd77af`。

```asm
PetalburgWoods_Text_IWasGoingToAmbushYou:
	.string "I was going to ambush you, but you\n"
	.string "had to dawdle in PETALBURG WOODS\l"
	.string "forever, didn't you?\p"
	.string "I got sick of waiting, so here I am!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I was going to ambush you, but you
had to dawdle in PETALBURG WOODS
forever, didn't you?

I got sick of waiting, so here I am!
```

## `PetalburgWoods_Text_NoOneCrossesTeamAqua`

`data/maps/PetalburgWoods/scripts.inc:323`，类型 `text`，SHA-256 `ffe89bf3159de188ba401eb6e435cf610c1b53903a35621c8d2986eaacf6d29f`。

```asm
PetalburgWoods_Text_NoOneCrossesTeamAqua:
	.string "Hunh? What do you think you're doing?\n"
	.string "What, you're going to protect him?\p"
	.string "No one who crosses TEAM AQUA\n"
	.string "gets any mercy, not even a kid!\p"
	.string "Come on and battle me!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hunh? What do you think you're doing?
What, you're going to protect him?

No one who crosses TEAM AQUA
gets any mercy, not even a kid!

Come on and battle me!
```

## `PetalburgWoods_Text_NotAOneToBeFound`

`data/maps/PetalburgWoods/scripts.inc:299`，类型 `text`，SHA-256 `b11dec8773572d230d364ef6ab41450cf2a0d71509c66ca22f8c9dec45983606`。

```asm
PetalburgWoods_Text_NotAOneToBeFound:
	.string "Hmmm…\n"
	.string "Not a one to be found…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hmmm…
Not a one to be found…
```

## `PetalburgWoods_Text_TeamAquaAfterSomethingInRustboro`

`data/maps/PetalburgWoods/scripts.inc:351`，类型 `text`，SHA-256 `ec3e2244b6a9fb3c1dd0a496f6845bcb7c49ef6755dfd2d266821e99e07b5874`。

```asm
PetalburgWoods_Text_TeamAquaAfterSomethingInRustboro:
	.string "Didn't that TEAM AQUA thug say\n"
	.string "they were after something in\l"
	.string "RUSTBORO, too?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Didn't that TEAM AQUA thug say
they were after something in
RUSTBORO, too?
```

## `PetalburgWoods_Text_ThatWasAwfullyClose`

`data/maps/PetalburgWoods/scripts.inc:343`，类型 `text`，SHA-256 `ab559791b2bcec8c4aeebe1da1cf95c3c4eb51b84ee44ed606b0ef10fef7fa00`。

```asm
PetalburgWoods_Text_ThatWasAwfullyClose:
	.string "Whew…\n"
	.string "That was awfully close!\p"
	.string "Thanks to you, he didn't rob me of\n"
	.string "these important papers.\p"
	.string "I know, I'll give you a GREAT BALL as\n"
	.string "my thanks!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Whew…
That was awfully close!

Thanks to you, he didn't rob me of
these important papers.

I know, I'll give you a GREAT BALL as
my thanks!
```

## `PetalburgWoods_Text_YouHaveToHelpMe`

`data/maps/PetalburgWoods/scripts.inc:318`，类型 `text`，SHA-256 `4885d357043ca1ad662a93c172cb5c2cfb2ab6212d9651a9e26a262c00d8dfe2`。

```asm
PetalburgWoods_Text_YouHaveToHelpMe:
	.string "Aiyeeeh!\p"
	.string "You're a POKéMON TRAINER, aren't you?\n"
	.string "You've got to help me, please!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Aiyeeeh!

You're a POKéMON TRAINER, aren't you?
You've got to help me, please!
```

## `PetalburgWoods_Text_YoureKiddingMe`

`data/maps/PetalburgWoods/scripts.inc:330`，类型 `text`，SHA-256 `693bd600be2a13f90c0f4e33424c9e038b4a20b5322e423ec72083c5b0e29fba`。

```asm
PetalburgWoods_Text_YoureKiddingMe:
	.string "You're kidding me! You're tough!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
You're kidding me! You're tough!
```

## `PetalburgWoods_Text_YoureLoadedWithItems`

`data/maps/PetalburgWoods/scripts.inc:360`，类型 `text`，SHA-256 `c7c973584801224dd139897645d54adc81aa662e740cba7ae5bb2d16bde1acfc`。

```asm
PetalburgWoods_Text_YoureLoadedWithItems:
	.string "You're loaded with items.\n"
	.string "I can't give you this GREAT BALL.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
You're loaded with items.
I can't give you this GREAT BALL.
```

## `PetalburgWoods_Text_YouveGotSomeNerve`

`data/maps/PetalburgWoods/scripts.inc:333`，类型 `text`，SHA-256 `f4c00503acdb0dd2152dfb26c445f7523adcf0bbeff92b282d4f3bc0b387ab5d`。

```asm
PetalburgWoods_Text_YouveGotSomeNerve:
	.string "Grrr… You've got some nerve\n"
	.string "meddling with TEAM AQUA!\l"
	.string "Come on and battle me again!\p"
	.string "I wish I could say that, but I'm out of\n"
	.string "POKéMON…\p"
	.string "And, hey, we of TEAM AQUA are also\n"
	.string "after something in RUSTBORO.\p"
	.string "I'll let you go today!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Grrr… You've got some nerve
meddling with TEAM AQUA!
Come on and battle me again!

I wish I could say that, but I'm out of
POKéMON…

And, hey, we of TEAM AQUA are also
after something in RUSTBORO.

I'll let you go today!
```

## special / C 继续追踪

仅词法定位，possibleCalls 不是已证明的调用图。

## 指令宏（需要继续追踪宏调用时读取）

### `addobject`

`asm/macros/event.inc:668`

```asm
	.macro addobject localId:req, map
		.ifb \map
			.byte SCR_OP_ADDOBJECT
			.2byte \localId
		.else
			.byte SCR_OP_ADDOBJECTAT
			.2byte \localId
			map \map
		.endif
	.endm
```

### `applymovement`

`asm/macros/event.inc:622`

```asm
	.macro applymovement localId:req, movements:req, map
		.ifb \map
			.byte SCR_OP_APPLYMOVEMENT
			.2byte \localId
			.4byte \movements
		.else
			@ Really only useful if the object has followed from one map to another (e.g. Wally during the catching event).
			.byte SCR_OP_APPLYMOVEMENTAT
			.2byte \localId
			.4byte \movements
			map \map
		.endif
	.endm
```

### `applywaitmovement`

`asm/macros/event.inc:1999`

```asm
	.macro applywaitmovement localId:req, movements:req, map
	applymovement \localId, \movements, \map
	waitmovement
	.endm
```

### `call`

`asm/macros/event.inc:30`

```asm
	.macro call destination:req
	.byte SCR_OP_CALL
	.4byte \destination
	.endm
```

### `call_if_eq`

`asm/macros/event.inc:1858`

```asm
	.macro call_if_eq a:req, b, c
	trycompare call_if, EQUAL, \a, \b, \c
	.endm
```

### `closemessage`

`asm/macros/event.inc:898`

```asm
	.macro closemessage
	.byte SCR_OP_CLOSEMESSAGE
	.endm
```

### `delay`

`asm/macros/event.inc:316`

```asm
	.macro delay frames:req
	.byte SCR_OP_DELAY
	.2byte \frames
	.endm
```

### `end`

`asm/macros/event.inc:20`

```asm
	.macro end
	.byte SCR_OP_END
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

### `goto`

`asm/macros/event.inc:36`

```asm
	.macro goto destination:req
	.byte SCR_OP_GOTO
	.4byte \destination
	.endm
```

### `goto_if_eq`

`asm/macros/event.inc:1824`

```asm
	.macro goto_if_eq a:req, b, c
	trycompare goto_if, EQUAL, \a, \b, \c
	.endm
```

### `lockall`

`asm/macros/event.inc:903`

```asm
	.macro lockall
	.byte SCR_OP_LOCKALL
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

### `playbgm`

`asm/macros/event.inc:381`

```asm
	.macro playbgm song:req, save_song:req
	.byte SCR_OP_PLAYBGM
	.2byte \song
	.byte \save_song
	.endm
```

### `playse`

`asm/macros/event.inc:358`

```asm
	.macro playse song:req
	.byte SCR_OP_PLAYSE
	.2byte \song
	.endm
```

### `releaseall`

`asm/macros/event.inc:913`

```asm
	.macro releaseall
	.byte SCR_OP_RELEASEALL
	.endm
```

### `removeobject`

`asm/macros/event.inc:654`

```asm
	.macro removeobject localId:req, map
		.ifb \map
			.byte SCR_OP_REMOVEOBJECT
			.2byte \localId
		.else
			.byte SCR_OP_REMOVEOBJECTAT
			.2byte \localId
			map \map
		.endif
	.endm
```

### `return`

`asm/macros/event.inc:25`

```asm
	.macro return
	.byte SCR_OP_RETURN
	.endm
```

### `setobjectxy`

`asm/macros/event.inc:680`

```asm
	.macro setobjectxy localId:req, x:req, y:req
	.byte SCR_OP_SETOBJECTXY
	.2byte \localId
	.2byte \x
	.2byte \y
	.endm
```

### `setvar`

`asm/macros/event.inc:153`

```asm
	.macro setvar destination:req, value:req, warn=TRUE
	.if \warn && ((\value >= VARS_START && \value <= VARS_END) || (\value >= SPECIAL_VARS_START && \value <= SPECIAL_VARS_END))
	.warning "setvar with a value that might be a VAR_ constant; did you mean copyvar instead?"
	.endif
	.byte SCR_OP_SETVAR
	.2byte \destination
	.2byte \value
	.endm
```

### `trainerbattle_no_intro`

`asm/macros/event.inc:821`

```asm
	.macro trainerbattle_no_intro trainer:req, lose_text:req
	trainerbattle TRAINER_BATTLE_SINGLE_NO_INTRO_TEXT, \trainer, LOCALID_NONE, \lose_text
	.endm
```

### `waitmovement`

`asm/macros/event.inc:640`

```asm
	.macro waitmovement localId=LOCALID_NONE, map
		.ifb \map
			.byte SCR_OP_WAITMOVEMENT
			.2byte \localId
		.else
			.byte SCR_OP_WAITMOVEMENTAT
			.2byte \localId
			map \map
		.endif
	.endm
```

## 未解析引用

```json
[]
```
