import type {
  ApiBridge,
  AppSettings,
  OpenFileResult,
  PrintPayload,
  PrintResult,
  PrinterInfo,
  TestPrintPayload,
} from '@shared/index';

function bridge(): ApiBridge {
  if (typeof window === 'undefined' || !window.api) {
    throw new Error('Electron API bridge not available. Are you running outside Electron?');
  }
  return window.api;
}

export const ipc = {
  openFile: (): Promise<OpenFileResult> => bridge().openFile(),
  listPrinters: (): Promise<PrinterInfo[]> => bridge().listPrinters(),
  print: (payload: PrintPayload): Promise<PrintResult> => bridge().print(payload),
  testPrint: (payload: TestPrintPayload): Promise<PrintResult> => bridge().testPrint(payload),
  getSettings: (): Promise<AppSettings> => bridge().getSettings(),
  setSettings: (settings: AppSettings): Promise<void> => bridge().setSettings(settings),
  openSettingsWindow: (): Promise<void> => bridge().openSettingsWindow(),
  closeSettingsWindow: (): Promise<void> => bridge().closeSettingsWindow(),
  onSettingsChanged: (cb: (settings: AppSettings) => void): (() => void) =>
    bridge().onSettingsChanged(cb),
  openManualInputWindow: (): Promise<void> => bridge().openManualInputWindow(),
  closeManualInputWindow: (): Promise<void> => bridge().closeManualInputWindow(),
  submitManualInput: (groups: number[][]): Promise<void> => bridge().submitManualInput(groups),
  onManualInputSubmit: (cb: (groups: number[][]) => void): (() => void) =>
    bridge().onManualInputSubmit(cb),
};
