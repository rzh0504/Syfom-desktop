import { isAccountLoggedIn } from './auth';
import dayjs from 'dayjs';
import store from '@/store';

type TrackLike = {
  id?: string | number;
  sort?: number;
  playable?: boolean;
  reason?: string;
  privilege?: Record<string, unknown>;
};

type TitleParts = {
  title: string;
  subtitle: string;
};

export function isTrackPlayable(track?: TrackLike): {
  playable: boolean;
  reason: string;
} {
  return {
    playable: track?.playable !== false,
    reason: track?.reason || '',
  };
}

export function mapTrackPlayableStatus<T extends TrackLike>(
  tracks: T[],
  privileges?: TrackLike[]
): T[];
export function mapTrackPlayableStatus<T>(
  tracks: T,
  privileges?: TrackLike[]
): T;
export function mapTrackPlayableStatus(
  tracks: TrackLike[] | unknown,
  privileges: TrackLike[] = []
) {
  if (!Array.isArray(tracks)) return tracks;
  return tracks.map(t => {
    const privilege = privileges.find(item => item.id === t.id) || {};
    if (t.privilege) {
      Object.assign(t.privilege, privilege);
    } else {
      t.privilege = privilege;
    }
    let result = isTrackPlayable(t);
    t.playable = result.playable;
    t.reason = result.reason;
    return t;
  });
}

export function randomNum(minNum: number, maxNum?: number): number {
  switch (arguments.length) {
    case 1:
      return parseInt(String(Math.random() * minNum + 1), 10);
    case 2:
      return parseInt(
        String(Math.random() * ((maxNum ?? minNum) - minNum + 1) + minNum),
        10
      );
    default:
      return 0;
  }
}

export function shuffleAList(list: Required<Pick<TrackLike, 'id' | 'sort'>>[]) {
  let sortsList = list.map(t => t.sort);
  for (let i = 1; i < sortsList.length; i++) {
    const random = Math.floor(Math.random() * (i + 1));
    [sortsList[i], sortsList[random]] = [sortsList[random], sortsList[i]];
  }
  let newSorts: Record<string | number, number | undefined> = {};
  list.map(track => {
    newSorts[track.id] = sortsList.pop();
  });
  return newSorts;
}

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  time: number
) {
  let isRun = false;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (isRun) return;
    isRun = true;
    fn.apply(this, args);
    setTimeout(() => {
      isRun = false;
    }, time);
  };
}

export function updateHttps(url?: string): string {
  if (!url) return '';
  return url.replace(/^http:/, 'https:');
}

export function dailyTask(): void {
  if (!isAccountLoggedIn()) return;

  // Navidrome 采用 token 认证，无需每日刷新 cookie。
  const lastDate = store.state.data.lastRefreshCookieDate;
  if (lastDate === undefined || lastDate !== dayjs().date()) {
    store.commit('updateData', {
      key: 'lastRefreshCookieDate',
      value: dayjs().date(),
    });
  }
}

export function changeAppearance(appearance?: string): void {
  if (appearance === 'auto' || appearance === undefined) {
    appearance = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  document.body.setAttribute('data-theme', appearance);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', appearance === 'dark' ? '#222' : '#fff');
}

export function splitSoundtrackAlbumTitle(title: string): TitleParts {
  let keywords = [
    'Music from the Original Motion Picture Score',
    'The Original Motion Picture Soundtrack',
    'Original MGM Motion Picture Soundtrack',
    'Complete Original Motion Picture Score',
    'Original Music From The Motion Picture',
    'Music From The Disney+ Original Movie',
    'Original Music From The Netflix Film',
    'Original Score to the Motion Picture',
    'Original Motion Picture Soundtrack',
    'Soundtrack from the Motion Picture',
    'Original Television Soundtrack',
    'Original Motion Picture Score',
    'Music From the Motion Picture',
    'Music From The Motion Picture',
    'Complete Motion Picture Score',
    'Music from the Motion Picture',
    'Original Videogame Soundtrack',
    'La Bande Originale du Film',
    'Music from the Miniseries',
    'Bande Originale du Film',
    'Die Original Filmmusik',
    'Original Soundtrack',
    'Complete Score',
    'Original Score',
  ];
  for (let keyword of keywords) {
    if (title.includes(keyword) === false) continue;
    return {
      title: title
        .replace(`(${keyword})`, '')
        .replace(`: ${keyword}`, '')
        .replace(`[${keyword}]`, '')
        .replace(`- ${keyword}`, '')
        .replace(`${keyword}`, ''),
      subtitle: keyword,
    };
  }
  return {
    title: title,
    subtitle: '',
  };
}

export function splitAlbumTitle(title: string): TitleParts {
  let keywords = [
    'Bonus Tracks Edition',
    'Complete Edition',
    'Deluxe Edition',
    'Deluxe Version',
    'Tour Edition',
  ];
  for (let keyword of keywords) {
    if (title.includes(keyword) === false) continue;
    return {
      title: title
        .replace(`(${keyword})`, '')
        .replace(`: ${keyword}`, '')
        .replace(`[${keyword}]`, '')
        .replace(`- ${keyword}`, '')
        .replace(`${keyword}`, ''),
      subtitle: keyword,
    };
  }
  return {
    title: title,
    subtitle: '',
  };
}

export function bytesToSize(bytes: number): string {
  let marker = 1024; // Change to 1000 if required
  let decimal = 2; // Change as required
  let kiloBytes = marker;
  let megaBytes = marker * marker;
  let gigaBytes = marker * marker * marker;

  let lang = store.state.settings.lang;

  if (bytes < kiloBytes) return bytes + (lang === 'en' ? ' Bytes' : '字节');
  else if (bytes < megaBytes)
    return (bytes / kiloBytes).toFixed(decimal) + ' KB';
  else if (bytes < gigaBytes)
    return (bytes / megaBytes).toFixed(decimal) + ' MB';
  else return (bytes / gigaBytes).toFixed(decimal) + ' GB';
}

export function formatTrackTime(value?: number): string {
  if (!value) return '';
  let min = ~~(value / 60);
  let sec = (~~(value % 60)).toString().padStart(2, '0');
  return `${min}:${sec}`;
}
