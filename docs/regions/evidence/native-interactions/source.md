# 原作提取证据（自动生成）

固定修订：`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。此文件只展示源数据，不是已完成的游戏剧情。

入口 20；标签 78；未解析引用 0。

中文译文、分支解释和待办写在 review.json；不要手改本文件。

## 地图入口及对象

### DewfordTown_House1

来源：`data/maps/DewfordTown_House1/map.json`，SHA-256 `a51430cafdaab54053860130ebb3d3e71d8b96228096d2fda96271ee33ab5eda`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_3",
      "x": 6,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_House1_EventScript_Woman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_1",
      "x": 3,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_House1_EventScript_Man",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ZIGZAGOON_2",
      "x": 4,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 3,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_House1_EventScript_Zigzagoon",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 3,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN",
      "dest_warp_id": "3"
    },
    {
      "x": 4,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN",
      "dest_warp_id": "3"
    }
  ]
}
```

### RustboroCity

来源：`data/maps/RustboroCity/map.json`，SHA-256 `72db80f88de45b45dec9d2e589510ebe716e32c6470852d6a9993aa0b3fc2186`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 22,
      "y": 34,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_Woman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_FAT_MAN",
      "x": 19,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_FatMan",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_NINJA_BOY",
      "x": 25,
      "y": 37,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_NinjaBoy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 21,
      "y": 46,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_Twin",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 12,
      "y": 45,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_Boy2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_3",
      "x": 26,
      "y": 23,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_Man1",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_RUSTBORO_LITTLE_BOY",
      "graphics_id": "OBJ_EVENT_GFX_LITTLE_BOY",
      "x": 24,
      "y": 51,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_LittleBoy",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_RUSTBORO_LITTLE_GIRL",
      "graphics_id": "OBJ_EVENT_GFX_LITTLE_GIRL",
      "x": 25,
      "y": 51,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_LittleGirl",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_RUSTBORO_DEVON_EMPLOYEE",
      "graphics_id": "OBJ_EVENT_GFX_MAN_2",
      "x": 30,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_DevonEmployee1",
      "flag": "FLAG_HIDE_RUSTBORO_CITY_DEVON_EMPLOYEE_1"
    },
    {
      "local_id": "LOCALID_RUSTBORO_GRUNT",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 13,
      "y": 21,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_RUSTBORO_CITY_AQUA_GRUNT"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_DEVON_EMPLOYEE",
      "x": 13,
      "y": 34,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_DevonEmployee2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 36,
      "y": 51,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_ItemXDefend",
      "flag": "FLAG_ITEM_RUSTBORO_CITY_X_DEFEND"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_4",
      "x": 19,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_Man2",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_RUSTBORO_RIVAL",
      "graphics_id": "OBJ_EVENT_GFX_VAR_0",
      "x": 16,
      "y": 50,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_Rival",
      "flag": "FLAG_HIDE_RUSTBORO_CITY_RIVAL"
    },
    {
      "local_id": "LOCALID_RUSTBORO_SCIENTIST",
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 11,
      "y": 15,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_RUSTBORO_CITY_SCIENTIST"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 31,
      "y": 36,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_EventScript_Boy1",
      "flag": "0"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 23,
      "y": 20,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "1",
      "script": "RustboroCity_EventScript_StolenGoodsTrigger0"
    },
    {
      "type": "trigger",
      "x": 23,
      "y": 21,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "1",
      "script": "RustboroCity_EventScript_StolenGoodsTrigger1"
    },
    {
      "type": "trigger",
      "x": 23,
      "y": 22,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "1",
      "script": "RustboroCity_EventScript_StolenGoodsTrigger2"
    },
    {
      "type": "trigger",
      "x": 23,
      "y": 23,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "1",
      "script": "RustboroCity_EventScript_StolenGoodsTrigger3"
    },
    {
      "type": "trigger",
      "x": 23,
      "y": 24,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "1",
      "script": "RustboroCity_EventScript_StolenGoodsTrigger4"
    },
    {
      "type": "trigger",
      "x": 30,
      "y": 9,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "2",
      "script": "RustboroCity_EventScript_HelpGetGoodsTrigger0"
    },
    {
      "type": "trigger",
      "x": 29,
      "y": 10,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "2",
      "script": "RustboroCity_EventScript_HelpGetGoodsTrigger1"
    },
    {
      "type": "trigger",
      "x": 30,
      "y": 11,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "2",
      "script": "RustboroCity_EventScript_HelpGetGoodsTrigger2"
    },
    {
      "type": "trigger",
      "x": 30,
      "y": 12,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "2",
      "script": "RustboroCity_EventScript_HelpGetGoodsTrigger3"
    },
    {
      "type": "trigger",
      "x": 30,
      "y": 9,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "4",
      "script": "RustboroCity_EventScript_ReturnGoodsTrigger0"
    },
    {
      "type": "trigger",
      "x": 31,
      "y": 10,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "4",
      "script": "RustboroCity_EventScript_ReturnGoodsTrigger1"
    },
    {
      "type": "trigger",
      "x": 30,
      "y": 11,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "4",
      "script": "RustboroCity_EventScript_ReturnGoodsTrigger2"
    },
    {
      "type": "trigger",
      "x": 30,
      "y": 12,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "4",
      "script": "RustboroCity_EventScript_ReturnGoodsTrigger3"
    },
    {
      "type": "trigger",
      "x": 12,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger0"
    },
    {
      "type": "trigger",
      "x": 13,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger1"
    },
    {
      "type": "trigger",
      "x": 14,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger2"
    },
    {
      "type": "trigger",
      "x": 15,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger3"
    },
    {
      "type": "trigger",
      "x": 16,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger4"
    },
    {
      "type": "trigger",
      "x": 17,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger5"
    },
    {
      "type": "trigger",
      "x": 18,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger6"
    },
    {
      "type": "trigger",
      "x": 19,
      "y": 53,
      "elevation": 3,
      "var": "VAR_RUSTBORO_CITY_STATE",
      "var_value": "7",
      "script": "RustboroCity_EventScript_RivalTrigger7"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 23,
      "y": 19,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_EventScript_GymSign"
    },
    {
      "type": "sign",
      "x": 25,
      "y": 35,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_EventScript_TrainersSchoolSign"
    },
    {
      "type": "sign",
      "x": 17,
      "y": 45,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    },
    {
      "type": "sign",
      "x": 18,
      "y": 38,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 19,
      "y": 49,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_EventScript_CitySign"
    },
    {
      "type": "sign",
      "x": 18,
      "y": 45,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    },
    {
      "type": "sign",
      "x": 17,
      "y": 38,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 17,
      "y": 20,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_EventScript_DevonCorpSign"
    },
    {
      "type": "sign",
      "x": 30,
      "y": 8,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_EventScript_TunnelSign"
    },
    {
      "type": "sign",
      "x": 12,
      "y": 38,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_EventScript_CuttersHouseSign"
    }
  ],
  "warp_events": [
    {
      "x": 27,
      "y": 19,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_GYM",
      "dest_warp_id": "0"
    },
    {
      "x": 13,
      "y": 30,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT1_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 16,
      "y": 45,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_MART",
      "dest_warp_id": "0"
    },
    {
      "x": 16,
      "y": 38,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_POKEMON_CENTER_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 27,
      "y": 34,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_POKEMON_SCHOOL",
      "dest_warp_id": "0"
    },
    {
      "x": 11,
      "y": 15,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_DEVON_CORP_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 12,
      "y": 15,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_DEVON_CORP_1F",
      "dest_warp_id": "1"
    },
    {
      "x": 33,
      "y": 19,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_HOUSE1",
      "dest_warp_id": "0"
    },
    {
      "x": 9,
      "y": 38,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_CUTTERS_HOUSE",
      "dest_warp_id": "0"
    },
    {
      "x": 30,
      "y": 28,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_HOUSE2",
      "dest_warp_id": "0"
    },
    {
      "x": 5,
      "y": 51,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT2_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 26,
      "y": 46,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_HOUSE3",
      "dest_warp_id": "0"
    }
  ]
}
```

### RustboroCity_CuttersHouse

来源：`data/maps/RustboroCity_CuttersHouse/map.json`，SHA-256 `c9a9f4477cd3a913bd4e5736cf17c82551c1d48d307b21294494241cf5355326`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 7,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_CuttersHouse_EventScript_Cutter",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_LASS",
      "x": 9,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_CuttersHouse_EventScript_Lass",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 5,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "8"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "8"
    }
  ]
}
```

### RustboroCity_DevonCorp_1F

来源：`data/maps/RustboroCity_DevonCorp_1F/map.json`，SHA-256 `c6e155e276a99d63856feb211682331cfc89a409fe566f860615d2773cd5b193`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_DEVON_EMPLOYEE",
      "x": 2,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_1F_EventScript_Employee",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_DEVON_CORP_STAIR_GUARD",
      "graphics_id": "OBJ_EVENT_GFX_DEVON_EMPLOYEE",
      "x": 15,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 2,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_1F_EventScript_StairGuard",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_3",
      "x": 5,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_1F_EventScript_Greeter",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 3,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_DevonCorp_1F_EventScript_ProductsDisplay"
    },
    {
      "type": "sign",
      "x": 8,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_DevonCorp_1F_EventScript_RocksMetalDisplay"
    }
  ],
  "warp_events": [
    {
      "x": 5,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "5"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "6"
    },
    {
      "x": 14,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_DEVON_CORP_2F",
      "dest_warp_id": "0"
    }
  ]
}
```

### RustboroCity_DevonCorp_2F

来源：`data/maps/RustboroCity_DevonCorp_2F/map.json`，SHA-256 `8fccc0122798e97175808ee923a19b2be63388aa953d00e6ca8231f971486238`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 6,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_2F_EventScript_TalkToPokemonScientist",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 1,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_2F_EventScript_BallScientist",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 2,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP_AND_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_2F_EventScript_PokenavScientist",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 10,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 10,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_2F_EventScript_PokemonDreamsScientist",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_FOSSIL_SCIENTIST",
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 14,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_2F_EventScript_FossilScientist",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 14,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_2F_EventScript_MatchCallScientist",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 14,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_DEVON_CORP_1F",
      "dest_warp_id": "2"
    },
    {
      "x": 2,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_DEVON_CORP_3F",
      "dest_warp_id": "0"
    }
  ]
}
```

### RustboroCity_Flat2_1F

来源：`data/maps/RustboroCity_Flat2_1F/map.json`，SHA-256 `f786448f4f86f5d1839d108df22cc68cf3083eb25d2e191e597bb26dbb843a28`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_SKITTY",
      "x": 11,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat2_1F_EventScript_Skitty",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_OLD_WOMAN",
      "x": 8,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat2_1F_EventScript_OldWoman",
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
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "10"
    },
    {
      "x": 3,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "10"
    },
    {
      "x": 3,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT2_2F",
      "dest_warp_id": "0"
    }
  ]
}
```

### RustboroCity_Flat2_2F

来源：`data/maps/RustboroCity_Flat2_2F/map.json`，SHA-256 `c0b2e9e8c051b4cdd58257747ccaa811daee1fbbe0a51b297ac0e3e00ea83927`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_OLD_MAN",
      "x": 11,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat2_2F_EventScript_OldMan",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_NINJA_BOY",
      "x": 7,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 2,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat2_2F_EventScript_NinjaBoy",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 3,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT2_1F",
      "dest_warp_id": "2"
    },
    {
      "x": 1,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT2_3F",
      "dest_warp_id": "0"
    }
  ]
}
```

### RustboroCity_House3

来源：`data/maps/RustboroCity_House3/map.json`，SHA-256 `ed4ddef3c3e4a719968b77cff3da317d2f4b2d0b044c89ae8b91b0e470b4ef58`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_OLD_MAN",
      "x": 4,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_House3_EventScript_OldMan",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_OLD_WOMAN",
      "x": 7,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_House3_EventScript_OldWoman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_PIKACHU",
      "x": 4,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_House3_EventScript_Pekachu",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 5,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "11"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "11"
    }
  ]
}
```

### RustboroCity_PokemonSchool

来源：`data/maps/RustboroCity_PokemonSchool/map.json`，SHA-256 `d79f2803b48b51a4a9b7a079690f1cd7a71d652b285fc0acb7af2fb8ef9fe9a1`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_GAMEBOY_KID",
      "x": 8,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonSchool_EventScript_GameboyKid1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GAMEBOY_KID",
      "x": 9,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonSchool_EventScript_GameboyKid2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_RICH_BOY",
      "x": 3,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonSchool_EventScript_RichBoy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_LASS",
      "x": 10,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonSchool_EventScript_Lass",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCHOOL_KID_M",
      "x": 3,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonSchool_EventScript_SchoolKidM",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GENTLEMAN",
      "x": 5,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonSchool_EventScript_Teacher",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCOTT",
      "x": 0,
      "y": 10,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonSchool_EventScript_Scott",
      "flag": "FLAG_HIDE_RUSTBORO_CITY_POKEMON_SCHOOL_SCOTT"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 5,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_PokemonSchool_EventScript_Blackboard"
    },
    {
      "type": "sign",
      "x": 4,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_PokemonSchool_EventScript_Blackboard"
    },
    {
      "type": "sign",
      "x": 6,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_PokemonSchool_EventScript_Blackboard"
    },
    {
      "type": "sign",
      "x": 7,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_PokemonSchool_EventScript_Blackboard"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 5,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_PokemonSchool_EventScript_StudentNotebook"
    }
  ],
  "warp_events": [
    {
      "x": 5,
      "y": 10,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "4"
    },
    {
      "x": 6,
      "y": 10,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "4"
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

## `Common_Movement_FaceOriginalDirection`

`data/scripts/movement.inc:23`，类型 `movement`，SHA-256 `1ee4b39a096048f56afe94b2a8417f524b89a988a0cad0494a2aa48e30a68e95`。

```asm
Common_Movement_FaceOriginalDirection:
	face_original_direction
	step_end
```

## `Common_Movement_WalkInPlaceFasterDown`

`data/scripts/movement.inc:39`，类型 `movement`，SHA-256 `dc710a76327722587934027c27867bea1f8ab4e6f872d5942a6e045b4dadd9ba`。

```asm
Common_Movement_WalkInPlaceFasterDown:
	walk_in_place_faster_down
	step_end
```

## `DewfordTown_House1_EventScript_Zigzagoon`

`data/maps/DewfordTown_House1/scripts.inc:12`，类型 `script`，SHA-256 `33fad035e7d1f87f63d3f66b776a95263286a19878f9accb8f59c9a678d8feaa`。

```asm
DewfordTown_House1_EventScript_Zigzagoon::
	lock
	faceplayer
	waitse
	playmoncry SPECIES_ZIGZAGOON, CRY_MODE_NORMAL
	msgbox DewfordTown_House1_Text_Zigzagoon, MSGBOX_DEFAULT
	waitmoncry
	release
	end
```

## `DewfordTown_House1_Text_Zigzagoon`

`data/maps/DewfordTown_House1/scripts.inc:34`，类型 `text`，SHA-256 `c93e213a4ee16bb2b7b83b5faf386f1f486d69eeb9950ea9fa75924583d16849`。

```asm
DewfordTown_House1_Text_Zigzagoon:
	.string "ZIGZAGOON: Guguuh!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ZIGZAGOON: Guguuh!
```

## `RustboroCity_CuttersHouse_EventScript_Cutter`

`data/maps/RustboroCity_CuttersHouse/scripts.inc:4`，类型 `script`，SHA-256 `c39468b3bf364526c279248bb5121725b59b2fcd1425ad9db502d2b19e10f0f7`。

```asm
RustboroCity_CuttersHouse_EventScript_Cutter::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_HM_CUT, RustboroCity_CuttersHouse_EventScript_ExplainCut
	msgbox RustboroCity_CuttersHouse_Text_YouCanPutThisHMToGoodUse, MSGBOX_DEFAULT
	giveitem ITEM_HM_CUT
	setflag FLAG_RECEIVED_HM_CUT
	msgbox RustboroCity_CuttersHouse_Text_ExplainCut, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_CuttersHouse_EventScript_ExplainCut`

`data/maps/RustboroCity_CuttersHouse/scripts.inc:15`，类型 `script`，SHA-256 `eac0c4c72b99171cb8e1f3346ddd3e3a15209931efea7344b510b8e4803572f5`。

```asm
RustboroCity_CuttersHouse_EventScript_ExplainCut::
	msgbox RustboroCity_CuttersHouse_Text_ExplainCut, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_CuttersHouse_Text_ExplainCut`

`data/maps/RustboroCity_CuttersHouse/scripts.inc:36`，类型 `text`，SHA-256 `7f1b68c79365936d95c9952a1634db5cfad1f7c32264ba7fa0beda19cb38bcec`。

```asm
RustboroCity_CuttersHouse_Text_ExplainCut:
	.string "That HIDDEN MACHINE, or HM for\n"
	.string "short, is CUT.\p"
	.string "An HM move is one that can be used\n"
	.string "by POKéMON outside of battle.\p"
	.string "Any POKéMON that's learned CUT can\n"
	.string "chop down thin trees if the TRAINER\l"
	.string "has earned the STONE BADGE.\p"
	.string "And, unlike a TM, an HM can be used\n"
	.string "more than once.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
That HIDDEN MACHINE, or HM for
short, is CUT.

An HM move is one that can be used
by POKéMON outside of battle.

Any POKéMON that's learned CUT can
chop down thin trees if the TRAINER
has earned the STONE BADGE.

And, unlike a TM, an HM can be used
more than once.
```

## `RustboroCity_CuttersHouse_Text_YouCanPutThisHMToGoodUse`

`data/maps/RustboroCity_CuttersHouse/scripts.inc:24`，类型 `text`，SHA-256 `9d26b6280610a28e216d4dd80745cbb3fedf2952b18f93dc636dd83b9db1cddb`。

```asm
RustboroCity_CuttersHouse_Text_YouCanPutThisHMToGoodUse:
	.string "That determined expression…\n"
	.string "That limber way you move…\l"
	.string "And your well-trained POKéMON…\p"
	.string "You're obviously a skilled TRAINER!\p"
	.string "No, wait, don't say a word.\n"
	.string "I can tell just by looking at you.\p"
	.string "I'm sure that you can put this\n"
	.string "HIDDEN MACHINE to good use.\p"
	.string "No need to be modest or shy.\n"
	.string "Go on, take it!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
That determined expression…
That limber way you move…
And your well-trained POKéMON…

You're obviously a skilled TRAINER!

No, wait, don't say a word.
I can tell just by looking at you.

I'm sure that you can put this
HIDDEN MACHINE to good use.

No need to be modest or shy.
Go on, take it!
```

## `RustboroCity_DevonCorp_1F_EventScript_AlwaysWelcome`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:43`，类型 `script`，SHA-256 `2bd7d557cf0d58b0866be811b7ee18efb1ebd9b690b92638df905d1b36c74571`。

```asm
RustboroCity_DevonCorp_1F_EventScript_AlwaysWelcome::
	msgbox RustboroCity_DevonCorp_1F_Text_YoureAlwaysWelcomeHere, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_Employee`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:14`，类型 `script`，SHA-256 `a3cd6bda75b11828a6f3ca91d1209bec842b55cd45d6d0037b87aa5b5322e600`。

```asm
RustboroCity_DevonCorp_1F_EventScript_Employee::
	lock
	faceplayer
	goto_if_set FLAG_RETURNED_DEVON_GOODS, RustboroCity_DevonCorp_1F_EventScript_GoodsRecovered
	goto_if_set FLAG_DEVON_GOODS_STOLEN, RustboroCity_DevonCorp_1F_EventScript_RobberWasntBright
	msgbox RustboroCity_DevonCorp_1F_Text_ThoseShoesAreOurProduct, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_GoodsRecovered`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:28`，类型 `script`，SHA-256 `0e3ac16a4b41209c26158c2ed8b8b1102f774c8cd8e5bc4af46ee83bcf9d4e6e`。

```asm
RustboroCity_DevonCorp_1F_EventScript_GoodsRecovered::
	msgbox RustboroCity_DevonCorp_1F_Text_SoundsLikeStolenGoodsRecovered, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_GotRobbed`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:48`，类型 `script`，SHA-256 `d0b1861b42f574e0a729fa622fb8b5eb32445bd1f815195a8e5911bc6cf02766`。

```asm
RustboroCity_DevonCorp_1F_EventScript_GotRobbed::
	msgbox RustboroCity_DevonCorp_1F_Text_HowCouldWeGetRobbed, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_Greeter`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:53`，类型 `script`，SHA-256 `2e3a9a581cc9ba9d315591262aa04a3ed594b3bb6d1ecdabeb123789a2495d83`。

```asm
RustboroCity_DevonCorp_1F_EventScript_Greeter::
	lock
	faceplayer
	goto_if_set FLAG_RETURNED_DEVON_GOODS, RustboroCity_DevonCorp_1F_EventScript_WelcomeToDevonCorp
	goto_if_set FLAG_RECOVERED_DEVON_GOODS, RustboroCity_DevonCorp_1F_EventScript_StaffGotRobbed
	goto_if_set FLAG_DEVON_GOODS_STOLEN, RustboroCity_DevonCorp_1F_EventScript_StaffGotRobbed
	msgbox RustboroCity_DevonCorp_1F_Text_WelcomeToDevonCorp, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_RobberWasntBright`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:23`，类型 `script`，SHA-256 `6e9d6453d10ccc177d000573b2dd310e986207e08a06b89f121ed150ef317f85`。

```asm
RustboroCity_DevonCorp_1F_EventScript_RobberWasntBright::
	msgbox RustboroCity_DevonCorp_1F_Text_RobberWasntVeryBright, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_StaffGotRobbed`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:68`，类型 `script`，SHA-256 `2f9fdc4e5287bcac3681cd10e32aad791fb1660e96abe200f374e87e448e0c59`。

```asm
RustboroCity_DevonCorp_1F_EventScript_StaffGotRobbed::
	msgbox RustboroCity_DevonCorp_1F_Text_StaffGotRobbed, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_StairGuard`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:33`，类型 `script`，SHA-256 `8f28c1150be13884f3fc46040d688bf2b7c84ab9baeae077d7e6c15491d8fffa`。

```asm
RustboroCity_DevonCorp_1F_EventScript_StairGuard::
	lock
	faceplayer
	goto_if_set FLAG_RETURNED_DEVON_GOODS, RustboroCity_DevonCorp_1F_EventScript_AlwaysWelcome
	goto_if_set FLAG_RECOVERED_DEVON_GOODS, RustboroCity_DevonCorp_1F_EventScript_GotRobbed
	goto_if_set FLAG_DEVON_GOODS_STOLEN, RustboroCity_DevonCorp_1F_EventScript_GotRobbed
	msgbox RustboroCity_DevonCorp_1F_Text_OnlyAuthorizedPeopleEnter, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_WelcomeToDevonCorp`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:63`，类型 `script`，SHA-256 `a51a7a06a1fb7dbbc02c44e941d11ef4f240ca88a7459b88815e3a09baa2a77d`。

```asm
RustboroCity_DevonCorp_1F_EventScript_WelcomeToDevonCorp::
	msgbox RustboroCity_DevonCorp_1F_Text_WelcomeToDevonCorp, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_1F_Text_HowCouldWeGetRobbed`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:112`，类型 `text`，SHA-256 `a91ded6a38630fb23f95ae4c6aab6bb447c0151b529c5fa656ee87f1e88f0073`。

```asm
RustboroCity_DevonCorp_1F_Text_HowCouldWeGetRobbed:
	.string "It's beyond stupid.\n"
	.string "How could we get robbed?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's beyond stupid.
How could we get robbed?
```

## `RustboroCity_DevonCorp_1F_Text_OnlyAuthorizedPeopleEnter`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:108`，类型 `text`，SHA-256 `536a5c245cdc8681704cc7bfecb149a3afa198abb66c3b6cf23ce67ce931c483`。

```asm
RustboroCity_DevonCorp_1F_Text_OnlyAuthorizedPeopleEnter:
	.string "I'm sorry, only authorized people\n"
	.string "are allowed to enter here.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm sorry, only authorized people
are allowed to enter here.
```

## `RustboroCity_DevonCorp_1F_Text_RobberWasntVeryBright`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:97`，类型 `text`，SHA-256 `850fd466406b9fc2bf6db2f47ef8e168901536158a0ff4de4753b94d29ae404a`。

```asm
RustboroCity_DevonCorp_1F_Text_RobberWasntVeryBright:
	.string "That stolen parcel…\p"
	.string "Well, sure it's important, but it's not\n"
	.string "anything that anyone can use.\p"
	.string "In my estimation, that robber must not\n"
	.string "have been very bright.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
That stolen parcel…

Well, sure it's important, but it's not
anything that anyone can use.

In my estimation, that robber must not
have been very bright.
```

## `RustboroCity_DevonCorp_1F_Text_SoundsLikeStolenGoodsRecovered`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:104`，类型 `text`，SHA-256 `b593ae66014a15ce3a31fb10443b86e9d82250c6f489e4f40a12d83060eb1b74`。

```asm
RustboroCity_DevonCorp_1F_Text_SoundsLikeStolenGoodsRecovered:
	.string "It sounds like they've recovered\n"
	.string "the ripped-off DEVON GOODS.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It sounds like they've recovered
the ripped-off DEVON GOODS.
```

## `RustboroCity_DevonCorp_1F_Text_StaffGotRobbed`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:87`，类型 `text`，SHA-256 `b58772c1cb2b27d17de9398486bd497632cb6d7ba265774b1a24ab620a852a9f`。

```asm
RustboroCity_DevonCorp_1F_Text_StaffGotRobbed:
	.string "One of our research staff stupidly\n"
	.string "got robbed of an important parcel.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
One of our research staff stupidly
got robbed of an important parcel.
```

## `RustboroCity_DevonCorp_1F_Text_ThoseShoesAreOurProduct`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:91`，类型 `text`，SHA-256 `32eff21b35f69c5e3eed6f366d0f270968816dfacdb4aa9b5b5130cad76194f7`。

```asm
RustboroCity_DevonCorp_1F_Text_ThoseShoesAreOurProduct:
	.string "Hey, those RUNNING SHOES!\n"
	.string "They're one of our products!\p"
	.string "It makes me happy when I see someone\n"
	.string "using something we made.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hey, those RUNNING SHOES!
They're one of our products!

It makes me happy when I see someone
using something we made.
```

## `RustboroCity_DevonCorp_1F_Text_WelcomeToDevonCorp`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:81`，类型 `text`，SHA-256 `3ce09177e48c33916ca3f6d679a6f79949b9f43edc40e77f20d2098297b6bdae`。

```asm
RustboroCity_DevonCorp_1F_Text_WelcomeToDevonCorp:
	.string "Hello and welcome to the DEVON\n"
	.string "CORPORATION.\p"
	.string "We're proud producers of items and\n"
	.string "medicine that enhance your life.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hello and welcome to the DEVON
CORPORATION.

We're proud producers of items and
medicine that enhance your life.
```

## `RustboroCity_DevonCorp_1F_Text_YoureAlwaysWelcomeHere`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:116`，类型 `text`，SHA-256 `53ca5cfa10c60bb6e379b2608b8ebed3fbe75e816529e014634516f53475a74c`。

```asm
RustboroCity_DevonCorp_1F_Text_YoureAlwaysWelcomeHere:
	.string "Hi, there!\n"
	.string "You're always welcome here!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hi, there!
You're always welcome here!
```

## `RustboroCity_DevonCorp_2F_EventScript_BallScientist`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:21`，类型 `script`，SHA-256 `4f16f46c13a7908e219551dccfb2096648ae748ce5853ebaa6a538a36c79ce66`。

```asm
RustboroCity_DevonCorp_2F_EventScript_BallScientist::
	lock
	faceplayer
	call_if_eq VAR_FOSSIL_RESURRECTION_STATE, 1, RustboroCity_DevonCorp_2F_EventScript_SetFossilReady
	goto_if_set FLAG_MET_DEVON_EMPLOYEE, RustboroCity_DevonCorp_2F_EventScript_DevelopedBalls
	msgbox RustboroCity_DevonCorp_2F_Text_DevelopingNewBalls, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_EventScript_DevelopedBalls`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:30`，类型 `script`，SHA-256 `d3b8de28a206fc7d672db8fa765860947bdb1f449830881ae93ea03c44e546ef`。

```asm
RustboroCity_DevonCorp_2F_EventScript_DevelopedBalls::
	msgbox RustboroCity_DevonCorp_2F_Text_WeFinallyMadeNewBalls, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_EventScript_HasPokenav`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:44`，类型 `script`，SHA-256 `79c00de6e81a220166da1cfdd17648ae14d478a6fad87601d0589f5cce437547`。

```asm
RustboroCity_DevonCorp_2F_EventScript_HasPokenav::
	msgbox RustboroCity_DevonCorp_2F_Text_WowThatsAPokenav, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_EventScript_MatchCallScientist`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:253`，类型 `script`，SHA-256 `bccc0c63d48c22e214c3dbbe48620e59762a8317d719027b6e18ae1934b786a1`。

```asm
RustboroCity_DevonCorp_2F_EventScript_MatchCallScientist::
	lock
	faceplayer
	call_if_eq VAR_FOSSIL_RESURRECTION_STATE, 1, RustboroCity_DevonCorp_2F_EventScript_SetFossilReady
	goto_if_ge VAR_RUSTBORO_CITY_STATE, 6, RustboroCity_DevonCorp_2F_EventScript_WorkOnNext
	msgbox RustboroCity_DevonCorp_2F_Text_DevelopNewPokenavFeature, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_EventScript_PokemonDreamsScientist`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:49`，类型 `script`，SHA-256 `480e89b6f25cc9ced536e1feb3785cb2452a8812ab4e4fbdeef0ac21452e6113`。

```asm
RustboroCity_DevonCorp_2F_EventScript_PokemonDreamsScientist::
	lock
	faceplayer
	call_if_eq VAR_FOSSIL_RESURRECTION_STATE, 1, RustboroCity_DevonCorp_2F_EventScript_SetFossilReady
	msgbox RustboroCity_DevonCorp_2F_Text_DeviceToVisualizePokemonDreams, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_EventScript_PokenavScientist`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:35`，类型 `script`，SHA-256 `ad3a2fbaeae67700581e3ad39fca64fbca633702fdb3142360ed03ef5e888ab5`。

```asm
RustboroCity_DevonCorp_2F_EventScript_PokenavScientist::
	lock
	faceplayer
	call_if_eq VAR_FOSSIL_RESURRECTION_STATE, 1, RustboroCity_DevonCorp_2F_EventScript_SetFossilReady
	goto_if_set FLAG_RECEIVED_POKENAV, RustboroCity_DevonCorp_2F_EventScript_HasPokenav
	msgbox RustboroCity_DevonCorp_2F_Text_IMadePokenav, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_EventScript_SetFossilReady`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:9`，类型 `script`，SHA-256 `f78133ef2b4c541e875130d094a32f0ca550beff64b3ea77a312f4c3b885ca8a`。

```asm
RustboroCity_DevonCorp_2F_EventScript_SetFossilReady::
	setvar VAR_FOSSIL_RESURRECTION_STATE, 2
	return
```

## `RustboroCity_DevonCorp_2F_EventScript_TalkToPokemonScientist`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:13`，类型 `script`，SHA-256 `7e4bb113ac4434d47115cf2464f566ea402b04a8d700434ddcf85a5f5acc1ce0`。

```asm
RustboroCity_DevonCorp_2F_EventScript_TalkToPokemonScientist::
	lock
	faceplayer
	call_if_eq VAR_FOSSIL_RESURRECTION_STATE, 1, RustboroCity_DevonCorp_2F_EventScript_SetFossilReady
	msgbox RustboroCity_DevonCorp_2F_Text_DeviceForTalkingToPokemon, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_EventScript_WorkOnNext`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:262`，类型 `script`，SHA-256 `63acea7db4dae66fa661d79f373893378bcf3dc3e31492e24fba61095d37ec91`。

```asm
RustboroCity_DevonCorp_2F_EventScript_WorkOnNext::
	msgbox RustboroCity_DevonCorp_2F_Text_WhatToWorkOnNext, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_DevonCorp_2F_Text_DevelopNewPokenavFeature`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:366`，类型 `text`，SHA-256 `7e5cb487c4f2e95abed076244c016f8b56b61b097164b4d4f714f6f5806a16a6`。

```asm
RustboroCity_DevonCorp_2F_Text_DevelopNewPokenavFeature:
	.string "I'm trying to develop a new feature\n"
	.string "for the POKéNAV…\p"
	.string "But it's not going well.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm trying to develop a new feature
for the POKéNAV…

But it's not going well.
```

## `RustboroCity_DevonCorp_2F_Text_DevelopingNewBalls`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:272`，类型 `text`，SHA-256 `fcd5884df8acd9c9e3bb2f5f282d778a857aceecbcd871d0764fe9ac4a3170c3`。

```asm
RustboroCity_DevonCorp_2F_Text_DevelopingNewBalls:
	.string "I'm developing new kinds of\n"
	.string "POKé BALLS…\p"
	.string "But I haven't made much headway…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm developing new kinds of
POKé BALLS…

But I haven't made much headway…
```

## `RustboroCity_DevonCorp_2F_Text_DeviceForTalkingToPokemon`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:267`，类型 `text`，SHA-256 `cab903aa3402699f7f37adb77ee858062fbc8ba873bf5d69320401b6830dbbc6`。

```asm
RustboroCity_DevonCorp_2F_Text_DeviceForTalkingToPokemon:
	.string "We're developing a device for talking\n"
	.string "with POKéMON.\p"
	.string "But we haven't had much success…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
We're developing a device for talking
with POKéMON.

But we haven't had much success…
```

## `RustboroCity_DevonCorp_2F_Text_DeviceToVisualizePokemonDreams`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:304`，类型 `text`，SHA-256 `faf249625644478144602d1894534c769998c4e93737febf05cded250405bcb1`。

```asm
RustboroCity_DevonCorp_2F_Text_DeviceToVisualizePokemonDreams:
	.string "I'm trying to develop a device that\n"
	.string "visually reproduces the dreams of\l"
	.string "POKéMON…\p"
	.string "But it's not going well.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm trying to develop a device that
visually reproduces the dreams of
POKéMON…

But it's not going well.
```

## `RustboroCity_DevonCorp_2F_Text_IMadePokenav`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:288`，类型 `text`，SHA-256 `a247e05e124c7f7a5f2b8b4a8709886bad3c635c177457b9d49e5e7b3fe236ac`。

```asm
RustboroCity_DevonCorp_2F_Text_IMadePokenav:
	.string "I made the POKéNAV!\p"
	.string "As an engineer, I feel blessed to have\n"
	.string "made something so great!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I made the POKéNAV!

As an engineer, I feel blessed to have
made something so great!
```

## `RustboroCity_DevonCorp_2F_Text_WeFinallyMadeNewBalls`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:277`，类型 `text`，SHA-256 `db7cfb87cdecb84cace5a625d53cc71d4b4218f3343d87c81128a013d2abd807`。

```asm
RustboroCity_DevonCorp_2F_Text_WeFinallyMadeNewBalls:
	.string "We finally made new kinds of\n"
	.string "POKé BALLS!\p"
	.string "The REPEAT BALL makes it easier to\n"
	.string "catch POKéMON you've caught before.\p"
	.string "The TIMER BALL gets better at catching\n"
	.string "POKéMON the longer a battle runs.\p"
	.string "Both are proudly developed by\n"
	.string "the DEVON CORPORATION.\p"
	.string "Please give them a try!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
We finally made new kinds of
POKé BALLS!

The REPEAT BALL makes it easier to
catch POKéMON you've caught before.

The TIMER BALL gets better at catching
POKéMON the longer a battle runs.

Both are proudly developed by
the DEVON CORPORATION.

Please give them a try!
```

## `RustboroCity_DevonCorp_2F_Text_WhatToWorkOnNext`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:371`，类型 `text`，SHA-256 `dad5a02559287ec98f7c66abea855a2c42e3217d5815d5c67f40870697a275da`。

```asm
RustboroCity_DevonCorp_2F_Text_WhatToWorkOnNext:
	.string "Well, now what shall I work on\n"
	.string "developing next?\p"
	.string "Our company allows us to make our\n"
	.string "inspirations into reality.\p"
	.string "One couldn't ask for a better\n"
	.string "environment as an engineer.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Well, now what shall I work on
developing next?

Our company allows us to make our
inspirations into reality.

One couldn't ask for a better
environment as an engineer.
```

## `RustboroCity_DevonCorp_2F_Text_WowThatsAPokenav`

`data/maps/RustboroCity_DevonCorp_2F/scripts.inc:293`，类型 `text`，SHA-256 `be9687f7c2a994d7b8101e6a2d6ac528a49c562236d46ed0bdd69c5075e9d19f`。

```asm
RustboroCity_DevonCorp_2F_Text_WowThatsAPokenav:
	.string "Oh, wow!\n"
	.string "That's a POKéNAV!\p"
	.string "It came about as a result of our\n"
	.string "PRESIDENT's desire to learn about\l"
	.string "the feelings of POKéMON.\p"
	.string "Would you like me to describe its\n"
	.string "features in detail?\p"
	.string "No, no. I think you'll find out just by\n"
	.string "trying the POKéNAV out.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Oh, wow!
That's a POKéNAV!

It came about as a result of our
PRESIDENT's desire to learn about
the feelings of POKéMON.

Would you like me to describe its
features in detail?

No, no. I think you'll find out just by
trying the POKéNAV out.
```

## `RustboroCity_EventScript_Boy2`

`data/maps/RustboroCity/scripts.inc:158`，类型 `script`，SHA-256 `a3610283bd0fd1d60fcc0a3559911f47dc92b7d8ad477e1eebfc8e314e8dbf35`。

```asm
RustboroCity_EventScript_Boy2::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_POKENAV, RustboroCity_EventScript_Boy2BrineyLeftTunnel
	msgbox RustboroCity_Text_MrBrineyWalksInTheTunnel, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_EventScript_Boy2BrineyLeftTunnel`

`data/maps/RustboroCity/scripts.inc:166`，类型 `script`，SHA-256 `230ec9008242a50cfbfea5fb64a9d92666e6885da7c931b2bd84049518e8c880`。

```asm
RustboroCity_EventScript_Boy2BrineyLeftTunnel::
	msgbox RustboroCity_Text_MrBrineyLovesPeeko, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_EventScript_FatMan`

`data/maps/RustboroCity/scripts.inc:121`，类型 `script`，SHA-256 `8d1761d65ff1114503542dcbebfffc3d286097558bfed63873905867e686a251`。

```asm
RustboroCity_EventScript_FatMan::
	lock
	faceplayer
	goto_if_set FLAG_DEVON_GOODS_STOLEN, RustboroCity_EventScript_FatManSawGrunt
	msgbox RustboroCity_Text_WeShortenItToDevon, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_EventScript_FatManSawGrunt`

`data/maps/RustboroCity/scripts.inc:129`，类型 `script`，SHA-256 `bb42853e547a596210cca6ffa67653a742e89cc0fc0fb2400e792e6cf8e04f7b`。

```asm
RustboroCity_EventScript_FatManSawGrunt::
	msgbox RustboroCity_Text_SneakyLookingManWentAroundCorner, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_EventScript_LittleBoy`

`data/maps/RustboroCity/scripts.inc:208`，类型 `script`，SHA-256 `43c5a6d03eae50c99f27613c2e3e749a77b45aa5b6fc2fd89ae07ed4a99eda26`。

```asm
RustboroCity_EventScript_LittleBoy::
	lock
	faceplayer
	msgbox RustboroCity_Text_PokemonCanChangeLookFromExp, MSGBOX_DEFAULT
	applywaitmovement LOCALID_RUSTBORO_LITTLE_BOY, Common_Movement_FaceOriginalDirection
	release
	end
```

## `RustboroCity_EventScript_LittleGirl`

`data/maps/RustboroCity/scripts.inc:216`，类型 `script`，SHA-256 `02d065b56033cfb25e30702d5228832d6de5ee0d8a75a3d0f21dd95bdca50c95`。

```asm
RustboroCity_EventScript_LittleGirl::
	lock
	faceplayer
	msgbox RustboroCity_Text_PokemonChangeShape, MSGBOX_DEFAULT
	applywaitmovement LOCALID_RUSTBORO_LITTLE_GIRL, Common_Movement_FaceOriginalDirection
	release
	end
```

## `RustboroCity_EventScript_Man1`

`data/maps/RustboroCity/scripts.inc:145`，类型 `script`，SHA-256 `2f1d93e1d7cdb886977cb3d0f038938719b1f3289aa497e4231c0880fbca9a1c`。

```asm
RustboroCity_EventScript_Man1::
	lock
	faceplayer
	goto_if_set FLAG_BADGE01_GET, RustboroCity_EventScript_Man1HaveBadge
	msgbox RustboroCity_Text_HaveYouChallengedGym, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_EventScript_Man1HaveBadge`

`data/maps/RustboroCity/scripts.inc:153`，类型 `script`，SHA-256 `b61b0eeb0b68d4ebf34c64881bb3af5162040c4996b39b61c4ac80d7aefb91ff`。

```asm
RustboroCity_EventScript_Man1HaveBadge::
	msgbox RustboroCity_Text_HeyThatsRustborosGymBadge, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_Flat2_1F_EventScript_Skitty`

`data/maps/RustboroCity_Flat2_1F/scripts.inc:8`，类型 `script`，SHA-256 `6a6c197981ea1438dff5c1e2477152027a238a8cc76255ef8c6ef391f12cab73`。

```asm
RustboroCity_Flat2_1F_EventScript_Skitty::
	lock
	faceplayer
	waitse
	playmoncry SPECIES_SKITTY, CRY_MODE_NORMAL
	msgbox RustboroCity_Flat2_1F_Text_Skitty, MSGBOX_DEFAULT
	waitmoncry
	release
	end
```

## `RustboroCity_Flat2_1F_Text_Skitty`

`data/maps/RustboroCity_Flat2_1F/scripts.inc:22`，类型 `text`，SHA-256 `2c7cabb8a4db5a50a73378c310cac19fa90a24636effb1d887cffdeb9df66849`。

```asm
RustboroCity_Flat2_1F_Text_Skitty:
	.string "SKITTY: Gyaaaah!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
SKITTY: Gyaaaah!
```

## `RustboroCity_Flat2_2F_EventScript_GavePremierBall`

`data/maps/RustboroCity_Flat2_2F/scripts.inc:19`，类型 `script`，SHA-256 `17db4452bc7fb116be04a2e48a5014bb3543f44a92594b95f174d5f7c5fe0b17`。

```asm
RustboroCity_Flat2_2F_EventScript_GavePremierBall::
	msgbox RustboroCity_Flat2_2F_Text_GoingToWorkAtDevonToo, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_Flat2_2F_EventScript_NinjaBoy`

`data/maps/RustboroCity_Flat2_2F/scripts.inc:8`，类型 `script`，SHA-256 `4e789e3858ac8898319b470f19091361c6cd4b731ef16d2ac84f6310e55a5e56`。

```asm
RustboroCity_Flat2_2F_EventScript_NinjaBoy::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_PREMIER_BALL_RUSTBORO, RustboroCity_Flat2_2F_EventScript_GavePremierBall
	msgbox RustboroCity_Flat2_2F_Text_MyDaddyMadeThisYouCanHaveIt, MSGBOX_DEFAULT
	giveitem ITEM_PREMIER_BALL
	goto_if_eq VAR_RESULT, FALSE, Common_EventScript_ShowBagIsFull
	setflag FLAG_RECEIVED_PREMIER_BALL_RUSTBORO
	release
	end
```

## `RustboroCity_Flat2_2F_Text_GoingToWorkAtDevonToo`

`data/maps/RustboroCity_Flat2_2F/scripts.inc:33`，类型 `text`，SHA-256 `9d4f7fdefec40c6e47b285521afa9d1b00b4f3a8619a22e9c5311427fb6f79a1`。

```asm
RustboroCity_Flat2_2F_Text_GoingToWorkAtDevonToo:
	.string "My daddy's working at the CORPORATION.\p"
	.string "When I grow up, I'm going to work for\n"
	.string "DEVON, too.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
My daddy's working at the CORPORATION.

When I grow up, I'm going to work for
DEVON, too.
```

## `RustboroCity_Flat2_2F_Text_MyDaddyMadeThisYouCanHaveIt`

`data/maps/RustboroCity_Flat2_2F/scripts.inc:28`，类型 `text`，SHA-256 `e3419477e30b2fa0e0eaced843ecb1a50200083ea5c159a704bdb524c904ddd9`。

```asm
RustboroCity_Flat2_2F_Text_MyDaddyMadeThisYouCanHaveIt:
	.string "My daddy's working at the CORPORATION.\p"
	.string "My daddy made this!\n"
	.string "But I can't use it, so you can have it.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
My daddy's working at the CORPORATION.

My daddy made this!
But I can't use it, so you can have it.
```

## `RustboroCity_House3_EventScript_OldWoman`

`data/maps/RustboroCity_House3/scripts.inc:8`，类型 `script`，SHA-256 `c6ca2e872997f39b47a899aaeb2286da659316d5dcef808b2e93d7b229dcf08b`。

```asm
RustboroCity_House3_EventScript_OldWoman::
	msgbox RustboroCity_House3_Text_NamingPikachuPekachu, MSGBOX_NPC
	end

@ Misspelling on purpose, see nickname
```

## `RustboroCity_House3_EventScript_Pekachu`

`data/maps/RustboroCity_House3/scripts.inc:13`，类型 `script`，SHA-256 `0e5c47e7480c9df72ca2ae12e449cc5cafde300842dd2b0439252d67659b54ca`。

```asm
RustboroCity_House3_EventScript_Pekachu::
	lock
	faceplayer
	waitse
	playmoncry SPECIES_PIKACHU, CRY_MODE_NORMAL
	msgbox RustboroCity_House3_Text_Pekachu, MSGBOX_DEFAULT
	waitmoncry
	release
	end
```

## `RustboroCity_House3_Text_NamingPikachuPekachu`

`data/maps/RustboroCity_House3/scripts.inc:29`，类型 `text`，SHA-256 `ca26ec6ca290f6104939922566895b8bc6dc15ff90e05cc4e9b1d988a2144b95`。

```asm
RustboroCity_House3_Text_NamingPikachuPekachu:
	.string "But giving the name PEKACHU to\n"
	.string "a PIKACHU? It seems pointless.\p"
	.string "I suppose it is good to use a name\n"
	.string "that's easy to understand, but…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
But giving the name PEKACHU to
a PIKACHU? It seems pointless.

I suppose it is good to use a name
that's easy to understand, but…
```

## `RustboroCity_House3_Text_Pekachu`

`data/maps/RustboroCity_House3/scripts.inc:35`，类型 `text`，SHA-256 `a32276e3a04b071655a6abce5c7034f3cf8ddef0383ba650a2e578f1967c316d`。

```asm
RustboroCity_House3_Text_Pekachu:
	.string "PEKACHU: Peka!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
PEKACHU: Peka!
```

## `RustboroCity_PokemonSchool_EventScript_GaveQuickClaw`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:100`，类型 `script`，SHA-256 `f682b0b4a93fd903402837e4cfb3b894d98e8f972212fbfb8af245f06f70a5e8`。

```asm
RustboroCity_PokemonSchool_EventScript_GaveQuickClaw::
	msgbox RustboroCity_PokemonSchool_Text_ExplainQuickClaw, MSGBOX_DEFAULT
	closemessage
	applywaitmovement VAR_LAST_TALKED, Common_Movement_WalkInPlaceFasterDown
	release
	end
```

## `RustboroCity_PokemonSchool_EventScript_Teacher`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:77`，类型 `script`，SHA-256 `5e82dd84ad5423b3a1fc15a96644e4b7fbbd4b414179085cfdf6f2360a4f1774`。

```asm
RustboroCity_PokemonSchool_EventScript_Teacher::
	lock
	faceplayer
	goto_if_set FLAG_RECEIVED_QUICK_CLAW, RustboroCity_PokemonSchool_EventScript_GaveQuickClaw
	call_if_eq VAR_FACING, DIR_EAST, RustboroCity_PokemonSchool_EventScript_TeacherCheckOnStudentsEast
	call_if_eq VAR_FACING, DIR_WEST, RustboroCity_PokemonSchool_EventScript_TeacherCheckOnStudentsWest
	msgbox RustboroCity_PokemonSchool_Text_StudentsWhoDontStudyGetQuickClaw, MSGBOX_DEFAULT
	giveitem ITEM_QUICK_CLAW
	goto_if_eq VAR_RESULT, 0, Common_EventScript_ShowBagIsFull
	closemessage
	applywaitmovement VAR_LAST_TALKED, Common_Movement_WalkInPlaceFasterDown
	setflag FLAG_RECEIVED_QUICK_CLAW
	release
	end
```

## `RustboroCity_PokemonSchool_EventScript_TeacherCheckOnStudentsEast`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:92`，类型 `script`，SHA-256 `79b5980d91c147f288b5883b07afbe47df80f96fb6d168fe61e92b0094da5f6e`。

```asm
RustboroCity_PokemonSchool_EventScript_TeacherCheckOnStudentsEast::
	applywaitmovement VAR_LAST_TALKED, RustboroCity_PokemonSchool_Movement_TeacherCheckOnStudentsEast
	return
```

## `RustboroCity_PokemonSchool_EventScript_TeacherCheckOnStudentsWest`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:96`，类型 `script`，SHA-256 `7a48af266f0a3439e9eaa3e6e391e9de4f80b5ee63e9fe40a5c0958e6262a326`。

```asm
RustboroCity_PokemonSchool_EventScript_TeacherCheckOnStudentsWest::
	applywaitmovement VAR_LAST_TALKED, RustboroCity_PokemonSchool_Movement_TeacherCheckOnStudentsWest
	return
```

## `RustboroCity_PokemonSchool_Movement_TeacherCheckOnStudentsEast`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:132`，类型 `movement`，SHA-256 `4c020148026eb6f03da3c1b43da242f87f5abed8a4caad7b9d8d2d01103dbc64`。

```asm
RustboroCity_PokemonSchool_Movement_TeacherCheckOnStudentsEast:
	walk_right
	walk_right
	walk_down
	walk_down
	walk_left
	walk_left
	walk_in_place_faster_down
	delay_16
	delay_16
	delay_16
	walk_down
	walk_in_place_faster_left
	delay_16
	delay_16
	walk_right
	delay_16
	delay_16
	delay_8
	walk_up
	walk_right
	walk_up
	walk_up
	walk_left
	walk_left
	step_end
```

## `RustboroCity_PokemonSchool_Movement_TeacherCheckOnStudentsWest`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:107`，类型 `movement`，SHA-256 `ed9984b32ba826234aec847620de719c09895590dd2d618f4ad2831c188d9e6b`。

```asm
RustboroCity_PokemonSchool_Movement_TeacherCheckOnStudentsWest:
	walk_left
	walk_down
	walk_down
	walk_right
	walk_in_place_faster_down
	delay_16
	delay_16
	delay_16
	walk_down
	walk_in_place_faster_left
	delay_16
	delay_16
	walk_right
	delay_16
	delay_16
	delay_8
	walk_up
	walk_left
	walk_left
	walk_up
	walk_up
	walk_right
	step_end
```

## `RustboroCity_PokemonSchool_Text_ExplainQuickClaw`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:249`，类型 `text`，SHA-256 `1adb014489a3ddd7e737b452f90ea0914c2f8cc0d08bf3e7c0d3b55b05c6066d`。

```asm
RustboroCity_PokemonSchool_Text_ExplainQuickClaw:
	.string "A POKéMON holding the QUICK CLAW will\n"
	.string "occasionally speed up and get to move\l"
	.string "before its opponent.\p"
	.string "There are many other items that are\n"
	.string "meant to be held by POKéMON.\p"
	.string "Just those alone will give you many\n"
	.string "topics to study!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A POKéMON holding the QUICK CLAW will
occasionally speed up and get to move
before its opponent.

There are many other items that are
meant to be held by POKéMON.

Just those alone will give you many
topics to study!
```

## `RustboroCity_PokemonSchool_Text_StudentsWhoDontStudyGetQuickClaw`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:242`，类型 `text`，SHA-256 `8de60238203d3f7e80d9ced54b4ee3298eeb49d416686494b9c33a3cbfbe06dc`。

```asm
RustboroCity_PokemonSchool_Text_StudentsWhoDontStudyGetQuickClaw:
	.string "Students who don't study get a little\n"
	.string "taste of my QUICK CLAW.\p"
	.string "Whether or not you are a good student \n"
	.string "will be evident from the way you use\l"
	.string "this item.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Students who don't study get a little
taste of my QUICK CLAW.

Whether or not you are a good student 
will be evident from the way you use
this item.
```

## `RustboroCity_Text_HaveYouChallengedGym`

`data/maps/RustboroCity/scripts.inc:928`，类型 `text`，SHA-256 `b7e373358829a7aa4731054ebf2fe37c06801a82de41de432639caf8aba7007a`。

```asm
RustboroCity_Text_HaveYouChallengedGym:
	.string "Have you taken the POKéMON GYM\n"
	.string "challenge?\p"
	.string "When you get that shiny GYM BADGE\n"
	.string "in hand, I guess TRAINERS begin to\l"
	.string "realize what is required of them.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Have you taken the POKéMON GYM
challenge?

When you get that shiny GYM BADGE
in hand, I guess TRAINERS begin to
realize what is required of them.
```

## `RustboroCity_Text_HeyThatsRustborosGymBadge`

`data/maps/RustboroCity/scripts.inc:935`，类型 `text`，SHA-256 `f4fbccffb496d0e9c8515dce62347d135d5b92ee7b3ee096f4c8b57870705524`。

```asm
RustboroCity_Text_HeyThatsRustborosGymBadge:
	.string "Hey, that's RUSTBORO's GYM BADGE!\p"
	.string "Out of all the POKéMON GYM BADGES,\n"
	.string "RUSTBORO's is the coolest, I'd say.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hey, that's RUSTBORO's GYM BADGE!

Out of all the POKéMON GYM BADGES,
RUSTBORO's is the coolest, I'd say.
```

## `RustboroCity_Text_MrBrineyLovesPeeko`

`data/maps/RustboroCity/scripts.inc:959`，类型 `text`，SHA-256 `ca2d51632991a1b4706fc742a4c4a629f43f98481091bd9161941d73e68d615f`。

```asm
RustboroCity_Text_MrBrineyLovesPeeko:
	.string "The old sailor MR. BRINEY lives in\n"
	.string "a cottage by the sea.\p"
	.string "He said he was going shopping in\n"
	.string "SLATEPORT for his pet, PEEKO.\p"
	.string "That old sea dog, he must really love\n"
	.string "that PEEKO.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The old sailor MR. BRINEY lives in
a cottage by the sea.

He said he was going shopping in
SLATEPORT for his pet, PEEKO.

That old sea dog, he must really love
that PEEKO.
```

## `RustboroCity_Text_MrBrineyWalksInTheTunnel`

`data/maps/RustboroCity/scripts.inc:953`，类型 `text`，SHA-256 `4b7ca5e005a65b9897cf363f85b5efa618f25108608b91589c0e712e945c8e56`。

```asm
RustboroCity_Text_MrBrineyWalksInTheTunnel:
	.string "The old sailor MR. BRINEY lives in\n"
	.string "a cottage by the sea.\p"
	.string "He goes for walks in the tunnel every\n"
	.string "so often.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The old sailor MR. BRINEY lives in
a cottage by the sea.

He goes for walks in the tunnel every
so often.
```

## `RustboroCity_Text_PokemonCanChangeLookFromExp`

`data/maps/RustboroCity/scripts.inc:977`，类型 `text`，SHA-256 `da6ac5e7daeae632afbea3acc2ff30b56dabca600703ab56e5ca602759cad319`。

```asm
RustboroCity_Text_PokemonCanChangeLookFromExp:
	.string "If a POKéMON gains experience in\n"
	.string "battles, it can sometimes change in\l"
	.string "the way it looks.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If a POKéMON gains experience in
battles, it can sometimes change in
the way it looks.
```

## `RustboroCity_Text_PokemonChangeShape`

`data/maps/RustboroCity/scripts.inc:982`，类型 `text`，SHA-256 `b2fbc13adca5a784588c15f37ea10d23d435754ea655a004f1d202ea36065d25`。

```asm
RustboroCity_Text_PokemonChangeShape:
	.string "A POKéMON changes shape?\n"
	.string "If one did that, I would be shocked!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A POKéMON changes shape?
If one did that, I would be shocked!
```

## `RustboroCity_Text_SneakyLookingManWentAroundCorner`

`data/maps/RustboroCity/scripts.inc:923`，类型 `text`，SHA-256 `6587eec7951eef7372d705865fb3f9317efd5984c306251fdc017317c38646b7`。

```asm
RustboroCity_Text_SneakyLookingManWentAroundCorner:
	.string "Hm? A sneaky-looking man?\p"
	.string "Come to think of it, yes, a shady-\n"
	.string "looking guy went around the corner.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hm? A sneaky-looking man?

Come to think of it, yes, a shady-
looking guy went around the corner.
```

## `RustboroCity_Text_WeShortenItToDevon`

`data/maps/RustboroCity/scripts.inc:917`，类型 `text`，SHA-256 `fadc64d98ecd588c24be06b77f6e49226824152ae61e453fb8148c54d7d568a6`。

```asm
RustboroCity_Text_WeShortenItToDevon:
	.string "The DEVON CORPORATION…\n"
	.string "We all just shorten it to DEVON.\p"
	.string "That company makes all sorts of\n"
	.string "convenient products.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The DEVON CORPORATION…
We all just shorten it to DEVON.

That company makes all sorts of
convenient products.
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

### `applywaitmovement`

`asm/macros/event.inc:1999`

```asm
	.macro applywaitmovement localId:req, movements:req, map
	applymovement \localId, \movements, \map
	waitmovement
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

### `goto_if_ge`

`asm/macros/event.inc:1836`

```asm
	.macro goto_if_ge a:req, b, c
	trycompare goto_if, GREATER_THAN_OR_EQUAL, \a, \b, \c
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

### `lock`

`asm/macros/event.inc:908`

```asm
	.macro lock
	.byte SCR_OP_LOCK
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

### `playmoncry`

`asm/macros/event.inc:1338`

```asm
	.macro playmoncry species:req, mode:req
	.byte SCR_OP_PLAYMONCRY
	.2byte \species
	.2byte \mode
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

### `waitmoncry`

`asm/macros/event.inc:1587`

```asm
	.macro waitmoncry
	.byte SCR_OP_WAITMONCRY
	.endm
```

### `waitse`

`asm/macros/event.inc:364`

```asm
	.macro waitse
	.byte SCR_OP_WAITSE
	.endm
```

## 未解析引用

```json
[]
```
