import { DeviceApplication, DEVICE_PORTS } from "./device-application.js";
import { ActorApplication, ACTOR_PORTS } from "./actor-application.js";
import { CropApplication, CROP_PORTS } from "./crop-application.js";
import { TimeApplication, TIME_PORTS } from "./time-application.js";
import { liveApplicationPorts } from "./ports.js";
import {
  InventoryApplication,
  INVENTORY_PORTS,
} from "./inventory-application.js";
import { PartyApplication, PARTY_PORTS } from "./party-application.js";
import { FormsApplication, FORMS_PORTS } from "./forms-application.js";
import { GrowthApplication, GROWTH_PORTS } from "./growth-application.js";
import { BattleApplication, BATTLE_PORTS } from "./battle-application.js";
import { StoryApplication, STORY_PORTS } from "./story-application.js";
import { MovementApplication, MOVEMENT_PORTS } from "./movement-application.js";
import {
  FieldActionApplication,
  FIELD_ACTION_PORTS,
} from "./field-action-application.js";
import { WorldApplication, WORLD_PORTS } from "./world-application.js";
import { TriggersApplication, TRIGGERS_PORTS } from "./triggers-application.js";
import { SaveApplication, SAVE_PORTS } from "./save-application.js";
import { FrameApplication, FRAME_PORTS } from "./frame-application.js";
import {
  InspectionApplication,
  INSPECTION_PORTS,
} from "./inspection-application.js";
import {
  PresentationApplication,
  PRESENTATION_PORTS,
} from "./presentation-application.js";
/** Owns service assembly and the few intentional lifecycle handoffs; it owns no domain state. */
export function composeApplications(applications, read, { storage }) {
  applications.save = new SaveApplication(
    liveApplicationPorts(read, SAVE_PORTS, { storage }),
  );
  applications.actors = new ActorApplication(
    liveApplicationPorts(read, ACTOR_PORTS),
  );
  applications.crops = new CropApplication(
    liveApplicationPorts(read, CROP_PORTS),
  );
  applications.time = new TimeApplication(
    liveApplicationPorts(read, TIME_PORTS),
  );
  applications.inventory = new InventoryApplication(
    liveApplicationPorts(read, INVENTORY_PORTS, {}),
  );
  applications.party = new PartyApplication(
    liveApplicationPorts(read, PARTY_PORTS, {}),
  );
  applications.forms = new FormsApplication(
    liveApplicationPorts(read, FORMS_PORTS, {}),
  );
  applications.growth = new GrowthApplication(
    liveApplicationPorts(read, GROWTH_PORTS, {}),
  );
  applications.movement = new MovementApplication(
    liveApplicationPorts(read, MOVEMENT_PORTS, {}),
  );
  applications.fieldActions = new FieldActionApplication(
    liveApplicationPorts(read, FIELD_ACTION_PORTS, {
      deviceView: () => applications.devices.view(),
    }),
  );
  applications.devices = new DeviceApplication(
    liveApplicationPorts(read, DEVICE_PORTS),
  );
  applications.world = new WorldApplication(
    liveApplicationPorts(read, WORLD_PORTS, {
      bindMovement: () => applications.movement.bind(),
      bindDevices: (options) => applications.devices.bind(options),
      interactDevice: () => applications.devices.interactFront(),
      deviceEvent: (...args) => applications.devices.event(...args),
      deviceVisit: (map) => {
        const service = applications.devices.service,
          draft = service.prepareVisit(map);
        return {
          check: () => service.checkVisit(draft),
          commit: () => service.commitVisit(draft),
        };
      },
      resetTriggers: () => applications.triggers.reset(),
      bindFieldActions: () => applications.fieldActions.bind(),
    }),
  );
  applications.triggers = new TriggersApplication(
    liveApplicationPorts(read, TRIGGERS_PORTS, {}),
  );
  applications.battle = new BattleApplication(
    liveApplicationPorts(read, BATTLE_PORTS, {}),
  );
  applications.story = new StoryApplication(
    liveApplicationPorts(read, STORY_PORTS, {}),
  );
  applications.frame = new FrameApplication(
    liveApplicationPorts(read, FRAME_PORTS, {
      tickDevices: (...args) => applications.devices.tick(...args),
    }),
  );
  applications.inspection = new InspectionApplication(
    liveApplicationPorts(read, INSPECTION_PORTS, {}),
  );
  applications.presentation = new PresentationApplication(
    liveApplicationPorts(read, PRESENTATION_PORTS, {}),
  );
}
