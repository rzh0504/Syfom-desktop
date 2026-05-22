import defaultShortcuts from '@/utils/shortcuts';
import { app, Menu, shell } from 'electron';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import type { Shortcut } from '@/utils/shortcuts';
// import { autoUpdater } from "electron-updater"
// const version = app.getVersion();

const isMac = process.platform === 'darwin';

type StoreLike = {
  get: (key: string) => Shortcut[] | undefined;
};

function getShortcut(shortcuts: Shortcut[], id: string): Shortcut {
  return (
    shortcuts.find(s => s.id === id) || defaultShortcuts.find(s => s.id === id)!
  );
}

export function createMenu(win: BrowserWindow, store: StoreLike): void {
  let shortcuts = store.get('settings.shortcuts');
  if (shortcuts === undefined) {
    shortcuts = defaultShortcuts;
  }

  let menu: Menu | null = null;
  const template: any[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { type: 'separator' },
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  win.webContents.send('changeRouteTo', '/settings');
                },
                role: 'preferences',
              },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideothers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startspeaking' }, { role: 'stopspeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            win.webContents.send('search');
          },
        },
      ],
    },
    {
      label: 'Controls',
      submenu: [
        {
          label: 'Play',
          accelerator: getShortcut(shortcuts, 'play').shortcut,
          click: () => {
            win.webContents.send('play');
          },
        },
        {
          label: 'Next',
          accelerator: getShortcut(shortcuts, 'next').shortcut,
          click: () => {
            win.webContents.send('next');
          },
        },
        {
          label: 'Previous',
          accelerator: getShortcut(shortcuts, 'previous').shortcut,
          click: () => {
            win.webContents.send('previous');
          },
        },
        {
          label: 'Increase Volume',
          accelerator: getShortcut(shortcuts, 'increaseVolume').shortcut,
          click: () => {
            win.webContents.send('increaseVolume');
          },
        },
        {
          label: 'Decrease Volume',
          accelerator: getShortcut(shortcuts, 'decreaseVolume').shortcut,
          click: () => {
            win.webContents.send('decreaseVolume');
          },
        },
        {
          label: 'Like',
          accelerator: getShortcut(shortcuts, 'like').shortcut,
          click: () => {
            win.webContents.send('like');
          },
        },
        {
          label: 'Repeat',
          accelerator: 'Alt+R',
          click: () => {
            win.webContents.send('repeat');
          },
        },
        {
          label: 'Shuffle',
          accelerator: 'Alt+S',
          click: () => {
            win.webContents.send('shuffle');
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              {
                role: 'window',
                id: 'window',
                label: 'YesPlayMusic',
                type: 'checkbox',
                checked: true,
                click: () => {
                  const current = menu?.getMenuItemById('window');
                  if (!current) return;
                  if (current.checked === false) {
                    win.hide();
                  } else {
                    win.show();
                  }
                },
              },
            ]
          : [{ role: 'close' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/qier222/YesPlayMusic');
          },
        },
        {
          label: 'Electron',
          click: async () => {
            await shell.openExternal('https://electronjs.org');
          },
        },
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            win.webContents.openDevTools();
          },
        },
      ],
    },
  ];
  // for window
  // if (process.platform === "win32") {
  //   template.push({
  //     label: "Help",
  //     submenu: [
  //       {
  //         label: `Current version v${version}`,
  //         enabled: false,
  //       },
  //       {
  //         label: "Check for update",
  //         accelerator: "Ctrl+U",
  //         click: (item, focusedWindow) => {
  //           win = focusedWindow;
  //           updateSource = "menu";
  //           autoUpdater.checkForUpdates();
  //         },
  //       },
  //     ],
  //   });
  // }

  menu = Menu.buildFromTemplate(template as MenuItemConstructorOptions[]);
  Menu.setApplicationMenu(menu);
}
