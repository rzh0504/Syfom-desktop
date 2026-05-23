<template>
  <div>
    <transition name="fade">
      <div
        v-show="show"
        id="scrollbar"
        :class="{ 'on-drag': isOnDrag }"
        @click="handleClick"
      >
        <div
          id="thumbContainer"
          :class="{ active }"
          :style="thumbStyle"
          @mouseenter="handleMouseenter"
          @mouseleave="handleMouseleave"
          @mousedown="handleDragStart"
          @click.stop
        >
          <div></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';

type ScrollPosition = {
  scrollTop: number;
  params: RouteLocationNormalized['params'];
};

type ParentInstance = {
  userSelectNone?: boolean;
  $refs: {
    main?: HTMLElement;
  };
};

export default defineComponent({
  name: 'Scrollbar',
  data() {
    return {
      top: 0,
      thumbHeight: 0,
      active: false,
      show: false,
      hideTimer: null as ReturnType<typeof setTimeout> | null,
      isOnDrag: false,
      onDragClientY: 0,
      positions: {
        home: { scrollTop: 0, params: {} },
      } as Record<string, ScrollPosition>,
    };
  },
  computed: {
    thumbStyle(): Record<string, string> {
      return {
        transform: `translateY(${this.top}px)`,
        height: `${this.thumbHeight}px`,
      };
    },
    main(): HTMLElement | undefined {
      return (this.$parent as ParentInstance | undefined)?.$refs.main;
    },
  },

  created() {
    this.$router.beforeEach((_to, _from, next: NavigationGuardNext) => {
      this.show = false;
      next();
    });
  },

  methods: {
    handleScroll(): void {
      if (!this.main) return;
      const clintHeight = this.main.clientHeight - 128;
      const scrollHeight = this.main.scrollHeight - 128;
      const scrollTop = this.main.scrollTop;
      let top = ~~((scrollTop / scrollHeight) * clintHeight);
      let thumbHeight = ~~((clintHeight / scrollHeight) * clintHeight);

      if (thumbHeight < 24) thumbHeight = 24;
      if (top > clintHeight - thumbHeight) {
        top = clintHeight - thumbHeight;
      }
      this.top = top;
      this.thumbHeight = thumbHeight;

      if (!this.show && clintHeight !== thumbHeight) this.show = true;
      this.setScrollbarHideTimeout();

      const route = this.$route;
      if (route.meta.savePosition) {
        this.positions[String(route.name)] = {
          scrollTop,
          params: route.params,
        };
      }
    },
    handleMouseenter(): void {
      this.active = true;
    },
    handleMouseleave(): void {
      this.active = false;
      this.setScrollbarHideTimeout();
    },
    handleDragStart(e: MouseEvent): void {
      this.onDragClientY = e.clientY;
      this.isOnDrag = true;
      const parent = this.$parent as ParentInstance | undefined;
      if (parent) parent.userSelectNone = true;
      document.addEventListener('mousemove', this.handleDragMove);
      document.addEventListener('mouseup', this.handleDragEnd);
    },
    handleDragMove(e: MouseEvent): void {
      if (!this.isOnDrag) return;
      if (!this.main) return;
      const clintHeight = this.main.clientHeight - 128;
      const scrollHeight = this.main.scrollHeight - 128;
      const clientY = e.clientY;
      const scrollTop = this.main.scrollTop;
      const offset = ~~(
        ((clientY - this.onDragClientY) / clintHeight) *
        scrollHeight
      );
      this.top = ~~((scrollTop / scrollHeight) * clintHeight);
      this.main.scrollBy(0, offset);
      this.onDragClientY = clientY;
    },
    handleDragEnd(): void {
      this.isOnDrag = false;
      const parent = this.$parent as ParentInstance | undefined;
      if (parent) parent.userSelectNone = false;
      document.removeEventListener('mousemove', this.handleDragMove);
      document.removeEventListener('mouseup', this.handleDragEnd);
    },
    handleClick(e: MouseEvent): void {
      if (!this.main) return;
      let scrollTop;
      if (e.clientY < this.top + 84) {
        scrollTop = -256;
      } else {
        scrollTop = 256;
      }
      this.main.scrollBy({
        top: scrollTop,
        behavior: 'smooth',
      });
    },
    setScrollbarHideTimeout(): void {
      if (this.hideTimer !== null) clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        if (!this.active) this.show = false;
        this.hideTimer = null;
      }, 4000);
    },
    restorePosition(): void {
      const route = this.$route;
      const routeName = String(route.name);
      if (
        !route.meta.savePosition ||
        this.positions[routeName] === undefined ||
        this.main === undefined
      ) {
        return;
      }
      this.main.scrollTo({ top: this.positions[routeName].scrollTop });
    },
  },
});
</script>

<style lang="scss" scoped>
#scrollbar {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 16px;
  z-index: 1000;

  #thumbContainer {
    margin-top: 64px;
    div {
      transition: background 0.4s;
      position: absolute;
      right: 2px;
      width: 8px;
      height: 100%;
      border-radius: 4px;
      background: rgba(128, 128, 128, 0.38);
    }
  }
  #thumbContainer.active div {
    background: rgba(128, 128, 128, 0.58);
  }
}

[data-theme='dark'] {
  #thumbContainer div {
    background: var(--color-secondary-bg);
  }
}

#scrollbar.on-drag {
  left: 0;
  width: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
