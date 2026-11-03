import type { CatalogFamily, CatalogVariant } from '../src/core/types.js';
import type { CatalogDb } from './database.js';

type Row=Record<string,unknown>;
const json=<T>(value:unknown,fallback:T):T=>{try{return JSON.parse(String(value)) as T;}catch{return fallback;}};

export function catalogFromDatabase(db:CatalogDb,baseUrl:string):{version:number;families:CatalogFamily[]} {
  const version=(db.prepare('SELECT version FROM catalog_meta WHERE id=1').get() as {version:number}).version;
  const imageRows=db.prepare('SELECT * FROM images').all() as Row[];
  const imageUrl=(ownerType:string,ownerId:string,slot:string)=>{
    const row=imageRows.find((r)=>r.owner_type===ownerType&&r.owner_id===ownerId&&r.slot===slot);
    return row?`${baseUrl}/uploads/${String(row.file_path).replaceAll('\\','/')}`:undefined;
  };
  const families=(db.prepare('SELECT * FROM families ORDER BY builtin DESC, created_at, id').all() as Row[]).map((f):CatalogFamily=>{
    const rows=db.prepare('SELECT * FROM variants WHERE family_id=? AND archived=0 ORDER BY sort_order,id').all(f.id) as Row[];
    const variants=rows.map((v):CatalogVariant=>({
      key:String(v.key),id:String(v.id),name:String(v.name),nameEn:v.name_en?String(v.name_en):undefined,
      rarityId:String(v.rarity_id),isBase:Boolean(v.is_base),mutationWeight:Number(v.mutation_weight),
      yield:{count:Number(v.yield_count),unitPrice:Number(v.yield_unit_price)},
      images:{stages:{2:imageUrl('variant',String(v.id),'stage2'),3:imageUrl('variant',String(v.id),'stage3'),4:imageUrl('variant',String(v.id),'stage4')},stem:imageUrl('variant',String(v.id),'stem')},
    }));
    return {
      id:String(f.id),name:String(f.name),nameEn:f.name_en?String(f.name_en):undefined,unlockLevel:Number(f.unlock_level),
      baseSeedPrice:Number(f.base_seed_price),seed2StarPriceMult:Number(f.seed2_price_mult),growTimeSec:Number(f.grow_time_sec),
      wateringIntervalSec:Number(f.watering_interval_sec),baseMutationChance:Number(f.base_mutation_chance),
      stageThresholds:json(f.stage_thresholds,[0,.2,.45,.75,1]),revealVariantFromStage:Number(f.reveal_variant_from_stage),
      growthPausesWhenDry:Boolean(f.growth_pauses_when_dry),tags:json(f.tags,[]),archived:Boolean(f.archived),builtin:Boolean(f.builtin),
      images:{shared:{0:imageUrl('family',String(f.id),'stage0'),1:imageUrl('family',String(f.id),'stage1')},seeds:{1:imageUrl('family',String(f.id),'seed1'),2:imageUrl('family',String(f.id),'seed2'),3:imageUrl('family',String(f.id),'seed3')}},variants,
    };
  });
  return {version,families};
}
