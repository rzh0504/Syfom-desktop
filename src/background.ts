'use strict';
import path from 'path';
import {
  app,
  protocol,
  BrowserWindow,
  shell,
  dialog,
  globalShortcut,
  nativeTheme,
  screen,
} from 'electron';
import type { BrowserWindowConstructorOptions, Event } from 'electron';
import {
  isWindows,
  isMac,
  isLinux,
  isDevelopment,
  isCreateTray,
} from '@/utils/platform';
import { initIpcMain } from './electron/ipcMain';
import { createMenu } from './electron/menu';
import { createTray } from '@/electron/tray';
import { createTouchBar } from './electron/touchBar';
import { createDockMenu } from './electron/dockMenu';
import { registerGlobalShortcut } from './electron/globalShortcut';
import { autoUpdater } from 'electron-updater';
import devtoolsInstaller, {
  VUEJS3_DEVTOOLS,
} from 'electron-devtools-installer';
import { EventEmitter } from 'events';
import express from 'express';
import type { Server } from 'node:http';
import Store from 'electron-store';
const clc = require('cli-color');
const log = (...text: unknown[]) => {
  console.log(`${clc.blueBright('[background.js]')} ${text}`);
};
const INTERNAL_SERVER_PORT = 27329;

type AppStore = Store<Record<string, any>>;

const closeOnLinux = (e: Event, win: BrowserWindow, store: AppStore) => {
  let closeOpt = store.get('settings.closeAppOption');
  if (closeOpt !== 'exit') {
    e.preventDefault();
  }

  if (closeOpt === 'ask') {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Information',
        cancelId: 2,
        defaultId: 0,
        message: '确定要关闭吗？',
        buttons: ['最小化到托盘', '直接退出'],
        checkboxLabel: '记住我的选择',
      })
      .then(result => {
        if (result.checkboxChecked && result.response !== 2) {
          win.webContents.send(
            'rememberCloseAppOption',
            result.response === 0 ? 'minimizeToTray' : 'exit'
          );
        }

        if (result.response === 0) {
          win.hide(); //调用 最小化实例方法
        } else if (result.response === 1) {
          app.exit(); //exit()直接关闭客户端，不会执行quit();
        }
      })
      .catch(err => {
        log(err);
      });
  } else if (closeOpt === 'exit') {
    app.quit();
  } else {
    win.hide();
  }
};

class Background {
  window: BrowserWindow | null;
  ypmTrayImpl: unknown;
  store: AppStore;
  expressApp: Server | null;
  trayEventEmitter?: EventEmitter;
  willQuitApp: boolean;

  constructor() {
    this.window = null;
    this.ypmTrayImpl = null;
    this.store = new Store({
      windowWidth: {
        width: { type: 'number', default: 1440 },
        height: { type: 'number', default: 840 },
      },
    } as any) as AppStore;
    this.expressApp = null;
    this.willQuitApp = !isMac;

    this.init();
  }

  init(): void {
    log('initializing');

    // Make sure the app is singleton.
    if (!app.requestSingleInstanceLock()) return app.quit();

    // create Express app
    this.createExpressApp();

    // Scheme must be registered before the app is ready
    protocol.registerSchemesAsPrivileged([
      { scheme: 'app', privileges: { secure: true, standard: true } },
    ]);

    // handle app events
    this.handleAppEvents();
  }

  async initDevtools(): Promise<void> {
    if (process.env.ENABLE_VUE_DEVTOOLS !== 'true') return;

    try {
      const installerModule = devtoolsInstaller as any;
      const installExtension =
        typeof installerModule === 'function'
          ? installerModule
          : installerModule.default;
      await installExtension(VUEJS3_DEVTOOLS);
    } catch (e) {
      console.error('Vue Devtools failed to install:', String(e));
    }
  }

  initDevExitHandlers(): void {
    // Exit cleanly on request from parent process in development mode.
    if (isWindows) {
      process.on('message', data => {
        if (data === 'graceful-exit') {
          app.quit();
        }
      });
    } else {
      process.on('SIGTERM', () => {
        app.quit();
      });
    }
  }

  createExpressApp(): void {
    log('creating express app');

    const expressApp = express();
    const rendererRoot = process.env.ELECTRON_RENDERER_URL
      ? path.join(__dirname, '../../public')
      : path.join(__dirname, '../renderer');
    expressApp.use('/', express.static(rendererRoot));
    expressApp.use('/player', (req, res) => {
      if (!this.window) {
        res.send({ currentTrack: null, progress: 0 });
        return;
      }
      this.window.webContents
        .executeJavaScript('window.yesplaymusic.player')
        .then((result: any) => {
          res.send({
            currentTrack: result._isPersonalFM
              ? result._personalFMTrack
              : result._currentTrack,
            progress: result._progress,
          });
        });
    });
    this.expressApp = expressApp.listen(INTERNAL_SERVER_PORT, '127.0.0.1');
  }

  createWindow(): void {
    log('creating app window');

    const appearance = this.store.get('settings.appearance');
    const showLibraryDefault = this.store.get('settings.showLibraryDefault');

    const options: BrowserWindowConstructorOptions = {
      width: this.store.get('window.width') || 1440,
      height: this.store.get('window.height') || 840,
      minWidth: 1080,
      minHeight: 720,
      titleBarStyle: 'hiddenInset',
      frame: !(
        isWindows ||
        (isLinux && this.store.get('settings.linuxEnableCustomTitlebar'))
      ),
      title: 'YesPlayMusic',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        webSecurity: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
      backgroundColor:
        ((appearance === undefined || appearance === 'auto') &&
          nativeTheme.shouldUseDarkColors) ||
        appearance === 'dark'
          ? '#222'
          : '#fff',
    };

    if (this.store.get('window.x') && this.store.get('window.y')) {
      let x = this.store.get('window.x');
      let y = this.store.get('window.y');

      let displays = screen.getAllDisplays();
      let isResetWindiw = false;
      if (displays.length === 1) {
        let { bounds } = displays[0];
        if (
          x < bounds.x ||
          x > bounds.x + bounds.width - 50 ||
          y < bounds.y ||
          y > bounds.y + bounds.height - 50
        ) {
          isResetWindiw = true;
        }
      } else {
        isResetWindiw = true;
        for (let i = 0; i < displays.length; i++) {
          let { bounds } = displays[i];
          if (
            x > bounds.x &&
            x < bounds.x + bounds.width &&
            y > bounds.y &&
            y < bounds.y - bounds.height
          ) {
            // 检测到APP窗口当前处于一个可用的屏幕里，break
            isResetWindiw = false;
            break;
          }
        }
      }

      if (!isResetWindiw) {
        options.x = Number(x);
        options.y = Number(y);
      }
    }

    this.window = new BrowserWindow(options);

    // hide menu bar on Microsoft Windows and Linux
    this.window.setMenuBarVisibility(false);

    const devServerURL = process.env.ELECTRON_RENDERER_URL;

    if (devServerURL) {
      // Load the url of the dev server if in development mode
      this.window.loadURL(
        showLibraryDefault ? `${devServerURL}/#/library` : devServerURL
      );
      if (!process.env.IS_TEST) this.window.webContents.openDevTools();
    } else {
      this.window.loadURL(
        showLibraryDefault
          ? `http://localhost:${INTERNAL_SERVER_PORT}/#/library`
          : `http://localhost:${INTERNAL_SERVER_PORT}`
      );
    }
  }

  checkForUpdates(): void {
    if (isDevelopment) return;
    log('checkForUpdates');
    autoUpdater.checkForUpdatesAndNotify();

    const showNewVersionMessage = (info: { version: string }) => {
      dialog
        .showMessageBox({
          title: '发现新版本 v' + info.version,
          message: '发现新版本 v' + info.version,
          detail: '是否前往 GitHub 下载新版本安装包？',
          buttons: ['下载', '取消'],
          type: 'question',
          noLink: true,
        })
        .then(result => {
          if (result.response === 0) {
            shell.openExternal(
              'https://github.com/qier222/YesPlayMusic/releases'
            );
          }
        });
    };

    autoUpdater.on('update-available', info => {
      showNewVersionMessage(info);
    });
  }

  handleWindowEvents(): void {
    if (!this.window) return;
    const win = this.window;
    win.once('ready-to-show', () => {
      log('window ready-to-show event');
      win.show();
      this.store.set('window', win.getBounds());
    });

    win.on('close', e => {
      log('window close event');

      if (isLinux) {
        closeOnLinux(e, win, this.store);
      } else if (isMac) {
        if (this.willQuitApp) {
          this.window = null;
          app.quit();
        } else {
          e.preventDefault();
          win.hide();
        }
      } else {
        let closeOpt = this.store.get('settings.closeAppOption');
        if (this.willQuitApp && (closeOpt === 'exit' || closeOpt === 'ask')) {
          this.window = null;
          app.quit();
        } else {
          e.preventDefault();
          win.hide();
        }
      }
    });

    win.on('resized', () => {
      this.store.set('window', win.getBounds());
    });

    win.on('moved', () => {
      this.store.set('window', win.getBounds());
    });

    win.on('maximize', () => {
      win.webContents.send('isMaximized', true);
    });

    win.on('unmaximize', () => {
      win.webContents.send('isMaximized', false);
    });

    win.webContents.on('new-window' as any, function (e: any, url: string) {
      e.preventDefault();
      log('open url');
      const excludeHosts = ['www.last.fm'];
      const exclude = excludeHosts.find(host => url.includes(host));
      if (exclude) {
        const newWindow = new BrowserWindow({
          width: 800,
          height: 600,
          titleBarStyle: 'default',
          title: 'YesPlayMusic',
          webPreferences: {
            webSecurity: true,
            nodeIntegration: false,
            contextIsolation: true,
          },
        });
        newWindow.loadURL(url);
        return;
      }
      shell.openExternal(url);
    });
  }

  handleAppEvents(): void {
    app.on('ready', async () => {
      // This method will be called when Electron has finished
      // initialization and is ready to create browser windows.
      // Some APIs can only be used after this event occurs.
      log('app ready event');

      // for development
      if (isDevelopment) {
        this.initDevExitHandlers();
        this.initDevtools();
      }

      // create window
      this.createWindow();
      if (!this.window) return;
      this.window.once('ready-to-show', () => {
        this.window?.show();
      });
      this.handleWindowEvents();

      // create tray
      if (isCreateTray) {
        this.trayEventEmitter = new EventEmitter();
        this.ypmTrayImpl = createTray(
          this.window,
          this.trayEventEmitter,
          this.store
        );
      }

      // init ipcMain
      initIpcMain(
        this.window,
        this.store,
        this.trayEventEmitter || new EventEmitter()
      );

      // set proxy
      const proxyRules = this.store.get('proxy');
      if (proxyRules) {
        this.window.webContents.session
          .setProxy({ proxyRules })
          .then(() => log('finished setProxy'));
      }

      // check for updates
      this.checkForUpdates();

      // create menu
      createMenu(this.window, this.store);

      // create dock menu for macOS
      const createdDockMenu = createDockMenu(this.window);
      if (app.dock) app.dock.setMenu(createdDockMenu);

      // create touch bar
      const createdTouchBar = createTouchBar(this.window);
      if (createdTouchBar) this.window.setTouchBar(createdTouchBar);

      // register global shortcuts
      if (this.store.get('settings.enableGlobalShortcut') !== false) {
        registerGlobalShortcut(this.window, this.store);
      }
    });

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      log('app activate event');
      if (this.window === null) {
        this.createWindow();
      } else {
        this.window.show();
      }
    });

    app.on('window-all-closed', () => {
      if (!isMac) {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.willQuitApp = true;
    });

    app.on('quit', () => {
      this.expressApp?.close();
    });

    app.on('will-quit', () => {
      // unregister all global shortcuts
      globalShortcut.unregisterAll();
    });

    if (!isMac) {
      app.on('second-instance', () => {
        if (this.window) {
          this.window.show();
          if (this.window.isMinimized()) {
            this.window.restore();
          }
          this.window.focus();
        }
      });
    }
  }
}

new Background();
