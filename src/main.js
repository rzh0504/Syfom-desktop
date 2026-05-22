import { createApp } from 'vue';
import { createGtag } from 'vue-gtag';
import App from './App.vue';
import router from './router';
import store from './store';
import i18n from '@/locale';
import svgIcons from '@/assets/icons';
import filters from '@/utils/filters';
import clipboard from '@/plugins/clipboard';
import './registerServiceWorker';
import { dailyTask } from '@/utils/common';
import '@/assets/css/global.scss';
import NProgress from 'nprogress';
import '@/assets/css/nprogress.css';

window.resetApp = () => {
  localStorage.clear();
  indexedDB.deleteDatabase('syfom-desktop');
  document.cookie.split(';').forEach(function (c) {
    document.cookie = c
      .replace(/^ +/, '')
      .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });
  return '已重置应用，请刷新页面（按Ctrl/Command + R）';
};
console.log(
  '如出现问题，可尝试在本页输入 %cresetApp()%c 然后按回车重置应用。',
  'background: #eaeffd;color:#335eea;padding: 4px 6px;border-radius:3px;',
  'background:unset;color:unset;'
);

NProgress.configure({ showSpinner: false, trickleSpeed: 100 });
dailyTask();

createApp(App)
  .use(store)
  .use(router)
  .use(i18n)
  .use(svgIcons)
  .use(filters)
  .use(clipboard)
  .use(
    createGtag({
      tagId: 'G-KMJJCFZDKF',
      pageTracker: { router },
    })
  )
  .mount('#app');
