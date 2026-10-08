/** A story-owned screen may commit only while its awaited UI lifetime is active. */
export function createStoryScreenPorts({ readUI, commitClock, commitProfile, silenceMusic, transitions }) {
  return {
    screen: async (command) => {
      const ui = readUI();
      if (command.id === 'new-game') {
        let active = true;
        try {
          const profile = await ui.showNewGameIntroduction({ stopMusic: () => { if (active) silenceMusic(); } });
          return commitProfile(profile);
        } finally { active = false; }
      }
      if (command.id === 'berry') return ui.showBerryPlot(command.input?.plotId);
      if (command.id === 'daycare') return ui.showDaycare();
      if (command.id !== 'clock') throw new Error('Unknown story screen');
      let active = true;
      try {
        let screen, opened;
        const show = () => { screen = ui.showTime({
          story: true,
          confirm: (hour, minute) => active
            ? commitClock(hour, minute)
            : { ok: false, reason: '调钟页面已经关闭。' },
          close: async (commit) => {
            await opened;
            if (transitions) await transitions.run('fade', commit);
            else commit();
          },
        }); };
        if (transitions) opened = transitions.run('fade', show);
        else show();
        await opened;
        return await screen;
      } finally { active = false; }
    },
  };
}
