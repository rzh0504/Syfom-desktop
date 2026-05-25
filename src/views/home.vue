<template>
  <div v-show="show" class="home">
    <div v-if="!isLooseLoggedIn" class="empty-state first-row">
      <h2>欢迎使用</h2>
      <p>请先登录你的 Navidrome 服务器，然后即可搜索与播放你的音乐库。</p>
      <router-link class="login-link" to="/login">立即登录</router-link>
    </div>

    <template v-if="isLooseLoggedIn">
      <div class="first-row today-recommend-section">
        <div class="today-recommend" @click="playTodayRecommend()">
          <div class="content">
            <div class="title-group">
              <div class="icon"><svg-icon icon-class="fm" /></div>
              <div>
                <div class="title-line">今日推荐</div>
              </div>
            </div>
          </div>
          <button class="play-btn" @click.stop="playTodayRecommend()">
            <svg-icon icon-class="play" />
          </button>
        </div>

        <div class="recommend-list">
          <div class="list-head">
            <span>推荐列表</span>
            <button @click="playTodayRecommend()">播放全部</button>
          </div>
          <div v-if="recommendPreviewTracks.length > 0" class="tracks">
            <div
              v-for="(track, index) in recommendPreviewTracks"
              :key="track.id"
              class="track-item"
              @dblclick="playTodayRecommend(track.id)"
            >
              <span class="track-no">{{ index + 1 }}</span>
              <img :src="getTrackCover(track)" loading="lazy" />
              <div class="track-info">
                <div class="track-name">{{ track.name }}</div>
                <div class="track-artist">{{ formatArtists(track) }}</div>
              </div>
              <button class="track-play" @click="playTodayRecommend(track.id)">
                <svg-icon icon-class="play" />
              </button>
            </div>
          </div>
          <div v-else class="placeholder">暂无推荐</div>
        </div>
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
import { resizeImageUrl } from '@/utils/image';
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
    recommendPreviewTracks(): Track[] {
      return this.todayRecommendTracks.slice(0, 6);
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
    playTodayRecommend(trackId?: TrackId): void {
      if (this.todayRecommendTracks.length === 0) return;
      const trackIDs = this.todayRecommendTracks.map(track => track.id);
      const currentTrackID = trackId || trackIDs[0];
      const player = this.$store.state.player as PlayerLike;
      player.replacePlaylist(trackIDs, '/', 'url', currentTrackID);
    },
    formatArtists(track: Track): string {
      return (track.ar || []).map(artist => artist.name).join(' / ');
    },
    getTrackCover(track: Track): string {
      return resizeImageUrl(track.al?.picUrl || track.album?.picUrl || '', 96);
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

.today-recommend-section {
  display: grid;
  grid-template-columns: minmax(240px, 0.78fr) minmax(360px, 1.22fr);
  gap: 18px;
  align-items: stretch;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.today-recommend {
  position: relative;
  min-height: 164px;
  border-radius: 14px;
  overflow: hidden;
  background: var(--color-primary-bg);
  cursor: pointer;
  border: 1px solid var(--color-secondary-bg);

  .content {
    position: relative;
    z-index: 1;
    height: 100%;
    padding: 22px;
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  .title-group {
    display: flex;
    align-items: flex-start;
  }

  .icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    background: var(--color-secondary-bg);
    color: var(--color-primary);
    margin-right: 12px;
    .svg-icon {
      width: 20px;
      height: 20px;
    }
  }

  .title-line {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .sub {
    margin-top: 5px;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0.68;
  }

  .daily-lyric {
    position: absolute;
    left: 22px;
    right: 72px;
    bottom: 22px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
    opacity: 0.82;
  }

  .play-btn {
    position: absolute;
    right: 18px;
    bottom: 18px;
    z-index: 1;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: var(--color-primary);
    background: var(--color-secondary-bg);
    border: 1px solid rgba(0, 0, 0, 0.04);
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
      transform: translateY(-1px);
    }
    &:active {
      transform: scale(0.95);
    }
  }
}

.recommend-list {
  min-height: 164px;
  padding: 16px;
  border-radius: 14px;
  background: var(--color-secondary-bg);
  color: var(--color-text);

  .list-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 18px;
    font-weight: 700;

    button {
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--color-primary-bg);
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 600;
      transition: 0.2s;

      &:hover {
        transform: translateY(-1px);
      }
    }
  }

  .tracks {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 12px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  .track-item {
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 7px;
    border-radius: 10px;
    transition: 0.2s;

    &:hover {
      background: var(--color-primary-bg);

      .track-play {
        opacity: 1;
      }
    }

    img {
      width: 36px;
      height: 36px;
      margin-right: 10px;
      border-radius: 7px;
      object-fit: cover;
    }
  }

  .track-no {
    width: 20px;
    margin-right: 8px;
    text-align: center;
    font-size: 12px;
    opacity: 0.46;
    font-variant-numeric: tabular-nums;
  }

  .track-info {
    flex: 1;
    min-width: 0;
  }

  .track-name,
  .track-artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track-name {
    font-size: 14px;
    font-weight: 600;
  }

  .track-artist {
    margin-top: 2px;
    font-size: 12px;
    opacity: 0.6;
  }

  .track-play {
    width: 30px;
    height: 30px;
    margin-left: 8px;
    border-radius: 50%;
    color: var(--color-primary);
    opacity: 0;
    transition: 0.2s;

    .svg-icon {
      width: 12px;
      height: 12px;
      margin-left: 2px;
    }

    @media (max-width: 900px) {
      opacity: 1;
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
