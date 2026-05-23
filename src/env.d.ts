/// <reference types="vite/client" />

import type { DefineComponent } from 'vue';
import type { filters } from '@/utils/filters';

declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

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
    require?: NodeJS.Require;
    resetApp?: () => string;
    yesplaymusic?: any;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $filters: typeof filters;
    $copyText: (text: string) => Promise<string>;
  }
}
