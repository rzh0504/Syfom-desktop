import { createI18n } from 'vue-i18n';
import store from '@/store';

import en from './lang/en.js';
import zhCN from './lang/zh-CN.js';
import zhTW from './lang/zh-TW.js';
import tr from './lang/tr.js';

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: store.state.settings.lang,
  messages: {
    en,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    tr,
  },
  missingWarn: false,
  fallbackWarn: false,
});

i18n.t = (...args) => i18n.global.t(...args);
Object.defineProperty(i18n, 'locale', {
  get() {
    return i18n.global.locale.value;
  },
  set(value) {
    i18n.global.locale.value = value;
  },
});

export default i18n;
