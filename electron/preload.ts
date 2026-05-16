import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  ApiBridge,
  AppSettings,
  OpenFileResult,
  PrintPayload,
  PrintResult,
  PrinterInfo,
  TestPrintPayload,
} from '@shared/index';

const api: ApiBridge = {
  openFile: () => ipcRenderer.invoke('file:open') as Promise<OpenFileResult>,
  listPrinters: () => ipcRenderer.invoke('printer:list') as Promise<PrinterInfo[]>,
  print: (payload: PrintPayload) =>
    ipcRenderer.invoke('printer:print', payload) as Promise<PrintResult>,
  testPrint: (payload: TestPrintPayload) =>
    ipcRenderer.invoke('printer:test', payload) as Promise<PrintResult>,
  getSettings: () => ipcRenderer.invoke('store:get-all') as Promise<AppSettings>,
  setSettings: (settings: AppSettings) =>
    ipcRenderer.invoke('store:set-all', settings) as Promise<void>,
  openSettingsWindow: () => ipcRenderer.invoke('settings:open') as Promise<void>,
  closeSettingsWindow: () => ipcRenderer.invoke('settings:close') as Promise<void>,
  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const handler = (_event: IpcRendererEvent, settings: AppSettings) => callback(settings);
    ipcRenderer.on('settings:changed', handler);
    return () => {
      ipcRenderer.removeListener('settings:changed', handler);
    };
  },
  openManualInputWindow: () => ipcRenderer.invoke('manual-input:open') as Promise<void>,
  closeManualInputWindow: () => ipcRenderer.invoke('manual-input:close') as Promise<void>,
  submitManualInput: (groups: number[][]) =>
    ipcRenderer.invoke('manual-input:submit', groups) as Promise<void>,
  onManualInputSubmit: (callback: (groups: number[][]) => void) => {
    const handler = (_event: IpcRendererEvent, groups: number[][]) => callback(groups);
    ipcRenderer.on('manual-input:submitted', handler);
    return () => {
      ipcRenderer.removeListener('manual-input:submitted', handler);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);
