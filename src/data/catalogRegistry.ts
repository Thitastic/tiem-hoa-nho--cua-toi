import type{CatalogFamily,CatalogPayload,PlantFamilyDef,PlantStage,PlantVariantDef}from'../core/types';
import{ROSE_FAMILY}from'./plants/rose';
import{CATALOG_DEFAULTS}from'./catalogDefaults';
import{RARITIES}from'./rarities';

const clone=<T>(value:T):T=>structuredClone(value);
const warned=new Set<string>();
const warnOnce=(id:string):void=>{if(warned.has(id))return;warned.add(id);console.warn(`[Catalog] ID không còn tồn tại: ${id}`);};
const image=(url:string)=>({file:url});

export const catalogFamilyToPlantFamily=(family:CatalogFamily):PlantFamilyDef=>{
  const variants:PlantVariantDef[]=family.variants.map((variant)=>({id:variant.id,familyId:family.id,variantKey:variant.key,name:variant.name,englishName:variant.nameEn??'',rarity:variant.rarityId,tags:[...family.tags],yield:variant.yield.count,unitPrice:variant.yield.unitPrice,mutationWeight:variant.mutationWeight,images:{stages:Object.fromEntries(Object.entries(variant.images.stages).map(([stage,url])=>[stage,image(url)])),...(variant.images.stem?{stem:image(variant.images.stem)}:{})}}));
  const base=family.variants.find((variant)=>variant.isBase)??family.variants[0];
  return{id:family.id,name:family.name,englishName:family.nameEn,unlockLevel:family.unlockLevel,baseSeedPrice:family.baseSeedPrice,seed2StarPriceMult:family.seed2StarPriceMult,tags:[...family.tags],archived:family.archived,builtin:family.builtin,baseVariantId:base?.id??`${family.id}.base`,growTimeSec:family.growTimeSec,wateringIntervalSec:[family.wateringIntervalSec],growthPausesWhenDry:family.growthPausesWhenDry,mutationChance:family.baseMutationChance,revealVariantFromStage:family.revealVariantFromStage,stageThresholds:[...family.stageThresholds],witherAfterSec:null,tempRange:[],images:{folder:'',shared:Object.fromEntries(Object.entries(family.images.shared).map(([stage,url])=>[stage,image(url)])),seeds:Object.fromEntries(Object.entries(family.images.seeds??{}).map(([star,url])=>[star,image(url)])),plantOffset:{x:0,y:0}},variants};
};

const mergeBuiltin=(builtin:PlantFamilyDef,incoming:CatalogFamily):PlantFamilyDef=>{
  const result=clone(builtin);result.unlockLevel=incoming.unlockLevel;
  for(const[stage,url]of Object.entries(incoming.images.shared))if(url)result.images.shared[Number(stage)as PlantStage]=image(url);
  for(const[star,url]of Object.entries(incoming.images.seeds??{}))if(url)(result.images.seeds??={})[Number(star)as 1|2|3]=image(url);
  for(const variant of incoming.variants){const target=result.variants.find((item)=>item.id===variant.id);if(!target)continue;for(const[stage,url]of Object.entries(variant.images.stages))if(url)target.images.stages[Number(stage)as PlantStage]=image(url);if(variant.images.stem)target.images.stem=image(variant.images.stem);}
  return result;
};

export class PlantCatalogRegistry{
  private families:PlantFamilyDef[]=[clone(ROSE_FAMILY)];private version=0;
  setServerCatalog(payload:CatalogPayload):void{const incoming=new Map(payload.families.map((family)=>[family.id,family]));const builtins=[ROSE_FAMILY].map((family)=>incoming.has(family.id)?mergeBuiltin(family,incoming.get(family.id)!):clone(family));const custom=payload.families.filter((family)=>!family.builtin&&family.id!==ROSE_FAMILY.id).map(catalogFamilyToPlantFamily);this.families=[...builtins,...custom];this.version=payload.version;}
  reset():void{this.families=[clone(ROSE_FAMILY)];this.version=0;}
  getVersion():number{return this.version;}
  allFamilies(includeArchived=true):PlantFamilyDef[]{return this.families.filter((family)=>includeArchived||!family.archived);}
  allVariants():PlantVariantDef[]{return this.families.flatMap((family)=>family.variants);}
  findFamily(id:string):PlantFamilyDef|undefined{return this.families.find((family)=>family.id===id);}
  findVariant(id:string):PlantVariantDef|undefined{return this.allVariants().find((variant)=>variant.id===id);}
  family(id:string):PlantFamilyDef{const found=this.findFamily(id);if(found)return found;warnOnce(id);return{id,name:id,unlockLevel:1,baseSeedPrice:CATALOG_DEFAULTS.unknown.baseSeedPrice,seed2StarPriceMult:CATALOG_DEFAULTS.seed2StarPriceMult,tags:[],archived:true,builtin:false,baseVariantId:`${id}.unknown`,growTimeSec:CATALOG_DEFAULTS.unknown.growTimeSec,wateringIntervalSec:[CATALOG_DEFAULTS.unknown.wateringIntervalSec],growthPausesWhenDry:true,mutationChance:0,revealVariantFromStage:2,stageThresholds:[...CATALOG_DEFAULTS.stageThresholds],witherAfterSec:null,tempRange:[],images:{folder:'',shared:{},plantOffset:{x:0,y:0}},variants:[]};}
  variant(id:string):PlantVariantDef{const found=this.findVariant(id);if(found)return found;warnOnce(id);const familyId=id.includes('.')?id.slice(0,id.indexOf('.')):'unknown';return{id,familyId,variantKey:id.split('.').at(-1)??id,name:id,englishName:'',rarity:RARITIES[0].id,tags:[],yield:1,unitPrice:1,mutationWeight:0,images:{stages:{}}};}
}
export const plantCatalog=new PlantCatalogRegistry();
export const allPlantFamilies=(includeArchived=true)=>plantCatalog.allFamilies(includeArchived);
export const allPlantVariants=()=>plantCatalog.allVariants();
export const familyById=(id:string)=>plantCatalog.family(id);
export const variantById=(id:string)=>plantCatalog.variant(id);
