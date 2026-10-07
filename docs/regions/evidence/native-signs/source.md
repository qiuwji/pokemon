# 原作提取证据（自动生成）

固定修订：`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。此文件只展示源数据，不是已完成的游戏剧情。

入口 68；标签 136；未解析引用 0。

中文译文、分支解释和待办写在 review.json；不要手改本文件。

## 地图入口及对象

### DewfordTown

来源：`data/maps/DewfordTown/map.json`，SHA-256 `8220ac4088ddebb37b3f6a695d42f99f7117c239a4b28cfa0931267c0f1c7f25`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 7,
      "y": 12,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_EventScript_Woman",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_DEWFORD_BRINEY",
      "graphics_id": "OBJ_EVENT_GFX_EXPERT_M",
      "x": 12,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "DewfordTown_EventScript_Briney",
      "flag": "FLAG_HIDE_MR_BRINEY_DEWFORD_TOWN"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_FISHERMAN",
      "x": 12,
      "y": 14,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_EventScript_OldRodFisherman",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_DEWFORD_BOAT",
      "graphics_id": "OBJ_EVENT_GFX_MR_BRINEYS_BOAT",
      "x": 12,
      "y": 8,
      "elevation": 1,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_MR_BRINEY_BOAT_DEWFORD_TOWN"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 1,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_EventScript_TrendyPhraseBoy",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 10,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "DewfordTown_EventScript_TownSign"
    },
    {
      "type": "sign",
      "x": 11,
      "y": 16,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "DewfordTown_EventScript_GymSign"
    },
    {
      "type": "sign",
      "x": 4,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 2,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "DewfordTown_EventScript_HallSign"
    }
  ],
  "warp_events": [
    {
      "x": 3,
      "y": 3,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN_HALL",
      "dest_warp_id": "0"
    },
    {
      "x": 2,
      "y": 10,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN_POKEMON_CENTER_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 8,
      "y": 17,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN_GYM",
      "dest_warp_id": "0"
    },
    {
      "x": 17,
      "y": 14,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN_HOUSE1",
      "dest_warp_id": "0"
    },
    {
      "x": 8,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN_HOUSE2",
      "dest_warp_id": "0"
    }
  ]
}
```

### InsideOfTruck

来源：`data/maps/InsideOfTruck/map.json`，SHA-256 `53aca8b0bb6cd5fb7e5272939ee3223dbf60ab82f6f8134a696595538d75f320`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_TRUCK_BOX_TOP",
      "graphics_id": "OBJ_EVENT_GFX_MOVING_BOX",
      "x": 0,
      "y": 0,
      "elevation": 8,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "InsideOfTruck_EventScript_MovingBox",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_TRUCK_BOX_BOTTOM_L",
      "graphics_id": "OBJ_EVENT_GFX_MOVING_BOX",
      "x": 0,
      "y": 3,
      "elevation": 8,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "InsideOfTruck_EventScript_MovingBox",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_TRUCK_BOX_BOTTOM_R",
      "graphics_id": "OBJ_EVENT_GFX_MOVING_BOX",
      "x": 2,
      "y": 3,
      "elevation": 8,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "InsideOfTruck_EventScript_MovingBox",
      "flag": "0"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 3,
      "y": 1,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_INTRO_STATE",
      "var_value": "0",
      "script": "InsideOfTruck_EventScript_SetIntroFlags"
    },
    {
      "type": "trigger",
      "x": 3,
      "y": 2,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_INTRO_STATE",
      "var_value": "0",
      "script": "InsideOfTruck_EventScript_SetIntroFlags"
    },
    {
      "type": "trigger",
      "x": 3,
      "y": 3,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_INTRO_STATE",
      "var_value": "0",
      "script": "InsideOfTruck_EventScript_SetIntroFlags"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 1,
      "y": 0,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "InsideOfTruck_EventScript_MovingBox"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "InsideOfTruck_EventScript_MovingBox"
    },
    {
      "type": "sign",
      "x": 2,
      "y": 3,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "InsideOfTruck_EventScript_MovingBox"
    },
    {
      "type": "sign",
      "x": 0,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "InsideOfTruck_EventScript_MovingBox"
    },
    {
      "type": "sign",
      "x": 0,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "InsideOfTruck_EventScript_MovingBox"
    }
  ],
  "warp_events": [
    {
      "x": 4,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_DYNAMIC",
      "dest_warp_id": "WARP_ID_DYNAMIC"
    },
    {
      "x": 4,
      "y": 2,
      "elevation": 0,
      "dest_map": "MAP_DYNAMIC",
      "dest_warp_id": "WARP_ID_DYNAMIC"
    },
    {
      "x": 4,
      "y": 3,
      "elevation": 0,
      "dest_map": "MAP_DYNAMIC",
      "dest_warp_id": "WARP_ID_DYNAMIC"
    }
  ]
}
```

### LittlerootTown

来源：`data/maps/LittlerootTown/map.json`，SHA-256 `5bdd4157ca532864c0ba4bc8d0246e4b9e55c82e52b4d373d58270836ae9330f`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_LITTLEROOT_TWIN",
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 16,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_EventScript_Twin",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_FAT_MAN",
      "x": 12,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 2,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_EventScript_FatMan",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_FAT_MAN"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 14,
      "y": 17,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 2,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_EventScript_Boy",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_LITTLEROOT_MOM",
      "graphics_id": "OBJ_EVENT_GFX_MOM",
      "x": 5,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_EventScript_Mom",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_MOM_OUTSIDE"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TRUCK",
      "x": 2,
      "y": 10,
      "elevation": 4,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_TRUCK"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TRUCK",
      "x": 11,
      "y": 10,
      "elevation": 4,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_MAYS_HOUSE_TRUCK"
    },
    {
      "local_id": "LOCALID_LITTLEROOT_RIVAL",
      "graphics_id": "OBJ_EVENT_GFX_VAR_0",
      "x": 13,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_RIVAL"
    },
    {
      "local_id": "LOCALID_LITTLEROOT_BIRCH",
      "graphics_id": "OBJ_EVENT_GFX_PROF_BIRCH",
      "x": 14,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BIRCH"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 10,
      "y": 1,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "0",
      "script": "LittlerootTown_EventScript_NeedPokemonTriggerLeft"
    },
    {
      "type": "trigger",
      "x": 11,
      "y": 1,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "0",
      "script": "LittlerootTown_EventScript_NeedPokemonTriggerRight"
    },
    {
      "type": "trigger",
      "x": 11,
      "y": 1,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "1",
      "script": "LittlerootTown_EventScript_GoSaveBirchTrigger"
    },
    {
      "type": "trigger",
      "x": 8,
      "y": 9,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "3",
      "script": "LittlerootTown_EventScript_GiveRunningShoesTrigger4"
    },
    {
      "type": "trigger",
      "x": 9,
      "y": 9,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "3",
      "script": "LittlerootTown_EventScript_GiveRunningShoesTrigger5"
    },
    {
      "type": "trigger",
      "x": 10,
      "y": 9,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "3",
      "script": "LittlerootTown_EventScript_GiveRunningShoesTrigger2"
    },
    {
      "type": "trigger",
      "x": 11,
      "y": 9,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "3",
      "script": "LittlerootTown_EventScript_GiveRunningShoesTrigger3"
    },
    {
      "type": "trigger",
      "x": 10,
      "y": 2,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "3",
      "script": "LittlerootTown_EventScript_GiveRunningShoesTrigger0"
    },
    {
      "type": "trigger",
      "x": 11,
      "y": 2,
      "elevation": 3,
      "var": "VAR_LITTLEROOT_TOWN_STATE",
      "var_value": "3",
      "script": "LittlerootTown_EventScript_GiveRunningShoesTrigger1"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 15,
      "y": 13,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_EventScript_TownSign"
    },
    {
      "type": "sign",
      "x": 6,
      "y": 17,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_EventScript_BirchsLabSign"
    },
    {
      "type": "sign",
      "x": 7,
      "y": 8,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_EventScript_BrendansHouseSign"
    },
    {
      "type": "sign",
      "x": 12,
      "y": 8,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_EventScript_MaysHouseSign"
    }
  ],
  "warp_events": [
    {
      "x": 14,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_LITTLEROOT_TOWN_MAYS_HOUSE_1F",
      "dest_warp_id": "1"
    },
    {
      "x": 5,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_LITTLEROOT_TOWN_BRENDANS_HOUSE_1F",
      "dest_warp_id": "1"
    },
    {
      "x": 7,
      "y": 16,
      "elevation": 0,
      "dest_map": "MAP_LITTLEROOT_TOWN_PROFESSOR_BIRCHS_LAB",
      "dest_warp_id": "0"
    }
  ]
}
```

### LittlerootTown_BrendansHouse_2F

来源：`data/maps/LittlerootTown_BrendansHouse_2F/map.json`，SHA-256 `252e6fabc2391bc95bedcc578c3383abbc42d329743c01e7c0aa3bd2e7724000`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_RIVALS_HOUSE_2F_RIVAL",
      "graphics_id": "OBJ_EVENT_GFX_RIVAL_BRENDAN_NORMAL",
      "x": 7,
      "y": 1,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RivalsHouse_2F_EventScript_Rival",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_RIVAL_BEDROOM"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_0",
      "x": 0,
      "y": 0,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_1"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_1",
      "x": 0,
      "y": 1,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_2"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_2",
      "x": 0,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_3"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_3",
      "x": 0,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_4"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_4",
      "x": 0,
      "y": 4,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_5"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_5",
      "x": 0,
      "y": 5,
      "elevation": 4,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_6"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_6",
      "x": 1,
      "y": 0,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_7"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_7",
      "x": 1,
      "y": 1,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_8"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_8",
      "x": 1,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_9"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_9",
      "x": 1,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_10"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_A",
      "x": 1,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_11"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_VAR_B",
      "x": 1,
      "y": 5,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_DECORATION_12"
    },
    {
      "local_id": "LOCALID_PLAYERS_HOUSE_2F_MOM",
      "graphics_id": "OBJ_EVENT_GFX_MOM",
      "x": 7,
      "y": 1,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_PLAYERS_BEDROOM_MOM"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 3,
      "y": 4,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_BrendansHouse_2F_EventScript_RivalsPokeBall",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_2F_POKE_BALL"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SWABLU_DOLL",
      "x": 5,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_2F_SWABLU_DOLL"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 0,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "LittlerootTown_BrendansHouse_2F_EventScript_PC"
    },
    {
      "type": "sign",
      "x": 1,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "PlayersHouse_2F_EventScript_Notebook"
    },
    {
      "type": "sign",
      "x": 5,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_BrendansHouse_2F_EventScript_WallClock"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "PlayersHouse_2F_EventScript_GameCube"
    }
  ],
  "warp_events": [
    {
      "x": 7,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_LITTLEROOT_TOWN_BRENDANS_HOUSE_1F",
      "dest_warp_id": "2"
    }
  ]
}
```

### LittlerootTown_ProfessorBirchsLab

来源：`data/maps/LittlerootTown_ProfessorBirchsLab/map.json`，SHA-256 `13a03483c8fac9a7a6b169ce70bcdc389d86f652529e2b2bfb9cf29e306c5984`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_BIRCHS_LAB_AIDE",
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 9,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Aide",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_BIRCHS_LAB_BIRCH",
      "graphics_id": "OBJ_EVENT_GFX_PROF_BIRCH",
      "x": 6,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Birch",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BIRCHS_LAB_BIRCH"
    },
    {
      "local_id": "LOCALID_BIRCHS_LAB_RIVAL",
      "graphics_id": "OBJ_EVENT_GFX_VAR_0",
      "x": 7,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Rival",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BIRCHS_LAB_RIVAL"
    },
    {
      "local_id": "LOCALID_BIRCHS_LAB_CYNDAQUIL_BALL",
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 6,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Cyndaquil",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BIRCHS_LAB_POKEBALL_CYNDAQUIL"
    },
    {
      "local_id": "LOCALID_BIRCHS_LAB_TOTODILE_BALL",
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 6,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Totodile",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BIRCHS_LAB_POKEBALL_TOTODILE"
    },
    {
      "local_id": "LOCALID_BIRCHS_LAB_CHIKORITA_BALL",
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 6,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Chikorita",
      "flag": "FLAG_HIDE_LITTLEROOT_TOWN_BIRCHS_LAB_POKEBALL_CHIKORITA"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 10,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Machine"
    },
    {
      "type": "sign",
      "x": 11,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Machine"
    },
    {
      "type": "sign",
      "x": 7,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Book"
    },
    {
      "type": "sign",
      "x": 8,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Book"
    },
    {
      "type": "sign",
      "x": 1,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf"
    },
    {
      "type": "sign",
      "x": 0,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf"
    },
    {
      "type": "sign",
      "x": 1,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf"
    },
    {
      "type": "sign",
      "x": 2,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf"
    },
    {
      "type": "sign",
      "x": 4,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_PC"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_PC"
    },
    {
      "type": "sign",
      "x": 1,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_PC"
    },
    {
      "type": "sign",
      "x": 1,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_PC"
    },
    {
      "type": "sign",
      "x": 11,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_PC"
    },
    {
      "type": "sign",
      "x": 11,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "LittlerootTown_ProfessorBirchsLab_EventScript_PC"
    }
  ],
  "warp_events": [
    {
      "x": 6,
      "y": 12,
      "elevation": 0,
      "dest_map": "MAP_LITTLEROOT_TOWN",
      "dest_warp_id": "2"
    },
    {
      "x": 7,
      "y": 12,
      "elevation": 0,
      "dest_map": "MAP_LITTLEROOT_TOWN",
      "dest_warp_id": "2"
    }
  ]
}
```

### OldaleTown

来源：`data/maps/OldaleTown/map.json`，SHA-256 `8521b74ceafe0a85c637205db2e9afb04746bfb1f7531ab8e71147e767e95996`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_3",
      "x": 16,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_EventScript_Girl",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_OLDALE_MART_EMPLOYEE",
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 13,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_EventScript_MartEmployee",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_FOOTPRINTS_MAN",
      "graphics_id": "OBJ_EVENT_GFX_MANIAC",
      "x": 8,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_EventScript_FootprintsMan",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_OLDALE_RIVAL",
      "graphics_id": "OBJ_EVENT_GFX_VAR_0",
      "x": 11,
      "y": 19,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_EventScript_Rival",
      "flag": "FLAG_HIDE_OLDALE_TOWN_RIVAL"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 0,
      "y": 10,
      "elevation": 3,
      "var": "VAR_OLDALE_TOWN_STATE",
      "var_value": "0",
      "script": "OldaleTown_EventScript_BlockedPath"
    },
    {
      "type": "trigger",
      "x": 8,
      "y": 19,
      "elevation": 3,
      "var": "VAR_OLDALE_RIVAL_STATE",
      "var_value": "1",
      "script": "OldaleTown_EventScript_RivalTrigger1"
    },
    {
      "type": "trigger",
      "x": 9,
      "y": 19,
      "elevation": 3,
      "var": "VAR_OLDALE_RIVAL_STATE",
      "var_value": "1",
      "script": "OldaleTown_EventScript_RivalTrigger2"
    },
    {
      "type": "trigger",
      "x": 10,
      "y": 19,
      "elevation": 3,
      "var": "VAR_OLDALE_RIVAL_STATE",
      "var_value": "1",
      "script": "OldaleTown_EventScript_RivalTrigger3"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 11,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "OldaleTown_EventScript_TownSign"
    },
    {
      "type": "sign",
      "x": 7,
      "y": 16,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 15,
      "y": 6,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    },
    {
      "type": "sign",
      "x": 8,
      "y": 16,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 16,
      "y": 6,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    }
  ],
  "warp_events": [
    {
      "x": 5,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN_HOUSE1",
      "dest_warp_id": "0"
    },
    {
      "x": 15,
      "y": 16,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN_HOUSE2",
      "dest_warp_id": "0"
    },
    {
      "x": 6,
      "y": 16,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN_POKEMON_CENTER_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 14,
      "y": 6,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN_MART",
      "dest_warp_id": "0"
    }
  ]
}
```

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

### Route101

来源：`data/maps/Route101/map.json`，SHA-256 `d66cd8eeed6b6f164ed28060de85262476e016b668a6d9b26cf434efdb1d69f9`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
      "x": 16,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route101_EventScript_Youngster",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_ROUTE101_BIRCH",
      "graphics_id": "OBJ_EVENT_GFX_PROF_BIRCH",
      "x": 9,
      "y": 13,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_JOG_IN_PLACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_ROUTE_101_BIRCH_ZIGZAGOON_BATTLE"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BIRCHS_BAG",
      "x": 7,
      "y": 14,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route101_EventScript_BirchsBag",
      "flag": "FLAG_HIDE_ROUTE_101_BIRCH_STARTERS_BAG"
    },
    {
      "local_id": "LOCALID_ROUTE101_ZIGZAGOON",
      "graphics_id": "OBJ_EVENT_GFX_ZIGZAGOON_1",
      "x": 10,
      "y": 13,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_JOG_IN_PLACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_ROUTE_101_ZIGZAGOON"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_PROF_BIRCH",
      "x": 5,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "ProfBirch_EventScript_RatePokedexOrRegister",
      "flag": "FLAG_HIDE_ROUTE_101_BIRCH"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 2,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route101_EventScript_Boy",
      "flag": "FLAG_HIDE_ROUTE_101_BOY"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 10,
      "y": 19,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "1",
      "script": "Route101_EventScript_StartBirchRescue"
    },
    {
      "type": "trigger",
      "x": 11,
      "y": 19,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "1",
      "script": "Route101_EventScript_StartBirchRescue"
    },
    {
      "type": "trigger",
      "x": 10,
      "y": 18,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "2",
      "script": "Route101_EventScript_PreventExitSouth"
    },
    {
      "type": "trigger",
      "x": 11,
      "y": 18,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "2",
      "script": "Route101_EventScript_PreventExitSouth"
    },
    {
      "type": "trigger",
      "x": 6,
      "y": 16,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "2",
      "script": "Route101_EventScript_PreventExitWest"
    },
    {
      "type": "trigger",
      "x": 6,
      "y": 15,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "2",
      "script": "Route101_EventScript_PreventExitWest"
    },
    {
      "type": "trigger",
      "x": 6,
      "y": 17,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "2",
      "script": "Route101_EventScript_PreventExitWest"
    },
    {
      "type": "trigger",
      "x": 6,
      "y": 18,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "2",
      "script": "Route101_EventScript_PreventExitWest"
    },
    {
      "type": "trigger",
      "x": 7,
      "y": 13,
      "elevation": 3,
      "var": "VAR_ROUTE101_STATE",
      "var_value": "2",
      "script": "Route101_EventScript_PreventExitNorth"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 5,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route101_EventScript_RouteSign"
    }
  ],
  "warp_events": []
}
```

### Route102

来源：`data/maps/Route102/map.json`，SHA-256 `b5dee9994c80f4983c997121d05fe408141e97a022915d3c867a541514348f50`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_LITTLE_BOY",
      "x": 18,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route102_EventScript_LittleBoy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
      "x": 33,
      "y": 14,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route102_EventScript_Calvin",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BUG_CATCHER",
      "x": 25,
      "y": 15,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "2",
      "script": "Route102_EventScript_Rick",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_LASS",
      "x": 8,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN_AND_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route102_EventScript_Tiana",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 37,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route102_EventScript_Boy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 11,
      "y": 15,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route102_EventScript_ItemPotion",
      "flag": "FLAG_ITEM_ROUTE_102_POTION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 24,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_102_ORAN",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 25,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_102_PECHA",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
      "x": 19,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route102_EventScript_Allen",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 17,
      "y": 2,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route102_EventScript_RouteSignPetalburg"
    },
    {
      "type": "sign",
      "x": 40,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route102_EventScript_RouteSignOldale"
    }
  ],
  "warp_events": []
}
```

### Route103

来源：`data/maps/Route103/map.json`，SHA-256 `bd478d1cb62d54fe14f1f8d0c41e5809b208e953fba097afd2b9f1629e5d653c`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_3",
      "x": 49,
      "y": 12,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route103_EventScript_Man",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_ROUTE103_RIVAL",
      "graphics_id": "OBJ_EVENT_GFX_VAR_0",
      "x": 10,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route103_EventScript_Rival",
      "flag": "FLAG_HIDE_ROUTE_103_RIVAL"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 71,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN_AND_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route103_EventScript_Daisy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 65,
      "y": 12,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "1",
      "script": "Route103_EventScript_Liv",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 64,
      "y": 12,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "1",
      "script": "Route103_EventScript_Amy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_FISHERMAN",
      "x": 50,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WALK_DOWN_AND_UP",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route103_EventScript_Andrew",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 58,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_103_CHERI_1",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 59,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_103_LEPPA",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 60,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_103_CHERI_2",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 20,
      "y": 10,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route103_EventScript_Boy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_PROF_BIRCH",
      "x": 7,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "ProfBirch_EventScript_RatePokedexOrRegister",
      "flag": "FLAG_HIDE_ROUTE_103_BIRCH"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 56,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "5",
      "script": "Route103_EventScript_Miguel",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 50,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route103_EventScript_ItemGuardSpec",
      "flag": "FLAG_ITEM_ROUTE_103_GUARD_SPEC"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 67,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_12"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 72,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_13"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BLACK_BELT",
      "x": 67,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "2",
      "script": "Route103_EventScript_Rhett",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_5",
      "x": 67,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "2",
      "script": "Route103_EventScript_Marcos",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SWIMMER_F",
      "x": 36,
      "y": 6,
      "elevation": 1,
      "movement_type": "MOVEMENT_TYPE_WALK_DOWN_AND_UP",
      "movement_range_x": 1,
      "movement_range_y": 3,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "5",
      "script": "Route103_EventScript_Isabelle",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SWIMMER_M",
      "x": 36,
      "y": 13,
      "elevation": 1,
      "movement_type": "MOVEMENT_TYPE_WALK_UP_AND_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 3,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "5",
      "script": "Route103_EventScript_Pete",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 64,
      "y": 7,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route103_EventScript_ItemPPUp",
      "flag": "FLAG_ITEM_ROUTE_103_PP_UP"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 11,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route103_EventScript_RouteSign"
    }
  ],
  "warp_events": [
    {
      "x": 45,
      "y": 6,
      "elevation": 0,
      "dest_map": "MAP_ALTERING_CAVE",
      "dest_warp_id": "0"
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

### Route116

来源：`data/maps/Route116/map.json`，SHA-256 `1b5dfe9feb2f098cd73e272510b89896c71ddecefe38e575cca71818531715f6`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 18,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_116_PINAP_1",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 19,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_116_CHESTO_1",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
      "x": 12,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP_AND_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route116_EventScript_Joey",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 21,
      "y": 6,
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
      "x": 32,
      "y": 10,
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
      "graphics_id": "OBJ_EVENT_GFX_BUG_CATCHER",
      "x": 13,
      "y": 17,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_ROTATE_CLOCKWISE",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "2",
      "script": "Route116_EventScript_Jose",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 19,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_ItemEther",
      "flag": "FLAG_ITEM_ROUTE_116_ETHER"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 10,
      "y": 17,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_ItemRepel",
      "flag": "FLAG_ITEM_ROUTE_116_REPEL"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 20,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_116_CHESTO_2",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BERRY_TREE",
      "x": 21,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_BERRY_TREE_GROWTH",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "BERRY_TREE_ROUTE_116_PINAP_2",
      "script": "BerryTreeScript",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_ROUTE116_BRINEY",
      "graphics_id": "OBJ_EVENT_GFX_EXPERT_M",
      "x": 46,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_Briney",
      "flag": "FLAG_HIDE_ROUTE_116_MR_BRINEY"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 28,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_13"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_HIKER",
      "x": 36,
      "y": 17,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP_AND_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route116_EventScript_Clark",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 24,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_14"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 80,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_ItemHPUp",
      "flag": "FLAG_ITEM_ROUTE_116_HP_UP"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_LASS",
      "x": 26,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "2",
      "script": "Route116_EventScript_Janice",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_3",
      "x": 22,
      "y": 16,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN_AND_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "3",
      "script": "Route116_EventScript_Karen",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCHOOL_KID_M",
      "x": 28,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "4",
      "script": "Route116_EventScript_Jerry",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_2",
      "x": 46,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_DevonEmployee",
      "flag": "FLAG_HIDE_ROUTE_116_DEVON_EMPLOYEE"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 55,
      "y": 12,
      "elevation": 4,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_ItemXSpecial",
      "flag": "FLAG_ITEM_ROUTE_116_X_SPECIAL"
    },
    {
      "local_id": "LOCALID_ROUTE116_WANDAS_BF",
      "graphics_id": "OBJ_EVENT_GFX_BLACK_BELT",
      "x": 38,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_WandasBoyfriend",
      "flag": "FLAG_HIDE_ROUTE_116_WANDAS_BOYFRIEND"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MANIAC",
      "x": 74,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_GlassesMan",
      "flag": "FLAG_HIDE_ROUTE_116_DROPPED_GLASSES_MAN"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 33,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "1",
      "script": "Route116_EventScript_Sarah",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 33,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "2",
      "script": "Route116_EventScript_Dawson",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ITEM_BALL",
      "x": 34,
      "y": 7,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_EventScript_ItemPotion",
      "flag": "FLAG_ITEM_ROUTE_116_POTION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_CUTTABLE_TREE",
      "x": 30,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "EventScript_CutTree",
      "flag": "FLAG_TEMP_15"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
      "x": 36,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "5",
      "script": "Route116_EventScript_Johnson",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_HIKER",
      "x": 42,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NORMAL",
      "trainer_sight_or_berry_tree_id": "5",
      "script": "Route116_EventScript_Devan",
      "flag": "0"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 47,
      "y": 9,
      "elevation": 3,
      "var": "VAR_ROUTE116_STATE",
      "var_value": "1",
      "script": "Route116_EventScript_BrineyTrigger"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 5,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route116_EventScript_RouteSignRustboro"
    },
    {
      "type": "sign",
      "x": 48,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route116_EventScript_RusturfTunnelSign"
    },
    {
      "type": "sign",
      "x": 40,
      "y": 9,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route116_EventScript_TunnelersRestHouseSign"
    },
    {
      "type": "secret_base",
      "x": 71,
      "y": 4,
      "elevation": 0,
      "secret_base_id": "SECRET_BASE_BLUE_CAVE1_1"
    },
    {
      "type": "secret_base",
      "x": 79,
      "y": 11,
      "elevation": 0,
      "secret_base_id": "SECRET_BASE_BLUE_CAVE2_1"
    },
    {
      "type": "sign",
      "x": 16,
      "y": 12,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route116_EventScript_TrainerTipsBToStopEvolution"
    },
    {
      "type": "sign",
      "x": 29,
      "y": 10,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "Route116_EventScript_TrainerTipsBagHasPockets"
    },
    {
      "type": "secret_base",
      "x": 56,
      "y": 6,
      "elevation": 0,
      "secret_base_id": "SECRET_BASE_BLUE_CAVE3_2"
    },
    {
      "type": "secret_base",
      "x": 55,
      "y": 15,
      "elevation": 0,
      "secret_base_id": "SECRET_BASE_BLUE_CAVE4_2"
    },
    {
      "type": "hidden_item",
      "x": 22,
      "y": 9,
      "elevation": 3,
      "item": "ITEM_SUPER_POTION",
      "flag": "FLAG_HIDDEN_ITEM_ROUTE_116_SUPER_POTION"
    },
    {
      "type": "hidden_item",
      "x": 70,
      "y": 13,
      "elevation": 3,
      "item": "ITEM_BLACK_GLASSES",
      "flag": "FLAG_HIDDEN_ITEM_ROUTE_116_BLACK_GLASSES"
    }
  ],
  "warp_events": [
    {
      "x": 47,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTURF_TUNNEL",
      "dest_warp_id": "0"
    },
    {
      "x": 38,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_ROUTE116_TUNNELERS_REST_HOUSE",
      "dest_warp_id": "0"
    },
    {
      "x": 65,
      "y": 10,
      "elevation": 0,
      "dest_map": "MAP_RUSTURF_TUNNEL",
      "dest_warp_id": "2"
    },
    {
      "x": 59,
      "y": 13,
      "elevation": 0,
      "dest_map": "MAP_TERRA_CAVE_ENTRANCE",
      "dest_warp_id": "0"
    },
    {
      "x": 79,
      "y": 6,
      "elevation": 0,
      "dest_map": "MAP_TERRA_CAVE_ENTRANCE",
      "dest_warp_id": "0"
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

### RustboroCity_DevonCorp_3F

来源：`data/maps/RustboroCity_DevonCorp_3F/map.json`，SHA-256 `71023ec30790fb8ff43db6fadc7180fb2ffcb50ffb8ed9b0107895d0f3b93846`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_GENTLEMAN",
      "x": 17,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_3F_EventScript_MrStone",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_DEVON_CORP_3F_EMPLOYEE",
      "graphics_id": "OBJ_EVENT_GFX_MAN_2",
      "x": 3,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_3F_EventScript_Employee",
      "flag": "FLAG_HIDE_RUSTBORO_CITY_DEVON_CORP_3F_EMPLOYEE"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GENTLEMAN",
      "x": 15,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_INVISIBLE",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_DevonCorp_3F_EventScript_MrStone",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 1,
      "y": 5,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_DevonCorp_3F_EventScript_RareRocksDisplay"
    },
    {
      "type": "sign",
      "x": 1,
      "y": 7,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "RustboroCity_DevonCorp_3F_EventScript_RareRocksDisplay"
    }
  ],
  "warp_events": [
    {
      "x": 2,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_DEVON_CORP_2F",
      "dest_warp_id": "1"
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

### SlateportCity

来源：`data/maps/SlateportCity/map.json`，SHA-256 `09e84e6a32f1ab831eef187356c2fc3ef4ba6e196f44753d59c04eca957b38cd`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_SLATEPORT_FAT_MAN",
      "graphics_id": "OBJ_EVENT_GFX_FAT_MAN",
      "x": 21,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_FatMan",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_MAN_1",
      "graphics_id": "OBJ_EVENT_GFX_MAN_1",
      "x": 34,
      "y": 29,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Man1",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_RICH_BOY",
      "graphics_id": "OBJ_EVENT_GFX_RICH_BOY",
      "x": 5,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_RichBoy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_4",
      "x": 26,
      "y": 29,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Woman1",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_1",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_F",
      "x": 31,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt1",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_COOK",
      "graphics_id": "OBJ_EVENT_GFX_COOK",
      "x": 5,
      "y": 43,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Cook",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_OLD_WOMAN",
      "graphics_id": "OBJ_EVENT_GFX_OLD_WOMAN",
      "x": 20,
      "y": 37,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_OldWoman",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GIRL",
      "graphics_id": "OBJ_EVENT_GFX_GIRL_1",
      "x": 8,
      "y": 42,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Girl",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_TY",
      "graphics_id": "OBJ_EVENT_GFX_CAMERAMAN",
      "x": 29,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Ty",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_GABBY_AND_TY"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GABBY",
      "graphics_id": "OBJ_EVENT_GFX_REPORTER_F",
      "x": 28,
      "y": 14,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Gabby",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_GABBY_AND_TY"
    },
    {
      "local_id": "LOCALID_SLATEPORT_CAPT_STERN",
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 28,
      "y": 13,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_CaptStern",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_CAPTAIN_STERN"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SAILOR",
      "x": 37,
      "y": 41,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Sailor1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SAILOR",
      "x": 28,
      "y": 46,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Sailor2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 9,
      "y": 50,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_PokefanF",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_3",
      "x": 16,
      "y": 46,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Man2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MANIAC",
      "x": 8,
      "y": 24,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Maniac",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 15,
      "y": 31,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Woman2",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_2",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 30,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt2",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_3",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 29,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt3",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 6,
      "y": 38,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_DecorClerk",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 5,
      "y": 51,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_DollClerk",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_5",
      "x": 34,
      "y": 51,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_Man3",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 4,
      "y": 47,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_EffortRibbonWoman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 11,
      "y": 47,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_PowerTMClerk",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TM_SALESMAN"
    },
    {
      "local_id": "LOCALID_SLATEPORT_ENERGY_GURU",
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 5,
      "y": 47,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_EnergyGuru",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_4",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 22,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt4",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_5",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 23,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt5",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_6",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 24,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt6",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_7",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 21,
      "y": 26,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt7",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_8",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 20,
      "y": 26,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt8",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_9",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 26,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt9",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 28,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt10",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "local_id": "LOCALID_SLATEPORT_GRUNT_11",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 25,
      "y": 27,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_AquaGrunt11",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_TEAM_AQUA"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 11,
      "y": 37,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 1,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_EventScript_BerryPowderClerk",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_SLATEPORT_SCOTT",
      "graphics_id": "OBJ_EVENT_GFX_SCOTT",
      "x": 10,
      "y": 12,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_SCOTT"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 10,
      "y": 13,
      "elevation": 3,
      "var": "VAR_SLATEPORT_OUTSIDE_MUSEUM_STATE",
      "var_value": "2",
      "script": "SlateportCity_EventScript_ScottBattleTentScene"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 8,
      "y": 19,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_NameRatersHouseSign"
    },
    {
      "type": "sign",
      "x": 20,
      "y": 19,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 21,
      "y": 19,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemonCenterSign"
    },
    {
      "type": "sign",
      "x": 14,
      "y": 26,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    },
    {
      "type": "sign",
      "x": 24,
      "y": 12,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_HarborSign"
    },
    {
      "type": "sign",
      "x": 15,
      "y": 26,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "Common_EventScript_ShowPokemartSign"
    },
    {
      "type": "sign",
      "x": 14,
      "y": 51,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_MarketSign"
    },
    {
      "type": "sign",
      "x": 26,
      "y": 26,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_OceanicMuseumSign"
    },
    {
      "type": "sign",
      "x": 16,
      "y": 22,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_CitySign"
    },
    {
      "type": "sign",
      "x": 8,
      "y": 26,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_PokemonFanClubSign"
    },
    {
      "type": "sign",
      "x": 7,
      "y": 13,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_BattleTentSign"
    },
    {
      "type": "sign",
      "x": 23,
      "y": 38,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_EventScript_SternsShipyardSign"
    },
    {
      "type": "sign",
      "x": 10,
      "y": 36,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_NORTH",
      "script": "SlateportCity_EventScript_BerryCrushRankingsSign"
    }
  ],
  "warp_events": [
    {
      "x": 19,
      "y": 19,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_POKEMON_CENTER_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 13,
      "y": 26,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_MART",
      "dest_warp_id": "0"
    },
    {
      "x": 26,
      "y": 38,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_STERNS_SHIPYARD_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 10,
      "y": 12,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_BATTLE_TENT_LOBBY",
      "dest_warp_id": "0"
    },
    {
      "x": 4,
      "y": 26,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_POKEMON_FAN_CLUB",
      "dest_warp_id": "0"
    },
    {
      "x": 30,
      "y": 26,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_OCEANIC_MUSEUM_1F",
      "dest_warp_id": "0"
    },
    {
      "x": 5,
      "y": 19,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_NAME_RATERS_HOUSE",
      "dest_warp_id": "0"
    },
    {
      "x": 31,
      "y": 26,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_OCEANIC_MUSEUM_1F",
      "dest_warp_id": "1"
    },
    {
      "x": 28,
      "y": 12,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_HARBOR",
      "dest_warp_id": "0"
    },
    {
      "x": 40,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_HARBOR",
      "dest_warp_id": "2"
    },
    {
      "x": 21,
      "y": 44,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_HOUSE",
      "dest_warp_id": "0"
    }
  ]
}
```

### SlateportCity_OceanicMuseum_1F

来源：`data/maps/SlateportCity_OceanicMuseum_1F/map.json`，SHA-256 `9a70cc7e080012523517e2e4a125d14d1212bc6b9f663f2a9c831e3e81af6b32`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_BEAUTY",
      "x": 7,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_EntranceAttendant",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 18,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt3",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_AQUA_GRUNTS"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 12,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt4",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_AQUA_GRUNTS"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 2,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt2",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_AQUA_GRUNTS"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_F",
      "x": 3,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt1",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_AQUA_GRUNTS"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 14,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt5",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_AQUA_GRUNTS"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BEAUTY",
      "x": 12,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_EntranceAttendant",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 8,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt6",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_AQUA_GRUNTS"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 4,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron1",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MANIAC",
      "x": 10,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron2",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 17,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron3",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_LITTLE_GIRL",
      "x": 18,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron4",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    },
    {
      "local_id": "LOCALID_OCEANIC_MUSEUM_FAMILIAR_GRUNT",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 9,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_FamiliarGrunt",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_FAMILIAR_AQUA_GRUNT"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_REPORTER_M",
      "x": 7,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_Reporter",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    }
  ],
  "coord_events": [
    {
      "type": "trigger",
      "x": 9,
      "y": 7,
      "elevation": 3,
      "var": "VAR_SLATEPORT_MUSEUM_1F_STATE",
      "var_value": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_PayEntranceFeeLeft"
    },
    {
      "type": "trigger",
      "x": 10,
      "y": 7,
      "elevation": 3,
      "var": "VAR_SLATEPORT_MUSEUM_1F_STATE",
      "var_value": "0",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_PayEntranceFeeRight"
    }
  ],
  "bg_events": [
    {
      "type": "sign",
      "x": 2,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_WhirlpoolExperiment"
    },
    {
      "type": "sign",
      "x": 2,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_WaterfallExperiment"
    },
    {
      "type": "sign",
      "x": 9,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_OceanSoilDisplay"
    },
    {
      "type": "sign",
      "x": 12,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_BeachSandDisplay"
    },
    {
      "type": "sign",
      "x": 10,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_OceanSoilDisplay"
    },
    {
      "type": "sign",
      "x": 13,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_BeachSandDisplay"
    },
    {
      "type": "sign",
      "x": 15,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact1"
    },
    {
      "type": "sign",
      "x": 18,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact2"
    },
    {
      "type": "sign",
      "x": 18,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact3"
    },
    {
      "type": "sign",
      "x": 2,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_FossilDisplay"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_FossilDisplay"
    },
    {
      "type": "sign",
      "x": 16,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_DepthMeasuringMachine"
    },
    {
      "type": "sign",
      "x": 17,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_1F_EventScript_DepthMeasuringMachine"
    }
  ],
  "warp_events": [
    {
      "x": 9,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "5"
    },
    {
      "x": 10,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "7"
    },
    {
      "x": 6,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_OCEANIC_MUSEUM_2F",
      "dest_warp_id": "0"
    }
  ]
}
```

### SlateportCity_OceanicMuseum_2F

来源：`data/maps/SlateportCity_OceanicMuseum_2F/map.json`，SHA-256 `e284a946fca97ba0e50e6c24457274be6d79d47365fd0b07c5e5a5cffebf2c78`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_OCEANIC_MUSEUM_2F_CAPT_STERN",
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 13,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_CaptStern",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_2F_CAPTAIN_STERN"
    },
    {
      "local_id": "LOCALID_OCEANIC_MUSEUM_2F_ARCHIE",
      "graphics_id": "OBJ_EVENT_GFX_ARCHIE",
      "x": 6,
      "y": 1,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_2F_ARCHIE"
    },
    {
      "local_id": "LOCALID_OCEANIC_MUSEUM_2F_GRUNT_1",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 6,
      "y": 1,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_2F_AQUA_GRUNT_1"
    },
    {
      "local_id": "LOCALID_OCEANIC_MUSEUM_2F_GRUNT_2",
      "graphics_id": "OBJ_EVENT_GFX_AQUA_MEMBER_M",
      "x": 6,
      "y": 1,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_OCEANIC_MUSEUM_2F_AQUA_GRUNT_2"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_OLD_MAN",
      "x": 12,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_MuseumPatron1",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 9,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_MuseumPatron2",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_NINJA_BOY",
      "x": 1,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_MuseumPatron3",
      "flag": "FLAG_HIDE_SLATEPORT_MUSEUM_POPULATION"
    }
  ],
  "coord_events": [],
  "bg_events": [
    {
      "type": "sign",
      "x": 18,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_WaterQualitySample1"
    },
    {
      "type": "sign",
      "x": 18,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_WaterQualitySample2"
    },
    {
      "type": "sign",
      "x": 4,
      "y": 3,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SubmersibleReplica"
    },
    {
      "type": "sign",
      "x": 4,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SubmersibleReplica"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 3,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SubmarineReplica"
    },
    {
      "type": "sign",
      "x": 2,
      "y": 3,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SubmarineReplica"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 4,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SubmarineReplica"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 6,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SSTidalReplica"
    },
    {
      "type": "sign",
      "x": 4,
      "y": 6,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SSTidalReplica"
    },
    {
      "type": "sign",
      "x": 13,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SSAnneReplica"
    },
    {
      "type": "sign",
      "x": 14,
      "y": 7,
      "elevation": 3,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SSAnneReplica"
    },
    {
      "type": "sign",
      "x": 18,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SurfaceSeawaterDisplay"
    },
    {
      "type": "sign",
      "x": 19,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SurfaceSeawaterDisplay"
    },
    {
      "type": "sign",
      "x": 15,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_DeepSeawaterDisplay"
    },
    {
      "type": "sign",
      "x": 16,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_DeepSeawaterDisplay"
    },
    {
      "type": "sign",
      "x": 8,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_HoennModel"
    },
    {
      "type": "sign",
      "x": 9,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_HoennModel"
    },
    {
      "type": "sign",
      "x": 12,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_PressureExperiment"
    },
    {
      "type": "sign",
      "x": 13,
      "y": 1,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_PressureExperiment"
    },
    {
      "type": "sign",
      "x": 3,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SSTidalReplica"
    },
    {
      "type": "sign",
      "x": 4,
      "y": 7,
      "elevation": 0,
      "player_facing_dir": "BG_EVENT_PLAYER_FACING_ANY",
      "script": "SlateportCity_OceanicMuseum_2F_EventScript_SSTidalReplica"
    }
  ],
  "warp_events": [
    {
      "x": 6,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_OCEANIC_MUSEUM_1F",
      "dest_warp_id": "2"
    }
  ]
}
```

## `Common_EventScript_ShowPokemartSign`

`data/event_scripts.s:662`，类型 `script`，SHA-256 `f880d0c35b575d02d7a7a614f76789a0cb406697fb9b42865a8aeda36485c103`。

```asm
Common_EventScript_ShowPokemartSign::
	msgbox gText_PokemartSign, MSGBOX_SIGN
	end
```

## `Common_EventScript_ShowPokemonCenterSign`

`data/event_scripts.s:666`，类型 `script`，SHA-256 `d68df3a9a0a589cc46073c108064c4c36d6c7d9888506397e91aad8a85d9bfd1`。

```asm
Common_EventScript_ShowPokemonCenterSign::
	msgbox gText_PokemonCenterSign, MSGBOX_SIGN
	end
```

## `DewfordTown_EventScript_GymSign`

`data/maps/DewfordTown/scripts.inc:64`，类型 `script`，SHA-256 `aa3055f8a6531e1b3fbf0f33a694ae4c1388e2ed6c40e5f992da77406f889475`。

```asm
DewfordTown_EventScript_GymSign::
	msgbox DewfordTown_Text_GymSign, MSGBOX_SIGN
	end
```

## `DewfordTown_EventScript_HallSign`

`data/maps/DewfordTown/scripts.inc:68`，类型 `script`，SHA-256 `24aa71e8f3cc6966b059062be8195276f933e3819c746d52943878d958b91485`。

```asm
DewfordTown_EventScript_HallSign::
	msgbox DewfordTown_Text_HallSign, MSGBOX_SIGN
	end
```

## `DewfordTown_EventScript_TownSign`

`data/maps/DewfordTown/scripts.inc:60`，类型 `script`，SHA-256 `98fd2ee02ce60e20b111784e12ece7000e6ec7fe30e9da59c1390d18325fb675`。

```asm
DewfordTown_EventScript_TownSign::
	msgbox DewfordTown_Text_TownSign, MSGBOX_SIGN
	end
```

## `DewfordTown_Text_GymSign`

`data/maps/DewfordTown/scripts.inc:631`，类型 `text`，SHA-256 `9c1f04ba07b00fe96bbfd5e4545fe30433d67662f4c4910008c5de236d4f20fb`。

```asm
DewfordTown_Text_GymSign:
	.string "DEWFORD TOWN POKéMON GYM\n"
	.string "LEADER: BRAWLY\l"
	.string "“A big wave in fighting!”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
DEWFORD TOWN POKéMON GYM
LEADER: BRAWLY
“A big wave in fighting!”
```

## `DewfordTown_Text_HallSign`

`data/maps/DewfordTown/scripts.inc:636`，类型 `text`，SHA-256 `a6e4b4ff0066b10cef5d17d40b76deb60726200658ad149396bebb818527ea14`。

```asm
DewfordTown_Text_HallSign:
	.string "DEWFORD HALL\n"
	.string "“Everyone's information exchange!”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
DEWFORD HALL
“Everyone's information exchange!”
```

## `DewfordTown_Text_TownSign`

`data/maps/DewfordTown/scripts.inc:627`，类型 `text`，SHA-256 `f9af107fb8d3ba125e0bd1fe4edf90392e3cb073c3d425fd9ac913faf92bd6b2`。

```asm
DewfordTown_Text_TownSign:
	.string "DEWFORD TOWN\n"
	.string "“A tiny island in the blue sea.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
DEWFORD TOWN
“A tiny island in the blue sea.”
```

## `InsideOfTruck_EventScript_MovingBox`

`data/maps/InsideOfTruck/scripts.inc:50`，类型 `script`，SHA-256 `73f9107875248ac4172a57c616dbc7e7f240fce9f32e2cacf5dc8a177862afcc`。

```asm
InsideOfTruck_EventScript_MovingBox::
	msgbox InsideOfTruck_Text_BoxPrintedWithMonLogo, MSGBOX_SIGN
	end
```

## `InsideOfTruck_Text_BoxPrintedWithMonLogo`

`data/maps/InsideOfTruck/scripts.inc:54`，类型 `text`，SHA-256 `d9990f916c0c9d12833dc7b8eda95a92fc652cbff308e5fe29b6f74143ea178a`。

```asm
InsideOfTruck_Text_BoxPrintedWithMonLogo:
	.string "The box is printed with a POKéMON logo.\p"
	.string "It's a POKéMON brand moving and\n"
	.string "delivery service.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The box is printed with a POKéMON logo.

It's a POKéMON brand moving and
delivery service.
```

## `LittlerootTown_EventScript_BirchsLabSign`

`data/maps/LittlerootTown/scripts.inc:382`，类型 `script`，SHA-256 `43bc1b26927989ed16e753260ba3cba04e906b1269ac9f6b3a5cc3faadd8aa08`。

```asm
LittlerootTown_EventScript_BirchsLabSign::
	msgbox LittlerootTown_Text_ProfBirchsLab, MSGBOX_SIGN
	end
```

## `LittlerootTown_EventScript_TownSign`

`data/maps/LittlerootTown/scripts.inc:378`，类型 `script`，SHA-256 `23906050ef07313e0c481c4c1021c3e87220bc2003430eaf96fbc8e63ffffd48`。

```asm
LittlerootTown_EventScript_TownSign::
	msgbox LittlerootTown_Text_TownSign, MSGBOX_SIGN
	end
```

## `LittlerootTown_ProfessorBirchsLab_EventScript_Book`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:638`，类型 `script`，SHA-256 `d271b188d36026eb9a416713a71275f273be18bb9ba8ca149328e0c50d81145a`。

```asm
LittlerootTown_ProfessorBirchsLab_EventScript_Book::
	msgbox LittlerootTown_ProfessorBirchsLab_Text_BookTooHardToRead, MSGBOX_SIGN
	end
```

## `LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:634`，类型 `script`，SHA-256 `2a7a26080cef1fc1b0e1adfa603858c2f889b4233050767db14848eba41fd85c`。

```asm
LittlerootTown_ProfessorBirchsLab_EventScript_Bookshelf::
	msgbox LittlerootTown_ProfessorBirchsLab_Text_CrammedWithBooksOnPokemon, MSGBOX_SIGN
	end
```

## `LittlerootTown_ProfessorBirchsLab_EventScript_Machine`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:561`，类型 `script`，SHA-256 `a83be0856d2678e9a99eeedddad6d757db149634be9a24eca5633d0abbf2f9bc`。

```asm
LittlerootTown_ProfessorBirchsLab_EventScript_Machine::
	msgbox LittlerootTown_ProfessorBirchsLab_Text_SeriousLookingMachine, MSGBOX_SIGN
	end
```

## `LittlerootTown_ProfessorBirchsLab_EventScript_PC`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:630`，类型 `script`，SHA-256 `9a88521eabadd60a5a91c691bbe87d2528f0a798a6921e2172a1e8402feb56f8`。

```asm
LittlerootTown_ProfessorBirchsLab_EventScript_PC::
	msgbox LittlerootTown_ProfessorBirchsLab_Text_PCUsedForResearch, MSGBOX_SIGN
	end
```

## `LittlerootTown_ProfessorBirchsLab_Text_BookTooHardToRead`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:806`，类型 `text`，SHA-256 `90bee1d4168b4b207d7c503a9068e591ea71244405e20dffbd082ecadba42bc1`。

```asm
LittlerootTown_ProfessorBirchsLab_Text_BookTooHardToRead:
	.string "It's a book that's too hard to read.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a book that's too hard to read.
```

## `LittlerootTown_ProfessorBirchsLab_Text_CrammedWithBooksOnPokemon`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:803`，类型 `text`，SHA-256 `30ccdac9fa78b909e29c1529d3b0642c9775e7b491b6f198f57fe061947ce977`。

```asm
LittlerootTown_ProfessorBirchsLab_Text_CrammedWithBooksOnPokemon:
	.string "It's crammed with books on POKéMON.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's crammed with books on POKéMON.
```

## `LittlerootTown_ProfessorBirchsLab_Text_PCUsedForResearch`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:799`，类型 `text`，SHA-256 `421bc8800942b0d2a98721e80ab5d6dbe9f6b6852f63e8b3a63687551658bef5`。

```asm
LittlerootTown_ProfessorBirchsLab_Text_PCUsedForResearch:
	.string "It's a PC used for research.\n"
	.string "Better not mess around with it.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a PC used for research.
Better not mess around with it.
```

## `LittlerootTown_ProfessorBirchsLab_Text_SeriousLookingMachine`

`data/maps/LittlerootTown_ProfessorBirchsLab/scripts.inc:795`，类型 `text`，SHA-256 `7771ddca41376e3e7e58168e8ac6d07476d2f341b3e676489691e2e239e36eef`。

```asm
LittlerootTown_ProfessorBirchsLab_Text_SeriousLookingMachine:
	.string "It's a serious-looking machine.\n"
	.string "The PROF must use this for research.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a serious-looking machine.
The PROF must use this for research.
```

## `LittlerootTown_Text_ProfBirchsLab`

`data/maps/LittlerootTown/scripts.inc:943`，类型 `text`，SHA-256 `2cbc6dbdbddc0f7de6e714e63c4cc5e7ffbd8c3103271bbfe82e8e6ed94f5838`。

```asm
LittlerootTown_Text_ProfBirchsLab:
	.string "PROF. BIRCH'S POKéMON LAB$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
PROF. BIRCH'S POKéMON LAB
```

## `LittlerootTown_Text_TownSign`

`data/maps/LittlerootTown/scripts.inc:939`，类型 `text`，SHA-256 `9008d1f3816ab10e17f1cb5d27d738bd739ba85c2ad7f2101115ae1c137abdbc`。

```asm
LittlerootTown_Text_TownSign:
	.string "LITTLEROOT TOWN\n"
	.string "“A town that can't be shaded any hue.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
LITTLEROOT TOWN
“A town that can't be shaded any hue.”
```

## `OldaleTown_EventScript_TownSign`

`data/maps/OldaleTown/scripts.inc:28`，类型 `script`，SHA-256 `5abc3d190eae6ab973e3745b51128be615dd6c05f10072b3e11f279cc1d85cf5`。

```asm
OldaleTown_EventScript_TownSign::
	msgbox OldaleTown_Text_TownSign, MSGBOX_SIGN
	end
```

## `OldaleTown_Text_TownSign`

`data/maps/OldaleTown/scripts.inc:383`，类型 `text`，SHA-256 `95278087259823010d81227b2935511db6228a455437a3296a854443d30b057c`。

```asm
OldaleTown_Text_TownSign:
	.string "OLDALE TOWN\n"
	.string "“Where things start off scarce.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
OLDALE TOWN
“Where things start off scarce.”
```

## `PetalburgCity_EventScript_CitySign`

`data/maps/PetalburgCity/scripts.inc:223`，类型 `script`，SHA-256 `29d1b10f192d10d2ae5181f76f36ad4281a22b2010ae8d816e1c8d0d41cbd605`。

```asm
PetalburgCity_EventScript_CitySign::
	msgbox PetalburgCity_Text_CitySign, MSGBOX_SIGN
	end
```

## `PetalburgCity_EventScript_GymSign`

`data/maps/PetalburgCity/scripts.inc:219`，类型 `script`，SHA-256 `dd6fe7434b077c64f65eb2b6523b06917bc3fced822ce1eb148aaa0309514235`。

```asm
PetalburgCity_EventScript_GymSign::
	msgbox PetalburgCity_Text_GymSign, MSGBOX_SIGN
	end
```

## `PetalburgCity_EventScript_WallyHouseSign`

`data/maps/PetalburgCity/scripts.inc:231`，类型 `script`，SHA-256 `fae0276af08af6aacec3d481c7e898b091d68dc98ab9061a3e13823291941ab4`。

```asm
PetalburgCity_EventScript_WallyHouseSign::
	msgbox PetalburgCity_Text_WallyHouseSign, MSGBOX_SIGN
	end
```

## `PetalburgCity_Text_CitySign`

`data/maps/PetalburgCity/scripts.inc:719`，类型 `text`，SHA-256 `214e7d7231aad91dcfcfa27a377fb5044ce55630f110afc9f8f60984d05fdb26`。

```asm
PetalburgCity_Text_CitySign:
	.string "PETALBURG CITY\n"
	.string "“Where people mingle with nature.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
PETALBURG CITY
“Where people mingle with nature.”
```

## `PetalburgCity_Text_GymSign`

`data/maps/PetalburgCity/scripts.inc:714`，类型 `text`，SHA-256 `e3523439e156cfd67e470d1b0e46c03924dac51e4ed2744c26b57a80e4f64516`。

```asm
PetalburgCity_Text_GymSign:
	.string "PETALBURG CITY POKéMON GYM\n"
	.string "LEADER: NORMAN\l"
	.string "“A man in pursuit of power!”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
PETALBURG CITY POKéMON GYM
LEADER: NORMAN
“A man in pursuit of power!”
```

## `PetalburgCity_Text_WallyHouseSign`

`data/maps/PetalburgCity/scripts.inc:723`，类型 `text`，SHA-256 `0fc3be0920440bde88cbba9cb533521494181dc35f6f312ac4cb286c633ca9c9`。

```asm
PetalburgCity_Text_WallyHouseSign:
	.string "WALLY'S HOUSE$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
WALLY'S HOUSE
```

## `PetalburgWoods_EventScript_Sign1`

`data/maps/PetalburgWoods/scripts.inc:245`，类型 `script`，SHA-256 `d2cf58e9e068499b7c2ab08bd7bac671e556cfcf36ee7ec2c8b2449de14439c6`。

```asm
PetalburgWoods_EventScript_Sign1::
	msgbox PetalburgWoods_Text_TrainerTipsExperience, MSGBOX_SIGN
	end
```

## `PetalburgWoods_EventScript_Sign2`

`data/maps/PetalburgWoods/scripts.inc:249`，类型 `script`，SHA-256 `99e35e1585a5d63c6ae7ecc617441763b47012a1aeb6df9e651c1865eef2239e`。

```asm
PetalburgWoods_EventScript_Sign2::
	msgbox PetalburgWoods_Text_TrainerTipsPP, MSGBOX_SIGN
	end
```

## `PetalburgWoods_Text_TrainerTipsExperience`

`data/maps/PetalburgWoods/scripts.inc:437`，类型 `text`，SHA-256 `6b0a7236f40cfb3b187c47c3d9e263c0a5941f20385e60aadafd7c743320f116`。

```asm
PetalburgWoods_Text_TrainerTipsExperience:
	.string "TRAINER TIPS\p"
	.string "Any POKéMON that appears even once\n"
	.string "in a battle is awarded EXP Points.\p"
	.string "To raise a weak POKéMON, put it at the\n"
	.string "left of the team list.\p"
	.string "As soon as a battle starts, switch it\n"
	.string "out. It will earn EXP Points without\l"
	.string "being exposed to any harm.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
TRAINER TIPS

Any POKéMON that appears even once
in a battle is awarded EXP Points.

To raise a weak POKéMON, put it at the
left of the team list.

As soon as a battle starts, switch it
out. It will earn EXP Points without
being exposed to any harm.
```

## `PetalburgWoods_Text_TrainerTipsPP`

`data/maps/PetalburgWoods/scripts.inc:447`，类型 `text`，SHA-256 `28f97e4f08779f107b20fd3e84da5f36b757f5e3e6eb1d059c2720497ebb0d20`。

```asm
PetalburgWoods_Text_TrainerTipsPP:
	.string "TRAINER TIPS\p"
	.string "In addition to Hit Points (HP), POKéMON\n"
	.string "have Power Points (PP) that are used to\l"
	.string "make moves during battle.\p"
	.string "If a POKéMON runs out of PP, it must be\n"
	.string "taken to a POKéMON CENTER.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
TRAINER TIPS

In addition to Hit Points (HP), POKéMON
have Power Points (PP) that are used to
make moves during battle.

If a POKéMON runs out of PP, it must be
taken to a POKéMON CENTER.
```

## `PlayersHouse_2F_EventScript_GameCube`

`data/maps/LittlerootTown_BrendansHouse_2F/scripts.inc:256`，类型 `script`，SHA-256 `b787f49ede5fd5a6e94c4d7076d0bfe57133eb274724fb369f97aa94ac3ce506`。

```asm
PlayersHouse_2F_EventScript_GameCube::
	msgbox PlayersHouse_2F_Text_ItsAGameCube, MSGBOX_SIGN
	end
```

## `PlayersHouse_2F_EventScript_Notebook`

`data/maps/LittlerootTown_BrendansHouse_2F/scripts.inc:252`，类型 `script`，SHA-256 `49e4d41d7fd6e8e8301049e075c75052f07f07cbe0c7c9dcd8878b5ad99773bb`。

```asm
PlayersHouse_2F_EventScript_Notebook::
	msgbox PlayersHouse_2F_Text_Notebook, MSGBOX_SIGN
	end
```

## `PlayersHouse_2F_Text_ItsAGameCube`

`data/maps/LittlerootTown_BrendansHouse_2F/scripts.inc:286`，类型 `text`，SHA-256 `243b55e497df650bd5d9e54e6b1b1dec83c34eca76bbb67d75dee8bebe7e614b`。

```asm
PlayersHouse_2F_Text_ItsAGameCube:
	.string "It's a Nintendo GameCube.\p"
	.string "A Game Boy Advance is connected to\n"
	.string "serve as the Controller.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a Nintendo GameCube.

A Game Boy Advance is connected to
serve as the Controller.
```

## `PlayersHouse_2F_Text_Notebook`

`data/maps/LittlerootTown_BrendansHouse_2F/scripts.inc:274`，类型 `text`，SHA-256 `530ecc05fe79fd531323bf5a043061d370677dfcb1c2c7e9b719763a49327851`。

```asm
PlayersHouse_2F_Text_Notebook:
	.string "{PLAYER} flipped open the notebook.\p"
	.string "ADVENTURE RULE NO. 1\n"
	.string "Open the MENU with START.\p"
	.string "ADVENTURE RULE NO. 2\n"
	.string "Record your progress with SAVE.\p"
	.string "The remaining pages are blank…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
{PLAYER} flipped open the notebook.

ADVENTURE RULE NO. 1
Open the MENU with START.

ADVENTURE RULE NO. 2
Record your progress with SAVE.

The remaining pages are blank…
```

## `Route101_EventScript_RouteSign`

`data/maps/Route101/scripts.inc:210`，类型 `script`，SHA-256 `cb0b65d90dfa70e92a9bc3bc079835486d28820efbe1a612597bc2fb3a901231`。

```asm
Route101_EventScript_RouteSign::
	msgbox Route101_Text_RouteSign, MSGBOX_SIGN
	end
```

## `Route101_Text_RouteSign`

`data/maps/Route101/scripts.inc:289`，类型 `text`，SHA-256 `fb2b234d92e79ffc14bff650993c117cfed35f97ab4bcefd5e4168a44567e8ec`。

```asm
Route101_Text_RouteSign:
	.string "ROUTE 101\n"
	.string "{UP_ARROW} OLDALE TOWN$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROUTE 101
{UP_ARROW} OLDALE TOWN
```

## `Route102_EventScript_RouteSignOldale`

`data/maps/Route102/scripts.inc:8`，类型 `script`，SHA-256 `279acbe46e9af3f2a0fcfc316cc8a057a616b9c0027e2a5075c9024adf8c564a`。

```asm
Route102_EventScript_RouteSignOldale::
	msgbox Route102_Text_RouteSignOldale, MSGBOX_SIGN
	end
```

## `Route102_EventScript_RouteSignPetalburg`

`data/maps/Route102/scripts.inc:12`，类型 `script`，SHA-256 `07e98e34406cd1001c67e1492bc06fd8cc9e1fc405d111edfb17d8fcc0f998fa`。

```asm
Route102_EventScript_RouteSignPetalburg::
	msgbox Route102_Text_RouteSignPetalburg, MSGBOX_SIGN
	end
```

## `Route102_Text_RouteSignOldale`

`data/maps/Route102/scripts.inc:103`，类型 `text`，SHA-256 `2de752b2b270fed63d01edad999e523f6300bb5b59548a5df966be738c8d57e0`。

```asm
Route102_Text_RouteSignOldale:
	.string "ROUTE 102\n"
	.string "{RIGHT_ARROW} OLDALE TOWN$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROUTE 102
{RIGHT_ARROW} OLDALE TOWN
```

## `Route102_Text_RouteSignPetalburg`

`data/maps/Route102/scripts.inc:107`，类型 `text`，SHA-256 `8ff0da3b47c61fa80ffafc48d35615fd95f80db5cb43fc3da5292c996aab002a`。

```asm
Route102_Text_RouteSignPetalburg:
	.string "ROUTE 102\n"
	.string "{LEFT_ARROW} PETALBURG CITY$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROUTE 102
{LEFT_ARROW} PETALBURG CITY
```

## `Route103_EventScript_RouteSign`

`data/maps/Route103/scripts.inc:188`，类型 `script`，SHA-256 `6e8aed18c9cf37508df705e91c75af8edf94b353a9001b82a9a6f2f2e45456d0`。

```asm
Route103_EventScript_RouteSign::
	msgbox Route103_Text_RouteSign, MSGBOX_SIGN
	end
```

## `Route103_Text_RouteSign`

`data/maps/Route103/scripts.inc:340`，类型 `text`，SHA-256 `b0bd91d0953caeef67d42e02e0c9656c98db1ced9ceb495ed7db4aac2b0e935e`。

```asm
Route103_Text_RouteSign:
	.string "ROUTE 103\n"
	.string "{DOWN_ARROW} OLDALE TOWN$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROUTE 103
{DOWN_ARROW} OLDALE TOWN
```

## `Route104_EventScript_BrineysCottageSign`

`data/maps/Route104/scripts.inc:289`，类型 `script`，SHA-256 `36045e89442ff074b02173b637fa4e7e241a188086fdc81b80827760014917f2`。

```asm
Route104_EventScript_BrineysCottageSign::
	msgbox Route104_Text_MrBrineysCottage, MSGBOX_SIGN
	end
```

## `Route104_EventScript_FlowerShopSign`

`data/maps/Route104/scripts.inc:301`，类型 `script`，SHA-256 `3663c3b325c95b2da2843de16ef47d975423ec84861e8a5fc7071b104420a13a`。

```asm
Route104_EventScript_FlowerShopSign::
	msgbox Route104_Text_PrettyPetalFlowShop, MSGBOX_SIGN
	end
```

## `Route104_EventScript_RouteSignPetalburg`

`data/maps/Route104/scripts.inc:293`，类型 `script`，SHA-256 `801170332f92f8e60ea8a426318f1be1fa5c8e63bdba66f5a16221d2d9ffd56a`。

```asm
Route104_EventScript_RouteSignPetalburg::
	msgbox Route104_Text_RouteSignPetalburg, MSGBOX_SIGN
	end
```

## `Route104_EventScript_RouteSignRustboro`

`data/maps/Route104/scripts.inc:297`，类型 `script`，SHA-256 `1d41bcf424c9bb7bf1dbcc7cdf3adadc84da4f49c401d38faf7d89fc9c0594e1`。

```asm
Route104_EventScript_RouteSignRustboro::
	msgbox Route104_Text_RouteSignRustboro, MSGBOX_SIGN
	end
```

## `Route104_EventScript_TrainerTipsDoubleBattles`

`data/maps/Route104/scripts.inc:305`，类型 `script`，SHA-256 `59d57a58f4c24237161de123875559fd3d6128efb53e840a9a2f8dddee083b5b`。

```asm
Route104_EventScript_TrainerTipsDoubleBattles::
	msgbox Route104_Text_TrainerTipsDoubleBattles, MSGBOX_SIGN
	end
```

## `Route104_Text_MrBrineysCottage`

`data/maps/Route104/scripts.inc:1042`，类型 `text`，SHA-256 `abd8fe870038aa80c5a8620b4b797aeacebe7806e565118978a6e59458436df7`。

```asm
Route104_Text_MrBrineysCottage:
	.string "MR. BRINEY'S COTTAGE$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
MR. BRINEY'S COTTAGE
```

## `Route104_Text_PrettyPetalFlowShop`

`data/maps/Route104/scripts.inc:1053`，类型 `text`，SHA-256 `e936b9991d12898237b572195fb896b6c18af1141ab66487592abd5ebb8be77d`。

```asm
Route104_Text_PrettyPetalFlowShop:
	.string "PRETTY PETAL FLOWER SHOP$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
PRETTY PETAL FLOWER SHOP
```

## `Route104_Text_RouteSignPetalburg`

`data/maps/Route104/scripts.inc:1045`，类型 `text`，SHA-256 `9b18367a5a55900c3286412ca369a371f62c65cb4853436f28b15bd4890d194c`。

```asm
Route104_Text_RouteSignPetalburg:
	.string "ROUTE 1O4\n"
	.string "{RIGHT_ARROW} PETALBURG CITY$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROUTE 1O4
{RIGHT_ARROW} PETALBURG CITY
```

## `Route104_Text_RouteSignRustboro`

`data/maps/Route104/scripts.inc:1049`，类型 `text`，SHA-256 `260690eeeaff19be9e9fbf69e1edbd6f1a2e73bfcf34cf005dca2ba5e2e810cc`。

```asm
Route104_Text_RouteSignRustboro:
	.string "ROUTE 1O4\n"
	.string "{UP_ARROW} RUSTBORO CITY$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROUTE 1O4
{UP_ARROW} RUSTBORO CITY
```

## `Route104_Text_TrainerTipsDoubleBattles`

`data/maps/Route104/scripts.inc:1056`，类型 `text`，SHA-256 `88af728ca34daf6743d9decbb6e4444793f95ce677b334a6404a67ffe44a38f7`。

```asm
Route104_Text_TrainerTipsDoubleBattles:
	.string "TRAINER TIPS\p"
	.string "In the HOENN region there are pairs\n"
	.string "of TRAINERS who challenge others\l"
	.string "for 2-on-2 POKéMON battles called\l"
	.string "DOUBLE BATTLES.\p"
	.string "In a DOUBLE BATTLE, the TRAINER must\n"
	.string "send out two POKéMON, the one at the\l"
	.string "left of the list and the top one.\l"
	.string "Watch how POKéMON are lined up.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
TRAINER TIPS

In the HOENN region there are pairs
of TRAINERS who challenge others
for 2-on-2 POKéMON battles called
DOUBLE BATTLES.

In a DOUBLE BATTLE, the TRAINER must
send out two POKéMON, the one at the
left of the list and the top one.
Watch how POKéMON are lined up.
```

## `Route116_EventScript_RouteSignRustboro`

`data/maps/Route116/scripts.inc:112`，类型 `script`，SHA-256 `65a8e25d13dd157a6733dab1b104691d54495b4336a7cab819cde70814b6c45a`。

```asm
Route116_EventScript_RouteSignRustboro::
	msgbox Route116_Text_RouteSignRustboro, MSGBOX_SIGN
	end
```

## `Route116_EventScript_RusturfTunnelSign`

`data/maps/Route116/scripts.inc:116`，类型 `script`，SHA-256 `f3bcaef783dc85811e0e261c7dad35ec22d2961c666719ee79809479b495ef63`。

```asm
Route116_EventScript_RusturfTunnelSign::
	msgbox Route116_Text_RusturfTunnelSign, MSGBOX_SIGN
	end
```

## `Route116_EventScript_TrainerTipsBToStopEvolution`

`data/maps/Route116/scripts.inc:124`，类型 `script`，SHA-256 `22d1743f8c9f5866b25a4564408bc7cc674b50b6b605f1b0989f9dbd18dd25a1`。

```asm
Route116_EventScript_TrainerTipsBToStopEvolution::
	msgbox Route116_Text_TrainerTipsBToStopEvolution, MSGBOX_SIGN
	end
```

## `Route116_EventScript_TrainerTipsBagHasPockets`

`data/maps/Route116/scripts.inc:128`，类型 `script`，SHA-256 `c0d03a0c2dbd9bff4e15708634dff6abbdbe1c2f20ca4aa6e88129970245eff9`。

```asm
Route116_EventScript_TrainerTipsBagHasPockets::
	msgbox Route116_Text_TrainerTipsBagHasPockets, MSGBOX_SIGN
	end
```

## `Route116_EventScript_TunnelersRestHouseSign`

`data/maps/Route116/scripts.inc:120`，类型 `script`，SHA-256 `81543b12144c302122ac1b6b2c62c1f477334b8cd1256b0ebf9bad3cc86ffc45`。

```asm
Route116_EventScript_TunnelersRestHouseSign::
	msgbox Route116_Text_TunnelersRestHouse, MSGBOX_SIGN
	end
```

## `Route116_Text_RouteSignRustboro`

`data/maps/Route116/scripts.inc:438`，类型 `text`，SHA-256 `d9af6cf6b7a708aefe9a47b55f6000e7e5b8dfb7f2ee2774ca374bf16e4e1a77`。

```asm
Route116_Text_RouteSignRustboro:
	.string "ROUTE 116\n"
	.string "{LEFT_ARROW} RUSTBORO CITY$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROUTE 116
{LEFT_ARROW} RUSTBORO CITY
```

## `Route116_Text_RusturfTunnelSign`

`data/maps/Route116/scripts.inc:442`，类型 `text`，SHA-256 `1245ab85eb96f5d345f7857284ed5d9e38ce4ad1dcba9777f120b8d4d767f22a`。

```asm
Route116_Text_RusturfTunnelSign:
	.string "RUSTURF TUNNEL\n"
	.string "“Linking RUSTBORO and VERDANTURF\p"
	.string "“The tunnel project has been\n"
	.string "canceled.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
RUSTURF TUNNEL
“Linking RUSTBORO and VERDANTURF

“The tunnel project has been
canceled.”
```

## `Route116_Text_TrainerTipsBToStopEvolution`

`data/maps/Route116/scripts.inc:451`，类型 `text`，SHA-256 `237c69e54241e053bd78937d43091d69c117e345f5fb59109bc69e00fbd22e7f`。

```asm
Route116_Text_TrainerTipsBToStopEvolution:
	.string "TRAINER TIPS\p"
	.string "If you want to stop a POKéMON from\n"
	.string "evolving, press the B Button while it\l"
	.string "is trying to evolve.\l"
	.string "The startled POKéMON will stop.\p"
	.string "This is called an evolution cancel.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
TRAINER TIPS

If you want to stop a POKéMON from
evolving, press the B Button while it
is trying to evolve.
The startled POKéMON will stop.

This is called an evolution cancel.
```

## `Route116_Text_TrainerTipsBagHasPockets`

`data/maps/Route116/scripts.inc:459`，类型 `text`，SHA-256 `c07e4579d9d6e7d19d41c9de6870f4031f56eae6e8e13c97d51276f456e81425`。

```asm
Route116_Text_TrainerTipsBagHasPockets:
	.string "TRAINER TIPS\p"
	.string "Your BAG has several POCKETS.\p"
	.string "Items you obtain are automatically\n"
	.string "placed in the appropriate POCKETS.\p"
	.string "No TRAINER can afford to be without\n"
	.string "a BAG of their own.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
TRAINER TIPS

Your BAG has several POCKETS.

Items you obtain are automatically
placed in the appropriate POCKETS.

No TRAINER can afford to be without
a BAG of their own.
```

## `Route116_Text_TunnelersRestHouse`

`data/maps/Route116/scripts.inc:448`，类型 `text`，SHA-256 `b42fa72a9375707bff9947ac048acdee9bdec899d357fa12c408ae059360f6a0`。

```asm
Route116_Text_TunnelersRestHouse:
	.string "TUNNELER'S REST HOUSE$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
TUNNELER'S REST HOUSE
```

## `RustboroCity_DevonCorp_1F_EventScript_ProductsDisplay`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:77`，类型 `script`，SHA-256 `15ddbe7b9d7c7a3d70587ff9594976a4f32dbebe49595d8708098d319c3ae502`。

```asm
RustboroCity_DevonCorp_1F_EventScript_ProductsDisplay::
	msgbox RustboroCity_DevonCorp_1F_Text_ProductDisplay, MSGBOX_SIGN
	end
```

## `RustboroCity_DevonCorp_1F_EventScript_RocksMetalDisplay`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:73`，类型 `script`，SHA-256 `b23f5d88cd0ec2aaab517850228feda46cccaf4845344fcd797cea8f3417b6a4`。

```asm
RustboroCity_DevonCorp_1F_EventScript_RocksMetalDisplay::
	msgbox RustboroCity_DevonCorp_1F_Text_RocksMetalDisplay, MSGBOX_SIGN
	end
```

## `RustboroCity_DevonCorp_1F_Text_ProductDisplay`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:134`，类型 `text`，SHA-256 `6fe5cb9241282d29caa2ec7a65f8cc9503e199d69fb93721f6a689f8dc51814e`。

```asm
RustboroCity_DevonCorp_1F_Text_ProductDisplay:
	.string "Prototypes and test products fill\n"
	.string "the glass display case.\p"
	.string "There's a panel with a description…\p"
	.string "“In addition to industrial products,\n"
	.string "DEVON now markets sundries and\l"
	.string "pharmaceuticals for better lifestyles.\p"
	.string "“Recently, DEVON has begun marketing\n"
	.string "tools for POKéMON TRAINERS, including\l"
	.string "POKé BALLS and POKéNAV systems.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Prototypes and test products fill
the glass display case.

There's a panel with a description…

“In addition to industrial products,
DEVON now markets sundries and
pharmaceuticals for better lifestyles.

“Recently, DEVON has begun marketing
tools for POKéMON TRAINERS, including
POKé BALLS and POKéNAV systems.”
```

## `RustboroCity_DevonCorp_1F_Text_RocksMetalDisplay`

`data/maps/RustboroCity_DevonCorp_1F/scripts.inc:120`，类型 `text`，SHA-256 `0840a4871be322f997933b0698cf63fe681a69e1be81fcfd48ff5cb213364ab5`。

```asm
RustboroCity_DevonCorp_1F_Text_RocksMetalDisplay:
	.string "Samples of rocks and metal are\n"
	.string "displayed in the glass case.\p"
	.string "There's a panel with some writing\n"
	.string "on it…\p"
	.string "“DEVON CORPORATION got its start as\n"
	.string "a producer of stones from quarries.\p"
	.string "“The company also produced iron from\n"
	.string "filings in the sand.\p"
	.string "“From that humble start as a producer\n"
	.string "of raw materials, DEVON developed.\p"
	.string "“DEVON is now a manufacturer of a wide\n"
	.string "range of industrial products.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Samples of rocks and metal are
displayed in the glass case.

There's a panel with some writing
on it…

“DEVON CORPORATION got its start as
a producer of stones from quarries.

“The company also produced iron from
filings in the sand.

“From that humble start as a producer
of raw materials, DEVON developed.

“DEVON is now a manufacturer of a wide
range of industrial products.”
```

## `RustboroCity_DevonCorp_3F_EventScript_RareRocksDisplay`

`data/maps/RustboroCity_DevonCorp_3F/scripts.inc:189`，类型 `script`，SHA-256 `7cf482d7cb21e6234e87f9cdb6b050a9184e1287d3ae730a61e0641d9e25714c`。

```asm
RustboroCity_DevonCorp_3F_EventScript_RareRocksDisplay::
	msgbox RustboroCity_DevonCorp_3F_Text_RareRocksDisplay, MSGBOX_SIGN
	end
```

## `RustboroCity_DevonCorp_3F_Text_RareRocksDisplay`

`data/maps/RustboroCity_DevonCorp_3F/scripts.inc:298`，类型 `text`，SHA-256 `acb2259dee8380ef8a4e3564fc1a66dcfad64e1078c45ca4d5fbab3da5f0b332`。

```asm
RustboroCity_DevonCorp_3F_Text_RareRocksDisplay:
	.string "It's a collection of rare rocks and\n"
	.string "stones assembled by the PRESIDENT.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a collection of rare rocks and
stones assembled by the PRESIDENT.
```

## `RustboroCity_EventScript_CitySign`

`data/maps/RustboroCity/scripts.inc:196`，类型 `script`，SHA-256 `71125e575d8917f45a9e9117f0820179a23d1feb5d31dace910d55b6060636b4`。

```asm
RustboroCity_EventScript_CitySign::
	msgbox RustboroCity_Text_CitySign, MSGBOX_SIGN
	end
```

## `RustboroCity_EventScript_CuttersHouseSign`

`data/maps/RustboroCity/scripts.inc:204`，类型 `script`，SHA-256 `32dfd4f6dc12da1cfa1f5fed76a2d0159ec695eb456c8bee9519ff8076fc2b90`。

```asm
RustboroCity_EventScript_CuttersHouseSign::
	msgbox RustboroCity_Text_CuttersHouse, MSGBOX_SIGN
	end
```

## `RustboroCity_EventScript_DevonCorpSign`

`data/maps/RustboroCity/scripts.inc:183`，类型 `script`，SHA-256 `ba8f8d6295a164181837b0035ef75c1ff387fe5d95fe5a6a5e138f3641f6784f`。

```asm
RustboroCity_EventScript_DevonCorpSign::
	msgbox RustboroCity_Text_DevonCorpSign, MSGBOX_SIGN
	end
```

## `RustboroCity_EventScript_TrainersSchoolSign`

`data/maps/RustboroCity/scripts.inc:200`，类型 `script`，SHA-256 `87deda8244855a74803430adf370cf7f135a4ac788994bdf586fa1b6d246a4a2`。

```asm
RustboroCity_EventScript_TrainersSchoolSign::
	msgbox RustboroCity_Text_TrainersSchoolSign, MSGBOX_SIGN
	end
```

## `RustboroCity_EventScript_TunnelSign`

`data/maps/RustboroCity/scripts.inc:179`，类型 `script`，SHA-256 `dbb5194d068b088ff5b70108254e00bd0613cda175cc86230ac9678813e24741`。

```asm
RustboroCity_EventScript_TunnelSign::
	msgbox RustboroCity_Text_TunnelNearingCompletion, MSGBOX_SIGN
	end
```

## `RustboroCity_PokemonSchool_EventScript_StudentNotebook`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:73`，类型 `script`，SHA-256 `9a4c8fec17d7bc229c0c9610ea81c47a6bcd1eb40d9d981611d126e6c71072e7`。

```asm
RustboroCity_PokemonSchool_EventScript_StudentNotebook::
	msgbox RustboroCity_PokemonSchool_Text_StudentsNotes, MSGBOX_SIGN
	end
```

## `RustboroCity_PokemonSchool_Text_StudentsNotes`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:287`，类型 `text`，SHA-256 `be44dcc27a064461d5014f4148864b5e3c7d253c3f5d49a8005c09332169361f`。

```asm
RustboroCity_PokemonSchool_Text_StudentsNotes:
	.string "It's this student's notebook…\p"
	.string "POKéMON are to be caught using\n"
	.string "POKé BALLS.\p"
	.string "Up to six POKéMON can accompany\n"
	.string "a TRAINER.\p"
	.string "A TRAINER is someone who catches\n"
	.string "POKéMON, raises them, and battles\l"
	.string "with them.\p"
	.string "A TRAINER's mission is to defeat\n"
	.string "the strong TRAINERS who await\l"
	.string "challengers in POKéMON GYMS.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's this student's notebook…

POKéMON are to be caught using
POKé BALLS.

Up to six POKéMON can accompany
a TRAINER.

A TRAINER is someone who catches
POKéMON, raises them, and battles
with them.

A TRAINER's mission is to defeat
the strong TRAINERS who await
challengers in POKéMON GYMS.
```

## `RustboroCity_Text_CitySign`

`data/maps/RustboroCity/scripts.inc:1145`，类型 `text`，SHA-256 `f99ac2f4ae4141493a087087d331a24f1eb6f27a923f999dc7e140808b6cc43f`。

```asm
RustboroCity_Text_CitySign:
	.string "RUSTBORO CITY\p"
	.string "“The city probing the integration of\n"
	.string "nature and science.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
RUSTBORO CITY

“The city probing the integration of
nature and science.”
```

## `RustboroCity_Text_CuttersHouse`

`data/maps/RustboroCity/scripts.inc:1155`，类型 `text`，SHA-256 `9387835163dd139897494ae0c96e88364497f7da8fc281701be9ef9c26161313`。

```asm
RustboroCity_Text_CuttersHouse:
	.string "CUTTER'S HOUSE$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
CUTTER'S HOUSE
```

## `RustboroCity_Text_DevonCorpSign`

`data/maps/RustboroCity/scripts.inc:1130`，类型 `text`，SHA-256 `7acb0d1396b0c469157224282622226374468ba64aad1a0f31647c49ec347c6c`。

```asm
RustboroCity_Text_DevonCorpSign:
	.string "DEVON CORPORATION\p"
	.string "“For all your living needs, we make\n"
	.string "it all.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
DEVON CORPORATION

“For all your living needs, we make
it all.”
```

## `RustboroCity_Text_TrainersSchoolSign`

`data/maps/RustboroCity/scripts.inc:1150`，类型 `text`，SHA-256 `144e8a011d9a5e21cfdfc05b04d392688f37185680fc0ef4332fb2b15e7e300e`。

```asm
RustboroCity_Text_TrainersSchoolSign:
	.string "POKéMON TRAINER'S SCHOOL\p"
	.string "“We'll teach you anything about\n"
	.string "POKéMON!”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
POKéMON TRAINER'S SCHOOL

“We'll teach you anything about
POKéMON!”
```

## `RustboroCity_Text_TunnelNearingCompletion`

`data/maps/RustboroCity/scripts.inc:1123`，类型 `text`，SHA-256 `218cfaa972e3ffb626e396fd9750366007c541141d54cf957c26ff7426104d3c`。

```asm
RustboroCity_Text_TunnelNearingCompletion:
	.string "“Timesaving tunnel nearing\n"
	.string "completion!”\p"
	.string "…Is what it says on the sign, but\n"
	.string "there's also a big “X” splashed\l"
	.string "across it in red paint…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“Timesaving tunnel nearing
completion!”

…Is what it says on the sign, but
there's also a big “X” splashed
across it in red paint…
```

## `SlateportCity_EventScript_BattleTentSign`

`data/maps/SlateportCity/scripts.inc:254`，类型 `script`，SHA-256 `7afdca9bfe81f65cc162de94adc59ee97de397619f185d256bf8ed5dd6f8f59b`。

```asm
SlateportCity_EventScript_BattleTentSign::
	msgbox SlateportCity_Text_BattleTentSign, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_CitySign`

`data/maps/SlateportCity/scripts.inc:284`，类型 `script`，SHA-256 `f0df60b22865408031199729052c05cb0f7dab1067f101c6448fa48e308a9c7f`。

```asm
SlateportCity_EventScript_CitySign::
	msgbox SlateportCity_Text_CitySign, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_MarketSign`

`data/maps/SlateportCity/scripts.inc:288`，类型 `script`，SHA-256 `81b07fdef4bdd6d7ad26ed2deed9b7c67e83af0e6c07d15bfc00d3cf9b058a07`。

```asm
SlateportCity_EventScript_MarketSign::
	msgbox SlateportCity_Text_MarketSign, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_NameRatersHouseSign`

`data/maps/SlateportCity/scripts.inc:304`，类型 `script`，SHA-256 `edc1f6b3089405513c52ede48d98d1148b229966637c1d296c1ee591159ed297`。

```asm
SlateportCity_EventScript_NameRatersHouseSign::
	msgbox SlateportCity_Text_NameRatersHouseSign, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_OceanicMuseumSign`

`data/maps/SlateportCity/scripts.inc:280`，类型 `script`，SHA-256 `010e7b1dd5aeb382b40bd04a25d14f7a879c87f1484d2e6b97e23ff872bfbf2e`。

```asm
SlateportCity_EventScript_OceanicMuseumSign::
	msgbox SlateportCity_Text_OceanicMuseumSign, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_PokemonFanClubSign`

`data/maps/SlateportCity/scripts.inc:276`，类型 `script`，SHA-256 `24d944c24d0b5847ec3a7c5e7b07afa64a8780acbda2a02e7fda439414ded542`。

```asm
SlateportCity_EventScript_PokemonFanClubSign::
	msgbox SlateportCity_Text_PokemonFanClubSign, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_BeachSandDisplay`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:98`，类型 `script`，SHA-256 `9387357f5855c998205bd3aa034af35c83efe364e4d2320eae6eed5a667e9dcf`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_BeachSandDisplay::
	msgbox SlateportCity_OceanicMuseum_1F_Text_BeachSandDisplay, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_DepthMeasuringMachine`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:118`，类型 `script`，SHA-256 `27fac4aa9479332e80dfe7070a9e823f3283a360c3f32be1b5fc9af14efc78fb`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_DepthMeasuringMachine::
	msgbox SlateportCity_OceanicMuseum_1F_Text_DepthMeasuringMachine, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_FossilDisplay`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:114`，类型 `script`，SHA-256 `6e2218dafc40ba99feaf6b44d9f9d606533e6be6fba43fbbd48c45b1d766f448`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_FossilDisplay::
	msgbox SlateportCity_OceanicMuseum_1F_Text_FossilDisplay, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_OceanSoilDisplay`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:94`，类型 `script`，SHA-256 `e2854f24730312fef6473eed6a306dc259177c51da56b2045f3e133ee2e6433c`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_OceanSoilDisplay::
	msgbox SlateportCity_OceanicMuseum_1F_Text_OceanSoilDisplay, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact1`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:102`，类型 `script`，SHA-256 `0a0e73a458ffa61be88ffc9db5fb77cc90b7313837222a178ad11c0e84e60130`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact1::
	msgbox SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact1, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact2`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:106`，类型 `script`，SHA-256 `0f4d5bd24251a531c4fdca9f2862807b1316923dc530941eb3f2e530e4b52868`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact2::
	msgbox SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact2, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact3`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:110`，类型 `script`，SHA-256 `8543319ba59966cc068415cbd7a31028491196e50ab5231be10ed953b883e087`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_OceanicMinifact3::
	msgbox SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact3, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_WaterfallExperiment`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:90`，类型 `script`，SHA-256 `de3e301622f8d5cdda87c736ef1f45dc87cc1b43883a04773a2ffde86bf9a1f9`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_WaterfallExperiment::
	msgbox SlateportCity_OceanicMuseum_1F_Text_WaterfallExperiment, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_WhirlpoolExperiment`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:86`，类型 `script`，SHA-256 `2cccd4bc1c06b9cfe2e2da294efe73be68cd879d558884876909f081bb53ba04`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_WhirlpoolExperiment::
	msgbox SlateportCity_OceanicMuseum_1F_Text_WhirlpoolExperiment, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_Text_BeachSandDisplay`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:322`，类型 `text`，SHA-256 `02deb15ae64f4e2040e1d18573b6561021fbc55a195b896adfaf9fc109dd6f85`。

```asm
SlateportCity_OceanicMuseum_1F_Text_BeachSandDisplay:
	.string "It's a sample of beach sand.\p"
	.string "“Stones from mountains are washed\n"
	.string "down by rivers where they are\l"
	.string "chipped and ground down.\p"
	.string "“They are reduced to grains and end\n"
	.string "up as sand on beaches.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a sample of beach sand.

“Stones from mountains are washed
down by rivers where they are
chipped and ground down.

“They are reduced to grains and end
up as sand on beaches.”
```

## `SlateportCity_OceanicMuseum_1F_Text_DepthMeasuringMachine`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:366`，类型 `text`，SHA-256 `ed74a2a65b9f9f6a727c2145d57cc870bfac3fe030a8a0eedf5363065d29d50e`。

```asm
SlateportCity_OceanicMuseum_1F_Text_DepthMeasuringMachine:
	.string "A strange machine is rotating under\n"
	.string "a glass dome.\p"
	.string "Maybe it's for measuring the depth\n"
	.string "of something…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A strange machine is rotating under
a glass dome.

Maybe it's for measuring the depth
of something…
```

## `SlateportCity_OceanicMuseum_1F_Text_FossilDisplay`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:357`，类型 `text`，SHA-256 `846c32a4996b8806eaf72fe37ffac3acbe809bc9c83142f99fb26bff02791c4e`。

```asm
SlateportCity_OceanicMuseum_1F_Text_FossilDisplay:
	.string "It's a fossil with wavy ridges on it.\p"
	.string "“Soil on the ocean floor gets scoured\n"
	.string "by the tide.\p"
	.string "“The flowing seawater marks the soil\n"
	.string "with small ridges and valleys.\p"
	.string "“If this soil becomes fossilized, it is\n"
	.string "called a ripple mark.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a fossil with wavy ridges on it.

“Soil on the ocean floor gets scoured
by the tide.

“The flowing seawater marks the soil
with small ridges and valleys.

“If this soil becomes fossilized, it is
called a ripple mark.”
```

## `SlateportCity_OceanicMuseum_1F_Text_OceanSoilDisplay`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:313`，类型 `text`，SHA-256 `c34aacd3ec119ef03050a313ec998a2bd57d35d9b01efbde896127f4c3654ff9`。

```asm
SlateportCity_OceanicMuseum_1F_Text_OceanSoilDisplay:
	.string "It's a sample of soil from the ocean\n"
	.string "floor.\p"
	.string "“Over many years, the remains of\n"
	.string "life-forms settle at the bottom of\l"
	.string "the sea, making sedimentary layers.\p"
	.string "“By analyzing these layers, the\n"
	.string "ancient past is revealed.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a sample of soil from the ocean
floor.

“Over many years, the remains of
life-forms settle at the bottom of
the sea, making sedimentary layers.

“By analyzing these layers, the
ancient past is revealed.”
```

## `SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact1`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:330`，类型 `text`，SHA-256 `ce86f0d29cb99ebcd10a736e9c5c1d4090fcba6e398278d49a762c6106ffdce3`。

```asm
SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact1:
	.string "“OCEANIC MINIFACT 1\n"
	.string "Why is seawater blue?\p"
	.string "“Light is composed of many colors.\p"
	.string "“When light passes through water,\n"
	.string "most kinds of light lose color.\p"
	.string "“However, blue light retains its\n"
	.string "color, making the sea appear blue.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“OCEANIC MINIFACT 1
Why is seawater blue?

“Light is composed of many colors.

“When light passes through water,
most kinds of light lose color.

“However, blue light retains its
color, making the sea appear blue.”
```

## `SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact2`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:339`，类型 `text`，SHA-256 `5a4a2697dd5bb81c85296c797f03ae0f5fef6817ec4b0deb580ff97782d3e016`。

```asm
SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact2:
	.string "“OCEANIC MINIFACT 2\n"
	.string "Why is the sea salty?\p"
	.string "“Seawater contains dissolved salt in\n"
	.string "the form of sodium and chlorine ions.\p"
	.string "“These ions leech out of rocks\n"
	.string "and are carried out to sea by rain.\p"
	.string "“The concentration of dissolved salt\n"
	.string "makes the sea salty.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“OCEANIC MINIFACT 2
Why is the sea salty?

“Seawater contains dissolved salt in
the form of sodium and chlorine ions.

“These ions leech out of rocks
and are carried out to sea by rain.

“The concentration of dissolved salt
makes the sea salty.”
```

## `SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact3`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:349`，类型 `text`，SHA-256 `11d792e64c9aff12458e4a1684bce9288480a73e14ee3a5da86ae2a0ffdbf21c`。

```asm
SlateportCity_OceanicMuseum_1F_Text_OceanicMinifact3:
	.string "“OCEANIC MINIFACT 3\n"
	.string "Which is bigger? The sea or land?\p"
	.string "“The sea covers about 70% of\n"
	.string "the planet, and the rest is land.\p"
	.string "“The sea is therefore more than twice\n"
	.string "the size of land.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“OCEANIC MINIFACT 3
Which is bigger? The sea or land?

“The sea covers about 70% of
the planet, and the rest is land.

“The sea is therefore more than twice
the size of land.”
```

## `SlateportCity_OceanicMuseum_1F_Text_WaterfallExperiment`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:307`，类型 `text`，SHA-256 `c46a4f7d2f2ee3bd51ec6960fc0a691161703793ce3ec2a42d249ebe637a3fc1`。

```asm
SlateportCity_OceanicMuseum_1F_Text_WaterfallExperiment:
	.string "A red ball is bobbing up and down\n"
	.string "inside a glass vessel.\p"
	.string "“This is an experiment simulating a\n"
	.string "WATERFALL using the ball's buoyancy.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A red ball is bobbing up and down
inside a glass vessel.

“This is an experiment simulating a
WATERFALL using the ball's buoyancy.”
```

## `SlateportCity_OceanicMuseum_1F_Text_WhirlpoolExperiment`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:301`，类型 `text`，SHA-256 `f2862efed4c6537546be1dab144cabbd7bde6d37c326c71349e2798cc00f3699`。

```asm
SlateportCity_OceanicMuseum_1F_Text_WhirlpoolExperiment:
	.string "A blue fluid is spiraling inside\n"
	.string "a glass vessel.\p"
	.string "“This is an experiment to create a\n"
	.string "WHIRLPOOL artificially using wind.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A blue fluid is spiraling inside
a glass vessel.

“This is an experiment to create a
WHIRLPOOL artificially using wind.”
```

## `SlateportCity_OceanicMuseum_2F_EventScript_DeepSeawaterDisplay`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:216`，类型 `script`，SHA-256 `008d5be9d457f7c8475a0af699b25d0467389e21db6678a498499766af2e42b4`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_DeepSeawaterDisplay::
	msgbox SlateportCity_OceanicMuseum_2F_Text_DeepSeawaterDisplay, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_HoennModel`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:212`，类型 `script`，SHA-256 `71c30951660e96c18801daf2371bb4d265f464af0e76116a3a8f72d9424f5939`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_HoennModel::
	msgbox SlateportCity_OceanicMuseum_2F_Text_HoennModel, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_PressureExperiment`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:208`，类型 `script`，SHA-256 `01b6b7e51b91f4734ae32bddf8a0925d3b3f69d81c3d022baa0db3260aaa417f`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_PressureExperiment::
	msgbox SlateportCity_OceanicMuseum_2F_Text_PressureExperiment, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_SSAnneReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:236`，类型 `script`，SHA-256 `09b2c67c31ba09b5ae416f006e4a6b9c8de812efdb669ab53ea3763f97b15026`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_SSAnneReplica::
	msgbox SlateportCity_OceanicMuseum_2F_Text_SSAnneReplica, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_SSTidalReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:224`，类型 `script`，SHA-256 `bf12bb0e23dbee317180b09d3d0d1aa06c56083062b5cf8991e0ec5036aa4a7b`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_SSTidalReplica::
	msgbox SlateportCity_OceanicMuseum_2F_Text_SSTidalReplica, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_SubmarineReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:228`，类型 `script`，SHA-256 `cb11e469841f8984ceebaf30af5de2a43291cf30b54b905159203c2b43c97bfe`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_SubmarineReplica::
	msgbox SlateportCity_OceanicMuseum_2F_Text_SubmarineReplica, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_SubmersibleReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:232`，类型 `script`，SHA-256 `9a109729c8ee45f86de3041fd346127e80ec2a3a54bcf1974f8652d463aa4ff3`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_SubmersibleReplica::
	msgbox SlateportCity_OceanicMuseum_2F_Text_SumbersibleReplica, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_SurfaceSeawaterDisplay`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:220`，类型 `script`，SHA-256 `d30037d82ed9e8d4dd7e39e3cd1d00cdff7538587e3218f4be9cc49e642f1109`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_SurfaceSeawaterDisplay::
	msgbox SlateportCity_OceanicMuseum_2F_Text_SurfaceSeawaterDisplay, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_WaterQualitySample1`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:200`，类型 `script`，SHA-256 `c702b9d6c812c55ec35d890da548e97b2c80a0333c4e52518b3a5f2a38ca71cc`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_WaterQualitySample1::
	msgbox SlateportCity_OceanicMuseum_2F_Text_WaterQualitySample1, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_WaterQualitySample2`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:204`，类型 `script`，SHA-256 `c5d95e17557e5b58b328cf6bf03cfc86e49f16452c6f9e5def5544a000f33237`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_WaterQualitySample2::
	msgbox SlateportCity_OceanicMuseum_2F_Text_WaterQualitySample2, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_2F_Text_DeepSeawaterDisplay`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:392`，类型 `text`，SHA-256 `2539241fd30de00361e70cc8d3742636a26f14595db3414b12f2d5de1b57346d`。

```asm
SlateportCity_OceanicMuseum_2F_Text_DeepSeawaterDisplay:
	.string "It's a display on the flow of seawater.\p"
	.string "“Near the bottom of the sea, water\n"
	.string "flows due to differences in such\l"
	.string "factors as temperature and salinity.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a display on the flow of seawater.

“Near the bottom of the sea, water
flows due to differences in such
factors as temperature and salinity.”
```

## `SlateportCity_OceanicMuseum_2F_Text_HoennModel`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:386`，类型 `text`，SHA-256 `4b4f37f279c5930e1b888925feeebcff586674fcf838e3b74c355b4bdd65540c`。

```asm
SlateportCity_OceanicMuseum_2F_Text_HoennModel:
	.string "“MODEL OF HOENN REGION”\p"
	.string "It's a miniature diorama of the\n"
	.string "HOENN region.\p"
	.string "Where is LITTLEROOT TOWN on this?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“MODEL OF HOENN REGION”

It's a miniature diorama of the
HOENN region.

Where is LITTLEROOT TOWN on this?
```

## `SlateportCity_OceanicMuseum_2F_Text_PressureExperiment`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:375`，类型 `text`，SHA-256 `b185ba96739b9a227bac47fe3b446b0adc5f1ab7f2f28627f749753f95acb97b`。

```asm
SlateportCity_OceanicMuseum_2F_Text_PressureExperiment:
	.string "A rubber ball is expanding and\n"
	.string "shrinking.\p"
	.string "“In the sea, the weight of water itself\n"
	.string "exerts pressure.\p"
	.string "“In shallow water, the pressure is not\n"
	.string "very heavy.\p"
	.string "“However, in extremely deep water,\n"
	.string "the pressure can reach even tens of\l"
	.string "thousands of tons on a small area.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A rubber ball is expanding and
shrinking.

“In the sea, the weight of water itself
exerts pressure.

“In shallow water, the pressure is not
very heavy.

“However, in extremely deep water,
the pressure can reach even tens of
thousands of tons on a small area.”
```

## `SlateportCity_OceanicMuseum_2F_Text_SSAnneReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:418`，类型 `text`，SHA-256 `ba6240413c42ffdf416209a0599d74298572442e45fb1d50233fcbe2717d8eef`。

```asm
SlateportCity_OceanicMuseum_2F_Text_SSAnneReplica:
	.string "“S.S. ANNE\p"
	.string "“A replica of the luxury liner that\n"
	.string "circles the globe.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“S.S. ANNE

“A replica of the luxury liner that
circles the globe.”
```

## `SlateportCity_OceanicMuseum_2F_Text_SSTidalReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:403`，类型 `text`，SHA-256 `67c9de46a6dce4d84b9292e8dec406aec97477f9af15614fd09765f95a5862ab`。

```asm
SlateportCity_OceanicMuseum_2F_Text_SSTidalReplica:
	.string "“THE FERRY S.S. TIDAL\p"
	.string "“A scale replica of the ship under\n"
	.string "construction at STERN'S SHIPYARD.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“THE FERRY S.S. TIDAL

“A scale replica of the ship under
construction at STERN'S SHIPYARD.”
```

## `SlateportCity_OceanicMuseum_2F_Text_SubmarineReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:408`，类型 `text`，SHA-256 `409777a111139d9aca136238cce830a171e61fd8afafe34560236271c7b276b7`。

```asm
SlateportCity_OceanicMuseum_2F_Text_SubmarineReplica:
	.string "“SUBMARINE EXPLORER 1\p"
	.string "“A replica of the high-performance\n"
	.string "ocean floor exploration submarine.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“SUBMARINE EXPLORER 1

“A replica of the high-performance
ocean floor exploration submarine.”
```

## `SlateportCity_OceanicMuseum_2F_Text_SumbersibleReplica`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:413`，类型 `text`，SHA-256 `fd87fb22921669e9bb5d3bee2e289190bca5acd51328476f952d3a7b708d8d6e`。

```asm
SlateportCity_OceanicMuseum_2F_Text_SumbersibleReplica:
	.string "“SUBMERSIBLE POD\p"
	.string "“A replica of a compact, unmanned\n"
	.string "pod for seafloor exploration.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“SUBMERSIBLE POD

“A replica of a compact, unmanned
pod for seafloor exploration.”
```

## `SlateportCity_OceanicMuseum_2F_Text_SurfaceSeawaterDisplay`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:398`，类型 `text`，SHA-256 `1ee81527cb1945b3dbd8157aa21fb9820dcbb544df5b40974040216a0557163c`。

```asm
SlateportCity_OceanicMuseum_2F_Text_SurfaceSeawaterDisplay:
	.string "It's a display on the flow of seawater.\p"
	.string "“Toward the surface, seawater flows\n"
	.string "as currents driven by the winds.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a display on the flow of seawater.

“Toward the surface, seawater flows
as currents driven by the winds.”
```

## `SlateportCity_OceanicMuseum_2F_Text_WaterQualitySample1`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:363`，类型 `text`，SHA-256 `03046453f78eeac73f6c106d797d7a7708adbd439b2d94ba1e58743ac4b8d57f`。

```asm
SlateportCity_OceanicMuseum_2F_Text_WaterQualitySample1:
	.string "“WATER QUALITY SAMPLE 1,” the\n"
	.string "label says.\p"
	.string "The sea is all connected, but the\n"
	.string "water seems to differ by region.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“WATER QUALITY SAMPLE 1,” the
label says.

The sea is all connected, but the
water seems to differ by region.
```

## `SlateportCity_OceanicMuseum_2F_Text_WaterQualitySample2`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:369`，类型 `text`，SHA-256 `0e1311affb253e0dbd70ee29ced5cb5ac0468183b92a82740c69946f8f821001`。

```asm
SlateportCity_OceanicMuseum_2F_Text_WaterQualitySample2:
	.string "“WATER QUALITY SAMPLE 2,” the\n"
	.string "label says.\p"
	.string "Does the saltiness of seawater differ\n"
	.string "by region, too?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“WATER QUALITY SAMPLE 2,” the
label says.

Does the saltiness of seawater differ
by region, too?
```

## `SlateportCity_Text_BattleTentSign`

`data/maps/SlateportCity/scripts.inc:1168`，类型 `text`，SHA-256 `84154cb7c9faf8c1a928391786091b0848d19571fd58d0da5407611fadc6997d`。

```asm
SlateportCity_Text_BattleTentSign:
	.string "BATTLE TENT SLATEPORT SITE\n"
	.string "“Find it! The ultimate POKéMON!”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
BATTLE TENT SLATEPORT SITE
“Find it! The ultimate POKéMON!”
```

## `SlateportCity_Text_CitySign`

`data/maps/SlateportCity/scripts.inc:1198`，类型 `text`，SHA-256 `a1338ec021f4b0ebb0d739058afe63e63eba7ec2f45add1c63ed9f1fcb4021e9`。

```asm
SlateportCity_Text_CitySign:
	.string "SLATEPORT CITY\p"
	.string "“The port where people and POKéMON\n"
	.string "cross paths.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
SLATEPORT CITY

“The port where people and POKéMON
cross paths.”
```

## `SlateportCity_Text_MarketSign`

`data/maps/SlateportCity/scripts.inc:1203`，类型 `text`，SHA-256 `3d9451bcb6f8bfb7df0920058f364a68b8bc0f6cd96d802e6aacf700f5f57339`。

```asm
SlateportCity_Text_MarketSign:
	.string "SLATEPORT MARKET\n"
	.string "“Unique items found nowhere else!”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
SLATEPORT MARKET
“Unique items found nowhere else!”
```

## `SlateportCity_Text_NameRatersHouseSign`

`data/maps/SlateportCity/scripts.inc:1219`，类型 `text`，SHA-256 `330c976c77f9cc4c2e0b0a68c9abd2bce59cdc3e2acc014a6b58e21b91176b4f`。

```asm
SlateportCity_Text_NameRatersHouseSign:
	.string "NAME RATER'S HOUSE\n"
	.string "“POKéMON nicknames rated.”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
NAME RATER'S HOUSE
“POKéMON nicknames rated.”
```

## `SlateportCity_Text_OceanicMuseumSign`

`data/maps/SlateportCity/scripts.inc:1193`，类型 `text`，SHA-256 `a5b3bda38bd3c1cb3118074ac615e56aa3ea84c4b3bd5cf358ec7ea655658607`。

```asm
SlateportCity_Text_OceanicMuseumSign:
	.string "“The endless sea sustains\n"
	.string "all life.”\p"
	.string "OCEANIC MUSEUM$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“The endless sea sustains
all life.”

OCEANIC MUSEUM
```

## `SlateportCity_Text_PokemonFanClubSign`

`data/maps/SlateportCity/scripts.inc:1189`，类型 `text`，SHA-256 `325d6e96a4055524fd6efbb02eb1e58188bf51260e9cd3b0e0bfcdf15463c456`。

```asm
SlateportCity_Text_PokemonFanClubSign:
	.string "POKéMON FAN CLUB\n"
	.string "“Calling all fans of POKéMON!”$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
POKéMON FAN CLUB
“Calling all fans of POKéMON!”
```

## `gText_PokemartSign`

`data/event_scripts.s:836`，类型 `text`，SHA-256 `3a83c26a48990fd8091cf0da68c1d134d94600eb771d5f5db7b5af5eab384e68`。

```asm
gText_PokemartSign::
	.string "“Selected items for your convenience!”\n"
	.string "POKéMON MART$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“Selected items for your convenience!”
POKéMON MART
```

## `gText_PokemonCenterSign`

`data/event_scripts.s:840`，类型 `text`，SHA-256 `52848f556e823e22128cfaf0ee95479ec608e1feb28bef9db84eec4d1fe5ab14`。

```asm
gText_PokemonCenterSign::
	.string "“Rejuvenate your tired partners!”\n"
	.string "POKéMON CENTER$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
“Rejuvenate your tired partners!”
POKéMON CENTER
```

## special / C 继续追踪

仅词法定位，possibleCalls 不是已证明的调用图。

## 指令宏（需要继续追踪宏调用时读取）

### `end`

`asm/macros/event.inc:20`

```asm
	.macro end
	.byte SCR_OP_END
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

## 未解析引用

```json
[]
```
