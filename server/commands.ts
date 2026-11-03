import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalogFromDatabase } from './catalog.js';
import { loadConfig } from './config.js';
import { bumpCatalog, openDatabase, seedBuiltinRose } from './database.js';
import { validateFamily } from './validation.js';

const config=loadConfig(),db=openDatabase(resolve(config.dataDir,'catalog.sqlite'));
const command=process.argv[2],file=resolve(process.argv[3]||'catalog-backup.json');
if(command==='migrate') console.log('Đã áp dụng migration.');
else if(command==='seed'){seedBuiltinRose(db);console.log('Đã seed dữ liệu có sẵn.');}
else if(command==='export'){
  mkdirSync(resolve(file,'..'),{recursive:true});
  const catalog=catalogFromDatabase(db,'');
  const images=(db.prepare('SELECT owner_type,owner_id,slot,file_path,width,height,bytes,sha256 FROM images ORDER BY owner_type,owner_id,slot').all());
  writeFileSync(file,JSON.stringify({catalog,images},null,2));console.log(`Đã xuất ${file}`);
}else if(command==='import'){
  const backup=JSON.parse(readFileSync(file,'utf8')) as {catalog:{families:unknown[]}};
  db.transaction(()=>{
    for(const raw of backup.catalog.families){
      const input=raw as Record<string,unknown>;if(input.id==='rose')continue;
      const f=validateFamily(input,false,false),now=Date.now();
      db.prepare(`INSERT INTO families(id,name,name_en,unlock_level,base_seed_price,seed2_price_mult,grow_time_sec,watering_interval_sec,base_mutation_chance,stage_thresholds,reveal_variant_from_stage,growth_pauses_when_dry,tags,archived,builtin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_en=excluded.name_en,unlock_level=excluded.unlock_level,archived=excluded.archived,updated_at=excluded.updated_at`).run(f.id,f.name,f.nameEn??null,f.unlockLevel,f.baseSeedPrice,f.seed2StarPriceMult,f.growTimeSec,f.wateringIntervalSec,f.baseMutationChance,JSON.stringify(f.stageThresholds),f.revealVariantFromStage,f.growthPausesWhenDry?1:0,JSON.stringify(f.tags),f.archived?1:0,0,now,now);
      for(const [i,v] of f.variants.entries())db.prepare(`INSERT INTO variants(id,family_id,key,name,name_en,rarity_id,is_base,mutation_weight,yield_count,yield_unit_price,sort_order,archived) VALUES(?,?,?,?,?,?,?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_en=excluded.name_en,rarity_id=excluded.rarity_id,is_base=excluded.is_base,mutation_weight=excluded.mutation_weight,yield_count=excluded.yield_count,yield_unit_price=excluded.yield_unit_price,sort_order=excluded.sort_order,archived=0`).run(v.id,f.id,v.key,v.name,v.nameEn??null,v.rarityId,v.isBase?1:0,v.mutationWeight,v.yield.count,v.yield.unitPrice,i);
    } bumpCatalog(db);
  })();console.log(`Đã nhập ${file}; tệp ảnh phải được phục hồi riêng.`);
}else throw new Error('Lệnh không hợp lệ.');
db.close();
