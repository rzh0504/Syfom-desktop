<template>
  <div v-show="show">
    <h1>
      <img
        class="avatar"
        :src="resizeImage(artist.img1v1Url || '', 1024)"
        loading="lazy"
      />{{ artist.name }}'s Music Videos
    </h1>
    <MvRow :mvs="mvs" subtitle="publishTime" />
    <div class="load-more">
      <ButtonTwoTone v-show="hasMore" color="grey" @click="loadMVs">{{
        $t('explore.loadMore')
      }}</ButtonTwoTone>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { artistMv, getArtist } from '@/api/artist';
import NProgress from 'nprogress';
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { resizeImage } from '@/utils/filters';

import ButtonTwoTone from '@/components/ButtonTwoTone.vue';
import MvRow from '@/components/MvRow.vue';

type Artist = {
  img1v1Url?: string;
  name?: string;
};

type MvItem = Record<string, any>;

function routeId(route: RouteLocationNormalized): string | number {
  const id = route.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export default defineComponent({
  name: 'ArtistMV',
  components: {
    MvRow,
    ButtonTwoTone,
  },
  beforeRouteUpdate(
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) {
    this.id = routeId(to);
    this.loadData();
    next();
  },
  data() {
    return {
      id: 0 as string | number,
      show: false,
      hasMore: true,
      artist: {} as Artist,
      mvs: [] as MvItem[],
    };
  },
  created() {
    this.id = routeId(this.$route);
    this.loadData();
  },
  activated() {
    if (routeId(this.$route) !== this.id) {
      this.id = routeId(this.$route);
      this.mvs = [];
      this.artist = {};
      this.show = false;
      this.hasMore = true;
      this.loadData();
    }
  },
  methods: {
    resizeImage,
    loadData(): void {
      setTimeout(() => {
        if (!this.show) NProgress.start();
      }, 1000);
      getArtist(this.id).then(data => {
        this.artist = data.artist;
      });
      this.loadMVs();
    },
    loadMVs(): void {
      artistMv({ id: this.id, limit: 100, offset: this.mvs.length }).then(
        data => {
          this.mvs.push(...data.mvs);
          this.hasMore = data.hasMore;
          NProgress.done();
          this.show = true;
        }
      );
    },
  },
});
</script>

<style lang="scss" scoped>
h1 {
  font-size: 42px;
  color: var(--color-text);
  .avatar {
    height: 44px;
    margin-right: 12px;
    vertical-align: -7px;
    border-radius: 50%;
    border: rgba(0, 0, 0, 0.2);
  }
}
.load-more {
  display: flex;
  justify-content: center;
}
</style>
