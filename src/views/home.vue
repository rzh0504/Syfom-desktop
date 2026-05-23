<template>
  <div v-show="show" class="home">
    <div v-if="!isLooseLoggedIn" class="empty-state first-row">
      <h2>欢迎使用</h2>
      <p>请先登录你的 Navidrome 服务器，然后即可搜索与播放你的音乐库。</p>
      <router-link class="login-link" to="/login">立即登录</router-link>
    </div>

    <template v-if="isLooseLoggedIn">
      <div class="first-row today-recommend" @click="playTodayRecommend">
        <img
          v-if="todayCoverUrl"
          :src="todayCoverUrl"
          class="bg"
          loading="lazy"
        />
        <div class="mask"></div>
        <div class="content">
          <div class="icon"><svg-icon icon-class="fm" /></div>
          <div class="title-line">今日推荐</div>
          <div class="sub">随机播放服务器音乐，快速开始今天的听歌旅程</div>
        </div>
        <button class="play-btn" @click.stop="playTodayRecommend">
          <svg-icon icon-class="play" />
        </button>
      </div>

      <div class="index-row">
        <div class="title">
          <span>最近添加专辑</span>
          <a @click.prevent="goToCatalog('newest-albums')">查看全部</a>
        </div>
        <CoverRow
          v-if="newestAlbums.length > 0"
          type="album"
          :items="newestAlbums"
          sub-text="artist"
        />
        <div v-else class="placeholder">暂无数据</div>
      </div>

      <div class="index-row">
        <div class="title">
          <span>最近播放专辑</span>
          <a @click.prevent="goToCatalog('recent-albums')">查看全部</a>
        </div>
        <CoverRow
          v-if="recentAlbums.length > 0"
          type="album"
          :items="recentAlbums"
          sub-text="artist"
        />
        <div v-else class="placeholder">暂无数据</div>
      </div>

      <div class="index-row">
        <div class="title">
          <span>随机艺术家</span>
          <a @click.prevent="goToCatalog('random-artists')">查看全部</a>
        </div>
        <CoverRow
          v-if="randomArtists.length > 0"
          type="artist"
          :column-number="6"
          :items="randomArtists"
        />
        <div v-else class="placeholder">暂无数据</div>
      </div>

      <div class="index-row">
        <div class="title">
          <span>随机专辑</span>
          <a @click.prevent="goToCatalog('random-albums')">查看全部</a>
        </div>
        <CoverRow
          v-if="randomAlbums.length > 0"
          type="album"
          :items="randomAlbums"
          sub-text="artist"
        />
        <div v-else class="placeholder">暂无数据</div>
      </div>

      <div class="index-row">
        <div class="title">
          <span>最常播放专辑</span>
          <a @click.prevent="goToCatalog('frequent-albums')">查看全部</a>
        </div>
        <CoverRow
          v-if="frequentAlbums.length > 0"
          type="album"
          :items="frequentAlbums"
          sub-text="artist"
        />
        <div v-else class="placeholder">暂无数据</div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import NProgress from 'nprogress';
import { isLooseLoggedIn as checkLooseLoggedIn } from '@/utils/auth';
import { dailyShuffle } from '@/utils/dailyRandom';
import {
  homeAlbumsByType,
  homeAllArtists,
  homeRecommendTracks,
} from '@/api/others';
import CoverRow from '@/components/CoverRow.vue';
import SvgIcon from '@/components/SvgIcon.vue';
import type { Track, TrackId } from '@/types/music';

type CatalogKind =
  | 'newest-albums'
  | 'recent-albums'
  | 'random-artists'
  | 'random-albums'
  | 'frequent-albums';

type CoverItem = {
  id: TrackId;
  name: string;
  [key: string]: any;
};

type DataState = {
  loginMode?: string;
  user?: { userId?: TrackId };
};

type PlayerLike = {
  replacePlaylist: (
    trackIDs: TrackId[],
    source: string,
    sourceType: string,
    currentTrackID: TrackId
  ) => void;
};

function appendSizeParam(imageUrl = '', size = 1024): string {
  if (!imageUrl) return '';
  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}param=${size}y${size}`;
}

export default defineComponent({
  name: 'Home',
  components: { CoverRow, SvgIcon },
  inject: {
    restoreMainScrollPosition: {
      default: () => {},
    },
  },
  data() {
    return {
      show: false,
      todayRecommendTracks: [] as Track[],
      newestAlbums: [] as CoverItem[],
      recentAlbums: [] as CoverItem[],
      randomArtists: [] as CoverItem[],
      randomAlbums: [] as CoverItem[],
      frequentAlbums: [] as CoverItem[],
    };
  },
  computed: {
    data(): DataState {
      return this.$store.state.data as DataState;
    },
    isLooseLoggedIn(): boolean {
      const loginMode = this.data?.loginMode;
      const userId = this.data?.user?.userId;
      void loginMode;
      void userId;
      return checkLooseLoggedIn();
    },
    todayCoverUrl(): string {
      const cover = this.todayRecommendTracks[0]?.al?.picUrl;
      return appendSizeParam(cover, 1024);
    },
  },
  activated() {
    this.loadData();
    (this.restoreMainScrollPosition as () => void)();
  },
  methods: {
    loadData(): void {
      setTimeout(() => {
        if (!this.show) NProgress.start();
      }, 1000);

      if (!this.isLooseLoggedIn) {
        NProgress.done();
        this.show = true;
        return;
      }

      Promise.all([
        homeRecommendTracks(24).then(({ songs }) => {
          this.todayRecommendTracks = songs || [];
        }),
        homeAlbumsByType({ type: 'newest', limit: 10, offset: 0 }).then(
          ({ albums }) => {
            this.newestAlbums = albums || [];
          }
        ),
        homeAlbumsByType({ type: 'recent', limit: 10, offset: 0 }).then(
          ({ albums }) => {
            this.recentAlbums = albums || [];
          }
        ),
        homeAlbumsByType({ type: 'random', limit: 10, offset: 0 }).then(
          ({ albums }) => {
            this.randomAlbums = albums || [];
          }
        ),
        homeAlbumsByType({ type: 'frequent', limit: 10, offset: 0 }).then(
          ({ albums }) => {
            this.frequentAlbums = albums || [];
          }
        ),
        homeAllArtists().then(({ artists }) => {
          this.randomArtists = dailyShuffle(
            artists || [],
            'home-random-artists'
          ).slice(0, 12);
        }),
      ]).finally(() => {
        NProgress.done();
        this.show = true;
      });
    },
    playTodayRecommend(): void {
      if (this.todayRecommendTracks.length === 0) return;
      const trackIDs = this.todayRecommendTracks.map(track => track.id);
      const player = this.$store.state.player as PlayerLike;
      player.replacePlaylist(
        trackIDs,
        '/home/today-recommend',
        'url',
        trackIDs[0]
      );
    },
    goToCatalog(kind: CatalogKind): void {
      this.$router.push({ name: 'homeCatalog', params: { kind } });
    },
  },
});
</script>

<style lang="scss" scoped>
.index-row {
  margin-top: 54px;
}

.first-row {
  margin-top: 32px;
}

.title {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  a {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    opacity: 0.68;
    transition: 0.2s;
    &:hover {
      opacity: 0.92;
    }
  }
}

.today-recommend {
  position: relative;
  height: 212px;
  border-radius: 14px;
  overflow: hidden;
  background: var(--color-primary-bg);
  cursor: pointer;
  border: 1px solid var(--color-secondary-bg);

  .bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.92);
  }

  .mask {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.55),
      rgba(0, 0, 0, 0.16)
    );
  }

  .content {
    position: relative;
    z-index: 1;
    height: 100%;
    width: min(480px, 80%);
    padding: 28px;
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .icon {
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.14);
    margin-bottom: 14px;
    .svg-icon {
      width: 20px;
      height: 20px;
    }
  }

  .title-line {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .sub {
    margin-top: 8px;
    font-size: 14px;
    opacity: 0.88;
  }

  .play-btn {
    position: absolute;
    right: 24px;
    bottom: 24px;
    z-index: 1;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    color: #fff;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.24);
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.2s;
    .svg-icon {
      width: 16px;
      height: 16px;
      margin-left: 2px;
    }
    &:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    &:active {
      transform: scale(0.95);
    }
  }
}

.placeholder {
  color: var(--color-text);
  opacity: 0.6;
  font-size: 14px;
  margin-top: -8px;
}

.empty-state {
  margin-top: 48px;
  padding: 32px;
  border-radius: 16px;
  background: var(--color-secondary-bg);
  color: var(--color-text);
  h2 {
    margin: 0 0 12px;
  }
  p {
    opacity: 0.78;
    margin: 0 0 16px;
  }
  .login-link {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 8px;
    background: var(--color-primary-bg);
    color: var(--color-primary);
    font-weight: 600;
  }
}
</style>
