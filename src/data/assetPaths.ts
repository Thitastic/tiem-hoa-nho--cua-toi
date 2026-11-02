import type{PlantStage,PlantStageImageDef}from'../core/types';
import{PLANT_FAMILIES,PLANT_VARIANTS,familyById,variantById}from'./plants/rose';
import{POTS}from'./pots';
import{SEEDS}from'./seeds';
import{BOUQUETS}from'./bouquets';
import{WATERING_CANS}from'./wateringCans';
import{GREENHOUSES}from'./greenhouses';
import{CUSTOMERS}from'./customers';
import{assetConfig}from'./assetConfig';

export interface AssetEntry{
  key:string;path:string;group:string;required:boolean;present:boolean;silentMissing?:boolean;
  label:string;rarity?:string;size:{w:number;h:number};
}
const presentAssets=new Set(typeof __PRESENT_ASSETS__==='undefined'?[]:__PRESENT_ASSETS__);
const asset=(key:string,path:string,group:string,required:boolean,_declaredPresent:boolean,label:string,w:number,h:number,rarity?:string,silentMissing=false):AssetEntry=>({
  key,path:`/assets/${path}`,group,required,present:presentAssets.has(path),label,size:{w,h},rarity,...(silentMissing?{silentMissing:true}:{}),
});
const entries:AssetEntry[]=[];

for(const family of PLANT_FAMILIES){
  for(const[rawStage,image]of Object.entries(family.images.shared)as [string,PlantStageImageDef][]){
    const stage=Number(rawStage)as PlantStage;
    entries.push(asset(`plant:${family.id}:shared:${stage}`,`${family.images.folder}/${image.file}`,'Cây hoa dùng chung',true,true,`${family.name} · Giai đoạn ${stage}`,256,256));
  }
  for(const variant of family.variants)for(const[rawStage,image]of Object.entries(variant.images.stages)as [string,PlantStageImageDef][]){
    const stage=Number(rawStage)as PlantStage;
    entries.push(asset(`plant:${variant.id}:${stage}`,`${family.images.folder}/${image.file}`,'Cây hoa',true,true,`${variant.name} · Giai đoạn ${stage}`,256,256,variant.rarity));
  }
}
for(const pot of POTS){
  const path=pot.image??pot.suggestedImage;
  entries.push(asset(`pot:${pot.id}`,path,'Chậu',Boolean(pot.image),Boolean(pot.image),pot.name,200,200,pot.rarity));
}
for(const variant of PLANT_VARIANTS)entries.push(asset(`item:${variant.id}`,`items/flowers/${variant.variantKey}.png`,'Cành hoa',false,false,variant.name,128,128,variant.rarity,assetConfig.useBloomAsStemIcon));
for(const seed of SEEDS)entries.push(asset(`item:${seed.id}`,`items/seeds/seed_${seed.familyId}_${seed.starLevel}star.png`,'Hạt giống',false,false,seed.name,128,128));
for(const bouquet of BOUQUETS)entries.push(asset(`item:${bouquet.id}`,`items/bouquets/${bouquet.key}.png`,'Bó hoa',false,false,bouquet.name,192,192));
for(const can of WATERING_CANS)entries.push(asset(`item:${can.id}`,`items/watering_cans/${can.id}.png`,'Bình tưới',false,false,can.name,128,128));
entries.push(asset('item:chest_pot','items/chests/chest_pot.png','Rương',false,false,'Rương chậu hạng 4',128,128));
for(const greenhouse of GREENHOUSES.slice(1))entries.push(asset(`item:${greenhouse.id}`,`items/greenhouses/${greenhouse.id}.png`,'Nhà kính',false,false,greenhouse.name,128,128));

entries.push(
  asset('currency:coin','ui/coin.png','Tiền tệ',true,true,'Xu',150,150),
  asset('currency:gold','currency/gold.png','Tiền tệ',false,false,'Vàng dự phòng',64,64),
  asset('currency:points_rose','currency/points_rose.png','Tiền tệ',false,false,'Điểm hoa hồng',64,64),
);
for(const customer of CUSTOMERS){
  entries.push(asset(`customer:${customer.archetypeKey}:base`,`customers/portraits/${customer.archetypeKey}.png`,'Khách hàng',false,false,customer.archetype,256,256));
  for(const mood of['happy','upset'])entries.push(asset(`customer:${customer.archetypeKey}:${mood}`,`customers/portraits/${customer.archetypeKey}_${mood}.png`,'Khách hàng tùy chọn',false,false,`${customer.archetype} · ${mood}`,256,256));
  entries.push(asset(`customer:${customer.id}:override`,`customers/portraits/by_id/${customer.id}.png`,'Khách hàng tùy chọn',false,false,customer.name,256,256));
}
for(const area of[['greenhouse','Nhà kính'],['packing_table','Bàn gói hoa'],['farm_tools_shop','Cửa hàng nông cụ'],['counter_shop','Quầy hàng']]as const)entries.push(asset(`background:${area[0]}`,`backgrounds/${area[0]}.png`,'Phông nền',false,false,area[1],720,1600));
for(let index=2;index<=4;index++)entries.push(asset(`background:greenhouse_${index}`,`backgrounds/greenhouse_${index}.png`,'Phông nền tùy chọn',false,false,`Nhà kính ${index}`,720,1600));

const uiMissing=['slot_empty','slot_locked','inventory_slot','inventory_slot_selected','frame_common','frame_rare','frame_epic','frame_legendary','panel_bg','modal_bg','order_card_bg','tooltip_bg','button_normal','button_hover','button_pressed','button_disabled','tab_normal','tab_active','progress_bg','progress_fill','icon_ready','icon_star_filled','icon_star_empty','icon_heart_favor','icon_timer','icon_lock','icon_close','icon_rank','icon_reject','icon_confirm','tab_icon_greenhouse','tab_icon_packing','tab_icon_farm_tools','tab_icon_counter'];
for(const key of uiMissing){
  const large=['slot_empty','slot_locked'].includes(key);
  const nine=['panel_bg','modal_bg','order_card_bg','tooltip_bg','button_normal','button_hover','button_pressed','button_disabled','tab_normal','tab_active','progress_bg','progress_fill'].includes(key);
  entries.push(asset(`ui:${key}`,`ui/${key}.png`,'Giao diện',false,false,key,nine?128:large?256:64,nine?128:large?256:64));
}
entries.push(
  asset('ui:icon_need_water','ui/binh-tuoi.png','Giao diện',true,true,'Bình tưới',150,150),
  asset('ui:icon_settings','ui/cai-dat.png','Giao diện',true,true,'Cài đặt',150,150),
  asset('ui:icon_quest','ui/nhiem-vu.png','Giao diện',true,true,'Nhiệm vụ',150,150),
);
for(const key of['fx_sparkle','fx_water_drop','fx_coin'])entries.push(asset(`ui:${key}`,`ui/${key}.png`,'Hiệu ứng tùy chọn',false,false,key,64,64));

export const ASSET_MANIFEST=entries;
export const ASSET_SIZES={plant:{w:256,h:256,anchor:{x:.5,y:1}},pot:{w:200,h:200,anchor:{x:.5,y:1}},item:{w:128,h:128,anchor:{x:.5,y:.5}},bouquet:{w:192,h:192,anchor:{x:.5,y:.5}},background:{w:720,h:1600,safeArea:{x:0,y:160,w:720,h:1280}},uiIcon:{w:150,h:150}}as const;
export const assetByKey=(key:string)=>ASSET_MANIFEST.find((entry)=>entry.key===key);

export interface ResolvedPlantAsset{key:string;file:string;path:string;sourceStage:PlantStage;displayScale:number}
const resolved=(variantId:string,sourceStage:PlantStage,image:PlantStageImageDef):ResolvedPlantAsset=>{
  const variant=variantById(variantId);const family=familyById(variant.familyId);
  const shared=Boolean(family.images.shared[sourceStage]===image);
  return{key:shared?`plant:${family.id}:shared:${sourceStage}`:`plant:${variant.id}:${sourceStage}`,file:image.file,path:`/assets/${family.images.folder}/${image.file}`,sourceStage,displayScale:(family.images.displayScale??1)*(variant.images.displayScale??1)*(image.displayScale??1)};
};
export const resolvePlantAsset=(variantId:string,requestedStage:PlantStage):ResolvedPlantAsset|undefined=>{
  const variant=variantById(variantId);const family=familyById(variant.familyId);
  const exact=variant.images.stages[requestedStage];if(exact)return resolved(variantId,requestedStage,exact);
  const shared=family.images.shared[requestedStage];if(shared)return resolved(variantId,requestedStage,shared);
  for(let stage=requestedStage-1;stage>=0;stage--){const lower=variant.images.stages[stage as PlantStage];if(lower)return resolved(variantId,stage as PlantStage,lower);}
  return undefined;
};
export const resolveStemAsset=(variantId:string):ResolvedPlantAsset|undefined=>{
  for(let stage=4;stage>=0;stage--){const result=resolvePlantAsset(variantId,stage as PlantStage);if(result&&result.sourceStage>=2)return result;}
  return undefined;
};
