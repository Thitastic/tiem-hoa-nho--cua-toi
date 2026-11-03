import 'dotenv/config';
import { buildServer } from './app.js';
import { loadConfig } from './config.js';

const config=loadConfig();
if(!config.production&&!process.env.ADMIN_TOKEN)console.log(`Mã quản trị tạm thời: ${config.adminToken}`);
const app=await buildServer({config,logger:true});
await app.listen({port:config.port,host:'0.0.0.0'});
