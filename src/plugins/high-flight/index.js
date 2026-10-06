import { objectSchema } from '../../engine/extensions/values.js';

/** Free-flight mode plus an idempotent test kit. All writes use domain intents. */
export const highFlight = {
  id: 'high-flight', apiVersion: 1, version: '1.0.0', dataVersion: 1,
  permissions: ['createMonster', 'reward', 'learnMove'],
  setup(api) {
    // Same 15×10 aspect ratio; 2/3 zoom yields 22.5×15 visible tiles (1.5× each axis).
    const camera = api.content.register('cameraProfiles', 'altitude', {
      name: '高空视角', columns: 15, rows: 10, zoom: 2 / 3,
    });
    const mist = api.content.register('environmentLayers', 'mist', {
      name: '高空薄雾', visual: 'weather.fog', opacity: 0.18,
    });
    const birds = Object.fromEntries(['male', 'female'].map(gender => [gender,
      api.content.register('resources', `bird-${gender}`, `generated/plugins/high-flight/assets/fly-bird-${gender}.png`),
    ]));
    const bob = { amplitude: 1.5, periodMs: 960 };
    const appearance = api.content.register('appearances', 'rider', {
      name: '飞行骑乘', defaultVariant: 'male',
      // Native Fly uses a single 32×32 bird in player palette slot 0; rider center is 8px above it.
      variants: Object.fromEntries(['male', 'female'].map(gender => [gender, {
        shadow: true,
        layers: [
          { kind: 'image', resource: birds[gender], size: { width: 32, height: 32 }, x: -8, y: -24, bob },
          { kind: 'actor', actor: gender === 'female' ? 'MayNormal' : 'BrendanNormal', y: -32, bob },
        ],
      }])),
      select: (_, context) => context.gender || 'male',
    });
    const air = api.content.register('movement', 'air', {
      name: '飞空术（自由飞行）', actor: 'BrendanNormal', durations: [120], surface: 'both',
      mapRequires: { indoor: false }, replacesTravel: 'fly',
      allowed: c => !!c.capabilities?.fly && !c.map.indoor,
      traverse: () => true,
      navigation: {
        ignoreActors: true, ignoreElevation: true, ignoreEdges: true, ignoreWarps: true,
        ignoreTerrain: true, suppressInteractions: true, requiresLanding: true,
      },
      presentation: {
        cameraProfile: camera, environmentLayer: mist, appearance,
        aboveTerrain: true, freezeAnimation: true,
      },
    });
    api.content.register('fieldActions', 'takeoff', {
      name: '飞空术 · 起飞', partyMove: 'fly', duration: 480, cue: 'field-impact',
      avatar: [{ anchor: 'actor', start: 0, end: 1, keyframes: [
        { at: 0, values: { y: 0 } }, { at: 1, easing: 'in-out-quad', values: { y: -16 } },
      ] }],
      allowed: c => c.mode !== air && c.movementOptions[air]?.ok === true,
      target: c => c.position, plan: () => ({ kind: 'movement', mode: air }),
    });
    api.content.register('fieldActions', 'land', {
      name: '飞空术 · 降落', partyMove: 'fly', duration: 360, cue: 'field-impact',
      avatar: [{ anchor: 'actor', start: 0, end: 1, keyframes: [
        { at: 0, values: { y: 0 } }, { at: 1, easing: 'in-out-quad', values: { y: 16 } },
      ] }],
      allowed: c => c.mode === air && (c.movementOptions.walk?.ok === true || { reason: c.movementOptions.walk?.reason }),
      target: c => c.position, plan: () => ({ kind: 'movement', mode: 'walk' }),
    });
    api.actions.register('prepare', {
      schema: objectSchema(),
      run(ctx) {
        if (ctx.store.get('kit')) return { ok: true };
        const q = ctx.query();
        if (q.party.length >= 6)
          return { ok: false, reason: '请先空出一个队伍位置，再重启或移动一步领取飞行测试伙伴。' };
        ctx.store.set('before', q.party.map(m => m.uid));
        ctx.intent({ kind: 'createMonster', species: 'swellow', level: 30, placement: 'party' });
        ctx.intent({ kind: 'reward', reward: { id: 'high-flight:kit', items: { hm_fly: 1 }, flags: { badgeFeather: true } } });
        ctx.store.set('kit', true);
        return { ok: true };
      },
    });
    api.actions.register('teach', {
      schema: objectSchema(),
      run(ctx) {
        if (!ctx.store.get('kit') || ctx.store.get('trained')) return { ok: true };
        const q = ctx.query(), before = ctx.store.get('before') || [];
        const mon = [...q.party, ...q.box].find(m => m.species === 'swellow' && !before.includes(m.uid));
        if (!mon || !q.party.some(m => m.uid === mon.uid))
          return { ok: false, reason: '请把飞行测试大王燕放回队伍。' };
        ctx.intent({ kind: 'learnMove', method: 'hm_fly', uid: mon.uid, index: 0 });
        ctx.store.set('trained', true);
        ctx.store.set('uid', mon.uid);
        return { ok: true };
      },
    });
    api.queries.register('status', { schema: objectSchema(), read: view => ({ ready: !!view.store.get('trained') }) });
    let pending = false, retryRequested = false;
    const provision = () => {
      if (pending) return;
      let q;
      try {
        if (api.store.get('trained')) return;
        q = api.query();
      } catch { return; } // Host is not yet attached during registration/restore.
      if (q.busy || q.battle || q.story.session) return;
      pending = true;
      // Each step is an owned domain transaction. No timers, direct state writes or duplicate gifts.
      void api.commands.dispatch('high-flight:prepare').then(result => result.ok ?
        api.commands.dispatch('high-flight:teach') : null)
        .catch(() => {}).finally(() => {
          pending = false;
          if (retryRequested) { retryRequested = false; provision(); }
        }); // A busy command is retried at the next boundary.
    };
    const fieldBoundary = () => {
      // Coalesce a real field change during provisioning; do not reschedule our own command facts.
      if (pending) retryRequested = true;
      else provision();
    };
    api.events.on('core:field-step', fieldBoundary);
    api.events.on('core:world-visit', fieldBoundary);
    api.events.on('core:command-settled', provision);
  },
};
