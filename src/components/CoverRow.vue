<template>
  <div class="cover-row" :style="rowStyles">
    <div
      v-for="item in items"
      :key="item.id"
      class="item"
      :class="{ artist: type === 'artist' }"
    >
      <Cover
        :id="item.id"
        :image-url="getImageUrl(item)"
        :type="type"
        :play-button-size="type === 'artist' ? 26 : playButtonSize"
      />
      <div class="text">
        <div v-if="showPlayCount" class="info">
          <span class="play-count"
            ><svg-icon icon-class="play" />{{
              formatPlayCount(item.playCount || 0)
            }}
          </span>
        </div>
        <div class="title" :style="{ fontSize: subTextFontSize }">
          <span v-if="isExplicit(item)" class="explicit-symbol"
            ><ExplicitSymbol
          /></span>
          <span v-if="isPrivacy(item)" class="lock-icon">
            <svg-icon icon-class="lock"
          /></span>
          <router-link :to="getTitleLink(item)">{{ item.name }}</router-link>
        </div>
        <div v-if="type !== 'artist' && subText !== 'none'" class="info">
          <router-link
            v-if="subText === 'artist' && getSubTextArtist(item)"
            :to="`/artist/${getSubTextArtist(item).id}`"
            >{{ getSubTextArtist(item).name }}</router-link
          >
          <span v-else>{{ getSubText(item) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import Cover from '@/components/Cover.vue';
import ExplicitSymbol from '@/components/ExplicitSymbol.vue';
import { resizeImageUrl } from '@/utils/image';
import { formatPlayCount } from '@/utils/filters';

type Artist = {
  id: string | number;
  name: string;
};

type CoverRowItem = {
  id: string | number;
  name: string;
  playCount?: number;
  copywriter?: string;
  description?: string;
  updateFrequency?: string;
  creator?: { nickname: string };
  publishTime?: string | number | Date;
  type?: string;
  size?: number;
  artist?: Artist;
  artists?: Artist[];
  privacy?: number;
  mark?: number;
  img1v1Url?: string;
  picUrl?: string;
  coverImgUrl?: string;
};

export default defineComponent({
  name: 'CoverRow',
  components: {
    Cover,
    ExplicitSymbol,
  },
  props: {
    items: { type: Array as PropType<CoverRowItem[]>, required: true },
    type: { type: String, required: true },
    subText: { type: String, default: 'none' },
    subTextFontSize: { type: String, default: '16px' },
    showPlayCount: { type: Boolean, default: false },
    columnNumber: { type: Number, default: 5 },
    gap: { type: String, default: '44px 24px' },
    playButtonSize: { type: Number, default: 22 },
  },
  computed: {
    rowStyles(): Record<string, string> {
      return {
        'grid-template-columns': `repeat(${this.columnNumber}, 1fr)`,
        gap: this.gap,
      };
    },
  },
  methods: {
    formatPlayCount,
    getSubText(item: CoverRowItem): string | number | undefined {
      if (this.subText === 'copywriter') return item.copywriter;
      if (this.subText === 'description') return item.description;
      if (this.subText === 'updateFrequency') return item.updateFrequency;
      if (this.subText === 'creator') return 'by ' + item.creator?.nickname;
      if (this.subText === 'releaseYear')
        return new Date(item.publishTime).getFullYear();
      if (this.subText === 'artist') {
        return this.getSubTextArtist(item)?.name;
      }
      if (this.subText === 'albumType+releaseYear') {
        let albumType = item.type;
        if (item.type === 'EP/Single') {
          albumType = item.size === 1 ? 'Single' : 'EP';
        } else if (item.type === 'Single') {
          albumType = 'Single';
        } else if (item.type === '专辑') {
          albumType = 'Album';
        }
        return `${albumType} · ${new Date(item.publishTime).getFullYear()}`;
      }
      if (this.subText === 'appleMusic') return 'by Apple Music';
    },
    getSubTextArtist(item: CoverRowItem): Artist | undefined {
      if (item.artist !== undefined) return item.artist;
      if (item.artists !== undefined) return item.artists[0];
      return undefined;
    },
    isPrivacy(item: CoverRowItem): boolean {
      return this.type === 'playlist' && item.privacy === 10;
    },
    isExplicit(item: CoverRowItem): boolean {
      return this.type === 'album' && ((item.mark || 0) & 1048576) === 1048576;
    },
    getTitleLink(item: CoverRowItem): string {
      return `/${this.type}/${item.id}`;
    },
    getImageUrl(item: CoverRowItem): string {
      if (item.img1v1Url) {
        const img1v1Parts = item.img1v1Url.split('/');
        const img1v1ID = img1v1Parts[img1v1Parts.length - 1];
        if (img1v1ID === '5639395138885805.jpg') {
          return '/img/logos/yesplaymusic.png';
        }
      }
      let img = item.img1v1Url || item.picUrl || item.coverImgUrl;
      if (!img) return '/img/logos/yesplaymusic.png';
      return resizeImageUrl(img, 512);
    },
  },
});
</script>

<style lang="scss" scoped>
.cover-row {
  display: grid;
}

.item {
  color: var(--color-text);
  .text {
    margin-top: 8px;
    .title {
      font-size: 16px;
      font-weight: 600;
      line-height: 20px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-all;
    }
    .info {
      font-size: 12px;
      opacity: 0.68;
      line-height: 18px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-word;
    }
  }
}

.item.artist {
  display: flex;
  flex-direction: column;
  text-align: center;
  .cover {
    display: flex;
  }
  .title {
    margin-top: 4px;
  }
}

@media (max-width: 834px) {
  .item .text .title {
    font-size: 14px;
  }
}

.explicit-symbol {
  opacity: 0.28;
  color: var(--color-text);
  float: right;
  .svg-icon {
    margin-bottom: -3px;
  }
}

.lock-icon {
  opacity: 0.28;
  color: var(--color-text);
  margin-right: 4px;
  // float: right;
  .svg-icon {
    height: 12px;
    width: 12px;
  }
}

.play-count {
  font-weight: 600;
  opacity: 0.58;
  color: var(--color-text);
  font-size: 12px;
  .svg-icon {
    margin-right: 3px;
    height: 8px;
    width: 8px;
  }
}
</style>
