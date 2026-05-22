/// <reference types="vite/client" />

import type { DefineComponent } from 'vue';

declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'virtual:svg-icons-register';

declare global {
  interface Window {
    require?: NodeRequire;
    resetApp?: () => string;
    yesplaymusic?: any;
  }
}
