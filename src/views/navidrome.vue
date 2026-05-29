<template>
  <div class="navidrome-page">
    <div class="container">
      <div class="toolbar">
        <div>
          <div class="eyebrow">服务器管理</div>
          <div class="summary">
            已配置 {{ sources.length }} 个，启用 {{ enabledCount }} 个
          </div>
        </div>
        <button class="primary" @click="addSource">
          <svg-icon icon-class="plus" />新增服务器
        </button>
      </div>

      <div v-if="sources.length > 0" class="server-list">
        <div v-for="source in sources" :key="source.key" class="server-card">
          <div class="server-main">
            <div class="server-icon">ND</div>
            <div class="server-info">
              <div class="server-name">
                {{ source.name || 'Navidrome' }}
                <span v-if="source.key === 'navidrome'" class="badge"
                  >默认</span
                >
              </div>
              <div class="server-meta">
                <span>{{ source.username || '未登录' }}</span>
                <span>{{ source.serverUrl || '未设置服务器地址' }}</span>
              </div>
            </div>
          </div>

          <div class="server-actions">
            <label class="switch">
              <input
                type="checkbox"
                :checked="source.enabled !== false"
                @change="toggleSource(source)"
              />
              <span></span>
            </label>
            <button @click="editSource(source)">编辑</button>
            <button
              :disabled="
                refreshingKey === source.key || source.enabled === false
              "
              @click="refreshSource(source)"
            >
              {{ refreshingKey === source.key ? '刷新中...' : '刷新媒体库' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-card">
        <div>
          <h3>尚未连接服务器</h3>
          <p>添加 Navidrome / OpenSubsonic 服务器后即可聚合首页与资料库。</p>
        </div>
        <button class="primary" @click="addSource">新增服务器</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapMutations, mapState } from 'vuex';
import { getProvider } from '@/providers';

type SourceState = {
  key: string;
  name?: string;
  provider?: string;
  enabled?: boolean;
  serverUrl?: string;
  username?: string;
};

type DataState = {
  sources?: Record<string, SourceState>;
};

export default defineComponent({
  name: 'Navidrome',
  data() {
    return {
      refreshingKey: '',
    };
  },
  computed: {
    ...mapState(['data']),
    sources(): SourceState[] {
      const data = this.data as DataState;
      return Object.values(data.sources || {})
        .filter(
          source =>
            source.provider === 'navidrome' || source.key === 'navidrome'
        )
        .sort((a, b) =>
          a.key === 'navidrome' ? -1 : b.key === 'navidrome' ? 1 : 0
        );
    },
    enabledCount(): number {
      return this.sources.filter(source => source.enabled !== false).length;
    },
  },
  methods: {
    ...mapActions(['showToast']),
    ...mapMutations(['updateData', 'upsertSource']),
    addSource() {
      this.$router.push({ name: 'loginAccount' });
    },
    editSource(source: SourceState) {
      this.$router.push({
        path: '/login/account',
        query: {
          source: source.key,
          edit: '1',
        },
      });
    },
    toggleSource(source: SourceState) {
      this.upsertSource({
        ...source,
        enabled: source.enabled === false,
      });
      this.updateData({ key: 'librarySongsUpdatedAt', value: Date.now() });
    },
    async refreshSource(source: SourceState) {
      if (this.refreshingKey) return;
      const provider = getProvider('navidrome');
      if (!provider?.refreshLibrary) {
        this.showToast('Navidrome 不支持刷新媒体库');
        return;
      }

      this.refreshingKey = source.key;
      try {
        const result = await provider.refreshLibrary(source.key);
        this.updateData({ key: 'librarySongsUpdatedAt', value: Date.now() });
        const count =
          (result as { audio?: number; count?: number })?.audio ??
          result?.count;
        this.showToast(
          count !== undefined
            ? `已刷新媒体库，读取 ${count} 首歌曲`
            : '已开始刷新媒体库'
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.showToast(`刷新媒体库失败：${message}`);
      } finally {
        this.refreshingKey = '';
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.navidrome-page {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.container {
  margin-top: 48px;
  width: 860px;
}

.toolbar,
.server-card,
.empty-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text);
}

.toolbar {
  margin-bottom: 18px;
}

.eyebrow {
  font-size: 24px;
  font-weight: 700;
}

.summary,
.server-meta,
p {
  opacity: 0.68;
}

.summary {
  margin-top: 4px;
  font-size: 14px;
}

.server-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.server-card,
.empty-card {
  background: var(--color-secondary-bg);
  border-radius: 16px;
  padding: 16px 20px;
}

.server-main,
.server-actions,
.server-meta {
  display: flex;
  align-items: center;
}

.server-icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--color-button-primary-bg);
  color: var(--color-button-primary);
  font-weight: 800;
  margin-right: 14px;
}

.server-name {
  font-size: 18px;
  font-weight: 700;
}

.badge {
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 6px;
  color: var(--color-button-primary);
  background: var(--color-button-primary-bg);
  font-size: 12px;
}

.server-meta {
  gap: 12px;
  margin-top: 5px;
  font-size: 13px;
}

.server-actions {
  gap: 10px;
}

button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text);
  background: var(--color-body-bg);
  padding: 8px 12px;
  font-weight: 600;
  border-radius: 8px;
  transition: 0.2s;
  .svg-icon {
    width: 16px;
    height: 16px;
  }
  &:hover {
    transform: scale(1.04);
  }
  &:active {
    transform: scale(0.96);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
    transform: none;
  }
}

button.primary {
  color: var(--color-button-primary);
  background: var(--color-button-primary-bg);
}

.switch {
  position: relative;
  width: 52px;
  height: 32px;
  input {
    opacity: 0;
    position: absolute;
  }
  span {
    display: block;
    width: 52px;
    height: 32px;
    border-radius: 8px;
    background: var(--color-body-bg);
    transition: 0.2s;
    &:after {
      content: '';
      display: block;
      width: 20px;
      height: 20px;
      transform: translate(6px, 6px);
      border-radius: 6px;
      background: #fff;
      transition: 0.2s;
    }
  }
  input:checked + span {
    background: var(--color-switch-active-bg);
    &:after {
      transform: translate(26px, 6px);
    }
  }
}

h3,
p {
  margin: 0;
}

h3 {
  margin-bottom: 8px;
}
</style>
