import { defineConfig } from 'vitest/config';
// @ts-expect-error Vite config chạy trong Node; app không kéo node types.
import { existsSync, readdirSync } from 'node:fs';
// @ts-expect-error Vite config chạy trong Node; app không kéo node types.
import { relative, resolve } from 'node:path';
declare const process:{cwd:()=>string};

const assetsRoot=resolve(process.cwd(),'public','assets');
const presentAssets=existsSync(assetsRoot)?readdirSync(assetsRoot,{recursive:true,withFileTypes:true})
  .filter((entry:{isFile:()=>boolean})=>entry.isFile())
  .map((entry:{parentPath:string;name:string})=>relative(assetsRoot,resolve(entry.parentPath,entry.name)).replaceAll('\\','/')):[];

export default defineConfig({
  define:{__PRESENT_ASSETS__:JSON.stringify(presentAssets)},
  test:{environment:'node',include:['src/**/*.test.ts']},
});
