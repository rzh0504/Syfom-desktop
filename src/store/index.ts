import { createStore } from 'vuex';
import type { Plugin } from 'vuex';
import state from './state';
import mutations from './mutations';
import actions from './actions';
import { changeAppearance } from '@/utils/appearance';
import Player from '@/utils/Player';
// vuex 自定义插件
import saveToLocalStorage from './plugins/localStorage';
import { getSendSettingsPlugin } from './plugins/sendSettings';

let plugins: Plugin<typeof state>[] = [saveToLocalStorage];
if (Boolean(process.env.IS_ELECTRON)) {
  let sendSettings = getSendSettingsPlugin();
  plugins.push(sendSettings);
}
const options = {
  state,
  mutations,
  actions,
  plugins,
};

const store = createStore(options);

if ([undefined, null].includes(store.state.settings.lang)) {
  const defaultLang = 'en';
  const langMapper = new Map()
    .set('zh', 'zh-CN')
    .set('zh-TW', 'zh-TW')
    .set('en', 'en')
    .set('tr', 'tr');
  store.state.settings.lang =
    langMapper.get(
      langMapper.has(navigator.language)
        ? navigator.language
        : navigator.language.slice(0, 2)
    ) || defaultLang;
  localStorage.setItem('settings', JSON.stringify(store.state.settings));
}

changeAppearance(store.state.settings.appearance);

store.subscribe((mutation, state) => {
  if (mutation.type !== 'updateSettings') return;
  const payload = mutation.payload as { key?: unknown; value?: unknown };
  if (payload.key === 'appearance') {
    changeAppearance(
      typeof payload.value === 'string'
        ? payload.value
        : state.settings.appearance
    );
  }
});

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    if (store.state.settings.appearance === 'auto') {
      changeAppearance(store.state.settings.appearance);
    }
  });

let player = new Player();
player = new Proxy(player, {
  set(target, prop, val) {
    // console.log({ prop, val });
    (target as unknown as Record<PropertyKey, unknown>)[prop] = val;
    if (typeof prop === 'string' && ['_howler', '_progress'].includes(prop)) {
      return true;
    }
    target.saveSelfToLocalStorage();
    target.sendSelfToIpcMain();
    return true;
  },
});
store.state.player = player;

export default store;
