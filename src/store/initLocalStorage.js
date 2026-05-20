import shortcuts from '@/utils/shortcuts';

console.debug('[debug][initLocalStorage.js]');

let localStorage = {
  player: {},
  settings: {
    lang: null,
    appearance: 'auto',
    musicQuality: '320000',
    lyricFontSize: 28,
    outputDevice: 'default',
    automaticallyCacheSongs: true,
    cacheLimit: 8192,
    enableReversedMode: false,
    nyancatStyle: false,
    showLyricsTranslation: true,
    lyricsBackground: true,
    enableOsdlyricsSupport: false,
    closeAppOption: 'ask',
    enableDiscordRichPresence: false,
    enableGlobalShortcut: true,
    showLibraryDefault: false,
    subTitleDefault: false,
    linuxEnableCustomTitlebar: false,
    trayIconTheme: 'auto',
    proxyConfig: {
      protocol: 'noProxy',
      server: '',
      port: null,
    },
    shortcuts: shortcuts,
  },
  data: {
    user: {},
    likedSongPlaylistID: 0,
    lastRefreshCookieDate: 0,
    loginMode: null,
    activeProvider: 'navidrome',
    localLikedSongIds: [],
    localPlayHistory: [],
    sources: {
      navidrome: {
        key: 'navidrome',
        name: 'Navidrome',
        provider: 'navidrome',
        enabled: true,
      },
    },
  },
};

if (process.env.IS_ELECTRON === true) {
  localStorage.settings.automaticallyCacheSongs = true;
}

export default localStorage;
