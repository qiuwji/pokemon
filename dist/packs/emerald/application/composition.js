import { ControlApplication, CONTROL_PORTS } from "./control-application.js";
import { ViewApplication, VIEW_PORTS } from "./view-application.js";
import {
  AppearanceApplication,
  APPEARANCE_PORTS,
} from "./appearance-application.js";
import { FacilityApplication, FACILITY_PORTS } from "./facility-application.js";
import {
  EncounterApplication,
  ENCOUNTER_PORTS,
} from "./encounter-application.js";
import { ContactApplication, CONTACT_PORTS } from "./contact-application.js";
import {
  ItemShortcutApplication,
  ITEM_SHORTCUT_PORTS,
} from "./item-shortcut-application.js";
import { WeatherApplication, WEATHER_PORTS } from "./weather-application.js";
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
  applications.control = new ControlApplication(liveApplicationPorts(read, CONTROL_PORTS, {
    devicePending: () => !!applications.devices.service.nextRequest(),
  }));
  applications.save = new SaveApplication(
    liveApplicationPorts(read, SAVE_PORTS, { storage }),
  );
  applications.view = new ViewApplication(
    liveApplicationPorts(read, VIEW_PORTS),
  );
  applications.appearance = new AppearanceApplication(
    liveApplicationPorts(read, APPEARANCE_PORTS),
  );
  applications.encounters = new EncounterApplication(
    liveApplicationPorts(read, ENCOUNTER_PORTS, {
      bindEncounterActor: (uid) =>
        applications.actors.repository.list()[uid] || null,
      removeEncounterActor: (uid) => applications.actors.consume(uid),
      startEncounterBattle: (...args) =>
        applications.battle.startEncounterBattle(...args),
    }),
  );
  applications.contacts = new ContactApplication(
    liveApplicationPorts(read, CONTACT_PORTS, {
      contactReady: () =>
        !read("busy") &&
        !read("battle") &&
        !read("facilityActive") &&
        !read("ui")?.blocked &&
        !read("ui")?.dialog,
    }),
  );
  applications.weather = new WeatherApplication(
    liveApplicationPorts(read, WEATHER_PORTS),
  );
  applications.actors = new ActorApplication(
    liveApplicationPorts(read, ACTOR_PORTS, {
      actorContact: (...args) => applications.contacts.request(...args),
      actorRemoved: (uid) => {
        applications.encounters.removedActor(uid);
        applications.appearance.removedActor(uid);
      },
    }),
  );
  applications.crops = new CropApplication(
    liveApplicationPorts(read, CROP_PORTS),
  );
  applications.time = new TimeApplication(
    liveApplicationPorts(read, TIME_PORTS, {
      advanceWeatherDays: (days) => applications.weather.days(days),
    }),
  );
  applications.inventory = new InventoryApplication(
    liveApplicationPorts(read, INVENTORY_PORTS, {}),
  );
  applications.itemShortcut = new ItemShortcutApplication(
    liveApplicationPorts(read, ITEM_SHORTCUT_PORTS),
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
    liveApplicationPorts(read, MOVEMENT_PORTS, {
      stepField: (...args) => applications.world.move(...args),
    }),
  );
  applications.fieldActions = new FieldActionApplication(
    liveApplicationPorts(read, FIELD_ACTION_PORTS, {
      deviceView: () => applications.devices.view(),
      deviceEvent: (...args) => applications.devices.event(...args),
    }),
  );
  applications.devices = new DeviceApplication(
    liveApplicationPorts(read, DEVICE_PORTS, {
      simulationActive: () =>
        !applications.frame.paused && applications.frame.playActive(),
      fieldInputView: () => ({
        ...applications.movement.input.previousInput,
        blocked: applications.movement.input.blocked,
      }),
    }),
  );
  applications.world = new WorldApplication(
    liveApplicationPorts(read, WORLD_PORTS, {
      bindActorMaps: maps => applications.actors.useMaps(maps),
      enterWeather: (map) => applications.weather.enter(map),
      stepWeather: (position) => applications.weather.step(position),
      bindMovement: () => applications.movement.bind(),
      bindDevices: (options) => applications.devices.bind(options),
      interactDevice: () => applications.devices.interactFront(),
      devicePending: () => !!applications.devices.service.nextRequest(),
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
      bindContacts: () => {
        applications.contacts.bind();
        applications.encounters.bind();
        applications.appearance.bind();
        applications.view.reset();
      },
      blockedContact: (id) => applications.contacts.bump(id),
      fieldInteraction: (event) => applications.fieldActions.interaction(event),
      fieldEffectVisit: (map, options) =>
        applications.fieldActions.prepareVisit(map, options),
      blockedFieldInteraction: () => applications.fieldActions.triggerBlocked(),
    }),
  );
  applications.triggers = new TriggersApplication(
    liveApplicationPorts(read, TRIGGERS_PORTS, {
      encounterStep: (cell) => applications.encounters.step(cell),
      resetEncounters: () => applications.encounters.reset(),
    }),
  );
  applications.battle = new BattleApplication(
    liveApplicationPorts(read, BATTLE_PORTS, {}),
  );
  applications.facilities = new FacilityApplication(
    liveApplicationPorts(read, FACILITY_PORTS, {
      startFacilityBattle: (...args) =>
        applications.battle.startIsolatedTrainerBattle(...args),
    }),
  );
  applications.story = new StoryApplication(
    liveApplicationPorts(read, STORY_PORTS, {
      commitStoryClock: (hour, minute) => applications.time.commitClock(hour, minute),
      validateWeatherCommand: (command) =>
        applications.weather.validateStory(command),
      performStoryWeather: (command) => applications.weather.story(command),
    }),
  );
  applications.frame = new FrameApplication(
    liveApplicationPorts(read, FRAME_PORTS, {
      tickWeather: (...args) => applications.weather.tick(...args),
      tickDevices: (...args) => applications.devices.tick(...args),
      tickActors: (...args) => applications.actors.tick(...args),
      flushContacts: () => applications.contacts.flush(),
    }),
  );
  applications.inspection = new InspectionApplication(
    liveApplicationPorts(read, INSPECTION_PORTS, {}),
  );
  applications.presentation = new PresentationApplication(
    liveApplicationPorts(read, PRESENTATION_PORTS, {}),
  );
}
