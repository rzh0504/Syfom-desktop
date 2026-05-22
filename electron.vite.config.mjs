import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

const root = process.cwd();

function rendererDefines(mode) {
  const env = loadEnv(mode, root, ['VUE_APP_', 'DEV_SERVER_PORT']);

  return {
    'process.env.IS_ELECTRON': 'true',
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.BASE_URL': JSON.stringify('/'),
    'process.env.VUE_APP_ELECTRON_API_URL': JSON.stringify(
      env.VUE_APP_ELECTRON_API_URL || ''
    ),
    'process.env.VUE_APP_ELECTRON_API_URL_DEV': JSON.stringify(
      env.VUE_APP_ELECTRON_API_URL_DEV || ''
    ),
    'process.env.VUE_APP_LASTFM_API_KEY': JSON.stringify(
      env.VUE_APP_LASTFM_API_KEY || ''
    ),
    'process.env.VUE_APP_LASTFM_API_SHARED_SECRET': JSON.stringify(
      env.VUE_APP_LASTFM_API_SHARED_SECRET || ''
    ),
    'process.platform': JSON.stringify(process.platform),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, ['DEV_SERVER_PORT']);

  return {
    main: {
      resolve: {
        alias: {
          '@': resolve('src'),
        },
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(mode),
      },
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            background: resolve('src/background.js'),
          },
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            preload: resolve('src/preload.js'),
          },
        },
      },
    },
    renderer: {
      root,
      resolve: {
        alias: {
          '@': resolve('src'),
        },
      },
      define: rendererDefines(mode),
      plugins: [
        vue(),
        createSvgIconsPlugin({
          iconDirs: [resolve('src/assets/icons')],
          symbolId: 'icon-[name]',
        }),
      ],
      server: {
        port: Number(env.DEV_SERVER_PORT) || 8080,
      },
      build: {
        sourcemap: false,
        rollupOptions: {
          input: resolve('index.html'),
        },
      },
    },
  };
});
