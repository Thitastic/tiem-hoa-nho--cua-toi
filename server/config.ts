import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

export interface ServerConfig {
  port:number; dataDir:string; uploadDir:string; allowedOrigin:string;
  production:boolean; adminEnabled:boolean; adminToken:string;
}

export function loadConfig(env:NodeJS.ProcessEnv=process.env):ServerConfig {
  const production=env.NODE_ENV==='production';
  const provided=env.ADMIN_TOKEN?.trim()??'';
  const adminToken=provided||(!production?randomBytes(24).toString('base64url'):'');
  return {
    port:Number(env.PORT||3000), dataDir:resolve(env.DATA_DIR||'data'),
    uploadDir:resolve(env.UPLOAD_DIR||'uploads'), allowedOrigin:env.ALLOWED_ORIGIN||'http://localhost:5173',
    production, adminEnabled:Boolean(adminToken), adminToken,
  };
}
