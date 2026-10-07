# 原作提取证据（自动生成）

固定修订：`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`。此文件只展示源数据，不是已完成的游戏剧情。

入口 106；标签 212；未解析引用 0。

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

### DewfordTown_House2

来源：`data/maps/DewfordTown_House2/map.json`，SHA-256 `1d140a157744db499a778ef157ecd6092223c9c70874152a4060ded1385262f4`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_3",
      "x": 6,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_House2_EventScript_Man",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_2",
      "x": 2,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_House2_EventScript_Boy",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 3,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN",
      "dest_warp_id": "4"
    },
    {
      "x": 4,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_DEWFORD_TOWN",
      "dest_warp_id": "4"
    }
  ]
}
```

### DewfordTown_PokemonCenter_1F

来源：`data/maps/DewfordTown_PokemonCenter_1F/map.json`，SHA-256 `0efa33075bb804f3e9057057c41d9b293c4968789b0c63d8bfffe9226b67f748`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_DEWFORD_NURSE",
      "graphics_id": "OBJ_EVENT_GFX_NURSE",
      "x": 7,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_PokemonCenter_1F_EventScript_Nurse",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 10,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_PokemonCenter_1F_EventScript_PokefanF",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_3",
      "x": 5,
      "y": 5,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 2,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "DewfordTown_PokemonCenter_1F_EventScript_Man",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 7,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_DEWFORD_TOWN",
      "dest_warp_id": "1"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_DEWFORD_TOWN",
      "dest_warp_id": "1"
    },
    {
      "x": 1,
      "y": 6,
      "elevation": 4,
      "dest_map": "MAP_DEWFORD_TOWN_POKEMON_CENTER_2F",
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

### OldaleTown_House1

来源：`data/maps/OldaleTown_House1/map.json`，SHA-256 `8e23d3a4814882811d11e864ef31b9709197509e9e0c8efbdc9d2dd959f07f7e`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 6,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_House1_EventScript_Woman",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 3,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "0"
    },
    {
      "x": 4,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "0"
    }
  ]
}
```

### OldaleTown_House2

来源：`data/maps/OldaleTown_House2/map.json`，SHA-256 `c36274fdd63a080b4fb507ecc69efe07dcbc1bfa04a6a69e6e2a4ca26c178841`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 4,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_House2_EventScript_Woman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCHOOL_KID_M",
      "x": 7,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_House2_EventScript_Man",
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
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "1"
    },
    {
      "x": 4,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "1"
    }
  ]
}
```

### OldaleTown_Mart

来源：`data/maps/OldaleTown_Mart/map.json`，SHA-256 `4ec9de296ba496602bb901f13a863b09deaafd2707a37304dca96b196844d01c`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_OLDALE_MART_CLERK",
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 1,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_Mart_EventScript_Clerk",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 5,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_Mart_EventScript_Woman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 9,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_Mart_EventScript_Boy",
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
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "3"
    },
    {
      "x": 4,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "3"
    }
  ]
}
```

### OldaleTown_PokemonCenter_1F

来源：`data/maps/OldaleTown_PokemonCenter_1F/map.json`，SHA-256 `8b75cfecca075b306839e1377f22c5ac5f329f97ae32f466346563646718190f`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_OLDALE_NURSE",
      "graphics_id": "OBJ_EVENT_GFX_NURSE",
      "x": 7,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_PokemonCenter_1F_EventScript_Nurse",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GENTLEMAN",
      "x": 4,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_PokemonCenter_1F_EventScript_Gentleman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 10,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_PokemonCenter_1F_EventScript_Boy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_3",
      "x": 3,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "OldaleTown_PokemonCenter_1F_EventScript_Girl",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 7,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "2"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_OLDALE_TOWN",
      "dest_warp_id": "2"
    },
    {
      "x": 1,
      "y": 6,
      "elevation": 4,
      "dest_map": "MAP_OLDALE_TOWN_POKEMON_CENTER_2F",
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

### PetalburgCity_House1

来源：`data/maps/PetalburgCity_House1/map.json`，SHA-256 `3400f4ba34074c15b94fbe24e19d023fc06d9faf028e0e375a3f29f7a846c261`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_1",
      "x": 7,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 2,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_House1_EventScript_Woman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_EXPERT_M",
      "x": 4,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_House1_EventScript_Man",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 3,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "0"
    },
    {
      "x": 4,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "0"
    }
  ]
}
```

### PetalburgCity_House2

来源：`data/maps/PetalburgCity_House2/map.json`，SHA-256 `38f1223c72c7932d520b767ca0f8ef23e9d89ac82e4893750d1c7cb25d913466`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 2,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_House2_EventScript_Woman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCHOOL_KID_M",
      "x": 7,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_House2_EventScript_SchoolKid",
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
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "4"
    },
    {
      "x": 4,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "4"
    }
  ]
}
```

### PetalburgCity_Mart

来源：`data/maps/PetalburgCity_Mart/map.json`，SHA-256 `53d7d09a3fd9edc58f2485a97730b26e7dd1dd4a119bba3eb9e34ceb93747cc7`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_PETALBURG_MART_CLERK",
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 1,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_Mart_EventScript_Clerk",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_1",
      "x": 9,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_Mart_EventScript_Man",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 6,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_Mart_EventScript_Boy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_2",
      "x": 5,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_Mart_EventScript_Woman",
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
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "5"
    },
    {
      "x": 4,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "5"
    }
  ]
}
```

### PetalburgCity_PokemonCenter_1F

来源：`data/maps/PetalburgCity_PokemonCenter_1F/map.json`，SHA-256 `710202b06face6804faa91ade3c659316cb041ea76083ef4d0521fbc1b3e81a1`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_PETALBURG_NURSE",
      "graphics_id": "OBJ_EVENT_GFX_NURSE",
      "x": 7,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_PokemonCenter_1F_EventScript_Nurse",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_4",
      "x": 11,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "ProfileMan_EventScript_Man",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_FAT_MAN",
      "x": 2,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_PokemonCenter_1F_EventScript_FatMan",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_YOUNGSTER",
      "x": 9,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_PokemonCenter_1F_EventScript_Youngster",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 5,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "PetalburgCity_PokemonCenter_1F_EventScript_Woman",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 7,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "3"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_PETALBURG_CITY",
      "dest_warp_id": "3"
    },
    {
      "x": 1,
      "y": 6,
      "elevation": 4,
      "dest_map": "MAP_PETALBURG_CITY_POKEMON_CENTER_2F",
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

### Route116_TunnelersRestHouse

来源：`data/maps/Route116_TunnelersRestHouse/map.json`，SHA-256 `0b6b1d405cb03fcbce6f5af7ecf7e1be224bc4cd27e1343ed5e245418221c34b`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 6,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_TunnelersRestHouse_EventScript_Tunneler1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 3,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_TunnelersRestHouse_EventScript_Tunneler3",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_M",
      "x": 7,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "Route116_TunnelersRestHouse_EventScript_Tunneler2",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 4,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_ROUTE116",
      "dest_warp_id": "1"
    },
    {
      "x": 5,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_ROUTE116",
      "dest_warp_id": "1"
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

### RustboroCity_Flat1_1F

来源：`data/maps/RustboroCity_Flat1_1F/map.json`，SHA-256 `0a0d7593abaf0ed3c626c00a027665bfdabe254cfd2fdfa647f2f13b0149937a`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_3",
      "x": 9,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_1F_EventScript_Man",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 12,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_1F_EventScript_Woman",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 6,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "1"
    },
    {
      "x": 7,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "1"
    },
    {
      "x": 2,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT1_2F",
      "dest_warp_id": "0"
    }
  ]
}
```

### RustboroCity_Flat1_2F

来源：`data/maps/RustboroCity_Flat1_2F/map.json`，SHA-256 `fbcf072c8618e25e670f377110dea3407ec83b369750fd4fcb61b8eef4dd3b77`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 4,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 3,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_2F_EventScript_WaldasMom",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 9,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SKITTY_DOLL",
      "x": 9,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_2F_EventScript_PokeDoll",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TREECKO_DOLL",
      "x": 10,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_2F_EventScript_PokeDoll",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TORCHIC_DOLL",
      "x": 10,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_2F_EventScript_PokeDoll",
      "flag": "0"
    },
    {
      "local_id": "LOCALID_WALDAS_DAD",
      "graphics_id": "OBJ_EVENT_GFX_MAN_1",
      "x": 8,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_2F_EventScript_WaldasDad",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MUDKIP_DOLL",
      "x": 8,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_2F_EventScript_PokeDoll",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_PIKACHU_DOLL",
      "x": 9,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat1_2F_EventScript_PokeDoll",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 2,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT1_1F",
      "dest_warp_id": "2"
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

### RustboroCity_Flat2_3F

来源：`data/maps/RustboroCity_Flat2_3F/map.json`，SHA-256 `4c524ab705114df4975aa2b6fc08c1741ea7ccfd6c88703b77d7990c95411547`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_DEVON_EMPLOYEE",
      "x": 7,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 2,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat2_3F_EventScript_DevonEmployee",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_1",
      "x": 12,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Flat2_3F_EventScript_Woman",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 1,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY_FLAT2_2F",
      "dest_warp_id": "1"
    }
  ]
}
```

### RustboroCity_House1

来源：`data/maps/RustboroCity_House1/map.json`，SHA-256 `a6137e1d23146318699ae7d0061fbcd7de615512bdead08df26577b1f991d9b9`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_CAMPER",
      "x": 6,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_House1_EventScript_Trader",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_HIKER",
      "x": 9,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_House1_EventScript_Hiker",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 5,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "7"
    },
    {
      "x": 6,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "7"
    }
  ]
}
```

### RustboroCity_House2

来源：`data/maps/RustboroCity_House2/map.json`，SHA-256 `bda1a136ccb4fea17473b4136955938b3fb5418e93a3929475007c95e88cb876`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 4,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_House2_EventScript_PokefanF",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_LITTLE_GIRL",
      "x": 4,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_House2_EventScript_LittleGirl",
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
      "dest_warp_id": "9"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "9"
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

### RustboroCity_Mart

来源：`data/maps/RustboroCity_Mart/map.json`，SHA-256 `aae893adb06834ab25b25323fb1316a7d3934568eac57628b8721a5bea9a7c92`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_RUSTBORO_MART_CLERK",
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 1,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Mart_EventScript_Clerk",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 2,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Mart_EventScript_Boy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_POKEFAN_F",
      "x": 8,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Mart_EventScript_PokefanF",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BUG_CATCHER",
      "x": 8,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_Mart_EventScript_BugCatcher",
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
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "2"
    },
    {
      "x": 4,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "2"
    }
  ]
}
```

### RustboroCity_PokemonCenter_1F

来源：`data/maps/RustboroCity_PokemonCenter_1F/map.json`，SHA-256 `4a930f5c5005f281ba9ffa721a72c19fb99918e79b8dfc86d568853602b00853`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_RUSTBORO_NURSE",
      "graphics_id": "OBJ_EVENT_GFX_NURSE",
      "x": 7,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonCenter_1F_EventScript_Nurse",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_1",
      "x": 11,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonCenter_1F_EventScript_Man",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BOY_1",
      "x": 3,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonCenter_1F_EventScript_Boy",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GIRL_3",
      "x": 10,
      "y": 6,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "RustboroCity_PokemonCenter_1F_EventScript_Girl",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 7,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "3"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_RUSTBORO_CITY",
      "dest_warp_id": "3"
    },
    {
      "x": 1,
      "y": 6,
      "elevation": 4,
      "dest_map": "MAP_RUSTBORO_CITY_POKEMON_CENTER_2F",
      "dest_warp_id": "0"
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

### SlateportCity_Mart

来源：`data/maps/SlateportCity_Mart/map.json`，SHA-256 `2c5dc6c2d26d3fb2c8717408ec68e655b27cefb4c24388980c1c21c9de265365`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_SLATEPORT_MART_CLERK",
      "graphics_id": "OBJ_EVENT_GFX_MART_EMPLOYEE",
      "x": 1,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_Mart_EventScript_Clerk",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_BLACK_BELT",
      "x": 4,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_Mart_EventScript_BlackBelt",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_3",
      "x": 5,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_Mart_EventScript_Man",
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
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "1"
    },
    {
      "x": 4,
      "y": 7,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "1"
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

### SlateportCity_PokemonCenter_1F

来源：`data/maps/SlateportCity_PokemonCenter_1F/map.json`，SHA-256 `592dbb6d7b67aafc7a437bcee3e2c2912737f77e202cb0acc61ceb8e6f56b625`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_SLATEPORT_NURSE",
      "graphics_id": "OBJ_EVENT_GFX_NURSE",
      "x": 7,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonCenter_1F_EventScript_Nurse",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SAILOR",
      "x": 2,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonCenter_1F_EventScript_Sailor",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_5",
      "x": 10,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonCenter_1F_EventScript_Woman",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 7,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "0"
    },
    {
      "x": 6,
      "y": 8,
      "elevation": 3,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "0"
    },
    {
      "x": 1,
      "y": 6,
      "elevation": 4,
      "dest_map": "MAP_SLATEPORT_CITY_POKEMON_CENTER_2F",
      "dest_warp_id": "0"
    }
  ]
}
```

### SlateportCity_PokemonFanClub

来源：`data/maps/SlateportCity_PokemonFanClub/map.json`，SHA-256 `13509ac606d33a280fe30c963310f0e96fcd29a6528dd6c64b6f3504a8501d7b`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_1",
      "x": 11,
      "y": 4,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_Man",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_TWIN",
      "x": 1,
      "y": 5,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_WANDER_UP_AND_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_Twin",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_REPORTER_F",
      "x": 11,
      "y": 5,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_Reporter",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_WOMAN_4",
      "x": 6,
      "y": 2,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_SootheBellWoman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_GENTLEMAN",
      "x": 6,
      "y": 5,
      "elevation": 4,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_Chairman",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_ZIGZAGOON_2",
      "x": 3,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_Zigzagoon",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SKITTY",
      "x": 8,
      "y": 3,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_Skitty",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_AZUMARILL",
      "x": 10,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_LOOK_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_Azumarill",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_MAN_4",
      "x": 11,
      "y": 8,
      "elevation": 0,
      "movement_type": "MOVEMENT_TYPE_FACE_LEFT",
      "movement_range_x": 0,
      "movement_range_y": 1,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_PokemonFanClub_EventScript_SwaggerTutor",
      "flag": "0"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 6,
      "y": 10,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "4"
    },
    {
      "x": 7,
      "y": 10,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "4"
    }
  ]
}
```

### SlateportCity_SternsShipyard_1F

来源：`data/maps/SlateportCity_SternsShipyard_1F/map.json`，SHA-256 `61f4d63154b30680492930e5e3d561246823a9c5d1aa43bee4cd1f74dc24f6b5`。

```json
{
  "object_events": [
    {
      "local_id": "LOCALID_DOCK",
      "graphics_id": "OBJ_EVENT_GFX_MAN_1",
      "x": 5,
      "y": 5,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_DOWN",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_SternsShipyard_1F_EventScript_Dock",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 10,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_SternsShipyard_1F_EventScript_Scientist1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 18,
      "y": 8,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_LEFT_AND_RIGHT",
      "movement_range_x": 1,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_SternsShipyard_1F_EventScript_Scientist2",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_EXPERT_M",
      "x": 12,
      "y": 11,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_WANDER_AROUND",
      "movement_range_x": 1,
      "movement_range_y": 2,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_SternsShipyard_1F_EventScript_Briney",
      "flag": "FLAG_HIDE_SLATEPORT_CITY_STERNS_SHIPYARD_MR_BRINEY"
    }
  ],
  "coord_events": [],
  "bg_events": [],
  "warp_events": [
    {
      "x": 2,
      "y": 14,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "2"
    },
    {
      "x": 3,
      "y": 14,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY",
      "dest_warp_id": "2"
    },
    {
      "x": 3,
      "y": 1,
      "elevation": 0,
      "dest_map": "MAP_SLATEPORT_CITY_STERNS_SHIPYARD_2F",
      "dest_warp_id": "0"
    }
  ]
}
```

### SlateportCity_SternsShipyard_2F

来源：`data/maps/SlateportCity_SternsShipyard_2F/map.json`，SHA-256 `0083c9fff848017b3209a8ed38ed0498262947f3e136f7d5cd43bfa29010e424`。

```json
{
  "object_events": [
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 10,
      "y": 7,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "0x0",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 8,
      "y": 4,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_RIGHT",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_SternsShipyard_2F_EventScript_Scientist1",
      "flag": "0"
    },
    {
      "graphics_id": "OBJ_EVENT_GFX_SCIENTIST_1",
      "x": 0,
      "y": 9,
      "elevation": 3,
      "movement_type": "MOVEMENT_TYPE_FACE_UP",
      "movement_range_x": 0,
      "movement_range_y": 0,
      "trainer_type": "TRAINER_TYPE_NONE",
      "trainer_sight_or_berry_tree_id": "0",
      "script": "SlateportCity_SternsShipyard_2F_EventScript_Scientist2",
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
      "dest_map": "MAP_SLATEPORT_CITY_STERNS_SHIPYARD_1F",
      "dest_warp_id": "2"
    }
  ]
}
```

## `DewfordTown_EventScript_Woman`

`data/maps/DewfordTown/scripts.inc:56`，类型 `script`，SHA-256 `2071d42acdfade2f0f4aa27983d610e8e83823b11a3fb48b48206fa36f958011`。

```asm
DewfordTown_EventScript_Woman::
	msgbox DewfordTown_Text_TinyIslandCommunity, MSGBOX_NPC
	end
```

## `DewfordTown_House1_EventScript_Man`

`data/maps/DewfordTown_House1/scripts.inc:4`，类型 `script`，SHA-256 `2b1591404d298ce39d5986fc1eba7c7b327dcdb0efa19d223bb2921d21e8d31f`。

```asm
DewfordTown_House1_EventScript_Man::
	msgbox DewfordTown_House1_Text_LotToBeSaidForLivingOnIsland, MSGBOX_NPC
	end
```

## `DewfordTown_House1_EventScript_Woman`

`data/maps/DewfordTown_House1/scripts.inc:8`，类型 `script`，SHA-256 `36f3c2f20f28293d252bdd5133a9e38f425fc0ecb141d0b69136e453d81796dd`。

```asm
DewfordTown_House1_EventScript_Woman::
	msgbox DewfordTown_House1_Text_LifeGoesSlowlyOnIsland, MSGBOX_NPC
	end
```

## `DewfordTown_House1_Text_LifeGoesSlowlyOnIsland`

`data/maps/DewfordTown_House1/scripts.inc:27`，类型 `text`，SHA-256 `76a3e57a609bfe648b96aa0eb24951cbf0d928db1dce0ef2589a314a67a68ad5`。

```asm
DewfordTown_House1_Text_LifeGoesSlowlyOnIsland:
	.string "I left the major port of SLATEPORT\n"
	.string "CITY when I married my husband here.\p"
	.string "Life goes by slowly on this little\n"
	.string "island. But being surrounded by the\l"
	.string "beautiful sea--that's happiness, too.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I left the major port of SLATEPORT
CITY when I married my husband here.

Life goes by slowly on this little
island. But being surrounded by the
beautiful sea--that's happiness, too.
```

## `DewfordTown_House1_Text_LotToBeSaidForLivingOnIsland`

`data/maps/DewfordTown_House1/scripts.inc:22`，类型 `text`，SHA-256 `82ed42413b0c1deeb7cb07e168373de5a426bd945fbd0a62d2ca6c3f0a4601bf`。

```asm
DewfordTown_House1_Text_LotToBeSaidForLivingOnIsland:
	.string "There's a lot to be said for living on\n"
	.string "a small island like this in harmony with\l"
	.string "POKéMON and the family.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
There's a lot to be said for living on
a small island like this in harmony with
POKéMON and the family.
```

## `DewfordTown_House2_EventScript_Boy`

`data/maps/DewfordTown_House2/scripts.inc:25`，类型 `script`，SHA-256 `eff8fa4182ad0294851218f67cc9f45d27d4a55727f4e0ab524ef3da61b0c832`。

```asm
DewfordTown_House2_EventScript_Boy::
	msgbox DewfordTown_House2_Text_BrawlySoCool, MSGBOX_NPC
	end
```

## `DewfordTown_House2_Text_BrawlySoCool`

`data/maps/DewfordTown_House2/scripts.inc:50`，类型 `text`，SHA-256 `86f196b41f99f74d8104d78ea520383f358886d9e01f23e2317257c3c8c85a76`。

```asm
DewfordTown_House2_Text_BrawlySoCool:
	.string "Wow, you bothered to cross the sea\n"
	.string "to visit DEWFORD?\p"
	.string "Did you maybe come here because you\n"
	.string "heard about BRAWLY?\p"
	.string "He's so cool…\n"
	.string "Everyone idolizes him.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Wow, you bothered to cross the sea
to visit DEWFORD?

Did you maybe come here because you
heard about BRAWLY?

He's so cool…
Everyone idolizes him.
```

## `DewfordTown_PokemonCenter_1F_EventScript_Man`

`data/maps/DewfordTown_PokemonCenter_1F/scripts.inc:23`，类型 `script`，SHA-256 `52e2884638d2b22af40bd074e9723fe12d51619fb659cf6a281059721604b0d6`。

```asm
DewfordTown_PokemonCenter_1F_EventScript_Man::
	msgbox DewfordTown_PokemonCenter_1F_Text_FaintedMonCanUseHM, MSGBOX_NPC
	end
```

## `DewfordTown_PokemonCenter_1F_EventScript_PokefanF`

`data/maps/DewfordTown_PokemonCenter_1F/scripts.inc:19`，类型 `script`，SHA-256 `172fea73777f0638af1750c99fad21b8260d0d898fb7cf3194e6635848f1287b`。

```asm
DewfordTown_PokemonCenter_1F_EventScript_PokefanF::
	msgbox DewfordTown_PokemonCenter_1F_Text_StoneCavern, MSGBOX_NPC
	end
```

## `DewfordTown_PokemonCenter_1F_Text_FaintedMonCanUseHM`

`data/maps/DewfordTown_PokemonCenter_1F/scripts.inc:33`，类型 `text`，SHA-256 `9a2cab22933b1320984043adced7b045b5da542fed32ed11579c55c874dbe393`。

```asm
DewfordTown_PokemonCenter_1F_Text_FaintedMonCanUseHM:
	.string "Even if a POKéMON faints and can't\n"
	.string "battle, it can still use a move learned\l"
	.string "from a HIDDEN MACHINE (HM).$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Even if a POKéMON faints and can't
battle, it can still use a move learned
from a HIDDEN MACHINE (HM).
```

## `DewfordTown_PokemonCenter_1F_Text_StoneCavern`

`data/maps/DewfordTown_PokemonCenter_1F/scripts.inc:27`，类型 `text`，SHA-256 `13157098956ca525067716d23972fc46965176a5fd11089d49a2863387eef156`。

```asm
DewfordTown_PokemonCenter_1F_Text_StoneCavern:
	.string "There's a stone cavern at the edge\n"
	.string "of town.\p"
	.string "I've heard you can find rare stones\n"
	.string "there.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
There's a stone cavern at the edge
of town.

I've heard you can find rare stones
there.
```

## `DewfordTown_Text_TinyIslandCommunity`

`data/maps/DewfordTown/scripts.inc:622`，类型 `text`，SHA-256 `99344690cfdd14f710419160e656644405cfa05cf3bd557f0ca35e39ecbda533`。

```asm
DewfordTown_Text_TinyIslandCommunity:
	.string "DEWFORD is a tiny island community.\n"
	.string "If something gets trendy here,\l"
	.string "everyone picks up on it right away.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
DEWFORD is a tiny island community.
If something gets trendy here,
everyone picks up on it right away.
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

## `LittlerootTown_EventScript_Boy`

`data/maps/LittlerootTown/scripts.inc:244`，类型 `script`，SHA-256 `4cbd246fd3adea8edda60f2d1de73c85b98021193f25ecfb085a651a66bd3635`。

```asm
LittlerootTown_EventScript_Boy::
	msgbox LittlerootTown_Text_BirchSpendsDaysInLab, MSGBOX_NPC
	end
```

## `LittlerootTown_EventScript_FatMan`

`data/maps/LittlerootTown/scripts.inc:240`，类型 `script`，SHA-256 `7fe3ee6fab08e466b420f266d6e244d4889c14773e9055c2079abb3f0b741d67`。

```asm
LittlerootTown_EventScript_FatMan::
	msgbox LittlerootTown_Text_CanUsePCToStoreItems, MSGBOX_NPC
	end
```

## `LittlerootTown_Text_BirchSpendsDaysInLab`

`data/maps/LittlerootTown/scripts.inc:906`，类型 `text`，SHA-256 `bfd24d5a15f6421feb003048feae2d02fb6aabc3a82b01397ad7d01547c86e45`。

```asm
LittlerootTown_Text_BirchSpendsDaysInLab:
	.string "PROF. BIRCH spends days in his LAB\n"
	.string "studying, then he'll suddenly go out in\l"
	.string "the wild to do more research…\p"
	.string "When does PROF. BIRCH spend time\n"
	.string "at home?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
PROF. BIRCH spends days in his LAB
studying, then he'll suddenly go out in
the wild to do more research…

When does PROF. BIRCH spend time
at home?
```

## `LittlerootTown_Text_CanUsePCToStoreItems`

`data/maps/LittlerootTown/scripts.inc:901`，类型 `text`，SHA-256 `f48f6fb01d581aff7bcea63ad71e63e03891b60061ce8414985223741e78ba67`。

```asm
LittlerootTown_Text_CanUsePCToStoreItems:
	.string "If you use a PC, you can store items\n"
	.string "and POKéMON.\p"
	.string "The power of science is staggering!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If you use a PC, you can store items
and POKéMON.

The power of science is staggering!
```

## `OldaleTown_EventScript_Girl`

`data/maps/OldaleTown/scripts.inc:32`，类型 `script`，SHA-256 `34103a754977dec6eaa12abb25e223c09f0435303fe3cb960d1023cc8b0b037e`。

```asm
OldaleTown_EventScript_Girl::
	msgbox OldaleTown_Text_SavingMyProgress, MSGBOX_NPC
	end
```

## `OldaleTown_House1_EventScript_Woman`

`data/maps/OldaleTown_House1/scripts.inc:4`，类型 `script`，SHA-256 `f2dc0bfacf1beae495a8e6c7bc48e8ccf3757d0d081e17c0c581c5274534af99`。

```asm
OldaleTown_House1_EventScript_Woman::
	msgbox OldaleTown_House1_Text_LeftPokemonGoesOutFirst, MSGBOX_NPC
	end
```

## `OldaleTown_House1_Text_LeftPokemonGoesOutFirst`

`data/maps/OldaleTown_House1/scripts.inc:8`，类型 `text`，SHA-256 `5a8177fabc7160349f40f61fbafa0fda2ced75926ef11fa6b278149598103f2c`。

```asm
OldaleTown_House1_Text_LeftPokemonGoesOutFirst:
	.string "When a POKéMON battle starts, the one\n"
	.string "at the left of the list goes out first.\p"
	.string "So, when you get more POKéMON in your\n"
	.string "party, try switching around the order\l"
	.string "of your POKéMON.\p"
	.string "It could give you an advantage.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
When a POKéMON battle starts, the one
at the left of the list goes out first.

So, when you get more POKéMON in your
party, try switching around the order
of your POKéMON.

It could give you an advantage.
```

## `OldaleTown_House2_EventScript_Man`

`data/maps/OldaleTown_House2/scripts.inc:8`，类型 `script`，SHA-256 `d168d0de0758ba655614f79465742337a347f610b0b81ea5dbc58ec2f2320692`。

```asm
OldaleTown_House2_EventScript_Man::
	msgbox OldaleTown_House2_Text_YoullGoFurtherWithStrongPokemon, MSGBOX_NPC
	end
```

## `OldaleTown_House2_EventScript_Woman`

`data/maps/OldaleTown_House2/scripts.inc:4`，类型 `script`，SHA-256 `083b6da045d5c11f8a746b73b723b741471fa4aac8c8f0a492806f35e9bd83aa`。

```asm
OldaleTown_House2_EventScript_Woman::
	msgbox OldaleTown_House2_Text_PokemonLevelUp, MSGBOX_NPC
	end
```

## `OldaleTown_House2_Text_PokemonLevelUp`

`data/maps/OldaleTown_House2/scripts.inc:12`，类型 `text`，SHA-256 `7df604bf6e0532678d507267855f85bf59d2f4f6b8c9c12f3cbd861434d206c1`。

```asm
OldaleTown_House2_Text_PokemonLevelUp:
	.string "When POKéMON battle, they eventually\n"
	.string "level up and become stronger.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
When POKéMON battle, they eventually
level up and become stronger.
```

## `OldaleTown_House2_Text_YoullGoFurtherWithStrongPokemon`

`data/maps/OldaleTown_House2/scripts.inc:16`，类型 `text`，SHA-256 `18a13e66c30b8cf43068fea93f03a10f46ba414e8eca322f48a5159d5cd311fa`。

```asm
OldaleTown_House2_Text_YoullGoFurtherWithStrongPokemon:
	.string "If the POKéMON with you become\n"
	.string "stronger, you'll be able to go farther\l"
	.string "away from here.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If the POKéMON with you become
stronger, you'll be able to go farther
away from here.
```

## `OldaleTown_Mart_EventScript_Boy`

`data/maps/OldaleTown_Mart/scripts.inc:51`，类型 `script`，SHA-256 `99102a132e72014bd49166bc724637ed4dc2d52cfb6f101e6ba038231ec3571d`。

```asm
OldaleTown_Mart_EventScript_Boy::
	msgbox OldaleTown_Mart_Text_RestoreHPWithPotion, MSGBOX_NPC
	end
```

## `OldaleTown_Mart_Text_RestoreHPWithPotion`

`data/maps/OldaleTown_Mart/scripts.inc:63`，类型 `text`，SHA-256 `e1e220da6f91ee95a346ac2211e3f739300d753a7c4718184dd7ad9c75dd4e2f`。

```asm
OldaleTown_Mart_Text_RestoreHPWithPotion:
	.string "If a POKéMON gets hurt and loses its HP\n"
	.string "and faints, it won't be able to battle.\p"
	.string "To prevent your POKéMON from fainting,\n"
	.string "restore its HP with a POTION.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If a POKéMON gets hurt and loses its HP
and faints, it won't be able to battle.

To prevent your POKéMON from fainting,
restore its HP with a POTION.
```

## `OldaleTown_PokemonCenter_1F_EventScript_Boy`

`data/maps/OldaleTown_PokemonCenter_1F/scripts.inc:23`，类型 `script`，SHA-256 `77f4954678a1721982bcbebdbc50885d1029aa5ff7330dcd651959fa65a0316f`。

```asm
OldaleTown_PokemonCenter_1F_EventScript_Boy::
	msgbox OldaleTown_PokemonCenter_1F_Text_PokemonCentersAreGreat, MSGBOX_NPC
	end
```

## `OldaleTown_PokemonCenter_1F_EventScript_Gentleman`

`data/maps/OldaleTown_PokemonCenter_1F/scripts.inc:19`，类型 `script`，SHA-256 `1649c1f228346bdb5f63805f3b4bfc3cc5bf347ae48b7f8a844de013987c108d`。

```asm
OldaleTown_PokemonCenter_1F_EventScript_Gentleman::
	msgbox OldaleTown_PokemonCenter_1F_Text_TrainersCanUsePC, MSGBOX_NPC
	end
```

## `OldaleTown_PokemonCenter_1F_Text_PokemonCentersAreGreat`

`data/maps/OldaleTown_PokemonCenter_1F/scripts.inc:46`，类型 `text`，SHA-256 `16f74571ed5525a82b8fbd955f58a4326aaf36d8555bf2fbc20f8c1c6381419e`。

```asm
OldaleTown_PokemonCenter_1F_Text_PokemonCentersAreGreat:
	.string "POKéMON CENTERS are great!\p"
	.string "You can use their services as much\n"
	.string "as you like, and it's all for free.\l"
	.string "You never have to worry!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
POKéMON CENTERS are great!

You can use their services as much
as you like, and it's all for free.
You never have to worry!
```

## `OldaleTown_PokemonCenter_1F_Text_TrainersCanUsePC`

`data/maps/OldaleTown_PokemonCenter_1F/scripts.inc:40`，类型 `text`，SHA-256 `875c1562f33dad45f8eedd58d1d2804fd235e7701f84dba5eedcf1fc2a2b57e0`。

```asm
OldaleTown_PokemonCenter_1F_Text_TrainersCanUsePC:
	.string "That PC in the corner there is\n"
	.string "for any POKéMON TRAINER to use.\p"
	.string "Naturally, that means you're welcome\n"
	.string "to use it, too.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
That PC in the corner there is
for any POKéMON TRAINER to use.

Naturally, that means you're welcome
to use it, too.
```

## `OldaleTown_Text_SavingMyProgress`

`data/maps/OldaleTown/scripts.inc:331`，类型 `text`，SHA-256 `7aad72db921181ed20a9c7679bca909441b65dff40b2977feead06fc53a5767e`。

```asm
OldaleTown_Text_SavingMyProgress:
	.string "I want to take a rest, so I'm saving my\n"
	.string "progress.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I want to take a rest, so I'm saving my
progress.
```

## `PetalburgCity_EventScript_Gentleman`

`data/maps/PetalburgCity/scripts.inc:227`，类型 `script`，SHA-256 `eac36819f0806fd6be30a246af5ede39f3e0a99a53a82b9f51d0705fe40c89d6`。

```asm
PetalburgCity_EventScript_Gentleman::
	msgbox PetalburgCity_Text_FullPartyExplanation, MSGBOX_NPC
	end
```

## `PetalburgCity_EventScript_GymBoy`

`data/maps/PetalburgCity/scripts.inc:677`，类型 `script`，SHA-256 `96d9d27f525e84fa45fb604b1c671fc4dbf41656510690a77410b32e471bd49e`。

```asm
PetalburgCity_EventScript_GymBoy::
	msgbox PetalburgCity_Text_AreYouRookieTrainer, MSGBOX_NPC
	end
```

## `PetalburgCity_EventScript_WallysMom`

`data/maps/PetalburgCity/scripts.inc:91`，类型 `script`，SHA-256 `528133a68b4f6b60a48380a050f59e658f97aab38c6735667f86d7080b31e159`。

```asm
PetalburgCity_EventScript_WallysMom::
	msgbox PetalburgCity_Text_WhereIsWally, MSGBOX_NPC
	end
```

## `PetalburgCity_House1_EventScript_Man`

`data/maps/PetalburgCity_House1/scripts.inc:4`，类型 `script`，SHA-256 `598f2046198cb2bd2d74a3a60e063c4e33642d60cf80d78ba3476df324aad913`。

```asm
PetalburgCity_House1_EventScript_Man::
	msgbox PetalburgCity_House1_Text_TravelingIsWonderful, MSGBOX_NPC
	end
```

## `PetalburgCity_House1_EventScript_Woman`

`data/maps/PetalburgCity_House1/scripts.inc:8`，类型 `script`，SHA-256 `a49544c310f8b4c79c1245362716e68caabc37b92f080b555308ae8830cb1be5`。

```asm
PetalburgCity_House1_EventScript_Woman::
	msgbox PetalburgCity_House1_Text_GoOnAdventure, MSGBOX_NPC
	end
```

## `PetalburgCity_House1_Text_GoOnAdventure`

`data/maps/PetalburgCity_House1/scripts.inc:17`，类型 `text`，SHA-256 `7c441a6231d1e49d6842840d6da7f83fe998654b37130dfcabfbaa3d1beba70a`。

```asm
PetalburgCity_House1_Text_GoOnAdventure:
	.string "Sigh…\p"
	.string "I wish I could go on an adventure\n"
	.string "with some POKéMON…\p"
	.string "Crawl through some damp grass…\n"
	.string "Climb rocky, rugged mountains…\p"
	.string "Cross the raging seas…\n"
	.string "Wander about in dark caves…\p"
	.string "And, sometimes, even get a little\n"
	.string "homesick…\p"
	.string "It must be fabulous to travel!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Sigh…

I wish I could go on an adventure
with some POKéMON…

Crawl through some damp grass…
Climb rocky, rugged mountains…

Cross the raging seas…
Wander about in dark caves…

And, sometimes, even get a little
homesick…

It must be fabulous to travel!
```

## `PetalburgCity_House1_Text_TravelingIsWonderful`

`data/maps/PetalburgCity_House1/scripts.inc:12`，类型 `text`，SHA-256 `df569560f138b7ce0294c6d46d91b29f125810b1f1b89104ccf9b8ad7267b05c`。

```asm
PetalburgCity_House1_Text_TravelingIsWonderful:
	.string "Traveling is wonderful!\p"
	.string "When I was young, I roamed the seas\n"
	.string "and the mountains!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Traveling is wonderful!

When I was young, I roamed the seas
and the mountains!
```

## `PetalburgCity_House2_EventScript_SchoolKid`

`data/maps/PetalburgCity_House2/scripts.inc:8`，类型 `script`，SHA-256 `738363f66812ff5a3134dc4a673db51ce51b92d2963b80998ffdd1bc460c171e`。

```asm
PetalburgCity_House2_EventScript_SchoolKid::
	msgbox PetalburgCity_House2_Text_BattledNormanOnce, MSGBOX_NPC
	end
```

## `PetalburgCity_House2_EventScript_Woman`

`data/maps/PetalburgCity_House2/scripts.inc:4`，类型 `script`，SHA-256 `49a7cdb6474af59ffa249b7f4db1490c41a411ed79013f5ca3e410947ea6856f`。

```asm
PetalburgCity_House2_EventScript_Woman::
	msgbox PetalburgCity_House2_Text_NormanBecameGymLeader, MSGBOX_NPC
	end
```

## `PetalburgCity_House2_Text_BattledNormanOnce`

`data/maps/PetalburgCity_House2/scripts.inc:18`，类型 `text`，SHA-256 `6fae303da3a7aaa89d82d0a81ab6ad0239bfd1488b51739aecee501d35da01ec`。

```asm
PetalburgCity_House2_Text_BattledNormanOnce:
	.string "I battled NORMAN once, but, whew,\n"
	.string "he was way too strong.\p"
	.string "How would I put it?\p"
	.string "I just got the feeling that he\n"
	.string "lives for POKéMON.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I battled NORMAN once, but, whew,
he was way too strong.

How would I put it?

I just got the feeling that he
lives for POKéMON.
```

## `PetalburgCity_House2_Text_NormanBecameGymLeader`

`data/maps/PetalburgCity_House2/scripts.inc:12`，类型 `text`，SHA-256 `43bcc57172ba8f241d6e3f423e12bc68cdb61981963bd935982572bdde994ce5`。

```asm
PetalburgCity_House2_Text_NormanBecameGymLeader:
	.string "NORMAN became our town's new\n"
	.string "GYM LEADER.\p"
	.string "I think he called his family over from\n"
	.string "somewhere far away.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
NORMAN became our town's new
GYM LEADER.

I think he called his family over from
somewhere far away.
```

## `PetalburgCity_Mart_EventScript_Boy`

`data/maps/PetalburgCity_Mart/scripts.inc:57`，类型 `script`，SHA-256 `5f36d56bc7ed7c777c2e68a27522727a40ff88e506714acd01d9ffee476d22fc`。

```asm
PetalburgCity_Mart_EventScript_Boy::
	msgbox PetalburgCity_Mart_Text_RepelIsUseful, MSGBOX_NPC
	end
```

## `PetalburgCity_Mart_EventScript_Man`

`data/maps/PetalburgCity_Mart/scripts.inc:61`，类型 `script`，SHA-256 `45ef9f54a5579a2daa9674eb5a735c004c22e989dda42e9e49950d962d2affaf`。

```asm
PetalburgCity_Mart_EventScript_Man::
	msgbox PetalburgCity_Mart_Text_TakeSomeAntidotesWithYou, MSGBOX_NPC
	end
```

## `PetalburgCity_Mart_EventScript_Woman`

`data/maps/PetalburgCity_Mart/scripts.inc:53`，类型 `script`，SHA-256 `aac8b128e60e9c4e93a1ff810bead690fa37de1985eaa66d3a85d6f72af7b32b`。

```asm
PetalburgCity_Mart_EventScript_Woman::
	msgbox PetalburgCity_Mart_Text_WeakWillGrowStronger, MSGBOX_NPC
	end
```

## `PetalburgCity_Mart_Text_RepelIsUseful`

`data/maps/PetalburgCity_Mart/scripts.inc:71`，类型 `text`，SHA-256 `6ddad50de88b19c96add57886ad69ea689f38a3f79445f981b8da6117af35ad1`。

```asm
PetalburgCity_Mart_Text_RepelIsUseful:
	.string "Do you use REPEL?\n"
	.string "It keeps POKéMON away, so it's\l"
	.string "useful when you're in a hurry.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Do you use REPEL?
It keeps POKéMON away, so it's
useful when you're in a hurry.
```

## `PetalburgCity_Mart_Text_TakeSomeAntidotesWithYou`

`data/maps/PetalburgCity_Mart/scripts.inc:76`，类型 `text`，SHA-256 `6696a81948a5295412ed090ee20472a606209caa9cc81b12fb8908d99884a3a3`。

```asm
PetalburgCity_Mart_Text_TakeSomeAntidotesWithYou:
	.string "Do you have any ANTIDOTES with\n"
	.string "you?\p"
	.string "If you walk around with a poisoned\n"
	.string "POKéMON, it will lose HP until it faints.\l"
	.string "Take some ANTIDOTES with you.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Do you have any ANTIDOTES with
you?

If you walk around with a poisoned
POKéMON, it will lose HP until it faints.
Take some ANTIDOTES with you.
```

## `PetalburgCity_Mart_Text_WeakWillGrowStronger`

`data/maps/PetalburgCity_Mart/scripts.inc:65`，类型 `text`，SHA-256 `f6bee586b6fc2294e0f98bb6839cdfa9ca05b0ca5f4b13381988d7ae9f557567`。

```asm
PetalburgCity_Mart_Text_WeakWillGrowStronger:
	.string "Even if a POKéMON is weak now,\n"
	.string "it will grow stronger.\p"
	.string "The most important thing is love!\n"
	.string "Love for your POKéMON!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Even if a POKéMON is weak now,
it will grow stronger.

The most important thing is love!
Love for your POKéMON!
```

## `PetalburgCity_PokemonCenter_1F_EventScript_FatMan`

`data/maps/PetalburgCity_PokemonCenter_1F/scripts.inc:19`，类型 `script`，SHA-256 `cd65dcb5ac03e320501e18ec6b4c08c2850add695303868cbd53d39e51730c0e`。

```asm
PetalburgCity_PokemonCenter_1F_EventScript_FatMan::
	msgbox PetalburgCity_PokemonCenter_1F_Text_PCStorageSystem, MSGBOX_NPC
	end
```

## `PetalburgCity_PokemonCenter_1F_EventScript_Youngster`

`data/maps/PetalburgCity_PokemonCenter_1F/scripts.inc:23`，类型 `script`，SHA-256 `7279b387d9b6b8c06d7ada986b17e1a55ad65f34211cbfe721504aecaa28260a`。

```asm
PetalburgCity_PokemonCenter_1F_EventScript_Youngster::
	msgbox PetalburgCity_PokemonCenter_1F_Text_OranBerryRegainedHP, MSGBOX_NPC
	end
```

## `PetalburgCity_PokemonCenter_1F_Text_OranBerryRegainedHP`

`data/maps/PetalburgCity_PokemonCenter_1F/scripts.inc:61`，类型 `text`，SHA-256 `bb8fb5442ca8d9b202f7cd3a66766ac16237c4d7940fba1382aa70685400b445`。

```asm
PetalburgCity_PokemonCenter_1F_Text_OranBerryRegainedHP:
	.string "When my POKéMON ate an\n"
	.string "ORAN BERRY, it regained HP!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
When my POKéMON ate an
ORAN BERRY, it regained HP!
```

## `PetalburgCity_PokemonCenter_1F_Text_PCStorageSystem`

`data/maps/PetalburgCity_PokemonCenter_1F/scripts.inc:55`，类型 `text`，SHA-256 `85d8f67a6e893bed1ee1f9b7d53532e4a5f6f476cfc4f886e92d2fc56bb4e495`。

```asm
PetalburgCity_PokemonCenter_1F_Text_PCStorageSystem:
	.string "That PC-based POKéMON Storage\n"
	.string "System…\p"
	.string "Whoever made it must be some kind\n"
	.string "of a scientific wizard!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
That PC-based POKéMON Storage
System…

Whoever made it must be some kind
of a scientific wizard!
```

## `PetalburgCity_Text_AreYouRookieTrainer`

`data/maps/PetalburgCity/scripts.inc:686`，类型 `text`，SHA-256 `3145f390ad66111a044f264104a9ab44e9132014fcd048b9a5e76c92249e4c5e`。

```asm
PetalburgCity_Text_AreYouRookieTrainer:
	.string "Hiya! Are you maybe…\n"
	.string "A rookie TRAINER?\p"
	.string "Do you know what POKéMON TRAINERS\n"
	.string "do when they reach a new town?\p"
	.string "They first check what kind of GYM\n"
	.string "is in the town.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Hiya! Are you maybe…
A rookie TRAINER?

Do you know what POKéMON TRAINERS
do when they reach a new town?

They first check what kind of GYM
is in the town.
```

## `PetalburgCity_Text_FullPartyExplanation`

`data/maps/PetalburgCity/scripts.inc:708`，类型 `text`，SHA-256 `4006deba33ab517d145e3145cc3045440d1a7d071470efe9812bc0555693170a`。

```asm
PetalburgCity_Text_FullPartyExplanation:
	.string "Let's say you have six POKéMON.\n"
	.string "If you catch another one…\p"
	.string "It is automatically sent to a STORAGE\n"
	.string "BOX over a PC connection.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Let's say you have six POKéMON.
If you catch another one…

It is automatically sent to a STORAGE
BOX over a PC connection.
```

## `PetalburgCity_Text_WhereIsWally`

`data/maps/PetalburgCity/scripts.inc:681`，类型 `text`，SHA-256 `0729e17b1ba2eb9b8c4a46f52b1d1e0eb7311bbd7a52ce0d9779d73e89bd1ec6`。

```asm
PetalburgCity_Text_WhereIsWally:
	.string "Where has our WALLY gone?\p"
	.string "We have to leave for VERDANTURF TOWN\n"
	.string "very soon…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Where has our WALLY gone?

We have to leave for VERDANTURF TOWN
very soon…
```

## `PetalburgWoods_EventScript_Boy1`

`data/maps/PetalburgWoods/scripts.inc:221`，类型 `script`，SHA-256 `9e0b667f0c87583d52f5bd4aeb44e0aa15db9e290f91febb869b48bda3c81155`。

```asm
PetalburgWoods_EventScript_Boy1::
	msgbox PetalburgWoods_Text_StayOutOfTallGrass, MSGBOX_NPC
	end
```

## `PetalburgWoods_EventScript_Boy2`

`data/maps/PetalburgWoods/scripts.inc:225`，类型 `script`，SHA-256 `d5f6b4bcffe67989af0fbfaefd5db2aa2e00b0d3a345659b30ae65069687287c`。

```asm
PetalburgWoods_EventScript_Boy2::
	msgbox PetalburgWoods_Text_HiddenItemsExplanation, MSGBOX_NPC
	end
```

## `PetalburgWoods_Text_HiddenItemsExplanation`

`data/maps/PetalburgWoods/scripts.inc:417`，类型 `text`，SHA-256 `e40c35077a299a33a51334e7bf7146f8ebfc9e76bdc9093349af44d991da2a25`。

```asm
PetalburgWoods_Text_HiddenItemsExplanation:
	.string "Sometimes, there are things on the\n"
	.string "ground even if you can't see them.\p"
	.string "That's why I always check where I'm\n"
	.string "walking.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Sometimes, there are things on the
ground even if you can't see them.

That's why I always check where I'm
walking.
```

## `PetalburgWoods_Text_StayOutOfTallGrass`

`data/maps/PetalburgWoods/scripts.inc:410`，类型 `text`，SHA-256 `c3e2a43e67538c54ee95dbfb7d56de234db9f08168b5d5b1bcd8d06176a51b26`。

```asm
PetalburgWoods_Text_StayOutOfTallGrass:
	.string "Yo, there!\n"
	.string "Your POKéMON doing okay?\p"
	.string "If your POKéMON are weak and you want\n"
	.string "to avoid battles, you should stay out\l"
	.string "of tall grass.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Yo, there!
Your POKéMON doing okay?

If your POKéMON are weak and you want
to avoid battles, you should stay out
of tall grass.
```

## `Route101_EventScript_Boy`

`data/maps/Route101/scripts.inc:206`，类型 `script`，SHA-256 `4504c8a74c0ac7f23de01be5f8a73c802538ab94cb7d56f5e99e621d9c216482`。

```asm
Route101_EventScript_Boy::
	msgbox Route101_Text_WildPokemonInTallGrass, MSGBOX_NPC
	end
```

## `Route101_EventScript_Youngster`

`data/maps/Route101/scripts.inc:202`，类型 `script`，SHA-256 `ccea7f1b2a53de2d64bc636284d6fd8751e0f98d61ff5c954bf7724e7c224c3a`。

```asm
Route101_EventScript_Youngster::
	msgbox Route101_Text_TakeTiredPokemonToPokeCenter, MSGBOX_NPC
	end
```

## `Route101_Text_TakeTiredPokemonToPokeCenter`

`data/maps/Route101/scripts.inc:277`，类型 `text`，SHA-256 `cddc5b7f088f5af50821ab5648e5977c62c1fa1b628bf36c108857f31a304051`。

```asm
Route101_Text_TakeTiredPokemonToPokeCenter:
	.string "If POKéMON get tired, take them to\n"
	.string "a POKéMON CENTER.\p"
	.string "There's a POKéMON CENTER in OLDALE\n"
	.string "TOWN right close by.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If POKéMON get tired, take them to
a POKéMON CENTER.

There's a POKéMON CENTER in OLDALE
TOWN right close by.
```

## `Route101_Text_WildPokemonInTallGrass`

`data/maps/Route101/scripts.inc:283`，类型 `text`，SHA-256 `925716c881f674048bf102ea07750c52beb215e076a590477ffd0315c6e3b09b`。

```asm
Route101_Text_WildPokemonInTallGrass:
	.string "Wild POKéMON will jump out at you in\n"
	.string "tall grass.\p"
	.string "If you want to catch POKéMON, you have\n"
	.string "to go into the tall grass and search.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Wild POKéMON will jump out at you in
tall grass.

If you want to catch POKéMON, you have
to go into the tall grass and search.
```

## `Route102_EventScript_Boy`

`data/maps/Route102/scripts.inc:16`，类型 `script`，SHA-256 `df1839035dd301a022d48e3cca4be41cbe420fa4e08bda9bfe2b9019d9e13b51`。

```asm
Route102_EventScript_Boy::
	msgbox Route102_Text_CatchWholeBunchOfPokemon, MSGBOX_NPC
	end
```

## `Route102_EventScript_LittleBoy`

`data/maps/Route102/scripts.inc:4`，类型 `script`，SHA-256 `e5eeb8e27a2c2b83041774d07d63c431eb3aad6b187f758ccaec65c5ef44dbb7`。

```asm
Route102_EventScript_LittleBoy::
	msgbox Route102_Text_ImNotVeryTall, MSGBOX_NPC
	end
```

## `Route102_Text_CatchWholeBunchOfPokemon`

`data/maps/Route102/scripts.inc:99`，类型 `text`，SHA-256 `f4dd04ed218e673d228a186b06b6fd95ad1cafdbe669b01cdc71db90697f7593`。

```asm
Route102_Text_CatchWholeBunchOfPokemon:
	.string "I'm going to catch a whole bunch of\n"
	.string "POKéMON!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm going to catch a whole bunch of
POKéMON!
```

## `Route102_Text_ImNotVeryTall`

`data/maps/Route102/scripts.inc:92`，类型 `text`，SHA-256 `b4e144e49011504fda533ba669448a7f05a4879eeab592d868ac32f52a9cc316`。

```asm
Route102_Text_ImNotVeryTall:
	.string "I'm…not very tall, so I sink right\n"
	.string "into tall grass.\p"
	.string "The grass goes up my nose and…\n"
	.string "Fwafwafwafwafwa…\p"
	.string "Fwatchoo!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm…not very tall, so I sink right
into tall grass.

The grass goes up my nose and…
Fwafwafwafwafwa…

Fwatchoo!
```

## `Route103_EventScript_Boy`

`data/maps/Route103/scripts.inc:180`，类型 `script`，SHA-256 `b5bc9b41d781a06f7b951c1fe9ba5b8e9875435fca67a2d5cde60ab6f35b50ec`。

```asm
Route103_EventScript_Boy::
	msgbox Route103_Text_ShouldHaveBroughtPotion, MSGBOX_NPC
	end
```

## `Route103_EventScript_Man`

`data/maps/Route103/scripts.inc:184`，类型 `script`，SHA-256 `e1326fdd6eddb6b6b816dc51fe4321a2e5f677b55b8acd36101ac8b622f8cd09`。

```asm
Route103_EventScript_Man::
	msgbox Route103_Text_ShortcutToOldale, MSGBOX_NPC
	end
```

## `Route103_Text_ShortcutToOldale`

`data/maps/Route103/scripts.inc:335`，类型 `text`，SHA-256 `78e59ea793a16403b82d6161126fca0c58aea21e4e241823c08b55eb2dc054f6`。

```asm
Route103_Text_ShortcutToOldale:
	.string "If you cross the sea from here,\n"
	.string "it'll be a shortcut to OLDALE TOWN.\p"
	.string "Fufufu, that's useful, isn't it?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If you cross the sea from here,
it'll be a shortcut to OLDALE TOWN.

Fufufu, that's useful, isn't it?
```

## `Route103_Text_ShouldHaveBroughtPotion`

`data/maps/Route103/scripts.inc:331`，类型 `text`，SHA-256 `fa22258f7e665a6d669f3e8a60e54063b2aa4cb22300eae40d4c68999e7284db`。

```asm
Route103_Text_ShouldHaveBroughtPotion:
	.string "My POKéMON is staggeringly tired…\n"
	.string "I should have brought a POTION…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
My POKéMON is staggeringly tired…
I should have brought a POTION…
```

## `Route104_EventScript_Boy1`

`data/maps/Route104/scripts.inc:309`，类型 `script`，SHA-256 `1ae36d343f36fe124fb7198677901938aace64e7fa1b3c720eb02c280a3d3aeb`。

```asm
Route104_EventScript_Boy1::
	msgbox Route104_Text_ThrowBallAtWeakenedPokemon, MSGBOX_NPC
	end
```

## `Route104_EventScript_BugCatcher`

`data/maps/Route104/scripts.inc:285`，类型 `script`，SHA-256 `d21ff205099ed9b5a61026110621b52757aadbbdaec34a27fdbb2f77d68699c3`。

```asm
Route104_EventScript_BugCatcher::
	msgbox Route104_Text_WhatsItLikeAtBottomOfSea, MSGBOX_SIGN
	end
```

## `Route104_EventScript_Girl1`

`data/maps/Route104/scripts.inc:281`，类型 `script`，SHA-256 `32fce9155eaac384afec0de4d2ecb1258434cd89527cb0a2ab80d5a7c27c14f0`。

```asm
Route104_EventScript_Girl1::
	msgbox Route104_Text_BrineyLivesInSeasideCottage, MSGBOX_NPC
	end
```

## `Route104_EventScript_Girl2`

`data/maps/Route104/scripts.inc:333`，类型 `script`，SHA-256 `cbc4877176e0a6a1960a62a918f8b5a19ff21e267c21fc986759d6ba497e916a`。

```asm
Route104_EventScript_Girl2::
	msgbox Route104_Text_ImNotATrainer, MSGBOX_NPC
	end
```

## `Route104_EventScript_Woman`

`data/maps/Route104/scripts.inc:313`，类型 `script`，SHA-256 `1ae5e225b779181346df801db46de77a64e931dcea26bcfa00ab5847027dcefa`。

```asm
Route104_EventScript_Woman::
	msgbox Route104_Text_OnlyThrowBallAtWildPokemon, MSGBOX_NPC
	end
```

## `Route104_Text_BrineyLivesInSeasideCottage`

`data/maps/Route104/scripts.inc:984`，类型 `text`，SHA-256 `18c5cf5fb1d2b88080d5a82f705ddf6e390b714875042313e941c98949b39905`。

```asm
Route104_Text_BrineyLivesInSeasideCottage:
	.string "That seaside cottage is where\n"
	.string "MR. BRINEY lives.\p"
	.string "He was once a mighty sailor who never\n"
	.string "feared the sea, however stormy.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
That seaside cottage is where
MR. BRINEY lives.

He was once a mighty sailor who never
feared the sea, however stormy.
```

## `Route104_Text_ImNotATrainer`

`data/maps/Route104/scripts.inc:1007`，类型 `text`，SHA-256 `47d7281b8b52589ff2a49e649d6f5e4fdac78ec40ef93ed329d0fe16b3786a85`。

```asm
Route104_Text_ImNotATrainer:
	.string "Oh, no, I'm not a TRAINER.\p"
	.string "But that's right, if TRAINERS lock eyes,\n"
	.string "it's a challenge to battle.\p"
	.string "If you don't want to battle, stay out\n"
	.string "of their sight.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Oh, no, I'm not a TRAINER.

But that's right, if TRAINERS lock eyes,
it's a challenge to battle.

If you don't want to battle, stay out
of their sight.
```

## `Route104_Text_OnlyThrowBallAtWildPokemon`

`data/maps/Route104/scripts.inc:1001`，类型 `text`，SHA-256 `fee7a62dceddba513631406f558415e0a8cd61ba272e4cefdbb68ed06f1e0f59`。

```asm
Route104_Text_OnlyThrowBallAtWildPokemon:
	.string "You're a thief if you try to steal\n"
	.string "someone else's POKéMON.\p"
	.string "You should throw POKé BALLS only at\n"
	.string "wild POKéMON.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
You're a thief if you try to steal
someone else's POKéMON.

You should throw POKé BALLS only at
wild POKéMON.
```

## `Route104_Text_ThrowBallAtWeakenedPokemon`

`data/maps/Route104/scripts.inc:995`，类型 `text`，SHA-256 `d9e42c9b5b4dd48b8a02f29d6a6e6cf92f20287fc3b7b4650fdaab95a7cf2afc`。

```asm
Route104_Text_ThrowBallAtWeakenedPokemon:
	.string "If you're going to throw a POKé BALL,\n"
	.string "weaken the wild POKéMON first.\p"
	.string "It will be easier to catch if it's been\n"
	.string "poisoned, burned, or lulled to sleep.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If you're going to throw a POKé BALL,
weaken the wild POKéMON first.

It will be easier to catch if it's been
poisoned, burned, or lulled to sleep.
```

## `Route104_Text_WhatsItLikeAtBottomOfSea`

`data/maps/Route104/scripts.inc:990`，类型 `text`，SHA-256 `2f8c14750b23eb57934b23a54d4f022fbec71fb5b45073f2aff74a26c00c8bba`。

```asm
Route104_Text_WhatsItLikeAtBottomOfSea:
	.string "The sea, huh?\p"
	.string "I wonder what it's like at the bottom\n"
	.string "of the sea?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The sea, huh?

I wonder what it's like at the bottom
of the sea?
```

## `Route116_TunnelersRestHouse_EventScript_Tunneler1`

`data/maps/Route116_TunnelersRestHouse/scripts.inc:9`，类型 `script`，SHA-256 `bf8d4dfbf7e6f4c5810ba4ee1a37f073e949e2f3f1e8821479f8981ac843f88e`。

```asm
Route116_TunnelersRestHouse_EventScript_Tunneler1::
	msgbox Route116_TunnelersRestHouse_Text_WeHadToStopBoring, MSGBOX_NPC
	end
```

## `Route116_TunnelersRestHouse_EventScript_Tunneler2`

`data/maps/Route116_TunnelersRestHouse/scripts.inc:13`，类型 `script`，SHA-256 `5214ffa1089caa5c1b9c85d266178c1d7819299e7cb51bb51f5bd95b539a9cba`。

```asm
Route116_TunnelersRestHouse_EventScript_Tunneler2::
	msgbox Route116_TunnelersRestHouse_Text_ManDiggingHisWayToVerdanturf, MSGBOX_NPC
	end
```

## `Route116_TunnelersRestHouse_Text_ManDiggingHisWayToVerdanturf`

`data/maps/Route116_TunnelersRestHouse/scripts.inc:41`，类型 `text`，SHA-256 `64c6b05f5e464fbd1d9b8242bdd425e6786ec62e8a80916261c823c5dd73da79`。

```asm
Route116_TunnelersRestHouse_Text_ManDiggingHisWayToVerdanturf:
	.string "There's a man digging his way to\n"
	.string "VERDANTURF all by his lonesome.\l"
	.string "He's desperate to get through.\p"
	.string "He says that if he digs little by little\n"
	.string "without using machines, he won't\l"
	.string "disturb POKéMON, and he'll avoid\l"
	.string "harming the natural environment.\p"
	.string "I wonder if he made it through yet.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
There's a man digging his way to
VERDANTURF all by his lonesome.
He's desperate to get through.

He says that if he digs little by little
without using machines, he won't
disturb POKéMON, and he'll avoid
harming the natural environment.

I wonder if he made it through yet.
```

## `Route116_TunnelersRestHouse_Text_WeHadToStopBoring`

`data/maps/Route116_TunnelersRestHouse/scripts.inc:30`，类型 `text`，SHA-256 `79f0c310d053d6c59ea0a3a698cfc4a1462a6d25f8bc7d845e857d41bac2f7d7`。

```asm
Route116_TunnelersRestHouse_Text_WeHadToStopBoring:
	.string "That RUSTURF TUNNEL there…\p"
	.string "At first, we had a huge work crew boring\n"
	.string "through rock with the latest machinery.\l"
	.string "But, we had to stop.\p"
	.string "It turns out that we would have had\n"
	.string "a negative effect on wild POKéMON in\l"
	.string "the area.\p"
	.string "So, we've got nothing to do but loll\n"
	.string "around here doing nothing.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
That RUSTURF TUNNEL there…

At first, we had a huge work crew boring
through rock with the latest machinery.
But, we had to stop.

It turns out that we would have had
a negative effect on wild POKéMON in
the area.

So, we've got nothing to do but loll
around here doing nothing.
```

## `RustboroCity_CuttersHouse_EventScript_Lass`

`data/maps/RustboroCity_CuttersHouse/scripts.inc:20`，类型 `script`，SHA-256 `7dd0c5cb7fbd681c0ce56978cbee495e991c52432c69584e5330dc91c6a67789`。

```asm
RustboroCity_CuttersHouse_EventScript_Lass::
	msgbox RustboroCity_CuttersHouse_Text_DadHelpedClearLandOfTrees, MSGBOX_NPC
	end
```

## `RustboroCity_CuttersHouse_Text_DadHelpedClearLandOfTrees`

`data/maps/RustboroCity_CuttersHouse/scripts.inc:47`，类型 `text`，SHA-256 `8e707868474d77bc3ba855b52ea54263a71c1bcfd6298363cc5e98fe80e6a6a2`。

```asm
RustboroCity_CuttersHouse_Text_DadHelpedClearLandOfTrees:
	.string "When they were expanding the city of\n"
	.string "RUSTBORO, my dad helped out.\p"
	.string "He made his POKéMON use CUT to clear\n"
	.string "the land of trees.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
When they were expanding the city of
RUSTBORO, my dad helped out.

He made his POKéMON use CUT to clear
the land of trees.
```

## `RustboroCity_EventScript_Boy1`

`data/maps/RustboroCity/scripts.inc:913`，类型 `script`，SHA-256 `4a2fb9083fe32be0c3ec892b10a054e3154ddfbaeed7e077b4725002bab961f4`。

```asm
RustboroCity_EventScript_Boy1::
	msgbox RustboroCity_Text_YouCanHave2On2Battle, MSGBOX_NPC
	end
```

## `RustboroCity_EventScript_DevonEmployee2`

`data/maps/RustboroCity/scripts.inc:134`，类型 `script`，SHA-256 `5605a127be1df65a0af27d0d0f10cde75c950912c3badc715d0133b7d5ce38d5`。

```asm
RustboroCity_EventScript_DevonEmployee2::
	lock
	faceplayer
	msgbox RustboroCity_Text_YoureNewAroundHere, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_EventScript_Man2`

`data/maps/RustboroCity/scripts.inc:224`，类型 `script`，SHA-256 `248b37639a5e54ee81616ceeb8404dc164d5bbb15ee8843ea3f4f65cf95f4f80`。

```asm
RustboroCity_EventScript_Man2::
	lock
	faceplayer
	msgbox RustboroCity_Text_TradePokemonGrowFast, MSGBOX_DEFAULT
	release
	end
```

## `RustboroCity_EventScript_NinjaBoy`

`data/maps/RustboroCity/scripts.inc:175`，类型 `script`，SHA-256 `3dbfd3ff6d01f4988de1cec982569e1d1d4cf88eb46ddaf3d106f913e410a34b`。

```asm
RustboroCity_EventScript_NinjaBoy::
	msgbox RustboroCity_Text_CatchRarePokemonIfIGoToSchool, MSGBOX_SIGN
	end
```

## `RustboroCity_EventScript_Twin`

`data/maps/RustboroCity/scripts.inc:171`，类型 `script`，SHA-256 `671dd4094690ca373abb0551a23d590de786a4935d678cca8877ab1c597be579`。

```asm
RustboroCity_EventScript_Twin::
	msgbox RustboroCity_Text_WowYouHavePokemon, MSGBOX_NPC
	end
```

## `RustboroCity_EventScript_Woman`

`data/maps/RustboroCity/scripts.inc:141`，类型 `script`，SHA-256 `c36055133ccaacf9154b9e6fe5c8dac07e301c4ef4d745601e7a80ce164756d6`。

```asm
RustboroCity_EventScript_Woman::
	msgbox RustboroCity_Text_GymLeaderIsntEasyWithFire, MSGBOX_NPC
	end
```

## `RustboroCity_Flat1_1F_EventScript_Man`

`data/maps/RustboroCity_Flat1_1F/scripts.inc:4`，类型 `script`，SHA-256 `0769870d6d0b35e2a0e9eace04977b58547065ef4b61db10fefef4a6cd3047b8`。

```asm
RustboroCity_Flat1_1F_EventScript_Man::
	msgbox RustboroCity_Flat1_1F_Text_EveryPokemonHasAbility, MSGBOX_NPC
	end
```

## `RustboroCity_Flat1_1F_EventScript_Woman`

`data/maps/RustboroCity_Flat1_1F/scripts.inc:8`，类型 `script`，SHA-256 `554575a286714bc56a5e1595008b4baf07906b264faa5d7459ee35717ee56e42`。

```asm
RustboroCity_Flat1_1F_EventScript_Woman::
	msgbox RustboroCity_Flat1_1F_Text_PokemonStrange, MSGBOX_NPC
	end
```

## `RustboroCity_Flat1_1F_Text_EveryPokemonHasAbility`

`data/maps/RustboroCity_Flat1_1F/scripts.inc:12`，类型 `text`，SHA-256 `80ec0622ed4ee74b86abbad286523f2494dcd249f2ba2ca3be1131632757d2cf`。

```asm
RustboroCity_Flat1_1F_Text_EveryPokemonHasAbility:
	.string "Every POKéMON has a special ability\n"
	.string "that it can use.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Every POKéMON has a special ability
that it can use.
```

## `RustboroCity_Flat1_1F_Text_PokemonStrange`

`data/maps/RustboroCity_Flat1_1F/scripts.inc:16`，类型 `text`，SHA-256 `472bf6a5f2a03296f0915df686e36a9e920f01065fbc9dde6681cdd1581fa613`。

```asm
RustboroCity_Flat1_1F_Text_PokemonStrange:
	.string "POKéMON are such strange creatures.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
POKéMON are such strange creatures.
```

## `RustboroCity_Flat1_2F_EventScript_PokeDoll`

`data/maps/RustboroCity_Flat1_2F/scripts.inc:73`，类型 `script`，SHA-256 `bac6d624e4a76c5080cf112bebb9282c594fe39cb8d4b0d215385e7a1025feee`。

```asm
RustboroCity_Flat1_2F_EventScript_PokeDoll::
	msgbox RustboroCity_Flat1_2F_Text_ItsAPokemonPlushDoll, MSGBOX_SIGN
	end
```

## `RustboroCity_Flat1_2F_EventScript_WaldasMom`

`data/maps/RustboroCity_Flat1_2F/scripts.inc:69`，类型 `script`，SHA-256 `7c3ddd87f5a3d1e90289a6790d0af778483e33d1bd56060d7d3d7a8577d115a5`。

```asm
RustboroCity_Flat1_2F_EventScript_WaldasMom::
	msgbox RustboroCity_Flat1_2F_Text_ComingUpWithMealsIsHard, MSGBOX_NPC
	end
```

## `RustboroCity_Flat1_2F_Text_ComingUpWithMealsIsHard`

`data/maps/RustboroCity_Flat1_2F/scripts.inc:77`，类型 `text`，SHA-256 `114d96aec0c4e67f780be6805adad66d8d17f0a8ead800fd7198cb604382336d`。

```asm
RustboroCity_Flat1_2F_Text_ComingUpWithMealsIsHard:
	.string "Oh, it's so hard every day…\p"
	.string "What's hard?\n"
	.string "You need to ask?\p"
	.string "It's trying to figure out what to\n"
	.string "make for meals every day.\p"
	.string "It really isn't easy coming up with\n"
	.string "meals every day.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Oh, it's so hard every day…

What's hard?
You need to ask?

It's trying to figure out what to
make for meals every day.

It really isn't easy coming up with
meals every day.
```

## `RustboroCity_Flat1_2F_Text_ItsAPokemonPlushDoll`

`data/maps/RustboroCity_Flat1_2F/scripts.inc:172`，类型 `text`，SHA-256 `211b810ca64c3bad119a9fff0bae9a4d9c6e56b31297959b1fe24b7efb9da64b`。

```asm
RustboroCity_Flat1_2F_Text_ItsAPokemonPlushDoll:
	.string "It's a POKéMON plush DOLL!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
It's a POKéMON plush DOLL!
```

## `RustboroCity_Flat2_1F_EventScript_OldWoman`

`data/maps/RustboroCity_Flat2_1F/scripts.inc:4`，类型 `script`，SHA-256 `4d6aa02e775e9d47efd0450e0c6b95f4f2f37d57c7e48120d2cc69c9d339a8f0`。

```asm
RustboroCity_Flat2_1F_EventScript_OldWoman::
	msgbox RustboroCity_Flat2_1F_Text_DevonWorkersLiveHere, MSGBOX_NPC
	end
```

## `RustboroCity_Flat2_1F_Text_DevonWorkersLiveHere`

`data/maps/RustboroCity_Flat2_1F/scripts.inc:18`，类型 `text`，SHA-256 `0af0263f2ab625396c2374b0aea8e4d1227dd7ea65715feba1d63717923d8174`。

```asm
RustboroCity_Flat2_1F_Text_DevonWorkersLiveHere:
	.string "DEVON CORPORATION's workers live in\n"
	.string "this building.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
DEVON CORPORATION's workers live in
this building.
```

## `RustboroCity_Flat2_2F_EventScript_OldMan`

`data/maps/RustboroCity_Flat2_2F/scripts.inc:4`，类型 `script`，SHA-256 `252296cd5cd90381d55c9d6ee8c9f5654b0716cb8aff8e7d9e66900ce460459c`。

```asm
RustboroCity_Flat2_2F_EventScript_OldMan::
	msgbox RustboroCity_Flat2_2F_Text_DevonWasTinyInOldDays, MSGBOX_NPC
	end
```

## `RustboroCity_Flat2_2F_Text_DevonWasTinyInOldDays`

`data/maps/RustboroCity_Flat2_2F/scripts.inc:24`，类型 `text`，SHA-256 `71a66f012c6d0a4b52587f05dda57f79d01e29b7a1f497d5d6cc10ba45262117`。

```asm
RustboroCity_Flat2_2F_Text_DevonWasTinyInOldDays:
	.string "Way back in the old days, DEVON was just\n"
	.string "a teeny, tiny company.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Way back in the old days, DEVON was just
a teeny, tiny company.
```

## `RustboroCity_Flat2_3F_EventScript_DevonEmployee`

`data/maps/RustboroCity_Flat2_3F/scripts.inc:4`，类型 `script`，SHA-256 `d5736c16fb7789d9cdc16e64c40eb8ea14ad353ceed25be0ebcb9ae9cec11a51`。

```asm
RustboroCity_Flat2_3F_EventScript_DevonEmployee::
	msgbox RustboroCity_Flat2_3F_Text_PresidentCollectsRareStones, MSGBOX_NPC
	end
```

## `RustboroCity_Flat2_3F_EventScript_Woman`

`data/maps/RustboroCity_Flat2_3F/scripts.inc:8`，类型 `script`，SHA-256 `6bb4dba5384ca45102f65db3c734f41aeb2a882eaa009ccc85acefa3f19522f3`。

```asm
RustboroCity_Flat2_3F_EventScript_Woman::
	msgbox RustboroCity_Flat2_3F_Text_PresidentsSonAlsoCollectsRareStones, MSGBOX_NPC
	end
```

## `RustboroCity_Flat2_3F_Text_PresidentCollectsRareStones`

`data/maps/RustboroCity_Flat2_3F/scripts.inc:12`，类型 `text`，SHA-256 `b812f3748d4dcdd013d0287e1fe50f750df8cb5137371481527a733ce3153fe2`。

```asm
RustboroCity_Flat2_3F_Text_PresidentCollectsRareStones:
	.string "DEVON's PRESIDENT likes to collect\n"
	.string "rare stones.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
DEVON's PRESIDENT likes to collect
rare stones.
```

## `RustboroCity_Flat2_3F_Text_PresidentsSonAlsoCollectsRareStones`

`data/maps/RustboroCity_Flat2_3F/scripts.inc:16`，类型 `text`，SHA-256 `ef15efb8d8d90f35c55df1e6d682b95abfdfe4e6a46165af6826da4c9320e120`。

```asm
RustboroCity_Flat2_3F_Text_PresidentsSonAlsoCollectsRareStones:
	.string "I think the PRESIDENT's son also\n"
	.string "collects rare stones.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I think the PRESIDENT's son also
collects rare stones.
```

## `RustboroCity_House1_EventScript_Hiker`

`data/maps/RustboroCity_House1/scripts.inc:46`，类型 `script`，SHA-256 `5d9588f6400bc2a63406d0344a6cc2b996c1ab053d9975004c1ef045e6c49328`。

```asm
RustboroCity_House1_EventScript_Hiker::
	msgbox RustboroCity_House1_Text_AllSortsOfPlaces, MSGBOX_NPC
	end
```

## `RustboroCity_House1_Text_AllSortsOfPlaces`

`data/maps/RustboroCity_House1/scripts.inc:74`，类型 `text`，SHA-256 `f490d70a95b0ea129d1786c057aafeae792ee7ab34cafe7cdbf618c8f2ed3f72`。

```asm
RustboroCity_House1_Text_AllSortsOfPlaces:
	.string "In all sorts of places, there are all\n"
	.string "sorts of POKéMON and people.\p"
	.string "I find that fascinating, so I go to all\n"
	.string "sorts of places.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
In all sorts of places, there are all
sorts of POKéMON and people.

I find that fascinating, so I go to all
sorts of places.
```

## `RustboroCity_House2_EventScript_LittleGirl`

`data/maps/RustboroCity_House2/scripts.inc:8`，类型 `script`，SHA-256 `3c19f7fd059e6276948aa5b922556c82e05e7e6a785d300d3c1150a47a024ddd`。

```asm
RustboroCity_House2_EventScript_LittleGirl::
	msgbox RustboroCity_House2_Text_RoxanneKnowsALot, MSGBOX_NPC
	end
```

## `RustboroCity_House2_EventScript_PokefanF`

`data/maps/RustboroCity_House2/scripts.inc:4`，类型 `script`，SHA-256 `6e0a4d2165c52128e2c2b78666dd193f07566a83c15c7d665582ebb2661cc398`。

```asm
RustboroCity_House2_EventScript_PokefanF::
	msgbox RustboroCity_House2_Text_TrainerSchoolExcellent, MSGBOX_NPC
	end
```

## `RustboroCity_House2_Text_RoxanneKnowsALot`

`data/maps/RustboroCity_House2/scripts.inc:17`，类型 `text`，SHA-256 `2e3e0bca18d104cbdde53931444ac9d1dde5bad4fd5477473494de9521f2f98a`。

```asm
RustboroCity_House2_Text_RoxanneKnowsALot:
	.string "ROXANNE, the GYM LEADER, really knows\n"
	.string "a lot about POKéMON.\p"
	.string "She's really strong, too!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
ROXANNE, the GYM LEADER, really knows
a lot about POKéMON.

She's really strong, too!
```

## `RustboroCity_House2_Text_TrainerSchoolExcellent`

`data/maps/RustboroCity_House2/scripts.inc:12`，类型 `text`，SHA-256 `10eaf783c9d549e0cb4bf8889223ecb484fad8bd432197ec1248bf78ffb1bfae`。

```asm
RustboroCity_House2_Text_TrainerSchoolExcellent:
	.string "The TRAINER'S SCHOOL is excellent.\p"
	.string "If you study there, you could even\n"
	.string "become a GYM LEADER.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The TRAINER'S SCHOOL is excellent.

If you study there, you could even
become a GYM LEADER.
```

## `RustboroCity_House3_EventScript_OldMan`

`data/maps/RustboroCity_House3/scripts.inc:4`，类型 `script`，SHA-256 `09386bf938ed8a32cfae9b92c407d0f747e6d085d25252c898d2fc864847ded3`。

```asm
RustboroCity_House3_EventScript_OldMan::
	msgbox RustboroCity_House3_Text_IGivePerfectlySuitedNicknames, MSGBOX_NPC
	end
```

## `RustboroCity_House3_Text_IGivePerfectlySuitedNicknames`

`data/maps/RustboroCity_House3/scripts.inc:23`，类型 `text`，SHA-256 `19ed66ebd19c15fd9bd1247c18d8e293cadadefc4fd02dc6c0bb130b6fd9af8f`。

```asm
RustboroCity_House3_Text_IGivePerfectlySuitedNicknames:
	.string "For my own POKéMON, I give them\n"
	.string "perfectly suited nicknames!\p"
	.string "It's my expression of, uh…\n"
	.string "originality, yes, that's it!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
For my own POKéMON, I give them
perfectly suited nicknames!

It's my expression of, uh…
originality, yes, that's it!
```

## `RustboroCity_Mart_EventScript_Boy`

`data/maps/RustboroCity_Mart/scripts.inc:59`，类型 `script`，SHA-256 `a1c67382d5095031421e30e6fa91b7126603551de406395df65b5d2f23b66eba`。

```asm
RustboroCity_Mart_EventScript_Boy::
	msgbox RustboroCity_Mart_Text_ShouldBuySuperPotionsInstead, MSGBOX_NPC
	end
```

## `RustboroCity_Mart_EventScript_BugCatcher`

`data/maps/RustboroCity_Mart/scripts.inc:63`，类型 `script`，SHA-256 `497302ea15143e0a8e2325d731c4b42bb5002d0dc536dfac86815a90829455ac`。

```asm
RustboroCity_Mart_EventScript_BugCatcher::
	msgbox RustboroCity_Mart_Text_GettingEscapeRopeJustInCase, MSGBOX_NPC
	end
```

## `RustboroCity_Mart_EventScript_PokefanF`

`data/maps/RustboroCity_Mart/scripts.inc:55`，类型 `script`，SHA-256 `1d18030a1666fc9f0d30300ea9933051aeeb33319c5c01b4f27c80049d6b64a5`。

```asm
RustboroCity_Mart_EventScript_PokefanF::
	msgbox RustboroCity_Mart_Text_BuyingHealsInCaseOfShroomish, MSGBOX_NPC
	end
```

## `RustboroCity_Mart_Text_BuyingHealsInCaseOfShroomish`

`data/maps/RustboroCity_Mart/scripts.inc:67`，类型 `text`，SHA-256 `2d5a6cc8b6f034cd9ea7a3b1eaee0ba818d36babe4f7e440103a52b4b92e1d68`。

```asm
RustboroCity_Mart_Text_BuyingHealsInCaseOfShroomish:
	.string "I'm buying some PARLYZ HEALS and\n"
	.string "ANTIDOTES.\p"
	.string "Just in case I run into SHROOMISH\n"
	.string "in PETALBURG WOODS.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm buying some PARLYZ HEALS and
ANTIDOTES.

Just in case I run into SHROOMISH
in PETALBURG WOODS.
```

## `RustboroCity_Mart_Text_GettingEscapeRopeJustInCase`

`data/maps/RustboroCity_Mart/scripts.inc:79`，类型 `text`，SHA-256 `97f6e7b26641ba55660e82727461dbc4999d6b7308641e4f501d3afa6681bcac`。

```asm
RustboroCity_Mart_Text_GettingEscapeRopeJustInCase:
	.string "I'm getting an ESCAPE ROPE just in\n"
	.string "case I get lost in a cave.\p"
	.string "I just need to use it to get back to\n"
	.string "the entrance.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm getting an ESCAPE ROPE just in
case I get lost in a cave.

I just need to use it to get back to
the entrance.
```

## `RustboroCity_Mart_Text_ShouldBuySuperPotionsInstead`

`data/maps/RustboroCity_Mart/scripts.inc:73`，类型 `text`，SHA-256 `ba9c67b5489011c06fdc9dc743730ec522b157ca21d7845cbc21ff1a0495c388`。

```asm
RustboroCity_Mart_Text_ShouldBuySuperPotionsInstead:
	.string "My POKéMON evolved.\n"
	.string "It has a lot of HP now.\p"
	.string "I should buy SUPER POTIONS for it\n"
	.string "instead of ordinary POTIONS.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
My POKéMON evolved.
It has a lot of HP now.

I should buy SUPER POTIONS for it
instead of ordinary POTIONS.
```

## `RustboroCity_PokemonCenter_1F_EventScript_Boy`

`data/maps/RustboroCity_PokemonCenter_1F/scripts.inc:23`，类型 `script`，SHA-256 `983f9edc04bd3808216bbdc4ad9ad1a31971be6ba17a5df582b2d63104f69d26`。

```asm
RustboroCity_PokemonCenter_1F_EventScript_Boy::
	msgbox RustboroCity_PokemonCenter_1F_Text_MaleAndFemalePokemon, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonCenter_1F_EventScript_Girl`

`data/maps/RustboroCity_PokemonCenter_1F/scripts.inc:27`，类型 `script`，SHA-256 `4fa8847a351409957ce6cc4475717dc36697583cd6eea70757b25f92f38fcef1`。

```asm
RustboroCity_PokemonCenter_1F_EventScript_Girl::
	msgbox RustboroCity_PokemonCenter_1F_Text_HMCutNextDoor, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonCenter_1F_EventScript_Man`

`data/maps/RustboroCity_PokemonCenter_1F/scripts.inc:19`，类型 `script`，SHA-256 `e635d380b8b469ad7f98dede4d4298a499927da6e2f899bb73fbd0d19c61862a`。

```asm
RustboroCity_PokemonCenter_1F_EventScript_Man::
	msgbox RustboroCity_PokemonCenter_1F_Text_PokemonHavePersonalities, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonCenter_1F_Text_HMCutNextDoor`

`data/maps/RustboroCity_PokemonCenter_1F/scripts.inc:43`，类型 `text`，SHA-256 `0bf0e7d31d97e9193fe652c89dc64aa4af94e934c4e7a82a0110d2074392c301`。

```asm
RustboroCity_PokemonCenter_1F_Text_HMCutNextDoor:
	.string "The man next door gave me an HM!\p"
	.string "I used it to teach my POKéMON how to\n"
	.string "CUT down skinny trees.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The man next door gave me an HM!

I used it to teach my POKéMON how to
CUT down skinny trees.
```

## `RustboroCity_PokemonCenter_1F_Text_MaleAndFemalePokemon`

`data/maps/RustboroCity_PokemonCenter_1F/scripts.inc:37`，类型 `text`，SHA-256 `3b1a25d59360d49bfa7dac72948f555ffefca61cad666a23dc6ba95ed8073a47`。

```asm
RustboroCity_PokemonCenter_1F_Text_MaleAndFemalePokemon:
	.string "Just like people, there are male and\n"
	.string "female POKéMON.\p"
	.string "But no one seems to have any idea how\n"
	.string "they're different.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Just like people, there are male and
female POKéMON.

But no one seems to have any idea how
they're different.
```

## `RustboroCity_PokemonCenter_1F_Text_PokemonHavePersonalities`

`data/maps/RustboroCity_PokemonCenter_1F/scripts.inc:31`，类型 `text`，SHA-256 `674ded6941b8dbd6fb0da5352d321af8299d8b3b71115d559fa7616dd8a50d4c`。

```asm
RustboroCity_PokemonCenter_1F_Text_PokemonHavePersonalities:
	.string "My POKéMON has a NAIVE nature, and my\n"
	.string "friend's has a JOLLY nature.\p"
	.string "It's fascinating how POKéMON have\n"
	.string "personalities!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
My POKéMON has a NAIVE nature, and my
friend's has a JOLLY nature.

It's fascinating how POKéMON have
personalities!
```

## `RustboroCity_PokemonSchool_EventScript_GameboyKid1`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:53`，类型 `script`，SHA-256 `c90c3ee105706512206ecdf937986dd57cea9eb94b53cacacb364137a0024089`。

```asm
RustboroCity_PokemonSchool_EventScript_GameboyKid1::
	msgbox RustboroCity_PokemonSchool_Text_TradingRightNow, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonSchool_EventScript_GameboyKid2`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:57`，类型 `script`，SHA-256 `eed85db9589526d0e29dd65ce6aad8d3d313d04b4d7e0494d6350234af0689dc`。

```asm
RustboroCity_PokemonSchool_EventScript_GameboyKid2::
	msgbox RustboroCity_PokemonSchool_Text_AlwaysWantedSeedot, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonSchool_EventScript_Lass`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:65`，类型 `script`，SHA-256 `06127eea99074421047efb53fbd8b940784ad9771b341438d8faab2625eac025`。

```asm
RustboroCity_PokemonSchool_EventScript_Lass::
	msgbox RustboroCity_PokemonSchool_Text_ConfusedPokemonAttacksItself, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonSchool_EventScript_RichBoy`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:61`，类型 `script`，SHA-256 `980bbe23f3e4eee0cbd87e6e6b2929c41298f60e245e839b58278102c60b6ab7`。

```asm
RustboroCity_PokemonSchool_EventScript_RichBoy::
	msgbox RustboroCity_PokemonSchool_Text_PokemontCantUseManMadeItems, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonSchool_EventScript_SchoolKidM`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:69`，类型 `script`，SHA-256 `07d700aed74022e82ee81f96a4ba4a7f1bba467c04b2da3ed0378f4f293fbd42`。

```asm
RustboroCity_PokemonSchool_EventScript_SchoolKidM::
	msgbox RustboroCity_PokemonSchool_Text_PokemonHealItselfWithBerry, MSGBOX_NPC
	end
```

## `RustboroCity_PokemonSchool_Text_AlwaysWantedSeedot`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:262`，类型 `text`，SHA-256 `0bcf047240a18676b438833b0e5f1103c7ae1a37574ecd3d46ad9ca2f78473fc`。

```asm
RustboroCity_PokemonSchool_Text_AlwaysWantedSeedot:
	.string "I always wanted a SEEDOT, and\n"
	.string "I'm finally getting one!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I always wanted a SEEDOT, and
I'm finally getting one!
```

## `RustboroCity_PokemonSchool_Text_ConfusedPokemonAttacksItself`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:271`，类型 `text`，SHA-256 `c57c8a42d363d70b74aea919ba03e38f52854a2b0472eb695a9e0961a7ea3c07`。

```asm
RustboroCity_PokemonSchool_Text_ConfusedPokemonAttacksItself:
	.string "You know how some POKéMON moves can\n"
	.string "confuse a POKéMON?\p"
	.string "A confused POKéMON will sometimes\n"
	.string "attack itself without meaning to.\p"
	.string "But once it leaves battle, it will\n"
	.string "return to normal.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
You know how some POKéMON moves can
confuse a POKéMON?

A confused POKéMON will sometimes
attack itself without meaning to.

But once it leaves battle, it will
return to normal.
```

## `RustboroCity_PokemonSchool_Text_PokemonHealItselfWithBerry`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:279`，类型 `text`，SHA-256 `c8dc1a139647d93a710dfb92c182f7ac0811a281cb05ea3a4ffcf9d217af08f5`。

```asm
RustboroCity_PokemonSchool_Text_PokemonHealItselfWithBerry:
	.string "A POKéMON holding a BERRY will heal\n"
	.string "itself…\p"
	.string "There are many kinds of items that\n"
	.string "POKéMON can hold…\p"
	.string "Boy, it sure is hard taking notes\n"
	.string "down…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A POKéMON holding a BERRY will heal
itself…

There are many kinds of items that
POKéMON can hold…

Boy, it sure is hard taking notes
down…
```

## `RustboroCity_PokemonSchool_Text_PokemontCantUseManMadeItems`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:266`，类型 `text`，SHA-256 `87454fb08ff3130507dbfa2f4ec4b76b963244d5b818ef6b26bf399ffc8409a6`。

```asm
RustboroCity_PokemonSchool_Text_PokemontCantUseManMadeItems:
	.string "POKéMON can hold items, but they\n"
	.string "don't know what to do with man-made\l"
	.string "items like POTION and ANTIDOTE.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
POKéMON can hold items, but they
don't know what to do with man-made
items like POTION and ANTIDOTE.
```

## `RustboroCity_PokemonSchool_Text_TradingRightNow`

`data/maps/RustboroCity_PokemonSchool/scripts.inc:258`，类型 `text`，SHA-256 `67fa82c9a184269ba977db5b5d535183977c840b79a8a571ea6b416968c1104e`。

```asm
RustboroCity_PokemonSchool_Text_TradingRightNow:
	.string "I'm trading POKéMON with my friend\n"
	.string "right now.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I'm trading POKéMON with my friend
right now.
```

## `RustboroCity_Text_CatchRarePokemonIfIGoToSchool`

`data/maps/RustboroCity/scripts.inc:972`，类型 `text`，SHA-256 `45be630f1d561cf75717934a60c5486935d167cddc915b7d286b602c4a56a059`。

```asm
RustboroCity_Text_CatchRarePokemonIfIGoToSchool:
	.string "POKéMON TRAINER'S SCHOOL!\p"
	.string "If I go to this school, will I be able\n"
	.string "to catch rare POKéMON easily?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
POKéMON TRAINER'S SCHOOL!

If I go to this school, will I be able
to catch rare POKéMON easily?
```

## `RustboroCity_Text_GymLeaderIsntEasyWithFire`

`data/maps/RustboroCity/scripts.inc:946`，类型 `text`，SHA-256 `f6451f95716441c0371e6571b994fed2eea67e416c32ac68b19aae2bd27c211c`。

```asm
RustboroCity_Text_GymLeaderIsntEasyWithFire:
	.string "I challenged the GYM LEADER, but…\p"
	.string "It's not going to be easy winning with\n"
	.string "my FIRE-type POKéMON…\p"
	.string "FIRE-type POKéMON don't match up\n"
	.string "well against ROCK-type POKéMON…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I challenged the GYM LEADER, but…

It's not going to be easy winning with
my FIRE-type POKéMON…

FIRE-type POKéMON don't match up
well against ROCK-type POKéMON…
```

## `RustboroCity_Text_TradePokemonGrowFast`

`data/maps/RustboroCity/scripts.inc:986`，类型 `text`，SHA-256 `66be7ed17dd821ede45ee2cb6696e270d114f50f84cb53633b6945339bffdb02`。

```asm
RustboroCity_Text_TradePokemonGrowFast:
	.string "A POKéMON you get in a trade from\n"
	.string "someone grows fast.\p"
	.string "But if you don't have certain GYM\n"
	.string "BADGES, it may not obey you…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A POKéMON you get in a trade from
someone grows fast.

But if you don't have certain GYM
BADGES, it may not obey you…
```

## `RustboroCity_Text_WowYouHavePokemon`

`data/maps/RustboroCity/scripts.inc:967`，类型 `text`，SHA-256 `466b7fac4895bae1494c57c55430c26d8cd75b6cba71ea66106733734d21004e`。

```asm
RustboroCity_Text_WowYouHavePokemon:
	.string "Wow, you have POKéMON with you, too.\p"
	.string "When I get bigger, I'm going to go\n"
	.string "places with POKéMON, too.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Wow, you have POKéMON with you, too.

When I get bigger, I'm going to go
places with POKéMON, too.
```

## `RustboroCity_Text_YouCanHave2On2Battle`

`data/maps/RustboroCity/scripts.inc:1184`，类型 `text`，SHA-256 `219ca392351351eab13da9a23647009b014d88e79bfc62efa38936a342b4ba96`。

```asm
RustboroCity_Text_YouCanHave2On2Battle:
	.string "Did you know this?\p"
	.string "You can have a 2-on-2 battle even\n"
	.string "if you're not with another TRAINER.\p"
	.string "If you catch the eyes of two TRAINERS\n"
	.string "when you have two or more POKéMON,\l"
	.string "they'll both challenge you.\p"
	.string "Don't you think it'd be cool if you\n"
	.string "could beat two TRAINERS by yourself?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Did you know this?

You can have a 2-on-2 battle even
if you're not with another TRAINER.

If you catch the eyes of two TRAINERS
when you have two or more POKéMON,
they'll both challenge you.

Don't you think it'd be cool if you
could beat two TRAINERS by yourself?
```

## `RustboroCity_Text_YoureNewAroundHere`

`data/maps/RustboroCity/scripts.inc:940`，类型 `text`，SHA-256 `19267897fc331862b6ad6c12e461f8b83d49b176c8afc7364f8c0c91855531b7`。

```asm
RustboroCity_Text_YoureNewAroundHere:
	.string "Oh? Who might you be?\n"
	.string "You're a new face around these parts.\p"
	.string "Have you just transferred into the\n"
	.string "POKéMON TRAINER'S SCHOOL?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Oh? Who might you be?
You're a new face around these parts.

Have you just transferred into the
POKéMON TRAINER'S SCHOOL?
```

## `SlateportCity_EventScript_AquaGrunt10`

`data/maps/SlateportCity/scripts.inc:442`，类型 `script`，SHA-256 `98760f6c2d58b4dd844f1a585b244e599224f91e6262ebda3c48e095b79a56f7`。

```asm
SlateportCity_EventScript_AquaGrunt10::
	msgbox SlateportCity_Text_ShouldveBroughtMyGameBoy, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_Gabby`

`data/maps/SlateportCity/scripts.inc:669`，类型 `script`，SHA-256 `d7288e446df77ff3fdc1308ef17ba8a730ee9be5d467c3eadffa870d13a19b59`。

```asm
SlateportCity_EventScript_Gabby::
	msgbox SlateportCity_Text_MostInvaluableExperience, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_Man2`

`data/maps/SlateportCity/scripts.inc:338`，类型 `script`，SHA-256 `b36719e8b33bce0a8b32f514be5493d1cf38ae3197241894f7c4421802a0a96b`。

```asm
SlateportCity_EventScript_Man2::
	msgbox SlateportCity_Text_BattleTentBuiltRecently, MSGBOX_NPC
	end
```

## `SlateportCity_EventScript_Man3`

`data/maps/SlateportCity/scripts.inc:673`，类型 `script`，SHA-256 `2c08a1d5c0b6b4237da247f20a40477353cf1363d24bd346301c029081cb6ab9`。

```asm
SlateportCity_EventScript_Man3::
	msgbox SlateportCity_Text_WonderIfLighthouseStartlesPokemon, MSGBOX_NPC
	end
```

## `SlateportCity_EventScript_PokefanF`

`data/maps/SlateportCity/scripts.inc:334`，类型 `script`，SHA-256 `755cfb0c8f5a10a85fd8a7314627079f24460c9eb0354c72c309489b275125e2`。

```asm
SlateportCity_EventScript_PokefanF::
	msgbox SlateportCity_Text_BuyTooMuch, MSGBOX_NPC
	end
```

## `SlateportCity_EventScript_Sailor1`

`data/maps/SlateportCity/scripts.inc:326`，类型 `script`，SHA-256 `cbbfb366230884ec0df4903b22c2983ef0855e6db663b9b4475990abb0c53a83`。

```asm
SlateportCity_EventScript_Sailor1::
	msgbox SlateportCity_Text_SeaIsSoWet, MSGBOX_NPC
	end
```

## `SlateportCity_EventScript_Sailor2`

`data/maps/SlateportCity/scripts.inc:330`，类型 `script`，SHA-256 `0a039c5fba56fef25ae19534a43cb2b2b94e00992cba569ce7fdc2cb2577479e`。

```asm
SlateportCity_EventScript_Sailor2::
	msgbox SlateportCity_Text_SinkOldBoats, MSGBOX_NPC
	end
```

## `SlateportCity_EventScript_Ty`

`data/maps/SlateportCity/scripts.inc:665`，类型 `script`，SHA-256 `adb68f6cb0bdac8b2a46c441e1307a9cf8a534ad0ee5813c813b761a1b351ea8`。

```asm
SlateportCity_EventScript_Ty::
	msgbox SlateportCity_Text_BigSmileForCamera, MSGBOX_SIGN
	end
```

## `SlateportCity_EventScript_Woman2`

`data/maps/SlateportCity/scripts.inc:322`，类型 `script`，SHA-256 `1567ae41d0601a1b70d855ba4c33e8bc470ddabb88ef53e0d4e7ae9d46cf1e5c`。

```asm
SlateportCity_EventScript_Woman2::
	msgbox SlateportCity_Text_CantChangeTradeMonName, MSGBOX_NPC
	end
```

## `SlateportCity_Mart_EventScript_BlackBelt`

`data/maps/SlateportCity_Mart/scripts.inc:27`，类型 `script`，SHA-256 `5482d45045d864da2ec277fc3cd845ab12831e8e74b00bc99870bbc5c76e70d8`。

```asm
SlateportCity_Mart_EventScript_BlackBelt::
	msgbox SlateportCity_Mart_Text_SomeItemsOnlyAtMart, MSGBOX_NPC
	end
```

## `SlateportCity_Mart_EventScript_Man`

`data/maps/SlateportCity_Mart/scripts.inc:31`，类型 `script`，SHA-256 `78ddfac7b25ca55a5b3d351c9110f255103f1d49b726502cd19bfe0b301c61be`。

```asm
SlateportCity_Mart_EventScript_Man::
	msgbox SlateportCity_Mart_Text_GreatBallIsBetter, MSGBOX_NPC
	end
```

## `SlateportCity_Mart_Text_GreatBallIsBetter`

`data/maps/SlateportCity_Mart/scripts.inc:41`，类型 `text`，SHA-256 `c39df2f0319bf0f0fdd8291a4c9fff41edcaeb88e1af690e05a9f97542fbe6a6`。

```asm
SlateportCity_Mart_Text_GreatBallIsBetter:
	.string "A GREAT BALL is better than a POKé BALL\n"
	.string "at catching POKéMON.\p"
	.string "With this, I should be able to get that\n"
	.string "elusive POKéMON…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
A GREAT BALL is better than a POKé BALL
at catching POKéMON.

With this, I should be able to get that
elusive POKéMON…
```

## `SlateportCity_Mart_Text_SomeItemsOnlyAtMart`

`data/maps/SlateportCity_Mart/scripts.inc:35`，类型 `text`，SHA-256 `f0f87db3811613eef498d97653c4d8493ced9c870e5451cd0ed6a4d790adb65b`。

```asm
SlateportCity_Mart_Text_SomeItemsOnlyAtMart:
	.string "The MARKET does have some interesting\n"
	.string "merchandise.\p"
	.string "But there are some items you can only\n"
	.string "get at a POKéMON MART.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The MARKET does have some interesting
merchandise.

But there are some items you can only
get at a POKéMON MART.
```

## `SlateportCity_OceanicMuseum_1F_EventScript_EntranceAttendant`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:4`，类型 `script`，SHA-256 `2e04f0dc9381213c2f149520c3e0cc6cfbcee90d56c2bf05b32e27df01b9800c`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_EntranceAttendant::
	msgbox SlateportCity_OceanicMuseum_1F_Text_PleaseEnjoyYourself, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt1`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:62`，类型 `script`，SHA-256 `7b809a3b2cfc8e40dad47c059f4527105907a29cdc1e25226c582f80e7c90a8b`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt1::
	msgbox SlateportCity_OceanicMuseum_1F_Text_AquaExistForGoodOfAll, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt2`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:66`，类型 `script`，SHA-256 `5623ffe9873e3841d7bf5271e2818e4fd79beeea1f889f5e1023bf42bde2e872`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt2::
	msgbox SlateportCity_OceanicMuseum_1F_Text_OurBossIsntHere, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt3`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:70`，类型 `script`，SHA-256 `f026f0b40ca38e49a18be61f8c601243039e2803cc950483f6e6f42ecb6e3964`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt3::
	msgbox SlateportCity_OceanicMuseum_1F_Text_WouldStuffHereMakeMeRich, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt4`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:74`，类型 `script`，SHA-256 `22b050b69cb0307a54ccaee4c2c682b46afe41ca7a59f47fcb9a08adee045d82`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt4::
	msgbox SlateportCity_OceanicMuseum_1F_Text_CanLearnForNefariousDeeds, MSGBOX_SIGN
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt5`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:78`，类型 `script`，SHA-256 `21acbb7d29805db4aaf5947fcb4ab6032aa2217940efa1b49cc5d00fe7d63c5d`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt5::
	msgbox SlateportCity_OceanicMuseum_1F_Text_RustboroBungled, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt6`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:82`，类型 `script`，SHA-256 `61c9c4e8bb14fa74ce406af00e0243cc146c87380d931415b7c52ec492690e87`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumGrunt6::
	msgbox SlateportCity_OceanicMuseum_1F_Text_DidntHaveMoney, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron1`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:122`，类型 `script`，SHA-256 `d13414a32d207a0967c06630a246213cab8f97d1cb64a926646e12d66187c81d`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron1::
	msgbox SlateportCity_OceanicMuseum_1F_Text_LearnAboutSeaForBattling, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron2`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:126`，类型 `script`，SHA-256 `f0733681fb0980cc36353768d5f01ba8a56f6c3f6d4799cdb174f63180bd6ba5`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron2::
	msgbox SlateportCity_OceanicMuseum_1F_Text_SternIsRoleModel, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron3`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:130`，类型 `script`，SHA-256 `937c47ef98d768add457786fb9a38f443ce52e7bb628ac7f5d2f07cb8a33aff8`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron3::
	msgbox SlateportCity_OceanicMuseum_1F_Text_MustBePokemonWeDontKnow, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron4`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:134`，类型 `script`，SHA-256 `c83bc3ccd341677d22edd15e280fb1c3d4f024e4e4a316c313626a43f35051ea`。

```asm
SlateportCity_OceanicMuseum_1F_EventScript_MuseumPatron4::
	msgbox SlateportCity_OceanicMuseum_1F_Text_WantSeaPokemon, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_1F_Text_AquaExistForGoodOfAll`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:236`，类型 `text`，SHA-256 `eb2068b18f7466896125e04418db09ebe8ae511db4d39e46774d0afa3bbeb424`。

```asm
SlateportCity_OceanicMuseum_1F_Text_AquaExistForGoodOfAll:
	.string "We, TEAM AQUA, exist for the good\n"
	.string "of all!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
We, TEAM AQUA, exist for the good
of all!
```

## `SlateportCity_OceanicMuseum_1F_Text_CanLearnForNefariousDeeds`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:249`，类型 `text`，SHA-256 `1649ebd87a779b3ce8ab9bd92bf179b01f225b712ba02d5994449c3e4df2f429`。

```asm
SlateportCity_OceanicMuseum_1F_Text_CanLearnForNefariousDeeds:
	.string "What I learn here, I can put to use on\n"
	.string "nefarious deeds…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
What I learn here, I can put to use on
nefarious deeds…
```

## `SlateportCity_OceanicMuseum_1F_Text_DidntHaveMoney`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:257`，类型 `text`，SHA-256 `c0e498dd310bb1a1e3852a5c79bca6d6e0b1de353beaaed047eabdc27e64c68b`。

```asm
SlateportCity_OceanicMuseum_1F_Text_DidntHaveMoney:
	.string "I didn't have ¥50, so it took a long\n"
	.string "time getting by the receptionist.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I didn't have ¥50, so it took a long
time getting by the receptionist.
```

## `SlateportCity_OceanicMuseum_1F_Text_LearnAboutSeaForBattling`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:261`，类型 `text`，SHA-256 `f75566c40a9d7b2d629d97588647de86b24e69945ac24dea4785bf662f84d4aa`。

```asm
SlateportCity_OceanicMuseum_1F_Text_LearnAboutSeaForBattling:
	.string "I want to learn about the sea and\n"
	.string "use that knowledge for battling.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I want to learn about the sea and
use that knowledge for battling.
```

## `SlateportCity_OceanicMuseum_1F_Text_MustBePokemonWeDontKnow`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:271`，类型 `text`，SHA-256 `5e11ab4a562657c3015386a325680ed9e8dba020a4d41104ab303a2778e49bb3`。

```asm
SlateportCity_OceanicMuseum_1F_Text_MustBePokemonWeDontKnow:
	.string "The sea is vast without end, and\n"
	.string "infinitely deep…\p"
	.string "There must be many POKéMON that\n"
	.string "we don't know about.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The sea is vast without end, and
infinitely deep…

There must be many POKéMON that
we don't know about.
```

## `SlateportCity_OceanicMuseum_1F_Text_OurBossIsntHere`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:240`，类型 `text`，SHA-256 `a457a2eba93513d82a5c5dd5591beea976302bb908b8b93334e015e3d4572c80`。

```asm
SlateportCity_OceanicMuseum_1F_Text_OurBossIsntHere:
	.string "We were told to assemble here,\n"
	.string "so we did, but…\p"
	.string "Our BOSS, the linchpin, isn't here.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
We were told to assemble here,
so we did, but…

Our BOSS, the linchpin, isn't here.
```

## `SlateportCity_OceanicMuseum_1F_Text_PleaseEnjoyYourself`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:223`，类型 `text`，SHA-256 `4ad155f97be2a2910e52d544976dca55490b0b1cb0f2b7fb05d62290ead48efb`。

```asm
SlateportCity_OceanicMuseum_1F_Text_PleaseEnjoyYourself:
	.string "Please enjoy yourself.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Please enjoy yourself.
```

## `SlateportCity_OceanicMuseum_1F_Text_RustboroBungled`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:253`，类型 `text`，SHA-256 `6e62efc322890366c97bfbfa28397716f27c4e56825239503c2ddab746480755`。

```asm
SlateportCity_OceanicMuseum_1F_Text_RustboroBungled:
	.string "If our goons didn't bungle things\n"
	.string "in RUSTBORO, we wouldn't be here!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If our goons didn't bungle things
in RUSTBORO, we wouldn't be here!
```

## `SlateportCity_OceanicMuseum_1F_Text_SternIsRoleModel`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:265`，类型 `text`，SHA-256 `4efaf6992cfb336963146482a223cf15b69d5417ffe06434c46df3c8e94c0ae5`。

```asm
SlateportCity_OceanicMuseum_1F_Text_SternIsRoleModel:
	.string "I get all giddy and gooey when\n"
	.string "I see the sea!\p"
	.string "For me, CAPT. STERN is the number\n"
	.string "one role model!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I get all giddy and gooey when
I see the sea!

For me, CAPT. STERN is the number
one role model!
```

## `SlateportCity_OceanicMuseum_1F_Text_WantSeaPokemon`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:277`，类型 `text`，SHA-256 `9c66934ba58d88d36cbb2916b9c6b9591fd3d9afa572eccf79c25d66ac7ce15a`。

```asm
SlateportCity_OceanicMuseum_1F_Text_WantSeaPokemon:
	.string "I want a sea POKéMON.\p"
	.string "I think it would feel cool and nice\n"
	.string "to hug.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I want a sea POKéMON.

I think it would feel cool and nice
to hug.
```

## `SlateportCity_OceanicMuseum_1F_Text_WouldStuffHereMakeMeRich`

`data/maps/SlateportCity_OceanicMuseum_1F/scripts.inc:245`，类型 `text`，SHA-256 `625814839693ce41c0a3b11a252da6938ce5e5b6f51297b01ab28e16128ca81b`。

```asm
SlateportCity_OceanicMuseum_1F_Text_WouldStuffHereMakeMeRich:
	.string "If I ripped off the stuff here,\n"
	.string "would it make me rich?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If I ripped off the stuff here,
would it make me rich?
```

## `SlateportCity_OceanicMuseum_2F_EventScript_MuseumPatron1`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:240`，类型 `script`，SHA-256 `0ee6a7459c66f81dd2f0ef28a1f3d0f387ac8b76c4213c1eb57241f497743aac`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_MuseumPatron1::
	msgbox SlateportCity_OceanicMuseum_2F_Text_RemindsMeOfAbandonedShip, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_2F_EventScript_MuseumPatron2`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:244`，类型 `script`，SHA-256 `64b7b0c9f95969708edf77b88f6c00f0028bd78e18c5e829ec1c1d1bd2f26332`。

```asm
SlateportCity_OceanicMuseum_2F_EventScript_MuseumPatron2::
	msgbox SlateportCity_OceanicMuseum_2F_Text_DontRunInMuseum, MSGBOX_NPC
	end
```

## `SlateportCity_OceanicMuseum_2F_Text_DontRunInMuseum`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:355`，类型 `text`，SHA-256 `38eb830f22e0232fb44b6f22031ecdd67618f37b45a6cffea6e0a91cef63e06d`。

```asm
SlateportCity_OceanicMuseum_2F_Text_DontRunInMuseum:
	.string "Don't you dare run around inside\n"
	.string "the MUSEUM!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Don't you dare run around inside
the MUSEUM!
```

## `SlateportCity_OceanicMuseum_2F_Text_RemindsMeOfAbandonedShip`

`data/maps/SlateportCity_OceanicMuseum_2F/scripts.inc:350`，类型 `text`，SHA-256 `7cbee42f9a6be852c60ff0211fd0409c66743b3e9439526ddefecfbe3c8849ae`。

```asm
SlateportCity_OceanicMuseum_2F_Text_RemindsMeOfAbandonedShip:
	.string "I saw a model of a ship here.\p"
	.string "It reminded me of the ABANDONED SHIP\n"
	.string "near DEWFORD TOWN…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I saw a model of a ship here.

It reminded me of the ABANDONED SHIP
near DEWFORD TOWN…
```

## `SlateportCity_PokemonCenter_1F_EventScript_Sailor`

`data/maps/SlateportCity_PokemonCenter_1F/scripts.inc:19`，类型 `script`，SHA-256 `a2a35541d2f19eb9657a01d773316e336f31768193ec98a02ade10b841b9687f`。

```asm
SlateportCity_PokemonCenter_1F_EventScript_Sailor::
	msgbox SlateportCity_PokemonCenter_1F_Text_RaiseDifferentTypesOfPokemon, MSGBOX_NPC
	end
```

## `SlateportCity_PokemonCenter_1F_EventScript_Woman`

`data/maps/SlateportCity_PokemonCenter_1F/scripts.inc:23`，类型 `script`，SHA-256 `a8113eb6187182e3be98673f70a478de6671f49938054dc1b6e253a2bd7ac826`。

```asm
SlateportCity_PokemonCenter_1F_EventScript_Woman::
	msgbox SlateportCity_PokemonCenter_1F_Text_TradedMonWithFriend, MSGBOX_NPC
	end
```

## `SlateportCity_PokemonCenter_1F_Text_RaiseDifferentTypesOfPokemon`

`data/maps/SlateportCity_PokemonCenter_1F/scripts.inc:27`，类型 `text`，SHA-256 `13eaed32aeb470586ffa8064230eec3ae8a17bf2b8eece65de38697ce28f55ce`。

```asm
SlateportCity_PokemonCenter_1F_Text_RaiseDifferentTypesOfPokemon:
	.string "Want a tip for battling?\p"
	.string "I'd say it's raising different kinds\n"
	.string "of POKéMON in a balanced manner.\p"
	.string "It's no good to make just one\n"
	.string "POKéMON strong.\p"
	.string "If it has a type disadvantage,\n"
	.string "it might not stand a chance.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Want a tip for battling?

I'd say it's raising different kinds
of POKéMON in a balanced manner.

It's no good to make just one
POKéMON strong.

If it has a type disadvantage,
it might not stand a chance.
```

## `SlateportCity_PokemonCenter_1F_Text_TradedMonWithFriend`

`data/maps/SlateportCity_PokemonCenter_1F/scripts.inc:36`，类型 `text`，SHA-256 `1b729c7e418b2b57e51560bf6a7e19d2560daf81f591bbfdc924cd910ff8d594`。

```asm
SlateportCity_PokemonCenter_1F_Text_TradedMonWithFriend:
	.string "I trade POKéMON with my friends.\p"
	.string "If a traded POKéMON is holding an\n"
	.string "item, it makes me twice as happy!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I trade POKéMON with my friends.

If a traded POKéMON is holding an
item, it makes me twice as happy!
```

## `SlateportCity_PokemonFanClub_EventScript_Man`

`data/maps/SlateportCity_PokemonFanClub/scripts.inc:215`，类型 `script`，SHA-256 `6d71543fd6b31c2b1e8c03f43310034596533c8714154076004c11e8534626c4`。

```asm
SlateportCity_PokemonFanClub_EventScript_Man::
	msgbox SlateportCity_PokemonFanClub_Text_PokemonDontLikeFainting, MSGBOX_NPC
	end
```

## `SlateportCity_PokemonFanClub_EventScript_Twin`

`data/maps/SlateportCity_PokemonFanClub/scripts.inc:219`，类型 `script`，SHA-256 `0f0e1c00e0622108569213f24b0767431ed98ed84cb95542455be1576321f328`。

```asm
SlateportCity_PokemonFanClub_EventScript_Twin::
	msgbox SlateportCity_PokemonFanClub_Text_MonEnjoyedProtein, MSGBOX_NPC
	end
```

## `SlateportCity_PokemonFanClub_Text_MonEnjoyedProtein`

`data/maps/SlateportCity_PokemonFanClub/scripts.inc:384`，类型 `text`，SHA-256 `d9d0c1d9ef1d722049ec5b9cfabf9f1d017721652d7f8fddcac725bbf416aa13`。

```asm
SlateportCity_PokemonFanClub_Text_MonEnjoyedProtein:
	.string "Do POKéMON enjoy having items used\n"
	.string "on them?\p"
	.string "Mine acted really happy when I gave\n"
	.string "it some PROTEIN.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Do POKéMON enjoy having items used
on them?

Mine acted really happy when I gave
it some PROTEIN.
```

## `SlateportCity_PokemonFanClub_Text_PokemonDontLikeFainting`

`data/maps/SlateportCity_PokemonFanClub/scripts.inc:376`，类型 `text`，SHA-256 `8c36960cd1571c1620bdf2ba07020c414ea3d236273ff9278648e952cd15cc10`。

```asm
SlateportCity_PokemonFanClub_Text_PokemonDontLikeFainting:
	.string "If you keep letting a POKéMON faint\n"
	.string "in battle, it'll come to resent it.\p"
	.string "Soon, it will become less trusting\n"
	.string "of the TRAINER.\p"
	.string "In other words, it certainly won't\n"
	.string "like you very much.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
If you keep letting a POKéMON faint
in battle, it'll come to resent it.

Soon, it will become less trusting
of the TRAINER.

In other words, it certainly won't
like you very much.
```

## `SlateportCity_SternsShipyard_1F_EventScript_Briney`

`data/maps/SlateportCity_SternsShipyard_1F/scripts.inc:54`，类型 `script`，SHA-256 `0e83e0f3b626ed1cfaf53d4e8a6d8e9d2c133c615b379ae7f6a1d05cdb56819a`。

```asm
SlateportCity_SternsShipyard_1F_EventScript_Briney::
	msgbox SlateportCity_SternsShipyard_1F_Text_DecidedToHelpDock, MSGBOX_NPC
	end
```

## `SlateportCity_SternsShipyard_1F_EventScript_Scientist1`

`data/maps/SlateportCity_SternsShipyard_1F/scripts.inc:46`，类型 `script`，SHA-256 `4bf5c63db99a2c1eed3f46ab4115e3d581b7e98317e2282fd2bf05a7c11a8b90`。

```asm
SlateportCity_SternsShipyard_1F_EventScript_Scientist1::
	msgbox SlateportCity_SternsShipyard_1F_Text_SeaIsLikeLivingThing, MSGBOX_NPC
	end
```

## `SlateportCity_SternsShipyard_1F_EventScript_Scientist2`

`data/maps/SlateportCity_SternsShipyard_1F/scripts.inc:50`，类型 `script`，SHA-256 `fab14964b9f94ef5ce12c41292b711d00068f98c767ef08266c44c9029879247`。

```asm
SlateportCity_SternsShipyard_1F_EventScript_Scientist2::
	msgbox SlateportCity_SternsShipyard_1F_Text_GetSeasickEasily, MSGBOX_NPC
	end
```

## `SlateportCity_SternsShipyard_1F_Text_DecidedToHelpDock`

`data/maps/SlateportCity_SternsShipyard_1F/scripts.inc:108`，类型 `text`，SHA-256 `53759a939dd26c94925e325771b14dae9d4fe69677976a3aa0cb9d746027de09`。

```asm
SlateportCity_SternsShipyard_1F_Text_DecidedToHelpDock:
	.string "MR. BRINEY: Ah, {PLAYER}{KUN}!\n"
	.string "It's been too long!\p"
	.string "Aye, since I met you, this old sea dog's\n"
	.string "been feeling frisky!\p"
	.string "So I've decided to help DOCK make\n"
	.string "a ferry.\p"
	.string "Aye, after all, a ferry would be able\n"
	.string "to carry a lot of people.\p"
	.string "But, you know, that DOCK is really\n"
	.string "something special.\p"
	.string "With his knack for technology and\n"
	.string "my experience, I'm sure that we can\l"
	.string "build one great ship, aye!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
MR. BRINEY: Ah, {PLAYER}{KUN}!
It's been too long!

Aye, since I met you, this old sea dog's
been feeling frisky!

So I've decided to help DOCK make
a ferry.

Aye, after all, a ferry would be able
to carry a lot of people.

But, you know, that DOCK is really
something special.

With his knack for technology and
my experience, I'm sure that we can
build one great ship, aye!
```

## `SlateportCity_SternsShipyard_1F_Text_GetSeasickEasily`

`data/maps/SlateportCity_SternsShipyard_1F/scripts.inc:131`，类型 `text`，SHA-256 `0b25d2cd944f316383894497d00ebed56bc0dfbf2c87436663586143b5c84b40`。

```asm
SlateportCity_SternsShipyard_1F_Text_GetSeasickEasily:
	.string "I get seasick real easily.\n"
	.string "So I get to help out here instead.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
I get seasick real easily.
So I get to help out here instead.
```

## `SlateportCity_SternsShipyard_1F_Text_SeaIsLikeLivingThing`

`data/maps/SlateportCity_SternsShipyard_1F/scripts.inc:123`，类型 `text`，SHA-256 `5e7f38de4be72413415d961ae968e4589668ef326c84580e19171754f3d35791`。

```asm
SlateportCity_SternsShipyard_1F_Text_SeaIsLikeLivingThing:
	.string "The seasons, the weather, where\n"
	.string "the moon sits in the sky…\p"
	.string "These and other conditions make\n"
	.string "the sea change its expression.\p"
	.string "That's right!\n"
	.string "The sea is like a living thing!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The seasons, the weather, where
the moon sits in the sky…

These and other conditions make
the sea change its expression.

That's right!
The sea is like a living thing!
```

## `SlateportCity_SternsShipyard_2F_EventScript_Scientist1`

`data/maps/SlateportCity_SternsShipyard_2F/scripts.inc:4`，类型 `script`，SHA-256 `feb05e42db59cdbf96f27d80d437d65ceaea7d13ecfdf0685fd0d71de4e4561d`。

```asm
SlateportCity_SternsShipyard_2F_EventScript_Scientist1::
	msgbox SlateportCity_SternsShipyard_2F_Text_ShipDesignMoreLikeBuilding, MSGBOX_NPC
	end
```

## `SlateportCity_SternsShipyard_2F_EventScript_Scientist2`

`data/maps/SlateportCity_SternsShipyard_2F/scripts.inc:8`，类型 `script`，SHA-256 `f8fcdfcd74ca12781f71840a01e40ab87815a62d94eb12ce6a79120454ade471`。

```asm
SlateportCity_SternsShipyard_2F_EventScript_Scientist2::
	msgbox SlateportCity_SternsShipyard_2F_Text_FloatsBecauseBuoyancy, MSGBOX_NPC
	end
```

## `SlateportCity_SternsShipyard_2F_Text_FloatsBecauseBuoyancy`

`data/maps/SlateportCity_SternsShipyard_2F/scripts.inc:17`，类型 `text`，SHA-256 `a5bc260407f52cd170b9a45d3a5217f23ea74c35592cbd0d8a5a32d80211eb98`。

```asm
SlateportCity_SternsShipyard_2F_Text_FloatsBecauseBuoyancy:
	.string "Don't you think it's strange that\n"
	.string "a ship made of heavy iron floats?\p"
	.string "It floats because of a principle\n"
	.string "called buoyancy.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Don't you think it's strange that
a ship made of heavy iron floats?

It floats because of a principle
called buoyancy.
```

## `SlateportCity_SternsShipyard_2F_Text_ShipDesignMoreLikeBuilding`

`data/maps/SlateportCity_SternsShipyard_2F/scripts.inc:12`，类型 `text`，SHA-256 `7954f5afdd6a2e7ca91ccd73cceec54711c0c37cf53f82be2575aa252c2f8cde`。

```asm
SlateportCity_SternsShipyard_2F_Text_ShipDesignMoreLikeBuilding:
	.string "Designing a large ship is more like\n"
	.string "making a big building than putting\l"
	.string "together a transportation vehicle.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Designing a large ship is more like
making a big building than putting
together a transportation vehicle.
```

## `SlateportCity_Text_BattleTentBuiltRecently`

`data/maps/SlateportCity/scripts.inc:1069`，类型 `text`，SHA-256 `725b974265ae46343f55f0affa8d9a16c21cc73c0ea24b9dbe4f7f1173c86594`。

```asm
SlateportCity_Text_BattleTentBuiltRecently:
	.string "Recently, a BATTLE TENT was built\n"
	.string "in SLATEPORT.\p"
	.string "GYMS are fun, but the BATTLE TENT's\n"
	.string "awesome in its own way.\p"
	.string "You should go find tough POKéMON\n"
	.string "for the BATTLE TENT!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Recently, a BATTLE TENT was built
in SLATEPORT.

GYMS are fun, but the BATTLE TENT's
awesome in its own way.

You should go find tough POKéMON
for the BATTLE TENT!
```

## `SlateportCity_Text_BigSmileForCamera`

`data/maps/SlateportCity/scripts.inc:1108`，类型 `text`，SHA-256 `7f64082211a0f3c1ab2f5e135b24b2ed3a9c54cc6f678aaf686ef42cd926c3e6`。

```asm
SlateportCity_Text_BigSmileForCamera:
	.string "TY: Okay, CAPT. STERN, a big smile\n"
	.string "for the camera!$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
TY: Okay, CAPT. STERN, a big smile
for the camera!
```

## `SlateportCity_Text_BuyTooMuch`

`data/maps/SlateportCity/scripts.inc:1054`，类型 `text`，SHA-256 `94b4756610c07102ffd09bf02046e25fd40ac362f7e27d2044a56638daadf87c`。

```asm
SlateportCity_Text_BuyTooMuch:
	.string "Whenever I visit here, I get carried\n"
	.string "away and buy too much.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Whenever I visit here, I get carried
away and buy too much.
```

## `SlateportCity_Text_CantChangeTradeMonName`

`data/maps/SlateportCity/scripts.inc:1063`，类型 `text`，SHA-256 `d82fba95ea7e14250154798df9ec13db9550a0260b676d8bad06024ccc8533c8`。

```asm
SlateportCity_Text_CantChangeTradeMonName:
	.string "Any POKéMON you get in a trade,\n"
	.string "you can't change its nickname.\p"
	.string "The original TRAINER's love for that\n"
	.string "POKéMON is in the nickname.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Any POKéMON you get in a trade,
you can't change its nickname.

The original TRAINER's love for that
POKéMON is in the nickname.
```

## `SlateportCity_Text_MostInvaluableExperience`

`data/maps/SlateportCity/scripts.inc:1112`，类型 `text`，SHA-256 `e002f2f26040f88f713a96682e20dc1e82a6b3d4bf068898a9456e2aa9b3f9e6`。

```asm
SlateportCity_Text_MostInvaluableExperience:
	.string "GABBY: I see, I see. You've had a most\n"
	.string "invaluable experience…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
GABBY: I see, I see. You've had a most
invaluable experience…
```

## `SlateportCity_Text_SeaIsSoWet`

`data/maps/SlateportCity/scripts.inc:1043`，类型 `text`，SHA-256 `d51a05fac7ae52f450a92889293499472b26aa94b5d543bc1476e26e09cc2274`。

```asm
SlateportCity_Text_SeaIsSoWet:
	.string "The sea is just so vast…\p"
	.string "Could the sea have been made by\n"
	.string "the tears shed by POKéMON?$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The sea is just so vast…

Could the sea have been made by
the tears shed by POKéMON?
```

## `SlateportCity_Text_ShouldveBroughtMyGameBoy`

`data/maps/SlateportCity/scripts.inc:1031`，类型 `text`，SHA-256 `ed9a3865f0a69d4478376550a11d7b8dc0e53808e882872b847977784d72e032`。

```asm
SlateportCity_Text_ShouldveBroughtMyGameBoy:
	.string "Grumble…\p"
	.string "I should've brought my Game Boy\n"
	.string "Advance so I wouldn't get bored in line…\p"
	.string "Grumble…$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Grumble…

I should've brought my Game Boy
Advance so I wouldn't get bored in line…

Grumble…
```

## `SlateportCity_Text_SinkOldBoats`

`data/maps/SlateportCity/scripts.inc:1048`，类型 `text`，SHA-256 `88a3dddd7ec5b4bb35d3e8b63a4b257846a942cd27b5c135316757a873bc17ce`。

```asm
SlateportCity_Text_SinkOldBoats:
	.string "Do you know what they do with old\n"
	.string "ships that become too creaky to sail?\p"
	.string "They sink them in the sea so they\n"
	.string "become habitats for POKéMON.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
Do you know what they do with old
ships that become too creaky to sail?

They sink them in the sea so they
become habitats for POKéMON.
```

## `SlateportCity_Text_WonderIfLighthouseStartlesPokemon`

`data/maps/SlateportCity/scripts.inc:919`，类型 `text`，SHA-256 `4ec97b2625189928c8ffbfd7f2761614dd56fbe6e38b8e5ca1edc0690a3cf5be`。

```asm
SlateportCity_Text_WonderIfLighthouseStartlesPokemon:
	.string "The light of the lighthouse reaches\n"
	.string "dozens of miles away.\p"
	.string "I wonder if it doesn't startle POKéMON\n"
	.string "in the sea.$"
```

原文（仅显示解码，原始控制符见 encodedText/raw）：

```text
The light of the lighthouse reaches
dozens of miles away.

I wonder if it doesn't startle POKéMON
in the sea.
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

### `faceplayer`

`asm/macros/event.inc:718`

```asm
	.macro faceplayer
	.byte SCR_OP_FACEPLAYER
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

### `release`

`asm/macros/event.inc:918`

```asm
	.macro release
	.byte SCR_OP_RELEASE
	.endm
```

## 未解析引用

```json
[]
```
