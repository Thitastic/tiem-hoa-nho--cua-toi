import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
declare const process:{cwd:()=>string};

const logicRoots = ['core', 'systems', 'model'];
const filesUnder = (directory:string):string[] => readdirSync(directory, { withFileTypes:true }).flatMap((entry:{name:string;isDirectory:()=>boolean}) => {
  const path = join(directory, entry.name); return entry.isDirectory() ? filesUnder(path) : [path];
});

describe('ranh giới logic thời gian', () => {
  it('không đọc clock hệ thống ngoài UtcClock và không import PixiJS', () => {
    const violations:string[] = [];
    for (const root of logicRoots) for (const file of filesUnder(join(process.cwd(), 'src', root))) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts') || file.endsWith('UtcClock.ts')) continue;
      const source = readFileSync(file, 'utf8');
      if (/Date\.now\s*\(|new\s+Date\s*\(|performance\.now\s*\(/.test(source)) violations.push(`clock: ${file}`);
      if (/from\s*['\"](?:pixi\.js|@pixi\/)/.test(source)) violations.push(`pixi: ${file}`);
    }
    expect(violations).toEqual([]);
  });
});
