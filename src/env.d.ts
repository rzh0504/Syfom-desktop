/// <reference types="vite/client" />

import type { DefineComponent } from 'vue';

declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'virtual:svg-icons-register';

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      send: (channel: string, ...args: any[]) => void;
      on: (
        channel: string,
        callback: (...args: any[]) => void
      ) => (() => void) | undefined;
    };
    require?: NodeRequire;
    resetApp?: () => string;
    yesplaymusic?: any;
  }
}
