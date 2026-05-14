import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { basename, extname, join } from 'node:path';
import type { AppSettings, OpenFileResult, PrintPayload, TestPrintPayload } from '@shared/index';
import { parseLottoFile } from './services/file-parser';
import { listPrinters, printCombinations, testPrint } from './services/printer';
import { getAllSettings, setAllSettings } from './services/store';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

const PRELOAD_PATH = join(__dirname, '../preload/preload.js');
const RENDERER_INDEX = join(__dirname, '../renderer/index.html');
// dev: 프로젝트 루트의 resources/icon.ico (__dirname = out/main/)
// packaged: electron-builder `extraResources`로 app.asar 옆 resources/ 디렉토리에 위치
const ICON_PATH = app.isPackaged
  ? join(process.resourcesPath, 'icon.ico')
  : join(__dirname, '../../resources/icon.ico');

function loadRenderer(win: BrowserWindow, route: 'main' | 'settings') {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    win.loadURL(`${devUrl}#/${route}`);
  } else {
    win.loadFile(RENDERER_INDEX, { hash: `/${route}` });
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 640,
    minWidth: 520,
    maxWidth: 520,
    minHeight: 640,
    maxHeight: 640,
    maximizable: false,
    fullscreenable: false,
    title: 'WinSpot OMR Marker',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  loadRenderer(mainWindow, 'main');
  // DevTools는 자동으로 열지 않음. 필요 시 F12 / Ctrl+Shift+I 로 수동 토글.
  // (자동 오픈 시 Chromium DevTools 자체가 Autofill / source-map fetch 등에서
  // -32601 / "Failed to fetch" 같은 무해한 콘솔 로그를 쏟아내 노이즈를 만듦.)

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 960,
    height: 600,
    minWidth: 960,
    maxWidth: 960,
    minHeight: 600,
    maxHeight: 600,
    maximizable: false,
    fullscreenable: false,
    parent: mainWindow ?? undefined,
    modal: false,
    title: 'WinSpot OMR Marker — 인쇄 설정',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
    },
  });

  settingsWindow.setMenuBarVisibility(false);
  loadRenderer(settingsWindow, 'settings');

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function broadcastSettingsChanged(settings: AppSettings) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('settings:changed', settings);
    }
  }
}

function registerIpc() {
  ipcMain.handle('file:open', async (): Promise<OpenFileResult> => {
    const result = await dialog.showOpenDialog({
      title: '로또 조합 파일 열기',
      filters: [{ name: 'Text', extensions: ['txt'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, combinations: [], invalidLineCount: 0 };
    }
    const filePath = result.filePaths[0];
    const parsed = await parseLottoFile(filePath);
    return {
      canceled: false,
      filePath: basename(filePath, extname(filePath)),
      combinations: parsed.combinations,
      invalidLineCount: parsed.invalidLineCount,
    };
  });

  ipcMain.handle('printer:list', async () => listPrinters());

  ipcMain.handle('printer:print', async (_event, payload: PrintPayload) =>
    printCombinations(payload.combinations, payload.settings),
  );

  ipcMain.handle('printer:test', async (_event, payload: TestPrintPayload) =>
    testPrint(payload.settings),
  );

  ipcMain.handle('store:get-all', async (): Promise<AppSettings> => getAllSettings());

  ipcMain.handle('store:set-all', async (_event, settings: AppSettings) => {
    setAllSettings(settings);
    broadcastSettingsChanged(getAllSettings());
  });

  ipcMain.handle('settings:open', async () => {
    createSettingsWindow();
  });

  ipcMain.handle('settings:close', async () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.winspot.omr-marker');
    }
    registerIpc();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
