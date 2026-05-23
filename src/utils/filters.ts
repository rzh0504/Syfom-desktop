import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import locale from '@/locale';
import { resizeImageUrl } from '@/utils/image';

type AppLocale = 'zh-CN' | 'zh-TW' | string;

function getLocale(): AppLocale {
  return locale.global.locale.value;
}

export function formatTime(
  Milliseconds: number,
  format: 'HH:MM:SS' | 'Human' = 'HH:MM:SS'
): string {
  if (!Milliseconds) return '';
  dayjs.extend(duration);
  dayjs.extend(relativeTime);

  let time = dayjs.duration(Milliseconds);
  let hours = time.hours().toString();
  let mins = time.minutes().toString();
  let seconds = time.seconds().toString().padStart(2, '0');

  if (format === 'HH:MM:SS') {
    return hours !== '0'
      ? `${hours}:${mins.padStart(2, '0')}:${seconds}`
      : `${mins}:${seconds}`;
  } else if (format === 'Human') {
    let hoursUnit, minitesUnit;
    switch (getLocale()) {
      case 'zh-CN':
        hoursUnit = '小时';
        minitesUnit = '分钟';
        break;
      case 'zh-TW':
        hoursUnit = '小時';
        minitesUnit = '分鐘';
        break;
      default:
        hoursUnit = 'hr';
        minitesUnit = 'min';
        break;
    }
    return hours !== '0'
      ? `${hours} ${hoursUnit} ${mins} ${minitesUnit}`
      : `${mins} ${minitesUnit}`;
  }
}

export function formatDate(
  timestamp: string | number | Date,
  format = 'MMM D, YYYY'
): string {
  if (!timestamp) return '';
  if (getLocale() === 'zh-CN') format = 'YYYY年MM月DD日';
  else if (getLocale() === 'zh-TW') format = 'YYYY年MM月DD日';
  return dayjs(timestamp).format(format);
}

export function formatAlbumType(
  type: string,
  album: { size?: number }
): string {
  if (!type) return '';
  if (type === 'EP/Single') {
    return album.size === 1 ? 'Single' : 'EP';
  } else if (type === 'Single') {
    return 'Single';
  } else if (type === '专辑') {
    return 'Album';
  } else {
    return type;
  }
}

export function resizeImage(imgUrl: string, size = 512): string {
  return resizeImageUrl(imgUrl, size);
}

export function formatPlayCount(count: number): string | number {
  if (!count) return '';
  if (getLocale() === 'zh-CN') {
    if (count > 100000000) {
      return `${Math.floor((count / 100000000) * 100) / 100}亿`; // 2.32 亿
    }
    if (count > 100000) {
      return `${Math.floor((count / 10000) * 10) / 10}万`; // 232.1 万
    }
    if (count > 10000) {
      return `${Math.floor((count / 10000) * 100) / 100}万`; // 2.3 万
    }
    return count;
  } else if (getLocale() === 'zh-TW') {
    if (count > 100000000) {
      return `${Math.floor((count / 100000000) * 100) / 100}億`; // 2.32 億
    }
    if (count > 100000) {
      return `${Math.floor((count / 10000) * 10) / 10}萬`; // 232.1 萬
    }
    if (count > 10000) {
      return `${Math.floor((count / 10000) * 100) / 100}萬`; // 2.3 萬
    }
    return count;
  } else {
    if (count > 10000000) {
      return `${Math.floor((count / 1000000) * 10) / 10}M`; // 233.2M
    }
    if (count > 1000000) {
      return `${Math.floor((count / 1000000) * 100) / 100}M`; // 2.3M
    }
    if (count > 1000) {
      return `${Math.floor((count / 1000) * 100) / 100}K`; // 233.23K
    }
    return count;
  }
}

export function toHttps(url: string): string {
  if (!url) return '';
  return url.replace(/^http:/, 'https:');
}

export const filters = {
  formatTime,
  formatDate,
  formatAlbumType,
  resizeImage,
  formatPlayCount,
  toHttps,
};

export default {
  install(app: { config: { globalProperties: Record<string, unknown> } }) {
    app.config.globalProperties.$filters = filters;
  },
};
