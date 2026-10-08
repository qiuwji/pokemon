import { StoryEngine } from "../../../engine/story.js";
import { StoryCatalog } from "../../../engine/story-catalog.js";
import { dialogueInteraction } from "../../../engine/world-object-index.js";
import { STORY_EVENTS } from "../../../packs/emerald/story.js";
import { QUESTS } from "../../../packs/emerald/quests.js";

/** Assemble native/plugin story content and validate its world references. */
export function createEmeraldStory({ db, plugins, queries }) {
  const events = [
    ...STORY_EVENTS,
    ...(plugins?.story.values() || []),
  ];
  const storyCatalog = new StoryCatalog(
    [
      ...Object.values(db.stories || {}),
      ...(plugins?.storyBundles.values() || []),
    ],
    { queries, maps: db.maps, eventIds: new Set(events.map((e) => e.id)) },
  );
  const story = new StoryEngine(
    [
      {
        id: "world.dialogue", trigger: "interact", priority: 100,
        match: ({ object }) => !!object?._dialogueOverride && dialogueInteraction(object),
        build: (_state, { object }) => [{ type: "dialog", dialogue: object.dialogue }],
      },
      ...storyCatalog.events,
      ...(plugins?.story.values() || []),
      ...STORY_EVENTS,
    ],
    QUESTS,
    { queries },
  );
  for (const event of story.events) {
    if (!event.where) continue;
    const map = db.maps[event.where.map];
    if (
      !map ||
      event.where.x + event.where.width > map.width ||
      event.where.y + event.where.height > map.height
    )
      throw new Error(`Story region outside map: ${event.id}`);
  }
  return { storyCatalog, story };
}
