import type{Texture}from'pixi.js';
import{assetByKey,ASSET_SIZES,resolvePlantAsset,resolveStemAsset,type ResolvedPlantAsset}from'../data/assetPaths';
import{assetConfig}from'../data/assetConfig';
import{allPlantVariants}from'../data/catalogRegistry';
import{potById}from'../data/pots';
import{customerById}from'../data/customers';
import{rarityById}from'../data/rarities';
import type{PlantStage}from'../core/types';
import type{AssetLoader}from'./AssetLoader';
import type{PlaceholderFactory,PlaceholderShape}from'./PlaceholderFactory';

export interface PlantTextureInfo{texture:Texture;asset?:ResolvedPlantAsset}
export class TextureProvider{
  private warned=new Set<string>();
  constructor(private loader:AssetLoader,private placeholders:PlaceholderFactory){}
  hasTexture(key:string):boolean{return this.loader.has(key);}
  getTexture(key:string,shape?:PlaceholderShape):Texture{
    const loaded=this.loader.get(key);if(loaded)return loaded;
    const entry=assetByKey(key);return this.placeholders.create(key,entry?.label??key,entry?.rarity?rarityById(entry.rarity).color:0x527c6b,entry?.size.w??128,entry?.size.h??128,shape??(key.startsWith('background:')?'background':key.startsWith('ui:icon')?'circle':'rect'));
  }
  getPlantTextureInfo(variantId:string,stage:number):PlantTextureInfo{
    const normalized=Math.max(0,Math.min(4,Math.floor(stage)))as PlantStage;
    const asset=resolvePlantAsset(variantId,normalized);
    if(asset)return{texture:this.getTexture(asset.key),asset};
    const key=`plant:${variantId}:${normalized}`;this.warn(key);return{texture:this.getTexture(key),asset:undefined};
  }
  getPlantTexture(variantId:string,stage:number):Texture{return this.getPlantTextureInfo(variantId,stage).texture;}
  getPlantAssetPath(variantId:string,stage:number):string{return this.getPlantTextureInfo(variantId,stage).asset?.path??'placeholder';}
  getPotTexture(potId:string):Texture{potById(potId);return this.getTexture(`pot:${potId}`);}
  getItemTexture(itemId:string):Texture{
    const direct=`item:${itemId}`;if(this.loader.has(direct))return this.loader.get(direct)!;
    if(allPlantVariants().some((variant)=>variant.id===itemId)){const bloom=resolveStemAsset(itemId);if(bloom)return this.getTexture(bloom.key);}
    if(itemId in assetConfig.wateringCanTint)return this.getTexture('ui:icon_need_water');
    return this.getTexture(direct);
  }
  getItemTint(itemId:string):number{return assetConfig.wateringCanTint[itemId]??0xffffff;}
  getCustomerTexture(customerId:string,mood:'base'|'happy'|'upset'='base'):Texture{
    const customer=customerById(customerId);const override=`customer:${customer.id}:override`;if(this.loader.has(override))return this.loader.get(override)!;
    const moodKey=`customer:${customer.archetypeKey}:${mood}`;if(mood!=='base'&&this.loader.has(moodKey))return this.loader.get(moodKey)!;
    const base=`customer:${customer.archetypeKey}:base`;if(this.loader.has(base))return this.loader.get(base)!;
    return this.placeholders.create(base,customer.name.charAt(0),0x9a6b65,ASSET_SIZES.plant.w,ASSET_SIZES.plant.h,'circle');
  }
  getBackground(area:string,fallback?:string):Texture{const key=`background:${area}`;if(this.loader.has(key))return this.loader.get(key)!;return this.getTexture(`background:${fallback??area}`,'background');}
  private warn(key:string):void{if(this.warned.has(key))return;this.warned.add(key);console.warn(`[Ảnh chưa có] ${key}`);}
}
