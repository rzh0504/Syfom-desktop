import { app, dialog, globalShortcut, ipcMain } from 'electron';
import { registerGlobalShortcut } from '@/electron/globalShortcut';
import cloneDeep from 'lodash/cloneDeep';
import shortcuts from '@/utils/shortcuts';
import { createMenu } from './menu';
import { isCreateTray, isMac } from '@/utils/platform';
import axios from 'axios';

const clc = require('cli-color');
const log = text => {
  console.log(`${clc.blueBright('[ipcMain.js]')} ${text}`);
};

let discordClient = null;
let isDiscordPresenceDisabled = false;

function getSafeStorage() {
  try {
    return require('electron').safeStorage || null;
  } catch (error) {
    return null;
  }
}

function encodeCredentials(credentials) {
  const safeStorage = getSafeStorage();
  if (
    safeStorage &&
    typeof safeStorage.isEncryptionAvailable === 'function' &&
    safeStorage.isEncryptionAvailable()
  ) {
    return {
      encrypted: true,
      value: safeStorage
        .encryptString(JSON.stringify(credentials))
        .toString('base64'),
    };
  }

  return {
    encrypted: false,
    value: credentials,
  };
}

function decodeCredentials(record) {
  if (!record) return null;
  if (!record.encrypted) return record.value || record;

  const safeStorage = getSafeStorage();
  if (
    !safeStorage ||
    typeof safeStorage.isEncryptionAvailable !== 'function' ||
    !safeStorage.isEncryptionAvailable()
  ) {
    return null;
  }

  try {
    return JSON.parse(
      safeStorage.decryptString(Buffer.from(record.value, 'base64'))
    );
  } catch (error) {
    return null;
  }
}

function joinRemoteUrl(serverUrl, path = '/') {
  const normalizedServerUrl = String(serverUrl || '').replace(/\/+$/, '');
  const normalizedPath = `/${String(path || '/')}`.replace(/\/+/g, '/');
  return `${normalizedServerUrl}${
    normalizedPath === '/' ? '' : normalizedPath
  }`;
}

function buildAuthHeader(credentials = {}) {
  if (!credentials.username && !credentials.password) return {};
  return {
    Authorization: `Basic ${Buffer.from(
      `${credentials.username || ''}:${credentials.password || ''}`
    ).toString('base64')}`,
  };
}

async function parseWebdavAudioMetadata(
  store,
  { sourceKey, path, contentType }
) {
  const allCredentials = store.get('webdavCredentials') || {};
  const credentials = decodeCredentials(allCredentials[sourceKey]);
  if (!credentials || !credentials.serverUrl || !path) return null;

  const response = await axios({
    url: joinRemoteUrl(credentials.serverUrl, path),
    method: 'get',
    responseType: 'arraybuffer',
    headers: buildAuthHeader(credentials),
    timeout: 30000,
  });
  const metadata = await require('music-metadata').parseBuffer(
    Buffer.from(response.data),
    contentType || undefined,
    { duration: true }
  );
  const cover = require('music-metadata').selectCover(metadata.common.picture);

  return {
    title: metadata.common.title || '',
    album: metadata.common.album || '',
    artists: metadata.common.artists || [],
    artist: metadata.common.artist || '',
    albumartist: metadata.common.albumartist || '',
    genre: metadata.common.genre || [],
    year: metadata.common.year || 0,
    track: (metadata.common.track && metadata.common.track.no) || 0,
    disk: (metadata.common.disk && metadata.common.disk.no) || 0,
    duration: metadata.format.duration || 0,
    bitrate: metadata.format.bitrate || 0,
    codec: metadata.format.codec || '',
    cover: cover
      ? {
          format: cover.format || 'image/jpeg',
          dataUrl: `data:${cover.format || 'image/jpeg'};base64,${Buffer.from(
            cover.data
          ).toString('base64')}`,
        }
      : null,
  };
}

const getDiscordClient = () => {
  if (isDiscordPresenceDisabled) return null;
  if (discordClient) return discordClient;

  try {
    const createDiscordRichPresence = require('discord-rich-presence');
    discordClient = createDiscordRichPresence('818936529484906596');

    if (discordClient && typeof discordClient.on === 'function') {
      discordClient.on('error', err => {
        log(`discord rpc error: ${(err && err.message) || err}`);
      });
    }

    return discordClient;
  } catch (err) {
    isDiscordPresenceDisabled = true;
    log(`discord rpc init failed: ${(err && err.message) || err}`);
    return null;
  }
};

const updateDiscordPresence = payload => {
  const client = getDiscordClient();
  if (!client || typeof client.updatePresence !== 'function') return;

  try {
    const result = client.updatePresence(payload);
    if (result && typeof result.catch === 'function') {
      result.catch(err => {
        log(`discord rpc update failed: ${(err && err.message) || err}`);
      });
    }
  } catch (err) {
    log(`discord rpc update failed: ${(err && err.message) || err}`);
  }
};

const exitAsk = (e, win) => {
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
        win = null;
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      }
    })
    .catch(err => {
      log(err);
    });
};

const exitAskWithoutMac = (e, win) => {
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
        win = null;
        //app.quit();
        app.exit(); //exit()直接关闭客户端，不会执行quit();
      }
    })
    .catch(err => {
      log(err);
    });
};

export function initIpcMain(win, store, trayEventEmitter) {
  ipcMain.handle(
    'webdavCredentials:set',
    (event, { sourceKey, credentials }) => {
      if (!sourceKey || !credentials || !credentials.serverUrl) return false;
      const allCredentials = store.get('webdavCredentials') || {};
      store.set('webdavCredentials', {
        ...allCredentials,
        [sourceKey]: encodeCredentials(credentials),
      });
      return true;
    }
  );

  ipcMain.handle('webdavCredentials:get', (event, sourceKey) => {
    const allCredentials = store.get('webdavCredentials') || {};
    return decodeCredentials(allCredentials[sourceKey]);
  });

  ipcMain.handle('webdavCredentials:delete', (event, sourceKey) => {
    if (!sourceKey) return false;
    const allCredentials = { ...(store.get('webdavCredentials') || {}) };
    delete allCredentials[sourceKey];
    store.set('webdavCredentials', allCredentials);
    return true;
  });

  ipcMain.handle('webdavMetadata:read', (event, params) => {
    return parseWebdavAudioMetadata(store, params).catch(error => ({
      error: error.message || String(error),
    }));
  });

  ipcMain.on('close', e => {
    if (isMac) {
      win.hide();
      exitAsk(e, win);
    } else {
      let closeOpt = store.get('settings.closeAppOption');
      if (closeOpt === 'exit') {
        win = null;
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

  ipcMain.on('settings', (event, options) => {
    store.set('settings', options);
    if (options.enableGlobalShortcut) {
      registerGlobalShortcut(win, store);
    } else {
      log('unregister global shortcut');
      globalShortcut.unregisterAll();
    }
  });

  ipcMain.on('playDiscordPresence', (event, track) => {
    updateDiscordPresence({
      details: track.name + ' - ' + track.ar.map(ar => ar.name).join(','),
      state: track.al.name,
      endTimestamp: Date.now() + track.dt,
      largeImageKey: track.al.picUrl,
      largeImageText: 'Listening ' + track.name,
      smallImageKey: 'play',
      smallImageText: 'Playing',
      instance: true,
    });
  });

  ipcMain.on('pauseDiscordPresence', (event, track) => {
    updateDiscordPresence({
      details: track.name + ' - ' + track.ar.map(ar => ar.name).join(','),
      state: track.al.name,
      largeImageKey: track.al.picUrl,
      largeImageText: 'YesPlayMusic',
      smallImageKey: 'pause',
      smallImageText: 'Pause',
      instance: true,
    });
  });

  ipcMain.on('setProxy', (event, config) => {
    const proxyRules = `${config.protocol}://${config.server}:${config.port}`;
    store.set('proxy', proxyRules);
    win.webContents.session.setProxy(
      {
        proxyRules,
      },
      () => {
        log('finished setProxy');
      }
    );
  });

  ipcMain.on('removeProxy', () => {
    log('removeProxy');
    win.webContents.session.setProxy({});
    store.set('proxy', '');
  });

  ipcMain.on('switchGlobalShortcutStatusTemporary', (e, status) => {
    log('switchGlobalShortcutStatusTemporary');
    if (status === 'disable') {
      globalShortcut.unregisterAll();
    } else {
      registerGlobalShortcut(win, store);
    }
  });

  ipcMain.on('updateShortcut', (e, { id, type, shortcut }) => {
    log('updateShortcut');
    let shortcuts = store.get('settings.shortcuts');
    let newShortcut = shortcuts.find(s => s.id === id);
    newShortcut[type] = shortcut;
    store.set('settings.shortcuts', shortcuts);

    createMenu(win, store);
    globalShortcut.unregisterAll();
    registerGlobalShortcut(win, store);
  });

  ipcMain.on('restoreDefaultShortcuts', () => {
    log('restoreDefaultShortcuts');
    store.set('settings.shortcuts', cloneDeep(shortcuts));

    createMenu(win, store);
    globalShortcut.unregisterAll();
    registerGlobalShortcut(win, store);
  });

  if (isCreateTray) {
    ipcMain.on('updateTrayTooltip', (_, title) => {
      trayEventEmitter.emit('updateTooltip', title);
    });
    ipcMain.on('updateTrayPlayState', (_, isPlaying) => {
      trayEventEmitter.emit('updatePlayState', isPlaying);
    });
    ipcMain.on('updateTrayLikeState', (_, isLiked) => {
      trayEventEmitter.emit('updateLikeState', isLiked);
    });
    ipcMain.on('updateTrayIcon', () => {
      trayEventEmitter.emit('updateIcon');
    });
  }
}
