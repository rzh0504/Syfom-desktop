import store from '@/store';

const player = store.state.player;

export function ipcRenderer(vueInstance) {
  const self = vueInstance;
  const electronAPI = window.electronAPI;
  // 添加专有的类名
  document.body.setAttribute('data-electron', 'yes');
  document.body.setAttribute('data-electron-os', electronAPI?.platform || '');

  // listens to the main process 'changeRouteTo' event and changes the route from
  // inside this Vue instance, according to what path the main process requires.
  // responds to Menu click() events at the main process and changes the route accordingly.

  electronAPI?.on('changeRouteTo', path => {
    self.$router.push(path);
    if (store.state.showLyrics) {
      store.commit('toggleLyrics');
    }
  });

  electronAPI?.on('search', () => {
    // 触发数据响应
    self.$refs.navbar.$refs.searchInput.focus();
    self.$refs.navbar.inputFocus = true;
  });

  electronAPI?.on('play', () => {
    player.playOrPause();
  });

  electronAPI?.on('next', () => {
    if (player.isPersonalFM) {
      player.playNextFMTrack();
    } else {
      player.playNextTrack();
    }
  });

  electronAPI?.on('previous', () => {
    player.playPrevTrack();
  });

  electronAPI?.on('increaseVolume', () => {
    if (player.volume + 0.1 >= 1) {
      return (player.volume = 1);
    }
    player.volume += 0.1;
  });

  electronAPI?.on('decreaseVolume', () => {
    if (player.volume - 0.1 <= 0) {
      return (player.volume = 0);
    }
    player.volume -= 0.1;
  });

  electronAPI?.on('like', () => {
    store.dispatch('likeATrack', player.currentTrack.id);
  });

  electronAPI?.on('repeat', () => {
    player.switchRepeatMode();
  });

  electronAPI?.on('shuffle', () => {
    player.switchShuffle();
  });

  electronAPI?.on('routerGo', where => {
    self.$refs.navbar.go(where);
  });

  electronAPI?.on('nextUp', () => {
    self.$refs.player.goToNextTracksPage();
  });

  electronAPI?.on('rememberCloseAppOption', value => {
    store.commit('updateSettings', {
      key: 'closeAppOption',
      value,
    });
  });

  electronAPI?.on('setPosition', position => {
    player._howler.seek(position);
  });
}
