<template>
  <div v-show="show" ref="library">
    <h1>
      <img
        class="avatar"
        :src="$filters.resizeImage(data.user.avatarUrl)"
        loading="lazy"
      />{{ data.user.nickname }}{{ $t('library.sLibrary') }}
    </h1>
    <div class="section-one">
      <div class="liked-songs" @click="goToLikedSongsList">
        <div class="content">
          <div class="title-group">
            <div class="icon"><svg-icon icon-class="heart-solid" /></div>
            <div>
              <div class="title-line">{{ $t('library.likedSongs') }}</div>
              <div class="sub-title">
                {{ liked.songs.length }} {{ $t('common.songs') }}
              </div>
            </div>
          </div>
          <div v-if="pickedLyric.length > 0" class="lyrics-preview">
            <span
              v-for="(line, index) in pickedLyric"
              v-show="line !== ''"
              :key="`${line}${index}`"
            >
              {{ line }}
            </span>
          </div>
        </div>
        <button class="play-btn" @click.stop="playLikedSongs">
          <svg-icon icon-class="play" />
        </button>
      </div>

      <div class="liked-list">
        <div class="list-head">
          <span>我喜欢列表</span>
          <button title="随机刷新" @click="refreshLikedPreviewTracks(true)">
            <svg-icon icon-class="shuffle" />
          </button>
        </div>
        <div v-if="likedPreviewTracks.length > 0" class="tracks">
          <div
            v-for="(track, index) in likedPreviewTracks"
            :key="track.id"
            class="track-item"
            @dblclick="playLikedPreviewTrack(track.id)"
          >
            <span class="track-no">{{ formatTrackNo(index) }}</span>
            <img :src="getTrackCover(track)" loading="lazy" />
            <div class="track-info">
              <div class="track-name">{{ track.name }}</div>
              <div class="track-artist">{{ formatArtists(track) }}</div>
            </div>
            <button class="track-play" @click="playLikedPreviewTrack(track.id)">
              <svg-icon icon-class="play" />
            </button>
          </div>
        </div>
        <div v-else class="placeholder">
          当前喜欢列表还没有歌曲哦，快去添加吧！
        </div>
      </div>
    </div>

    <div class="section-two">
      <div class="tabs-row">
        <div class="tabs">
          <div
            class="tab dropdown"
            :class="{ active: currentTab === 'librarySongs' }"
            @click="openLibrarySongsSortMenu"
          >
            <span class="text">{{
              {
                addedAt: '添加日期',
                lastPlayed: '最近播放',
                playCount: '播放次数',
              }[librarySongsSort]
            }}</span>
            <span class="icon"><svg-icon icon-class="dropdown" /></span>
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'librarySongs' }"
            @click="updateCurrentTab('librarySongs')"
          >
            歌曲
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'playlists' }"
            @click="updateCurrentTab('playlists')"
          >
            {{ $t('library.playlists') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'albums' }"
            @click="updateCurrentTab('albums')"
          >
            {{ $t('library.albums') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'artists' }"
            @click="updateCurrentTab('artists')"
          >
            {{ $t('library.artists') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'playHistory' }"
            @click="updateCurrentTab('playHistory')"
          >
            {{ $t('library.playHistory.title') }}
          </div>
        </div>
        <button
          v-show="currentTab === 'playlists'"
          class="tab-button"
          @click="openAddPlaylistModal"
          ><svg-icon icon-class="plus" />{{ $t('library.newPlayList') }}
        </button>
      </div>

      <div v-show="currentTab === 'playlists'">
        <div v-if="liked.playlists.length > 1">
          <CoverRow
            :items="filterPlaylists"
            type="playlist"
            sub-text="creator"
            :show-play-button="true"
          />
        </div>
      </div>

      <div v-show="currentTab === 'librarySongs'" class="library-songs-tab">
        <TrackList
          :tracks="sortedLibrarySongs"
          :column-number="1"
          type="tracklist"
        />
        <div
          v-if="librarySongs.length === 0 && !librarySongsLoading"
          class="empty"
        >
          暂未读取到歌曲，请检查媒体库扫描或索引状态。
        </div>
        <div ref="librarySongsLoadMoreTrigger" class="load-more">
          <button
            v-if="librarySongsHasMore"
            class="load-more-button"
            :disabled="librarySongsLoading"
            @click="loadLibrarySongs()"
          >
            {{ librarySongsLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>

      <div v-show="currentTab === 'albums'">
        <CoverRow
          :items="liked.albums"
          type="album"
          sub-text="artist"
          :show-play-button="true"
        />
        <div ref="albumsLoadMoreTrigger" class="load-more">
          <button
            v-if="libraryAlbumsHasMore"
            class="load-more-button"
            :disabled="libraryAlbumsLoading"
            @click="loadLibraryAlbums()"
          >
            {{ libraryAlbumsLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>

      <div v-show="currentTab === 'artists'">
        <CoverRow
          :items="liked.artists"
          type="artist"
          :show-play-button="true"
        />
        <div ref="artistsLoadMoreTrigger" class="load-more">
          <button
            v-if="libraryArtistsHasMore"
            class="load-more-button"
            :disabled="libraryArtistsLoading"
            @click="loadLibraryArtists()"
          >
            {{ libraryArtistsLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>

      <div v-show="currentTab === 'playHistory'">
        <button
          :class="{
            'playHistory-button': true,
            'playHistory-button--selected': playHistoryMode === 'week',
          }"
          @click="playHistoryMode = 'week'"
        >
          {{ $t('library.playHistory.week') }}
        </button>
        <button
          :class="{
            'playHistory-button': true,
            'playHistory-button--selected': playHistoryMode === 'all',
          }"
          @click="playHistoryMode = 'all'"
        >
          {{ $t('library.playHistory.all') }}
        </button>
        <TrackList
          :tracks="playHistoryList"
          :column-number="1"
          type="tracklist"
        />
      </div>
    </div>

    <ContextMenu ref="librarySongsSortMenu">
      <div class="item" @click="changeLibrarySongsSort('addedAt')">
        添加日期
      </div>
      <hr />
      <div class="item" @click="changeLibrarySongsSort('lastPlayed')">
        最近播放
      </div>
      <div class="item" @click="changeLibrarySongsSort('playCount')">
        播放次数
      </div>
    </ContextMenu>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapMutations, mapState } from 'vuex';
import { dailyTask } from '@/utils/common';
import { dailyShuffle } from '@/utils/dailyRandom';
import { isAccountLoggedIn } from '@/utils/auth';
import { getLibrarySongs, getLyric, getTrackDetail } from '@/api/track';
import { resizeImageUrl } from '@/utils/image';
import NProgress from 'nprogress';
import locale from '@/locale';

import ContextMenu from '@/components/ContextMenu.vue';
import TrackList from '@/components/TrackList.vue';
import CoverRow from '@/components/CoverRow.vue';
import SvgIcon from '@/components/SvgIcon.vue';
import type { Track, TrackId } from '@/types/music';

type LibrarySongsSort = 'addedAt' | 'lastPlayed' | 'playCount';
type LibraryTab =
  | 'playlists'
  | 'librarySongs'
  | 'albums'
  | 'artists'
  | 'playHistory';
type PlayHistoryMode = 'week' | 'all';
type PagedFetchResult<T = unknown> = {
  data?: T[];
  hasMore?: boolean;
};

type PlaylistLike = {
  id?: TrackId;
  creator?: { userId?: TrackId; nickname?: string };
  [key: string]: unknown;
};

type ContextMenuInstance = {
  openMenu: (e: MouseEvent) => void;
};

function extractLyricPart(rawLyric: string): string {
  return rawLyric.split(']').pop()?.trim() || '';
}

const lyricCreditFieldSuffix = String.raw`(?:[:：/／-]|[A-Za-z][\w .&+/-]*\s*[:：]|$)`;
const lyricCreditLinePatterns = [
  new RegExp(
    `^(?:作词|作曲|词曲|编曲|制作人|制作|监制|出品|发行|企划|统筹|词|曲|OP|SP|A&R)\\s*${lyricCreditFieldSuffix}`,
    'i'
  ),
  new RegExp(
    `^(?:配唱(?:制作人)?|和声(?:编写)?|录音(?:师|室)?|混音(?:师|室)?|母带(?:师|后期)?|人声(?:编辑|录音)?|音频编辑|声音设计|Program(?:ming)?)\\s*${lyricCreditFieldSuffix}`,
    'i'
  ),
  new RegExp(
    `^(?:吉他|贝斯|鼓|键盘|钢琴|弦乐|小提琴|大提琴|合成器|乐器|演奏)\\s*${lyricCreditFieldSuffix}`,
    'i'
  ),
  new RegExp(
    `^(?:producer|composer|lyricist|lyrics?|songwriter|arrang(?:er|ement)|vocals?|backing vocals?|chorus|guitars?|bass|drums?|keyboards?|piano|strings?|violin|cello|synth(?:esizer)?|recording|mix(?:ing)?|master(?:ing)?|engineer|publisher)\\s*${lyricCreditFieldSuffix}`,
    'i'
  ),
  /^(?:produced|presented)\s+by\s+/i,
];

function isSelectableLyricLine(rawLyric: string): boolean {
  const content = extractLyricPart(rawLyric);
  if (!content || content.includes('纯音乐，请欣赏')) return false;

  const normalizedContent = content
    .replace(/^[（(【[]\s*/, '')
    .replace(/\s*[）)】\]]$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return !lyricCreditLinePatterns.some(pattern =>
    pattern.test(normalizedContent)
  );
}

function getTimestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  return 0;
}

function getLibrarySongSortValue(song: Track, sort: LibrarySongsSort): number {
  if (sort === 'playCount') return Number(song.playCount || 0);
  if (sort === 'lastPlayed') return getTimestamp(song.lastPlayed);
  return getTimestamp(song.addedAt || song.created || song.starred);
}

export default defineComponent({
  name: 'Library',
  components: { SvgIcon, CoverRow, TrackList, ContextMenu },
  inject: ['restoreMainScrollPosition', 'scrollMainTo'],
  data() {
    return {
      show: false,
      likedSongs: [] as Track[],
      lyric: undefined as string | undefined,
      likedPreviewTracks: [] as Track[],
      likedPreviewOffset: 0,
      currentTab: 'librarySongs' as LibraryTab,
      librarySongsSort: 'addedAt' as LibrarySongsSort,
      playHistoryMode: 'week' as PlayHistoryMode,
      librarySongs: [] as Track[],
      librarySongsLoading: false,
      librarySongsHasMore: true,
      librarySongsOffset: 0,
      libraryAlbumsLoading: false,
      libraryAlbumsHasMore: true,
      libraryAlbumsOffset: 0,
      libraryArtistsLoading: false,
      libraryArtistsHasMore: true,
      libraryArtistsOffset: 0,
      loadMoreObserver: undefined as IntersectionObserver | undefined,
    };
  },
  computed: {
    ...mapState(['data', 'liked']),
    pickedLyric(): string[] {
      const lyric = this.lyric;
      if (!lyric) return [];

      const lyricLine = lyric
        .split('\n')
        .filter((line: string) => isSelectableLyricLine(line));
      if (lyricLine.length === 0) return [];

      const lyricsToPick = Math.min(lyricLine.length, 1);
      const randomUpperBound = lyricLine.length - lyricsToPick;
      const availableStartIndexes = Array.from(
        { length: randomUpperBound + 1 },
        (_, index) => index
      );
      const startLyricLineIndex =
        dailyShuffle(availableStartIndexes, `library-lyric-line:${lyric}`)[0] ||
        0;

      return lyricLine
        .slice(startLyricLineIndex, startLyricLineIndex + lyricsToPick)
        .map(extractLyricPart);
    },
    filterPlaylists(): PlaylistLike[] {
      return this.liked.playlists.slice(1) as PlaylistLike[];
    },
    sortedLibrarySongs(): Track[] {
      return this.librarySongs
        .map((song, index) => ({ song, index }))
        .sort((a, b) => {
          const diff =
            getLibrarySongSortValue(b.song, this.librarySongsSort) -
            getLibrarySongSortValue(a.song, this.librarySongsSort);
          return diff || a.index - b.index;
        })
        .map(({ song }) => song);
    },
    playHistoryList(): Track[] {
      if (this.show && this.playHistoryMode === 'week') {
        return this.liked.playHistory.weekData;
      }
      if (this.show && this.playHistoryMode === 'all') {
        return this.liked.playHistory.allData;
      }
      return [];
    },
  },
  watch: {
    'data.librarySongsUpdatedAt'() {
      this.loadLibrarySongs(true);
    },
  },
  created() {
    setTimeout(() => {
      if (!this.show) NProgress.start();
    }, 1000);
    this.loadData();
  },
  activated() {
    this.restoreMainScrollPosition();
    this.loadData();
    this.updateLoadMoreObserver();
    dailyTask();
  },
  deactivated() {
    this.loadMoreObserver?.disconnect();
  },
  beforeUnmount() {
    this.loadMoreObserver?.disconnect();
  },
  methods: {
    ...mapActions(['showToast']),
    ...mapMutations(['updateModal']),
    loadData() {
      const loadLikedSongs = this.$store
        .dispatch('fetchLikedSongs')
        .then(() => this.$store.dispatch('fetchLikedSongsWithDetails'))
        .then(() => this.$store.dispatch('fetchLikedPlaylist'));

      if (this.liked.songsWithDetails.length > 0) {
        NProgress.done();
        this.show = true;
        loadLikedSongs.then(() => this.getDailyLyric());
        loadLikedSongs.then(() => this.refreshLikedPreviewTracks());
        this.getDailyLyric();
        this.refreshLikedPreviewTracks();
      } else {
        loadLikedSongs.then(() => {
          NProgress.done();
          this.show = true;
          this.getDailyLyric();
          this.refreshLikedPreviewTracks();
        });
      }
      this.$store.dispatch('fetchPlayHistory');
      if (this.librarySongs.length === 0) {
        this.loadLibrarySongs(true);
      }
    },
    loadLibrarySongs(reset = false) {
      if (this.librarySongsLoading) return;

      const pageSize = 100;
      const nextOffset = reset ? 0 : this.librarySongsOffset;

      if (reset) {
        this.librarySongs = [];
        this.librarySongsHasMore = true;
        this.librarySongsOffset = 0;
      }

      this.librarySongsLoading = true;
      return getLibrarySongs({ offset: nextOffset, limit: pageSize })
        .then(
          ({
            songs = [],
            hasMore = false,
          }: {
            songs?: Track[];
            hasMore?: boolean;
          }) => {
            const existingIds = new Set(this.librarySongs.map(song => song.id));
            const merged = reset ? [] : [...this.librarySongs];
            songs.forEach(song => {
              if (!existingIds.has(song.id)) {
                merged.push(song);
                existingIds.add(song.id);
              }
            });

            this.librarySongs = merged;
            this.librarySongsOffset = merged.length;
            this.librarySongsHasMore = Boolean(hasMore);
          }
        )
        .catch((error: Error) => {
          this.showToast(`读取歌曲失败：${error.message || error}`);
          this.librarySongsHasMore = false;
        })
        .finally(() => {
          this.librarySongsLoading = false;
          this.updateLoadMoreObserver();
        });
    },
    loadLibraryAlbums(reset = false) {
      if (this.libraryAlbumsLoading || (!reset && !this.libraryAlbumsHasMore)) {
        return;
      }

      const pageSize = 50;
      const nextOffset = reset ? 0 : this.libraryAlbumsOffset;
      if (reset) {
        this.libraryAlbumsHasMore = true;
        this.libraryAlbumsOffset = 0;
      }

      this.libraryAlbumsLoading = true;
      return this.$store
        .dispatch('fetchLikedAlbums', {
          limit: pageSize,
          offset: nextOffset,
          reset,
        })
        .then((result: PagedFetchResult) => {
          const count = result?.data?.length || 0;
          this.libraryAlbumsOffset = reset
            ? this.liked.albums.length
            : this.libraryAlbumsOffset + count;
          this.libraryAlbumsHasMore = Boolean(result?.hasMore);
        })
        .catch((error: Error) => {
          this.showToast(`读取专辑失败：${error.message || error}`);
          this.libraryAlbumsHasMore = false;
        })
        .finally(() => {
          this.libraryAlbumsLoading = false;
          this.updateLoadMoreObserver();
        });
    },
    loadLibraryArtists(reset = false) {
      if (
        this.libraryArtistsLoading ||
        (!reset && !this.libraryArtistsHasMore)
      ) {
        return;
      }

      const pageSize = 50;
      const nextOffset = reset ? 0 : this.libraryArtistsOffset;
      if (reset) {
        this.libraryArtistsHasMore = true;
        this.libraryArtistsOffset = 0;
      }

      this.libraryArtistsLoading = true;
      return this.$store
        .dispatch('fetchLikedArtists', {
          limit: pageSize,
          offset: nextOffset,
          reset,
        })
        .then((result: PagedFetchResult) => {
          const count = result?.data?.length || 0;
          this.libraryArtistsOffset = reset
            ? this.liked.artists.length
            : this.libraryArtistsOffset + count;
          this.libraryArtistsHasMore = Boolean(result?.hasMore);
        })
        .catch((error: Error) => {
          this.showToast(`读取艺人失败：${error.message || error}`);
          this.libraryArtistsHasMore = false;
        })
        .finally(() => {
          this.libraryArtistsLoading = false;
          this.updateLoadMoreObserver();
        });
    },
    playLikedSongs() {
      this.$store.state.player.playPlaylistByID(
        this.liked.playlists[0].id,
        'first',
        true
      );
    },
    playLikedPreviewTrack(trackId: TrackId) {
      this.$store.state.player.replacePlaylist(
        this.liked.songs,
        this.data.likedSongPlaylistID || 'starred',
        'playlist',
        trackId
      );
    },
    refreshLikedPreviewTracks(nextPage = false) {
      const likedSongIds = this.liked.songs as TrackId[];
      if (likedSongIds.length === 0) {
        this.likedPreviewTracks = [];
        return;
      }

      const pageSize = 4;
      if (nextPage) {
        this.likedPreviewOffset =
          (this.likedPreviewOffset + pageSize) % likedSongIds.length;
      }

      const shuffledIds = dailyShuffle(
        likedSongIds,
        `library-liked-preview:${this.data.user?.userId || 'local'}`
      );
      if (this.likedPreviewOffset >= shuffledIds.length) {
        this.likedPreviewOffset = 0;
      }

      const ids = shuffledIds.slice(
        this.likedPreviewOffset,
        this.likedPreviewOffset + pageSize
      );

      getTrackDetail(ids.join(',')).then(({ songs }) => {
        this.likedPreviewTracks = songs || [];
      });
    },
    formatArtists(track: Track): string {
      return (track.ar || track.artists || [])
        .map(artist => artist.name)
        .filter(Boolean)
        .join(' / ');
    },
    getTrackCover(track: Track): string {
      return resizeImageUrl(track.al?.picUrl || track.album?.picUrl || '', 96);
    },
    formatTrackNo(index: number | string): number {
      return Number(index) + 1;
    },
    updateCurrentTab(tab: LibraryTab) {
      if (
        !isAccountLoggedIn() &&
        !['playlists', 'librarySongs'].includes(tab)
      ) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.currentTab = tab;
      if (tab === 'librarySongs' && this.librarySongs.length === 0) {
        this.loadLibrarySongs(true);
      } else if (tab === 'albums' && this.liked.albums.length === 0) {
        this.loadLibraryAlbums(true);
      } else if (tab === 'artists' && this.liked.artists.length === 0) {
        this.loadLibraryArtists(true);
      }
      this.scrollMainTo({ top: 375, behavior: 'smooth' });
      this.updateLoadMoreObserver();
    },
    goToLikedSongsList() {
      this.$router.push({ path: '/library/liked-songs' });
    },
    getDailyLyric() {
      if (this.liked.songs.length === 0) return;
      const likedSongIds = this.liked.songs as TrackId[];
      const dailySongId = dailyShuffle(
        likedSongIds,
        `library-lyric-song:${this.data.user?.userId || 'local'}`
      )[0];
      if (!dailySongId) return;

      getLyric(dailySongId).then(data => {
        if (data.lrc !== undefined) {
          const isInstrumental = data.lrc.lyric
            .split('\n')
            .filter((l: string) => l.includes('纯音乐，请欣赏'));
          if (isInstrumental.length === 0) {
            this.lyric = data.lrc.lyric;
          }
        }
      });
    },
    openAddPlaylistModal() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.updateModal({
        modalName: 'newPlaylistModal',
        key: 'show',
        value: true,
      });
    },
    openLibrarySongsSortMenu(e: MouseEvent) {
      (
        this.$refs.librarySongsSortMenu as ContextMenuInstance | undefined
      )?.openMenu(e);
    },
    changeLibrarySongsSort(type: LibrarySongsSort) {
      this.librarySongsSort = type;
      this.currentTab = 'librarySongs';
      window.scrollTo({ top: 375, behavior: 'smooth' });
      this.updateLoadMoreObserver();
    },
    updateLoadMoreObserver() {
      this.$nextTick(() => {
        this.loadMoreObserver?.disconnect();

        let target: Element | undefined;
        if (this.currentTab === 'librarySongs' && this.librarySongsHasMore) {
          target = this.$refs.librarySongsLoadMoreTrigger as
            | Element
            | undefined;
        } else if (this.currentTab === 'albums' && this.libraryAlbumsHasMore) {
          target = this.$refs.albumsLoadMoreTrigger as Element | undefined;
        } else if (
          this.currentTab === 'artists' &&
          this.libraryArtistsHasMore
        ) {
          target = this.$refs.artistsLoadMoreTrigger as Element | undefined;
        }

        if (!target) return;

        this.loadMoreObserver = new IntersectionObserver(
          entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            if (this.currentTab === 'librarySongs') {
              this.loadLibrarySongs();
            } else if (this.currentTab === 'albums') {
              this.loadLibraryAlbums();
            } else if (this.currentTab === 'artists') {
              this.loadLibraryArtists();
            }
          },
          { rootMargin: '240px 0px' }
        );
        this.loadMoreObserver.observe(target);
      });
    },
  },
});
</script>

<style lang="scss" scoped>
h1 {
  font-size: 42px;
  color: var(--color-text);
  display: flex;
  align-items: center;
  .avatar {
    height: 44px;
    margin-right: 12px;
    vertical-align: -7px;
    border-radius: 50%;
    border: rgba(0, 0, 0, 0.2);
  }
}

.section-one {
  display: grid;
  grid-template-columns: minmax(240px, 0.78fr) minmax(360px, 1.22fr);
  gap: 18px;
  align-items: stretch;
  margin-top: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.liked-songs {
  position: relative;
  min-height: 164px;
  cursor: pointer;
  border-radius: 14px;
  overflow: hidden;
  background: var(--color-primary-bg);
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

  .sub-title {
    margin-top: 5px;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0.68;
  }

  .lyrics-preview {
    position: absolute;
    left: 22px;
    right: 72px;
    bottom: 75px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
    color: var(--color-primary);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.45;
    opacity: 0.82;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
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

[data-theme='dark'] .liked-songs {
  background: linear-gradient(135deg, #2a3150 0%, #202846 100%);
  border-color: rgba(126, 160, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);

  .content {
    color: #f3f6ff;
  }

  .icon,
  .play-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #82a3ff;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .lyrics-preview {
    color: #8ba8ff;
  }

  .play-btn:hover {
    background: rgba(255, 255, 255, 0.14);
  }
}

.liked-list {
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
      width: 30px;
      height: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 999px;
      background: var(--color-primary-bg);
      color: var(--color-primary);
      transition: 0.2s;

      .svg-icon {
        width: 14px;
        height: 14px;
      }

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

.section-two {
  margin-top: 54px;
  min-height: calc(100vh - 182px);
}

.library-songs-tab .empty {
  margin-top: 18px;
  color: var(--color-text);
  opacity: 0.68;
}

.load-more {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.load-more-button {
  padding: 8px 14px;
  border-radius: 8px;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  font-weight: 600;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.tabs-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  font-size: 18px;
  color: var(--color-text);
  .tab {
    font-weight: 600;
    padding: 8px 14px;
    margin-right: 14px;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
    transition: 0.2s;
    opacity: 0.68;
    &:hover {
      opacity: 0.88;
      background-color: var(--color-secondary-bg);
    }
  }
  .tab.active {
    opacity: 0.88;
    background-color: var(--color-secondary-bg);
  }
  .tab.dropdown {
    display: flex;
    align-items: center;
    padding: 0;
    overflow: hidden;
    .text {
      padding: 8px 3px 8px 14px;
    }
    .icon {
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 8px 0 3px;
      .svg-icon {
        height: 16px;
        width: 16px;
      }
    }
  }
}

button.tab-button {
  color: var(--color-text);
  border-radius: 8px;
  padding: 0 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.2s;
  opacity: 0.68;
  font-weight: 500;
  .svg-icon {
    width: 14px;
    height: 14px;
    margin-right: 8px;
  }
  &:hover {
    opacity: 1;
    background: var(--color-secondary-bg);
  }
  &:active {
    opacity: 1;
    transform: scale(0.92);
  }
}

button.playHistory-button {
  color: var(--color-text);
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 12px;
  margin-right: 4px;
  transition: 0.2s;
  opacity: 0.68;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    opacity: 1;
    background: var(--color-secondary-bg);
  }
  &:active {
    transform: scale(0.95);
  }
}

button.playHistory-button--selected {
  color: var(--color-text);
  background: var(--color-secondary-bg);
  opacity: 1;
  font-weight: 700;
  &:active {
    transform: none;
  }
}
</style>
