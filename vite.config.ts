import { defineConfig } from 'vitest/config';
import { existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
declare const process:{cwd:()=>string};

const assetsRoot=resolve(process.cwd(),'public','assets');
const presentAssets=existsSync(assetsRoot)?readdirSync(assetsRoot,{recursive:true,withFileTypes:true})
  .filter((entry:{isFile:()=>boolean})=>entry.isFile())
  .map((entry:{parentPath:string;name:string})=>relative(assetsRoot,resolve(entry.parentPath,entry.name)).replaceAll('\\','/')):[];

export default defineConfig({
  define:{__PRESENT_ASSETS__:JSON.stringify(presentAssets)},
  plugins:[{name:'admin-route',configureServer(server){server.middlewares.use('/admin',(request,response,next)=>{if(request.url==='/'||request.url===''){response.statusCode=302;response.setHeader('Location','/admin.html');response.end();return;}next();});}}],
  server:{proxy:{'/api':'http://localhost:3000','/uploads':'http://localhost:3000'}},
  build:{rollupOptions:{input:{game:resolve(process.cwd(),'index.html'),admin:resolve(process.cwd(),'admin.html')}}},
  test:{environment:'node',include:['src/**/*.test.ts','server/**/*.test.ts']},
});
