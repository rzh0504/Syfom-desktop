<!-- eslint-disable prettier/prettier -->
<template>
  <div v-show="show" class="home-catalog">
    <div class="header-row">
      <button class="back-button" @click="goBackHome">
        <svg-icon icon-class="arrow-left" /> 返回首页
      </button>
      <h1>{{ catalog.title }}</h1>
    </div>

    <div class="sub-title">{{ catalog.description }}</div>

    <div v-if="items.length > 0" class="section">
      <CoverRow
        :type="catalog.itemType"
        :items="items"
        :sub-text="catalog.subText"
        :column-number="catalog.columnNumber"
      />
    </div>
    <div v-else class="empty">暂无数据</div>

    <div class="load-more">
      <button v-if="hasMore" :disabled="loading" @click="loadCatalog(false)">
        {{ loading ? '加载中...' : '加载更多' }}
      </button>
    </div>
  </div>
</template>

<script>
import NProgress from 'nprogress';
import { homeAlbumsByType, homeAllArtists } from '@/api/others';
import CoverRow from '@/components/CoverRow.vue';
import SvgIcon from '@/components/SvgIcon.vue';
import { dailyShuffle } from '@/utils/dailyRandom';

const CATALOG_MAP = {
  'newest-albums': {
    title: '最近添加专辑',
    description: '按服务器最新入库顺序展示',
    itemType: 'album',
    subText: 'artist',
    columnNumber: 5,
    albumType: 'newest',
  },
  'recent-albums': {
    title: '最近播放专辑',
    description: '按服务器最近播放记录展示',
    itemType: 'album',
    subText: 'artist',
    columnNumber: 5,
    albumType: 'recent',
  },
  'random-albums': {
    title: '随机专辑',
    description: '从服务器专辑库随机挑选',
    itemType: 'album',
    subText: 'artist',
    columnNumber: 5,
    albumType: 'random',
  },
  'frequent-albums': {
    title: '最常播放专辑',
    description: '按服务器统计频次排序（当前阶段可近似视作随机）',
    itemType: 'album',
    subText: 'artist',
    columnNumber: 5,
    albumType: 'frequent',
  },
  'random-artists': {
    title: '随机艺术家',
    description: '从服务器艺人库中随机浏览',
    itemType: 'artist',
    subText: 'none',
    columnNumber: 6,
    albumType: null,
  },
};

export default {
  name: 'HomeCatalog',
  components: { CoverRow, SvgIcon },
  inject: ['restoreMainScrollPosition'],
  data() {
    return {
      show: false,
      loading: false,
      hasMore: true,
      pageSize: 18,
      offset: 0,
      items: [],
      allArtists: [],
    };
  },
  computed: {
    catalog() {
      return (
        CATALOG_MAP[this.$route.params.kind] || CATALOG_MAP['random-albums']
      );
    },
    isArtistCatalog() {
      return this.catalog.itemType === 'artist';
    },
  },
  watch: {
    '$route.params.kind'() {
      this.loadCatalog(true);
    },
  },
  activated() {
    this.loadCatalog(true);
    this.restoreMainScrollPosition();
  },
  methods: {
    loadCatalog(reset = true) {
      if (this.loading) return;
      this.loading = true;

      if (reset) {
        this.items = [];
        this.offset = 0;
        this.hasMore = true;
        this.allArtists = [];
        this.show = false;
        setTimeout(() => {
          if (!this.show) NProgress.start();
        }, 300);
      }

      const loader = this.isArtistCatalog
        ? this.loadArtistCatalog(reset)
        : this.loadAlbumCatalog();

      loader
        .catch(() => {
          this.hasMore = false;
        })
        .finally(() => {
          this.loading = false;
          this.show = true;
          NProgress.done();
        });
    },
    loadAlbumCatalog() {
      return homeAlbumsByType({
        type: this.catalog.albumType,
        limit: this.pageSize,
        offset: this.offset,
      }).then(({ albums = [], hasMore = false }) => {
        const existing = new Set(this.items.map(item => String(item.id)));
        const merged = [...this.items];
        albums.forEach(album => {
          const id = String(album.id);
          if (!existing.has(id)) {
            merged.push(album);
            existing.add(id);
          }
        });

        this.items = merged;
        this.offset = merged.length;
        this.hasMore = Boolean(hasMore);
      });
    },
    loadArtistCatalog(reset = true) {
      const loadArtists =
        this.allArtists.length === 0
          ? homeAllArtists().then(({ artists = [] }) => {
              this.allArtists = dailyShuffle(
                artists,
                'home-catalog-random-artists'
              );
            })
          : Promise.resolve();

      return loadArtists.then(() => {
        const start = reset ? 0 : this.offset;
        const nextItems = this.allArtists.slice(start, start + this.pageSize);
        this.items = reset ? nextItems : [...this.items, ...nextItems];
        this.offset = this.items.length;
        this.hasMore = this.offset < this.allArtists.length;
      });
    },
    goBackHome() {
      this.$router.push({ name: 'home' });
    },
  },
};
</script>

<style lang="scss" scoped>
.home-catalog {
  min-height: calc(100vh - 200px);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28px;

  h1 {
    margin: 0;
    font-size: 36px;
    color: var(--color-text);
  }
}

.back-button {
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0.72;
  transition: 0.2s;

  .svg-icon {
    width: 16px;
    height: 16px;
  }

  &:hover {
    opacity: 1;
    background: var(--color-secondary-bg);
  }

  &:active {
    transform: scale(0.96);
  }
}

.sub-title {
  margin-top: 8px;
  color: var(--color-text);
  opacity: 0.68;
  font-size: 14px;
}

.section {
  margin-top: 26px;
}

.empty {
  margin-top: 24px;
  color: var(--color-text);
  opacity: 0.66;
}

.load-more {
  margin-top: 24px;
  display: flex;
  justify-content: center;

  button {
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
}
</style>
