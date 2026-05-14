import { BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AppSettings, PrintResult, PrinterInfo } from '@shared/index';
import { PAGE_MM } from '@shared/coordinates';
import { buildSinglePageHtml, buildTestPrintHtml, planSlips, portraitH } from './print-renderer';

export async function listPrinters(): Promise<PrinterInfo[]> {
  const tempWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    const printers = await tempWin.webContents.getPrintersAsync();
    return printers.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: Boolean(p.isDefault),
    }));
  } finally {
    if (!tempWin.isDestroyed()) tempWin.destroy();
  }
}

export async function printCombinations(
  combinations: number[][],
  settings: AppSettings,
): Promise<PrintResult> {
  if (combinations.length === 0) {
    return { success: false, error: '인쇄할 조합이 없습니다.' };
  }
  if (!settings.printer) {
    return { success: false, error: '프린터가 선택되지 않았습니다. 인쇄설정에서 프린터를 선택하세요.' };
  }

  // 페이지별로 별도의 print job 을 보낸다.
  // 한 HTML 에 여러 페이지를 묶어 보내면 Chromium 의 page-break 분할 시 미세 누적 오차
  // 가 발생해 5~10장에서 마킹 위치가 점점 어긋난다. 페이지 = job 1:1 매핑으로 차단.
  const slips = planSlips(combinations);
  const ph = portraitH(settings);
  for (let i = 0; i < slips.length; i++) {
    const slipCombos = combinations.slice(i * 5, i * 5 + 5);
    const html = buildSinglePageHtml(slipCombos, settings);
    const res = await printHtml(html, settings.printer, ph);
    if (!res.success) {
      return {
        success: false,
        error: `페이지 ${i + 1}/${slips.length} 인쇄 실패: ${res.error ?? '알 수 없는 오류'}`,
      };
    }
  }
  return { success: true };
}

export async function testPrint(settings: AppSettings): Promise<PrintResult> {
  if (!settings.printer) {
    return { success: false, error: '프린터가 선택되지 않았습니다. 인쇄설정에서 프린터를 선택하세요.' };
  }
  const html = buildTestPrintHtml(settings);
  return printHtml(html, settings.printer, portraitH(settings));
}

async function printHtml(html: string, deviceName: string, portraitHMm: number): Promise<PrintResult> {
  // BrowserWindow 는 portrait(83mm × portraitHMm) 비율로 생성한다.
  const win = new BrowserWindow({
    show: false,
    width: Math.round(PAGE_MM.height * 4),    // 83mm 가로
    height: Math.round(portraitHMm * 4),      // paperLength 만큼 세로
    webPreferences: { offscreen: true, sandbox: true },
  });

  // HTML 에 base64 임베드 OMR 이미지(~2.7MB) 가 포함되므로 data:URL 로 loadURL 하면
  // Chromium 의 URL 길이 한계(~2MB)를 초과해 멈춰버린다. 임시 파일에 쓰고 loadFile 사용.
  const tmpHtmlPath = join(tmpdir(), `winspot-omr-print-${process.pid}-${Date.now()}.html`);
  writeFileSync(tmpHtmlPath, html, 'utf-8');

  try {
    await win.loadFile(tmpHtmlPath);

    return await new Promise<PrintResult>((resolve) => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName,
          margins: { marginType: 'none' },
          pageSize: {
            width: PAGE_MM.height * 1000,
            height: portraitHMm * 1000,
          },
          landscape: false,
          copies: 1,
        },
        (success, failureReason) => {
          if (success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: failureReason || '인쇄 실패' });
          }
        },
      );
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    if (!win.isDestroyed()) win.destroy();
    try {
      unlinkSync(tmpHtmlPath);
    } catch {
      // ignore — 임시 파일 정리 실패는 무시
    }
  }
}
