<template>
  <div id="app" :class="{ 'user-select-none': userSelectNone }">
    <Scrollbar v-show="!showLyrics" ref="scrollbar" />
    <Navbar v-show="showNavbar" ref="navbar" />
    <main
      ref="main"
      :style="{ overflow: enableScrolling ? 'auto' : 'hidden' }"
      @scroll="handleScroll"
    >
      <router-view v-slot="{ Component, route }">
        <keep-alive :include="keepAliveRouteNames">
          <component :is="Component" :key="route.fullPath" />
        </keep-alive>
      </router-view>
    </main>
    <transition name="slide-up">
      <Player v-if="enablePlayer" v-show="showPlayer" ref="player" />
    </transition>
    <Toast />
    <ModalAddTrackToPlaylist v-if="isAccountLoggedIn" />
    <ModalNewPlaylist v-if="isAccountLoggedIn" />
    <transition v-if="enablePlayer" name="slide-up">
      <Lyrics v-show="showLyrics" />
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ModalAddTrackToPlaylist from './components/ModalAddTrackToPlaylist.vue';
import ModalNewPlaylist from './components/ModalNewPlaylist.vue';
import Scrollbar from './components/Scrollbar.vue';
import Navbar from './components/Navbar.vue';
import Player from './components/Player.vue';
import Toast from './components/Toast.vue';
import { ipcRenderer } from './electron/ipcRenderer';
import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import Lyrics from './views/lyrics.vue';

type ScrollbarInstance = {
  handleScroll: () => void;
  restorePosition: () => void;
};

type PlayerLike = {
  enabled?: boolean;
  playOrPause: () => void;
};

export default defineComponent({
  name: 'App',
  components: {
    Navbar,
    Player,
    Toast,
    ModalAddTrackToPlaylist,
    ModalNewPlaylist,
    Lyrics,
    Scrollbar,
  },
  provide() {
    return {
      restoreMainScrollPosition: () =>
        (
          this.$refs.scrollbar as ScrollbarInstance | undefined
        )?.restorePosition(),
      scrollMainTo: (...args: Parameters<HTMLElement['scrollTo']>) =>
        (this.$refs.main as HTMLElement | undefined)?.scrollTo(...args),
    };
  },
  data() {
    return {
      isElectron: process.env.IS_ELECTRON, // true || undefined
      userSelectNone: false,
      keepAliveRouteNames: [
        'Home',
        'Artist',
        'Next',
        'Search',
        'Library',
        'HomeCatalog',
      ],
    };
  },
  computed: {
    showLyrics(): boolean {
      return this.$store.state.showLyrics as boolean;
    },
    player(): PlayerLike {
      return this.$store.state.player as PlayerLike;
    },
    enableScrolling(): boolean {
      return this.$store.state.enableScrolling as boolean;
    },
    isAccountLoggedIn(): boolean {
      return isAccountLoggedIn();
    },
    showPlayer(): boolean {
      return ['login', 'loginAccount'].includes(this.$route.name) === false;
    },
    enablePlayer(): boolean {
      return this.player.enabled;
    },
    showNavbar(): boolean {
      return true;
    },
  },
  created() {
    if (this.isElectron) ipcRenderer(this);
    window.addEventListener('keydown', this.handleKeydown);
    this.fetchData();
  },
  methods: {
    handleKeydown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return false;
        if (this.$route.name === 'mv') return false;
        e.preventDefault();
        this.player.playOrPause();
      }
    },
    fetchData(): void {
      if (!isLooseLoggedIn()) return;
      this.$store
        .dispatch('fetchLikedSongs')
        .then(() => this.$store.dispatch('fetchLikedSongsWithDetails'))
        .then(() => this.$store.dispatch('fetchLikedPlaylist'));
      if (isAccountLoggedIn()) {
        this.$store.dispatch('fetchLikedAlbums');
        this.$store.dispatch('fetchLikedArtists');
      }
    },
    handleScroll(): void {
      (this.$refs.scrollbar as ScrollbarInstance | undefined)?.handleScroll();
    },
  },
});
</script>

<style lang="scss">
#app {
  width: 100%;
  transition: all 0.4s;
}

main {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
  overflow: auto;
  padding: 64px 10vw 96px 10vw;
  box-sizing: border-box;
  scrollbar-width: none; // firefox
}

@media (max-width: 1336px) {
  main {
    padding: 64px 5vw 96px 5vw;
  }
}

main::-webkit-scrollbar {
  width: 0px;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.4s;
}
.slide-up-enter,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
