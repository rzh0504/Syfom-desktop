import { app, dialog, globalShortcut, ipcMain } from 'electron';
import type { BrowserWindow, IpcMainEvent } from 'electron';
import type { EventEmitter } from 'events';
import { registerGlobalShortcut } from '@/electron/globalShortcut';
import cloneDeep from 'lodash/cloneDeep';
import shortcuts, { type Shortcut } from '@/utils/shortcuts';
import { createMenu } from './menu';
import { isCreateTray, isMac } from '@/utils/platform';

const clc = require('cli-color');
type StoreLike = {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
};

type ProxyConfig = {
  protocol: string;
  server: string;
  port: string | number;
};

type ShortcutUpdate = {
  id: string;
  type: keyof Shortcut;
  shortcut: string;
};

const log = (text: unknown) => {
  console.log(`${clc.blueBright('[ipcMain.js]')} ${text}`);
};

const exitAsk = (e: IpcMainEvent, win: BrowserWindow) => {
  e.preventDefault(); //阻止默认行为
  dialog
    .showMessageBox({
      type: 'info',
      title: 'Information',
      cancelId: 2,
      defaultId: 0,
      message: '确定要关闭吗？',
      buttons: ['最小化', '直接退出'],
    })
    .then(result => {
      if (result.response == 0) {
        e.preventDefault(); //阻止默认行为
        win.minimize(); //调用 最小化实例方法
      } else if (result.response == 1) {
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      }
    })
    .catch(err => {
      log(err);
    });
};

const exitAskWithoutMac = (e: IpcMainEvent, win: BrowserWindow) => {
  e.preventDefault(); //阻止默认行为
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
        e.preventDefault(); //阻止默认行为
        win.hide(); //调用 最小化实例方法
      } else if (result.response === 1) {
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      }
    })
    .catch(err => {
      log(err);
    });
};

export function initIpcMain(
  win: BrowserWindow,
  store: StoreLike,
  trayEventEmitter: EventEmitter
): void {
  ipcMain.on('close', e => {
    if (isMac) {
      win.hide();
      exitAsk(e, win);
    } else {
      let closeOpt = store.get('settings.closeAppOption');
      if (closeOpt === 'exit') {
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      } else if (closeOpt === 'minimizeToTray') {
        e.preventDefault();
        win.hide();
      } else {
        exitAskWithoutMac(e, win);
      }
    }
  });

  ipcMain.on('minimize', () => {
    win.minimize();
  });

  ipcMain.on('maximizeOrUnmaximize', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });

  ipcMain.on('nativeAlert', (_event, message: string) => {
    dialog.showMessageBox(win, {
      type: 'warning',
      message,
    });
  });

  ipcMain.on('settings', (_event, options: any) => {
    store.set('settings', options);
    if (options.enableGlobalShortcut) {
      registerGlobalShortcut(win, store);
    } else {
      log('unregister global shortcut');
      globalShortcut.unregisterAll();
    }
  });

  ipcMain.on('setProxy', (_event, config: ProxyConfig) => {
    const proxyRules = `${config.protocol}://${config.server}:${config.port}`;
    store.set('proxy', proxyRules);
    win.webContents.session
      .setProxy({
        proxyRules,
      })
      .then(() => {
        log('finished setProxy');
      });
  });

  ipcMain.on('removeProxy', () => {
    log('removeProxy');
    win.webContents.session.setProxy({});
    store.set('proxy', '');
  });

  ipcMain.on(
    'switchGlobalShortcutStatusTemporary',
    (_event, status: string) => {
      log('switchGlobalShortcutStatusTemporary');
      if (status === 'disable') {
        globalShortcut.unregisterAll();
      } else {
        registerGlobalShortcut(win, store);
      }
    }
  );

  ipcMain.on(
    'updateShortcut',
    (_event, { id, type, shortcut }: ShortcutUpdate) => {
      log('updateShortcut');
      let shortcuts = store.get('settings.shortcuts') as Shortcut[];
      let newShortcut = shortcuts.find(s => s.id === id);
      if (!newShortcut) return;
      newShortcut[type] = shortcut;
      store.set('settings.shortcuts', shortcuts);

      createMenu(win, store);
      globalShortcut.unregisterAll();
      registerGlobalShortcut(win, store);
    }
  );

  ipcMain.on('restoreDefaultShortcuts', () => {
    log('restoreDefaultShortcuts');
    store.set('settings.shortcuts', cloneDeep(shortcuts));

    createMenu(win, store);
    globalShortcut.unregisterAll();
    registerGlobalShortcut(win, store);
  });

  if (isCreateTray) {
    ipcMain.on('updateTrayTooltip', (_, title: string) => {
      trayEventEmitter.emit('updateTooltip', title);
    });
    ipcMain.on('updateTrayPlayState', (_, isPlaying: boolean) => {
      trayEventEmitter.emit('updatePlayState', isPlaying);
    });
    ipcMain.on('updateTrayLikeState', (_, isLiked: boolean) => {
      trayEventEmitter.emit('updateLikeState', isLiked);
    });
    ipcMain.on('updateTrayIcon', () => {
      trayEventEmitter.emit('updateIcon');
    });
  }
}
