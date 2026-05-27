<template>
  <div class="track-list">
    <ContextMenu ref="menu">
      <div class="item-info">
        <img
          :src="$filters.resizeImage(rightClickedTrackComputed.al.picUrl, 224)"
          loading="lazy"
        />
        <div class="info">
          <div class="title">{{ rightClickedTrackComputed.name }}</div>
          <div class="subtitle">{{ rightClickedTrackComputed.ar[0].name }}</div>
        </div>
      </div>
      <hr />
      <div class="item" @click="play">{{ $t('contextMenu.play') }}</div>
      <div class="item" @click="addToQueue">{{
        $t('contextMenu.addToQueue')
      }}</div>
      <div
        v-if="extraContextMenuItem.includes('removeTrackFromQueue')"
        class="item"
        @click="removeTrackFromQueue"
        >从队列删除</div
      >
      <hr />
      <div v-show="!isRightClickedTrackLiked" class="item" @click="like">
        {{ $t('contextMenu.saveToMyLikedSongs') }}
      </div>
      <div v-show="isRightClickedTrackLiked" class="item" @click="like">
        {{ $t('contextMenu.removeFromMyLikedSongs') }}
      </div>
      <div
        v-if="extraContextMenuItem.includes('removeTrackFromPlaylist')"
        class="item"
        @click="removeTrackFromPlaylist"
        >从歌单中删除</div
      >
      <div class="item" @click="addTrackToPlaylist">{{
        $t('contextMenu.addToPlaylist')
      }}</div>
    </ContextMenu>

    <div :style="listStyles">
      <TrackListItem
        v-for="(track, index) in tracks"
        :key="itemKey === 'id' ? track.id : `${String(track.id)}${index}`"
        :track-prop="track"
        :track-no="Number(index) + 1"
        :highlight-playing-track="highlightPlayingTrack"
        @dblclick="playThisList(track.id || track.songId)"
        @click.right="openMenu($event, track, index)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapActions, mapMutations, mapState } from 'vuex';
import { addOrRemoveTrackFromPlaylist } from '@/api/playlist';
import { isAccountLoggedIn } from '@/utils/auth';

import TrackListItem from '@/components/TrackListItem.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import locale from '@/locale';
import type { TrackId, TrackListTrack } from '@/types/music';

type ContextMenuInstance = {
  openMenu: (e: MouseEvent) => void;
};

type TrackListParent = {
  removeTrack?: (trackId: TrackId | undefined) => void;
};

const emptyTrack: TrackListTrack = {
  id: 0,
  name: '',
  ar: [{ name: '' }],
  al: { picUrl: '' },
};

export default defineComponent({
  name: 'TrackList',
  components: {
    TrackListItem,
    ContextMenu,
  },
  props: {
    tracks: {
      type: Array as PropType<TrackListTrack[]>,
      default: () => {
        return [];
      },
    },
    type: {
      type: String,
      default: 'tracklist',
    }, // tracklist | album | playlist
    id: {
      type: [Number, String] as PropType<TrackId>,
      default: 0,
    },
    dbclickTrackFunc: {
      type: String,
      default: 'default',
    },
    albumObject: {
      type: Object,
      default: () => {
        return {
          artist: {
            name: '',
          },
        };
      },
    },
    extraContextMenuItem: {
      type: Array as PropType<string[]>,
      default: () => {
        return [
          // 'removeTrackFromPlaylist'
          // 'removeTrackFromQueue'
        ];
      },
    },
    columnNumber: {
      type: Number,
      default: 4,
    },
    highlightPlayingTrack: {
      type: Boolean,
      default: true,
    },
    itemKey: {
      type: String,
      default: 'id',
    },
  },
  data() {
    return {
      rightClickedTrack: {
        ...emptyTrack,
      } as TrackListTrack,
      rightClickedTrackIndex: -1,
      listStyles: {} as Record<string, string>,
    };
  },
  computed: {
    ...mapState(['liked', 'player']),
    isRightClickedTrackLiked() {
      return this.liked.songs.some(
        id => String(id) === String(this.rightClickedTrack?.id)
      );
    },
    rightClickedTrackComputed() {
      return this.rightClickedTrack;
    },
  },
  created() {
    if (this.type === 'tracklist') {
      this.listStyles = {
        display: 'grid',
        gap: '4px',
        gridTemplateColumns: `repeat(${this.columnNumber}, 1fr)`,
      };
    }
  },
  methods: {
    ...mapMutations(['updateModal']),
    ...mapActions(['nextTrack', 'showToast', 'likeATrack']),
    openMenu(e: MouseEvent, track: TrackListTrack, index = -1) {
      this.rightClickedTrack = track;
      this.rightClickedTrackIndex = index;
      (this.$refs.menu as ContextMenuInstance | undefined)?.openMenu(e);
    },
    closeMenu() {
      this.rightClickedTrack = { ...emptyTrack };
      this.rightClickedTrackIndex = -1;
    },
    playThisList(trackID: TrackId | undefined) {
      if (this.dbclickTrackFunc === 'default') {
        this.playThisListDefault(trackID);
      } else if (this.dbclickTrackFunc === 'none') {
        // do nothing
      } else if (this.dbclickTrackFunc === 'playTrackOnListByID') {
        this.player.playTrackOnListByID(trackID);
      } else if (this.dbclickTrackFunc === 'playPlaylistByID') {
        this.player.playPlaylistByID(this.id, trackID);
      } else if (this.dbclickTrackFunc === 'playAList') {
        const trackIDs = this.tracks.map(t => t.id || t.songId);
        this.player.replacePlaylist(trackIDs, this.id, 'artist', trackID);
      } else if (this.dbclickTrackFunc === 'dailyTracks') {
        const trackIDs = this.tracks.map(t => t.id);
        this.player.replacePlaylist(trackIDs, '/daily/songs', 'url', trackID);
      }
    },
    playThisListDefault(trackID: TrackId | undefined) {
      if (this.type === 'playlist') {
        this.player.playPlaylistByID(this.id, trackID);
      } else if (this.type === 'album') {
        this.player.playAlbumByID(this.id, trackID);
      } else if (this.type === 'tracklist') {
        const trackIDs = this.tracks.map(t => t.id);
        this.player.replacePlaylist(trackIDs, this.id, 'artist', trackID);
      }
    },
    play() {
      this.player.addTrackToPlayNext(this.rightClickedTrack.id, true);
    },
    addToQueue() {
      this.player.addTrackToPlayNext(this.rightClickedTrack.id);
    },
    like() {
      this.likeATrack(this.rightClickedTrack.id);
    },
    addTrackToPlaylist() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'show',
        value: true,
      });
      this.updateModal({
        modalName: 'addTrackToPlaylistModal',
        key: 'selectedTrackID',
        value: this.rightClickedTrack.id,
      });
    },
    removeTrackFromPlaylist() {
      if (!isAccountLoggedIn()) {
        this.showToast(locale.t('toast.needToLogin'));
        return;
      }
      if (confirm(`确定要从歌单删除 ${this.rightClickedTrack.name}？`)) {
        const trackID = this.rightClickedTrack.id;
        addOrRemoveTrackFromPlaylist({
          op: 'del',
          pid: this.id,
          tracks: trackID,
        }).then(data => {
          this.showToast(
            data.body.code === 200
              ? locale.t('toast.removedFromPlaylist')
              : data.body.message
          );
          (this.$parent as TrackListParent | undefined)?.removeTrack?.(trackID);
        });
      }
    },
    removeTrackFromQueue() {
      this.$store.state.player.removeTrackFromQueue(
        this.rightClickedTrackIndex
      );
    },
  },
});
</script>

<style lang="scss" scoped></style>
