import defaultShortcuts from '@/utils/shortcuts';
import { globalShortcut } from 'electron';
import type { BrowserWindow } from 'electron';
import type { Shortcut } from '@/utils/shortcuts';

const clc = require('cli-color');
const log = (text: string) => {
  console.log(`${clc.blueBright('[globalShortcut.js]')} ${text}`);
};

type StoreLike = {
  get: (key: string) => Shortcut[] | undefined;
};

function getShortcut(shortcuts: Shortcut[], id: string): Shortcut {
  return (
    shortcuts.find(s => s.id === id) || defaultShortcuts.find(s => s.id === id)!
  );
}

export function registerGlobalShortcut(
  win: BrowserWindow,
  store: StoreLike
): void {
  log('registerGlobalShortcut');
  let shortcuts = store.get('settings.shortcuts');
  if (shortcuts === undefined) {
    shortcuts = defaultShortcuts;
  }

  globalShortcut.register(getShortcut(shortcuts, 'play').globalShortcut, () => {
    win.webContents.send('play');
  });
  globalShortcut.register(getShortcut(shortcuts, 'next').globalShortcut, () => {
    win.webContents.send('next');
  });
  globalShortcut.register(
    getShortcut(shortcuts, 'previous').globalShortcut,
    () => {
      win.webContents.send('previous');
    }
  );
  globalShortcut.register(
    getShortcut(shortcuts, 'increaseVolume').globalShortcut,
    () => {
      win.webContents.send('increaseVolume');
    }
  );
  globalShortcut.register(
    getShortcut(shortcuts, 'decreaseVolume').globalShortcut,
    () => {
      win.webContents.send('decreaseVolume');
    }
  );
  globalShortcut.register(getShortcut(shortcuts, 'like').globalShortcut, () => {
    win.webContents.send('like');
  });
  globalShortcut.register(
    getShortcut(shortcuts, 'minimize').globalShortcut,
    () => {
      win.isVisible() ? win.hide() : win.show();
    }
  );
}
