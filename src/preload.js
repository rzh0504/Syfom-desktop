const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

const sendChannels = new Set([
  'close',
  'maximizeOrUnmaximize',
  'metadata',
  'minimize',
  'nativeAlert',
  'player',
  'playerCurrentTrackTime',
  'removeProxy',
  'restoreDefaultShortcuts',
  'seeked',
  'sendLyrics',
  'setProxy',
  'settings',
  'switchGlobalShortcutStatusTemporary',
  'switchRepeatMode',
  'switchShuffle',
  'updateShortcut',
  'updateTrayIcon',
  'updateTrayLikeState',
  'updateTrayPlayState',
  'updateTrayTooltip',
]);

const onChannels = new Set([
  'changeRouteTo',
  'decreaseVolume',
  'increaseVolume',
  'isMaximized',
  'like',
  'next',
  'nextUp',
  'play',
  'previous',
  'rememberCloseAppOption',
  'repeat',
  'routerGo',
  'saveLyricFinished',
  'search',
  'setPosition',
  'shuffle',
]);

contextBridge.exposeInMainWorld('electronAPI', {
  platform: os.platform(),
  send(channel, ...args) {
    if (sendChannels.has(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  on(channel, callback) {
    if (!onChannels.has(channel)) return undefined;
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
