import shortcuts from '@/utils/shortcuts';
import cloneDeep from 'lodash/cloneDeep';

export default {
  updateLikedXXX(state, { name, data }) {
    state.liked[name] = data;
    if (name === 'songs') {
      state.player.sendSelfToIpcMain();
    }
  },
  changeLang(state, lang) {
    state.settings.lang = lang;
  },
  changeMusicQuality(state, value) {
    state.settings.musicQuality = value;
  },
  changeLyricFontSize(state, value) {
    state.settings.lyricFontSize = value;
  },
  changeOutputDevice(state, deviceId) {
    state.settings.outputDevice = deviceId;
  },
  updateSettings(state, { key, value }) {
    state.settings[key] = value;
  },
  updateData(state, { key, value }) {
    state.data[key] = value;
  },
  setActiveProvider(state, provider) {
    state.data.activeProvider = provider;
  },
  upsertSource(state, source) {
    const sources = state.data.sources || {};
    state.data.sources = {
      ...sources,
      [source.key]: {
        ...(sources[source.key] || {}),
        ...source,
      },
    };
  },
  removeSource(state, key) {
    const sources = { ...(state.data.sources || {}) };
    delete sources[key];
    state.data.sources = sources;
    if (state.data.activeProvider === key) {
      state.data.activeProvider = 'navidrome';
    }
  },
  togglePlaylistCategory(state, name) {
    const index = state.settings.enabledPlaylistCategories.findIndex(
      c => c === name
    );
    if (index !== -1) {
      state.settings.enabledPlaylistCategories =
        state.settings.enabledPlaylistCategories.filter(c => c !== name);
    } else {
      state.settings.enabledPlaylistCategories.push(name);
    }
  },
  updateToast(state, toast) {
    state.toast = toast;
  },
  updateModal(state, { modalName, key, value }) {
    state.modals[modalName][key] = value;
    if (key === 'show') {
      // 100ms的延迟是为等待右键菜单blur之后再disableScrolling
      value === true
        ? setTimeout(() => (state.enableScrolling = false), 100)
        : (state.enableScrolling = true);
    }
  },
  toggleLyrics(state) {
    state.showLyrics = !state.showLyrics;
  },
  updateDailyTracks(state, dailyTracks) {
    state.dailyTracks = dailyTracks;
  },
  updateLastfm(state, session) {
    state.lastfm = session;
  },
  updateShortcut(state, { id, type, shortcut }) {
    let newShortcut = state.settings.shortcuts.find(s => s.id === id);
    newShortcut[type] = shortcut;
    state.settings.shortcuts = state.settings.shortcuts.map(s => {
      if (s.id !== id) return s;
      return newShortcut;
    });
  },
  restoreDefaultShortcuts(state) {
    state.settings.shortcuts = cloneDeep(shortcuts);
  },
  enableScrolling(state, status = null) {
    state.enableScrolling = status ? status : !state.enableScrolling;
  },
  updateTitle(state, title) {
    state.title = title;
  },
};
