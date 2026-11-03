import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROSE_FAMILY } from '../src/data/plants/rose.js';

export type CatalogDb=Database.Database;
const localMigrationDir=resolve(dirname(fileURLToPath(import.meta.url)),'migrations');
const migrationDir=existsSync(localMigrationDir)?localMigrationDir:resolve(process.cwd(),'server','migrations');

export function openDatabase(file:string):CatalogDb {
  if(file!==':memory:') mkdirSync(dirname(file),{recursive:true});
  const db=new Database(file);
  db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
  migrateDatabase(db); return db;
}

export function migrateDatabase(db:CatalogDb):void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)');
  if(!existsSync(migrationDir)) throw new Error(`Không tìm thấy migration: ${migrationDir}`);
  for(const name of readdirSync(migrationDir).filter((x)=>/^\d+_.*\.sql$/.test(x)).sort()) {
    const version=Number(name.split('_')[0]);
    if(db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(version)) continue;
    const sql=readFileSync(resolve(migrationDir,name),'utf8');
    db.transaction(()=>{ db.exec(sql); db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)').run(version,Date.now()); })();
  }
}

export function seedBuiltinRose(db:CatalogDb):void {
  const now=Date.now(); const f=ROSE_FAMILY;
  db.transaction(()=>{
    db.prepare(`INSERT OR IGNORE INTO families(id,name,name_en,unlock_level,base_seed_price,seed2_price_mult,grow_time_sec,watering_interval_sec,base_mutation_chance,stage_thresholds,reveal_variant_from_stage,growth_pauses_when_dry,tags,archived,builtin,created_at,updated_at)
      VALUES(@id,@name,@nameEn,@unlock,@price,@mult,@grow,@water,@mutation,@stages,@reveal,@dry,@tags,0,1,@now,@now)`).run({id:f.id,name:f.name,nameEn:f.englishName??null,unlock:f.unlockLevel,price:f.baseSeedPrice,mult:f.seed2StarPriceMult,grow:f.growTimeSec,water:f.wateringIntervalSec[0],mutation:f.mutationChance,stages:JSON.stringify(f.stageThresholds),reveal:f.revealVariantFromStage,dry:f.growthPausesWhenDry?1:0,tags:JSON.stringify(f.tags),now});
    const insert=db.prepare(`INSERT OR IGNORE INTO variants(id,family_id,key,name,name_en,rarity_id,is_base,mutation_weight,yield_count,yield_unit_price,sort_order,archived) VALUES(?,?,?,?,?,?,?,?,?,?,?,0)`);
    f.variants.forEach((v,i)=>insert.run(v.id,f.id,v.variantKey,v.name,v.englishName,v.rarity,v.id===f.baseVariantId?1:0,v.mutationWeight,v.yield,v.unitPrice,i));
  })();
}

export function bumpCatalog(db:CatalogDb):number {
  db.prepare('UPDATE catalog_meta SET version=version+1 WHERE id=1').run();
  return (db.prepare('SELECT version FROM catalog_meta WHERE id=1').get() as {version:number}).version;
}

export function audit(db:CatalogDb,action:string,familyId:string|null,detail?:unknown):void {
  db.prepare('INSERT INTO audit_log(created_at,action,family_id,detail) VALUES(?,?,?,?)').run(Date.now(),action,familyId,detail===undefined?null:JSON.stringify(detail));
}
