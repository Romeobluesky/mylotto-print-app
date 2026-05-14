import { readFile } from 'node:fs/promises';

export interface ParseResult {
  combinations: number[][];
  invalidLineCount: number;
}

export async function parseLottoFile(filePath: string): Promise<ParseResult> {
  const buf = await readFile(filePath);
  const text = decodeBuffer(buf);
  return parseLottoText(text);
}

export function parseLottoText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const combinations: number[][] = [];
  let invalidLineCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const tokens = line.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
    if (tokens.length === 0) continue;

    if (tokens.length > 6) {
      invalidLineCount++;
      continue;
    }

    const nums: number[] = [];
    let valid = true;
    for (const t of tokens) {
      if (!/^\d+$/.test(t)) {
        valid = false;
        break;
      }
      const n = Number(t);
      if (!Number.isInteger(n) || n < 1 || n > 45) {
        valid = false;
        break;
      }
      if (nums.includes(n)) {
        valid = false;
        break;
      }
      nums.push(n);
    }

    if (!valid) {
      invalidLineCount++;
      continue;
    }

    combinations.push(nums);
  }

  return { combinations, invalidLineCount };
}

function decodeBuffer(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  return buf.toString('utf8');
}
