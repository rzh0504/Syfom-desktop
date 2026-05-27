import type { Store } from 'vuex';

type SettingsState = {
  settings: unknown;
};

export function getSendSettingsPlugin() {
  return (store: Store<SettingsState>) => {
    store.subscribe((mutation, state) => {
      // console.log(mutation);
      if (mutation.type !== 'updateSettings') return;
      const settings = JSON.parse(JSON.stringify(state.settings)) as unknown;
      window.electronAPI?.send('settings', settings);
    });
  };
}
