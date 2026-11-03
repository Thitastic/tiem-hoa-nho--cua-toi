import { afterEach,describe,expect,it } from 'vitest';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase,seedBuiltinRose } from './database';

const roots:string[]=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
describe('migration và seed catalog',()=>{
  it('seed hoa hồng idempotent',()=>{const root=mkdtempSync(join(tmpdir(),'hoa-db-'));roots.push(root);const db=openDatabase(join(root,'catalog.sqlite'));seedBuiltinRose(db);seedBuiltinRose(db);expect((db.prepare("SELECT count(*) count FROM families WHERE id='rose'").get() as {count:number}).count).toBe(1);expect((db.prepare("SELECT count(*) count FROM variants WHERE family_id='rose'").get() as {count:number}).count).toBe(6);db.close();});
});
